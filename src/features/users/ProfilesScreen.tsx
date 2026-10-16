"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "@/lib/api/client";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { Modal, Notice, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { errorMessage } from "@/features/auth/models";
import { permissionLabel, profileUpdatePayload, togglePermission } from "./admin-models";
import type { AdminPage, Permission, Profile } from "./admin-models";

async function allPermissions(): Promise<Permission[]> {
  const permissions: Permission[] = [];
  let page = 0;
  while (true) {
    const result = await api.get<AdminPage<Permission>>("/permissions", { page, size: 100 });
    permissions.push(...result.content);
    if (result.last || page + 1 >= result.totalPages) return permissions;
    ++page;
  }
}

export function ProfilesScreen() {
  const auth = useAuth();
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<{ profile: Profile; catalog: Permission[] } | null>(null);
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function open(profile: Profile) {
    if (loadingCode) return;
    setLoadingCode(profile.code); setError(null);
    try {
      const [current, catalog] = await Promise.all([api.get<Profile>(`/profiles/${encodeURIComponent(profile.code)}`), allPermissions()]);
      setEditor({ profile: current, catalog });
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setLoadingCode(null); }
  }
  return <div className="screen-stack">
    {message ? <Notice tone="success">{message}</Notice> : null}
    {error ? <Notice tone="error">{error}</Notice> : null}
    <ResourceTable<Profile> title="Perfis e permissões" description="As permissões de cada perfil controlam os recursos disponíveis no web e no mobile." endpoint="/profiles" permission="PROFILE_VIEW" reloadKey={reload} searchPlaceholder="Pesquisar perfil ou permissão"
      columns={[{ key: "code", label: "Código" }, { key: "name", label: "Nome" }, { key: "active", label: "Situação", render: (profile) => <StatusPill value={profile.active ? "ACTIVE" : "DISABLED"} /> }, { key: "permissions", label: "Permissões", render: (profile) => `${profile.permissions.length} permissões` }]}
      rowActions={(profile) => <button className="secondary-button" type="button" disabled={loadingCode !== null} onClick={() => { void open(profile); }}>{loadingCode === profile.code ? "Carregando…" : auth.can("PROFILE_EDIT") ? "Editar permissões" : "Consultar permissões"}</button>}
    />
    {editor ? <ProfileEditor key={editor.profile.code} profile={editor.profile} catalog={editor.catalog} onClose={() => setEditor(null)} onSaved={(code) => { setEditor(null); setReload((value) => value + 1); setMessage("Perfil atualizado. As mudanças se aplicam a todos os usuários vinculados."); if (code === auth.user?.profileCode) void auth.reloadUser().catch(() => undefined); }} /> : null}
  </div>;
}

function ProfileEditor({ profile, catalog, onClose, onSaved }: { profile: Profile; catalog: Permission[]; onClose: () => void; onSaved: (code: string) => void }) {
  const auth = useAuth();
  const canEdit = auth.can("PROFILE_EDIT");
  const [name, setName] = useState(profile.name);
  const [active, setActive] = useState(profile.active);
  const [selected, setSelected] = useState(() => new Set(profile.permissions));
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  // Include existing codes even if a catalog version no longer contains them.
  const completeCatalog = useMemo(() => {
    const options = new Map(catalog.map((permission) => [permission.code, permission]));
    for (const code of profile.permissions) if (!options.has(code)) options.set(code, { code, functionalRequirement: "" });
    return Array.from(options.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [catalog, profile.permissions]);
  const visible = completeCatalog.filter((permission) => `${permission.code} ${permission.functionalRequirement} ${permissionLabel(permission.code)}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !canEdit) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      await api.request<Profile>(`/profiles/${encodeURIComponent(profile.code)}`, { method: "PUT", body: profileUpdatePayload(name, active, selected) });
      onSaved(profile.code);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Modal title={`${canEdit ? "Editar" : "Consultar"} perfil · ${profile.code}`} onClose={onClose} busy={busy}>
    <form onSubmit={save} aria-busy={busy}>
      <fieldset className="form-fields" disabled={busy}>
        <p>As alterações afetam todas as pessoas vinculadas a este perfil. O gestor mantém as permissões administrativas protegidas pelo sistema.</p>
        <label className="field">Nome do perfil<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} readOnly={!canEdit} required /></label>
        <label className="checkbox-field"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} disabled={!canEdit} /> Perfil ativo</label>
        <label className="field">Filtrar permissões<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: produtos, estoque, RF017" /></label>
        <p className="field-help" aria-live="polite">{selected.size} permissões selecionadas · {visible.length} exibidas. A pesquisa mantém as seleções das outras permissões.</p>
        <div className="permission-editor" role="group" aria-label="Permissões do perfil">
          {visible.map((permission) => <label className="checkbox-field permission-option" key={permission.code}><input type="checkbox" checked={selected.has(permission.code)} disabled={!canEdit} onChange={() => setSelected((current) => togglePermission(current, permission.code))} /><span><strong>{permissionLabel(permission.code)}</strong><small className="field-help">{permission.code}{permission.functionalRequirement ? ` · ${permission.functionalRequirement}` : ""}</small></span></label>)}
          {!visible.length ? <p>Nenhuma permissão corresponde à pesquisa.</p> : null}
        </div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="form-actions"><button className="secondary-button" type="button" onClick={onClose}>{canEdit ? "Cancelar" : "Fechar"}</button>{canEdit ? <button className="primary-button" type="submit">{busy ? "Salvando…" : "Salvar perfil"}</button> : null}</div>
      </fieldset>
    </form>
  </Modal>;
}
