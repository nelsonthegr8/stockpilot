import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, signIn, signOut, handlers } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as { id?: string; role: string; active: boolean };
        const jwtToken = token as typeof token & { id?: string; role: string; active: boolean };
        if (authUser.id) jwtToken.id = authUser.id;
        jwtToken.role = authUser.role;
        jwtToken.active = authUser.active;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as typeof session.user & { id: string; role: string; active: boolean }).id = token.id as string;
        (session.user as typeof session.user & { id: string; role: string; active: boolean }).role = token.role as string;
        (session.user as typeof session.user & { id: string; role: string; active: boolean }).active = token.active as boolean;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || !user.active) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, active: user.active };
      },
    }),
  ],
});
