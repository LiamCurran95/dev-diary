import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** GitHub handle of the signed-in user. Never includes the access token. */
    login?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Server-side only. Never copied onto the session. */
    accessToken?: string;
    login?: string;
  }
}
