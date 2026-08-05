import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { BouquetCardPreview } from "@/components/BouquetCardPreview";
import { toast } from "sonner";
import { checkAuthRoute } from "@/lib/auth-guard";
import { Trash2, Globe, Lock } from "lucide-react";

type Bouquet = {
  id: string;
  title: string;
  wrapping: string;
  ribbon_color: string;
  flowers: { id: string; qty: number }[];
  total_price: number;
  is_public: boolean;
  created_at: string;
};

export const Route = createFileRoute("/my-bouquets")({
  beforeLoad: async ({ location }) => {
    await checkAuthRoute(location.pathname);
  },
  head: () => ({
    meta: [
      { title: "My Atelier — The Rose by Geetanjli" },
      { name: "description", content: "Your private collection of saved and published bouquets." },
      { property: "og:title", content: "My Atelier — The Rose by Geetanjli" },
      {
        property: "og:description",
        content: "Your private collection of saved and published bouquets.",
      },
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
    if (!u.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    setEmail(u.user.email ?? "");
    const { data } = await supabase
      .from("bouquets")
      .select("*")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });

    const remoteItems = (data as unknown as Bouquet[]) ?? [];
    let userLocal: Bouquet[] = [];
    try {
      const localSaved = JSON.parse(localStorage.getItem("rose_local_bouquets") || "[]");
      userLocal = localSaved.filter((b: any) => b.user_id === u.user.id);
    } catch (e) {
      // Ignore local storage parse error
    }

    const combined = [...userLocal, ...remoteItems].filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
    );
    setItems(combined);
  };
  useEffect(() => {
    load();
  }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this bouquet?")) return;
    if (id.startsWith("b_local_")) {
      try {
        const localSaved = JSON.parse(localStorage.getItem("rose_local_bouquets") || "[]");
        const filtered = localSaved.filter((b: any) => b.id !== id);
        localStorage.setItem("rose_local_bouquets", JSON.stringify(filtered));
        toast.success("Removed from Atelier");
        load();
        return;
      } catch (e) {
        // Ignore local storage error
      }
    }

    const { error } = await supabase.from("bouquets").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Removed");
      load();
    }
  };

  const togglePublic = async (b: Bouquet) => {
    if (b.id.startsWith("b_local_")) {
      try {
        const localSaved = JSON.parse(localStorage.getItem("rose_local_bouquets") || "[]");
        const updated = localSaved.map((item: any) =>
          item.id === b.id ? { ...item, is_public: !item.is_public } : item,
        );
        localStorage.setItem("rose_local_bouquets", JSON.stringify(updated));
        toast.success(b.is_public ? "Set to Private" : "Published to Public Gallery");
        load();
        return;
      } catch (e) {
        // Ignore local storage error
      }
    }

    const { error } = await supabase
      .from("bouquets")
      .update({ is_public: !b.is_public })
      .eq("id", b.id);
    if (error) toast.error(error.message);
    else load();
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
          <div className="mt-8">
            <Link to="/auth" className="btn-royal btn-royal-hover">
              Sign In
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />
      <div className="pt-32 pb-16 px-6 lg:px-12 mx-auto max-w-[1400px]">
        <div className="flex flex-wrap justify-between items-end gap-6">
          <div>
            <p className="text-eyebrow text-primary/60">My Atelier</p>
            <h1 className="text-display text-5xl md:text-7xl mt-6">
              Your <em>compositions.</em>
            </h1>
            <p className="mt-4 opacity-70">Signed in as {email}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/builder" className="btn-royal btn-royal-hover">
              Compose New
            </Link>
            <button onClick={signOut} className="text-eyebrow opacity-60 hover:opacity-100">
              Sign Out →
            </button>
          </div>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {items === null && <p className="opacity-60">Loading…</p>}
          {items && items.length === 0 && (
            <div className="col-span-full text-center py-24 border border-dashed border-border">
              <p className="font-display text-3xl">No bouquets yet.</p>
              <Link to="/builder" className="btn-royal btn-royal-hover mt-8 inline-flex">
                Begin composing
              </Link>
            </div>
          )}
          {items?.map((b) => {
            const stemCount = b.flowers?.reduce((s, f) => s + f.qty, 0) ?? 0;
            return (
              <article key={b.id} className="bg-ivory border border-border shadow-sm">
                <BouquetCardPreview
                  wrapping={b.wrapping}
                  ribbon_color={b.ribbon_color}
                  flowers={b.flowers}
                />
                <div className="p-6">
                  <h3 className="font-display text-2xl">{b.title}</h3>
                  <p className="text-eyebrow opacity-60 mt-2">
                    {stemCount} stems · ₹{Number(b.total_price).toLocaleString("en-IN")}
                  </p>
                  <div className="mt-6 flex justify-between items-center">
                    <button
                      onClick={() => togglePublic(b)}
                      className="text-eyebrow opacity-70 hover:opacity-100 flex items-center gap-2"
                    >
                      {b.is_public ? (
                        <>
                          <Globe size={12} /> Public
                        </>
                      ) : (
                        <>
                          <Lock size={12} /> Private
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => del(b.id)}
                      className="opacity-40 hover:opacity-100 hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
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
