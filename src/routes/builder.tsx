import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import {
  WRAPPINGS,
  FLOWERS,
  FILLERS,
  RIBBON_MATERIALS,
  RIBBON_COLORS,
  ACCESSORIES,
  DEFAULT_CONFIG,
  calculatePrice,
  type BouquetConfig,
} from "@/lib/bouquet-catalog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Minus, Plus, Save, Share2 } from "lucide-react";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Design Your Rose Bouquet — Flower Delivery in Faridabad | The Rose by Geetanjli" },
      {
        name: "description",
        content:
          "Design your custom rose bouquet online with The Rose by Geetanjli. Choose fresh flowers, wrappings & ribbons with fast flower delivery in Faridabad.",
      },
      {
        property: "og:title",
        content: "Design Your Rose Bouquet | The Rose by Geetanjli Faridabad",
      },
      {
        property: "og:description",
        content:
          "Custom floral atelier by The Rose by Geetanjli in Faridabad. Create & order your fresh rose bouquet online.",
      },
    ],
  }),
  component: Builder,
});

const STEPS = ["Wrapping", "Flowers", "Fillers", "Ribbon", "Accessories"] as const;

function Builder() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<BouquetConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("rose_builder_cfg");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_CONFIG;
  });

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const price = useMemo(() => calculatePrice(cfg), [cfg]);
  const flowerCount = cfg.flowers.reduce((s, f) => s + f.qty, 0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("rose_builder_cfg", JSON.stringify(cfg));
    }
  }, [cfg]);

  const setFlower = (id: string, delta: number) => {
    setCfg((c) => {
      const existing = c.flowers.find((f) => f.id === id);
      let flowers = c.flowers;
      if (existing) {
        const newQty = Math.max(0, existing.qty + delta);
        flowers =
          newQty === 0
            ? c.flowers.filter((f) => f.id !== id)
            : c.flowers.map((f) => (f.id === id ? { ...f, qty: newQty } : f));
      } else if (delta > 0) {
        flowers = [...c.flowers, { id, qty: 1 }];
      }
      return { ...c, flowers };
    });
  };
  const toggle = (key: "fillers" | "accessories", id: string) => {
    setCfg((c) => ({
      ...c,
      [key]: c[key].includes(id) ? c[key].filter((x) => x !== id) : [...c[key], id],
    }));
  };

  const save = async (isPublic: boolean) => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Please sign in to save your bouquet");
      navigate({ to: "/auth" });
      setSaving(false);
      return;
    }
    const bouquetTitle = cfg.title.trim() || "My Signature Bouquet";

    const { error } = await supabase.from("bouquets").insert({
      user_id: userData.user.id,
      title: bouquetTitle,
      wrapping: cfg.wrapping,
      ribbon_material: cfg.ribbon_material,
      ribbon_color: cfg.ribbon_color,
      flowers: cfg.flowers,
      fillers: cfg.fillers,
      accessories: cfg.accessories,
      message: cfg.message,
      total_price: price,
      is_public: isPublic,
    });

    const isMissingTable =
      error &&
      (error.code === "PGRST202" ||
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find the table"));

    if (error && !isMissingTable) {
      setSaving(false);
      return toast.error(error.message);
    }

    // Local Storage fallback array so published bouquets appear immediately in Gallery & Atelier
    try {
      const uName =
        userData.user.user_metadata?.display_name ||
        userData.user.user_metadata?.full_name ||
        userData.user.email?.split("@")[0] ||
        "Rose Connoisseur";

      // Update persistent creator profiles map
      const creatorProfiles: Record<string, string> = JSON.parse(
        localStorage.getItem("rose_creator_profiles") || "{}",
      );
      creatorProfiles[userData.user.id] = uName;
      localStorage.setItem("rose_creator_profiles", JSON.stringify(creatorProfiles));

      const localBouquets = JSON.parse(localStorage.getItem("rose_local_bouquets") || "[]");
      const newLocalItem = {
        id: `b_local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userData.user.id,
        author_name: uName,
        title: bouquetTitle,
        wrapping: cfg.wrapping,
        ribbon_material: cfg.ribbon_material,
        ribbon_color: cfg.ribbon_color,
        flowers: cfg.flowers,
        fillers: cfg.fillers,
        accessories: cfg.accessories,
        message: cfg.message,
        total_price: price,
        is_public: isPublic,
        likes_count: 0,
        created_at: new Date().toISOString(),
      };
      localBouquets.unshift(newLocalItem);
      localStorage.setItem("rose_local_bouquets", JSON.stringify(localBouquets));
    } catch (e) {
      console.error("Local bouquet storage error:", e);
    }

    setSaving(false);
    toast.success(
      isPublic ? "Published bouquet to Community Gallery!" : "Saved bouquet to your Atelier",
    );
    navigate({ to: isPublic ? "/gallery" : "/my-bouquets" });
  };

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />

      <div className="pt-32 pb-16 px-6 lg:px-12 mx-auto max-w-[1600px]">
        <div className="max-w-2xl">
          <p className="text-eyebrow text-primary/60">The Atelier · Configurator</p>
          <h1 className="text-display text-5xl md:text-7xl mt-6">
            Compose your <em>signature rose bouquet in Faridabad.</em>
          </h1>
          <p className="mt-6 opacity-70 max-w-xl">
            Custom floral atelier by The Rose by Geetanjli. Design your fresh rose bouquet with
            local flower delivery in Faridabad.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-12">
          {/* LEFT — steps */}
          <aside className="lg:col-span-3">
            <ol className="space-y-1">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    onClick={() => setStep(i)}
                    className={`w-full text-left py-4 px-5 border-l-2 transition-all ${
                      step === i
                        ? "border-primary bg-ivory"
                        : "border-transparent hover:bg-ivory/60"
                    }`}
                  >
                    <span className="text-eyebrow opacity-50">
                      Step {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="font-display text-xl mt-1">{s}</p>
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          {/* CENTER — preview + controls */}
          <section className="lg:col-span-6">
            {/* Preview */}
            <div className="relative aspect-square overflow-hidden bg-ivory border border-border">
              <BouquetPreview cfg={cfg} />
            </div>
            <div className="mt-3 flex justify-between text-xs opacity-60">
              <span>Live preview · updates as you compose</span>
              <span>{flowerCount} stems</span>
            </div>

            {/* Step body */}
            <div className="mt-10 bg-ivory border border-border p-8">
              {step === 0 && (
                <StepBlock
                  title="Wrapping"
                  subtitle="The first impression, made of paper and silk."
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {WRAPPINGS.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setCfg((c) => ({ ...c, wrapping: w.id }))}
                        className={`group border p-4 text-left transition ${cfg.wrapping === w.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                      >
                        <div className="aspect-square" style={{ background: w.swatch }} />
                        <p className="text-eyebrow mt-3 opacity-70">{w.name}</p>
                      </button>
                    ))}
                  </div>
                </StepBlock>
              )}

              {step === 1 && (
                <StepBlock
                  title="Pick your Blooms"
                  subtitle="Select flowers to compose your signature digital arrangement."
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {FLOWERS.map((f) => {
                      const cur = cfg.flowers.find((x) => x.id === f.id);
                      const qty = cur?.qty ?? 0;
                      return (
                        <div
                          key={f.id}
                          className={`border p-4 flex flex-col items-center justify-between text-center bg-cream transition-all duration-300 group hover:-translate-y-1 ${
                            qty > 0
                              ? "border-primary ring-1 ring-primary shadow-sm"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="w-24 h-24 flex items-center justify-center overflow-hidden mb-3">
                            {f.image ? (
                              <img
                                src={f.image}
                                alt={f.name}
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <span className="text-5xl">{f.icon}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-display text-lg leading-tight font-semibold">
                              {f.name}
                            </p>
                            <p className="text-[0.65rem] opacity-60 italic mt-0.5">{f.meaning}</p>
                            <p className="text-eyebrow mt-1 text-primary/80 font-bold">
                              ₹{f.price}
                            </p>
                          </div>
                          <div className="mt-4 flex items-center gap-2 w-full justify-center">
                            <button
                              onClick={() => setFlower(f.id, -1)}
                              disabled={qty <= 0}
                              className="w-8 h-8 border border-border hover:border-primary flex items-center justify-center bg-ivory disabled:opacity-30 cursor-pointer"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-display text-lg font-bold">
                              {qty}
                            </span>
                            <button
                              onClick={() => setFlower(f.id, +1)}
                              className="w-8 h-8 border border-border hover:border-primary flex items-center justify-center bg-ivory cursor-pointer"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </StepBlock>
              )}

              {step === 2 && (
                <StepBlock
                  title="Fillers"
                  subtitle="The soft counterpoint that gives the bouquet its breath."
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {FILLERS.map((f) => {
                      const on = cfg.fillers.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggle("fillers", f.id)}
                          className={`border p-5 text-left transition ${on ? "border-primary ring-1 ring-primary bg-cream" : "border-border hover:border-primary/50"}`}
                        >
                          <div className="w-10 h-10 rounded-full" style={{ background: f.color }} />
                          <p className="font-display text-lg mt-4">{f.name}</p>
                          <div className="mt-2 flex justify-between text-eyebrow opacity-60">
                            <span>₹{f.price}</span>
                            {on && <Check size={14} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </StepBlock>
              )}

              {step === 3 && (
                <StepBlock title="Ribbon" subtitle="The final knot — silk, velvet, or satin.">
                  <p className="text-eyebrow opacity-60 mb-3">Material</p>
                  <div className="flex flex-wrap gap-3">
                    {RIBBON_MATERIALS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setCfg((c) => ({ ...c, ribbon_material: m.id }))}
                        className={`px-5 py-3 border text-eyebrow transition ${cfg.ribbon_material === m.id ? "border-primary bg-cream" : "border-border hover:border-primary/50"}`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-eyebrow opacity-60 mb-3 mt-8">Colour</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {RIBBON_COLORS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setCfg((c) => ({ ...c, ribbon_color: r.id }))}
                        className={`border p-3 transition ${cfg.ribbon_color === r.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                      >
                        <div className="aspect-square" style={{ background: r.swatch }} />
                        <p className="text-eyebrow mt-2 opacity-70 text-center">{r.name}</p>
                      </button>
                    ))}
                  </div>
                </StepBlock>
              )}

              {step === 4 && (
                <StepBlock
                  title="Accessories"
                  subtitle="Small gestures that turn a bouquet into an heirloom."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ACCESSORIES.map((a) => {
                      const on = cfg.accessories.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggle("accessories", a.id)}
                          className={`flex justify-between items-center border p-5 text-left transition ${on ? "border-primary ring-1 ring-primary bg-cream" : "border-border hover:border-primary/50"}`}
                        >
                          <span className="font-display text-lg">{a.name}</span>
                          <span className="text-eyebrow opacity-60">
                            ₹{a.price} {on && <Check size={14} className="inline ml-2" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8">
                    <label className="text-eyebrow opacity-70">Handwritten Message</label>
                    <textarea
                      rows={3}
                      value={cfg.message}
                      onChange={(e) => setCfg((c) => ({ ...c, message: e.target.value }))}
                      placeholder="A private note, sealed in gold wax…"
                      className="mt-3 w-full bg-cream border border-border p-4 font-display text-lg italic focus:outline-none focus:border-primary"
                    />
                  </div>
                </StepBlock>
              )}

              <div className="mt-10 flex justify-between border-t border-border pt-6">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="text-eyebrow opacity-70 hover:opacity-100 disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  disabled={step === STEPS.length - 1}
                  className="text-eyebrow opacity-70 hover:opacity-100 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT — summary */}
          <aside className="lg:col-span-3">
            <div className="sticky top-28 bg-ivory border border-border p-8">
              <p className="text-eyebrow opacity-60">Composition</p>
              <input
                value={cfg.title}
                onChange={(e) => setCfg((c) => ({ ...c, title: e.target.value }))}
                className="w-full mt-2 font-display text-2xl bg-transparent border-b border-border focus:outline-none focus:border-primary pb-2"
              />

              <dl className="mt-8 space-y-3 text-sm">
                <Row
                  label="Wrapping"
                  value={WRAPPINGS.find((w) => w.id === cfg.wrapping)?.name ?? "—"}
                />
                <Row
                  label="Ribbon"
                  value={`${RIBBON_MATERIALS.find((m) => m.id === cfg.ribbon_material)?.name} · ${RIBBON_COLORS.find((c) => c.id === cfg.ribbon_color)?.name}`}
                />
                <Row label="Flowers" value={`${flowerCount} stems`} />
                <Row
                  label="Fillers"
                  value={cfg.fillers.length ? `${cfg.fillers.length} added` : "—"}
                />
                <Row
                  label="Accessories"
                  value={cfg.accessories.length ? `${cfg.accessories.length} added` : "—"}
                />
                <Row label="Delivery" value="2–3 days" />
              </dl>

              <div className="hairline my-8" />
              <div className="flex items-baseline justify-between">
                <span className="text-eyebrow opacity-60">Total</span>
                <span className="font-display text-4xl">₹{price.toLocaleString("en-IN")}</span>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => save(false)}
                  disabled={saving}
                  className="w-full btn-royal btn-royal-hover"
                >
                  <Save size={14} /> Save Draft
                </button>
                <button
                  onClick={() => save(true)}
                  disabled={saving}
                  className="w-full btn-royal btn-royal-hover"
                  style={{ background: "transparent", color: "var(--forest)" }}
                >
                  <Share2 size={14} /> Publish to Gallery
                </button>
                <a
                  href="mailto:atelier@theroseby.com"
                  className="block text-center text-eyebrow opacity-60 hover:opacity-100 pt-2"
                >
                  Order via consultation →
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function StepBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-eyebrow text-primary/60">Now composing</p>
      <h2 className="font-display text-4xl mt-3">{title}</h2>
      <p className="opacity-70 mt-2 mb-8">{subtitle}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 items-baseline">
      <dt className="text-eyebrow opacity-50 shrink-0">{label}</dt>
      <dd className="text-right opacity-80 font-display italic">{value}</dd>
    </div>
  );
}

function BouquetPreview({ cfg }: { cfg: BouquetConfig }) {
  const wrapObj = WRAPPINGS.find((w) => w.id === cfg.wrapping);
  const wrap = wrapObj?.swatch ?? "var(--ivory)";
  const ribbon = RIBBON_COLORS.find((r) => r.id === cfg.ribbon_color)?.swatch ?? "var(--forest)";
  const stems = cfg.flowers.flatMap((f) => {
    const flower = FLOWERS.find((x) => x.id === f.id);
    return Array.from({ length: Math.min(f.qty, 24) }, (_, i) => ({
      id: `${f.id}-${i}`,
      name: flower?.name ?? f.id,
      color: flower?.color ?? "var(--burgundy)",
      icon: flower?.icon ?? "🌹",
      image: flower?.image,
    }));
  });

  const hasFairyLights = cfg.accessories.includes("fairy-lights");
  const hasCard = cfg.accessories.includes("greeting-card") || cfg.accessories.includes("wax-seal");
  const hasTeddy = cfg.accessories.includes("teddy");

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden transition-all duration-700 select-none group"
      style={{
        background:
          "radial-gradient(circle at 50% 45%, oklch(0.985 0.008 85), oklch(0.93 0.025 82))",
      }}
    >
      {/* Soft Ambient Studio Shadow */}
      <div className="absolute bottom-[3%] w-[50%] h-[8%] bg-black/15 rounded-full blur-xl z-0 transition-transform duration-700 group-hover:scale-105" />

      {/* Bouquet Studio Container */}
      <div className="relative w-[85%] h-[92%] flex flex-col items-center justify-end z-10 transition-transform duration-700 ease-out group-hover:scale-[1.02]">
        {/* SVG V-Cone Backdrop & Stem Handle */}
        <svg
          viewBox="0 0 400 500"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="coneShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="16" stdDeviation="18" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Stem Bundle protruding from narrow bottom */}
          <g transform="translate(200, 410)">
            <line
              x1="-18"
              y1="0"
              x2="-26"
              y2="70"
              stroke="#2d5a27"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="-8"
              y1="0"
              x2="-12"
              y2="75"
              stroke="#1b3818"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="80"
              stroke="#2d5a27"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="0"
              x2="14"
              y2="75"
              stroke="#1b3818"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="18"
              y1="0"
              x2="24"
              y2="68"
              stroke="#2d5a27"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* Back Flared V-Cone Paper Wrap */}
          <path
            d="M 45,150 Q 200,85 355,150 L 245,410 Q 200,422 155,410 Z"
            fill={wrap}
            filter="url(#coneShadow)"
            style={{ transition: "all 0.5s ease" }}
          />

          {/* Crease Depth Shadow */}
          <path
            d="M 65,168 Q 200,110 335,168 L 235,400 Q 200,410 165,400 Z"
            fill="rgba(0,0,0,0.12)"
          />
        </svg>

        {/* Blooming Flowers Crown (Positioned inside the top opening) */}
        <div className="absolute top-[12%] w-[82%] h-[56%] z-20 pointer-events-auto">
          <div className="relative w-full h-full">
            {/* Fillers (Foliage sprigs) */}
            {cfg.fillers.map((fid, i) => {
              const emoji = fid.includes("breath")
                ? "💮"
                : fid.includes("grass")
                  ? "🌾"
                  : fid.includes("brunia")
                    ? "💠"
                    : "🌿";
              const total = cfg.fillers.length;
              const angle = (i / Math.max(1, total)) * Math.PI - Math.PI / 2;
              const radius = 34 + (i % 2) * 8;
              const x = 50 + Math.cos(angle) * radius;
              const y = 30 + Math.sin(angle) * radius * 0.4;
              return (
                <div
                  key={fid + i}
                  className="absolute text-4xl select-none transition-all duration-700 animate-pulse pointer-events-none"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: `translate(-50%, -50%) rotate(${angle * 40}deg)`,
                    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.18))",
                    animationDelay: `${i * 200}ms`,
                    animationDuration: "3.5s",
                  }}
                >
                  {emoji}
                </div>
              );
            })}

            {/* Main Blooming Flowers */}
            {stems.map((s, i) => {
              const total = stems.length || 1;
              const row = i % 3; // 0 = Back, 1 = Middle, 2 = Front Focal
              const col = Math.floor(i / 3);
              const maxCols = Math.ceil(total / 3);

              const xOffset = maxCols > 1 ? (col / (maxCols - 1) - 0.5) * 58 : 0;
              const x = 50 + xOffset;
              const y = row === 0 ? 25 + (col % 2) * 6 : row === 1 ? 44 + (col % 2) * 6 : 64;
              const size = row === 0 ? 54 : row === 1 ? 62 : 70;
              const rot = xOffset * 0.35 + (i % 2 === 0 ? 10 : -10);

              return (
                <div
                  key={s.id}
                  className="absolute flex items-center justify-center select-none transition-all duration-700 hover:scale-125 hover:z-40 cursor-pointer"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.25))",
                  }}
                >
                  {s.image ? (
                    <img
                      src={s.image}
                      alt={s.name}
                      className="w-full h-full object-contain pointer-events-none transition-transform duration-300 hover:scale-110"
                    />
                  ) : (
                    <span style={{ fontSize: `${size * 0.95}px` }}>{s.icon}</span>
                  )}
                </div>
              );
            })}

            {/* Fairy Lights Effect */}
            {hasFairyLights && (
              <div className="absolute inset-0 z-30 pointer-events-none">
                {[
                  { l: 25, t: 25 },
                  { l: 45, t: 18 },
                  { l: 65, t: 22 },
                  { l: 78, t: 38 },
                  { l: 32, t: 48 },
                  { l: 52, t: 42 },
                  { l: 68, t: 46 },
                ].map((pos, idx) => (
                  <span
                    key={idx}
                    className="absolute text-xl animate-ping"
                    style={{
                      left: `${pos.l}%`,
                      top: `${pos.t}%`,
                      animationDuration: `${1.5 + (idx % 3) * 0.5}s`,
                      animationDelay: `${idx * 200}ms`,
                    }}
                  >
                    ✨
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SVG Front Overlapping Folds & Silk Ribbon Bow */}
        <svg
          viewBox="0 0 400 500"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Left Paper Overlap Fold */}
          <path
            d="M 50,210 Q 145,240 215,405 L 155,410 Z"
            fill={wrap}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
            style={{ filter: "drop-shadow(-4px 6px 12px rgba(0,0,0,0.18))" }}
          />

          {/* Right Paper Overlap Fold */}
          <path
            d="M 350,210 Q 255,240 185,405 L 245,410 Z"
            fill={wrap}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
            style={{ filter: "drop-shadow(4px 6px 12px rgba(0,0,0,0.22))" }}
          />

          {/* Satin Ribbon Tied Bow at Waist */}
          <g transform="translate(200, 405)">
            {/* Left Ribbon Tail */}
            <path
              d="M -6,6 Q -22,35 -30,68"
              stroke={ribbon}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.25))" }}
            />
            {/* Right Ribbon Tail */}
            <path
              d="M 6,6 Q 22,35 30,65"
              stroke={ribbon}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.25))" }}
            />
            {/* Left Satin Loop */}
            <ellipse
              cx="-20"
              cy="-8"
              rx="24"
              ry="14"
              fill={ribbon}
              transform="rotate(-18 -20 -8)"
              style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
            />
            {/* Right Satin Loop */}
            <ellipse
              cx="20"
              cy="-8"
              rx="24"
              ry="14"
              fill={ribbon}
              transform="rotate(18 20 -8)"
              style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}
            />
            {/* Ribbon Knot Center */}
            <circle
              cx="0"
              cy="0"
              r="9"
              fill={ribbon}
              style={{ filter: "brightness(0.85) drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
            />
          </g>
        </svg>

        {/* Accessory Badges */}
        {hasCard && (
          <div
            className="absolute bottom-[28%] left-[16%] z-35 -rotate-12 transition-all duration-500 hover:scale-110 cursor-pointer pointer-events-auto"
            style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.22))" }}
          >
            <span className="text-4xl">✉️</span>
          </div>
        )}

        {hasTeddy && (
          <div
            className="absolute bottom-[16%] right-[12%] z-35 rotate-12 transition-all duration-500 hover:scale-110 pointer-events-auto"
            style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.22))" }}
          >
            <span className="text-4xl">🧸</span>
          </div>
        )}
      </div>
    </div>
  );
}
