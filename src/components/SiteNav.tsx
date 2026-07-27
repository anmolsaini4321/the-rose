import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCart, cartCount, type CartItem } from "@/lib/cart-store";
import { Menu, X, ShoppingBag, Shield, LogOut, Plus, MessageSquare } from "lucide-react";

const NAV = [
  { to: "/", label: "Atelier" },
  { to: "/#collections", label: "Collections" },
  { to: "/#craft", label: "The Craft" },
  { to: "/shop", label: "Shop" },
  { to: "/builder", label: "Design Bouquet" },
  { to: "/gallery", label: "Gallery" },
];

export function SiteNav({ overHero = false }: { overHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auth state
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email ?? null);
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const hasAdmin = (roleData ?? []).some(
          (r: { role: string }) => r.role === "super_admin"
        );
        setIsSuperAdmin(hasAdmin);
      } else {
        setIsSuperAdmin(false);
      }
    };
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadUser());
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cart state
  useEffect(() => {
    const loadCart = async () => {
      try {
        const items = await getCart();
        setCartItems(items);
      } catch (e) {
        console.error("Failed to load cart:", e);
        setCartItems([]);
      }
    };
    loadCart();
    const handler = async () => {
      try {
        const items = await getCart();
        setCartItems(items);
      } catch (e) {
        console.error("Failed to reload cart:", e);
      }
    };
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  const count = cartCount(cartItems);
  const solid = scrolled || !overHero || path !== "/";
  const textOnHero = overHero && !scrolled && path === "/";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        solid ? "bg-cream/90 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
      style={{ color: textOnHero ? "var(--ivory)" : "var(--forest)" }}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5 lg:px-12">
        <Link to="/" className="flex flex-col leading-none">
          <span className="text-eyebrow opacity-80">Est. MMXXIV</span>
          <span className="font-display text-2xl mt-1">
            The Rose <span className="italic opacity-70">by Geetanjli</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map((n) => (
            <a
              key={n.to}
              href={n.to}
              className={`text-eyebrow transition-opacity hover:opacity-100 ${
                (n.to === path || (n.to !== "/" && path.startsWith(n.to))) ? "opacity-100" : "opacity-70"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Cart */}
          <Link
            to="/cart"
            className="relative text-eyebrow opacity-80 hover:opacity-100 flex items-center gap-1"
            aria-label="Shopping bag"
          >
            <ShoppingBag size={18} />
            {count > 0 && (
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-eyebrow text-[0.55rem] flex items-center justify-center"
                style={{ background: "var(--burgundy)", color: "var(--ivory)" }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>

          {/* Super admin badge */}
          {isSuperAdmin && (
            <Link
              to="/admin"
              className="text-eyebrow opacity-80 hover:opacity-100 flex items-center gap-1"
              title="Admin Panel"
            >
              <Shield size={14} />
              <span>Admin</span>
            </Link>
          )}

          {email ? (
            <Link to="/my-bouquets" className="text-eyebrow opacity-80 hover:opacity-100">
              My Atelier
            </Link>
          ) : (
            <Link to="/auth" className="text-eyebrow opacity-80 hover:opacity-100">
              Sign In
            </Link>
          )}
          <a
            href="#consultation"
            className="btn-royal btn-royal-hover"
            style={{
              background: textOnHero ? "transparent" : "var(--forest)",
              color: "var(--ivory)",
              borderColor: textOnHero
                ? "color-mix(in oklab, var(--ivory) 60%, transparent)"
                : "var(--forest)",
            }}
          >
            Book Consultation
          </a>
        </div>

        {/* Mobile: cart + hamburger */}
        <div className="lg:hidden flex items-center gap-3">
          <Link to="/cart" className="relative" aria-label="Cart">
            <ShoppingBag size={22} />
            {count > 0 && (
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-eyebrow text-[0.55rem] flex items-center justify-center"
                style={{ background: "var(--burgundy)", color: "var(--ivory)" }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="lg:hidden bg-cream border-t border-border"
          style={{ color: "var(--forest)" }}
        >
          <div className="flex flex-col p-6 gap-4">
            {NAV.map((n) => (
              <a
                key={n.to}
                href={n.to}
                onClick={() => setOpen(false)}
                className="text-eyebrow py-2 border-b border-border"
              >
                {n.label}
              </a>
            ))}
            <Link
              to="/orders"
              onClick={() => setOpen(false)}
              className="text-eyebrow py-2 border-b border-border"
            >
              My Orders
            </Link>
            {isSuperAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="text-eyebrow py-2 border-b border-border flex items-center gap-2"
              >
                <Shield size={12} /> Admin Panel
              </Link>
            )}
            {email ? (
              <Link
                to="/my-bouquets"
                onClick={() => setOpen(false)}
                className="text-eyebrow py-2"
              >
                My Atelier
              </Link>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="text-eyebrow py-2"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function FloatingActions() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setIsLoggedIn(!!s?.user)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load Crescendo Lab chatbot script
  useEffect(() => {
    if (!document.querySelector('script[src*="cresclab.com/widget.js"]')) {
      const script = document.createElement("script");
      script.src = "https://caacgo.cresclab.com/widget.js";
      script.setAttribute("data-key", "wk_531f8c40c47371c35345bb77ec8fc8e957cc");
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const openChatbot = () => {
    setExpanded(false);
    if ((window as any).Crescendo?.open) {
      (window as any).Crescendo.open();
    } else if ((window as any).crescendo?.toggle) {
      (window as any).crescendo.toggle();
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    setLoggingOut(false);
    setShowLogoutModal(false);
    setExpanded(false);
    navigate({ to: "/" });
  };

  return (
    <>
      {/* FAB cluster */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
        {/* All action buttons in a single row */}
        <div
          style={{
            opacity: expanded ? 1 : 0,
            transform: expanded
              ? "translateY(0) scale(1)"
              : "translateY(16px) scale(0.85)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            pointerEvents: expanded ? "auto" : "none",
          }}
          className="flex flex-row items-center gap-2"
        >
          

          {/* WhatsApp button */}
          <a
            href="https://wa.me/919675159675"
            target="_blank"
            rel="noreferrer"
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
            style={{ background: "var(--forest)", color: "var(--ivory)" }}
            aria-label="WhatsApp"
            title="WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20.5 3.5A11 11 0 0 0 3.6 17.9L2 22l4.2-1.6A11 11 0 1 0 20.5 3.5zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-2.5.9.8-2.5-.2-.3A9 9 0 1 1 12 20.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.2-.7.8-.8 1-.3.2-.6 0a7.4 7.4 0 0 1-3.6-3.2c-.3-.5.3-.5.8-1.6a.6.6 0 0 0 0-.5c0-.1-.6-1.5-.8-2s-.5-.4-.6-.5H8a1.1 1.1 0 0 0-.8.4A3.4 3.4 0 0 0 6.1 10a5.9 5.9 0 0 0 1.3 3.2 13.5 13.5 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.1 4.1 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.6 2.6 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4z" />
            </svg>
          </a>

          {/* Logout button — only when logged in */}
          {isLoggedIn && (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              style={{ background: "var(--burgundy)", color: "var(--ivory)" }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>

        {/* Main FAB toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-[var(--shadow-elegant)] hover:scale-105 transition-all duration-300"
          style={{ background: "var(--forest)", color: "var(--ivory)" }}
          aria-label={expanded ? "Close actions" : "Open actions"}
        >
          <div
            style={{
              transform: expanded ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <Plus size={22} />
          </div>
        </button>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "oklch(0.2 0.02 80 / 0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutModal(false);
          }}
        >
          <div
            className="w-full max-w-sm bg-ivory border border-border p-10 shadow-[var(--shadow-elegant)]"
            style={{
              animation: "reveal-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <p className="text-eyebrow text-primary/60 text-center">Confirm</p>
            <h2 className="font-display text-3xl mt-4 text-center leading-tight">
              Sign out?
            </h2>
            <p className="text-center opacity-60 text-sm mt-3 leading-relaxed">
              You will be signed out of your account. Any unsaved changes will be lost.
            </p>

            <div className="hairline my-8" />

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 border border-border text-eyebrow hover:bg-cream transition"
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-3 text-eyebrow transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--burgundy)", color: "var(--ivory)" }}
              >
                {loggingOut ? "Signing out…" : "Yes, sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}