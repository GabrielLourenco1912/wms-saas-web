import { decimal, ExactDecimal } from "@/lib/api/decimal";
import { isPage, type Entity, type Page } from "@/lib/api/types";

function required(value: unknown, label: string, maxLength?: number): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Informe ${label}.`);
  if (maxLength && text.length > maxLength) throw new Error(`${label} deve ter até ${maxLength} caracteres.`);
  return text;
}

export function reasonPayload(values: Entity): { reason: string } {
  return { reason: required(values.reason, "o motivo", 255) };
}

export function lotBlockPayload(values: Entity): Entity {
  return {
    warehouseId: required(values.warehouseId, "o armazém"),
    productId: required(values.productId, "o produto"),
    lot: required(values.lot, "o lote", 100),
    ...reasonPayload(values),
  };
}

export function transferPayload(mode: "lpn" | "stock", values: Entity): Entity {
  const destinationPositionId = required(values.destinationPositionId, "a posição de destino");
  const quantity = decimal(values.quantity);
  return mode === "lpn" ? {
    lpnId: required(values.lpnId, "o LPN de origem"), destinationPositionId, quantity,
  } : {
    stockId: required(values.stockId, "o saldo de origem"), destinationPositionId,
    destinationLpnCode: required(values.destinationLpnCode, "o código do LPN de destino"), quantity,
  };
}

/** Sum base-unit physical stock with integer arithmetic, including every mixed-product layer. */
export function sumLpnQuantities(layers: Entity[]): ExactDecimal {
  let micros = BigInt(0);
  for (const layer of layers) {
    const [integer, fraction = ""] = decimal(layer.quantity, { allowZero: true }).value.split(".");
    micros += BigInt(integer) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, "0"));
  }
  const literal = `${micros / BigInt(1_000_000)}.${String(micros % BigInt(1_000_000)).padStart(6, "0")}`;
  return decimal(literal);
}

/** Paging is mandatory: the first page alone is not a complete LPN quantity. */
export async function loadLpnQuantity(lpnId: string, fetchPage: (page: number) => Promise<Page<Entity>>): Promise<ExactDecimal> {
  const layers: Entity[] = [];
  const seen = new Set<string>();
  let expectedTotal: number | null = null;
  let pageNumber = 0;
  while (true) {
    const page = await fetchPage(pageNumber);
    if (!isPage<Entity>(page) || page.page !== pageNumber || (expectedTotal !== null && page.totalElements !== expectedTotal)) {
      throw new Error("O saldo do LPN mudou durante a consulta. Atualize a origem antes de planejar.");
    }
    expectedTotal = page.totalElements;
    for (const row of page.content) {
      const id = String(row.id ?? "");
      if (!id || seen.has(id) || row.lpnId !== lpnId) throw new Error("O saldo consultado não corresponde ao LPN selecionado. Atualize a origem.");
      seen.add(id);
      layers.push(row);
    }
    if (page.last) break;
    if (!page.content.length || ++pageNumber > 10_000) throw new Error("A consulta do LPN não pôde ser concluída. Atualize a origem.");
  }
  if (layers.length !== expectedTotal) throw new Error("O saldo do LPN mudou durante a consulta. Atualize a origem.");
  return sumLpnQuantities(layers);
}

/** Calendar dates cover whole local days, including the final millisecond. */
export function ledgerDateRange(from: string, to: string): { from?: string; to?: string } {
  function boundary(value: string, end: boolean): Date | null {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe datas válidas para a consulta.");
    const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
    const [year, month, day] = value.split("-").map(Number);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
      throw new Error("Informe datas válidas para a consulta.");
    }
    return date;
  }
  const start = boundary(from, false), end = boundary(to, true);
  if (start && end && start > end) throw new Error("A data inicial deve ser anterior ou igual à data final.");
  return { ...(start ? { from: start.toISOString() } : {}), ...(end ? { to: end.toISOString() } : {}) };
}
