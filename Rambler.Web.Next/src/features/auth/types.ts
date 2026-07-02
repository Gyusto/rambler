export interface RegisterInput {
  Nick: string;
  Email: string;
  Password: string;
  PasswordVerify: string;
}

export interface LoginInput {
  Username: string;
  Password: string;
}

export interface Session {
  /** JWT chat token used to open the WebSocket. */
  token: string;
  nick: string;
  isGuest: boolean;
  /** populated once the socket AUTH response arrives. */
  userId?: string;
}
