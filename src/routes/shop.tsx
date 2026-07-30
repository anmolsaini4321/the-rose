import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { Star, ShoppingBag, Filter, ChevronDown } from "lucide-react";

type Product = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  price: number;
  original_price: number | null;
  thumbnail: string | null;
  images: string[];
  category: string;
  tags: string[];
  average_rating: number;
  review_count: number;
  stock_count: number;
  is_featured: boolean;
  flowers_included: string[];
};

const CATEGORIES = ["All", "Bouquet", "Wedding", "Hamper", "Forever Rose", "Seasonal"];

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop Bouquets — Fresh Flower Delivery in Faridabad | The Rose by Geetanjli" },
      {
        name: "description",
        content:
          "Shop handcrafted rose bouquets & fresh floral arrangements with same-day delivery in Faridabad. Order luxury bouquets online from The Rose by Geetanjli.",
      },
      {
        name: "keywords",
        content:
          "buy bouquet online, flower shop Faridabad, rose bouquet price, fresh flower delivery, order flowers online Faridabad",
      },
      { property: "og:title", content: "Shop Bouquets — The Rose by Geetanjli Faridabad" },
      {
        property: "og:description",
        content:
          "Shop handcrafted rose bouquets & fresh floral arrangements with same-day delivery in Faridabad.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Shop,
});

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={11}
            className={s <= Math.round(rating) ? "text-gold fill-gold" : "opacity-25"}
            style={{ color: s <= Math.round(rating) ? "var(--gold)" : undefined }}
          />
        ))}
      </div>
      <span className="text-eyebrow opacity-50">({count})</span>
    </div>
  );
}

