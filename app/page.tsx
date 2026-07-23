import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DirectoryBrowser from "@/components/DirectoryBrowser";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <DirectoryBrowser user={{ name: session.user.name, image: session.user.image }} />;
}
