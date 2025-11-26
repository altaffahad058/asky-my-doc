import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  const userFullName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : undefined;

  return (
    <main className="min-h-screen p-6 md:py-10">
      <div className="w-full">
        <HomeClient userFullName={userFullName} />
      </div>
    </main>
  );
}
