import type { NextAuthOptions, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

type ProfiledUser = User & {
  id: string | number;
  firstName?: string | null;
  lastName?: string | null;
  occupation?: string | null;
};

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          occupation: user.occupation,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const profile = user as ProfiledUser;
        token.sub = String(profile.id);
        token.firstName = profile.firstName ?? null;
        token.lastName = profile.lastName ?? null;
        token.occupation = profile.occupation ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const numericId =
          typeof token.sub === "number"
            ? token.sub
            : token.sub
            ? Number(token.sub)
            : undefined;
        session.user.id =
          typeof numericId === "number" && !Number.isNaN(numericId)
            ? numericId
            : token.sub ?? null;
        session.user.firstName =
          typeof token.firstName === "string" ? token.firstName : undefined;
        session.user.lastName =
          typeof token.lastName === "string" ? token.lastName : undefined;
        session.user.occupation =
          typeof token.occupation === "string" ? token.occupation : undefined;
      }
      return session;
    },
  },
};