function Shop() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "rating">("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from("products")
        .select(
          "id,title,slug,short_description,price,original_price,thumbnail,images,category,tags,average_rating,review_count,stock_count,is_featured,flowers_included",
        )
        .eq("is_published", true);

      if (activeCategory !== "All") {
        query = query.ilike("category", activeCategory);
      }
      if (sortBy === "newest") query = query.order("created_at", { ascending: false });
      else if (sortBy === "price_asc") query = query.order("price", { ascending: true });
      else if (sortBy === "price_desc") query = query.order("price", { ascending: false });
      else if (sortBy === "rating") query = query.order("average_rating", { ascending: false });

      const { data } = await query.limit(48);
      setProducts((data as unknown as Product[]) ?? []);
      setLoading(false);
    })();
  }, [activeCategory, sortBy]);

  const handleQuickAdd = async (p: Product) => {
    // Validate stock availability
    if (p.stock_count <= 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate({ to: "/auth" });
      toast.error("Please sign in to add items to your bag");
      return;
    }

    const success = await addToCart({
      productId: p.id,
      title: p.title,
      thumbnail: p.thumbnail,
      price: p.price,
      quantity: 1,
    });

    if (success) {
      toast.success(`"${p.title}" added to your bag`);
    }
  };

  const featured = products.filter((p) => p.is_featured);
  const regular = products.filter((p) => !p.is_featured || activeCategory !== "All");

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />

      {/* Hero strip */}
      <section className="pt-32 pb-16 px-6 lg:px-12 mx-auto max-w-[1600px]">
        <div className="max-w-3xl">
          <p className="text-eyebrow text-primary/60">The Atelier — Online Shop</p>
          <h1 className="text-display text-5xl md:text-7xl mt-6">
            Fresh Bouquets, <em>delivered in Faridabad.</em>
          </h1>
          <p className="mt-6 opacity-70 max-w-xl">
            Order handcrafted rose bouquets & luxury florals online. Same-day delivery available
            across Faridabad from The Rose by Geetanjli.
          </p>
        </div>
      </section>

      {/* Featured band */}
      {activeCategory === "All" && featured.length > 0 && (
        <section className="px-6 lg:px-12 mx-auto max-w-[1600px] mb-16">
          <p className="text-eyebrow text-primary/60 mb-8">Featured Arrangements</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((p) => (
              <FeaturedCard key={p.id} product={p} onQuickAdd={handleQuickAdd} />
            ))}
          </div>
        </section>
      )}

      {/* Filters + Grid */}
      <section className="px-6 lg:px-12 mx-auto max-w-[1600px] pb-24">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-10 border-b border-border pb-6">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-eyebrow px-4 py-2 border transition-all ${
                  activeCategory === cat
                    ? "border-primary bg-forest text-ivory"
                    : "border-border hover:border-primary/50"
                }`}
                style={
                  activeCategory === cat
                    ? { background: "var(--forest)", color: "var(--ivory)" }
                    : {}
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowFilters((f) => !f)}
              className="text-eyebrow opacity-70 hover:opacity-100 flex items-center gap-2 border border-border px-4 py-2"
            >
              <Filter size={12} />
              Sort
              <ChevronDown size={12} />
            </button>
            {showFilters && (
              <div className="absolute right-0 top-full mt-1 bg-ivory border border-border shadow-lg z-10 min-w-[180px]">
                {[
                  { v: "newest", l: "Newest First" },
                  { v: "price_asc", l: "Price: Low to High" },
                  { v: "price_desc", l: "Price: High to Low" },
                  { v: "rating", l: "Top Rated" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => {
                      setSortBy(opt.v as typeof sortBy);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-5 py-3 text-eyebrow hover:bg-cream transition ${sortBy === opt.v ? "opacity-100" : "opacity-60"}`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-ivory border border-border animate-pulse">
                <div
                  className="aspect-[3/4] bg-champagne"
                  style={{ background: "var(--champagne)" }}
                />
                <div className="p-5 space-y-3">
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
          <div className="text-center py-32 border border-dashed border-border">
            <p className="font-display text-4xl">No bouquets yet.</p>
            <p className="mt-4 opacity-60">The collection is being curated. Check back soon.</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(activeCategory === "All" ? regular : products).map((p) => (
              <ProductCard key={p.id} product={p} onQuickAdd={handleQuickAdd} />
            ))}
          </div>
        )}
      </section>

      {/* SEO block */}
      <section className="px-6 lg:px-12 mx-auto max-w-[1600px] pb-20 border-t border-border pt-16">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl">Order Fresh Flower Bouquets Online in Faridabad</h2>
          <p className="mt-4 opacity-70 leading-relaxed text-sm">
            The Rose by Geetanjli is Faridabad's premier online flower shop. We offer a curated
            selection of handcrafted rose bouquets, wedding arrangements, luxury hampers, and
            preserved forever roses — all available with fast local delivery. Browse our collection
            and order your perfect bouquet online today.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeaturedCard({
  product: p,
  onQuickAdd,
}: {
  product: Product;
  onQuickAdd: (p: Product) => void;
}) {
  return (
    <article className="group relative bg-ivory border border-border overflow-hidden">
      <Link to="/product/$productId" params={{ productId: p.id }}>
        <div
          className="relative aspect-[4/5] overflow-hidden bg-champagne"
          style={{ background: "var(--champagne)" }}
        >
          {p.thumbnail || p.images?.[0] ? (
            <img
              src={p.thumbnail ?? p.images[0]}
              alt={`${p.title} — handcrafted bouquet by The Rose by Geetanjli, Faridabad`}
              className="w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <PlaceholderBloom />
          )}
          <div className="absolute top-4 left-4">
            <span
              className="text-eyebrow px-3 py-1.5 text-xs"
              style={{ background: "var(--gold)", color: "var(--forest)" }}
            >
              Featured
            </span>
          </div>
          {p.original_price && p.original_price > p.price && (
            <div className="absolute top-4 right-4">
              <span
                className="text-eyebrow px-3 py-1.5 text-xs"
                style={{ background: "var(--burgundy)", color: "var(--ivory)" }}
              >
                Sale
              </span>
            </div>
          )}
        </div>
        <div className="p-6">
          <p className="text-eyebrow opacity-50">{p.category}</p>
          <h3 className="font-display text-2xl mt-2 group-hover:italic transition-all">
            {p.title}
          </h3>
          {p.short_description && (
            <p className="text-sm opacity-60 mt-2 line-clamp-2">{p.short_description}</p>
          )}
          <div className="mt-3">
            <StarRating rating={p.average_rating} count={p.review_count} />
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-2xl">
              ₹{Number(p.price).toLocaleString("en-IN")}
            </span>
            {p.original_price && p.original_price > p.price && (
              <span className="text-sm opacity-40 line-through">
                ₹{Number(p.original_price).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-6 pb-6">
        <button
          onClick={() => onQuickAdd(p)}
          disabled={p.stock_count === 0}
          className="w-full btn-royal btn-royal-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingBag size={14} />
          {p.stock_count === 0 ? "Out of Stock" : "Add to Bag"}
        </button>
      </div>
    </article>
  );
}

function ProductCard({
  product: p,
  onQuickAdd,
}: {
  product: Product;
  onQuickAdd: (p: Product) => void;
}) {
  return (
    <article className="group bg-ivory border border-border overflow-hidden">
      <Link to="/product/$productId" params={{ productId: p.id }}>
        <div
          className="relative aspect-[3/4] overflow-hidden"
          style={{ background: "var(--champagne)" }}
        >
          {p.thumbnail || p.images?.[0] ? (
            <img
              src={p.thumbnail ?? p.images[0]}
              alt={`${p.title} — fresh bouquet by The Rose by Geetanjli`}
              className="w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <PlaceholderBloom />
          )}
          {p.stock_count === 0 && (
            <div className="absolute inset-0 bg-cream/70 flex items-center justify-center">
              <span className="text-eyebrow">Out of Stock</span>
            </div>
          )}
        </div>
        <div className="p-5">
          <p className="text-eyebrow opacity-40 text-[0.62rem]">{p.category}</p>
          <h3 className="font-display text-xl mt-1 group-hover:italic transition-all leading-tight">
            {p.title}
          </h3>
          <div className="mt-2">
            <StarRating rating={p.average_rating} count={p.review_count} />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-xl">₹{Number(p.price).toLocaleString("en-IN")}</span>
            {p.original_price && p.original_price > p.price && (
              <span className="text-xs opacity-40 line-through">
                ₹{Number(p.original_price).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-5 pb-5">
        <button
          onClick={() => onQuickAdd(p)}
          disabled={p.stock_count === 0}
          className="w-full btn-royal btn-royal-hover text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingBag size={12} />
          {p.stock_count === 0 ? "Sold Out" : "Add to Bag"}
        </button>
      </div>
    </article>
  );
}

function PlaceholderBloom() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, var(--champagne), var(--cream))" }}
    >
      <span className="text-6xl opacity-30">🌹</span>
    </div>
  );
}
