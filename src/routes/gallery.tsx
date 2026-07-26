import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav, FloatingActions } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { WRAPPINGS, RIBBON_COLORS } from "@/lib/bouquet-catalog";
import { Heart } from "lucide-react";
import { toast } from "sonner";

type Bouquet = {
  id: string; title: string; wrapping: string; ribbon_color: string;
  flowers: { id: string; qty: number }[]; total_price: number; likes_count: number;
  created_at: string; user_id: string;
  profiles?: { display_name: string | null } | null;
};

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Community Gallery — Rose Bouquets in Faridabad | The Rose by Geetanjli" },
      { name: "description", content: "Browse handcrafted rose bouquets & floral arrangements by our community at The Rose by Geetanjli in Faridabad. Order or remix your favorite bouquet." },
      { property: "og:title", content: "Community Gallery — Rose Bouquets | The Rose by Geetanjli" },
      { property: "og:description", content: "Rose bouquets & floral arrangements created by our community at The Rose by Geetanjli in Faridabad." },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const [items, setItems] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bouquets")
        .select("id, title, wrapping, ribbon_color, flowers, total_price, likes_count, created_at, user_id, profiles(display_name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);
      setItems((data as unknown as Bouquet[]) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("bouquet_likes").select("bouquet_id").eq("user_id", userId).then(({ data }) => {
      setLiked(new Set((data ?? []).map((r: { bouquet_id: string }) => r.bouquet_id)));
    });
  }, [userId]);

  const toggleLike = async (b: Bouquet) => {
    if (!userId) { toast.error("Sign in to like bouquets"); return; }
    const isLiked = liked.has(b.id);
    if (isLiked) {
      await supabase.from("bouquet_likes").delete().eq("bouquet_id", b.id).eq("user_id", userId);
      setLiked((s) => { const n = new Set(s); n.delete(b.id); return n; });
      setItems((its) => its.map((x) => x.id === b.id ? { ...x, likes_count: Math.max(0, x.likes_count - 1) } : x));
    } else {
      await supabase.from("bouquet_likes").insert({ bouquet_id: b.id, user_id: userId });
      setLiked((s) => new Set(s).add(b.id));
      setItems((its) => its.map((x) => x.id === b.id ? { ...x, likes_count: x.likes_count + 1 } : x));
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />
      <FloatingActions />

      <div className="pt-32 pb-16 px-6 lg:px-12 mx-auto max-w-[1600px]">
        <div className="max-w-3xl">
          <p className="text-eyebrow text-primary/60">The Royal Floral Gallery — Faridabad</p>
          <h1 className="text-display text-5xl md:text-7xl mt-6">Rose Bouquets & Arrangements by <em>The Rose by Geetanjli.</em></h1>
          <p className="mt-6 opacity-70 max-w-xl">Explore rose bouquets & floral designs by our community in Faridabad. Compose your own bouquet near me to be featured.</p>
          <div className="mt-8">
            <Link to="/builder" className="btn-royal btn-royal-hover">Design Your Own</Link>
          </div>
        </div>

        <div className="mt-16">
          {loading && <p className="text-center opacity-60">Loading…</p>}
          {!loading && items.length === 0 && (
            <div className="text-center py-24 border border-dashed border-border">
              <p className="font-display text-3xl">The gallery awaits its first bouquet.</p>
              <p className="mt-4 opacity-70">Be the first to publish your custom rose bouquet in Faridabad.</p>
              <Link to="/builder" className="btn-royal btn-royal-hover mt-8 inline-flex">Begin composing</Link>
            </div>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]">
            {items.map((b) => {
              const wrap = WRAPPINGS.find((w) => w.id === b.wrapping)?.swatch ?? "var(--ivory)";
              const ribbon = RIBBON_COLORS.find((r) => r.id === b.ribbon_color)?.swatch ?? "var(--forest)";
              const stemCount = b.flowers?.reduce((s, f) => s + f.qty, 0) ?? 0;
              const isLiked = liked.has(b.id);
              return (
                <article key={b.id} className="mb-6 break-inside-avoid bg-ivory border border-border">
                  <div className="relative aspect-[4/5]" style={{ background: `radial-gradient(ellipse at center 60%, ${wrap}, var(--ivory))` }}>
                    <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: wrap, clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" }} />
                    <div className="absolute bottom-[45%] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ background: ribbon }} />
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-xl leading-tight">{b.title}</h3>
                    <p className="text-xs opacity-60 mt-1">by {b.profiles?.display_name ?? "Anonymous"}</p>
                    <div className="mt-4 flex items-center justify-between text-eyebrow opacity-70">
                      <span>{stemCount} stems · ₹{Number(b.total_price).toLocaleString("en-IN")}</span>
                      <button onClick={() => toggleLike(b)} className="flex items-center gap-1 hover:opacity-100">
                        <Heart size={14} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-burgundy" : ""} />
                        <span>{b.likes_count}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
