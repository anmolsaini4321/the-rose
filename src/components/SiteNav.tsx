import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCart, cartCount, type CartItem } from "@/lib/cart-store";
import {
  Menu,
  X,
  ShoppingBag,
  Shield,
  LogOut,
  Plus,
  MessageSquare,
  Send,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Flower2,
  User,
} from "lucide-react";
import CONFIG from "@/lib/config";

const NAV = [
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
        const hasAdmin = (roleData ?? []).some((r: { role: string }) => r.role === "super_admin");
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

  // Hash state for section active checks
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const isActive = (to: string) => {
    if (to.startsWith("/#")) {
      const targetHash = to.split("#")[1];
      return path === "/" && activeHash === `#${targetHash}`;
    }
    return path === to || (to !== "/" && path.startsWith(to));
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        solid ? "bg-cream/90 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`}
      style={{ color: textOnHero ? "var(--ivory)" : "var(--forest)" }}
    >
      <div className="mx-auto flex xl:grid xl:grid-cols-[1fr_auto_1fr] items-center justify-between max-w-[1600px] px-6 py-4 lg:px-12 flex-nowrap gap-8 xl:gap-12 w-full">
        <div className="flex justify-start flex-shrink-0">
          <Link to="/" className="flex flex-col leading-none">
            <span className="text-eyebrow opacity-80">Est. MMXXIV</span>
            <span className="font-display text-2xl mt-1 whitespace-nowrap">
              The Rose <span className="italic opacity-70">by Geetanjli</span>
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden xl:flex items-center gap-6 xl:gap-8 flex-nowrap whitespace-nowrap justify-self-center">
          {NAV.map((n) => (
            <a
              key={n.to}
              href={n.to}
              className={`text-eyebrow relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 whitespace-nowrap ${
                isActive(n.to) ? "after:scale-x-100 opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden xl:flex items-center gap-8 flex-nowrap whitespace-nowrap justify-self-end">
          {/* Cart */}
          <Link
            to="/cart"
            className={`text-eyebrow relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
              path === "/cart" ? "after:scale-x-100 opacity-100" : "opacity-60 hover:opacity-100"
            }`}
            aria-label="Shopping Cart"
          >
            <span>Cart</span>
            {count > 0 && (
              <span
                className="w-4 h-4 rounded-full text-[0.55rem] flex items-center justify-center font-semibold text-center"
                style={{ background: "var(--burgundy)", color: "var(--ivory)" }}
              >
                {count}
              </span>
            )}
          </Link>

          {/* Super admin badge */}
          {isSuperAdmin && (
            <Link
              to="/admin"
              className={`text-eyebrow relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 whitespace-nowrap flex items-center gap-1.5 ${
                path === "/admin" ? "after:scale-x-100 opacity-100" : "opacity-60 hover:opacity-100"
              }`}
              title="Admin Panel"
            >
              <Shield size={14} />
              <span>Admin</span>
            </Link>
          )}

          {email ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 py-1 px-3 bg-ivory/80 border border-border rounded-full hover:border-forest transition cursor-pointer"
                style={{ color: "var(--forest)" }}
              >
                <div className="w-6 h-6 rounded-full bg-forest text-ivory flex items-center justify-center text-[0.65rem] font-bold uppercase">
                  {(email.split("@")[0] || "U")[0]}
                </div>
                <span className="text-eyebrow text-xs max-w-[110px] truncate font-semibold">
                  {email.split("@")[0]}
                </span>
                <ChevronDown
                  size={12}
                  className={`opacity-60 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-ivory border border-border shadow-[var(--shadow-elegant)] py-2 z-50 animate-in fade-in slide-in-from-top-2"
                  style={{ color: "var(--forest)" }}
                >
                  <div className="px-4 py-2 border-b border-border/40">
                    <p className="text-eyebrow text-[0.6rem] opacity-50">Signed in as</p>
                    <p className="text-xs font-semibold truncate mt-0.5">{email}</p>
                  </div>

                  <Link
                    to="/my-bouquets"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition group/item"
                  >
                    <Flower2
                      size={16}
                      className="text-forest opacity-70 group-hover/item:opacity-100"
                    />
                    <div>
                      <p className="font-display text-sm font-semibold leading-none">My ATELIER</p>
                      <p className="text-[0.65rem] opacity-60 mt-1">
                        View your saved & composed bouquets
                      </p>
                    </div>
                  </Link>

                  <Link
                    to="/orders"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream/60 transition border-t border-border/30"
                  >
                    <ShoppingBag size={14} className="opacity-70" />
                    <span className="text-eyebrow text-xs">My Orders</span>
                  </Link>

                  {isSuperAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream/60 transition border-t border-border/30 text-amber-900"
                    >
                      <Shield size={14} className="opacity-70" />
                      <span className="text-eyebrow text-xs">Super Admin Panel</span>
                    </Link>
                  )}

                  <div className="border-t border-border/40 mt-1 pt-1">
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await supabase.auth.signOut();
                        window.location.reload();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-burgundy hover:bg-burgundy/5 transition text-left cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span className="text-eyebrow">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className={`text-eyebrow relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 whitespace-nowrap ${
                path === "/auth" ? "after:scale-x-100 opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile: cart + hamburger */}
        <div className="xl:hidden flex items-center gap-4 flex-shrink-0">
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
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu" className="cursor-pointer">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="xl:hidden bg-cream border-t border-border"
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
              <Link to="/my-bouquets" onClick={() => setOpen(false)} className="text-eyebrow py-2">
                My Atelier
              </Link>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="text-eyebrow py-2">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

type Lang = "en" | "hi" | "fr" | "hinglish" | "punjabi";

const CHAT_DICTIONARY = {
  en: {
    welcome: "Hello, welcome to The Rose by Geetanjli. How can I assist you today?",
    chipNew: "🌸 What's newly added?",
    chipStock: "📦 Check availability",
    chipDesign: "🎨 Design custom bouquet",
    chipDelivery: "🚚 Delivery & Shipping info",
    promptProduct: "Please type the name of the bouquet you're looking for:",
    checking: "Checking availability...",
    inStock: (name: string, price: number, qty: number) =>
      `✨ Good news! "${name}" is available for ₹${price.toLocaleString("en-IN")}. We have ${qty} items left in stock.`,
    outOfStock: (name: string) => `😔 Apologies, "${name}" is currently out of stock.`,
    notFound: (term: string) =>
      `Could not find a product matching "${term}". Try searching for 'Rose'.`,
    builderResponse:
      "You can design and customize your own luxurious bouquet using our interactive builder. Select wrappers, ribbons, and flowers to match your exact taste!",
    deliveryResponse:
      "We offer free delivery for orders above ₹1,000. Standard delivery times range from 2 to 5 business days.",
    placeholder: "Ask about new products, stock, custom design...",
    linkBuilder: "Open Bouquet Designer",
    shopNow: "Shop Now",
  },
  hi: {
    welcome: "नमस्ते, 'द रोज़' में आपका स्वागत है। आज मैं आपकी क्या सहायता कर सकता हूँ?",
    chipNew: "🌸 नया क्या है?",
    chipStock: "📦 स्टॉक की जांच करें",
    chipDesign: "🎨 गुलदस्ता खुद डिज़ाइन करें",
    chipDelivery: "🚚 डिलीवरी की जानकारी",
    promptProduct: "कृपया उस गुलदस्ते का नाम लिखें जिसे आप ढूंढ रहे हैं:",
    checking: "जांच की जा रही है...",
    inStock: (name: string, price: number, qty: number) =>
      `✨ खुशखबरी! "${name}" उपलब्ध है। मूल्य: ₹${price.toLocaleString("en-IN")}। केवल ${qty} पीस बचे हैं।`,
    outOfStock: (name: string) => `😔 क्षमा करें, "${name}" अभी स्टॉक में नहीं है।`,
    notFound: (term: string) => `"${term}" नाम का कोई गुलदस्ता नहीं मिला।`,
    builderResponse:
      "आप हमारे इंटरैक्टिव बिल्डर का उपयोग करके अपना खुद का गुलदस्ता डिज़ाइन कर सकते हैं। अपनी पसंद के रैपर, रिबन और फूल चुनें!",
    deliveryResponse:
      "₹1,000 से अधिक के आर्डर पर मुफ्त डिलीवरी उपलब्ध है। मानक डिलीवरी समय 2 से 5 कार्य दिवस है।",
    placeholder: "नए उत्पाद, स्टॉक या डिलीवरी के बारे में पूछें...",
    linkBuilder: "डिजाइनर खोलें",
    shopNow: "अभी खरीदें",
  },
  fr: {
    welcome: "Bonjour et bienvenue à L'Atelier The Rose. Comment puis-je vous aider aujourd'hui?",
    chipNew: "🌸 Nouveautés",
    chipStock: "📦 Vérifier la disponibilité",
    chipDesign: "🎨 Créer un bouquet sur mesure",
    chipDelivery: "🚚 Livraison & Expédition",
    promptProduct: "Veuillez saisir le nom du bouquet que vous recherchez:",
    checking: "Vérification...",
    inStock: (name: string, price: number, qty: number) =>
      `✨ Excellente nouvelle! "${name}" est disponible au prix de ₹${price.toLocaleString("en-IN")}. Il reste ${qty} articles en stock.`,
    outOfStock: (name: string) => `😔 Désolé, "${name}" est en rupture de stock.`,
    notFound: (term: string) => `Aucun produit correspondant à "${term}" n'a été trouvé.`,
    builderResponse:
      "Vous pouvez concevoir votre propre bouquet luxueux avec notre configurateur interactif. Choisissez vos fleurs, emballages et rubans!",
    deliveryResponse:
      "La livraison est gratuite pour toute commande supérieure à ₹1 000. Le délai de livraison standard est de 2 à 5 jours ouvrés.",
    placeholder: "Posez vos questions...",
    linkBuilder: "Ouvrir le configurateur",
    shopNow: "Acheter",
  },
  hinglish: {
    welcome: "Hello, welcome to The Rose by Geetanjli. Aaj mai aapki kya help kar sakta hu?",
    chipNew: "🌸 Naya kya hai?",
    chipStock: "📦 Stock check kare",
    chipDesign: "🎨 Custom bouquet design kare",
    chipDelivery: "🚚 Delivery & Shipping info",
    promptProduct: "Aap jis bouquet ko dhoondh rahe hai uska naam likhiye:",
    checking: "Check kiya ja raha hai...",
    inStock: (name: string, price: number, qty: number) =>
      `✨ Good news! "${name}" available hai, price ₹${price.toLocaleString("en-IN")} hai. Hamare paas ${qty} items stock me bache hai.`,
    outOfStock: (name: string) => `😔 Sorry, "${name}" abhi out of stock hai.`,
    notFound: (term: string) =>
      `Humhe "${term}" matching product nahi mila. Ek baar 'Rose' search karke dekhe.`,
    builderResponse:
      "Aap hamare interactive builder se apna custom luxury bouquet design kar sakte hai. Apne choice ke wrappers, ribbons, aur flowers select kare!",
    deliveryResponse:
      "₹1,000 se upar ke orders par free delivery milegi. Delivery me 2 se 5 business days ka time lagta hai.",
    placeholder: "New products, stock, custom design ke baare me puche...",
    linkBuilder: "Designer Open Kare",
    shopNow: "Shop Now",
  },
  punjabi: {
    welcome: "Sat Sri Akal, welcome to The Rose by Geetanjli. Main tuhadi ki help kar sakda han?",
    chipNew: "🌸 Nawan ki hai?",
    chipStock: "📦 Stock check karo",
    chipDesign: "🎨 Custom bouquet design karo",
    chipDelivery: "🚚 Delivery di jaankari",
    promptProduct: "Tusi jis bouquet nu labh rahe ho, usda naam likho:",
    checking: "Check kita ja raha hai...",
    inStock: (name: string, price: number, qty: number) =>
      `✨ Vadhiya khabar! "${name}" mil jaega, price ₹${price.toLocaleString("en-IN")} hai. Sade kol ${qty} items stock vich bache han.`,
    outOfStock: (name: string) => `😔 Maaf karna, "${name}" hale stock vich nahi hai.`,
    notFound: (term: string) =>
      `Sanu "${term}" naal da koi product nahi milya. Ek vaar 'Rose' likh ke check karo.`,
    builderResponse:
      "Tusi sade interactive builder di madad naal apna custom luxury bouquet design kar sakde ho. Apne pasand de flowers, wrapping te ribbon select karo!",
    deliveryResponse:
      "₹1,000 to vadh de orders te free delivery milegi. Delivery vich 2 to 5 business days da time lagta hai.",
    placeholder: "Nawan products, stock, design de bare vich pucho...",
    linkBuilder: "Designer Open Karo",
    shopNow: "Buy Now",
  },
};
const detectLanguage = (text: string): Lang => {
  const raw = text.toLowerCase();

  // 1. Check for Punjabi Gurmukhi characters
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return "punjabi";
  }

  // 2. Check for Hindi Devanagari characters
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }

  // 3. Check for French keywords
  const frenchKeywords = [
    "bonjour",
    "merci",
    "livraison",
    "frais",
    "nouveautés",
    "chercher",
    "sil vous plait",
    "s'il",
    "sante",
    "bouquet",
    "cher",
    "tous",
    "ouvrir",
    "configurateur",
    "comment",
    "combien",
    "acheter",
  ];
  if (frenchKeywords.some((k) => raw.includes(k))) {
    return "fr";
  }

  // 4. Check for Punjabi Roman keywords
  const punjabiKeywords = [
    "ki haal",
    "dasso",
    "vaddiya",
    "vich",
    "daso",
    "dikhayeo",
    "nawan",
    "guldaste",
    "khareedna",
    "kathe",
    "sat sri akal",
    "karo",
    "punjabi",
  ];
  if (punjabiKeywords.some((k) => raw.includes(k))) {
    return "punjabi";
  }

  // 5. Check for Hinglish keywords
  const hinglishKeywords = [
    "sasta",
    "mahanga",
    "kitna",
    "kitne",
    "hai",
    "kya",
    "bhai",
    "kare",
    "dikhao",
    "dikhaye",
    "dhoondh",
    "pass",
    "aapke",
    "milega",
    "kab",
    "ko",
    "saare",
    "sare",
    "sabse",
    "konsa",
    "apne",
    "batao",
    "naam",
    "guldasta",
    "bataen",
    "bataiye",
    "chahiye",
    "price",
    "dikhaiye",
    "tokri",
    "dabba",
    "kharidna",
    "kharid",
  ];
  if (hinglishKeywords.some((k) => raw.includes(k))) {
    return "hinglish";
  }

  return "en";
};

export function FloatingActions() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [expanded, setExpanded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLang, setChatLang] = useState<Lang>("en");
  const [chatMessages, setChatMessages] = useState<
    {
      role: "bot" | "user";
      content: string;
      products?: any[];
      customLink?: { to: string; label: string };
    }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [awaitingProductSearch, setAwaitingProductSearch] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [lastShownProductId, setLastShownProductId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const t = CHAT_DICTIONARY[chatLang];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsLoggedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Hydrate chat from localStorage on mount (with 10-minute expiry)
  useEffect(() => {
    const saved = localStorage.getItem("rose_chat_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        if (now - parsed.timestamp < 10 * 60 * 1000) {
          if (parsed.messages && parsed.messages.length > 0) {
            setChatMessages(parsed.messages);
          }
          if (parsed.lang) {
            setChatLang(parsed.lang);
          }
          if (parsed.lastShownProductId) {
            setLastShownProductId(parsed.lastShownProductId);
          }
          return;
        } else {
          localStorage.removeItem("rose_chat_session");
        }
      } catch (e) {
        console.error("Error parsing chat session", e);
      }
    }
    setChatMessages([{ role: "bot", content: CHAT_DICTIONARY[chatLang].welcome }]);
  }, []);

  // Persist chat session to localStorage
  useEffect(() => {
    if (chatMessages.length > 0) {
      const session = {
        messages: chatMessages,
        lang: chatLang,
        lastShownProductId,
        timestamp: Date.now(),
      };
      localStorage.setItem("rose_chat_session", JSON.stringify(session));
    }
  }, [chatMessages, chatLang, lastShownProductId]);

  // Initialize/reset chat welcome message when language changes (only if no active history)
  useEffect(() => {
    if (chatMessages.length <= 1) {
      setChatMessages([{ role: "bot", content: CHAT_DICTIONARY[chatLang].welcome }]);
    }
  }, [chatLang]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  const handleToggleChat = (open: boolean) => {
    if (open) {
      const saved = localStorage.getItem("rose_chat_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Date.now() - parsed.timestamp >= 10 * 60 * 1000) {
            localStorage.removeItem("rose_chat_session");
            setChatMessages([{ role: "bot", content: CHAT_DICTIONARY[chatLang].welcome }]);
            setLastShownProductId(null);
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    setChatOpen(open);
  };

  // Handle Intent Routing
  const handleUserIntent = async (text: string, currentLang: Lang = chatLang) => {
    const raw = text.toLowerCase().trim();
    const dict = CHAT_DICTIONARY[currentLang];

    // 1. User response for live product search
    if (awaitingProductSearch) {
      setAwaitingProductSearch(false);
      setChatLoading(true);

      const { data } = await supabase
        .from("products")
        .select("id, title, price, stock_count")
        .eq("is_published", true)
        .ilike("title", `%${raw}%`)
        .limit(2);

      setChatLoading(false);
      if (data && data.length > 0) {
        const prod = data[0];
        setLastShownProductId(prod.id);
        if (prod.stock_count > 0) {
          setChatMessages((prev) => [
            ...prev,
            { role: "bot", content: dict.inStock(prod.title, prod.price, prod.stock_count) },
          ]);
        } else {
          setChatMessages((prev) => [
            ...prev,
            { role: "bot", content: dict.outOfStock(prod.title) },
          ]);
        }
      } else {
        setChatMessages((prev) => [...prev, { role: "bot", content: dict.notFound(text) }]);
      }
      return;
    }

    // Standard Router Match
    const isCheapest = [
      "cheap",
      "sasta",
      "low price",
      "kam price",
      "lowest",
      "min price",
      "moins cher",
      "kam daam",
      "ਸਸਤਾ",
      "sast",
    ].some((k) => raw.includes(k));
    const isExpensive = [
      "expensive",
      "mahanga",
      "high price",
      "costly",
      "premium",
      "highest",
      "max price",
      "plus cher",
      "ਮਹਿੰਗਾ",
      "mahng",
    ].some((k) => raw.includes(k));
    const isShowAll = [
      "all",
      "saare",
      "sare",
      "sab",
      "list",
      "catalog",
      "everything",
      "collection",
      "tous",
      "show",
      "ਸਭ",
      "ਸਾਰੇ",
    ].some((k) => raw.includes(k) && !raw.includes("sasta") && !raw.includes("mahanga"));
    const isNewest = [
      "new",
      "latest",
      "recent",
      "fresh",
      "नया",
      "ताज़ा",
      "nouveau",
      "nouveautés",
      "naya",
      "nayi",
      "newest",
      "ਨਵਾਂ",
      "nawan",
    ].some((k) => raw.includes(k));
    const isStock = [
      "stock",
      "avail",
      "buy",
      "ਸਟਾਕ",
      "ਉਪਲਬਧ",
      "ਸਟੋਕ",
      "dispo",
      "vendre",
      "kitna",
      "kitne",
      "hai",
      "milega",
      "items",
    ].some((k) => raw.includes(k));
    const isDesign = [
      "design",
      "build",
      "create",
      "custom",
      "ਬਣਾਨਾ",
      "ਗੁਲਦਸਤਾ",
      "ਬਣਾਉਣਾ",
      "personaliser",
      "créer",
      "banaye",
      "banaen",
      "config",
      "configurator",
    ].some((k) => raw.includes(k));
    const isDelivery = [
      "deliv",
      "ship",
      "pincode",
      "charge",
      "ਡਿਲੀਵਰੀ",
      "livraison",
      "frais",
      "kab",
      "charges",
      "pahunchega",
      "delivery",
    ].some((k) => raw.includes(k));
    const isCraft = [
      "craft",
      "steps",
      "making",
      "how to make",
      "kaise banate",
      "tying",
      "seven hands",
      "ਕਿਵੇਂ",
    ].some((k) => raw.includes(k));
    const isPhilosophy = [
      "philosophy",
      "founder",
      "geetanjli",
      "owner",
      "about",
      "history",
      "story",
      "ਬਾਰੇ",
    ].some((k) => raw.includes(k));
    const isReview = [
      "review",
      "testimonial",
      "rating",
      "customer says",
      "feedbacks",
      "feedback",
    ].some((k) => raw.includes(k));
    const isOccasion = [
      "occasion",
      "event",
      "wedding",
      "proposal",
      "birthday",
      "anniversary",
      "mother's",
    ].some((k) => raw.includes(k));

    // Website Related Questions
    const isCartIntent = [
      "cart",
      "tokri",
      "dabba",
      "basket",
      "bag",
      "checkout",
      "ਕਾਰਟ",
      "ਝੋਲਾ",
    ].some((k) => raw.includes(k));
    const isAuthIntent = [
      "signin",
      "login",
      "register",
      "auth",
      "account",
      "ਸਾਈਨ ਇਨ",
      "ਲੌਗਇਨ",
      "khata",
      "create account",
      "sign in",
      "log in",
    ].some((k) => raw.includes(k) && !raw.includes("out"));
    const isLogoutIntent = ["logout", "signout", "ਲੌਗਆਊਟ", "ਸਾਈਨ ਆਊਟ", "sign out", "log out"].some(
      (k) => raw.includes(k),
    );
    const isShopIntent = [
      "shop",
      "browse",
      "store",
      "buy flowers",
      "ਦੁਕਾਨ",
      "collection page",
      "product page",
    ].some((k) => raw.includes(k) && !raw.includes("cart") && !raw.includes("add"));
    const isAddToCartHelp = [
      "add to cart",
      "cart me kaise",
      "how to add",
      "how to buy",
      "ਖਰੀਦੋ",
      "add kaise",
      "buying",
      "purchase",
    ].some((k) => raw.includes(k));

    // Buy/Checkout action context shortcut
    const isActioningLastProduct =
      ["buy", "order", "purchase", "kharid", "checkout", "lelo", "chahiye", "shop"].some((k) =>
        raw.includes(k),
      ) && lastShownProductId;

    if (isActioningLastProduct) {
      setChatLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, title")
        .eq("id", lastShownProductId)
        .maybeSingle();
      setChatLoading(false);

      if (data) {
        const msg =
          currentLang === "en"
            ? `You can view details and order "${data.title}" here:`
            : currentLang === "hinglish"
              ? `Aap "${data.title}" ki details dekh kar yahan se order kar sakte hain:`
              : currentLang === "hi"
                ? `आप "${data.title}" की जानकारी देखकर यहाँ से आर्डर कर सकते हैं:`
                : currentLang === "punjabi"
                  ? `Tusi "${data.title}" di jaankari dekh ke etho order kar sakde ho:`
                  : `Vous pouvez commander "${data.title}" ici:`;

        setChatMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: msg,
            customLink: { to: `/product/${data.id}`, label: dict.shopNow },
          },
        ]);
      }
      return;
    }

    // Navigation Intents
    if (isCartIntent) {
      const msg =
        currentLang === "en"
          ? "You can view your selected bouquets and checkout on your Cart page here:"
          : currentLang === "hinglish"
            ? "Aap apne selected bouquets ko dekhne aur checkout karne ke liye Cart page yahan se open kar sakte hain:"
            : currentLang === "hi"
              ? "आप अपने चुने हुए गुलदस्ते देखने और ऑर्डर पूरा करने के लिए कार्ट पेज यहाँ से खोल सकते हैं:"
              : currentLang === "punjabi"
                ? "Tusi apne chune hue bouquets dekhn te checkout karan lyi Cart page etho open kar sakde ho:"
                : "Vous pouvez voir vos bouquets sélectionnés et passer commande dans votre panier ici:";

      const lbl =
        currentLang === "en"
          ? "Open Cart"
          : currentLang === "hinglish"
            ? "Cart Open Kare"
            : currentLang === "hi"
              ? "कार्ट खोलें"
              : currentLang === "punjabi"
                ? "Cart Open Karo"
                : "Panier";

      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: msg,
          customLink: { to: "/cart", label: lbl },
        },
      ]);
      return;
    }

    if (isAuthIntent) {
      const msg =
        currentLang === "en"
          ? "You can sign in or create an account at our Authentication portal here:"
          : currentLang === "hinglish"
            ? "Aap account me sign in karne ke liye Auth portal yahan se open kar sakte hain:"
            : currentLang === "hi"
              ? "आप अपने खाते में लॉग इन करने के लिए ऑथेंटिकेशन पोर्टल यहाँ से खोल सकते हैं:"
              : currentLang === "punjabi"
                ? "Tusi account vich sign in karan lyi Auth portal etho open kar sakde ho:"
                : "Vous pouvez vous connecter ou créer un compte sur notre portail d'authentification ici:";

      const lbl =
        currentLang === "en"
          ? "Sign In"
          : currentLang === "hinglish"
            ? "Sign In Kare"
            : currentLang === "hi"
              ? "लॉग इन"
              : currentLang === "punjabi"
                ? "Sign In"
                : "Se Connecter";

      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: msg,
          customLink: { to: "/auth", label: lbl },
        },
      ]);
      return;
    }

    if (isLogoutIntent) {
      const msg =
        currentLang === "en"
          ? "To sign out of your account, click the Plus button in the bottom-left corner of the page and select the red Logout button."
          : currentLang === "hinglish"
            ? "Account se logout karne ke liye, page ke bottom-left corner me diye gaye Plus button par click kare aur red Logout button select kare."
            : currentLang === "hi"
              ? "अपने खाते से लॉग आउट करने के लिए, पेज के निचले-बाएँ कोने में दिए गए प्लस बटन पर क्लिक करें और लाल लॉग आउट बटन चुनें।"
              : currentLang === "punjabi"
                ? "Account cho logout karan lyi, page de bottom-left corner vich ditte Plus button te click karo te red Logout button select karo."
                : "Pour vous déconnecter, cliquez sur le bouton Plus dans le coin inférieur gauche et sélectionnez le bouton rouge de Déconnexion.";

      setChatMessages((prev) => [...prev, { role: "bot", content: msg }]);
      return;
    }

    if (isShopIntent) {
      const msg =
        currentLang === "en"
          ? "Browse our complete collection of fresh flower bouquets at the shop here:"
          : currentLang === "hinglish"
            ? "Aap hamari fresh flower collections browse karne ke liye shop yahan se check kar sakte hain:"
            : currentLang === "hi"
              ? "आप हमारे ताज़े गुलदस्तों को यहाँ से ब्राउज़ कर सकते हैं:"
              : currentLang === "punjabi"
                ? "Sade fresh bouquets browse karan lyi shop etho check karo:"
                : "Découvrez notre collection de bouquets de fleurs fraîches ici:";

      const lbl =
        currentLang === "en"
          ? "Go to Shop"
          : currentLang === "hinglish"
            ? "Shop Open Kare"
            : currentLang === "hi"
              ? "शॉप खोलें"
              : currentLang === "punjabi"
                ? "Shop Open Karo"
                : "Boutique";

      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: msg,
          customLink: { to: "/shop", label: lbl },
        },
      ]);
      return;
    }

    if (isAddToCartHelp) {
      const msg =
        currentLang === "en"
          ? "To add items to your cart, browse the Shop, open a product's page, select the quantity you want, and click 'Add to Cart'."
          : currentLang === "hinglish"
            ? "Cart me items add karne ke liye, Shop page par jayein, kisi product ko select karein, quantity chunein aur 'Add to Cart' button par click karein."
            : currentLang === "hi"
              ? "कार्ट में आइटम जोड़ने के लिए, शॉप पेज पर जाएं, किसी उत्पाद को चुनें, मात्रा का चयन करें और 'कार्ट में जोड़ें' बटन पर क्लिक करें।"
              : currentLang === "punjabi"
                ? "Cart vich items add karan lyi, Shop page te jao, koi product select karo, quantity chuno te 'Add to Cart' button te click karo."
                : "Pour ajouter des articles à votre panier, parcourez la boutique, ouvrez la page d'un produit, sélectionnez la quantité et cliquez sur 'Ajouter au panier'.";

      setChatMessages((prev) => [...prev, { role: "bot", content: msg }]);
      return;
    }

    if (isCheapest) {
      setChatLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, title, price, stock_count")
        .eq("is_published", true)
        .order("price", { ascending: true })
        .limit(1);
      setChatLoading(false);

      if (data && data.length > 0) {
        const prod = data[0];
        setLastShownProductId(prod.id);
        const msg =
          currentLang === "en"
            ? `Our most affordable bouquet is "${prod.title}" priced at ₹${prod.price.toLocaleString("en-IN")}.`
            : currentLang === "hinglish"
              ? `Hamare paas sabse sasta bouquet "${prod.title}" hai, jiski price ₹${prod.price.toLocaleString("en-IN")} hai.`
              : currentLang === "hi"
                ? `हमारे पास सबसे सस्ता गुलदस्ता "${prod.title}" है, जिसकी कीमत ₹${prod.price.toLocaleString("en-IN")} है।`
                : currentLang === "punjabi"
                  ? `Sada sab to sasta bouquet "${prod.title}" hai, jisdi price ₹${prod.price.toLocaleString("en-IN")} hai.`
                  : `Notre bouquet le plus abordable est "${prod.title}" au prix de ₹${prod.price.toLocaleString("en-IN")}.`;

        setChatMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: msg,
            products: [prod],
          },
        ]);
      }
      return;
    }

    if (isExpensive) {
      setChatLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, title, price, stock_count")
        .eq("is_published", true)
        .order("price", { ascending: false })
        .limit(1);
      setChatLoading(false);

      if (data && data.length > 0) {
        const prod = data[0];
        setLastShownProductId(prod.id);
        const msg =
          currentLang === "en"
            ? `Our most premium arrangement is "${prod.title}" priced at ₹${prod.price.toLocaleString("en-IN")}.`
            : currentLang === "hinglish"
              ? `Hamare paas sabse premium bouquet "${prod.title}" hai, jiski price ₹${prod.price.toLocaleString("en-IN")} hai.`
              : currentLang === "hi"
                ? `हमारे पास सबसे प्रीमियम गुलदस्ता "${prod.title}" है, जिसकी कीमत ₹${prod.price.toLocaleString("en-IN")} है।`
                : currentLang === "punjabi"
                  ? `Sada sab to premium bouquet "${prod.title}" hai, jisdi price ₹${prod.price.toLocaleString("en-IN")} hai.`
                  : `Notre bouquet le plus haut de gamme est "${prod.title}" au prix de ₹${prod.price.toLocaleString("en-IN")}.`;

        setChatMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: msg,
            products: [prod],
          },
        ]);
      }
      return;
    }

    // Context-aware stock check: if checking stock and a product was recently shown
    if (isStock && lastShownProductId) {
      setChatLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, title, price, stock_count")
        .eq("id", lastShownProductId)
        .maybeSingle();
      setChatLoading(false);

      if (data) {
        if (data.stock_count > 0) {
          setChatMessages((prev) => [
            ...prev,
            { role: "bot", content: dict.inStock(data.title, data.price, data.stock_count) },
          ]);
        } else {
          setChatMessages((prev) => [
            ...prev,
            { role: "bot", content: dict.outOfStock(data.title) },
          ]);
        }
      }
      return;
    }

    if (isShowAll) {
      setChatLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, title, price, stock_count")
        .eq("is_published", true)
        .limit(6);
      setChatLoading(false);

      if (data && data.length > 0) {
        setLastShownProductId(data[0].id);
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            currentLang === "en"
              ? "Here is our full collection of fresh flower bouquets:"
              : currentLang === "hinglish"
                ? "Ye hamari full fresh flower bouquets ki collection hai:"
                : currentLang === "hi"
                  ? "यह हमारे ताजे फूलों के गुलदस्तों का पूरा संग्रह है:"
                  : currentLang === "punjabi"
                    ? "Eh sade fresh flower bouquets di full collection hai:"
                    : "Voici notre collection complète de bouquets de fleurs fraîches:",
          products: data ?? [],
        },
      ]);
    } else if (isNewest) {
      setChatLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, title, price, stock_count")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);
      setChatLoading(false);

      if (data && data.length > 0) {
        setLastShownProductId(data[0].id);
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            currentLang === "en"
              ? "Here are our newest additions at the atelier:"
              : currentLang === "hi"
                ? "यहां हमारे नए गुलदस्ते दिए गए हैं:"
                : currentLang === "hinglish"
                  ? "Ye hamare newest additions hai catalog me:"
                  : currentLang === "punjabi"
                    ? "Sade kol naye aaye bouquets:"
                    : "Voici nos nouveautés:",
          products: data ?? [],
        },
      ]);
    } else if (isStock) {
      setChatMessages((prev) => [...prev, { role: "bot", content: dict.promptProduct }]);
      setAwaitingProductSearch(true);
    } else if (isDesign) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: dict.builderResponse,
          customLink: { to: "/builder", label: dict.linkBuilder },
        },
      ]);
    } else if (isDelivery) {
      setChatMessages((prev) => [...prev, { role: "bot", content: dict.deliveryResponse }]);
    } else if (isCraft) {
      const msg =
        currentLang === "en"
          ? "The Craft of The Rose involves 6 steps by 7 hands:\n1. Dawn selection of fresh flowers\n2. Hand-tying from memory\n3. Pure silk or velvet ribbons\n4. Wax-sealed envelopes\n5. Velvet or ivory cases\n6. Gentle local delivery in Faridabad."
          : currentLang === "hinglish"
            ? "The Rose me bouquet 6 step process se bante hai:\n1. Dawn selection (fresh flowers select karna)\n2. Hand-tying by memory\n3. Silk ya velvet ribbon wrap karna\n4. Wax-sealed correspondence note\n5. Premium velvet/ivory case presentation\n6. Gentle local delivery."
            : currentLang === "punjabi"
              ? "The Rose vich bouquet 6 step process se bante hai:\n1. Dawn selection (svere fresh flowers pick karna)\n2. Hand-tying from memory\n3. Silk ya velvet ribbon wrap karna\n4. Wax-sealed correspondence note\n5. Premium velvet/ivory case presentation\n6. Gentle local delivery."
              : "गुलदस्ते बनाने की विधि: सुबह-सुबह ताजे फूलों का चयन, यादों के सहारे बांधना, रेशम या मखमली रिबन, मोम-मुहरबंद लिफाफे, मखमली प्रस्तुति, और डिलीवरी।";
      setChatMessages((prev) => [...prev, { role: "bot", content: msg }]);
    } else if (isPhilosophy) {
      const msg =
        currentLang === "en"
          ? "Founded by Geetanjli, The Rose is Faridabad's premier luxury florist devoted to fresh flowers, handcrafted rose arrangements, and reliable same-day delivery."
          : currentLang === "hinglish"
            ? "The Rose by Geetanjli ko Geetanjli ne start kiya hai. Ye Faridabad ki premier luxury flower boutique hai jo fresh roses, hand-tied arrangements aur fast delivery provide karti hai."
            : currentLang === "punjabi"
              ? "The Rose by Geetanjli nu Geetanjli ne start kita hai. Eh Faridabad di premier luxury flower boutique hai jo fresh roses, hand-tied arrangements te fast delivery provide kardi hai."
              : "गीतांजलि द्वारा स्थापित 'द रोज़' फरीदाबाद का प्रमुख लक्जरी फ्लोरिस्ट है, जो ताजे फूलों और विश्वसनीय डिलीवरी के प्रति समर्पित है।";
      setChatMessages((prev) => [...prev, { role: "bot", content: msg }]);
    } else if (isReview) {
      const msg =
        currentLang === "en"
          ? "Ananya M. from Faridabad says: 'It arrived like an heirloom. Everything Geetanjli touches becomes a memory.' Rhea & Vikram say: 'The bouquets held our wedding together!'"
          : currentLang === "hinglish"
            ? "Customer Ananya M. kehte hai: 'It arrived like an heirloom. Everything Geetanjli touches becomes a memory.' Wedding customers Rhea & Vikram kehte hai: 'Bouquets held our wedding together!'"
            : currentLang === "punjabi"
              ? "Customer Ananya M. kehndi hai: 'It arrived like an heirloom. Everything Geetanjli touches becomes a memory.' Wedding customers Rhea & Vikram kehnde han: 'Bouquets held our wedding together!'"
              : "अनन्या एम. कहती हैं: 'यह एक विरासत की तरह आया। मेरे आंसू निकल आए।' रिया और विक्रम कहते हैं: 'गुलदस्तों ने हमारी शादी को खूबसूरत बना दिया। हर किसी ने याद रखा।'";
      setChatMessages((prev) => [...prev, { role: "bot", content: msg }]);
    } else if (isOccasion) {
      const msg =
        currentLang === "en"
          ? "We compose signature rose arrangements for Weddings, Proposals, Birthdays, Anniversaries, Mother's Day, and Corporate gestures."
          : currentLang === "hinglish"
            ? "Hum in events ke liye custom rose arrangements banate hai: Weddings, Proposals, Birthdays, Anniversaries, Mother's Day, aur Corporate events."
            : "हम शादियों, प्रस्तावों, जन्मदिनों, वर्षगांठों, मातृ दिवस, और कॉर्पोरेट आयोजनों के लिए फूलों का संयोजन करते हैं।";
      setChatMessages((prev) => [...prev, { role: "bot", content: msg }]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            currentLang === "en"
              ? "I didn't quite catch that. You can type keywords like 'new', 'stock', 'all bouquets', 'cheapest', 'delivery', or click the shortcut chips below."
              : currentLang === "hinglish"
                ? "Mujhe samajh nahi aaya. Aap 'new', 'stock', 'saare bouquets', 'cheapest', 'delivery', ya 'craft' likh sakte hai."
                : "मुझे समझ नहीं आया। आप 'नया', 'स्टॉक', या 'डिज़ाइन' जैसे शब्द लिख सकते हैं।",
        },
      ]);
    }
  };

  const handleSendText = () => {
    if (!chatInput.trim() || chatLoading) return;
    const txt = chatInput.trim();
    setChatInput("");

    // Automatically detect language from user's input query
    const detected = detectLanguage(txt);
    setChatLang(detected);

    setChatMessages((prev) => [...prev, { role: "user", content: txt }]);
    handleUserIntent(txt, detected);
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
      {/* Single Sticky Bottom-Right FAB Cluster */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
        {/* Chatbot Window */}
        {chatOpen ? (
          <div
            className="w-80 md:w-96 h-[500px] bg-ivory border border-border shadow-2xl flex flex-col transition-all duration-300 animate-scale-up"
            style={{ color: "var(--forest)" }}
          >
            {/* Header */}
            <div
              className="p-4 border-b border-border flex items-center justify-between"
              style={{ background: "var(--forest)", color: "var(--ivory)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-display text-lg tracking-wide">Concierge</span>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={chatLang}
                  onChange={(e) => setChatLang(e.target.value as Lang)}
                  className="text-[0.65rem] bg-cream/20 text-ivory border border-ivory/30 py-0.5 px-1 outline-none font-semibold cursor-pointer"
                >
                  <option value="en" className="text-forest">
                    EN
                  </option>
                  <option value="hinglish" className="text-forest">
                    Hinglish
                  </option>
                  <option value="punjabi" className="text-forest">
                    ਪੰਜਾਬੀ
                  </option>
                  <option value="hi" className="text-forest">
                    हिंदी
                  </option>
                  <option value="fr" className="text-forest">
                    FR
                  </option>
                </select>
                <button
                  onClick={() => handleToggleChat(false)}
                  className="p-1 opacity-80 hover:opacity-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cream/10">
              {chatMessages.map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] p-3 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-cream border border-border text-ink font-semibold"
                          : "bg-cream/40 border border-border/30 text-forest"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      {m.customLink && (
                        <Link
                          to={m.customLink.to as any}
                          className="mt-3 py-1.5 px-3 bg-forest text-ivory text-[0.6rem] tracking-wider uppercase font-semibold flex items-center gap-1 hover:opacity-90 max-w-max cursor-pointer"
                          onClick={() => setChatOpen(false)}
                        >
                          {m.customLink.label} <ArrowRight size={10} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Products inside messages */}
                  {m.products && m.products.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2 max-w-[90%]">
                      {m.products.map((p) => (
                        <div
                          key={p.id}
                          className="bg-ivory border border-border p-2 flex flex-col justify-between"
                          style={{ color: "var(--forest)" }}
                        >
                          <div>
                            <p className="font-display text-xs truncate font-semibold">{p.title}</p>
                            <p className="text-[0.65rem] opacity-60 mt-0.5">
                              ₹{Number(p.price).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <Link
                            to={`/product/${p.id}` as any}
                            onClick={() => setChatOpen(false)}
                            className="mt-2 py-1 bg-forest/10 hover:bg-forest text-forest hover:text-ivory text-[0.55rem] text-center font-bold uppercase transition cursor-pointer"
                          >
                            {t.shopNow}
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <RefreshCw size={12} className="animate-spin opacity-40" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Shortcut Chips */}
            <div className="px-4 py-2 border-t border-border/40 bg-cream/15 flex flex-wrap gap-1.5">
              {[
                { label: t.chipNew, value: "new" },
                { label: t.chipStock, value: "stock" },
                { label: t.chipDesign, value: "design" },
                { label: t.chipDelivery, value: "delivery" },
              ].map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => {
                    setChatMessages((prev) => [...prev, { role: "user", content: chip.label }]);
                    handleUserIntent(chip.value);
                  }}
                  className="text-[0.6rem] bg-ivory border border-border/80 px-2 py-1 hover:bg-cream hover:border-forest transition cursor-pointer text-forest"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-border bg-cream/30 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                placeholder={t.placeholder}
                className="flex-1 text-xs bg-ivory border border-border px-3 py-2 outline-none focus:border-forest text-forest"
              />
              <button
                onClick={handleSendText}
                className="px-3 bg-forest text-ivory flex items-center justify-center cursor-pointer hover:bg-forest/95"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Expanded FAB menu options */}
            {expanded && (
              <div className="flex flex-col items-end gap-2.5 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
                {/* 1. Rose Concierge AI Chatbot */}
                <button
                  onClick={() => {
                    handleToggleChat(true);
                    setExpanded(false);
                  }}
                  className="group flex items-center gap-3 bg-ivory border border-border px-4 py-2.5 rounded-full shadow-[var(--shadow-elegant)] hover:border-forest transition cursor-pointer text-forest"
                >
                  <span className="text-eyebrow text-xs font-semibold tracking-wider">
                    Rose Concierge AI
                  </span>
                  <div className="w-9 h-9 rounded-full bg-forest text-ivory flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquare size={16} />
                  </div>
                </button>

                {/* 2. WhatsApp Direct Support */}
                <a
                  href={`https://wa.me/${CONFIG.whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setExpanded(false)}
                  className="group flex items-center gap-3 bg-ivory border border-border px-4 py-2.5 rounded-full shadow-[var(--shadow-elegant)] hover:border-emerald-600 transition cursor-pointer text-emerald-800"
                >
                  <span className="text-eyebrow text-xs font-semibold tracking-wider">
                    WhatsApp Support
                  </span>
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-ivory flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M20.5 3.5A11 11 0 0 0 3.6 17.9L2 22l4.2-1.6A11 11 0 1 0 20.5 3.5zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-2.5.9.8-2.5-.2-.3A9 9 0 1 1 12 20.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.2-.7.8-.8 1-.3.2-.6 0a7.4 7.4 0 0 1-3.6-3.2c-.3-.5.3-.5.8-1.6a.6.6 0 0 0 0-.5c0-.1-.6-1.5-.8-2s-.5-.4-.6-.5H8a1.1 1.1 0 0 0-.8.4A3.4 3.4 0 0 0 6.1 10a5.9 5.9 0 0 0 1.3 3.2 13.5 13.5 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.1 4.1 0 0 0 1.9.1 3.1 3.1 0 0 0 2-1.4 2.6 2.6 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.4z" />
                    </svg>
                  </div>
                </a>

                {/* 3. Sign Out (only if logged in) */}
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setShowLogoutModal(true);
                      setExpanded(false);
                    }}
                    className="group flex items-center gap-3 bg-ivory border border-border px-4 py-2.5 rounded-full shadow-[var(--shadow-elegant)] hover:border-burgundy transition cursor-pointer text-burgundy"
                  >
                    <span className="text-eyebrow text-xs font-semibold tracking-wider">
                      Sign Out
                    </span>
                    <div className="w-9 h-9 rounded-full bg-burgundy text-ivory flex items-center justify-center group-hover:scale-105 transition-transform">
                      <LogOut size={16} />
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Single Sticky Main FAB Button */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-14 h-14 rounded-full bg-forest text-ivory flex items-center justify-center shadow-[var(--shadow-elegant)] border border-gold/40 hover:scale-105 transition-all duration-300 cursor-pointer"
              aria-label={expanded ? "Close actions menu" : "Open actions menu"}
              title="Quick Assistant"
            >
              <div
                className="transition-transform duration-300"
                style={{ transform: expanded ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                <Plus size={24} />
              </div>
            </button>
          </>
        )}
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
            <h2 className="font-display text-3xl mt-4 text-center leading-tight">Sign out?</h2>
            <p className="text-center opacity-60 text-sm mt-3 leading-relaxed">
              You will be signed out of your account. Any unsaved changes will be lost.
            </p>

            <div className="hairline my-8" />

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 border border-border text-eyebrow hover:bg-cream transition cursor-pointer"
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-3 text-eyebrow transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
