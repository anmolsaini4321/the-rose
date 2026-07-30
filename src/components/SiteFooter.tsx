import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer style={{ background: "var(--forest)", color: "var(--ivory)" }}>
      <div className="mx-auto max-w-[1600px] px-6 lg:px-12 py-24">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-eyebrow opacity-70">The Rose by Geetanjli</p>
            <h3 className="font-display text-5xl lg:text-6xl mt-6 leading-[0.95]">
              Every bouquet,
              <br />
              <em className="opacity-80">a royal gesture.</em>
            </h3>
            <p className="mt-8 max-w-md text-sm opacity-70 leading-relaxed">
              A private atelier composing handcrafted florals for weddings, celebrations, and the
              quiet moments that deserve to be remembered.
            </p>
          </div>

          <div className="lg:col-span-2">
            <p className="text-eyebrow opacity-60 mb-6">Maison</p>
            <ul className="space-y-3 text-sm opacity-90">
              <li>
                <a href="/#philosophy" className="hover:opacity-70">
                  Philosophy
                </a>
              </li>
              <li>
                <a href="/#craft" className="hover:opacity-70">
                  The Craft
                </a>
              </li>
              <li>
                <a href="/#journal" className="hover:opacity-70">
                  Journal
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-eyebrow opacity-60 mb-6">Shop</p>
            <ul className="space-y-3 text-sm opacity-90">
              <li>
                <Link to="/shop" className="hover:opacity-70">
                  Browse Bouquets
                </Link>
              </li>
              <li>
                <Link to="/builder" className="hover:opacity-70">
                  Design Bouquet
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:opacity-70">
                  Community Gallery
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:opacity-70">
                  Your Bag
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:opacity-70">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="text-eyebrow opacity-60 mb-6">Correspondence</p>
            <ul className="space-y-3 text-sm opacity-90">
              <li>atelier@theroseby.com</li>
              <li>+91 96751 59675</li>
              <li className="opacity-70 pt-4">
                By appointment only.
                <br />
                Omaxe World Street, Faridabad, Haryana
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-xs opacity-60">
          <p>© {new Date().getFullYear()} The Rose by Geetanjli. All floral works handcrafted.</p>
          <div className="flex gap-6">
            <Link to="/shop" className="hover:opacity-100">
              Shop
            </Link>
            <Link to="/orders" className="hover:opacity-100">
              Orders
            </Link>
            <Link to="/auth" className="hover:opacity-100">
              Account
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
