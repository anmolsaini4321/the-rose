import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav, FloatingActions } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import {
  WRAPPINGS, FLOWERS, FILLERS, RIBBON_MATERIALS, RIBBON_COLORS, ACCESSORIES,
  DEFAULT_CONFIG, calculatePrice, type BouquetConfig,
} from "@/lib/bouquet-catalog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Minus, Plus, Save, Share2 } from "lucide-react";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Design Your Rose Bouquet — Flower Delivery in Faridabad | The Rose by Geetanjli" },
      { name: "description", content: "Design your custom rose bouquet online with The Rose by Geetanjli. Choose fresh flowers, wrappings & ribbons with fast flower delivery in Faridabad." },
      { property: "og:title", content: "Design Your Rose Bouquet | The Rose by Geetanjli Faridabad" },
      { property: "og:description", content: "Custom floral atelier by The Rose by Geetanjli in Faridabad. Create & order your fresh rose bouquet online." },
    ],
  }),
  component: Builder,
});

const STEPS = ["Wrapping", "Flowers", "Fillers", "Ribbon", "Accessories"] as const;

function Builder() {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<BouquetConfig>(DEFAULT_CONFIG);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const price = useMemo(() => calculatePrice(cfg), [cfg]);
  const flowerCount = cfg.flowers.reduce((s, f) => s + f.qty, 0);

  const setFlower = (id: string, delta: number) => {
    setCfg((c) => {
      const existing = c.flowers.find((f) => f.id === id);
      let flowers = c.flowers;
      if (existing) {
        const newQty = Math.max(0, existing.qty + delta);
        flowers = newQty === 0 ? c.flowers.filter((f) => f.id !== id) : c.flowers.map((f) => f.id === id ? { ...f, qty: newQty } : f);
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
    const { error } = await supabase.from("bouquets").insert({
      user_id: userData.user.id,
      title: cfg.title,
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
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isPublic ? "Published to the gallery" : "Saved to your atelier");
    navigate({ to: "/my-bouquets" });
  };

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />
      <FloatingActions />

      <div className="pt-32 pb-16 px-6 lg:px-12 mx-auto max-w-[1600px]">
        <div className="max-w-2xl">
          <p className="text-eyebrow text-primary/60">The Atelier · Configurator</p>
          <h1 className="text-display text-5xl md:text-7xl mt-6">
            Compose your <em>signature rose bouquet in Faridabad.</em>
          </h1>
          <p className="mt-6 opacity-70 max-w-xl">
            Custom floral atelier by The Rose by Geetanjli. Design your fresh rose bouquet with local flower delivery in Faridabad.
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
                      step === i ? "border-primary bg-ivory" : "border-transparent hover:bg-ivory/60"
                    }`}
                  >
                    <span className="text-eyebrow opacity-50">Step {String(i + 1).padStart(2, "0")}</span>
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
                <StepBlock title="Wrapping" subtitle="The first impression, made of paper and silk.">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {WRAPPINGS.map((w) => (
                      <button key={w.id} onClick={() => setCfg((c) => ({ ...c, wrapping: w.id }))}
                        className={`group border p-4 text-left transition ${cfg.wrapping === w.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}>
                        <div className="aspect-square" style={{ background: w.swatch }} />
                        <p className="text-eyebrow mt-3 opacity-70">{w.name}</p>
                      </button>
                    ))}
                  </div>
                </StepBlock>
              )}

              {step === 1 && (
                <StepBlock title="Flowers" subtitle="Choose your blooms. Each stem tells a meaning.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FLOWERS.map((f) => {
                      const cur = cfg.flowers.find((x) => x.id === f.id);
                      return (
                        <div key={f.id} className="border border-border p-5 flex gap-4 items-center bg-cream">
                          <div className="w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-2xl" style={{ background: f.color, color: "var(--ivory)" }}>
                            {f.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-lg leading-tight">{f.name}</p>
                            <p className="text-xs opacity-60 italic">{f.meaning}</p>
                            <p className="text-eyebrow mt-1">₹{f.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setFlower(f.id, -1)} className="w-8 h-8 border border-border hover:border-primary flex items-center justify-center"><Minus size={14} /></button>
                            <span className="w-6 text-center font-display">{cur?.qty ?? 0}</span>
                            <button onClick={() => setFlower(f.id, +1)} className="w-8 h-8 border border-border hover:border-primary flex items-center justify-center"><Plus size={14} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </StepBlock>
              )}

              {step === 2 && (
                <StepBlock title="Fillers" subtitle="The soft counterpoint that gives the bouquet its breath.">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {FILLERS.map((f) => {
                      const on = cfg.fillers.includes(f.id);
                      return (
                        <button key={f.id} onClick={() => toggle("fillers", f.id)} className={`border p-5 text-left transition ${on ? "border-primary ring-1 ring-primary bg-cream" : "border-border hover:border-primary/50"}`}>
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
                      <button key={m.id} onClick={() => setCfg((c) => ({ ...c, ribbon_material: m.id }))}
                        className={`px-5 py-3 border text-eyebrow transition ${cfg.ribbon_material === m.id ? "border-primary bg-cream" : "border-border hover:border-primary/50"}`}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-eyebrow opacity-60 mb-3 mt-8">Colour</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {RIBBON_COLORS.map((r) => (
                      <button key={r.id} onClick={() => setCfg((c) => ({ ...c, ribbon_color: r.id }))}
                        className={`border p-3 transition ${cfg.ribbon_color === r.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}>
                        <div className="aspect-square" style={{ background: r.swatch }} />
                        <p className="text-eyebrow mt-2 opacity-70 text-center">{r.name}</p>
                      </button>
                    ))}
                  </div>
                </StepBlock>
              )}

              {step === 4 && (
                <StepBlock title="Accessories" subtitle="Small gestures that turn a bouquet into an heirloom.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ACCESSORIES.map((a) => {
                      const on = cfg.accessories.includes(a.id);
                      return (
                        <button key={a.id} onClick={() => toggle("accessories", a.id)}
                          className={`flex justify-between items-center border p-5 text-left transition ${on ? "border-primary ring-1 ring-primary bg-cream" : "border-border hover:border-primary/50"}`}>
                          <span className="font-display text-lg">{a.name}</span>
                          <span className="text-eyebrow opacity-60">₹{a.price} {on && <Check size={14} className="inline ml-2" />}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8">
                    <label className="text-eyebrow opacity-70">Handwritten Message</label>
                    <textarea rows={3} value={cfg.message} onChange={(e) => setCfg((c) => ({ ...c, message: e.target.value }))}
                      placeholder="A private note, sealed in gold wax…"
                      className="mt-3 w-full bg-cream border border-border p-4 font-display text-lg italic focus:outline-none focus:border-primary" />
                  </div>
                </StepBlock>
              )}

              <div className="mt-10 flex justify-between border-t border-border pt-6">
                <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="text-eyebrow opacity-70 hover:opacity-100 disabled:opacity-30">← Previous</button>
                <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1} className="text-eyebrow opacity-70 hover:opacity-100 disabled:opacity-30">Next →</button>
              </div>
            </div>
          </section>

          {/* RIGHT — summary */}
          <aside className="lg:col-span-3">
            <div className="sticky top-28 bg-ivory border border-border p-8">
              <p className="text-eyebrow opacity-60">Composition</p>
              <input value={cfg.title} onChange={(e) => setCfg((c) => ({ ...c, title: e.target.value }))}
                className="w-full mt-2 font-display text-2xl bg-transparent border-b border-border focus:outline-none focus:border-primary pb-2" />

              <dl className="mt-8 space-y-3 text-sm">
                <Row label="Wrapping" value={WRAPPINGS.find((w) => w.id === cfg.wrapping)?.name ?? "—"} />
                <Row label="Ribbon" value={`${RIBBON_MATERIALS.find((m) => m.id === cfg.ribbon_material)?.name} · ${RIBBON_COLORS.find((c) => c.id === cfg.ribbon_color)?.name}`} />
                <Row label="Flowers" value={`${flowerCount} stems`} />
                <Row label="Fillers" value={cfg.fillers.length ? `${cfg.fillers.length} added` : "—"} />
                <Row label="Accessories" value={cfg.accessories.length ? `${cfg.accessories.length} added` : "—"} />
                <Row label="Delivery" value="2–3 days" />
              </dl>

              <div className="hairline my-8" />
              <div className="flex items-baseline justify-between">
                <span className="text-eyebrow opacity-60">Total</span>
                <span className="font-display text-4xl">₹{price.toLocaleString("en-IN")}</span>
              </div>

              <div className="mt-8 space-y-3">
                <button onClick={() => save(false)} disabled={saving} className="w-full btn-royal btn-royal-hover"><Save size={14}/> Save Draft</button>
                <button onClick={() => save(true)} disabled={saving} className="w-full btn-royal btn-royal-hover" style={{ background: "transparent", color: "var(--forest)" }}><Share2 size={14}/> Publish to Gallery</button>
                <a href="mailto:atelier@theroseby.com" className="block text-center text-eyebrow opacity-60 hover:opacity-100 pt-2">Order via consultation →</a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function StepBlock({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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
  const wrap = WRAPPINGS.find((w) => w.id === cfg.wrapping)?.swatch ?? "var(--ivory)";
  const ribbon = RIBBON_COLORS.find((r) => r.id === cfg.ribbon_color)?.swatch ?? "var(--forest)";
  const stems = cfg.flowers.flatMap((f) => {
    const flower = FLOWERS.find((x) => x.id === f.id);
    return Array.from({ length: Math.min(f.qty, 18) }, (_, i) => ({ id: `${f.id}-${i}`, color: flower?.color ?? "var(--burgundy)" }));
  });
  return (
    <div className="absolute inset-0 flex items-end justify-center" style={{ background: "radial-gradient(ellipse at center 70%, oklch(0.94 0.02 82), var(--ivory))" }}>
      {/* Wrapping cone */}
      <div className="relative w-3/4 h-4/5 flex items-end justify-center">
        <div className="absolute bottom-0 w-full h-3/5" style={{
          background: wrap,
          clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
          boxShadow: "var(--shadow-elegant)",
        }} />
        {/* Flowers cluster */}
        <div className="absolute bottom-[45%] w-4/5 h-2/5">
          <div className="relative w-full h-full">
            {stems.map((s, i) => {
              const total = stems.length || 1;
              const angle = (i / total) * Math.PI - Math.PI / 2;
              const radius = 32 + (i % 3) * 8;
              const x = 50 + Math.cos(angle) * radius;
              const y = 50 + Math.sin(angle) * radius * 0.5;
              const size = 40 + ((i * 7) % 20);
              return (
                <div key={s.id} className="absolute rounded-full transition-all duration-500" style={{
                  left: `${x}%`, top: `${y}%`,
                  width: size, height: size,
                  background: `radial-gradient(circle at 30% 30%, oklch(from ${s.color} calc(l + 0.15) c h), ${s.color} 70%)`,
                  transform: `translate(-50%, -50%) rotate(${i * 13}deg)`,
                  boxShadow: "0 4px 12px oklch(0 0 0 / 0.15)",
                }} />
              );
            })}
            {/* eucalyptus fillers */}
            {cfg.fillers.map((_, i) => (
              <div key={i} className="absolute" style={{
                left: `${20 + i * 15}%`, top: `${60 + (i % 2) * 10}%`,
                width: 60, height: 8, background: "oklch(0.55 0.05 155)",
                borderRadius: "50%", transform: `rotate(${-20 + i * 15}deg)`,
              }} />
            ))}
          </div>
        </div>
        {/* Ribbon bow */}
        <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2 flex gap-1">
          <div className="w-10 h-6" style={{ background: ribbon, borderRadius: "50% 20% 50% 20%" }} />
          <div className="w-10 h-6" style={{ background: ribbon, borderRadius: "20% 50% 20% 50%" }} />
        </div>
      </div>
    </div>
  );
}
