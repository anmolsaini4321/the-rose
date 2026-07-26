import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Atelier" },
  { to: "/#collections", label: "Collections" },
  { to: "/#craft", label: "The Craft" },
  { to: "/builder", label: "Design Bouquet" },
  { to: "/gallery", label: "Gallery" },
  { to: "/#journal", label: "Journal" },
];

export function SiteNav({ overHero = false }: { overHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

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
          <span className="font-display text-2xl mt-1">The Rose <span className="italic opacity-70">by Geetanjli</span></span>
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {NAV.map((n) => (
            <a key={n.to} href={n.to} className="text-eyebrow opacity-80 hover:opacity-100 transition-opacity">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          {email ? (
            <Link to="/my-bouquets" className="text-eyebrow opacity-80 hover:opacity-100">My Atelier</Link>
          ) : (
            <Link to="/auth" className="text-eyebrow opacity-80 hover:opacity-100">Sign In</Link>
          )}
          <a href="#consultation" className="btn-royal btn-royal-hover" style={{ background: textOnHero ? "transparent" : "var(--forest)", color: textOnHero ? "var(--ivory)" : "var(--ivory)", borderColor: textOnHero ? "color-mix(in oklab, var(--ivory) 60%, transparent)" : "var(--forest)" }}>
            Book Consultation
          </a>
        </div>

        <button className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-cream border-t border-border" style={{ color: "var(--forest)" }}>
          <div className="flex flex-col p-6 gap-4">
            {NAV.map((n) => (
              <a key={n.to} href={n.to} onClick={() => setOpen(false)} className="text-eyebrow py-2 border-b border-border">
                {n.label}
              </a>
            ))}
            {email ? (
              <Link to="/my-bouquets" onClick={() => setOpen(false)} className="text-eyebrow py-2">My Atelier</Link>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="text-eyebrow py-2">Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function FloatingActions() {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      <a
        href="https://wa.me/919675159675"
        target="_blank"
        rel="noreferrer"
        className="w-14 h-14 rounded-full bg-forest text-ivory flex items-center justify-center shadow-[var(--shadow-elegant)] hover:scale-105 transition-transform"
        style={{ background: "var(--forest)", color: "var(--ivory)" }}
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20.5 3.5A11 11 0 0 0 3.6 17.9L2 22l4.2-1.6A11 11 0 1 0 20.5 3.5zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-2.5.9.8-2.5-.2-.3A9 9 0 1 1 12 20.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.2-.7.8-.8 1-.3.2-.6 0a7.4 7.4 0 0 1-3.6-3.2c-.3-.5.3-.5.8-1.6a.6.6 0 0 0 0-.5c0-.1-.6-1.5-.8-2s-.5-.4-.6-.5H8a1.1 1.1 0 0 0-.8.4A3.4 3.4 0 0 0 6.1 10a5.9 5.9 0 0 0 1.3 3.2 13.5 13.5 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.1 4.1 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.6 2.6 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4z"/></svg>
      </a>
    </div>
  );
}
