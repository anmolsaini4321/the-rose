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
      .select(`
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
      `)
      .eq("user_id", userData.user.id);

    if (error || !data) return [];

    return (data as SupabaseCartItem[]).map((item) => ({
      cartId: item.id,
      productId: item.product_id,
      title: item.products?.title || "Product",
      thumbnail: item.products?.thumbnail || null,
      price: item.products?.price || 0,
      quantity: item.quantity,
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
        }))
      );
      if (error) console.error("Failed to save cart:", error);
    }
  } catch (e) {
    console.error("Save cart error:", e);
  }
}

// Add item to cart (merge if already exists) - requires auth
export async function addToCart(item: {
  productId: string;
  title?: string;
  thumbnail?: string | null;
  price?: number;
  quantity: number;
}): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Please sign in to add items to your cart");
      return;
    }

    const productId = item.productId;
    if (!productId) {
      toast.error("Invalid product. Please try again.");
      return;
    }

    const qty = item.quantity || 1;

    // Check if item already exists
    const { data: existing } = await supabase
      .from(CART_TABLE)
      .select("quantity")
      .eq("user_id", userData.user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      const newQty = existing.quantity + qty;
      const { error } = await supabase
        .from(CART_TABLE)
        .update({ quantity: newQty })
        .eq("user_id", userData.user.id)
        .eq("product_id", productId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from(CART_TABLE).insert({
        user_id: userData.user.id,
        product_id: productId,
        quantity: qty,
      });
      if (error) return toast.error(error.message);
    }

    window.dispatchEvent(new Event("cart-updated"));
  } catch (e) {
    console.error("Add to cart error:", e);
    toast.error("Failed to add item to cart. Please try again.");
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
    if (error) return toast.error(error.message);
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
    if (error) return toast.error(error.message);
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

    const { error } = await supabase
      .from(CART_TABLE)
      .delete()
      .eq("user_id", userData.user.id);
    if (error) return toast.error(error.message);
    window.dispatchEvent(new Event("cart-updated"));
  } catch (e) {
    console.error("Clear cart error:", e);
  }
}

// Calculate total quantity (sync)
export function cartTotal(items: CartItem[]): number {
  return (items ?? []).reduce((s, x) => s + x.price * x.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return (items ?? []).reduce((s, x) => s + x.quantity, 0);
}
