import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Package, ShoppingCart, Users, MessageSquare, Activity, Trash2, Eye, EyeOff,
  TrendingUp, DollarSign, ShoppingBag, Loader2, Plus, Edit
} from "lucide-react";

type Product = {
  id: string;
  title: string;
  price: number;
  is_published: boolean;
  stock_count: number;
  created_at: string;
  review_count: number;
  profiles?: { display_name: string | null } | null;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

type Review = {
  id: string;
  rating: number;
  body: string;
  is_removed: boolean;
  created_at: string;
  product_id: string;
  products?: { title: string } | null;
  profiles?: { display_name: string | null } | null;
};

type Stats = {
  totalProducts: number;
  publishedProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Super Admin Panel — The Rose by Geetanjli" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPanel,
});

function AdminPanel() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"overview" | "products" | "orders" | "reviews">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth gate
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setIsSuperAdmin(false); return; }

      // Fetch all roles for this user (avoids .eq chain RLS edge cases)
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);

      if (error) {
        console.error("[admin] user_roles query error:", error.message);
        setIsSuperAdmin(false);
        return;
      }

      const hasAdmin = (data ?? []).some(
        (r: { role: string }) => r.role === "super_admin"
      );
      setIsSuperAdmin(hasAdmin);
    })();
  }, []);

  // Load data
  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      setLoading(true);
      // Stats
      const [prodRes, orderRes] = await Promise.all([
        supabase.from("products").select("id,is_published", { count: "exact", head: true }),
        supabase.from("orders").select("id,status,total_amount", { count: "exact" }),
      ]);

      const totalProducts = prodRes.count ?? 0;
      const publishedProducts = (await supabase.from("products").select("id", { count: "exact", head: true }).eq("is_published", true)).count ?? 0;
      const totalOrders = orderRes.count ?? 0;
      const totalRevenue = (orderRes.data ?? []).filter((o: { status: string }) => o.status === "paid" || o.status === "delivered").reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0);
      const pendingOrders = (orderRes.data ?? []).filter((o: { status: string }) => o.status === "pending" || o.status === "paid").length;

      setStats({ totalProducts, publishedProducts, totalOrders, totalRevenue, pendingOrders });

      if (tab === "products") {
        const { data } = await supabase
          .from("products")
          .select("id,title,price,is_published,stock_count,created_at,review_count")
          .order("created_at", { ascending: false })
          .limit(50);
        setProducts((data as unknown as Product[]) ?? []);
      } else if (tab === "orders") {
        const { data } = await supabase
          .from("orders")
          .select("id,status,total_amount,created_at,profiles(display_name)")
          .order("created_at", { ascending: false })
          .limit(50);
        setOrders((data as unknown as Order[]) ?? []);
      } else if (tab === "reviews") {
        const { data } = await supabase
          .from("reviews")
          .select("id,rating,body,is_removed,created_at,product_id,products(title),profiles(display_name)")
          .order("created_at", { ascending: false })
          .limit(50);
        setReviews((data as unknown as Review[]) ?? []);
      }

      setLoading(false);
    })();
  }, [isSuperAdmin, tab]);

  const toggleProductPublish = async (p: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ is_published: !p.is_published, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    setProducts((ps) => ps.map((x) => x.id === p.id ? { ...x, is_published: !x.is_published } : x));
    toast.success(p.is_published ? "Product unpublished" : "Product published");
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setProducts((ps) => ps.filter((x) => x.id !== id));
    toast.success("Product deleted");
  };

  const removeReview = async (r: Review) => {
    if (!r.is_removed && !confirm("Remove this review from public view?")) return;
    const { error } = await supabase
      .from("reviews")
      .update({ is_removed: !r.is_removed, removed_by: r.is_removed ? null : (await supabase.auth.getUser()).data.user?.id, updated_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    setReviews((rs) => rs.map((x) => x.id === r.id ? { ...x, is_removed: !x.is_removed } : x));
    toast.success(r.is_removed ? "Review restored" : "Review removed");
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) return toast.error(error.message);
    setOrders((os) => os.map((o) => o.id === orderId ? { ...o, status } : o));
    toast.success(`Order status updated to ${status}`);
  };

  if (isSuperAdmin === false) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center flex-col text-center px-6 pt-32">
          <p className="text-eyebrow text-primary/60">Restricted Area</p>
          <h1 className="text-display text-5xl mt-6">Access Denied.</h1>
          <p className="mt-4 opacity-60">This area is reserved for the super-admin only.</p>
          <div className="mt-10 flex gap-4">
            <Link to="/" className="btn-royal btn-royal-hover">Return Home</Link>
            <Link to="/auth" className="text-eyebrow opacity-70 hover:opacity-100 py-4">Sign In</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (isSuperAdmin === null || !stats) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin opacity-40" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />

      <div className="pt-32 pb-20 px-6 lg:px-12 mx-auto max-w-[1600px]">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-eyebrow text-primary/60">Super Admin Panel</p>
            <h1 className="text-display text-5xl md:text-6xl mt-4">Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/upload" className="btn-royal btn-royal-hover"><Plus size={14} /> New Product</Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-10">
          {[
            { label: "Total Products", value: stats.totalProducts, icon: Package, color: "var(--forest)" },
            { label: "Published", value: stats.publishedProducts, icon: Eye, color: "oklch(0.38 0.08 155)" },
            { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "oklch(0.5 0.1 240)" },
            { label: "Revenue", value: `₹${Number(stats.totalRevenue / 1000).toFixed(0)}k`, icon: DollarSign, color: "var(--gold)" },
            { label: "Pending Orders", value: stats.pendingOrders, icon: Activity, color: "var(--burgundy)" },
          ].map((s, i) => (
            <div key={i} className="bg-ivory border border-border p-6">
              <div className="flex items-center gap-3 mb-3">
                <s.icon size={18} style={{ color: s.color }} />
                <p className="text-eyebrow opacity-60">{s.label}</p>
              </div>
              <p className="font-display text-4xl">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {(["overview", "products", "orders", "reviews"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-eyebrow px-5 py-3 transition-all ${
                tab === t ? "border-b-2 border-primary opacity-100" : "opacity-50 hover:opacity-80"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-20">
            <Loader2 size={32} className="animate-spin opacity-40 mx-auto" />
          </div>
        )}

        {/* Overview */}
        {tab === "overview" && !loading && (
          <div className="space-y-8">
            <section className="bg-ivory border border-border p-8">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp size={20} />
                <h2 className="font-display text-3xl">Activity Feed</h2>
              </div>
              <p className="opacity-60">Recent activity from products, orders, and reviews will appear here.</p>
              <div className="mt-6 space-y-3">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-eyebrow opacity-50">New Order #{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="font-display">₹{Number(o.total_amount).toLocaleString("en-IN")}</p>
                    </div>
                    <p className="text-xs opacity-50">{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Products */}
        {tab === "products" && !loading && (
          <div className="bg-ivory border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="font-display text-2xl">All Products</h2>
              <Link to="/upload" className="text-eyebrow opacity-70 hover:opacity-100"><Plus size={12} /> Add New</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border text-left text-eyebrow opacity-60">
                  <tr>
                    <th className="p-4">Product</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Reviews</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-cream transition">
                      <td className="p-4">
                        <p className="font-display">{p.title}</p>
                        <p className="text-eyebrow opacity-40 mt-1">{new Date(p.created_at).toLocaleDateString("en-IN")}</p>
                      </td>
                      <td className="p-4">₹{Number(p.price).toLocaleString("en-IN")}</td>
                      <td className="p-4">{p.stock_count}</td>
                      <td className="p-4">{p.review_count}</td>
                      <td className="p-4">
                        <span
                          className="text-eyebrow px-3 py-1"
                          style={p.is_published ? { background: "oklch(0.38 0.08 155)", color: "var(--ivory)" } : { background: "var(--champagne)", color: "var(--ink)" }}
                        >
                          {p.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => toggleProductPublish(p)} className="opacity-60 hover:opacity-100" title={p.is_published ? "Unpublish" : "Publish"}>
                            {p.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="opacity-60 hover:opacity-100 hover:text-destructive" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === "orders" && !loading && (
          <div className="bg-ivory border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-2xl">All Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border text-left text-eyebrow opacity-60">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border hover:bg-cream transition">
                      <td className="p-4 font-mono text-xs opacity-60">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="p-4">{o.profiles?.display_name ?? "Guest"}</td>
                      <td className="p-4 font-display">₹{Number(o.total_amount).toLocaleString("en-IN")}</td>
                      <td className="p-4">
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="text-eyebrow px-3 py-1 bg-cream border border-border focus:outline-none focus:border-primary"
                        >
                          {["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-eyebrow opacity-50">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="p-4">
                        <Link to="/orders" className="text-eyebrow opacity-60 hover:opacity-100">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews */}
        {tab === "reviews" && !loading && (
          <div className="bg-ivory border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-2xl">All Reviews</h2>
            </div>
            <div className="space-y-4 p-6">
              {reviews.map((r) => (
                <article key={r.id} className={`border border-border p-5 ${r.is_removed ? "opacity-40" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={s <= r.rating ? "text-gold" : "opacity-25"}>★</span>
                          ))}
                        </div>
                        <span className="text-eyebrow opacity-50">· {r.profiles?.display_name ?? "Anonymous"}</span>
                      </div>
                      <p className="mt-2 opacity-80">{r.body}</p>
                      <div className="mt-2 flex items-center gap-2 text-eyebrow opacity-50">
                        <span>{r.products?.title ?? "Unknown Product"}</span>
                        <span>·</span>
                        <span>{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                      </div>
                      {r.is_removed && <p className="text-eyebrow mt-2 text-destructive">Removed</p>}
                    </div>
                    <button
                      onClick={() => removeReview(r)}
                      className="text-eyebrow opacity-60 hover:opacity-100"
                    >
                      {r.is_removed ? "Restore" : "Remove"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
