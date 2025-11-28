import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number | string | null;
      firstName?: string | null;
      lastName?: string | null;
      occupation?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string | number;
    firstName: string;
    lastName: string;
    occupation: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    firstName?: string | null;
    lastName?: string | null;
    occupation?: string | null;
  }
}

