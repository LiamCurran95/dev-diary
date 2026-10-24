import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * GitHub sign-in.
 *
 * The `repo` scope is required to see pull requests in private repositories.
 * GitHub has no read-only variant of it for OAuth Apps — if that breadth is a
 * problem for your organisation, a GitHub App with read-only repository
 * permissions is the narrower alternative.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token;
      if (profile && typeof profile.login === "string") token.login = profile.login;
      return token;
    },
    session({ session, token }) {
      // The GitHub access token is deliberately NOT copied onto the session.
      // /api/auth/session is readable by page JavaScript, and the token must
      // never be. It stays in the encrypted JWT cookie and is read only by
      // server routes.
      session.login = token.login;
      return session;
    },
  },
});
