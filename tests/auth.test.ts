import test from "node:test";
import assert from "node:assert/strict";
import { canUser, passwordIssue, validCode } from "../src/features/auth/models";
import { permissionLabel, profileUpdatePayload, togglePermission, userUpdatePayload } from "../src/features/users/admin-models";

import type { User } from "../src/features/auth/models";
import type { UserDraft } from "../src/features/users/admin-models";

const current: User = {
  id: "01TEST", name: "Gestor", email: "gestor@example.com", status: "ACTIVE",
  profileCode: "GESTOR", profileActive: true, permissions: ["USER_VIEW", "USER_EDIT"],
  emailVerifiedAt: "2026-10-15T10:00:00Z", lockedUntil: null, lastLoginAt: null,
  createdAt: "2026-10-15T10:00:00Z", updatedAt: "2026-10-15T10:00:00Z",
};

test("authentication codes retain leading zeroes and require six digits", () => {
  assert.equal(validCode("012345"), true);
  for (const invalid of ["12345", "1234567", "12 345", "abcdef", ""]) assert.equal(validCode(invalid), false);
});

test("permissions come from the active account and profile, including custom profile names", () => {
  assert.equal(canUser(current, "USER_EDIT"), true);
  assert.equal(canUser(current, "PROFILE_EDIT"), false);
  assert.equal(canUser({ ...current, profileCode: "OPERADOR" }, "USER_EDIT"), true);
  assert.equal(canUser({ ...current, status: "INVITED" }, "USER_EDIT"), false);
  assert.equal(canUser({ ...current, profileActive: false }, "USER_EDIT"), false);
  assert.equal(canUser(null, "USER_EDIT"), false);
});

test("new passwords enforce UTF-8 byte limit rather than only character count", () => {
  assert.equal(passwordIssue("senha123"), null);
  assert.equal(passwordIssue("a".repeat(72)), null);
  assert.ok(passwordIssue("a".repeat(73)));
  assert.ok(passwordIssue("🔒".repeat(19)));
  assert.ok(passwordIssue("1234567"));
});

test("user edits preserve original profile when profile assignment is unavailable", () => {
  const draft: UserDraft = { name: " Nome editado ", email: " pessoa@example.com ", password: "never-send", profileCode: "OPERADOR", status: "DISABLED" };
  assert.deepEqual(userUpdatePayload(current, draft, false), { name: "Nome editado", email: "pessoa@example.com", profileCode: "GESTOR", status: "DISABLED" });
  assert.equal(userUpdatePayload(current, draft, true).profileCode, "OPERADOR");
  assert.equal("password" in userUpdatePayload(current, draft, true), false);
});

test("profile edits retain permissions hidden by catalog search or a catalog version", () => {
  const original = new Set(["STOCK_VIEW", "CUSTOM_RETAINED", "PRODUCT_VIEW"]);
  const next = togglePermission(original, "PRODUCT_VIEW");
  assert.deepEqual(profileUpdatePayload(" Operador ", true, next), { name: "Operador", active: true, permissions: ["CUSTOM_RETAINED", "STOCK_VIEW"] });
  assert.ok(original.has("PRODUCT_VIEW"));
  assert.ok(togglePermission(next, "PRODUCT_CREATE").has("PRODUCT_CREATE"));
});

test("permission labels translate compound resource and action names", () => {
  assert.equal(permissionLabel("PRE_RECEIPT_CREATE"), "Criar pré-recebimentos");
  assert.equal(permissionLabel("USER_PROFILE_ASSIGN"), "Atribuir perfil a usuários");
  assert.equal(permissionLabel("PICKING_REPORT_DIVERGENCE"), "Informar divergência em separações");
  assert.equal(permissionLabel("NEW_PERMISSION"), "NEW_PERMISSION");
});
