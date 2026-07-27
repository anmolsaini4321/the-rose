import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Redirect to auth if not logged in
export async function requireAuth(navigate: (opts: { to: string }) => void): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    toast.error("Please sign in to access this page");
    navigate({ to: "/auth" });
    return false;
  }
  return true;
}

// Check if user is super_admin
export async function isSuperAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}

// Redirect to admin if not super_admin (for admin-only routes)
export async function requireSuperAdmin(navigate: (opts: { to: string }) => void): Promise<boolean> {
  const isSuper = await isSuperAdmin();
  if (!isSuper) {
    toast.error("Restricted area. Only super-admins can access.");
    navigate({ to: "/" });
    return false;
  }
  return true;
}
