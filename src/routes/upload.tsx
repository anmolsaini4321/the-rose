import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Plus, ImagePlus, Loader2 } from "lucide-react";

const CATEGORIES = ["Bouquet", "Wedding", "Hamper", "Forever Rose", "Seasonal", "Corporate"];

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Product — The Rose by Geetanjli Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UploadProduct,
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + "-" + Date.now().toString(36);
}

function UploadProduct() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    category: "Bouquet",
    short_description: "",
    description: "",
    price: "",
    original_price: "",
    flowers_included: [] as string[],
    tags: [] as string[],
    stock_count: "10",
    is_published: false,
    is_featured: false,
    meta_title: "",
    meta_description: "",
  });
  const [flowerInput, setFlowerInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auth gate — must be super_admin
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setIsSuperAdmin(false); return; }
      setUserId(u.user.id);

      // Try RLS-protected query first
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (error) {
        console.error("[upload] user_roles query error:", error.message);
      }

      // If the query returns data, great. If not (RLS timing issue),
      // fall back to checking via a broader select
      if (data) {
        setIsSuperAdmin(true);
        return;
      }

      // Fallback: fetch all roles for this user and check locally
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);

      const hasAdmin = (allRoles ?? []).some(
        (r: { role: string }) => r.role === "super_admin"
      );
      setIsSuperAdmin(hasAdmin);
    })();
  }, []);

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 8 - imageFiles.length);
    setImageFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const url = URL.createObjectURL(f);
      setImagePreviews((prev) => [...prev, url]);
    });
  };

  const removeImage = (i: number) => {
    URL.revokeObjectURL(imagePreviews[i]);
    setImageFiles((p) => p.filter((_, idx) => idx !== i));
    setImagePreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const addFlower = () => {
    const v = flowerInput.trim();
    if (!v || form.flowers_included.includes(v)) return;
    setForm((f) => ({ ...f, flowers_included: [...f.flowers_included, v] }));
    setFlowerInput("");
  };

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v || form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.title || !form.price || !form.description) {
      toast.error("Title, price and description are required");
      return;
    }

    setSaving(true);
    setUploading(true);

    try {
      // 1. Upload images to Supabase Storage
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const ext = file.name.split(".").pop();
        const path = `products/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast.error(`Failed to upload image ${i + 1}: ${upErr.message}`);
          setSaving(false);
          setUploading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }
      setUploading(false);

      // 2. Insert product
      const { error: prodErr } = await supabase.from("products").insert({
        title: form.title,
        slug: slugify(form.title),
        description: form.description,
        short_description: form.short_description || null,
        price: parseFloat(form.price),
        original_price: form.original_price ? parseFloat(form.original_price) : null,
        flowers_included: form.flowers_included,
        category: form.category,
        tags: form.tags,
        images: imageUrls,
        thumbnail: imageUrls[0] ?? null,
        is_published: form.is_published,
        is_featured: form.is_featured,
        stock_count: parseInt(form.stock_count, 10),
        created_by: userId,
        meta_title: form.meta_title || form.title,
        meta_description: form.meta_description || form.short_description || null,
      });

      if (prodErr) {
        toast.error(prodErr.message);
        setSaving(false);
        return;
      }

      toast.success(form.is_published ? "Product published to shop!" : "Product saved as draft");
      navigate({ to: "/admin" });
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error. Please try again.");
      setSaving(false);
      setUploading(false);
    }
  };

  // Access denied
  if (isSuperAdmin === false) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center flex-col text-center px-6 pt-32">
          <p className="text-eyebrow text-primary/60">Restricted Area</p>
          <h1 className="text-display text-5xl mt-6">Access Denied.</h1>
          <p className="mt-4 opacity-60">This area is reserved for the super-admin only.</p>
          <div className="mt-10 flex gap-4">
            <Link to="/" className="btn-royal btn-royal-hover">Return Home</Link>
            <Link to="/auth" className="text-eyebrow opacity-70 hover:opacity-100 py-4">Sign In</Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (isSuperAdmin === null) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin opacity-40" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />

      <div className="pt-32 pb-20 px-6 lg:px-12 mx-auto max-w-[1200px]">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-eyebrow text-primary/60">Super Admin · Product Management</p>
            <h1 className="text-display text-5xl mt-4">Upload New Product</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/admin" className="text-eyebrow opacity-60 hover:opacity-100">← Admin Panel</Link>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left */}
            <div className="lg:col-span-8 space-y-8">

              {/* Basic Info */}
              <section className="bg-ivory border border-border p-8">
                <h2 className="font-display text-2xl mb-6">Basic Information</h2>
                <div className="space-y-5">
                  <div>
                    <label className="text-eyebrow opacity-60 block mb-2">Product Title *</label>
                    <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Royal Red Rose Bouquet — 24 Stems"
                      className="w-full bg-cream border border-border p-3 font-display text-xl focus:outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">Category</label>
                      <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary">
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">Stock Count *</label>
                      <input required type="number" min="0" value={form.stock_count}
                        onChange={(e) => setForm((f) => ({ ...f, stock_count: e.target.value }))}
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-eyebrow opacity-60 block mb-2">Short Description</label>
                    <input value={form.short_description} onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                      placeholder="One-line summary shown in product cards"
                      className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-eyebrow opacity-60 block mb-2">Full Description *</label>
                    <textarea required rows={6} value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Detailed product description — supports line breaks"
                      className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </section>

              {/* Images */}
              <section className="bg-ivory border border-border p-8">
                <h2 className="font-display text-2xl mb-6">Product Images</h2>
                <div
                  className="border-2 border-dashed border-border p-10 text-center cursor-pointer hover:border-primary/60 transition"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleImages(e.dataTransfer.files); }}
                >
                  <ImagePlus size={28} className="mx-auto opacity-30 mb-3" />
                  <p className="text-eyebrow opacity-60">Click to upload or drag & drop</p>
                  <p className="text-xs opacity-40 mt-1">JPG, PNG, WebP · Max 8 images · First image becomes thumbnail</p>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleImages(e.target.files)} />
                </div>

                {imagePreviews.length > 0 && (
                  <div className="mt-6 grid grid-cols-4 gap-3">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative group aspect-square border border-border overflow-hidden">
                        <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-1 left-1 text-eyebrow text-xs px-2 py-0.5"
                            style={{ background: "var(--gold)", color: "var(--forest)" }}>
                            Thumbnail
                          </div>
                        )}
                        <button type="button" onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-destructive text-ivory rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 8 && (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-border flex items-center justify-center hover:border-primary/60 transition">
                        <Plus size={20} className="opacity-40" />
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Flowers & Tags */}
              <section className="bg-ivory border border-border p-8">
                <h2 className="font-display text-2xl mb-6">Composition Details</h2>
                <div className="space-y-5">
                  <div>
                    <label className="text-eyebrow opacity-60 block mb-2">Flowers Included</label>
                    <div className="flex gap-2">
                      <input value={flowerInput} onChange={(e) => setFlowerInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFlower(); } }}
                        placeholder="e.g. Red Rose, Baby's Breath…"
                        className="flex-1 bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                      <button type="button" onClick={addFlower} className="btn-royal btn-royal-hover px-5">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.flowers_included.map((f) => (
                        <span key={f} className="text-eyebrow px-3 py-1.5 bg-cream border border-border flex items-center gap-2">
                          {f}
                          <button type="button" onClick={() => setForm((x) => ({ ...x, flowers_included: x.flowers_included.filter((v) => v !== f) }))}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-eyebrow opacity-60 block mb-2">Tags</label>
                    <div className="flex gap-2">
                      <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        placeholder="e.g. wedding, romantic, premium…"
                        className="flex-1 bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                      <button type="button" onClick={addTag} className="btn-royal btn-royal-hover px-5">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.tags.map((t) => (
                        <span key={t} className="text-eyebrow px-3 py-1.5 bg-cream border border-border flex items-center gap-2">
                          #{t}
                          <button type="button" onClick={() => setForm((x) => ({ ...x, tags: x.tags.filter((v) => v !== t) }))}>
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* SEO */}
              <section className="bg-ivory border border-border p-8">
                <h2 className="font-display text-2xl mb-6">SEO Metadata</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-eyebrow opacity-60 block mb-2">Meta Title (60 chars ideal)</label>
                    <input value={form.meta_title} onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                      placeholder={`${form.title} — The Rose by Geetanjli`}
                      className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                    <p className="text-xs opacity-40 mt-1">{form.meta_title.length}/60</p>
                  </div>
                  <div>
                    <label className="text-eyebrow opacity-60 block mb-2">Meta Description (160 chars ideal)</label>
                    <textarea rows={2} value={form.meta_description}
                      onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                      className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                    <p className="text-xs opacity-40 mt-1">{form.meta_description.length}/160</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Right — Pricing + Publish */}
            <div className="lg:col-span-4">
              <div className="sticky top-28 space-y-6">
                <section className="bg-ivory border border-border p-8">
                  <h2 className="font-display text-2xl mb-6">Pricing</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">Selling Price (₹) *</label>
                      <input required type="number" min="0" step="0.01" value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="e.g. 2499"
                        className="w-full bg-cream border border-border p-3 font-display text-2xl focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-eyebrow opacity-60 block mb-2">Original / MRP (₹)</label>
                      <input type="number" min="0" step="0.01" value={form.original_price}
                        onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
                        placeholder="Optional — shows crossed-out price"
                        className="w-full bg-cream border border-border p-3 focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                </section>

                <section className="bg-ivory border border-border p-8">
                  <h2 className="font-display text-2xl mb-6">Visibility</h2>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${form.is_published ? "bg-forest" : "bg-border"}`}
                        style={form.is_published ? { background: "var(--forest)" } : {}}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-ivory shadow transition-transform ${form.is_published ? "translate-x-6" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-eyebrow">{form.is_published ? "Published" : "Draft"}</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setForm((f) => ({ ...f, is_featured: !f.is_featured }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${form.is_featured ? "bg-gold" : "bg-border"}`}
                        style={form.is_featured ? { background: "var(--gold)" } : {}}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-ivory shadow transition-transform ${form.is_featured ? "translate-x-6" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-eyebrow">{form.is_featured ? "Featured" : "Not Featured"}</span>
                    </label>
                  </div>
                </section>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full btn-royal btn-royal-hover disabled:opacity-40"
                  >
                    {uploading ? (
                      <><Loader2 size={14} className="animate-spin" /> Uploading Images…</>
                    ) : saving ? (
                      <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    ) : (
                      <><Upload size={14} /> {form.is_published ? "Publish Product" : "Save as Draft"}</>
                    )}
                  </button>
                  <Link to="/admin" className="block text-center text-eyebrow opacity-60 hover:opacity-100 py-2">
                    Cancel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <SiteFooter />
    </div>
  );
}
