import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { FloatingActions } from "@/components/SiteNav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-eyebrow text-muted-foreground">404</p>
        <h1 className="mt-6 text-display text-5xl text-foreground">Page not found</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you seek has drifted like a fallen petal.
        </p>
        <div className="mt-10">
          <Link to="/" className="btn-royal btn-royal-hover">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-display text-3xl text-foreground">A moment of stillness</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something didn't bloom as expected. Try again or return home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-royal btn-royal-hover"
          >
            Try again
          </button>
          <a
            href="/"
            className="btn-royal btn-royal-hover"
            style={{ background: "transparent", color: "var(--forest)" }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Florist",
  name: "The Rose by Geetanjli",
  description:
    "The Rose by Geetanjli offers fresh flower bouquets & same-day delivery in Faridabad. Order luxury roses, floral arrangements & gifts online from our atelier.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Omaxe World Street",
    addressLocality: "Faridabad",
    addressRegion: "Haryana",
    addressCountry: "IN",
  },
  telephone: "+91 96751 59675",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "09:00",
      closes: "21:00",
    },
  ],
  priceRange: "₹₹ - ₹₹₹",
  geo: {
    "@type": "GeoCoordinates",
    latitude: "28.3800",
    longitude: "77.3500",
  },
  url: "https://the-rose-delta.vercel.app",
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
      { name: "author", content: "The Rose by Geetanjli" },
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
      { name: "twitter:image", content: "https://the-rose-delta.vercel.app/favicon.ico" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(jsonLd),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@300;400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <FloatingActions />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
