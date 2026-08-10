import React, { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Mail, MessageCircle, MapPin, Facebook, Instagram, Youtube } from "lucide-react";

const TikTokIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.6 6.32a5.34 5.34 0 0 1-3.9-1.68 5.34 5.34 0 0 1-1.4-3.16h-3.5v13.24a2.87 2.87 0 1 1-2.02-2.74V8.32a6.36 6.36 0 1 0 5.52 6.3V9.14a8.83 8.83 0 0 0 5.3 1.75V7.36c-.01 0-.01-.02 0-1.04Z" />
  </svg>
);

export default function ContactPage() {
  const [settings, setSettings] = useState({});
  const [c, setC] = useState({ name: "", email: "", subject: "", message: "" });
  const [n, setN] = useState({ email: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [subBusy, setSubBusy] = useState(false);

  useEffect(() => { api.get("/public/settings").then((r) => setSettings(r.data)).catch(() => {}); }, []);

  const submitContact = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/public/contact", c);
      toast.success("Message sent! We'll reply as soon as we can.");
      setC({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const submitNews = async (e) => {
    e.preventDefault();
    setSubBusy(true);
    try {
      await api.post("/public/newsletter", n);
      toast.success("Subscribed. Welcome to the family!");
      setN({ email: "", name: "" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally { setSubBusy(false); }
  };

  const baseInput = "w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none";
  const waNum = (settings.whatsapp || "").replace(/[^0-9]/g, "");

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="contact-hero">
        <div className="container-app grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="eyebrow mb-4">Contact</div>
            <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-6">Say hello.</h1>
            <p className="text-lg text-foreground/80 mb-8">
              Questions about registering, volunteering, sponsoring, or media requests — we&apos;d love to hear from you.
            </p>

            <ul className="space-y-3 mb-10" data-testid="contact-emails">
              <li className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><Mail className="w-5 h-5" /></span>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">General</div>
                  <a className="text-primary font-semibold hover:text-accent break-all" href="mailto:info@langascorpions.co.za" data-testid="contact-email-info">info@langascorpions.co.za</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><Mail className="w-5 h-5" /></span>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Partnerships</div>
                  <a className="text-primary font-semibold hover:text-accent break-all" href="mailto:partnerships.lsasd@langascorpions.co.za" data-testid="contact-email-partnerships">partnerships.lsasd@langascorpions.co.za</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><Mail className="w-5 h-5" /></span>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Founder — Lukhanyo Mdunyelwa</div>
                  <a className="text-primary font-semibold hover:text-accent break-all" href="mailto:lukhanyomdunyelwa@langascorpions.co.za" data-testid="contact-email-founder">lukhanyomdunyelwa@langascorpions.co.za</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><MessageCircle className="w-5 h-5" /></span>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp</div>
                  <a className="text-primary font-semibold hover:text-accent" target="_blank" rel="noreferrer" href={`https://wa.me/${waNum}`} data-testid="contact-whatsapp-link">{settings.whatsapp || "+27 73 811 3907"}</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><MapPin className="w-5 h-5" /></span>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Base</div>
                  <div className="text-primary font-semibold">{settings.address || "Langa, Cape Town"}</div>
                </div>
              </li>
            </ul>

            {/* Socials */}
            <div className="mb-10" data-testid="contact-socials">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Follow us</div>
              <div className="flex flex-wrap gap-3">
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook"
                    className="w-12 h-12 rounded-2xl border-2 border-border grid place-items-center text-primary hover:bg-primary hover:text-white hover:border-primary transition-colors" data-testid="contact-social-facebook">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram"
                    className="w-12 h-12 rounded-2xl border-2 border-border grid place-items-center text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors" data-testid="contact-social-instagram">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {settings.tiktok_url && (
                  <a href={settings.tiktok_url} target="_blank" rel="noreferrer" aria-label="TikTok"
                    className="w-12 h-12 rounded-2xl border-2 border-border grid place-items-center text-primary hover:bg-primary hover:text-white hover:border-primary transition-colors" data-testid="contact-social-tiktok">
                    <TikTokIcon />
                  </a>
                )}
                {settings.youtube_url && (
                  <a href={settings.youtube_url} target="_blank" rel="noreferrer" aria-label="YouTube"
                    className="w-12 h-12 rounded-2xl border-2 border-border grid place-items-center text-primary hover:bg-accent hover:text-white hover:border-accent transition-colors" data-testid="contact-social-youtube">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            <div className="card-soft p-6">
              <div className="eyebrow mb-2">Newsletter</div>
              <h3 className="text-xl font-bold text-primary mb-2">Get the season update.</h3>
              <p className="text-sm text-foreground/70 mb-4">One friendly email a month. No spam, ever.</p>
              <form onSubmit={submitNews} className="flex flex-col sm:flex-row gap-2" data-testid="newsletter-form">
                <input required type="email" placeholder="Your email" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} className={baseInput + " flex-1"} data-testid="newsletter-email" />
                <button type="submit" disabled={subBusy} className="btn-accent !py-3 !px-6 text-sm" data-testid="newsletter-submit">
                  {subBusy ? "…" : "Subscribe"}
                </button>
              </form>
            </div>
          </div>

          <form onSubmit={submitContact} className="lg:col-span-7 card-soft p-8 md:p-10 space-y-5" data-testid="contact-form">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Your name <span className="text-accent">*</span></label>
                <input required value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} className={baseInput} data-testid="contact-name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Email <span className="text-accent">*</span></label>
                <input required type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} className={baseInput} data-testid="contact-email" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">Subject</label>
              <input value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} className={baseInput} data-testid="contact-subject" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">Message <span className="text-accent">*</span></label>
              <textarea required rows={6} value={c.message} onChange={(e) => setC({ ...c, message: e.target.value })} className={baseInput} data-testid="contact-message" />
            </div>
            <button type="submit" disabled={busy} className="btn-accent w-full !py-4 text-base" data-testid="contact-submit">
              {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}
