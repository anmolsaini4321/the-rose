import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — The Rose by Geetanjli" },
      { name: "description", content: "Enter your private atelier to save bouquets and manage your correspondence." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/my-bouquets" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else { toast.success("Welcome. Please check your inbox to confirm."); navigate({ to: "/my-bouquets" }); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else navigate({ to: "/my-bouquets" });
    }
    setLoading(false);
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message);
    else if (!result.redirected) navigate({ to: "/my-bouquets" });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <SiteNav />
      <main className="flex-1 flex items-center justify-center px-6 py-32">
        <div className="w-full max-w-md bg-ivory border border-border p-10">
          <p className="text-eyebrow text-primary/60 text-center">Private Atelier</p>
          <h1 className="text-display text-4xl mt-4 text-center">{mode === "signin" ? "Welcome back." : "Begin your atelier."}</h1>
          <p className="text-center text-sm opacity-70 mt-3">
            {mode === "signin" ? "Continue composing your bouquets." : "Save designs, publish to the gallery."}
          </p>

          <button onClick={google} className="mt-8 w-full border border-border py-3 flex items-center justify-center gap-3 hover:bg-cream transition text-eyebrow">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-eyebrow opacity-40">
            <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary" />
            )}
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
              className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary" />
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" minLength={6}
              className="w-full bg-transparent border-b border-border py-3 focus:outline-none focus:border-primary" />
            <button disabled={loading} className="w-full btn-royal btn-royal-hover mt-6">
              {loading ? "…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm opacity-70">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="underline hover:opacity-100">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="mt-8 text-center text-eyebrow opacity-40">
            <Link to="/">← Return to atelier</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
