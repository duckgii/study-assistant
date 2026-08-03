import { redirect } from "next/navigation";
import { auth } from "@/auth";
import FeedbackListClient from "@/components/FeedbackListClient";

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  return <FeedbackListClient user={{ name: session.user.name, image: session.user.image }} />;
}
