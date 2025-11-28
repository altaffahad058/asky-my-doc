// src/lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function getSessionUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  const rawId = session?.user?.id;
  if (rawId === null || rawId === undefined) return null;
  if (typeof rawId === "number") {
    return Number.isNaN(rawId) ? null : rawId;
  }
  const parsed = Number(rawId);
  return Number.isNaN(parsed) ? null : parsed;
}