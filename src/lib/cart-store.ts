// User-specific cart stored in Supabase
// Cart is tied to the logged-in user and persists across sessions

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Supabase cart item structure
type SupabaseCartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: {
    title: string;
    thumbnail: string | null;
    price: number;
    images: string[];
    stock_count: number;
  };
};

// Public cart item structure for UI
export type CartItem = {
  cartId: string;
  productId: string;
  title: string;
  thumbnail: string | null;
  price: number;
  quantity: number;
  stockCount: number;
};

const CART_TABLE = "carts";

// Fetch cart items for current user (async) with product details
export async function getCart(): Promise<CartItem[]> {
  if (typeof window === "undefined") return [];
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from(CART_TABLE)
      .select(
        `
        id,
        user_id,
        product_id,
        quantity,
        created_at,
        products (
          id,
          title,
          thumbnail,
          price,
          images,
          stock_count
        )
      `,
      )
      .eq("user_id", userData.user.id);

    if (error || !data) return [];

    return (data as any as SupabaseCartItem[]).map((item) => ({
      cartId: item.id,
      productId: item.product_id,
      title: item.products?.title || "Product",
      thumbnail: item.products?.thumbnail || null,
      price: item.products?.price || 0,
      quantity: item.quantity,
      stockCount: item.products?.stock_count ?? 99,
    }));
  } catch (e) {
    console.error("Failed to load cart:", e);
    return [];
  }
}

// Save cart items for current user (async)
export async function saveCart(items: CartItem[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Delete existing items and insert new ones
    await supabase.from(CART_TABLE).delete().eq("user_id", userData.user.id);
    const validItems = items.filter((i) => i.productId && i.quantity > 0);

    if (validItems.length > 0) {
      const { error } = await supabase.from(CART_TABLE).insert(
        validItems.map((i) => ({
          user_id: userData.user.id,
          product_id: i.productId,
          quantity: i.quantity,
        })),
      );
      if (error) console.error("Failed to save cart:", error);
    }
  } catch (e) {
    console.error("Save cart error:", e);
  }
}

// Add item to cart (merge if already exists) - requires auth
// Returns true if successful, false if user is not authenticated
export async function addToCart(item: {
  productId: string;
  title?: string;
  thumbnail?: string | null;
  price?: number;
  quantity: number;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return false;
    }

    const productId = item.productId;
    if (!productId) {
      return false;
    }

    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

    // Try RPC for atomic database-enforced upsert and stock validation
    const { error } = await supabase.rpc("add_to_cart_secure", {
      p_product_id: productId,
      p_quantity: qty,
    });

    if (error) {
      // Fallback if RPC function is not deployed on the remote database instance
      const isMissingRpc =
        error.code === "PGRST202" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find the function");

      if (isMissingRpc) {
        const { data: existingCart } = await supabase
          .from("carts")
          .select("id, quantity")
          .eq("user_id", userData.user.id)
          .eq("product_id", productId)
          .maybeSingle();

        const currentQty = existingCart?.quantity || 0;
        const newQty = currentQty + qty;

        const { error: fallbackErr } = await supabase.from("carts").upsert(
          {
            user_id: userData.user.id,
            product_id: productId,
            quantity: newQty,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,product_id" },
        );

        if (fallbackErr) {
          toast.error(fallbackErr.message || "Failed to add item to bag");
          return false;
        }

        window.dispatchEvent(new Event("cart-updated"));
        return true;
      }

      toast.error(error.message || "Failed to add item to bag");
      return false;
    }

    window.dispatchEvent(new Event("cart-updated"));
    return true;
  } catch (e: any) {
    console.error("Add to cart error:", e);
    toast.error(e.message || "An unexpected error occurred");
    return false;
  }
}

// Remove item from cart - requires auth
export async function removeFromCart(productId: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase
      .from(CART_TABLE)
      .delete()
      .eq("user_id", userData.user.id)
      .eq("product_id", productId);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.dispatchEvent(new Event("cart-updated"));
  } catch (e) {
    console.error("Remove from cart error:", e);
  }
}

// Update quantity - requires auth
export async function updateQty(productId: string, quantity: number): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const { error } = await supabase
      .from(CART_TABLE)
      .update({ quantity })
      .eq("user_id", userData.user.id)
      .eq("product_id", productId);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.dispatchEvent(new Event("cart-updated"));
  } catch (e) {
    console.error("Update qty error:", e);
  }
}

// Clear cart - requires auth
export async function clearCart(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from(CART_TABLE).delete().eq("user_id", userData.user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.dispatchEvent(new Event("cart-updated"));
  } catch (e) {
    console.error("Clear cart error:", e);
  }
}

// Calculate total price (sync)
export function cartTotal(items: CartItem[]): number {
  const sum = (items ?? []).reduce(
    (s, x) => s + (Number(x.price) || 0) * (Number(x.quantity) || 0),
    0,
  );
  return Math.round(sum * 100) / 100;
}

export function cartCount(items: CartItem[]): number {
  return (items ?? []).reduce((s, x) => s + x.quantity, 0);
}
