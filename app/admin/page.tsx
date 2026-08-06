import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  return <AdminDashboardClient user={{ name: session.user.name, image: session.user.image }} />;
}
