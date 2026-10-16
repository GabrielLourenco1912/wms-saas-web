"use client";

import { useRef, useState, type ReactNode } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { EntityForm, type FormValues } from "@/components/wms/EntityForm";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { DetailGrid, Modal, Notice, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { api } from "@/lib/api/client";
import { formatDecimal, text, type Entity, type LookupOption, type Query } from "@/lib/api/types";
import { catalogFields, catalogInitialValues } from "./catalog-fields";
import { catalogFormPayload, catalogPath, partnerTypes, purposes, validateCatalogValues, type CatalogKind } from "./catalog-model";

type CatalogColumn = { key: string; label: string; render?: (row: Entity) => ReactNode };
type CatalogDefinition = { singular: string; title: string; description: string; view: string; create: string; edit: string; columns: CatalogColumn[] };
const activeColumn: CatalogColumn = { key: "active", label: "Cadastro", render: (row) => <StatusPill value={row.active === true ? "ATIVO" : "INATIVO"} /> };
const measurement = (key: string, label: string): CatalogColumn => ({ key, label, render: (row) => row[key] === null || row[key] === undefined ? "Sem limite" : formatDecimal(row[key]) });
const definitions: Record<CatalogKind, CatalogDefinition> = {
  warehouses: { singular: "armazém", title: "Armazéns", description: "Estrutura física do seu negócio. Cadastre o armazém antes das zonas e posições.", view: "WAREHOUSE_VIEW", create: "WAREHOUSE_CREATE", edit: "WAREHOUSE_EDIT", columns: [{ key: "name", label: "Nome" }, { key: "taxId", label: "CNPJ" }, { key: "address", label: "Endereço" }, activeColumn] },
  zones: { singular: "zona", title: "Zonas", description: "Agrupe as posições por armazém e tipo de controle.", view: "WAREHOUSE_VIEW", create: "WAREHOUSE_CREATE", edit: "WAREHOUSE_EDIT", columns: [{ key: "name", label: "Nome" }, { key: "controlType", label: "Tipo de controle" }, activeColumn] },
  positions: { singular: "posição", title: "Posições", description: "Defina finalidade e capacidades. O status operacional é informado pelo servidor.", view: "WAREHOUSE_VIEW", create: "WAREHOUSE_CREATE", edit: "WAREHOUSE_EDIT", columns: [{ key: "code", label: "Código" }, { key: "type", label: "Tipo" }, { key: "purpose", label: "Finalidade", render: (row) => purposes.find((option) => option.value === row.purpose)?.label ?? text(row, "purpose") }, measurement("weightCapacityKg", "Capacidade (kg)"), measurement("volumeCapacityM3", "Capacidade (m³)"), { key: "status", label: "Situação", render: (row) => <StatusPill value={text(row, "status")} /> }, activeColumn] },
  categories: { singular: "categoria", title: "Categorias", description: "Organize o catálogo de produtos por categoria.", view: "PRODUCT_VIEW", create: "PRODUCT_CREATE", edit: "PRODUCT_EDIT", columns: [{ key: "name", label: "Nome" }, { key: "description", label: "Descrição" }, activeColumn] },
  products: { singular: "produto", title: "Produtos", description: "Defina unidade base, dimensões e rastreabilidade antes das operações.", view: "PRODUCT_VIEW", create: "PRODUCT_CREATE", edit: "PRODUCT_EDIT", columns: [{ key: "sku", label: "SKU" }, { key: "name", label: "Nome" }, { key: "baseUnit", label: "Unidade" }, { key: "lotControlled", label: "Lote", render: (row) => row.lotControlled ? "Obrigatório" : "Opcional" }, { key: "expiryControlled", label: "Validade", render: (row) => row.expiryControlled ? "Obrigatória" : "Opcional" }, activeColumn] },
  "product-packages": { singular: "embalagem", title: "Embalagens", description: "Associe embalagens ao produto. O fator converte uma embalagem em unidades base.", view: "PRODUCT_VIEW", create: "PRODUCT_CREATE", edit: "PRODUCT_EDIT", columns: [{ key: "type", label: "Tipo" }, { key: "barcode", label: "Código de barras" }, { key: "conversionFactor", label: "Unidades base", render: (row) => formatDecimal(row.conversionFactor) }, { key: "weightKg", label: "Peso (kg)", render: (row) => row.weightKg === null ? "—" : formatDecimal(row.weightKg) }, activeColumn] },
  partners: { singular: "parceiro", title: "Parceiros", description: "Mantenha clientes, fornecedores e parceiros com os dois relacionamentos.", view: "ORDER_VIEW", create: "ORDER_CREATE", edit: "ORDER_EDIT", columns: [{ key: "legalName", label: "Nome / razão social" }, { key: "taxId", label: "CPF / CNPJ" }, { key: "type", label: "Relacionamento", render: (row) => partnerTypes.find((option) => option.value === row.type)?.label ?? text(row, "type") }, activeColumn] },
};

const detailLabels: Record<string, string> = {
  id: "Identificador", name: "Nome", legalName: "Nome / razão social", taxId: "CPF / CNPJ", address: "Endereço",
  warehouseId: "Identificador do armazém", zoneId: "Identificador da zona", categoryId: "Identificador da categoria", productId: "Identificador do produto",
  controlType: "Tipo de controle", code: "Código", type: "Tipo", purpose: "Finalidade", status: "Situação operacional",
  weightCapacityKg: "Capacidade de peso (kg)", volumeCapacityM3: "Capacidade de volume (m³)", sku: "SKU", baseUnit: "Unidade base",
  unitWeightKg: "Peso por unidade base (kg)", unitVolumeM3: "Volume por unidade base (m³)", lotControlled: "Lote obrigatório", expiryControlled: "Validade obrigatória",
  shelfLifeDays: "Prazo de validade (dias)", description: "Descrição", conversionFactor: "Unidades base por embalagem", barcode: "Código de barras",
  weightKg: "Peso da embalagem (kg)", volumeM3: "Volume da embalagem (m³)", active: "Cadastro ativo", createdAt: "Criado em", updatedAt: "Atualizado em",
};

function CatalogManager({ kind, filters = {}, warehouseId, product, toolbar }: { kind: CatalogKind; filters?: Query; warehouseId?: string; product?: LookupOption | null; toolbar?: ReactNode }) {
  const { can } = useAuth();
  const definition = definitions[kind];
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<{ row?: Entity } | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [detail, setDetail] = useState<Entity | null>(null);
  const [relationLabels, setRelationLabels] = useState<Record<string, string>>({});
  const detailRequest = useRef(0);
  const detailSource = useRef<Entity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [notice, setNotice] = useState("");
  const [inactivate, setInactivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commandError, setCommandError] = useState("");
  const endpoint = kind === "product-packages" && product
    ? catalogPath(kind, { productId: product.id })
    : catalogPath(kind);

  async function openDetail(row: Entity) {
    const requestId = ++detailRequest.current;
    detailSource.current = row;
    setDetail(null);
    setRelationLabels({});
    setDetailError("");
    setCommandError("");
    setInactivate(false);
    setDetailLoading(true);
    try {
      const result = kind === "product-packages" ? row : await api.get<Entity>(catalogPath(kind, row));
      const relation = kind === "zones" ? { key: "warehouseId", resource: "warehouses", label: "name" }
        : kind === "positions" ? { key: "zoneId", resource: "zones", label: "name" }
        : kind === "products" ? { key: "categoryId", resource: "categories", label: "name" }
        : kind === "product-packages" ? { key: "productId", resource: "products", label: "name" } : null;
      let labels: Record<string, string> = {};
      if (relation && result[relation.key]) {
        try {
          const parent = await api.get<Entity>(`/${relation.resource}/${encodeURIComponent(String(result[relation.key]))}`);
          labels = { [relation.key]: text(parent, relation.label) };
        } catch { /* The entity remains usable when an optional related label cannot be loaded. */ }
      }
      if (requestId === detailRequest.current) {
        setRelationLabels(labels);
        setDetail(result);
      }
    } catch (error) {
      if (requestId === detailRequest.current) setDetailError(error instanceof Error ? error.message : "Não foi possível carregar os detalhes.");
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }

  function closeDetail() {
    if (saving) return;
    detailRequest.current += 1;
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
  }

  async function save(values: FormValues) {
    const row = editing?.row;
    const payload = catalogFormPayload(kind, values);
    const path = kind === "product-packages"
      ? catalogPath(kind, { productId: row?.productId ?? product?.id, ...(row?.id ? { id: row.id } : {}) })
      : catalogPath(kind, row);
    if (kind === "product-packages" && !row?.productId && !product?.id) throw new Error("Selecione o produto antes de cadastrar uma embalagem.");
    setFormSaving(true);
    try {
      await api.request<Entity>(path, { method: row ? "PUT" : "POST", body: payload });
    } finally {
      setFormSaving(false);
    }
    setEditing(null);
    setDetail(null);
    setNotice(`${definition.singular.charAt(0).toUpperCase()}${definition.singular.slice(1)} ${row ? "atualizado(a)" : "cadastrado(a)"} com sucesso.`);
    setReloadKey((key) => key + 1);
  }

  async function deactivate() {
    if (!detail || saving) return;
    setSaving(true);
    setCommandError("");
    try {
      const payload = catalogFormPayload(kind, { ...detail, active: false });
      await api.request<Entity>(catalogPath(kind, detail), { method: "PUT", body: payload });
      setDetail(null);
      setInactivate(false);
      setNotice("Cadastro inativado. O histórico e os vínculos foram preservados.");
      setReloadKey((key) => key + 1);
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Não foi possível inativar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  const fields = catalogFields(kind, { editing: Boolean(editing?.row), warehouseId }).map((field) => ({ ...field, ...(field.type === "lookup" && editing?.row?.[field.name] ? { initialLabel: relationLabels[field.name] ?? String(editing.row[field.name]) } : {}) }));
  return <>
    {notice && <Notice tone="success">{notice}</Notice>}
    {toolbar}
    <ResourceTable
      title={definition.title}
      description={definition.description}
      endpoint={endpoint}
      permission={definition.view}
      columns={definition.columns}
      filters={filters}
      reloadKey={reloadKey}
      searchPlaceholder={kind === "products" ? "Pesquisar SKU, nome ou código de barras" : kind === "partners" ? "Pesquisar nome, documento ou relacionamento" : "Pesquisar neste cadastro"}
      actions={can(definition.create) ? <button type="button" className="button button-primary" disabled={kind === "product-packages" && !product} onClick={() => { setEditing({}); setNotice(""); }}>Adicionar {definition.singular}</button> : undefined}
      onOpen={(row) => { void openDetail(row); }}
      rowActions={(row) => <button type="button" className="button button-secondary" onClick={() => { void openDetail(row); }}>Detalhes</button>}
    />
    {(detailLoading || detailError || detail) && <Modal title={`Detalhes de ${definition.singular}`} onClose={closeDetail} busy={saving}>
      {detailLoading && <p role="status">Carregando detalhes…</p>}
      {detailError && <Notice tone="error">{detailError}<button type="button" className="button button-secondary" onClick={() => { if (detailSource.current) void openDetail(detailSource.current); }}>Tentar novamente</button></Notice>}
      {detail && <>
        <DetailGrid values={Object.fromEntries(Object.entries(detail).filter(([key]) => detailLabels[key]).map(([key, value]) => [detailLabels[key], relationLabels[key] ? `${relationLabels[key]} (${String(value)})` : value]))} />
        {commandError && <Notice tone="error">{commandError}</Notice>}
        {inactivate ? <div className="form-actions"><p>Inativar este cadastro? Os vínculos existentes e o histórico serão mantidos. Novas operações podem ficar indisponíveis para este registro.</p><button type="button" className="button button-secondary" disabled={saving} onClick={() => setInactivate(false)}>Voltar</button><button type="button" className="button button-danger" disabled={saving} onClick={() => { void deactivate(); }}>{saving ? "Inativando…" : "Confirmar inativação"}</button></div> : can(definition.edit) && <div className="form-actions"><button type="button" className="button button-primary" onClick={() => { setEditing({ row: detail }); setDetail(null); }}>Editar cadastro</button>{detail.active === true && <button type="button" className="button button-secondary" onClick={() => setInactivate(true)}>Inativar</button>}</div>}
      </>}
    </Modal>}
    {editing && <Modal title={`${editing.row ? "Editar" : "Adicionar"} ${definition.singular}`} onClose={() => { if (!formSaving) setEditing(null); }} busy={formSaving}><EntityForm
      title={`${editing.row ? "Editar" : "Adicionar"} ${definition.singular}`}
      description={kind === "products" && editing.row ? "Unidade, dimensões e rastreabilidade podem ter alterações impedidas quando já existem vínculos operacionais." : kind === "product-packages" ? `Produto: ${product?.label ?? String(editing.row?.productId ?? "")}. O fator representa a quantidade na unidade base.` : kind === "positions" ? "A finalidade determina o uso nas operações. Bloqueio e liberação são feitos pela gestão de estoque." : undefined}
      fields={fields}
      initialValues={catalogInitialValues(kind, editing.row, warehouseId)}
      validate={(values) => validateCatalogValues(kind, values)}
      onSubmit={save}
      onCancel={() => setEditing(null)}
      submitLabel="Salvar cadastro"
    /></Modal>}
  </>;
}

function ActiveFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="field"><span>Situação do cadastro</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option></select></label>;
}

export function WarehouseScreen() {
  const [tab, setTab] = useState<CatalogKind>("warehouses");
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [zone, setZone] = useState<LookupOption | null>(null);
  const [active, setActive] = useState("");
  const [purpose, setPurpose] = useState("");
  return <>
    <div className="tab-list" aria-label="Estrutura física">{(["warehouses", "zones", "positions"] as const).map((kind) => <button key={kind} type="button" aria-pressed={tab === kind} onClick={() => setTab(kind)}>{definitions[kind].title}</button>)}</div>
    <CatalogManager key={tab} kind={tab} warehouseId={warehouse?.id} filters={{ active: active || undefined, ...(tab !== "warehouses" ? { warehouseId: warehouse?.id } : {}), ...(tab === "positions" ? { zoneId: zone?.id, purpose: purpose || undefined } : {}) }} toolbar={<div className="toolbar">
      <ActiveFilter value={active} onChange={setActive} />
      {tab !== "warehouses" && <ApiLookup label="Filtrar por armazém ativo" resource="warehouses" value={warehouse} onChange={(value) => { setWarehouse(value); setZone(null); }} filters={{ active: true }} permission="WAREHOUSE_VIEW" />}
      {tab === "positions" && <><ApiLookup label="Filtrar por zona ativa" resource="zones" value={zone} onChange={setZone} filters={{ warehouseId: warehouse?.id, active: true }} permission="WAREHOUSE_VIEW" /><label className="field"><span>Finalidade</span><select value={purpose} onChange={(event) => setPurpose(event.target.value)}><option value="">Todas</option>{purposes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></>}
    </div>} />
  </>;
}

export function ProductsScreen() {
  const [tab, setTab] = useState<CatalogKind>("products");
  const [category, setCategory] = useState<LookupOption | null>(null);
  const [product, setProduct] = useState<LookupOption | null>(null);
  const [active, setActive] = useState("");
  return <>
    <div className="tab-list" aria-label="Catálogo de produtos">{(["products", "categories", "product-packages"] as const).map((kind) => <button key={kind} type="button" aria-pressed={tab === kind} onClick={() => setTab(kind)}>{definitions[kind].title}</button>)}</div>
    <CatalogManager key={`${tab}-${product?.id ?? "all"}`} kind={tab} product={product} filters={{ active: active || undefined, ...(tab === "products" ? { categoryId: category?.id } : {}) }} toolbar={<div className="toolbar"><ActiveFilter value={active} onChange={setActive} />
      {tab === "products" && <ApiLookup label="Filtrar por categoria ativa" resource="categories" value={category} onChange={setCategory} filters={{ active: true }} permission="PRODUCT_VIEW" />}
      {tab === "product-packages" && <ApiLookup label="Produto das embalagens" resource="products" value={product} onChange={setProduct} filters={{ active: true }} permission="PRODUCT_VIEW" helperText="Selecione um produto para cadastrar novas embalagens." />}
    </div>} />
  </>;
}

export function PartnersScreen() {
  const [type, setType] = useState("");
  const [active, setActive] = useState("");
  return <CatalogManager kind="partners" filters={{ type: type || undefined, active: active || undefined }} toolbar={<div className="toolbar"><ActiveFilter value={active} onChange={setActive} /><label className="field"><span>Relacionamento</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos</option>{partnerTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>} />;
}
