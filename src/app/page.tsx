import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-6 md:py-10">
      <div className="w-full">
        <HomeClient />
      </div>
    </main>
  );
}

