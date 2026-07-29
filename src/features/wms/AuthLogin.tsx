"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { users } from "./mock-data";

const demoPassword = "wms123";

export function AuthLogin() {
  const activeUsers = useMemo(
    () => users.filter((user) => user.status === "Ativo"),
    [],
  );
  const [email, setEmail] = useState(activeUsers[0]?.email ?? "");
  const [password, setPassword] = useState(demoPassword);
  const [message, setMessage] = useState("Use um usuario ativo do mock e a senha wms123.");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const selectedUser = activeUsers.find((user) => user.email === email);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser) {
      setIsAuthenticated(false);
      setMessage("Usuario nao encontrado ou inativo no mock.");
      return;
    }

    if (password !== demoPassword) {
      setIsAuthenticated(false);
      setMessage("Senha invalida para a simulacao.");
      return;
    }

    setIsAuthenticated(true);
    setMessage(`Login simulado para ${selectedUser.name}.`);
  }

  return (
    <main className="login-shell">
      <section className="login-hero">
        <Link className="back-link" href="/">
          Voltar ao painel
        </Link>
        <div>
          <span className="eyebrow">WMS SaaS</span>
          <h1>Acesso do gestor</h1>
          <p>
            Entrada visual para o painel web administrativo, usando somente dados em
            memoria nesta etapa de apresentacao.
          </p>
        </div>
        <div className="login-stats">
          <div>
            <strong>{activeUsers.length}</strong>
            <span>usuarios ativos</span>
          </div>
          <div>
            <strong>8</strong>
            <span>modulos web</span>
          </div>
          <div>
            <strong>RAM</strong>
            <span>sem API</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="brand-block login-brand">
            <div className="brand-mark">W</div>
            <div>
              <strong>Entrar no painel</strong>
              <span>Autenticacao simulada</span>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              E-mail
              <select value={email} onChange={(event) => setEmail(event.target.value)}>
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite a senha"
              />
            </label>

            <button className="primary-button login-submit" type="submit">
              Validar acesso
            </button>
          </form>

          <div className={`login-message ${isAuthenticated ? "success" : ""}`}>
            <strong>{isAuthenticated ? "Acesso liberado" : "Ambiente de teste"}</strong>
            <span>{message}</span>
          </div>

          {selectedUser ? (
            <div className="login-user-preview">
              <div className="avatar">
                {selectedUser.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <strong>{selectedUser.name}</strong>
                <span>{selectedUser.role}</span>
              </div>
              <div className="permission-list">
                {selectedUser.permissions.slice(0, 3).map((permission) => (
                  <span key={permission}>{permission}</span>
                ))}
              </div>
            </div>
          ) : null}

          {isAuthenticated ? (
            <Link className="secondary-button button-link login-panel-link" href="/">
              Abrir dashboard
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
