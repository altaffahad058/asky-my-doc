import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="card w-full max-w-2xl">
        <h1>Welcome</h1>
        <p className="muted mt-1">You are signed in.</p>
        <HomeClient />
      </div>
    </main>
  );
}
