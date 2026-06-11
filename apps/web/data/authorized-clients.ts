export type AuthorizedClient = {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "operator";
  status: "authorized" | "disabled";
  telegramAccess: "pending_tdlib" | "ready";
  passwordSource: "env_scrypt";
};

export const authorizedClients: AuthorizedClient[] = [
  {
    id: "owner-buchmanchik",
    email: "buchmanchik@gmail.com",
    displayName: "Buchmanchik",
    role: "owner",
    status: "authorized",
    telegramAccess: "pending_tdlib",
    passwordSource: "env_scrypt"
  }
];

export function getPrimaryAuthorizedClient() {
  const email = process.env.EPICGRAM_OPERATOR_EMAIL?.trim().toLowerCase();
  return authorizedClients.find((client) => client.email.toLowerCase() === email) ?? authorizedClients[0];
}
