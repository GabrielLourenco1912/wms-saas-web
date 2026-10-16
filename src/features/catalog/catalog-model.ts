import { decimal, optionalDecimal } from "@/lib/api/decimal";

/** Master-data contracts. Operational balances/status are intentionally read-only. */
export type CatalogKind =
  | "warehouses"
  | "zones"
  | "positions"
  | "categories"
  | "products"
  | "product-packages"
  | "partners";

export type CatalogRecord = Record<string, unknown>;

export const purposes = [
  { value: "RECEBIMENTO", label: "Recebimento" },
  { value: "ARMAZENAGEM", label: "Armazenagem" },
  { value: "EXPEDICAO", label: "Expedição" },
] as const;

export const partnerTypes = [
  { value: "CLIENTE", label: "Cliente" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "AMBOS", label: "Cliente e fornecedor" },
] as const;

/** Values excluded here must never leak from GET responses into a full PUT. */
const requestFields: Record<CatalogKind, readonly string[]> = {
  warehouses: ["name", "taxId", "address", "active"],
  zones: ["warehouseId", "name", "controlType", "active"],
  positions: [
    "zoneId", "code", "type", "weightCapacityKg", "volumeCapacityM3", "purpose", "active",
  ],
  categories: ["name", "description", "active"],
  products: [
    "categoryId", "sku", "name", "lotControlled", "expiryControlled", "shelfLifeDays",
    "baseUnit", "unitWeightKg", "unitVolumeM3", "active",
  ],
  "product-packages": ["type", "conversionFactor", "barcode", "weightKg", "volumeM3", "active"],
  partners: ["legalName", "taxId", "type", "active"],
};

const optionalText = new Set(["taxId", "address", "controlType", "description", "barcode"]);

export function catalogPayload(kind: CatalogKind, values: CatalogRecord): CatalogRecord {
  const payload: CatalogRecord = {};
  for (const key of requestFields[kind]) {
    const value = values[key];
    if (typeof value === "string") {
      const cleaned = key === "taxId" ? value.replace(/[^0-9]/g, "") : value.trim();
      payload[key] = cleaned || (optionalText.has(key) ? null : cleaned);
    } else {
      payload[key] = value ?? null;
    }
  }
  payload.active = values.active ?? true;
  return payload;
}

/** Keep packaging ownership in the URL; there is no GET /product-packages/{id}. */
export function catalogPath(kind: CatalogKind, row?: CatalogRecord): string {
  if (kind === "product-packages") {
    if (!row?.productId) return "/search/product-packages";
    const base = `/products/${encodeURIComponent(String(row.productId))}/packages`;
    return row.id ? `${base}/${encodeURIComponent(String(row.id))}` : base;
  }
  return `/${kind}${row?.id ? `/${encodeURIComponent(String(row.id))}` : ""}`;
}

export function initialCatalogValues(kind: CatalogKind): CatalogRecord {
  const common = { active: true };
  switch (kind) {
    case "positions":
      return { ...common, purpose: "ARMAZENAGEM", type: "PRATELEIRA" };
    case "zones":
      return { ...common, controlType: "PADRAO" };
    case "products":
      return { ...common, lotControlled: false, expiryControlled: false, baseUnit: "UN", unitWeightKg: "0", unitVolumeM3: "0" };
    case "product-packages":
      return { ...common, type: "UN", conversionFactor: "1" };
    case "partners":
      return { ...common, type: "CLIENTE" };
    default:
      return common;
  }
}

const decimals: Partial<Record<CatalogKind, readonly string[]>> = {
  positions: ["weightCapacityKg", "volumeCapacityM3"],
  products: ["unitWeightKg", "unitVolumeM3"],
  "product-packages": ["conversionFactor", "weightKg", "volumeM3"],
};

const requiredFields: Record<CatalogKind, readonly string[]> = {
  warehouses: ["name"],
  zones: ["warehouseId", "name"],
  positions: ["zoneId", "code", "type", "purpose"],
  categories: ["name"],
  products: ["categoryId", "sku", "name", "baseUnit", "unitWeightKg", "unitVolumeM3"],
  "product-packages": ["type", "conversionFactor"],
  partners: ["legalName", "type"],
};

export function validateCatalogValues(kind: CatalogKind, values: CatalogRecord): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of requiredFields[kind]) {
    if (values[key] === undefined || values[key] === null || String(values[key]).trim() === "") {
      errors[key] = "Preencha este campo.";
    }
  }
  for (const key of decimals[kind] ?? []) {
    try {
      const allowZero = !["weightCapacityKg", "volumeCapacityM3", "conversionFactor"].includes(key);
      optionalDecimal(values[key], { allowZero });
    } catch (error) {
      errors[key] = error instanceof Error ? error.message : "Valor inválido.";
    }
  }
  const taxSource = String(values.taxId ?? "").trim();
  const taxId = taxSource.replace(/[^0-9]/g, "");
  if (["warehouses", "partners"].includes(kind) && taxSource && !/^[0-9.\/\-\s]+$/.test(taxSource)) {
    errors.taxId = "Informe somente os dígitos do documento e a pontuação de CPF/CNPJ.";
  }
  if (taxId && (kind === "warehouses" ? taxId.length !== 14 : kind === "partners" && ![11, 14].includes(taxId.length))) {
    errors.taxId = kind === "warehouses" ? "Informe um CNPJ com 14 dígitos." : "Informe CPF com 11 dígitos ou CNPJ com 14 dígitos.";
  }
  if (kind === "products" && values.shelfLifeDays !== undefined && values.shelfLifeDays !== "" && values.shelfLifeDays !== null) {
    const days = String(values.shelfLifeDays);
    if (!/^\d+$/.test(days) || Number(days) > 2_147_483_647) errors.shelfLifeDays = "Informe dias inteiros entre 0 e 2147483647.";
  }
  return errors;
}

export function catalogFormPayload(kind: CatalogKind, values: CatalogRecord): CatalogRecord {
  const errors = validateCatalogValues(kind, values);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const payload = catalogPayload(kind, values);
  for (const key of decimals[kind] ?? []) {
    const options = { allowZero: !["weightCapacityKg", "volumeCapacityM3", "conversionFactor"].includes(key) };
    payload[key] = requiredFields[kind].includes(key)
      ? decimal(values[key], options) : optionalDecimal(values[key], options);
  }
  if (kind === "products") {
    payload.shelfLifeDays = values.shelfLifeDays === "" || values.shelfLifeDays === undefined || values.shelfLifeDays === null
      ? null : Number(values.shelfLifeDays);
  }
  return payload;
}
