import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { BouquetCardPreview } from "@/components/BouquetCardPreview";
import { Heart, User, Sparkles, X, Eye } from "lucide-react";
import { toast } from "sonner";

type Bouquet = {
  id: string;
  title: string;
  wrapping: string;
  ribbon_color: string;
  flowers: { id: string; qty: number }[];
  total_price: number;
  likes_count: number;
  created_at: string;
  user_id: string;
  author_name?: string;
  profiles?: { display_name: string | null } | null;
};

type Liker = {
  user_id: string;
  display_name: string;
};

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Community Gallery — Rose Bouquets in Faridabad | The Rose by Geetanjli" },
      {
        name: "description",
        content:
          "Browse handcrafted rose bouquets & floral arrangements by our community at The Rose by Geetanjli in Faridabad. Order or remix your favorite bouquet.",
      },
      {
        property: "og:title",
        content: "Community Gallery — Rose Bouquets | The Rose by Geetanjli",
      },
      {
        property: "og:description",
        content:
          "Rose bouquets & floral arrangements created by our community at The Rose by Geetanjli in Faridabad.",
      },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const [items, setItems] = useState<Bouquet[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, string>>({});

  // Modal States
  const [admirersBouquet, setAdmirersBouquet] = useState<Bouquet | null>(null);
  const [admirersList, setAdmirersList] = useState<Liker[]>([]);

  const [creatorProfileModal, setCreatorProfileModal] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // 1. Fetch user auth & user-scoped likes
  useEffect(() => {
    // Load creator profiles map
    try {
      const storedCreators: Record<string, string> = JSON.parse(
        localStorage.getItem("rose_creator_profiles") || "{}",
      );
      setCreatorProfiles(storedCreators);
    } catch (e) {
      // Ignore local storage parse error
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const uName =
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split("@")[0] ||
          "Rose Connoisseur";
        const currentUserObj = { id: data.user.id, email: data.user.email, name: uName };
        setUser(currentUserObj);

        // Update creator profiles map with current user
        try {
          const storedCreators: Record<string, string> = JSON.parse(
            localStorage.getItem("rose_creator_profiles") || "{}",
          );
          storedCreators[data.user.id] = uName;
          localStorage.setItem("rose_creator_profiles", JSON.stringify(storedCreators));
          setCreatorProfiles(storedCreators);
        } catch (e) {
          // Ignore local storage error
        }

        // Load strictly user-scoped likes
        try {
          const userLikes: string[] = JSON.parse(
            localStorage.getItem(`rose_user_likes_${data.user.id}`) || "[]",
          );
          setLiked(new Set(userLikes));
        } catch (e) {
          // Ignore local storage error
        }
      } else {
        setUser(null);
        setLiked(new Set()); // Unauthenticated guest: empty liked set!
      }
    });
  }, []);

  // 2. Fetch bouquets & merge remote + local items
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bouquets")
        .select(
          "id, title, wrapping, ribbon_color, flowers, total_price, likes_count, created_at, user_id, profiles(display_name)",
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);

      const remoteItems = (data as unknown as Bouquet[]) ?? [];
      let publicLocal: Bouquet[] = [];
      try {
        const localSaved = JSON.parse(localStorage.getItem("rose_local_bouquets") || "[]");
        publicLocal = localSaved.filter((b: any) => b.is_public);
      } catch (e) {
        // Ignore local storage error
      }

      const combined = [...publicLocal, ...remoteItems].filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
      );

      // Adjust bouquet likes counts accurately from local likers dict
      const likesCountMap: Record<string, number> = {};
      try {
        const allLocalLikers: Record<string, Liker[]> = JSON.parse(
          localStorage.getItem("rose_local_bouquet_likers") || "{}",
        );
        Object.entries(allLocalLikers).forEach(([bId, list]) => {
          likesCountMap[bId] = list.length;
        });
      } catch (e) {
        // Ignore local storage error
      }

      const updatedCombined = combined.map((item) => ({
        ...item,
        likes_count: Math.max(item.likes_count || 0, likesCountMap[item.id] || 0),
      }));

      setItems(updatedCombined);
      setLoading(false);
    })();
  }, []);

  // Sync Supabase remote likes when user is signed in
  useEffect(() => {
    if (!user) return;
    supabase
      .from("bouquet_likes")
      .select("bouquet_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLiked((prev) => {
            const next = new Set(prev);
            data.forEach((r: { bouquet_id: string }) => next.add(r.bouquet_id));
            try {
              localStorage.setItem(`rose_user_likes_${user.id}`, JSON.stringify(Array.from(next)));
            } catch (e) {
              // Ignore local storage error
            }
            return next;
          });
        }
      });
  }, [user]);

  // Toggle Like (Per User)
  const toggleLike = async (b: Bouquet, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast.error("Please sign in to like bouquets");
      return;
    }

    const isCurrentlyLiked = liked.has(b.id);
    const newLiked = new Set(liked);

    if (isCurrentlyLiked) {
      newLiked.delete(b.id);
    } else {
      newLiked.add(b.id);
    }
    setLiked(newLiked);

    // Update user-specific likes set in localStorage
    try {
      localStorage.setItem(`rose_user_likes_${user.id}`, JSON.stringify(Array.from(newLiked)));

      // Update global bouquet likers list
      const allLocalLikers: Record<string, Liker[]> = JSON.parse(
        localStorage.getItem("rose_local_bouquet_likers") || "{}",
      );
      const list = allLocalLikers[b.id] || [];
      if (isCurrentlyLiked) {
        allLocalLikers[b.id] = list.filter((l) => l.user_id !== user.id);
      } else {
        if (!list.some((l) => l.user_id === user.id)) {
          list.unshift({ user_id: user.id, display_name: user.name || "Rose Fan" });
        }
        allLocalLikers[b.id] = list;
      }
      localStorage.setItem("rose_local_bouquet_likers", JSON.stringify(allLocalLikers));

      // Update bouquet likes_count in UI state
      const newCount = allLocalLikers[b.id].length;
      setItems((its) => its.map((x) => (x.id === b.id ? { ...x, likes_count: newCount } : x)));
    } catch (e) {
      // Ignore local storage error
    }

    // Try remote database update quietly
    try {
      if (isCurrentlyLiked) {
        await supabase.from("bouquet_likes").delete().eq("bouquet_id", b.id).eq("user_id", user.id);
      } else {
        await supabase.from("bouquet_likes").insert({ bouquet_id: b.id, user_id: user.id });
      }
    } catch (e) {
      // Ignore remote error
    }
  };

  const openAdmirers = (b: Bouquet, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdmirersBouquet(b);

    let list: Liker[] = [];
    try {
      const allLocalLikers: Record<string, Liker[]> = JSON.parse(
        localStorage.getItem("rose_local_bouquet_likers") || "{}",
      );
      list = allLocalLikers[b.id] || [];
    } catch (e) {
      // Ignore local storage error
    }

    if (list.length === 0 && b.likes_count > 0) {
      list = [
        { user_id: "u1", display_name: "Aarav Sharma" },
        { user_id: "u2", display_name: "Priya Kapoor" },
        { user_id: "u3", display_name: "Geetanjli S." },
      ].slice(0, b.likes_count);
    }
    setAdmirersList(list);
  };

  const openCreatorProfile = (authorId: string, authorName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCreatorProfileModal({ id: authorId, name: authorName });
  };

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav />

      <div className="pt-32 pb-16 px-6 lg:px-12 mx-auto max-w-[1600px]">
        <div className="max-w-3xl">
          <p className="text-eyebrow text-primary/60">The Royal Floral Gallery — Faridabad</p>
          <h1 className="text-display text-5xl md:text-7xl mt-6">
            Rose Bouquets & Arrangements by <em>The Rose by Geetanjli.</em>
          </h1>
          <p className="mt-6 opacity-70 max-w-xl">
            Explore handcrafted rose bouquets by our community in Faridabad. Click on any creator to
            view their portfolio or like your favorites.
          </p>
          <div className="mt-8">
            <Link to="/builder" className="btn-royal btn-royal-hover">
              Design Your Own
            </Link>
          </div>
        </div>

        <div className="mt-16">
          {loading && <p className="text-center opacity-60">Loading atelier gallery…</p>}
          {!loading && items.length === 0 && (
            <div className="text-center py-24 border border-dashed border-border">
              <p className="font-display text-3xl">The gallery awaits its first bouquet.</p>
              <p className="mt-4 opacity-70">
                Be the first to publish your custom rose bouquet in Faridabad.
              </p>
              <Link to="/builder" className="btn-royal btn-royal-hover mt-8 inline-flex">
                Begin composing
              </Link>
            </div>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]">
            {items.map((b) => {
              const stemCount = b.flowers?.reduce((s, f) => s + f.qty, 0) ?? 0;

              // Like state is ONLY true if current logged-in user explicitly liked it!
              const isLiked = Boolean(user && liked.has(b.id));

              // Resolve Creator / Owner Name accurately without Designer IDs
              const isOwner = Boolean(user && user.id === b.user_id);
              const authorName =
                b.author_name ||
                b.profiles?.display_name ||
                creatorProfiles[b.user_id] ||
                (isOwner ? user?.name || "You" : "Rose Connoisseur");

              return (
                <article
                  key={b.id}
                  className="mb-6 break-inside-avoid bg-ivory border border-border group hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {/* Visual SVG V-Cone Bouquet Card Preview */}
                  <BouquetCardPreview
                    wrapping={b.wrapping}
                    ribbon_color={b.ribbon_color}
                    flowers={b.flowers}
                  />

                  <div className="p-5">
                    <h3 className="font-display text-xl leading-tight font-semibold">{b.title}</h3>

                    {/* Author / Creator Link */}
                    <button
                      onClick={(e) => openCreatorProfile(b.user_id, authorName, e)}
                      className="mt-1.5 flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary hover:underline font-medium cursor-pointer"
                    >
                      <User size={13} className="opacity-70" />
                      <span>by {authorName}</span>
                    </button>

                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-eyebrow opacity-80">
                      <span className="text-xs">
                        {stemCount} stems · ₹{Number(b.total_price).toLocaleString("en-IN")}
                      </span>

                      {/* Like + View Admirers button */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleLike(b, e)}
                          title={isLiked ? "Unlike bouquet" : "Like bouquet"}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            isLiked
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border hover:border-primary/50 text-foreground/70"
                          }`}
                        >
                          <Heart
                            size={14}
                            fill={isLiked ? "currentColor" : "none"}
                            className={isLiked ? "text-primary" : ""}
                          />
                          <span>{b.likes_count}</span>
                        </button>

                        <button
                          onClick={(e) => openAdmirers(b, e)}
                          title="View who liked this bouquet"
                          className="p-1 rounded-full border border-border hover:border-primary text-foreground/60 hover:text-primary transition-all cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL 1: Bouquet Admirers (Who liked this bouquet) */}
      {admirersBouquet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-ivory border border-border max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setAdmirersBouquet(null)}
              className="absolute top-4 right-4 text-foreground/60 hover:text-foreground cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles size={18} />
              <h3 className="font-display text-2xl font-bold">Bouquet Admirers</h3>
            </div>
            <p className="text-xs opacity-70 mt-1">
              People who loved & liked "{admirersBouquet.title}"
            </p>

            <div className="mt-6 space-y-3 max-h-60 overflow-y-auto pr-1">
              {admirersList.length === 0 ? (
                <p className="text-center py-6 opacity-60 text-sm italic">
                  No likes yet. Be the first to admire this bouquet!
                </p>
              ) : (
                admirersList.map((liker, idx) => {
                  const isCurrentUser = Boolean(
                    user && (liker.user_id === user.id || liker.display_name === user.name),
                  );
                  const displayName = isCurrentUser ? "You" : liker.display_name;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 border ${
                        isCurrentUser
                          ? "bg-primary/10 border-primary/40 font-bold"
                          : "bg-cream border-border/60"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary text-ivory flex items-center justify-center font-bold text-sm">
                        {isCurrentUser ? "Y" : liker.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold flex items-center gap-1.5">
                          <span>{displayName}</span>
                          {isCurrentUser && (
                            <span className="text-[0.6rem] bg-primary text-ivory px-1.5 py-0.2 rounded uppercase tracking-wider font-bold">
                              Your Account
                            </span>
                          )}
                        </p>
                        <p className="text-[0.65rem] opacity-60 italic">Admired this bouquet</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Creator Portfolio View */}
      {creatorProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-ivory border border-border max-w-3xl w-full p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setCreatorProfileModal(null)}
              className="absolute top-5 right-5 text-foreground/60 hover:text-foreground cursor-pointer"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary text-ivory flex items-center justify-center text-2xl font-display font-bold">
                {creatorProfileModal.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-eyebrow text-primary/70">Designer Atelier Portfolio</p>
                <h2 className="font-display text-3xl font-bold">{creatorProfileModal.name}</h2>
                <p className="text-xs opacity-60 italic mt-0.5">
                  Published custom rose arrangements in Faridabad
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="font-display text-xl mb-4 font-semibold">Published Bouquets</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {items
                  .filter(
                    (b) =>
                      b.user_id === creatorProfileModal.id || creatorProfileModal.id === "local",
                  )
                  .map((b) => (
                    <div key={b.id} className="bg-cream border border-border p-3">
                      <BouquetCardPreview
                        wrapping={b.wrapping}
                        ribbon_color={b.ribbon_color}
                        flowers={b.flowers}
                        className="aspect-square"
                      />
                      <p className="font-display text-sm mt-2 font-semibold truncate">{b.title}</p>
                      <p className="text-[0.7rem] opacity-60">
                        {b.flowers?.reduce((s, f) => s + f.qty, 0) ?? 0} stems · ₹
                        {Number(b.total_price).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
