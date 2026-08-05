import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-bouquet.jpg";
import craftImg from "@/assets/craft-hands.jpg";
import philosophyImg from "@/assets/philosophy.jpg";
import royalImg from "@/assets/collection-royal.jpg";
import weddingImg from "@/assets/collection-wedding.jpg";
import hamperImg from "@/assets/collection-hamper.jpg";
import foreverImg from "@/assets/collection-forever.jpg";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Rose by Geetanjli | Fresh Flower Bouquets & Delivery in Faridabad" },
      {
        name: "description",
        content:
          "The Rose by Geetanjli offers fresh flower bouquets & same-day delivery in Faridabad. Order luxury roses, floral arrangements & gifts online from our atelier.",
      },
      {
        name: "keywords",
        content:
          "bouquet near me, the rose, the rose by geetanjli, flower delivery Faridabad, rose bouquet Faridabad, fresh flowers Faridabad",
      },
      {
        property: "og:title",
        content: "The Rose by Geetanjli | Fresh Flower Bouquets & Delivery in Faridabad",
      },
      {
        property: "og:description",
        content:
          "Order fresh flower bouquets & luxury rose arrangements with fast delivery in Faridabad from The Rose by Geetanjli.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://the-rose-delta.vercel.app" },
      { property: "og:image", content: "https://the-rose-delta.vercel.app/favicon.ico" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "The Rose by Geetanjli | Fresh Flower Bouquets & Delivery in Faridabad",
      },
      {
        name: "twitter:description",
        content:
          "Order fresh flower bouquets & luxury rose arrangements with fast delivery in Faridabad from The Rose by Geetanjli.",
      },
    ],
  }),
  component: Home,
});

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 1.2s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 1.2s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Petals() {
  const petals = Array.from({ length: 10 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {petals.map((_, i) => (
        <span
          key={i}
          className="animate-petal absolute block"
          style={{
            left: `${(i * 11) % 100}%`,
            width: 14,
            height: 10,
            background: "oklch(0.9 0.05 20 / 0.7)",
            borderRadius: "60% 40% 60% 40%",
            animationDelay: `${i * 1.4}s`,
            animationDuration: `${12 + (i % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}

type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  thumbnail: string | null;
  images: string[];
  short_description: string | null;
};

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "royal-red-rose",
    title: "Royal Red Rose Bouquet — 24 Stems",
    category: "Royal",
    price: 3499,
    thumbnail: royalImg,
    images: [royalImg],
    short_description: "Deep velvety crimson roses tied in matte silk",
  },
  {
    id: "blush-rose-romance",
    title: "Blush Rose Romance",
    category: "Bouquet",
    price: 2899,
    thumbnail: foreverImg,
    images: [foreverImg],
    short_description: "Gentle pink roses with eucalyptus & white accents",
  },
  {
    id: "velvet-rose-hand-tie",
    title: "Velvet Rose Hand-Tie",
    category: "Hand-Tied",
    price: 3199,
    thumbnail: heroImg,
    images: [heroImg],
    short_description: "Classic scarlet garden roses with hypericum berries",
  },
  {
    id: "wedding-grace-arch",
    title: "Wedding Grace Bouquet",
    category: "Wedding",
    price: 4599,
    thumbnail: weddingImg,
    images: [weddingImg],
    short_description: "Pure ivory roses, orchids & delicate baby's breath",
  },
  {
    id: "signature-luxury-hamper",
    title: "Signature Atelier Hamper",
    category: "Hamper",
    price: 5999,
    thumbnail: hamperImg,
    images: [hamperImg],
    short_description: "Preserved roses, artisan chocolates & wax-sealed card",
  },
  {
    id: "golden-hour-bloom",
    title: "Golden Hour Bloom",
    category: "Seasonal",
    price: 2499,
    thumbnail:
      "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
    ],
    short_description: "Sun-drenched yellow roses & fresh wild blooms",
  },
];

function selectThreeBouquets(allProducts: Product[]): {
  products: Product[];
  todaysSpecialId: string;
} {
  const pool = allProducts && allProducts.length > 0 ? allProducts : FALLBACK_PRODUCTS;

  // 1. Determine Today's Special deterministically based on current calendar date (changes once per day)
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let dateHash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    dateHash = (dateHash << 5) - dateHash + dateStr.charCodeAt(i);
    dateHash |= 0;
  }
  const specialIndex = Math.abs(dateHash) % pool.length;
  const todaysSpecial = pool[specialIndex];

  if (pool.length <= 3) {
    const reorderedPool = [todaysSpecial, ...pool.filter((p) => p.id !== todaysSpecial.id)];
    return {
      products: reorderedPool,
      todaysSpecialId: todaysSpecial.id,
    };
  }

  // 2. Remaining products pool excluding Today's Special
  const remaining = pool.filter((p) => p.id !== todaysSpecial.id);

  // 3. Shuffle remaining products randomly on each page refresh
  const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5);
  const selectedOthers = shuffledRemaining.slice(0, 2);

  // 4. Today's Special ALWAYS remains 1st, followed by 2 random items
  const finalThree = [todaysSpecial, ...selectedOthers];

  return {
    products: finalThree,
    todaysSpecialId: todaysSpecial.id,
  };
}

function Home() {
  const [collectionProducts, setCollectionProducts] = useState<Product[]>([]);
  const [todaysSpecialId, setTodaysSpecialId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,title,category,price,thumbnail,images,short_description")
        .eq("is_published", true);

      const productsList =
        data && data.length > 0 ? (data as unknown as Product[]) : FALLBACK_PRODUCTS;
      const { products, todaysSpecialId: specialId } = selectThreeBouquets(productsList);
      setCollectionProducts(products);
      setTodaysSpecialId(specialId);
    })();
  }, []);

  return (
    <div className="bg-cream text-foreground overflow-x-hidden">
      <SiteNav overHero />

      {/* HERO */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Handcrafted luxury rose bouquet near me by The Rose by Geetanjli, Faridabad"
            width={1920}
            height={1280}
            className="w-full h-full object-cover animate-slow-zoom"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.2 0.02 80 / 0.35) 0%, oklch(0.2 0.02 80 / 0.15) 40%, oklch(0.2 0.02 80 / 0.65) 100%)",
            }}
          />
        </div>
        <Petals />

        <div
          className="relative z-20 min-h-screen flex flex-col justify-between px-6 lg:px-16 pt-40 pb-16"
          style={{ color: "var(--ivory)" }}
        >
          <div className="max-w-3xl">
            <p className="text-eyebrow opacity-90 animate-reveal">
              The Rose by Geetanjli · Luxury Florist in Faridabad
            </p>
            <h1
              className="text-display mt-6 text-4xl md:text-6xl lg:text-7xl leading-[1.02] animate-reveal"
              style={{ animationDelay: "150ms" }}
            >
              Fresh Flower Bouquets
              <br />
              <em className="opacity-90">& Delivery in Faridabad.</em>
            </h1>
            <p
              className="mt-8 max-w-xl text-base md:text-lg opacity-85 leading-relaxed animate-reveal"
              style={{ animationDelay: "300ms" }}
            >
              Handcrafted luxury rose bouquets by The Rose by Geetanjli — composed for proposals,
              weddings, and same-day flower delivery near me in Faridabad.
            </p>

            <div
              className="mt-12 flex flex-wrap gap-4 animate-reveal"
              style={{ animationDelay: "450ms" }}
            >
              <a href="#collections" className="btn-ghost-royal hover:bg-white/10 transition">
                Explore Collection <ArrowRight size={14} />
              </a>
              <Link
                to="/builder"
                className="btn-royal btn-royal-hover"
                style={{
                  background: "var(--ivory)",
                  color: "var(--forest)",
                  borderColor: "var(--ivory)",
                }}
              >
                Design Your Bouquet
              </Link>
              <a href="#consultation" className="btn-ghost-royal hover:bg-white/10 transition">
                Book Consultation
              </a>
            </div>
          </div>

          <div className="flex justify-between items-end text-xs opacity-70">
            <span className="tracking-[0.4em] uppercase">Scroll — the story unfolds</span>
            <span className="hidden md:block">Chapter I</span>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section id="philosophy" className="relative py-32 lg:py-48 px-6 lg:px-16">
        <div className="mx-auto max-w-[1400px] grid gap-16 lg:grid-cols-12 lg:gap-24 items-center">
          <Reveal className="lg:col-span-6 order-2 lg:order-1">
            <p className="text-eyebrow text-primary/60">Chapter I — Philosophy</p>
            <h2 className="text-display text-4xl md:text-6xl mt-6">
              A quiet devotion to <em>fresh flowers in Faridabad.</em>
            </h2>
            <div className="hairline my-10 max-w-32" />
            <p className="text-base leading-relaxed opacity-80 max-w-xl">
              Every rose is hand-selected at first light for fresh flowers in Faridabad. At The Rose
              by Geetanjli, we craft custom rose bouquets and arrangements with reliable same-day
              flower delivery in Faridabad.
            </p>
            <div className="mt-14 grid grid-cols-2 gap-x-10 gap-y-8 max-w-md">
              {[
                ["Hand Selection", "Only the finest fresh flowers"],
                ["Royal Presentation", "Handcrafted rose bouquets"],
                ["Absolute Freshness", "Flower delivery in Faridabad"],
                ["Emotional Craft", "The Rose by Geetanjli touch"],
              ].map(([t, s]) => (
                <div key={t}>
                  <p className="text-eyebrow text-primary/70">{t}</p>
                  <p className="text-sm mt-2 opacity-70">{s}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal className="lg:col-span-6 order-1 lg:order-2" delay={200}>
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={philosophyImg}
                alt="Florist arranging fresh ivory rose bouquet at The Rose by Geetanjli in Faridabad"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-4 text-xs opacity-60 italic">— The Atelier, Golden hour</p>
          </Reveal>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section
        id="collections"
        className="py-32 lg:py-48 px-6 lg:px-16 bg-ivory"
        style={{ background: "var(--ivory)" }}
      >
        <div className="mx-auto max-w-[1400px]">
          <Reveal className="max-w-3xl">
            <p className="text-eyebrow text-primary/60">Chapter II — Signature Collections</p>
            <h2 className="text-display text-4xl md:text-6xl mt-6">
              Luxury Rose Arrangements <em>& Flower Delivery.</em>
            </h2>
          </Reveal>

          <div className="mt-20 grid gap-8 md:gap-12 md:grid-cols-2 lg:grid-cols-3">
            {collectionProducts.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-ivory border border-border p-6"
                    style={{ background: "var(--ivory)" }}
                  >
                    <div
                      className="aspect-[3/4] bg-champagne mb-4"
                      style={{ background: "var(--champagne)" }}
                    />
                    <div
                      className="h-4 bg-champagne w-3/4 mb-2"
                      style={{ background: "var(--champagne)" }}
                    />
                    <div
                      className="h-3 bg-champagne w-1/2"
                      style={{ background: "var(--champagne)" }}
                    />
                  </div>
                ))
              : collectionProducts.map((p, i) => {
                  const imageSrc = p.thumbnail || p.images?.[0] || "";
                  return (
                    <Reveal key={p.id} delay={i * 80}>
                      <Link
                        to="/product/$productId"
                        params={{ productId: p.id }}
                        className="group block"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                          {p.id === todaysSpecialId && (
                            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3.5 py-1.5 bg-forest/90 backdrop-blur-md text-ivory text-[11px] font-medium tracking-widest uppercase rounded-full shadow-lg border border-gold/60">
                              <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
                              <span>Today's Special</span>
                            </div>
                          )}
                          {imageSrc ? (
                            <img
                              src={imageSrc}
                              alt={`${p.title} - Fresh flower bouquet delivery by The Rose by Geetanjli in Faridabad`}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center bg-champagne"
                              style={{ background: "var(--champagne)" }}
                            >
                              <span className="text-6xl opacity-30">🌹</span>
                            </div>
                          )}
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                            style={{
                              background:
                                "linear-gradient(180deg, transparent 40%, oklch(0.28 0.055 155 / 0.7) 100%)",
                            }}
                          />
                          <div
                            className="absolute inset-x-0 bottom-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-700"
                            style={{ color: "var(--ivory)" }}
                          >
                            <p className="text-eyebrow opacity-80" style={{ color: "var(--gold)" }}>
                              Discover →
                            </p>
                          </div>
                        </div>
                        <div className="pt-6 flex items-baseline justify-between border-b border-border pb-4">
                          <h3 className="font-display text-2xl">{p.title}</h3>
                          <span className="text-eyebrow opacity-60">
                            No. {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm opacity-70">
                              {p.short_description || p.category}
                            </p>
                            {p.id === todaysSpecialId && (
                              <span className="text-[10px] uppercase font-semibold tracking-wider text-forest bg-gold/30 px-2 py-0.5 rounded">
                                Special Choice
                              </span>
                            )}
                          </div>
                          <p className="font-display text-lg">
                            ₹{Number(p.price).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </Link>
                    </Reveal>
                  );
                })}
          </div>
        </div>
      </section>

      {/* CRAFT */}
      <section id="craft" className="relative py-32 lg:py-48 px-6 lg:px-16">
        <div className="mx-auto max-w-[1400px] grid gap-16 lg:grid-cols-12 lg:gap-24 items-center">
          <Reveal className="lg:col-span-7">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={craftImg}
                alt="Florist hand-tying fresh rose bouquet with emerald ribbon at The Rose by Geetanjli, Faridabad"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={200}>
            <p className="text-eyebrow text-primary/60">Chapter III — The Craft</p>
            <h2 className="text-display text-4xl md:text-6xl mt-6">
              Seven <em>hands</em>,<br />
              one signature bouquet.
            </h2>
            <div className="hairline my-10 max-w-32" />
            <ol className="space-y-6 mt-4">
              {[
                "Fresh flower selection at dawn",
                "Hand-tying by memory",
                "Ribbon of silk or velvet",
                "Wax-sealed correspondence",
                "Velvet or ivory presentation",
                "Prepared for gentle delivery in Faridabad",
              ].map((step, i) => (
                <li key={step} className="flex gap-6 items-baseline border-b border-border pb-4">
                  <span className="text-eyebrow opacity-50">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-lg font-display">{step}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* PERSONALIZED LUXURY */}
      <section
        className="py-32 lg:py-48 px-6 lg:px-16"
        style={{ background: "var(--forest)", color: "var(--ivory)" }}
      >
        <div className="mx-auto max-w-[1400px] grid gap-16 lg:grid-cols-2 items-end">
          <Reveal>
            <p className="text-eyebrow opacity-60" style={{ color: "var(--gold)" }}>
              Chapter IV — Personalized Luxury
            </p>
            <h2 className="text-display text-4xl md:text-6xl mt-6">
              Bespoke Flower Delivery.
              <br />
              <em>Faridabad's Premier Florist.</em>
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="text-base leading-relaxed opacity-80 max-w-lg">
              Looking for a fresh rose bouquet near me? From intimate proposals to grand weddings,
              The Rose by Geetanjli offers bespoke flower delivery in Faridabad with personalized
              care.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4 max-w-md">
              {["Weddings", "Proposals", "Corporate", "Editorial"].map((s) => (
                <div key={s} className="border-t border-white/20 pt-4">
                  <p className="text-eyebrow opacity-70">{s}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* OCCASIONS */}
      <section
        className="py-32 lg:py-48 px-6 lg:px-16 bg-ivory"
        style={{ background: "var(--ivory)" }}
      >
        <div className="mx-auto max-w-[1400px]">
          <Reveal className="max-w-3xl">
            <p className="text-eyebrow text-primary/60">Chapter V — Occasions</p>
            <h2 className="text-display text-4xl md:text-6xl mt-6">
              Rose arrangements for <em>every occasion in Faridabad.</em>
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Wedding",
                subtitle: "The vow, in bloom",
                image: weddingImg,
              },
              {
                title: "Proposal",
                subtitle: "The question, adorned",
                image: foreverImg,
              },
              {
                title: "Birthday",
                subtitle: "A year, honored",
                image:
                  "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Anniversary",
                subtitle: "Devotion, remembered",
                image: royalImg,
              },
              {
                title: "Mother's Day",
                subtitle: "For the first love",
                image:
                  "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Congratulations",
                subtitle: "The moment marked",
                image:
                  "https://images.unsplash.com/photo-1562690868-60bbe7293e94?auto=format&fit=crop&w=800&q=80",
              },
              {
                title: "Corporate",
                subtitle: "Gestures at scale",
                image: hamperImg,
              },
              {
                title: "Just Because",
                subtitle: "The finest reason",
                image: heroImg,
              },
            ].map(({ title, subtitle, image }, idx) => (
              <Reveal key={title} delay={idx * 60}>
                <Link
                  to="/shop"
                  className="group relative block overflow-hidden aspect-[3/4] rounded-sm border border-border/40 shadow-sm hover:shadow-2xl transition-all duration-700"
                >
                  <img
                    src={image}
                    alt={`${title} - Luxury rose bouquet & floral arrangements by The Rose by Geetanjli, Faridabad`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                  />
                  <div
                    className="absolute inset-0 transition-colors duration-500"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.85) 100%)",
                    }}
                  />
                  <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between text-white z-10">
                    <div className="flex items-center justify-between">
                      <p className="text-eyebrow text-white/75 tracking-widest text-xs uppercase font-medium">
                        Occasion
                      </p>
                      <span className="w-2 h-2 rounded-full bg-amber-200/90 opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-125" />
                    </div>
                    <div>
                      <h3 className="font-display text-3xl md:text-4xl text-white group-hover:translate-y-[-4px] transition-transform duration-500 drop-shadow-sm">
                        {title}
                      </h3>
                      <p className="text-sm text-white/85 mt-2 font-light tracking-wide group-hover:text-white transition-colors duration-300">
                        {subtitle}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs tracking-widest uppercase font-medium text-amber-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                        <span>Explore Collection</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-32 lg:py-48 px-6 lg:px-16">
        <div className="mx-auto max-w-[1200px] text-center">
          <Reveal>
            <p className="text-eyebrow text-primary/60">Chapter VI — In Their Words</p>
          </Reveal>
          <Reveal delay={150}>
            <blockquote className="mt-16">
              <p className="font-display text-4xl md:text-6xl leading-[1.15] italic">
                "It arrived like an heirloom. My mother wept before she read the card.
                <br />
                Everything Geetanjli touches becomes a memory."
              </p>
              <footer className="mt-12 text-eyebrow opacity-60">— Ananya M. · Faridabad</footer>
            </blockquote>
          </Reveal>
          <div className="hairline my-24 mx-auto max-w-32" />
          <Reveal>
            <blockquote>
              <p className="font-display text-3xl md:text-5xl leading-[1.15] italic">
                "The bouquets held our wedding together. Every guest asked. Every guest remembered."
              </p>
              <footer className="mt-10 text-eyebrow opacity-60">
                — Rhea & Vikram · Omaxe World Street
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* GRAND FINALE — CONFIGURATOR CTA */}
      <section
        id="finale"
        className="relative py-40 lg:py-56 px-6 lg:px-16 overflow-hidden"
        style={{ background: "var(--forest)", color: "var(--ivory)" }}
      >
        <div className="absolute inset-0 opacity-20">
          <img
            src={heroImg}
            alt="Custom fresh flower bouquet near me by The Rose by Geetanjli, Faridabad"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative mx-auto max-w-[1200px] text-center">
          <p className="text-eyebrow opacity-70" style={{ color: "var(--gold)" }}>
            Grand Finale
          </p>
          <h2 className="text-display text-4xl md:text-6xl lg:text-7xl mt-8 leading-[1.02]">
            Design your
            <br />
            <em className="opacity-90">signature bouquet in Faridabad.</em>
          </h2>
          <p className="mt-10 max-w-xl mx-auto opacity-80">
            Design a custom rose bouquet in Faridabad — choose wrapping, fresh flowers, and ribbons.
            Order online from The Rose by Geetanjli for quick local delivery.
          </p>
          <div className="mt-14 flex flex-wrap justify-center gap-4">
            <Link
              to="/builder"
              className="btn-royal btn-royal-hover"
              style={{
                background: "var(--ivory)",
                color: "var(--forest)",
                borderColor: "var(--ivory)",
              }}
            >
              Enter the Atelier <ArrowRight size={14} />
            </Link>
            <Link to="/gallery" className="btn-ghost-royal hover:bg-white/10 transition">
              Community Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* JOURNAL */}
      <section
        id="journal"
        className="py-32 lg:py-48 px-6 lg:px-16 bg-ivory"
        style={{ background: "var(--ivory)" }}
      >
        <div className="mx-auto max-w-[1400px]">
          <Reveal className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <p className="text-eyebrow text-primary/60">Chapter VII — Floral Journal</p>
              <h2 className="text-display text-5xl md:text-7xl mt-6">
                Floral tips & news from <em>The Rose by Geetanjli.</em>
              </h2>
            </div>
            <a href="#" className="text-eyebrow opacity-70 hover:opacity-100">
              All Entries →
            </a>
          </Reveal>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {[
              {
                img: philosophyImg,
                tag: "Meaning",
                title: "The Language of Roses",
                excerpt: "Colour, count, and stem — every bouquet is a sentence.",
              },
              {
                img: craftImg,
                tag: "Behind The Bouquet",
                title: "The Emerald Ribbon Story",
                excerpt: "Why one silk from Lyon changed everything.",
              },
              {
                img: weddingImg,
                tag: "Weddings",
                title: "The Palace Wedding",
                excerpt: "A three-day floral score for two hundred guests.",
              },
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <a href="#" className="group block">
                  <div className="aspect-[4/5] overflow-hidden">
                    <img
                      src={p.img}
                      alt={`${p.title} - Flower delivery & rose bouquet guide by The Rose by Geetanjli, Faridabad`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105"
                    />
                  </div>
                  <p className="text-eyebrow text-primary/50 mt-6">{p.tag}</p>
                  <h3 className="font-display text-2xl mt-3 group-hover:italic transition">
                    {p.title}
                  </h3>
                  <p className="text-sm opacity-70 mt-3">{p.excerpt}</p>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CONSULTATION CTA */}
      <section id="consultation" className="py-32 lg:py-40 px-6 lg:px-16">
        <div className="mx-auto max-w-[1000px] text-center">
          <Reveal>
            <p className="text-eyebrow text-primary/60">By Appointment</p>
            <h2 className="text-display text-5xl md:text-7xl mt-6">
              Order fresh flowers from <em>our Faridabad florist shop.</em>
            </h2>
            <p className="mt-8 max-w-lg mx-auto opacity-70">
              Book a consultation with The Rose by Geetanjli for weddings, event florals, or fresh
              flower delivery in Faridabad.
            </p>
            <div className="mt-12">
              <a href="mailto:atelier@theroseby.com" className="btn-royal btn-royal-hover">
                Request Appointment
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
