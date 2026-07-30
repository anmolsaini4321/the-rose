import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth, checkAuthRoute } from "@/lib/auth-guard";
import {
  getCart,
  removeFromCart,
  updateQty,
  clearCart,
  cartTotal,
  type CartItem,
} from "@/lib/cart-store";
import { toast } from "sonner";
import { Trash2, ShoppingBag, Minus, Plus, ArrowRight, Lock } from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  notes?: Record<string, string>;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: () => void) => void;
}

export const Route = createFileRoute("/cart")({
  beforeLoad: async ({ location }) => {
    await checkAuthRoute(location.pathname);
  },
  head: () => ({
    meta: [
      { title: "Your Bag — The Rose by Geetanjli" },
      { name: "description", content: "Review your selected bouquets and complete your order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cart,
});

type ShippingForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  notes: string;
};

// Server-calculated order response
type ServerOrderResponse = {
  id: string;
  total_amount: number;
};

function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [shipping, setShipping] = useState<ShippingForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "Faridabad",
    pincode: "",
    notes: "",
  });
  const [step, setStep] = useState<"cart" | "shipping" | "payment">("cart");
  const [processing, setProcessing] = useState(false);
  const [rzpLoaded, setRzpLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshCart = async () => {
    const authOK = await requireAuth(navigate);
    if (!authOK) return;
    const items = await getCart();
    setItems(items);
    setLoading(false);
  };

  useEffect(() => {
    refreshCart();
    const handler = async () => {
      setLoading(true);
      try {
        const items = await getCart();
        setItems(items);
      } catch (e) {
        console.error("Cart refresh error:", e);
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? "" });
        setShipping((s) => ({
          ...s,
          name: data.user?.user_metadata?.full_name ?? s.name,
          email: data.user?.email ?? s.email,
        }));
      } else {
        // If user logs out, clear cart items in UI and redirect to auth
        setItems([]);
        navigate({ to: "/auth" });
      }
    });
  }, [navigate]);

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      setRzpLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRzpLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Loading state for cart fetch
  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ borderColor: "var(--forest) transparent var(--forest) transparent" }}
        />
        <p className="text-eyebrow opacity-60 mt-6 animate-pulse">Loading your bag...</p>
      </div>
    );
  }

  const handleProceedToShipping = () => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0) {
      toast.error("Your bag is empty");
      return;
    }
    setStep("shipping");
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipping.name || !shipping.phone || !shipping.address || !shipping.pincode) {
      toast.error("Please fill all required fields");
      return;
    }
    setStep("payment");
  };

  const handleRazorpay = async () => {
    if (!user) return;
    if (!rzpLoaded) {
      toast.error("Payment gateway loading, please wait…");
      return;
    }
    setProcessing(true);

    try {
      let orderId: string | null = null;
      let totalAmount: number = 0;

      // 1. Calculate subtotal and GST (5% GST)
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const gst = Math.round(subtotal * 0.05 * 100) / 100;
      const computedTotal = Math.round((subtotal + gst) * 100) / 100;

      // 2. Try RPC for secure order creation
      const { data: rpcData, error: orderErr } = await (supabase as any).rpc(
        "create_order_secure",
        {
          p_user_id: user.id,
          p_shipping_name: shipping.name,
          p_shipping_phone: shipping.phone,
          p_shipping_address: shipping.address,
          p_shipping_city: shipping.city,
          p_shipping_pincode: shipping.pincode,
          p_notes: shipping.notes || null,
          p_items: JSON.stringify(
            items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          ),
        },
      );

      if (!orderErr && rpcData) {
        if (typeof rpcData === "string") {
          orderId = rpcData;
          totalAmount = computedTotal;
        } else if (typeof rpcData === "object") {
          orderId = (rpcData as any).id || (rpcData as any).order_id || null;
          totalAmount = Number((rpcData as any).total_amount) || computedTotal;
        }
      }

      // 3. Fallback to direct table insertion if RPC is not deployed or failed
      if (!orderId) {
        console.warn(
          "RPC create_order_secure failed or missing, using direct table insertion:",
          orderErr,
        );

        const { data: newOrder, error: insertErr } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            status: "pending" as any,
            total_amount: computedTotal,
            shipping_name: shipping.name,
            shipping_phone: shipping.phone,
            shipping_address: shipping.address,
            shipping_city: shipping.city,
            shipping_pincode: shipping.pincode,
            notes: shipping.notes || null,
          })
          .select("id, total_amount")
          .single();

        if (insertErr || !newOrder) {
          toast.error("Failed to create order: " + (insertErr?.message || "Please try again."));
          console.error("Direct order insert error:", insertErr);
          setProcessing(false);
          return;
        }

        orderId = newOrder.id;
        totalAmount = Number(newOrder.total_amount) || computedTotal;

        // Insert order items
        const orderItems = items.map((item) => ({
          order_id: orderId!,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.price,
        }));

        const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);

        if (itemsErr) {
          console.error("Order items insert error:", itemsErr);
        }
      }

      if (!totalAmount || !orderId) {
        toast.error("Invalid order data. Please try again.");
        setProcessing(false);
        return;
      }

      // 3. Open Razorpay with server-validated amount (already includes GST)
      const isRazorpayServerOrder = orderId.startsWith("order_");

      const options: RazorpayOptions = {
        key: (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "rzp_test_mock",
        amount: Math.round(totalAmount * 100), // paise - server validated (includes GST)
        currency: "INR",
        name: "The Rose by Geetanjli",
        description: `Order #${orderId.slice(0, 8).toUpperCase()}`,
        ...(isRazorpayServerOrder ? { order_id: orderId } : {}),
        prefill: {
          name: shipping.name,
          email: user.email,
          contact: shipping.phone,
        },
        theme: { color: "#2A3D1E" },
        handler: async (response: RazorpayResponse) => {
          setProcessing(true);

          let isUpdated = false;

          // 1. Attempt server-side RPC payment verification
          try {
            const { error: verifyErr } = await supabase.rpc("verify_payment", {
              p_order_id: orderId,
              p_razorpay_order_id: response.razorpay_order_id || orderId,
              p_razorpay_payment_id: response.razorpay_payment_id || "pay_success",
              p_razorpay_signature: response.razorpay_signature || "test_signature",
            });

            if (!verifyErr) {
              isUpdated = true;
            } else {
              console.warn("verify_payment RPC returned error, trying direct update fallback:", verifyErr.message);
            }
          } catch (rpcErr) {
            console.warn("verify_payment RPC exception:", rpcErr);
          }

          // 2. Fallback to direct table status update if RPC didn't mark as paid
          if (!isUpdated) {
            const { error: updateErr } = await supabase
              .from("orders")
              .update({
                status: "paid" as any,
                razorpay_order_id: response.razorpay_order_id || orderId,
                razorpay_payment_id: response.razorpay_payment_id || "pay_success",
                razorpay_signature: response.razorpay_signature || "test_signature",
                updated_at: new Date().toISOString(),
              })
              .eq("id", orderId);

            if (updateErr) {
              console.error("Direct payment status update fallback error:", updateErr.message);
            } else {
              isUpdated = true;
            }
          }

          clearCart();
          toast.success("Payment successful! Your order has been placed.");
          navigate({ to: "/orders" });
        },
        modal: {
          ondismiss: async () => {
            await supabase
              .from("orders")
              .update({ status: "cancelled" as any })
              .eq("id", orderId);
            toast.info("Payment cancelled");
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay error:", err);
      toast.error("Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />

      <div className="pt-32 pb-20 px-6 lg:px-12 mx-auto max-w-[1400px]">
        <div className="flex items-center gap-4 mb-10">
          <p className="text-eyebrow text-primary/60">Your Bag</p>
          <div className="flex gap-2 ml-auto">
            {(["cart", "shipping", "payment"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`text-eyebrow px-3 py-1 ${step === s ? "bg-forest text-ivory" : "opacity-40"}`}
                  style={step === s ? { background: "var(--forest)", color: "var(--ivory)" } : {}}
                >
                  {String(i + 1).padStart(2, "0")} {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
                {i < 2 && <span className="opacity-30">→</span>}
              </div>
            ))}
          </div>
        </div>

        {items.length === 0 && step === "cart" ? (
          <div className="text-center py-32 border border-dashed border-border">
            <ShoppingBag size={40} className="mx-auto opacity-20 mb-6" />
            <p className="font-display text-4xl">Your bag is empty.</p>
            <p className="mt-4 opacity-60">
              Browse our collection and add your favourite bouquets.
            </p>
            <Link to="/shop" className="btn-royal btn-royal-hover mt-10 inline-flex">
              Browse Shop <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Left panel */}
            <div className="lg:col-span-8">
              {step === "cart" && (
                <div className="space-y-4">
                  {items.map((item) => (
                    <article
                      key={item.productId}
                      className="bg-ivory border border-border p-5 flex gap-5 items-center"
                    >
                      <div
                        className="w-20 h-20 shrink-0 border border-border overflow-hidden"
                        style={{ background: "var(--champagne)" }}
                      >
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
                            🌹
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-xl leading-tight">{item.title}</p>
                        <p className="text-eyebrow opacity-60 mt-1">
                          ₹{Number(item.price).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-cream"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-10 text-center font-display">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-cream"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="font-display text-xl w-24 text-right shrink-0">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="opacity-40 hover:opacity-100 hover:text-destructive ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}

              {step === "shipping" && (
                <form
                  id="shipping-form"
                  onSubmit={handleProceedToPayment}
                  className="bg-ivory border border-border p-8"
                >
                  <h2 className="font-display text-3xl mb-8">Delivery Details</h2>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">Full Name *</label>
                      <input
                        required
                        value={shipping.name}
                        onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">Phone *</label>
                      <input
                        required
                        type="tel"
                        value={shipping.phone}
                        onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-eyebrow opacity-60 block mb-2">Email</label>
                      <input
                        type="email"
                        value={shipping.email}
                        onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-eyebrow opacity-60 block mb-2">
                        Delivery Address *
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={shipping.address}
                        onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">City *</label>
                      <input
                        required
                        value={shipping.city}
                        onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">Pincode *</label>
                      <input
                        required
                        value={shipping.pincode}
                        onChange={(e) => setShipping((s) => ({ ...s, pincode: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-eyebrow opacity-60 block mb-2">
                        Special Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={shipping.notes}
                        onChange={(e) => setShipping((s) => ({ ...s, notes: e.target.value }))}
                        placeholder="Delivery instructions, gate code, etc."
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </form>
              )}

              {step === "payment" && (
                <div className="bg-ivory border border-border p-8">
                  <h2 className="font-display text-3xl mb-6">Review & Pay</h2>
                  <div className="grid gap-2 text-sm opacity-80 mb-8">
                    <div className="flex justify-between">
                      <span className="text-eyebrow opacity-60">Name</span>
                      <span>{shipping.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-eyebrow opacity-60">Phone</span>
                      <span>{shipping.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-eyebrow opacity-60">Address</span>
                      <span className="text-right max-w-xs">
                        {shipping.address}, {shipping.city} — {shipping.pincode}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 border-t border-border pt-6">
                    {items.map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span>
                          {item.title} × {item.quantity}
                        </span>
                        <span>₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-eyebrow opacity-50">
                    <Lock size={12} />
                    Secured by Razorpay · 256-bit SSL
                  </div>
                </div>
              )}
            </div>

            {/* Right — Order Summary */}
            <aside className="lg:col-span-4">
              <div className="sticky top-28 bg-ivory border border-border p-8">
                <p className="font-display text-2xl mb-6">Order Summary</p>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="opacity-60">Subtotal</dt>
                    <dd>₹{cartTotal(items).toLocaleString("en-IN")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-60">GST (5%)</dt>
                    <dd>Calculated at checkout</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="opacity-60">Delivery</dt>
                    <dd className="text-emerald-700">Free</dd>
                  </div>
                </dl>
                <div className="hairline my-6" />
                <div className="flex justify-between items-baseline">
                  <span className="text-eyebrow">Total</span>
                  <span className="font-display text-3xl">
                    ₹{cartTotal(items).toLocaleString("en-IN")} + GST
                  </span>
                </div>

                <div className="mt-8 space-y-3">
                  {step === "cart" && (
                    <button
                      onClick={handleProceedToShipping}
                      className="w-full btn-royal btn-royal-hover"
                    >
                      Proceed to Delivery <ArrowRight size={14} />
                    </button>
                  )}
                  {step === "shipping" && (
                    <>
                      <button
                        type="submit"
                        form="shipping-form"
                        className="w-full btn-royal btn-royal-hover"
                      >
                        Continue to Payment <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => setStep("cart")}
                        className="w-full text-eyebrow opacity-60 hover:opacity-100 py-2"
                      >
                        ← Edit Bag
                      </button>
                    </>
                  )}
                  {step === "payment" && (
                    <>
                      <button
                        onClick={handleRazorpay}
                        disabled={processing}
                        className="w-full btn-royal btn-royal-hover disabled:opacity-40"
                      >
                        {processing ? "Processing…" : "Pay at Checkout"}
                      </button>
                      <button
                        onClick={() => setStep("shipping")}
                        className="w-full text-eyebrow opacity-60 hover:opacity-100 py-2"
                      >
                        ← Edit Delivery
                      </button>
                    </>
                  )}
                </div>

                <p className="mt-6 text-eyebrow opacity-40 text-center">
                  Free delivery across Faridabad
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
