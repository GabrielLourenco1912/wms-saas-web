import type { User } from "../auth/models";

export type Profile = { code: string; name: string; active: boolean; permissions: string[] };
export type Permission = { code: string; functionalRequirement: string };
export type AdminPage<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean };
export type UserDraft = { name: string; email: string; password: string; profileCode: string; status: User["status"] };
export const accountStatusLabels: Record<User["status"], string> = { INVITED: "Convidado", ACTIVE: "Ativo", LOCKED: "Bloqueado", DISABLED: "Desativado" };

export function userUpdatePayload(original: User, draft: UserDraft, canAssignProfile: boolean) {
  return {
    name: draft.name.trim(),
    email: draft.email.trim(),
    profileCode: canAssignProfile ? draft.profileCode : original.profileCode,
    status: draft.status,
  };
}

export function profileUpdatePayload(name: string, active: boolean, selectedPermissions: ReadonlySet<string>) {
  return { name: name.trim(), active, permissions: Array.from(selectedPermissions).sort() };
}

export function togglePermission(selected: ReadonlySet<string>, code: string): Set<string> {
  const next = new Set(selected);
  if (next.has(code)) next.delete(code); else next.add(code);
  return next;
}

const permissionResources: Record<string, string> = { WAREHOUSE: "armazéns, zonas e posições", PRODUCT: "produtos e embalagens", PRE_RECEIPT: "pré-recebimentos", RECEIPT: "recebimentos", PUTAWAY: "armazenagens", ORDER: "pedidos de saída", WAVE: "ondas de separação", PICKING: "separações", TRANSFER: "transferências", STOCK: "estoques", AUDIT: "livro razão", SHIPMENT: "expedições", INVENTORY: "inventários", TASK: "tarefas", USER: "usuários", PROFILE: "perfis de acesso" };
const permissionActions: Record<string, string> = { VIEW: "Consultar", CREATE: "Criar", EDIT: "Editar", EXECUTE: "Executar", CANCEL: "Cancelar", BLOCK: "Bloquear", UNBLOCK: "Desbloquear", ADJUST: "Conciliar", REPORT_DIVERGENCE: "Informar divergência em", QUANTITY_OVERRIDE: "Autorizar quantidade excedente em", PROFILE_ASSIGN: "Atribuir perfil a" };
export function permissionLabel(code: string): string {
  for (const resource of Object.keys(permissionResources).sort((a, b) => b.length - a.length)) {
    if (!code.startsWith(`${resource}_`)) continue;
    const action = permissionActions[code.slice(resource.length + 1)];
    if (action) return `${action} ${permissionResources[resource]}`;
  }
  return code;
}
