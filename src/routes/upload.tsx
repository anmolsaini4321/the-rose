import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkAdminRoute } from "@/lib/auth-guard";
import {
  Upload,
  X,
  Plus,
  ImagePlus,
  Loader2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Trash2,
} from "lucide-react";

const CATEGORIES = ["Bouquet", "Wedding", "Hamper", "Forever Rose", "Seasonal", "Corporate"];
const POPULAR_FLOWERS = [
  "Red Rose",
  "Pink Rose",
  "White Lily",
  "Baby's Breath",
  "Tulip",
  "Carnation",
  "Orchid",
  "Hydrangea",
  "Eucalyptus",
];
const POPULAR_TAGS = [
  "romantic",
  "luxury",
  "wedding",
  "birthday",
  "anniversary",
  "congratulations",
  "hand-tied",
  "seasonal",
];

export const Route = createFileRoute("/upload")({
  beforeLoad: async ({ location }) => {
    await checkAdminRoute(location.pathname);
  },
  head: () => ({
    meta: [
      { title: "Upload Product — The Rose by Geetanjli Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UploadProduct,
});

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Date.now().toString(36)
  );
}

function UploadProduct() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Stepper state
  const [currentStep, setCurrentStep] = useState(0);

  const STEPS = [
    { title: "Welcome", desc: "Start listing a new creation" },
    { title: "Basics", desc: "Title & Category" },
    { title: "Pricing & Stock", desc: "Price & Inventory" },
    { title: "Description", desc: "Product details" },
    { title: "Composition", desc: "Flowers & tags" },
    { title: "Images", desc: "Add pictures" },
    { title: "Publish", desc: "Review & publish" },
  ];

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
  });

  const [flowerInput, setFlowerInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auth gate — must be super_admin
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setIsSuperAdmin(false);
        return;
      }
      setUserId(u.user.id);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "super_admin")
        .maybeSingle();

      if (error) {
        console.error("[upload] user_roles query error:", error.message);
      }

      if (data) {
        setIsSuperAdmin(true);
        return;
      }

      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);

      const hasAdmin = (allRoles ?? []).some((r: { role: string }) => r.role === "super_admin");
      setIsSuperAdmin(hasAdmin);
    })();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Camera functions
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errMsg = "Could not access the camera. Please check permissions.";
      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        errMsg = "Camera access requires a secure connection (HTTPS) or localhost.";
      }
      setCameraError(errMsg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `snap-${Date.now()}.jpg`, { type: "image/jpeg" });
            setImageFiles((prev) => [...prev, file]);
            const url = URL.createObjectURL(file);
            setImagePreviews((prev) => [...prev, url]);
            toast.success("Photo snapped successfully!");
          } else {
            toast.error("Failed to convert image feed.");
          }
        },
        "image/jpeg",
        0.9,
      );
    }
  };

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 8 - imageFiles.length);
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

  const addFlower = (name?: string) => {
    const v = (name || flowerInput).trim();
    if (!v || form.flowers_included.includes(v)) return;
    setForm((f) => ({ ...f, flowers_included: [...f.flowers_included, v] }));
    setFlowerInput("");
  };

  const addTag = (name?: string) => {
    const v = (name || tagInput).trim().toLowerCase();
    if (!v || form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput("");
  };

  const canGoNext = () => {
    if (currentStep === 1) return form.title.trim().length > 0;
    if (currentStep === 2) {
      return (
        form.price.trim().length > 0 &&
        !isNaN(parseFloat(form.price)) &&
        parseFloat(form.price) >= 0 &&
        form.stock_count.trim().length > 0 &&
        !isNaN(parseInt(form.stock_count)) &&
        parseInt(form.stock_count) >= 0
      );
    }
    if (currentStep === 3) return form.description.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !form.title.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (currentStep === 2) {
      if (!form.price.trim()) {
        toast.error("Selling price is required.");
        return;
      }
      if (isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) {
        toast.error("Please enter a valid selling price.");
        return;
      }
      if (
        !form.stock_count.trim() ||
        isNaN(parseInt(form.stock_count)) ||
        parseInt(form.stock_count) < 0
      ) {
        toast.error("Please enter a valid stock count.");
        return;
      }
    }
    if (currentStep === 3 && !form.description.trim()) {
      toast.error("Product description is required.");
      return;
    }

    if (currentStep < STEPS.length - 1) {
      if (currentStep === 5 && cameraActive) {
        stopCamera();
      }
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      if (currentStep === 5 && cameraActive) {
        stopCamera();
      }
      setCurrentStep((prev) => prev - 1);
    }
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
      // 1. Upload images to Supabase Storage with Base64 fallback
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `products/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (upErr) {
          console.warn(`Storage upload error for image ${i + 1}:`, upErr);
          // Fall back to reading file as Data URL if bucket is missing or unauthorized
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          imageUrls.push(dataUrl);
        } else {
          const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        }
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
        // Auto-generated SEO fields
        meta_title: form.title,
        meta_description: form.short_description || form.description.slice(0, 150) || null,
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
            <Link to="/" className="btn-royal btn-royal-hover">
              Return Home
            </Link>
            <Link to="/auth" className="text-eyebrow opacity-70 hover:opacity-100 py-4">
              Sign In
            </Link>
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

  const progressPercent = (currentStep / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-between">
      <SiteNav />

      <div className="pt-32 pb-20 px-6 lg:px-12 mx-auto max-w-[850px] w-full flex-1 flex flex-col justify-start">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4 border-b border-border pb-6">
          <div>
            <p className="text-eyebrow text-primary/60">Super Admin · Listing Wizard</p>
            <h1 className="text-display text-4xl md:text-5xl mt-2">New Product Creation</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/admin" className="text-eyebrow opacity-60 hover:opacity-100">
              ← Back to Admin
            </Link>
          </div>
        </div>

        {/* Custom luxury Stepper */}
        {currentStep > 0 && (
          <div className="mb-10">
            <div className="flex justify-between items-center relative mb-4">
              {STEPS.map((s, i) => (
                <div key={i} className="flex flex-col items-center flex-1 relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (i < currentStep) {
                        if (currentStep === 5 && cameraActive) stopCamera();
                        setCurrentStep(i);
                      }
                    }}
                    disabled={i > currentStep}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-display text-sm z-10 transition-all ${
                      i === currentStep
                        ? "border-primary bg-primary text-ivory font-bold scale-110 shadow-sm"
                        : i < currentStep
                          ? "border-primary bg-ivory text-primary hover:bg-cream cursor-pointer"
                          : "border-border bg-cream/40 text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {i < currentStep ? <Check size={14} /> : i}
                  </button>
                  <span className="hidden md:block text-[10px] text-eyebrow mt-2 text-center opacity-60 max-w-[80px] truncate">
                    {s.title}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`absolute top-4 left-[50%] right-[-50%] h-[2px] -z-0 transition-colors duration-300 ${
                        i < currentStep ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Smooth Progress Bar */}
            <div className="w-full bg-border/40 h-[3px] rounded-full overflow-hidden">
              <div
                className="bg-gold h-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Wizard Steps Container */}
        <div
          className="bg-ivory border border-border p-8 md:p-10 shadow-soft animate-reveal min-h-[400px] flex flex-col justify-between"
          key={currentStep}
        >
          {/* Step 0: Welcome / Intro */}
          {currentStep === 0 && (
            <div className="space-y-6 text-center py-10">
              <span className="text-eyebrow text-gold">Ready to list a new masterpiece?</span>
              <h2 className="font-display text-5xl md:text-6xl text-primary">
                Let's craft the listing together.
              </h2>
              <p className="opacity-75 max-w-xl mx-auto text-lg leading-relaxed font-sans">
                Welcome back. Rather than filling out a long form, our wizard will walk you through
                a series of quick questions. You can even click live photos of your creation right
                now.
              </p>
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn-royal btn-royal-hover scale-105"
                >
                  Start Listing <ChevronRight size={14} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Title & Category */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-eyebrow text-gold block mb-2">Question 1 of 6</span>
                <h2 className="font-display text-4xl text-primary mb-6">
                  What is the name of your new creation?
                </h2>
                <label className="text-eyebrow opacity-60 block mb-2">Product Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Royal Red Rose Bouquet — 24 Stems"
                  className="w-full bg-cream border border-border p-4 font-display text-2xl focus:outline-none focus:border-primary transition"
                  autoFocus
                />
              </div>
              <div className="pt-4">
                <label className="text-eyebrow opacity-60 block mb-3">
                  Which category matches it best? *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: c }))}
                      className={`p-4 border text-center font-display text-lg transition-all cursor-pointer ${
                        form.category === c
                          ? "border-primary bg-primary text-ivory font-medium shadow-sm"
                          : "border-border bg-cream/30 hover:border-primary/50 text-foreground/75"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Price & Stock */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <span className="text-eyebrow text-gold block mb-2">Question 2 of 6</span>
              <h2 className="font-display text-4xl text-primary mb-6">
                Let's talk about the listing details & stock.
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-eyebrow opacity-60 block mb-2">Selling Price (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-[50%] -translate-y-[50%] font-display text-2xl opacity-50">
                      ₹
                    </span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="e.g. 2499"
                      className="w-full bg-cream border border-border py-4 pl-10 pr-4 font-display text-2xl focus:outline-none focus:border-primary transition"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-eyebrow opacity-60 block mb-2">
                    Original / MRP Price (₹) <span className="text-xs opacity-50">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-[50%] -translate-y-[50%] font-display text-2xl opacity-50">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.original_price}
                      onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
                      placeholder="Optional — shows crossed-out price"
                      className="w-full bg-cream border border-border py-4 pl-10 pr-4 font-display text-2xl focus:outline-none focus:border-primary transition"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <label className="text-eyebrow opacity-60 block mb-2">
                  How many bundles are currently available in stock? *
                </label>
                <div className="flex items-center gap-3 max-w-[200px]">
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.stock_count}
                    onChange={(e) => setForm((f) => ({ ...f, stock_count: e.target.value }))}
                    className="w-full bg-cream border border-border p-4 text-center font-display text-2xl focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Descriptions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <span className="text-eyebrow text-gold block mb-2">Question 3 of 6</span>
              <h2 className="font-display text-4xl text-primary mb-6">
                Tell us the story of this floral creation.
              </h2>

              <div>
                <label className="text-eyebrow opacity-60 block mb-2">
                  Short Summary <span className="text-xs opacity-50">(Shown on listing cards)</span>
                </label>
                <input
                  value={form.short_description}
                  onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                  placeholder="e.g. A gorgeous luxury arrangement of hand-picked premium red roses."
                  className="w-full bg-cream border border-border p-4 focus:outline-none focus:border-primary transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-eyebrow opacity-60 block mb-2">
                  Detailed Product Description *
                </label>
                <textarea
                  required
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Provide details about the stems, sizing, design inspirations, and simple care tips to help buyers adore it..."
                  className="w-full bg-cream border border-border p-4 focus:outline-none focus:border-primary transition font-sans"
                />
              </div>
            </div>
          )}

          {/* Step 4: Flowers & Tags */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <span className="text-eyebrow text-gold block mb-2">Question 4 of 6</span>
              <h2 className="font-display text-4xl text-primary mb-6">
                What flowers make up this composition?
              </h2>

              <div>
                <label className="text-eyebrow opacity-60 block mb-2">Flowers Included</label>
                <div className="flex gap-2">
                  <input
                    value={flowerInput}
                    onChange={(e) => setFlowerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFlower();
                      }
                    }}
                    placeholder="e.g. Red Rose, Baby's Breath…"
                    className="flex-1 bg-cream border border-border p-3 focus:outline-none focus:border-primary transition"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => addFlower()}
                    className="btn-royal btn-royal-hover px-5"
                  >
                    Add
                  </button>
                </div>

                {/* Popular Flower Suggestions */}
                <div className="mt-3">
                  <span className="text-xs opacity-40 block mb-1">Quick suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_FLOWERS.filter((f) => !form.flowers_included.includes(f))
                      .slice(0, 8)
                      .map((flower) => (
                        <button
                          key={flower}
                          type="button"
                          onClick={() => addFlower(flower)}
                          className="text-[10px] text-eyebrow px-2 py-1 bg-cream hover:bg-champagne border border-border transition-colors cursor-pointer"
                        >
                          + {flower}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {form.flowers_included.map((f) => (
                    <span
                      key={f}
                      className="text-eyebrow px-3 py-1.5 bg-cream border border-border flex items-center gap-2"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((x) => ({
                            ...x,
                            flowers_included: x.flowers_included.filter((v) => v !== f),
                          }))
                        }
                      >
                        <X size={10} className="hover:text-destructive transition" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <label className="text-eyebrow opacity-60 block mb-2">Search Tags</label>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="e.g. romantic, wedding, premium…"
                    className="flex-1 bg-cream border border-border p-3 focus:outline-none focus:border-primary transition"
                  />
                  <button
                    type="button"
                    onClick={() => addTag()}
                    className="btn-royal btn-royal-hover px-5"
                  >
                    Add
                  </button>
                </div>

                {/* Popular Tag Suggestions */}
                <div className="mt-3">
                  <span className="text-xs opacity-40 block mb-1">Quick tag suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_TAGS.filter((t) => !form.tags.includes(t))
                      .slice(0, 8)
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="text-[10px] text-eyebrow px-2 py-1 bg-cream hover:bg-champagne border border-border transition-colors cursor-pointer"
                        >
                          # {tag}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="text-eyebrow px-3 py-1.5 bg-cream border border-border flex items-center gap-2"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((x) => ({ ...x, tags: x.tags.filter((v) => v !== t) }))
                        }
                      >
                        <X size={10} className="hover:text-destructive transition" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Images & Click Picture */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <span className="text-eyebrow text-gold block mb-2">Question 5 of 6</span>
              <h2 className="font-display text-4xl text-primary mb-6">
                Let's capture this creation's design.
              </h2>

              <div className="grid gap-6 md:grid-cols-12">
                {/* Image Snapping / Upload Options */}
                <div className="md:col-span-12 space-y-4">
                  {cameraActive ? (
                    <div className="border border-border p-4 bg-cream flex flex-col items-center">
                      <div className="relative aspect-video w-full max-w-[500px] bg-black border border-primary/20 overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute top-2 left-2 bg-primary text-ivory text-[10px] text-eyebrow px-2 py-1 flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                          Live Stream
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="btn-royal btn-royal-hover flex items-center gap-2"
                        >
                          <Camera size={14} /> Capture Photo
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="text-eyebrow border border-border px-5 py-3 hover:bg-ivory transition"
                        >
                          Turn Off Camera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="btn-royal btn-royal-hover flex items-center gap-2 flex-1 min-w-[200px]"
                      >
                        <Camera size={16} /> Click the picture (Snap Live)
                      </button>

                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-eyebrow border border-border px-6 py-4 hover:bg-cream transition flex items-center justify-center gap-2 flex-1 min-w-[200px]"
                      >
                        <Upload size={16} className="opacity-60" /> Upload Files Instead
                      </button>
                    </div>
                  )}

                  {/* Fallback drag and drop area if not camera view */}
                  {!cameraActive && (
                    <div
                      className="border border-dashed border-border p-8 text-center cursor-pointer hover:border-primary/60 transition bg-cream/30"
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleImages(e.dataTransfer.files);
                      }}
                    >
                      <ImagePlus size={24} className="mx-auto opacity-30 mb-2" />
                      <p className="text-eyebrow opacity-60 text-xs">
                        Drag & drop files here to upload
                      </p>
                      <p className="text-[10px] opacity-40 mt-1">
                        Supports JPG, PNG, WebP up to 8 images total
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => handleImages(e.target.files)}
                      />
                    </div>
                  )}

                  {cameraError && (
                    <div className="bg-destructive/5 border border-destructive/20 p-4 text-xs text-destructive flex items-center gap-3">
                      <AlertTriangle size={16} />
                      <div>{cameraError}</div>
                    </div>
                  )}
                </div>

                {/* Previews and snapped list */}
                <div className="md:col-span-12">
                  <h3 className="text-eyebrow opacity-60 mb-3 block">
                    Added Images ({imagePreviews.length} / 8)
                  </h3>
                  {imagePreviews.length === 0 ? (
                    <div className="text-center py-10 border border-border border-dashed opacity-50">
                      <p className="text-sm">No pictures added yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {imagePreviews.map((src, i) => (
                        <div
                          key={i}
                          className="relative group aspect-square border border-border overflow-hidden bg-cream"
                        >
                          <img
                            src={src}
                            alt={`Preview ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {i === 0 && (
                            <div
                              className="absolute top-1 left-1 text-[9px] text-eyebrow px-1.5 py-0.5 font-bold"
                              style={{ background: "var(--gold)", color: "var(--forest)" }}
                            >
                              Cover
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 bg-destructive text-ivory rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {imagePreviews.length < 8 && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="aspect-square border border-dashed border-border flex items-center justify-center hover:border-primary/60 transition bg-cream/20 cursor-pointer"
                        >
                          <Plus size={20} className="opacity-40" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Review & Publish */}
          {currentStep === 6 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <span className="text-eyebrow text-gold block mb-2">Final Step</span>
              <h2 className="font-display text-4xl text-primary mb-6">Review & publish.</h2>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Details summary */}
                <div className="border border-border p-6 space-y-4 bg-cream/40">
                  <h3 className="font-display text-2xl text-primary border-b border-border/60 pb-2">
                    Product Summary
                  </h3>

                  <div>
                    <span className="text-[10px] text-eyebrow opacity-50 block">Name</span>
                    <p className="font-display text-xl">{form.title}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-eyebrow opacity-50 block">Category</span>
                      <p className="font-semibold">{form.category}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-eyebrow opacity-50 block">Stock Count</span>
                      <p className="font-semibold">{form.stock_count} units</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-eyebrow opacity-50 block">
                        Selling Price
                      </span>
                      <p className="font-display text-lg text-primary font-bold">
                        ₹{Number(form.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-eyebrow opacity-50 block">
                        Original Price
                      </span>
                      <p className="opacity-60 text-sm line-through">
                        {form.original_price
                          ? `₹${Number(form.original_price).toLocaleString("en-IN")}`
                          : "Not Set"}
                      </p>
                    </div>
                  </div>

                  {form.short_description && (
                    <div>
                      <span className="text-[10px] text-eyebrow opacity-50 block">
                        Short Description
                      </span>
                      <p className="text-xs opacity-85 line-clamp-2">{form.short_description}</p>
                    </div>
                  )}

                  {form.flowers_included.length > 0 && (
                    <div>
                      <span className="text-[10px] text-eyebrow opacity-50 block">Composition</span>
                      <p className="text-xs opacity-75">{form.flowers_included.join(", ")}</p>
                    </div>
                  )}
                </div>

                {/* Visibility Controls */}
                <div className="space-y-6">
                  <div className="border border-border p-6 bg-cream/40 space-y-4">
                    <h3 className="font-display text-2xl text-primary border-b border-border/60 pb-2">
                      Visibility Settings
                    </h3>

                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                          className={`w-12 h-6 rounded-full transition-colors relative ${form.is_published ? "bg-forest" : "bg-border"}`}
                          style={form.is_published ? { background: "var(--forest)" } : {}}
                        >
                          <div
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-ivory shadow transition-transform ${form.is_published ? "translate-x-6" : "translate-x-0.5"}`}
                          />
                        </div>
                        <div>
                          <span className="text-eyebrow text-sm block">
                            {form.is_published ? "Published" : "Draft"}
                          </span>
                          <span className="text-[10px] opacity-50">
                            Should it show up in the live shop?
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer border-t border-border/40 pt-4">
                        <div
                          onClick={() => setForm((f) => ({ ...f, is_featured: !f.is_featured }))}
                          className={`w-12 h-6 rounded-full transition-colors relative ${form.is_featured ? "bg-gold" : "bg-border"}`}
                          style={form.is_featured ? { background: "var(--gold)" } : {}}
                        >
                          <div
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-ivory shadow transition-transform ${form.is_featured ? "translate-x-6" : "translate-x-0.5"}`}
                          />
                        </div>
                        <div>
                          <span className="text-eyebrow text-sm block">
                            {form.is_featured ? "Featured" : "Standard"}
                          </span>
                          <span className="text-[10px] opacity-50">
                            Feature this product in the home display?
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full btn-royal btn-royal-hover disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Uploading Images…
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Finalizing upload…
                        </>
                      ) : (
                        <>
                          <Upload size={14} />{" "}
                          {form.is_published ? "Publish to Boutique" : "Save Draft"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-border/60">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="text-eyebrow border border-border px-6 py-3 hover:bg-cream transition flex items-center gap-2 cursor-pointer"
              >
                <ChevronLeft size={12} /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep > 0 && currentStep < STEPS.length - 1 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext()}
                className="btn-royal btn-royal-hover flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
