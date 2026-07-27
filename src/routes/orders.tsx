import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav, FloatingActions } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/auth-guard";
import { Package, ChevronDown, ChevronUp } from "lucide-react";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products?: { title: string; thumbnail: string | null } | null;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_pincode: string;
  razorpay_payment_id: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: "Pending",    bg: "var(--champagne)", color: "var(--ink)" },
  paid:       { label: "Paid",       bg: "oklch(0.45 0.12 145)", color: "var(--ivory)" },
  processing: { label: "Processing", bg: "oklch(0.6 0.12 200)", color: "var(--ivory)" },
  shipped:    { label: "Shipped",    bg: "oklch(0.5 0.1 240)", color: "var(--ivory)" },
  delivered:  { label: "Delivered",  bg: "oklch(0.38 0.08 155)", color: "var(--ivory)" },
  cancelled:  { label: "Cancelled",  bg: "oklch(0.5 0.18 25)", color: "var(--ivory)" },
  refunded:   { label: "Refunded",   bg: "var(--gold)", color: "var(--forest)" },
};

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — The Rose by Geetanjli" },
      { name: "description", content: "Track and manage your flower bouquet orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setSignedIn(false); return; }
      setSignedIn(true);
      setLoading(true);

      const { data } = await supabase
        .from("orders")
        .select("id,status,total_amount,shipping_name,shipping_address,shipping_city,shipping_pincode,razorpay_payment_id,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });

      if (!data) { setOrders([]); setLoading(false); return; }

      // Load items for each order
      const ordersWithItems: Order[] = await Promise.all(
        (data as unknown as Order[]).map(async (o) => {
          const { data: items } = await supabase
            .from("order_items")
            .select("id,product_id,quantity,unit_price,products(title,thumbnail)")
            .eq("order_id", o.id);
          return { ...o, order_items: (items as unknown as OrderItem[]) ?? [] };
        })
      );
      setOrders(ordersWithItems);
      setLoading(false);
    })();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ borderColor: "var(--forest) transparent var(--forest) transparent" }}
        />
        <p className="text-eyebrow opacity-60 mt-6 animate-pulse">Loading your orders...</p>
      </div>
    );
  }

  if (signedIn === false) {
    return (
      <div className="min-h-screen bg-cream">
        <SiteNav />
        <div className="pt-40 text-center px-6">
          <p className="text-eyebrow text-primary/60">Private</p>
          <h1 className="text-display text-5xl mt-6">Please sign in.</h1>
          <div className="mt-8">
            <Link to="/auth" className="btn-royal btn-royal-hover">Sign In</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />
      <FloatingActions />

      <div className="pt-32 pb-20 px-6 lg:px-12 mx-auto max-w-[1200px]">
        <p className="text-eyebrow text-primary/60">Order History</p>
        <h1 className="text-display text-5xl md:text-7xl mt-6">
          Your <em>orders.</em>
        </h1>

        <div className="mt-16">
          {orders === null && (
            <p className="opacity-60 animate-pulse text-center py-20">Loading your orders…</p>
          )}

          {orders && orders.length === 0 && (
            <div className="text-center py-32 border border-dashed border-border">
              <Package size={40} className="mx-auto opacity-20 mb-6" />
              <p className="font-display text-4xl">No orders yet.</p>
              <p className="mt-4 opacity-60">Browse our collection and place your first order.</p>
              <Link to="/shop" className="btn-royal btn-royal-hover mt-10 inline-flex">
                Browse Shop
              </Link>
            </div>
          )}

          {orders && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((o) => {
                const st = STATUS_STYLES[o.status] ?? STATUS_STYLES.pending;
                const isOpen = expanded.has(o.id);
                return (
                  <article key={o.id} className="bg-ivory border border-border">
                    <div
                      className="p-6 flex flex-wrap gap-4 items-center justify-between cursor-pointer select-none"
                      onClick={() => toggleExpand(o.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-eyebrow opacity-60">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </p>
                          <span
                            className="text-eyebrow px-3 py-1"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                        </div>
                        <p className="font-display text-2xl mt-2">
                          ₹{Number(o.total_amount).toLocaleString("en-IN")}
                        </p>
                        <p className="text-eyebrow opacity-50 mt-1">
                          {new Date(o.created_at).toLocaleDateString("en-IN", {
                            weekday: "short", year: "numeric", month: "short", day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm opacity-70">{o.shipping_city}</p>
                        {isOpen ? <ChevronUp size={16} className="opacity-40" /> : <ChevronDown size={16} className="opacity-40" />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-border p-6">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div>
                            <p className="text-eyebrow opacity-60 mb-4">Items</p>
                            <div className="space-y-3">
                              {o.order_items?.map((item) => (
                                <div key={item.id} className="flex gap-3 items-center">
                                  <div className="w-14 h-14 border border-border shrink-0 overflow-hidden" style={{ background: "var(--champagne)" }}>
                                    {item.products?.thumbnail ? (
                                      <img src={item.products.thumbnail} alt={item.products.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xl opacity-30">🌹</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-display leading-tight">{item.products?.title ?? "Bouquet"}</p>
                                    <p className="text-eyebrow opacity-50 mt-1">
                                      {item.quantity} × ₹{Number(item.unit_price).toLocaleString("en-IN")}
                                    </p>
                                  </div>
                                  <p className="font-display shrink-0">
                                    ₹{(item.quantity * item.unit_price).toLocaleString("en-IN")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-eyebrow opacity-60 mb-4">Delivery To</p>
                            <div className="text-sm space-y-1 opacity-80">
                              <p className="font-display text-lg">{o.shipping_name}</p>
                              <p>{o.shipping_address}</p>
                              <p>{o.shipping_city} — {o.shipping_pincode}</p>
                            </div>
                            {o.razorpay_payment_id && (
                              <div className="mt-4">
                                <p className="text-eyebrow opacity-60">Payment ID</p>
                                <p className="text-sm opacity-60 font-mono mt-1">{o.razorpay_payment_id}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
