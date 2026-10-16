import type { FieldSpec, FormValues } from "@/components/wms/EntityForm";
import type { Query } from "@/lib/api/types";
import { initialCatalogValues, partnerTypes, purposes, type CatalogKind, type CatalogRecord } from "./catalog-model";

const activeField: FieldSpec = { name: "active", label: "Cadastro ativo", type: "checkbox" };
const text = (name: string, label: string, maxLength: number, required = true): FieldSpec => ({ name, label, maxLength, required });
const numeric = (name: string, label: string, required = false, helperText?: string): FieldSpec => ({
  name, label, type: "number", required, helperText: helperText ?? "Até 6 casas decimais. Aceita vírgula ou ponto, sem separador de milhar.",
});
const lookup = (name: string, label: string, resource: string, filters?: Query): FieldSpec => ({ name, label, resource, type: "lookup", required: true, filters });

export function catalogFields(kind: CatalogKind, options: { editing?: boolean; warehouseId?: string } = {}): FieldSpec[] {
  const fields: Record<CatalogKind, FieldSpec[]> = {
    warehouses: [
      text("name", "Nome do armazém", 100),
      { ...text("taxId", "CNPJ", 18, false), helperText: "Opcional. Informe os 14 dígitos; a pontuação será removida." },
      { ...text("address", "Endereço", 255, false), type: "textarea" },
    ],
    zones: [
      lookup("warehouseId", "Armazém", "warehouses"),
      text("name", "Nome da zona", 50),
      { ...text("controlType", "Tipo de controle", 50, false), helperText: "Texto livre, por exemplo PADRAO ou REFRIGERADO." },
    ],
    positions: [
      lookup("zoneId", "Zona", "zones", options.warehouseId ? { warehouseId: options.warehouseId } : undefined),
      text("code", "Código da posição", 50),
      { ...text("type", "Tipo de posição", 50), helperText: "Texto livre, por exemplo PRATELEIRA ou DOCA." },
      { name: "purpose", label: "Finalidade", type: "select", required: true, options: [...purposes] },
      numeric("weightCapacityKg", "Capacidade de peso (kg)", false, "Opcional. Vazio significa sem limite de peso. Quando informado, deve ser maior que zero."),
      numeric("volumeCapacityM3", "Capacidade de volume (m³)", false, "Opcional. Vazio significa sem limite de volume. Quando informado, deve ser maior que zero."),
    ],
    categories: [
      text("name", "Nome da categoria", 100),
      { ...text("description", "Descrição", 4000, false), type: "textarea" },
    ],
    products: [
      lookup("categoryId", "Categoria", "categories"),
      text("sku", "SKU", 50),
      text("name", "Nome do produto", 150),
      { ...text("baseUnit", "Unidade base", 10), helperText: "Unidade utilizada nos saldos, no picking e no inventário, por exemplo UN, KG ou LT." },
      numeric("unitWeightKg", "Peso por unidade base (kg)", true),
      numeric("unitVolumeM3", "Volume por unidade base (m³)", true),
      { name: "lotControlled", label: "Exigir lote nas operações", type: "checkbox" },
      { name: "expiryControlled", label: "Exigir validade nas operações", type: "checkbox" },
      { name: "shelfLifeDays", label: "Prazo de validade em dias", type: "number", min: 0, max: 2147483647, step: 1, helperText: "Opcional. Não substitui a validade informada na conferência." },
    ],
    "product-packages": [
      { ...text("type", "Tipo de embalagem", 20), helperText: "Por exemplo UN, CX ou FD." },
      { ...numeric("conversionFactor", "Unidades base por embalagem", true), disabled: options.editing, helperText: options.editing ? "O fator existente é imutável. Cadastre outra embalagem para usar outra conversão." : "Uma caixa com fator 12 contém 12 unidades base. Informe um valor maior que zero." },
      { ...text("barcode", "Código de barras", 100, false), helperText: "Opcional. Deve ser único entre os identificadores de leitura do catálogo." },
      numeric("weightKg", "Peso da embalagem (kg)"),
      numeric("volumeM3", "Volume da embalagem (m³)"),
    ],
    partners: [
      text("legalName", "Nome / razão social", 150),
      { ...text("taxId", "CPF ou CNPJ", 18, false), helperText: "Opcional. CPF com 11 ou CNPJ com 14 dígitos. A pontuação será removida." },
      { name: "type", label: "Relacionamento", type: "select", required: true, options: [...partnerTypes] },
    ],
  };
  return [...fields[kind], activeField];
}

export function catalogInitialValues(kind: CatalogKind, row?: CatalogRecord, warehouseId?: string): FormValues {
  const values: FormValues = {};
  const combined: CatalogRecord = { ...initialCatalogValues(kind), ...(warehouseId && kind === "zones" ? { warehouseId } : {}), ...row };
  for (const field of catalogFields(kind)) {
    const value = combined[field.name];
    values[field.name] = field.type === "checkbox" ? Boolean(value) : value === undefined || value === null ? "" : String(value);
  }
  return values;
}
