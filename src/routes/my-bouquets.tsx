import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav, FloatingActions } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { WRAPPINGS, RIBBON_COLORS } from "@/lib/bouquet-catalog";
import { toast } from "sonner";
import { Trash2, Globe, Lock } from "lucide-react";

type Bouquet = {
  id: string; title: string; wrapping: string; ribbon_color: string;
  flowers: { id: string; qty: number }[]; total_price: number;
  is_public: boolean; created_at: string;
};

export const Route = createFileRoute("/my-bouquets")({
  head: () => ({
    meta: [
      { title: "My Atelier — The Rose by Geetanjli" },
      { name: "description", content: "Your private collection of saved and published bouquets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyBouquets,
});

function MyBouquets() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Bouquet[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSignedIn(false); return; }
    setSignedIn(true);
    setEmail(u.user.email ?? "");
    const { data } = await supabase.from("bouquets").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false });
    setItems((data as unknown as Bouquet[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this bouquet?")) return;
    const { error } = await supabase.from("bouquets").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  };
  const togglePublic = async (b: Bouquet) => {
    const { error } = await supabase.from("bouquets").update({ is_public: !b.is_public }).eq("id", b.id);
    if (error) toast.error(error.message); else load();
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (signedIn === false) {
    return (
      <div className="min-h-screen bg-cream">
        <SiteNav />
        <div className="pt-40 text-center px-6">
          <p className="text-eyebrow text-primary/60">Private</p>
          <h1 className="text-display text-5xl mt-6">Please sign in.</h1>
          <div className="mt-8"><Link to="/auth" className="btn-royal btn-royal-hover">Sign In</Link></div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />
      <FloatingActions />
      <div className="pt-32 pb-16 px-6 lg:px-12 mx-auto max-w-[1400px]">
        <div className="flex flex-wrap justify-between items-end gap-6">
          <div>
            <p className="text-eyebrow text-primary/60">My Atelier</p>
            <h1 className="text-display text-5xl md:text-7xl mt-6">Your <em>compositions.</em></h1>
            <p className="mt-4 opacity-70">Signed in as {email}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/builder" className="btn-royal btn-royal-hover">Compose New</Link>
            <button onClick={signOut} className="text-eyebrow opacity-60 hover:opacity-100">Sign Out →</button>
          </div>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items === null && <p className="opacity-60">Loading…</p>}
          {items && items.length === 0 && (
            <div className="col-span-full text-center py-24 border border-dashed border-border">
              <p className="font-display text-3xl">No bouquets yet.</p>
              <Link to="/builder" className="btn-royal btn-royal-hover mt-8 inline-flex">Begin composing</Link>
            </div>
          )}
          {items?.map((b) => {
            const wrap = WRAPPINGS.find((w) => w.id === b.wrapping)?.swatch ?? "var(--ivory)";
            const ribbon = RIBBON_COLORS.find((r) => r.id === b.ribbon_color)?.swatch ?? "var(--forest)";
            const stemCount = b.flowers?.reduce((s, f) => s + f.qty, 0) ?? 0;
            return (
              <article key={b.id} className="bg-ivory border border-border">
                <div className="relative aspect-[4/5]" style={{ background: `radial-gradient(ellipse at center 60%, ${wrap}, var(--ivory))` }}>
                  <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: wrap, clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" }} />
                  <div className="absolute bottom-[45%] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: ribbon }} />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl">{b.title}</h3>
                  <p className="text-eyebrow opacity-60 mt-2">{stemCount} stems · ₹{Number(b.total_price).toLocaleString("en-IN")}</p>
                  <div className="mt-6 flex justify-between items-center">
                    <button onClick={() => togglePublic(b)} className="text-eyebrow opacity-70 hover:opacity-100 flex items-center gap-2">
                      {b.is_public ? <><Globe size={12}/> Public</> : <><Lock size={12}/> Private</>}
                    </button>
                    <button onClick={() => del(b.id)} className="opacity-40 hover:opacity-100 hover:text-destructive"><Trash2 size={16}/></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
