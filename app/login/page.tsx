import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import LoginCard from "@/components/LoginCard";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f8fbff_0%,#f3f7ff_100%)] px-6 text-slate-900">
      <LoginCard>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <GoogleSignInButton />
        </form>
      </LoginCard>
    </main>
  );
}
