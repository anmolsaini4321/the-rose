import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkAdminRoute } from "@/lib/auth-guard";
import {
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  Activity,
  Trash2,
  Eye,
  EyeOff,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Loader2,
  Plus,
  Edit,
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

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  products: { id: string; title: string } | null;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_pincode: string;
  notes: string | null;
  profiles?: { display_name: string | null } | null;
  order_items?: OrderItem[];
};

type Review = {
  id: string;
  rating: number;
  body: string;
  is_removed: boolean;
  created_at: string;
  user_id: string;
  product_id: string;
  products?: { id: string; title: string } | null;
  profiles?: { display_name: string | null } | null;
};

type ProductReviews = {
  product: { id: string; title: string };
  reviews: Review[];
};

type Stats = {
  totalProducts: number;
  publishedProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
};

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    await checkAdminRoute(location.pathname);
  },
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
  const [productReviews, setProductReviews] = useState<ProductReviews[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Auth gate
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setIsSuperAdmin(false);
        return;
      }

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

      const hasAdmin = (data ?? []).some((r: { role: string }) => r.role === "super_admin");
      setIsSuperAdmin(hasAdmin);
    })();
  }, []);

  // Load data helper
  const loadData = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      // Stats
      const [prodRes, orderRes] = await Promise.all([
        supabase.from("products").select("id,is_published", { count: "exact", head: true }),
        supabase.from("orders").select("id,status,total_amount", { count: "exact" }),
      ]);

      const totalProducts = prodRes.count ?? 0;
      const publishedProducts =
        (
          await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_published", true)
        ).count ?? 0;
      const totalOrders = orderRes.count ?? 0;
      const totalRevenue = (orderRes.data ?? [])
        .filter((o: { status: string }) => o.status === "paid" || o.status === "delivered")
        .reduce((s: number, o: { total_amount: number }) => s + o.total_amount, 0);
      const pendingOrders = (orderRes.data ?? []).filter(
        (o: { status: string }) => o.status === "pending" || o.status === "paid",
      ).length;

      setStats({ totalProducts, publishedProducts, totalOrders, totalRevenue, pendingOrders });

      if (tab === "products") {
        const { data } = await supabase
          .from("products")
          .select("id,title,price,is_published,stock_count,created_at,review_count")
          .order("created_at", { ascending: false })
          .limit(50);
        setProducts((data as unknown as Product[]) ?? []);
      } else if (tab === "orders") {
        const { data, error: ordersError } = await supabase
          .from("orders")
          .select(
            `
            id,
            status,
            total_amount,
            created_at,
            user_id,
            shipping_name,
            shipping_phone,
            shipping_address,
            shipping_city,
            shipping_pincode,
            notes,
            order_items(
              id,
              quantity,
              unit_price,
              products(id, title)
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(50);

        if (ordersError) {
          toast.error("Failed to load orders");
          console.error("Orders fetch error:", ordersError);
          setLoading(false);
          return;
        }

        const ordersArray = data as any[];

        // Fetch profiles for all unique user_ids in orders
        const userIds = [...new Set(ordersArray.map((o: any) => o.user_id).filter(Boolean))];
        let profilesData: any[] = [];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds);
          profilesData = profiles ?? [];
        }

        interface OrderItemInput {
          id: string;
          quantity: number | string;
          unit_price: number | string;
          products?: { id: string; title: string } | null;
        }

        const isUUID = (str: string): boolean =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        const userProfiles = profilesData.filter((p: any) => p.id && isUUID(p.id));

        const formattedOrders = ordersArray.map((o: any): Order => {
          // Validate required fields
          if (!o.id || !isUUID(o.id)) throw new Error(`Invalid order ID: ${o.id}`);
          if (typeof o.total_amount !== "number" || o.total_amount < 0) {
            throw new Error(`Invalid total_amount for order ${o.id}: ${o.total_amount}`);
          }

          const matchingProfile = userProfiles.find((p: any) => p.id === o.user_id);

          const orderItems = (o.order_items ?? []).map((item: OrderItemInput): OrderItem => {
            if (!item.id || !isUUID(item.id)) {
              console.warn(`Invalid order item ID: ${item.id}`);
            }

            const quantity = Number(item.quantity);
            if (isNaN(quantity) || quantity <= 0) {
              throw new Error(`Invalid quantity for order item: ${item.quantity}`);
            }

            const unitPrice = Number(item.unit_price);
            if (isNaN(unitPrice) || unitPrice < 0) {
              throw new Error(`Invalid unit_price for order item: ${item.unit_price}`);
            }

            return {
              id: item.id,
              quantity,
              unit_price: unitPrice,
              products: item.products ? { id: item.products.id, title: item.products.title } : null,
            };
          });

          return {
            ...o,
            profiles: matchingProfile ? { display_name: matchingProfile.display_name } : null,
            order_items: orderItems,
          };
        });

        setOrders(formattedOrders);

        // Update selected order details in realtime if the modal is open
        if (selectedOrder) {
          const updatedSelected = formattedOrders.find((x) => x.id === selectedOrder.id);
          if (updatedSelected) {
            setSelectedOrder(updatedSelected);
          }
        }
      } else if (tab === "reviews") {
        // Fetch all reviews with product info (with explicit null handling and server-side limit)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select(
            `
            id,
            rating,
            body,
            is_removed,
            created_at,
            user_id,
            product_id,
            products(id, title)
          `,
          )
          .order("created_at", { ascending: false, nullsFirst: false })
          .limit(50);

        if (reviewsError) {
          toast.error("Failed to load reviews");
          console.error("Reviews fetch error:", reviewsError);
          setLoading(false);
          return;
        }

        const reviewsArray = reviewsData as any[];

        // Fetch profiles for all unique user_ids in reviews
        const userIds = [...new Set(reviewsArray.map((r: any) => r.user_id))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds);

          // Merge profile names into reviews
          reviewsArray.forEach((r: any) => {
            r.profiles = profilesData?.find((p: any) => p.id === r.user_id) || null;
          });
        }

        setReviews(reviewsArray);

        // Group reviews by product
        const grouped: ProductReviews[] = [];
        reviewsArray.forEach((r: any) => {
          const product = r.products;
          if (!product) return;
          const productId = product.id || r.product_id;
          let existing = grouped.find((g) => g.product.id === productId);
          if (!existing) {
            existing = { product: { id: productId, title: product.title }, reviews: [] };
            grouped.push(existing);
          }
          existing.reviews.push(r);
        });

        setProductReviews(grouped);
      }
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to load data: ${message}`);
      console.error("[admin] data loading error:", error);

      // Reset state on error
      setStats(null);
      setProducts([]);
      setOrders([]);
      setReviews([]);
      setProductReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and tab changes
  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin, tab]);

  // Realtime postgres changes subscription
  useEffect(() => {
    if (!isSuperAdmin) return;

    const channel = supabase
      .channel("realtime-admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, tab, selectedOrder?.id]);

  const toggleProductPublish = async (p: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ is_published: !p.is_published, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    setProducts((ps) =>
      ps.map((x) => (x.id === p.id ? { ...x, is_published: !x.is_published } : x)),
    );
    toast.success(p.is_published ? "Product unpublished" : "Product published");
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      if (error.code === "23503" || error.message?.toLowerCase().includes("foreign key")) {
        // Product is referenced by past orders: soft-delete / unpublish instead
        const { error: softErr } = await supabase
          .from("products")
          .update({ is_published: false, stock_count: 0 })
          .eq("id", id);

        if (softErr) return toast.error(softErr.message);
        setProducts((ps) => ps.map((x) => (x.id === id ? { ...x, is_published: false } : x)));
        toast.info("Product has existing order records and was unpublished instead of deleted.");
        return;
      }
      return toast.error(error.message);
    }
    setProducts((ps) => ps.filter((x) => x.id !== id));
    toast.success("Product deleted");
  };

  const removeReview = async (r: Review) => {
    if (!r.is_removed && !confirm("Remove this review from public view?")) return;
    const { error } = await supabase
      .from("reviews")
      .update({
        is_removed: !r.is_removed,
        removed_by: r.is_removed ? null : (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    setReviews((rs) => rs.map((x) => (x.id === r.id ? { ...x, is_removed: !x.is_removed } : x)));
    toast.success(r.is_removed ? "Review restored" : "Review removed");
  };

  const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ["paid", "cancelled"],
    paid: ["processing", "refunded"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
    refunded: [],
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Validate status exists in transition map
    if (!VALID_STATUS_TRANSITIONS[newStatus]) {
      toast.error(`Invalid status: ${newStatus}`);
      return;
    }

    // Get current order status
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (!currentOrder) {
      toast.error("Order not found");
      return;
    }

    // Validate transition
    const validTransitions = VALID_STATUS_TRANSITIONS[currentOrder.status] || [];
    if (!validTransitions.includes(newStatus)) {
      toast.error(`Cannot transition from ${currentOrder.status} to ${newStatus}`);
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus as any, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) return toast.error(error.message);

    setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    toast.success(`Order status updated to ${newStatus}`);
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
            <Link to="/" className="btn-royal btn-royal-hover">
              Return Home
            </Link>
            <Link to="/auth" className="text-eyebrow opacity-70 hover:opacity-100 py-4">
              Sign In
            </Link>
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
            <Link to="/upload" className="btn-royal btn-royal-hover">
              <Plus size={14} /> New Product
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-10">
          {[
            {
              label: "Total Products",
              value: stats.totalProducts,
              icon: Package,
              color: "var(--forest)",
            },
            {
              label: "Published",
              value: stats.publishedProducts,
              icon: Eye,
              color: "oklch(0.38 0.08 155)",
            },
            {
              label: "Total Orders",
              value: stats.totalOrders,
              icon: ShoppingCart,
              color: "oklch(0.5 0.1 240)",
            },
            {
              label: "Revenue",
              value: `₹${Number(stats.totalRevenue / 1000).toFixed(0)}k`,
              icon: DollarSign,
              color: "var(--gold)",
            },
            {
              label: "Pending Orders",
              value: stats.pendingOrders,
              icon: Activity,
              color: "var(--burgundy)",
            },
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
              <p className="opacity-60">
                Recent activity from products, orders, and reviews will appear here.
              </p>
              <div className="mt-6 space-y-3">
                {orders.slice(0, 5).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between border-b border-border pb-3"
                  >
                    <div>
                      <p className="text-eyebrow opacity-50">
                        New Order #{o.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="font-display">
                        ₹{Number(o.total_amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <p className="text-xs opacity-50">
                      {new Date(o.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
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
              <Link to="/upload" className="text-eyebrow opacity-70 hover:opacity-100">
                <Plus size={12} /> Add New
              </Link>
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
                        <p className="text-eyebrow opacity-40 mt-1">
                          {new Date(p.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </td>
                      <td className="p-4">₹{Number(p.price).toLocaleString("en-IN")}</td>
                      <td className="p-4">{p.stock_count}</td>
                      <td className="p-4">{p.review_count}</td>
                      <td className="p-4">
                        <span
                          className="text-eyebrow px-3 py-1"
                          style={
                            p.is_published
                              ? { background: "oklch(0.38 0.08 155)", color: "var(--ivory)" }
                              : { background: "var(--champagne)", color: "var(--ink)" }
                          }
                        >
                          {p.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleProductPublish(p)}
                            className="opacity-60 hover:opacity-100"
                            title={p.is_published ? "Unpublish" : "Publish"}
                          >
                            {p.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="opacity-60 hover:opacity-100 hover:text-destructive"
                            title="Delete"
                          >
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
                      <td className="p-4 font-mono text-xs opacity-60">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-4">
                        <p className="font-semibold">
                          {o.shipping_name || o.profiles?.display_name || "Guest"}
                        </p>
                        {o.shipping_phone && (
                          <p className="text-xs opacity-50 mt-0.5">{o.shipping_phone}</p>
                        )}
                      </td>
                      <td className="p-4 font-display">
                        ₹{Number(o.total_amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4">
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="text-eyebrow px-3 py-1 bg-cream border border-border focus:outline-none focus:border-primary"
                        >
                          {[
                            "pending",
                            "paid",
                            "processing",
                            "shipped",
                            "delivered",
                            "cancelled",
                            "refunded",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-eyebrow opacity-50">
                        {new Date(o.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="text-eyebrow opacity-60 hover:opacity-100 cursor-pointer text-primary"
                        >
                          View
                        </button>
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
              <h2 className="font-display text-2xl">Reviews by Product</h2>
            </div>
            <div className="p-6 space-y-6">
              {productReviews.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No reviews yet</p>
                </div>
              ) : (
                productReviews.map((group, idx) => (
                  <section
                    key={group.product.id}
                    className={`border border-border p-6 ${idx > 0 ? "mt-6" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-xl">{group.product.title}</h3>
                      <span className="text-eyebrow text-sm opacity-50 bg-cream px-3 py-1 rounded-full">
                        {group.reviews.length} review{group.reviews.length !== 1 && "s"}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {group.reviews.map((r) => (
                        <article
                          key={r.id}
                          className={`border border-border p-4 ${r.is_removed ? "opacity-40 bg-destructive/5" : "hover:bg-cream/50 transition"}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <span
                                      key={s}
                                      className={s <= r.rating ? "text-gold" : "opacity-25"}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-eyebrow opacity-50">
                                  · {r.profiles?.display_name ?? "Anonymous"}
                                </span>
                                <span className="text-eyebrow opacity-50 text-xs">
                                  · {new Date(r.created_at).toLocaleDateString("en-IN")}
                                </span>
                              </div>
                              <p className="mt-2 opacity-80 whitespace-pre-wrap">{r.body}</p>
                              {r.is_removed && (
                                <p className="text-eyebrow mt-2 text-destructive">Removed</p>
                              )}
                            </div>
                            <button
                              onClick={() => removeReview(r)}
                              className="text-eyebrow opacity-60 hover:opacity-100 flex-shrink-0"
                            >
                              {r.is_removed ? "Restore" : "Remove"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        )}
        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
              className="bg-ivory border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl transition-transform scale-100 flex flex-col"
              style={{ color: "var(--forest)" }}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-primary/60 tracking-widest uppercase font-semibold">
                    Order Details
                  </span>
                  <h3 className="font-mono text-lg mt-1 text-ink">
                    #{selectedOrder.id.toUpperCase()}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-eyebrow opacity-60 hover:opacity-100 text-sm cursor-pointer p-2 hover:bg-cream/40"
                >
                  ✕ Close
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                {/* Order Info grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* WHO Ordered & STATUS */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs tracking-widest uppercase opacity-50 font-bold mb-2">
                        Customer (Who Ordered)
                      </h4>
                      <div className="bg-cream/40 p-4 border border-border space-y-2">
                        <p className="font-display text-lg text-ink font-semibold">
                          {selectedOrder.shipping_name}
                        </p>
                        <p className="text-sm opacity-90">
                          <span className="opacity-60">Phone:</span> {selectedOrder.shipping_phone}
                        </p>
                        <p className="text-sm opacity-90">
                          <span className="opacity-60">Account name:</span>{" "}
                          {selectedOrder.profiles?.display_name ?? "Guest Checkout"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs tracking-widest uppercase opacity-50 font-bold mb-2">
                        Status & Date
                      </h4>
                      <div className="bg-cream/40 p-4 border border-border space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm opacity-60">Order Status:</span>
                          <select
                            value={selectedOrder.status}
                            onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                            className="text-eyebrow px-3 py-1 bg-ivory border border-border focus:outline-none focus:border-primary font-semibold"
                          >
                            {[
                              "pending",
                              "paid",
                              "processing",
                              "shipped",
                              "delivered",
                              "cancelled",
                              "refunded",
                            ].map((s) => (
                              <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="text-sm opacity-90">
                          <span className="opacity-60">Placed On:</span>{" "}
                          {new Date(selectedOrder.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* WHERE Ordered */}
                  <div>
                    <h4 className="text-xs tracking-widest uppercase opacity-50 font-bold mb-2">
                      Delivery Address (Where Ordered)
                    </h4>
                    <div className="bg-cream/40 p-4 border border-border space-y-3 h-full">
                      <p className="font-display text-base text-ink font-semibold">
                        {selectedOrder.shipping_name}
                      </p>
                      <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap">
                        {selectedOrder.shipping_address}
                      </p>
                      <p className="text-sm opacity-90">
                        <span className="opacity-60">City:</span> {selectedOrder.shipping_city}
                      </p>
                      <p className="text-sm opacity-90">
                        <span className="opacity-60">PIN / Postal Code:</span>{" "}
                        {selectedOrder.shipping_pincode}
                      </p>
                      {selectedOrder.notes && (
                        <div className="mt-4 pt-4 border-t border-border/60">
                          <span className="text-xs text-primary/60 block mb-1">
                            Notes / Instructions:
                          </span>
                          <p className="text-sm italic opacity-75">"{selectedOrder.notes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* WHAT Ordered */}
                <div>
                  <h4 className="text-xs tracking-widest uppercase opacity-50 font-bold mb-3">
                    Order Items (What Ordered)
                  </h4>
                  <div className="border border-border bg-ivory overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-cream/50 border-b border-border text-xs tracking-wider uppercase opacity-60">
                        <tr>
                          <th className="p-3">Product Name</th>
                          <th className="p-3 text-right">Price</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {(selectedOrder.order_items ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center opacity-50 italic">
                              No items stored for this order
                            </td>
                          </tr>
                        ) : (
                          selectedOrder.order_items?.map((item) => (
                            <tr key={item.id} className="hover:bg-cream/20">
                              <td className="p-3 font-display text-base text-ink font-semibold">
                                {item.products?.title ?? "Unknown Product"}
                              </td>
                              <td className="p-3 text-right opacity-90">
                                ₹{Number(item.unit_price).toLocaleString("en-IN")}
                              </td>
                              <td className="p-3 text-center opacity-90 font-semibold">
                                {item.quantity}
                              </td>
                              <td className="p-3 text-right font-display text-ink">
                                ₹{(Number(item.unit_price) * item.quantity).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-cream/30 border-t border-border font-bold">
                        <tr>
                          <td
                            colSpan={3}
                            className="p-4 text-right text-xs tracking-widest uppercase opacity-60"
                          >
                            Grand Total:
                          </td>
                          <td className="p-4 text-right font-display text-lg text-burgundy">
                            ₹{Number(selectedOrder.total_amount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-border bg-cream/25 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn-royal btn-royal-hover py-2 px-6 cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
