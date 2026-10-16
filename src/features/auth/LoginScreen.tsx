"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AuthFrame } from "./AuthFrame";
import { useAuth } from "./AuthProvider";
import { errorMessage, validCode } from "./models";
import type { AuthChallenge } from "./models";

export function LoginScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  useEffect(() => { if (auth.status === "authenticated") router.replace("/"); }, [auth.status, router]);
  useEffect(() => { if (challenge) codeInput.current?.focus(); }, [challenge]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if (challenge) {
        await auth.verify(challenge.challengeId, code);
      } else {
        if (new TextEncoder().encode(password).byteLength > 72) throw new Error("A senha deve ocupar no máximo 72 bytes em UTF-8.");
        const next = await auth.login(email, password);
        if (next.purpose === "PASSWORD_RESET") throw new Error("Desafio inválido para entrada. Inicie o acesso novamente.");
        setChallenge(next);
        setPassword("");
        setCode("");
      }
    } catch (failure) { setError(errorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }

  const restoring = auth.status === "loading";
  return <AuthFrame title={challenge ? "Confirme seu acesso" : "Entrar no WMS"} subtitle={challenge ? "Verificação por e-mail" : "Acesse sua conta de trabalho"}>
    {restoring ? <p role="status">Verificando sua sessão…</p> : null}
    {auth.status === "error" ? <div className="error-banner" role="alert"><p>{auth.error}</p><button type="button" className="secondary-button" onClick={() => { void auth.retrySession(); }}>Tentar recuperar sessão</button></div> : null}
    {auth.status === "unauthenticated" && auth.error ? <div className="error-banner" role="alert"><p>{auth.error}</p><button type="button" className="secondary-button" onClick={() => { void auth.logout().catch(() => undefined); }}>Tentar encerrar sessão</button></div> : null}
    <form className="login-form" onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy || restoring || auth.status === "authenticated"} className="form-fields">
        {challenge ? <>
          <p>Informe o código enviado para <strong>{challenge.maskedEmail}</strong>. {challenge.purpose === "EMAIL_VERIFICATION" ? "Esta confirmação também ativa o seu primeiro acesso." : "Use o código mais recente."}</p>
          <label htmlFor="login-code">Código de verificação<input id="login-code" ref={codeInput} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-describedby="challenge-help login-error" required /></label>
          <p id="challenge-help" className="field-help">Código com seis dígitos, incluindo zeros iniciais. Válido até {new Date(challenge.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Limite de {challenge.maxAttempts} tentativas.</p>
        </> : <>
          <label htmlFor="login-email">E-mail<input id="login-email" type="email" autoComplete="username" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label htmlFor="login-password">Senha<input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="login-error" required /></label>
          <label className="checkbox-field"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Mostrar senha</label>
        </>}
        {error ? <p id="login-error" className="error-banner" role="alert">{error}</p> : null}
        <button className="primary-button login-submit" type="submit" disabled={!!challenge && !validCode(code)}>{busy ? (challenge ? "Confirmando…" : "Enviando código…") : (challenge ? "Confirmar e entrar" : "Continuar")}</button>
        {challenge ? <button className="secondary-button" type="button" onClick={() => { setChallenge(null); setCode(""); setError(null); }}>Voltar e solicitar outro código</button> : <Link className="button-link" href="/auth/forgot-password">Esqueci minha senha</Link>}
      </fieldset>
    </form>
    <p className="field-help">Precisa de uma conta? Solicite o acesso ao gestor do seu armazém.</p>
  </AuthFrame>;
}
