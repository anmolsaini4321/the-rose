import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Product = {
  id: string;
  title: string;
  price: number;
  thumbnail: string | null;
  images: string[];
};

export const Route = createFileRoute("/qr-menu")({
  head: () => ({
    meta: [
      { title: "Our Bouquets — The Rose by Geetanjli" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id,title,price,thumbnail,images")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setProducts((data as unknown as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-cream px-6 py-10">
      <header className="mb-10">
        <Link to="/" className="font-display text-xl">
          The Rose <span className="italic opacity-70">by Geetanjli</span>
        </Link>
        <h1 className="text-display text-3xl mt-4">Our Bouquets</h1>
        <p className="mt-2 text-sm opacity-60">Tap a bouquet to see details & order.</p>
      </header>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-ivory border border-border animate-pulse">
              <div
                className="aspect-square bg-champagne"
                style={{ background: "var(--champagne)" }}
              />
              <div className="p-3 space-y-2">
                <div
                  className="h-3 bg-champagne rounded w-3/4"
                  style={{ background: "var(--champagne)" }}
                />
                <div
                  className="h-3 bg-champagne rounded w-1/2"
                  style={{ background: "var(--champagne)" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-24 border border-dashed border-border">
          <p className="opacity-60">No bouquets available right now.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              to="/product/$productId"
              params={{ productId: p.id }}
              className="bg-ivory border border-border overflow-hidden block"
            >
              <div
                className="aspect-square overflow-hidden"
                style={{ background: "var(--champagne)" }}
              >
                {p.thumbnail || p.images?.[0] ? (
                  <img
                    src={p.thumbnail ?? p.images[0]}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl opacity-30">🌹</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-display text-sm leading-tight">{p.title}</p>
                <p className="mt-1 text-sm opacity-70">
                  ₹{Number(p.price).toLocaleString("en-IN")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
