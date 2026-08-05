import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, X, MessageCircle, Mail, MapPin, Calendar, Clock, ShoppingBag } from "lucide-react";

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
  delivery_partner: string | null;
  delivery_eta: string | null;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_pincode: string;
  notes: string | null;
  order_items: OrderItem[];
};

export function ActiveOrderTracker() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [realtimeTrigger, setRealtimeTrigger] = useState(0);

  // Get current user auth status
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Load active orders for user
  useEffect(() => {
    if (!userId) {
      setOrders([]);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          total_amount,
          created_at,
          delivery_partner,
          delivery_eta,
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
        .eq("user_id", userId)
        .in("status", ["paid", "processing", "shipped"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ActiveOrderTracker] Fetch error:", error.message);
        return;
      }

      setOrders((data as unknown as Order[]) ?? []);
    })();
  }, [userId, realtimeTrigger]);

  // Realtime subscription for user's orders
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`active-order-tracker-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setRealtimeTrigger((t) => t + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Sync selected order details if updated in realtime
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
      } else {
        setSelectedOrder(null);
      }
    }
  }, [orders, selectedOrder]);

  const handleConfirmDelivery = async (orderId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          delivery_eta: null,
          delivery_confirmed_by_user: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) {
        toast.error("Failed to confirm delivery: " + error.message);
        return;
      }

      toast.success("Delivery confirmed successfully! Thank you for ordering from The Rose.");
      setSelectedOrder(null);
      setRealtimeTrigger((t) => t + 1);
    } catch (err: any) {
      toast.error("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (orders.length === 0) return null;

  // Let's track the first active order
  const primaryOrder = orders[0];
  const formattedEta = primaryOrder.delivery_eta
    ? new Date(primaryOrder.delivery_eta).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "3 Days";

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Preparing Order";
      case "processing":
        return "Crafting Bouquet";
      case "shipped":
        return "Out for Delivery";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case "paid":
        return 1;
      case "processing":
        return 2;
      case "shipped":
        return 3;
      case "delivered":
        return 4;
      default:
        return 1;
    }
  };

  // WhatsApp discrepancies link builder
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "919675159675";
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    `Hello, I would like to report a discrepancy regarding my order #${primaryOrder.id.slice(0, 8).toUpperCase()}.`,
  )}`;

  return (
    <>
      {/* Sticky Bottom Floating Card */}
      <div
        className="fixed bottom-6 right-6 z-40 bg-ivory/95 backdrop-blur-md border border-primary/20 p-4 shadow-xl hover:shadow-2xl transition-all duration-300 max-w-sm w-[calc(100vw-32px)] flex items-center gap-4 cursor-pointer hover:border-primary/40 select-none animate-fade-in"
        style={{ color: "var(--forest)" }}
        onClick={() => setSelectedOrder(primaryOrder)}
      >
        <div className="bg-primary/10 p-3 rounded-full flex-shrink-0 animate-pulse">
          <Truck size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[10px] tracking-widest uppercase font-semibold text-primary/60">
              Active Delivery
            </span>
            {orders.length > 1 && (
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                +{orders.length - 1} more
              </span>
            )}
          </div>
          <h4 className="font-display text-sm font-bold text-ink truncate mt-0.5">
            {getStatusText(primaryOrder.status)}
          </h4>
          <p className="text-xs opacity-75 mt-0.5">
            ETA: <span className="font-semibold">{formattedEta}</span> via{" "}
            {primaryOrder.delivery_partner || "Express"}
          </p>
        </div>
      </div>

      {/* Details Sheet Overlay Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-ivory border border-border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative"
            style={{ color: "var(--forest)" }}
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-primary/60">
                  Track Delivery
                </span>
                <h3 className="font-mono text-sm text-ink mt-0.5">
                  Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-eyebrow opacity-60 hover:opacity-100 p-2 hover:bg-cream/40"
              >
                ✕ Close
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto text-sm">
              {/* Timeline Progress */}
              <div className="space-y-4 bg-cream/35 p-4 border border-border/60">
                <h4 className="text-xs tracking-widest uppercase opacity-50 font-bold">
                  Delivery Progress
                </h4>
                <div className="flex justify-between items-center relative pt-2">
                  <div className="absolute left-1.5 right-1.5 top-5 h-0.5 bg-border/60 -z-10" />
                  <div
                    className="absolute left-1.5 top-5 h-0.5 bg-primary transition-all duration-500 -z-10"
                    style={{
                      width: `${((getStatusStep(selectedOrder.status) - 1) / 3) * 100}%`,
                    }}
                  />

                  {/* Steps */}
                  {[
                    { label: "Ordered", step: 1 },
                    { label: "Crafting", step: 2 },
                    { label: "Shipped", step: 3 },
                    { label: "Delivered", step: 4 },
                  ].map((s) => {
                    const currentStep = getStatusStep(selectedOrder.status);
                    const isActive = s.step <= currentStep;
                    return (
                      <div key={s.step} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                            isActive
                              ? "bg-primary border-primary text-ivory"
                              : "bg-ivory border-border text-primary/40"
                          }`}
                        >
                          {s.step}
                        </div>
                        <span
                          className={`text-[9px] mt-1 font-semibold ${isActive ? "opacity-100 font-bold" : "opacity-40"}`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Courier ETA info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-cream/35 p-3 border border-border/60 flex items-start gap-2">
                  <Calendar size={16} className="text-primary/70 mt-0.5" />
                  <div>
                    <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold block">
                      Estimated Date
                    </span>
                    <span className="font-semibold text-ink">
                      {selectedOrder.delivery_eta
                        ? new Date(selectedOrder.delivery_eta).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "3 Days"}
                    </span>
                  </div>
                </div>

                <div className="bg-cream/35 p-3 border border-border/60 flex items-start gap-2">
                  <Truck size={16} className="text-primary/70 mt-0.5" />
                  <div>
                    <span className="text-[9px] uppercase tracking-widest opacity-40 font-bold block">
                      Courier Partner
                    </span>
                    <span className="font-semibold text-ink truncate block">
                      {selectedOrder.delivery_partner || "Assigning..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="border border-border bg-ivory">
                <div className="bg-cream/40 p-3 border-b border-border flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest opacity-50 font-bold">
                    Order Summary
                  </span>
                  <span className="font-display font-semibold text-ink">
                    ₹{Number(selectedOrder.total_amount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto divide-y divide-border/40 p-3 bg-cream/10 space-y-2">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs pt-1">
                      <span className="font-medium text-ink truncate max-w-[200px]">
                        {item.products?.title ?? "Flower Bouquet"}
                      </span>
                      <span className="opacity-75">
                        {item.quantity}x @ ₹{Number(item.unit_price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-cream/35 p-4 border border-border/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest opacity-50 font-bold">
                  <MapPin size={12} />
                  <span>Delivery Address</span>
                </div>
                <p className="font-semibold text-ink text-xs">{selectedOrder.shipping_name}</p>
                <p className="text-xs opacity-80 leading-relaxed">
                  {selectedOrder.shipping_address}, {selectedOrder.shipping_city} —{" "}
                  {selectedOrder.shipping_pincode}
                </p>
              </div>

              {/* Admin Contact / Support */}
              <div className="space-y-3">
                <h4 className="text-xs tracking-widest uppercase opacity-50 font-bold">
                  Need Help? (Report Discrepancy)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-[#25D366] text-white hover:bg-[#20ba5a] transition font-semibold text-xs border border-transparent shadow-sm"
                  >
                    <MessageCircle size={14} /> WhatsApp Support
                  </a>
                  <a
                    href={`mailto:support@therose.com?subject=Discrepancy%20Order%20%23${selectedOrder.id.slice(0, 8)}`}
                    className="flex items-center justify-center gap-2 p-3 border border-primary/40 hover:bg-cream/40 transition font-semibold text-xs text-primary shadow-sm"
                  >
                    <Mail size={14} /> Email Support
                  </a>
                </div>
              </div>

              {/* Action Button: Confirm Delivery */}
              <div className="pt-4 border-t border-border/60">
                <button
                  onClick={() => handleConfirmDelivery(selectedOrder.id)}
                  disabled={loading}
                  className="w-full btn-royal btn-royal-hover py-3 font-semibold tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow"
                >
                  {loading ? (
                    <span>Updating...</span>
                  ) : (
                    <>
                      <ShoppingBag size={14} /> Confirm Delivery Received
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center opacity-50 mt-2">
                  Confirming delivery updates the status to Delivered and clears this tracker
                  widget.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
