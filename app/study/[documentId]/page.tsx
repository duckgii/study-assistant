import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StudyFlow from "@/components/StudyFlow";

export default async function StudyPage({ params }: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { documentId } = await params;
  return <StudyFlow documentId={documentId} user={{ name: session.user.name, image: session.user.image }} />;
}
