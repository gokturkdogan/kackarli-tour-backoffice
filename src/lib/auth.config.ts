import type { NextAuthConfig } from "next-auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 60 * 60 * 24, // extend session daily while active
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoginPage = nextUrl.pathname === "/login";
      const isAdmin = auth?.user?.role === "ADMIN";

      if (isLoginPage) {
        if (isAdmin) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return !!isAdmin;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
