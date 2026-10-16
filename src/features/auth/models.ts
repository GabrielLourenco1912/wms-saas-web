export type User = {
  id: string;
  name: string;
  email: string;
  status: "INVITED" | "ACTIVE" | "LOCKED" | "DISABLED";
  profileCode: string;
  profileActive: boolean;
  permissions: string[];
  emailVerifiedAt: string | null;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthChallenge = {
  challengeId: string;
  purpose: "EMAIL_VERIFICATION" | "MFA_LOGIN" | "PASSWORD_RESET";
  maskedEmail: string;
  expiresAt: string;
  maxAttempts: number;
};

export type AccessToken = {
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  subject: string;
  token: string;
  refreshTokenExpiresAt: string;
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a solicitação. Tente novamente.";
}

export function validCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function passwordIssue(password: string): string | null {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (new TextEncoder().encode(password).byteLength > 72) return "A senha deve ocupar no máximo 72 bytes em UTF-8. Reduza a quantidade de caracteres.";
  return null;
}

export function canUser(user: User | null, permission: string): boolean {
  return !!user && user.status === "ACTIVE" && user.profileActive && user.permissions.includes(permission);
}
