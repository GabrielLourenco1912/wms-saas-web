"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "@/lib/api/client";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { Modal, Notice, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { errorMessage, passwordIssue } from "@/features/auth/models";
import type { AuthChallenge, User } from "@/features/auth/models";
import { accountStatusLabels, userUpdatePayload } from "./admin-models";
import type { UserDraft } from "./admin-models";

export function UsersScreen() {
  const auth = useAuth();
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canCreate = auth.can("USER_CREATE") && auth.can("USER_PROFILE_ASSIGN");

  async function open(user: User) {
    if (loadingId) return;
    setLoadingId(user.id); setError(null);
    try { setEditing(await api.get<User>(`/users/${encodeURIComponent(user.id)}`)); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoadingId(null); }
  }
  return <div className="screen-stack">
    {message ? <Notice tone="success">{message}</Notice> : null}
    {error ? <Notice tone="error">{error}</Notice> : null}
    <ResourceTable<User> title="Usuários" description="Contas individuais, convites e situação de acesso." endpoint="/users" permission="USER_VIEW" reloadKey={reload} searchPlaceholder="Pesquisar nome ou e-mail" statuses={["INVITED", "ACTIVE", "LOCKED", "DISABLED"]}
      actions={canCreate ? <button className="primary-button" type="button" onClick={() => setEditing("new")}>Convidar usuário</button> : null}
      columns={[
        { key: "name", label: "Nome" }, { key: "email", label: "E-mail" }, { key: "profileCode", label: "Perfil" },
        { key: "status", label: "Situação", render: (user) => <StatusPill value={user.status} /> },
        { key: "emailVerifiedAt", label: "E-mail confirmado", render: (user) => user.emailVerifiedAt ? "Sim" : "Aguardando confirmação" },
      ]}
      rowActions={(user) => auth.can("USER_EDIT") ? <button className="secondary-button" type="button" disabled={loadingId !== null} onClick={() => { void open(user); }}>{loadingId === user.id ? "Carregando…" : "Editar"}</button> : null}
    />
    {editing ? <UserEditor key={editing === "new" ? "new" : editing.id} original={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(text, changedSelf) => { setEditing(null); setReload((value) => value + 1); setMessage(text); if (changedSelf) void auth.reloadUser().catch(() => undefined); }} /> : null}
  </div>;
}

function UserEditor({ original, onClose, onSaved }: { original: User | null; onClose: () => void; onSaved: (message: string, changedSelf: boolean) => void }) {
  const auth = useAuth();
  const [draft, setDraft] = useState<UserDraft>({ name: original?.name ?? "", email: original?.email ?? "", password: "", profileCode: original?.profileCode ?? "OPERADOR", status: original?.status ?? "INVITED" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const canAssign = auth.can("USER_PROFILE_ASSIGN");
  const canUseProfileLookup = auth.can("PROFILE_VIEW");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      if (!draft.profileCode) throw new Error("Selecione o perfil de acesso.");
      if (original) {
        if (!auth.can("USER_EDIT")) throw new Error("Você não possui permissão para editar usuários.");
        await api.request<User>(`/users/${encodeURIComponent(original.id)}`, { method: "PUT", body: userUpdatePayload(original, draft, canAssign) });
        onSaved("Usuário atualizado. Alterações no e-mail ou perfil podem exigir novo acesso.", original.id === auth.user?.id);
      } else {
        if (!auth.can("USER_CREATE") || !canAssign) throw new Error("Você não possui permissão para convidar usuários e atribuir um perfil.");
        const issue = passwordIssue(draft.password);
        if (issue) throw new Error(issue);
        const challenge = await api.request<AuthChallenge>("/users", { method: "POST", body: { name: draft.name.trim(), email: draft.email.trim(), password: draft.password, profileCode: draft.profileCode } });
        onSaved(`Convite criado. A confirmação foi enviada para ${challenge.maskedEmail}. A pessoa deve entrar com sua própria conta e confirmar o código recebido.`, false);
      }
    } catch (failure) { setError(errorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }
  const unverified = !original?.emailVerifiedAt || draft.email.trim() !== original?.email;
  return <Modal title={original ? "Editar usuário" : "Convidar usuário"} onClose={onClose} busy={busy}>
    <form onSubmit={save} aria-busy={busy}><fieldset className="form-fields" disabled={busy}>
      <div className="form-grid">
        <label className="field">Nome<input value={draft.name} maxLength={100} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoComplete="name" required /></label>
        <label className="field">E-mail<input type="email" value={draft.email} maxLength={254} onChange={(event) => setDraft({ ...draft, email: event.target.value, status: original && event.target.value.trim() !== original.email ? "INVITED" : draft.status })} autoComplete="email" required /></label>
        {!original ? <label className="field">Senha inicial<input type="password" value={draft.password} minLength={8} autoComplete="new-password" onChange={(event) => setDraft({ ...draft, password: event.target.value })} required /><span className="field-help">Mínimo de oito caracteres. Compartilhe a senha inicial com a pessoa por um canal apropriado.</span></label> : null}
        {canAssign && canUseProfileLookup ? <ApiLookup resource="profiles" label="Perfil de acesso" value={draft.profileCode ? { id: draft.profileCode, label: draft.profileCode === "GESTOR" ? "Gestor" : "Operador" } : null} onChange={(value) => setDraft({ ...draft, profileCode: value?.id ?? "" })} required permission="PROFILE_VIEW" /> : <label className="field">Perfil de acesso<select value={draft.profileCode} disabled={!canAssign} onChange={(event) => setDraft({ ...draft, profileCode: event.target.value })} required><option value="OPERADOR">Operador</option><option value="GESTOR">Gestor</option></select></label>}
        {original ? <label className="field">Situação<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as User["status"] })}>{Object.entries(accountStatusLabels).map(([value, label]) => <option key={value} value={value} disabled={value === "ACTIVE" && unverified}>{label}</option>)}</select></label> : null}
      </div>
      <p className="field-help">{original ? "A troca de e-mail exige nova confirmação e encerra as sessões. Não é possível alterar a senha por esta tela." : "A nova conta inicia como convidada. A sessão do gestor permanece ativa."}</p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={!draft.profileCode}>{busy ? "Salvando…" : original ? "Salvar alterações" : "Enviar convite"}</button></div>
    </fieldset></form>
  </Modal>;
}
