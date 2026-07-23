import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ContactPageClient from "@/components/ContactPageClient";

export default async function ContactPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ContactPageClient
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  );
}
