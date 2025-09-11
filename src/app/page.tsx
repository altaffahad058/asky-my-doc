import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="w-full">
        <HomeClient />
      </div>
    </main>
  );
}
