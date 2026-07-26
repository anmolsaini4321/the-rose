export type Wrapping = { id: string; name: string; swatch: string; ring?: string };
export type Flower = { id: string; name: string; meaning: string; price: number; color: string; icon: string };
export type Filler = { id: string; name: string; price: number; color: string };
export type Ribbon = { id: string; name: string; swatch: string };
export type Accessory = { id: string; name: string; price: number };

export const WRAPPINGS: Wrapping[] = [
  { id: "ivory", name: "Matte Ivory", swatch: "oklch(0.965 0.015 82)" },
  { id: "champagne", name: "Champagne Gold", swatch: "oklch(0.86 0.05 82)" },
  { id: "black", name: "Royal Black", swatch: "oklch(0.2 0.01 80)" },
  { id: "emerald", name: "Emerald Green", swatch: "oklch(0.35 0.08 155)" },
  { id: "burgundy", name: "Burgundy Velvet", swatch: "oklch(0.35 0.12 20)" },
  { id: "blush", name: "Blush Pink", swatch: "oklch(0.88 0.04 20)" },
  { id: "transparent", name: "Korean Wrap", swatch: "oklch(0.97 0.005 82)" },
  { id: "satin", name: "White Satin", swatch: "oklch(0.98 0.005 82)" },
];

export const FLOWERS: Flower[] = [
  { id: "red-rose", name: "Red Rose", meaning: "Enduring love", price: 180, color: "oklch(0.42 0.16 20)", icon: "🌹" },
  { id: "white-rose", name: "White Rose", meaning: "Reverence & new beginnings", price: 170, color: "oklch(0.96 0.01 82)", icon: "🌸" },
  { id: "pink-rose", name: "Pink Rose", meaning: "Grace & admiration", price: 170, color: "oklch(0.82 0.06 20)", icon: "🌷" },
  { id: "yellow-rose", name: "Yellow Rose", meaning: "Joyful friendship", price: 160, color: "oklch(0.88 0.09 90)", icon: "🌼" },
  { id: "tulip", name: "Tulip", meaning: "Perfect love", price: 140, color: "oklch(0.72 0.14 20)", icon: "🌷" },
  { id: "lily", name: "Lily", meaning: "Purity", price: 220, color: "oklch(0.94 0.03 82)", icon: "🌺" },
  { id: "hydrangea", name: "Hydrangea", meaning: "Heartfelt emotion", price: 260, color: "oklch(0.75 0.06 240)", icon: "💠" },
  { id: "peony", name: "Peony", meaning: "Romance & prosperity", price: 320, color: "oklch(0.85 0.06 10)", icon: "🌸" },
  { id: "orchid", name: "Orchid", meaning: "Rare beauty", price: 380, color: "oklch(0.75 0.08 330)", icon: "🌺" },
  { id: "carnation", name: "Carnation", meaning: "Devotion", price: 90, color: "oklch(0.8 0.08 15)", icon: "🌸" },
  { id: "sunflower", name: "Sunflower", meaning: "Adoration", price: 130, color: "oklch(0.82 0.15 90)", icon: "🌻" },
  { id: "babys-breath", name: "Baby's Breath", meaning: "Everlasting", price: 60, color: "oklch(0.97 0.005 82)", icon: "✿" },
  { id: "lavender", name: "Lavender", meaning: "Serenity", price: 110, color: "oklch(0.68 0.08 300)", icon: "🌾" },
  { id: "daisy", name: "Daisy", meaning: "Innocence", price: 70, color: "oklch(0.96 0.02 90)", icon: "🌼" },
  { id: "eucalyptus", name: "Eucalyptus", meaning: "Protection", price: 80, color: "oklch(0.55 0.05 155)", icon: "🌿" },
  { id: "chrysanthemum", name: "Chrysanthemum", meaning: "Longevity", price: 100, color: "oklch(0.82 0.1 60)", icon: "🌼" },
];

export const FILLERS: Filler[] = [
  { id: "babys-breath-f", name: "Baby's Breath", price: 40, color: "oklch(0.97 0.005 82)" },
  { id: "fern", name: "Fern", price: 50, color: "oklch(0.5 0.06 155)" },
  { id: "silver-brunia", name: "Silver Brunia", price: 90, color: "oklch(0.75 0.01 82)" },
  { id: "ruscus", name: "Ruscus", price: 60, color: "oklch(0.45 0.07 155)" },
  { id: "eucalyptus-f", name: "Eucalyptus", price: 70, color: "oklch(0.55 0.05 155)" },
  { id: "dry-grass", name: "Dry Grass", price: 45, color: "oklch(0.75 0.05 80)" },
];

export const RIBBON_MATERIALS = [
  { id: "silk", name: "Silk" },
  { id: "velvet", name: "Velvet" },
  { id: "satin", name: "Satin" },
];

export const RIBBON_COLORS: Ribbon[] = [
  { id: "gold", name: "Antique Gold", swatch: "oklch(0.74 0.09 76)" },
  { id: "burgundy", name: "Burgundy", swatch: "oklch(0.36 0.11 20)" },
  { id: "black", name: "Black", swatch: "oklch(0.2 0.01 80)" },
  { id: "cream", name: "Cream", swatch: "oklch(0.94 0.02 82)" },
  { id: "emerald", name: "Emerald", swatch: "oklch(0.35 0.08 155)" },
  { id: "ivory", name: "Ivory", swatch: "oklch(0.98 0.005 82)" },
];

export const ACCESSORIES: Accessory[] = [
  { id: "greeting-card", name: "Luxury Greeting Card", price: 150 },
  { id: "gift-box", name: "Luxury Gift Box", price: 450 },
  { id: "chocolate", name: "Belgian Chocolate Box", price: 650 },
  { id: "perfume", name: "Signature Perfume", price: 1200 },
  { id: "fairy-lights", name: "Fairy Lights", price: 250 },
  { id: "teddy", name: "Handmade Teddy", price: 550 },
  { id: "preserved-dome", name: "Preserved Rose Dome", price: 1800 },
  { id: "wax-seal", name: "Gold Wax Seal", price: 180 },
];

export type BouquetConfig = {
  wrapping: string;
  ribbon_material: string;
  ribbon_color: string;
  flowers: { id: string; qty: number }[];
  fillers: string[];
  accessories: string[];
  message: string;
  title: string;
};

export function calculatePrice(cfg: BouquetConfig): number {
  const base = 500;
  const flowers = cfg.flowers.reduce((s, f) => {
    const flower = FLOWERS.find((x) => x.id === f.id);
    return s + (flower ? flower.price * f.qty : 0);
  }, 0);
  const fillers = cfg.fillers.reduce((s, id) => {
    const f = FILLERS.find((x) => x.id === id);
    return s + (f?.price ?? 0);
  }, 0);
  const acc = cfg.accessories.reduce((s, id) => {
    const a = ACCESSORIES.find((x) => x.id === id);
    return s + (a?.price ?? 0);
  }, 0);
  return base + flowers + fillers + acc;
}

export const DEFAULT_CONFIG: BouquetConfig = {
  wrapping: "ivory",
  ribbon_material: "silk",
  ribbon_color: "emerald",
  flowers: [{ id: "red-rose", qty: 6 }, { id: "white-rose", qty: 6 }],
  fillers: ["eucalyptus-f"],
  accessories: ["greeting-card"],
  message: "",
  title: "My Signature Bouquet",
};
