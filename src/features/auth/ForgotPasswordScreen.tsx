"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, setAccessToken } from "@/lib/api/client";
import { AuthFrame } from "./AuthFrame";
import { errorMessage, passwordIssue, validCode } from "./models";
import type { AuthChallenge } from "./models";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  useEffect(() => { if (challenge) codeInput.current?.focus(); }, [challenge]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if (challenge) {
        const issue = passwordIssue(password);
        if (issue) throw new Error(issue);
        if (password !== confirmation) throw new Error("As senhas devem ser iguais.");
        if (!validCode(code)) throw new Error("Informe o código de seis dígitos.");
        await api.request<null>("/auth/reset-password", { method: "POST", auth: false, body: { challengeId: challenge.challengeId, code, newPassword: password } });
        setAccessToken(null);
        setPassword(""); setConfirmation(""); setCode(""); setDone(true);
      } else {
        const next = await api.request<AuthChallenge>("/auth/forgot-password", { method: "POST", auth: false, body: { email: email.trim() } });
        if (next.purpose !== "PASSWORD_RESET") throw new Error("Desafio inválido para recuperação. Tente novamente.");
        setChallenge(next);
      }
    } catch (failure) { setError(errorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <AuthFrame title="Recuperar senha" subtitle="Receba um código no e-mail da sua conta">
    {done ? <div className="login-message success" role="status"><strong>Senha atualizada.</strong><p>Entre novamente com sua nova senha. As sessões anteriores foram encerradas.</p><Link className="primary-button button-link" href="/auth/login">Voltar para o acesso</Link></div> : <form className="login-form" onSubmit={submit} aria-busy={busy}>
      <fieldset className="form-fields" disabled={busy}>
        {challenge ? <>
          <p>Enviamos um código para <strong>{challenge.maskedEmail}</strong>. Válido até {new Date(challenge.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}, com até {challenge.maxAttempts} tentativas.</p>
          <label htmlFor="reset-code">Código de seis dígitos<input id="reset-code" ref={codeInput} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /></label>
          <label htmlFor="reset-password">Nova senha<input id="reset-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="reset-password-help" required /></label>
          <label htmlFor="reset-confirmation">Confirmar nova senha<input id="reset-confirmation" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
          <p id="reset-password-help" className="field-help">Use pelo menos oito caracteres e no máximo 72 bytes em UTF-8.</p>
        </> : <label htmlFor="reset-email">E-mail da conta<input id="reset-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
        {error ? <p className="error-banner" role="alert">{error}</p> : null}
        <button className="primary-button login-submit" type="submit" disabled={!!challenge && !validCode(code)}>{busy ? "Aguarde…" : challenge ? "Atualizar senha" : "Enviar código"}</button>
        {challenge ? <button className="secondary-button" type="button" onClick={() => { setChallenge(null); setCode(""); setPassword(""); setConfirmation(""); setError(null); }}>Solicitar outro código</button> : null}
        <Link className="button-link" href="/auth/login">Voltar para o acesso</Link>
      </fieldset>
    </form>}
  </AuthFrame>;
}
