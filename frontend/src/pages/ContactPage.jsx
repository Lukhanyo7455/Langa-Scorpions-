import React, { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Mail, MessageCircle, MapPin } from "lucide-react";

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

            <ul className="space-y-4 mb-10">
              <li className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><Mail className="w-5 h-5" /></span>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Email</div>
                  <a className="text-primary font-semibold hover:text-accent" href={`mailto:${settings.org_email || "info@langascorpions.org"}`} data-testid="contact-email-link">{settings.org_email || "info@langascorpions.org"}</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center shrink-0"><MessageCircle className="w-5 h-5" /></span>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp</div>
                  <a className="text-primary font-semibold hover:text-accent" target="_blank" rel="noreferrer" href={`https://wa.me/${waNum}`} data-testid="contact-whatsapp-link">{settings.whatsapp || "+27 00 000 0000"}</a>
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
