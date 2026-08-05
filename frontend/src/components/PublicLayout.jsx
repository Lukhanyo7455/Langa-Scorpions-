import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Heart, Facebook, Instagram, Mail, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/programs", label: "Programs" },
  { to: "/stories", label: "Impact & Stories" },
  { to: "/events", label: "Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
];

export const PublicLayout = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const loc = useLocation();

  useEffect(() => {
    api.get("/public/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded"
        data-testid="skip-to-content"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav" data-testid="site-header">
        <div className="container-app flex items-center justify-between h-24 md:h-28">
          <Link to="/" className="flex items-center gap-4 group" data-testid="nav-logo">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Langa Scorpions logo"
                className="w-14 h-14 md:w-20 md:h-20 rounded-2xl object-contain shadow-sm transition-transform duration-200 group-hover:-rotate-6"
              />
            ) : (
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-primary text-white grid place-items-center font-heading font-bold text-xl md:text-2xl shadow-sm transition-transform duration-200 group-hover:-rotate-6">
                LS
              </div>
            )}
            <div className="leading-tight">
              <div className="font-heading font-bold text-primary text-xl md:text-2xl">Langa Scorpions</div>
              <div className="text-xs md:text-sm font-semibold uppercase tracking-widest text-accent">Adaptive Sports and Development</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                data-testid={`nav-link-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className={({ isActive }) =>
                  `px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-foreground/70 hover:text-primary"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link to="/volunteer" className="btn-outline-primary !py-2.5 !px-5 text-sm" data-testid="nav-volunteer-btn">
              Volunteer
            </Link>
            <Link to="/donate" className="btn-accent !py-2.5 !px-5 text-sm" data-testid="nav-donate-btn">
              <Heart className="w-4 h-4" /> Donate
            </Link>
          </div>

          <button
            className="lg:hidden p-2 rounded-md text-primary"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            data-testid="mobile-menu-toggle"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden border-t border-black/5 bg-white" data-testid="mobile-menu">
            <div className="container-app py-4 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === "/"}
                  className={({ isActive }) =>
                    `px-3 py-3 rounded-md text-base font-medium ${
                      isActive ? "bg-primary/5 text-primary" : "text-foreground/80"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <div className="flex gap-2 pt-3">
                <Link to="/volunteer" className="btn-outline-primary flex-1 !py-2.5 text-sm">Volunteer</Link>
                <Link to="/donate" className="btn-accent flex-1 !py-2.5 text-sm">
                  <Heart className="w-4 h-4" /> Donate
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="main" className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-white/90 mt-24" data-testid="site-footer">
        <div className="container-app py-16 grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Langa Scorpions logo" className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-1" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-accent grid place-items-center font-bold text-xl">LS</div>
              )}
              <div>
                <div className="font-heading font-bold text-2xl">Langa Scorpions</div>
                <div className="text-xs uppercase tracking-widest text-accent font-semibold">Adaptive Sports and Development</div>
              </div>
            </div>
            <p className="text-white/70 max-w-md leading-relaxed">
              Empowering young persons with disabilities through wheelchair basketball, life skills,
              and social empowerment — right here in Langa, Cape Town.
            </p>
          </div>

          <div>
            <div className="eyebrow !text-white/60 mb-4">Get involved</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/donate" className="hover:text-accent">Donate</Link></li>
              <li><Link to="/register" className="hover:text-accent">Register an athlete</Link></li>
              <li><Link to="/volunteer" className="hover:text-accent">Volunteer / Coach</Link></li>
              <li><Link to="/contact" className="hover:text-accent">Contact us</Link></li>
            </ul>
          </div>

          <div>
            <div className="eyebrow !text-white/60 mb-4">Reach us</div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-accent" />
                <a href={`mailto:${settings.org_email || "info@langascorpions.org"}`} className="hover:text-accent break-all">
                  {settings.org_email || "info@langascorpions.org"}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="w-4 h-4 mt-0.5 text-accent" />
                <a
                  href={`https://wa.me/${(settings.whatsapp || "").replace(/[^0-9]/g, "")}`}
                  target="_blank" rel="noreferrer"
                  className="hover:text-accent"
                >
                  WhatsApp: {settings.whatsapp || "+27 00 000 0000"}
                </a>
              </li>
              <li className="flex gap-3 pt-2">
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:text-accent">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:text-accent">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-app py-6 flex flex-col md:flex-row md:items-center md:justify-between text-xs text-white/60 gap-2">
            <div>© {new Date().getFullYear()} Langa Scorpions Adaptive Sports and Development. All rights reserved.</div>
            <div>Made with heart in Langa, Cape Town.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
