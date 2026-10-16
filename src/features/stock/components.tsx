"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useApiQuery } from "@/lib/api/hooks";
import type { Entity } from "@/lib/api/types";
import { text } from "@/lib/api/types";
import { Loading, Notice } from "@/components/wms/primitives";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";
}

export function StockDetailLoader({ endpoint, permission, children }: { endpoint: string; permission: string; children: (data: Entity) => ReactNode }) {
  const { can } = useAuth();
  const result = useApiQuery<Entity>(endpoint, {}, can(permission));
  if (!can(permission)) return <Notice>Seu perfil não tem acesso a este detalhe.</Notice>;
  if (result.loading) return <Loading message="Carregando detalhes…" />;
  if (result.error) return <Notice tone="error">{result.error.message} <button type="button" className="text-button" onClick={result.reload}>Tentar novamente</button></Notice>;
  return result.data ? children(result.data) : null;
}

/** Resolve references only inside an opened detail; lists remain one paged query. */
export function Reference({ resource, id, permission, labelKey }: { resource: string; id: unknown; permission: string; labelKey: string }) {
  const { can } = useAuth();
  const enabled = typeof id === "string" && Boolean(id) && can(permission);
  const result = useApiQuery<Entity>(`/${resource}/${encodeURIComponent(String(id ?? ""))}`, {}, enabled);
  if (!id) return <>—</>;
  if (!enabled || result.error) return <span title="Identificador da referência">{String(id)}</span>;
  if (!result.data) return <span role="status">Carregando referência…</span>;
  return <span>{text(result.data, labelKey)} <small className="muted">({String(id)})</small></span>;
}
