import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { Star, ShoppingBag, ChevronLeft, Heart, Share2, Minus, Plus } from "lucide-react";

type Product = {
  id: string;
  title: string;
  description: string;
  short_description: string | null;
  price: number;
  original_price: number | null;
  images: string[];
  thumbnail: string | null;
  category: string;
  tags: string[];
  flowers_included: string[];
  stock_count: number;
  average_rating: number;
  review_count: number;
  meta_title: string | null;
  meta_description: string | null;
};

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/product/$productId")({
  component: ProductDetail,
});

function ProductDetail() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const [realtimeTrigger, setRealtimeTrigger] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("is_published", true)
        .single();

      if (!data) {
        toast.error("Product not found");
        navigate({ to: "/shop" });
        return;
      }
      setProduct(data as unknown as Product);

      const { data: revsData, error: revError } = await supabase
        .from("reviews")
        .select("id,rating,title,body,created_at,user_id")
        .eq("product_id", data.id)
        .eq("is_approved", true)
        .eq("is_removed", false)
        .order("created_at", { ascending: false });

      if (revError) {
        console.error("Reviews fetched error:", revError);
      }

      if (revsData && revsData.length > 0) {
        const uIds = [...new Set(revsData.map((r) => r.user_id))];
        const { data: profData } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_url")
          .in("id", uIds);

        const merged = revsData.map((r) => ({
          ...r,
          profiles: profData?.find((p) => p.id === r.user_id) || null,
        }));
        setReviews(merged as any);
      } else {
        setReviews([]);
      }
      setLoading(false);
    })();
  }, [productId, navigate, realtimeTrigger]);

  useEffect(() => {
    const channel = supabase
      .channel(`product-detail-realtime-${productId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          if (payload.new.id === productId || (product && payload.new.id === product.id)) {
            setRealtimeTrigger((t) => t + 1);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, product?.id]);

  // Check if current user already reviewed
  useEffect(() => {
    if (!userId || reviews.length === 0) return;
    const mine = (reviews as unknown as Array<{ user_id: string }>).find(
      (r) => r.user_id === userId,
    );
    setAlreadyReviewed(!!mine);
  }, [reviews, userId]);

  const handleAddToCart = async () => {
    if (!product) return;

    // Validate stock availability
    if (product.stock_count <= 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    if (qty > product.stock_count) {
      toast.error(`Only ${product.stock_count} units available`);
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
      productId: product.id,
      title: product.title,
      thumbnail: product.thumbnail,
      price: product.price,
      quantity: qty,
    });

    if (success) {
      toast.success(`Added ${qty} × "${product.title}" to your bag`);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please sign in to review");
      navigate({ to: "/auth" });
      return;
    }
    if (!product) return;
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: product.id,
      user_id: userId,
      rating: reviewForm.rating,
      title: reviewForm.title || null,
      body: reviewForm.body,
      is_approved: true, // Auto-approve reviews for now
    });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("You have already reviewed this product.");
        setAlreadyReviewed(true);
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Thank you! Your review has been submitted.");
    setReviewForm({ rating: 5, title: "", body: "" });
    setAlreadyReviewed(true);
    // Refresh reviews
    const { data: revsData } = await supabase
      .from("reviews")
      .select("id,rating,title,body,created_at,user_id")
      .eq("product_id", product.id)
      .eq("is_approved", true)
      .eq("is_removed", false)
      .order("created_at", { ascending: false });

    if (revsData && revsData.length > 0) {
      const uIds = [...new Set(revsData.map((r) => r.user_id))];
      const { data: profData } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", uIds);

      const merged = revsData.map((r) => ({
        ...r,
        profiles: profData?.find((p) => p.id === r.user_id) || null,
      }));
      setReviews(merged as any);
    } else {
      setReviews([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ borderColor: "var(--forest) transparent var(--forest) transparent" }}
        />
        <p className="text-eyebrow opacity-60 mt-6 animate-pulse">Loading bouquet details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
        <SiteNav />
        <div className="text-center pt-28 max-w-md">
          <p className="text-5xl mb-4">🌹</p>
          <h1 className="font-display text-3xl mb-3">Bouquet Not Found</h1>
          <p className="text-sm opacity-60 mb-8">
            The arrangement you are looking for may have been retired or is no longer available.
          </p>
          <Link to="/shop" className="btn-royal btn-royal-hover inline-flex">
            Explore Collection
          </Link>
        </div>
      </div>
    );
  }

  const images =
    product.images.length > 0 ? product.images : product.thumbnail ? [product.thumbnail] : [];

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />

      <div className="pt-28 pb-20 px-6 lg:px-12 mx-auto max-w-[1600px]">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-eyebrow opacity-60 hover:opacity-100 mb-10"
        >
          <ChevronLeft size={12} />
          Back to Shop
        </Link>

        <div className="grid gap-12 lg:grid-cols-12">
          {/* Gallery */}
          <div className="lg:col-span-7">
            <div className="aspect-[4/5] overflow-hidden bg-ivory border border-border">
              {images.length > 0 ? (
                <img
                  src={images[activeImg]}
                  alt={`${product.title} — image ${activeImg + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: "radial-gradient(ellipse, var(--champagne), var(--cream))" }}
                >
                  <span className="text-9xl opacity-20">🌹</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-20 h-20 shrink-0 border-2 transition-all overflow-hidden ${
                      activeImg === i ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="lg:col-span-5">
            <p className="text-eyebrow text-primary/60">{product.category}</p>
            <h1 className="text-display text-4xl md:text-5xl mt-4 leading-tight">
              {product.title}
            </h1>
            {product.short_description && (
              <p className="mt-4 text-lg opacity-70 leading-relaxed">{product.short_description}</p>
            )}

            {/* Rating */}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    fill={s <= Math.round(product.average_rating) ? "currentColor" : "none"}
                    className={s <= Math.round(product.average_rating) ? "" : "opacity-25"}
                    style={{ color: "var(--gold)" }}
                  />
                ))}
              </div>
              <span className="text-eyebrow opacity-60">
                {product.average_rating.toFixed(1)} · {product.review_count}{" "}
                {product.review_count === 1 ? "review" : "reviews"}
              </span>
            </div>

            <div className="hairline my-8" />

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="font-display text-5xl">
                ₹{Number(product.price).toLocaleString("en-IN")}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xl opacity-40 line-through">
                  ₹{Number(product.original_price).toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {/* Stock Availability Badge */}
            <div className="mt-6">
              {product.stock_count <= 0 ? (
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-burgundy/40 bg-burgundy/5 text-burgundy text-eyebrow text-xs tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-burgundy" />
                  <span>Out of Stock, Coming Soon</span>
                </div>
              ) : product.stock_count === 1 ? (
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-[var(--gold)] bg-amber-500/10 text-amber-950 text-eyebrow text-xs tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
                  <span>Limited Reserve — Only 1 Arrangement Remaining</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 border border-border bg-ivory text-primary/80 text-eyebrow text-xs tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest" />
                  <span>In Stock · {product.stock_count} Available</span>
                </div>
              )}
            </div>

            {/* Flowers */}
            {product.flowers_included.length > 0 && (
              <div className="mt-6">
                <p className="text-eyebrow opacity-60 mb-3">Flowers Included</p>
                <div className="flex flex-wrap gap-2">
                  {product.flowers_included.map((f) => (
                    <span
                      key={f}
                      className="text-eyebrow px-3 py-1.5 bg-ivory border border-border text-xs"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-12 h-12 flex items-center justify-center hover:bg-ivory transition"
                >
                  <Minus size={14} />
                </button>
                <span className="w-14 text-center font-display text-lg">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock_count, q + 1))}
                  disabled={qty >= product.stock_count}
                  className="w-12 h-12 flex items-center justify-center hover:bg-ivory transition disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={product.stock_count === 0}
                className="flex-1 btn-royal btn-royal-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingBag size={14} />
                {product.stock_count === 0 ? "Coming Soon" : "Add to Bag"}
              </button>
            </div>

            {product.stock_count > 0 && product.stock_count <= 5 && (
              <p className="mt-3 text-eyebrow opacity-60">
                Only {product.stock_count} left in stock
              </p>
            )}

            <div className="mt-6 flex gap-4">
              <button className="text-eyebrow opacity-60 hover:opacity-100 flex items-center gap-2">
                <Heart size={14} /> Wishlist
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied!");
                }}
                className="text-eyebrow opacity-60 hover:opacity-100 flex items-center gap-2"
              >
                <Share2 size={14} /> Share
              </button>
            </div>

            <div className="hairline my-10" />

            {/* Description */}
            <div>
              <h2 className="font-display text-2xl">Description</h2>
              <div
                className="mt-4 opacity-80 leading-relaxed text-sm"
                dangerouslySetInnerHTML={{
                  __html: product.description.replace(/\n/g, "<br/>"),
                }}
              />
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="mt-8">
                <p className="text-eyebrow opacity-60 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((t) => (
                    <span
                      key={t}
                      className="text-eyebrow px-3 py-1.5 bg-ivory border border-border text-xs"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-24 border-t border-border pt-16 max-w-4xl">
          <h2 className="font-display text-4xl">Reviews</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  fill={s <= Math.round(product.average_rating) ? "currentColor" : "none"}
                  className={s <= Math.round(product.average_rating) ? "" : "opacity-25"}
                  style={{ color: "var(--gold)" }}
                />
              ))}
            </div>
            <span className="text-lg opacity-80">
              {product.average_rating.toFixed(1)} out of 5 &nbsp;·&nbsp; {product.review_count}{" "}
              {product.review_count === 1 ? "review" : "reviews"}
            </span>
          </div>

          {/* Write Review form */}
          {userId && !alreadyReviewed && (
            <form onSubmit={submitReview} className="mt-10 bg-ivory border border-border p-8">
              <p className="font-display text-2xl">Write a Review</p>
              <div className="mt-5">
                <label className="text-eyebrow opacity-60 block mb-2">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star
                        size={28}
                        fill={s <= reviewForm.rating ? "currentColor" : "none"}
                        className={s <= reviewForm.rating ? "" : "opacity-30"}
                        style={{ color: "var(--gold)" }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <label className="text-eyebrow opacity-60 block mb-2">
                  Review Title (optional)
                </label>
                <input
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Sum up your experience"
                  className="w-full bg-cream border border-border p-3 font-display focus:outline-none focus:border-primary"
                />
              </div>
              <div className="mt-4">
                <label className="text-eyebrow opacity-60 block mb-2">Your Review *</label>
                <textarea
                  required
                  rows={4}
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Tell us what you thought about this bouquet…"
                  className="w-full bg-cream border border-border p-3 font-display focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !reviewForm.body}
                className="mt-6 btn-royal btn-royal-hover disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit Review"}
              </button>
            </form>
          )}

          {userId && alreadyReviewed && (
            <div className="mt-10 bg-ivory border border-border p-6 text-center">
              <p className="text-eyebrow opacity-60">You have already reviewed this product.</p>
            </div>
          )}

          {!userId && (
            <div className="mt-10 bg-ivory border border-border p-8 text-center">
              <p className="opacity-70">
                <Link to="/auth" className="underline hover:opacity-100">
                  Sign in
                </Link>{" "}
                to write a review
              </p>
            </div>
          )}

          {/* Review list */}
          <div className="mt-12 space-y-8">
            {reviews.length === 0 && (
              <p className="opacity-60 text-center py-10 border border-dashed border-border">
                No reviews yet. Be the first to review this bouquet.
              </p>
            )}
            {reviews.map((r) => (
              <article key={r.id} className="border-b border-border pb-8">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      fill={s <= r.rating ? "currentColor" : "none"}
                      className={s <= r.rating ? "" : "opacity-25"}
                      style={{ color: "var(--gold)" }}
                    />
                  ))}
                </div>
                {r.title && <h3 className="font-display text-xl mt-2">{r.title}</h3>}
                <p className="mt-2 opacity-80 leading-relaxed">{r.body}</p>
                <div className="mt-3 flex items-center gap-2 text-eyebrow opacity-50">
                  <span>{r.profiles?.display_name ?? "Anonymous"}</span>
                  <span>·</span>
                  <span>
                    {new Date(r.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
