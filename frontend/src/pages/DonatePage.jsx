import React, { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Heart, Repeat, Zap, CreditCard, Clock } from "lucide-react";

const PRESETS = [100, 250, 500, 1000, 2500];

export default function DonatePage() {
  const [amount, setAmount] = useState(500);
  const [custom, setCustom] = useState("");
  const [frequency, setFrequency] = useState("one-time");
  const [form, setForm] = useState({ donor_name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? parseFloat(custom) : amount;

  const payWithPayFast = () => {
    // PayFast integration is pending merchant approval — show a friendly notice for now.
    toast("Card payments via PayFast launching soon", {
      description: "We're finalising our PayFast merchant approval. In the meantime, please use the Pledge option below and we'll email you payment details.",
      duration: 6000,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!finalAmount || finalAmount <= 0) { toast.error("Please enter a donation amount."); return; }
    setLoading(true);
    try {
      await api.post("/public/donations", { ...form, amount: finalAmount, currency: "ZAR", frequency });
      toast.success("Thank you! We've received your pledge and will be in touch shortly.");
      setForm({ donor_name: "", email: "", phone: "", message: "" });
      setCustom(""); setAmount(500);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="donate-hero">
        <div className="container-app grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="eyebrow mb-4">Donate</div>
            <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-6">
              Fuel the season.
            </h1>
            <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
              Every rand you give buys transport, kit, <strong>apparel</strong>,
              <strong> food packages for events and tournaments</strong>, and
              <strong> monthly operations</strong>. Keeping the Scorpions on the court all season long.
            </p>
            <div className="space-y-4">
              {[
                { r: 100, t: "Sports drinks & energy for one practice" },
                { r: 500, t: "A month of transport for one athlete" },
                { r: 1500, t: "Team apparel for one athlete" },
                { r: 2500, t: "Food packages for a tournament day" },
                { r: 5000, t: "Wheelchair repairs & spare parts" },
                { r: 10000, t: "Contribution towards a new sports wheelchair" },
              ].map((row) => (
                <div key={row.r} className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5">
                  <div className="text-primary font-heading font-bold text-2xl w-24">R{row.r.toLocaleString()}</div>
                  <div className="text-foreground/80">{row.t}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={submit} className="card-soft p-8 md:p-10 space-y-6" data-testid="donation-form">
              <div>
                <label className="eyebrow block mb-3">Choose amount (ZAR)</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setAmount(p); setCustom(""); }}
                      className={`py-3 rounded-xl font-semibold border-2 transition-colors duration-150 ${
                        !custom && amount === p ? "border-accent bg-accent text-white" : "border-border hover:border-accent"
                      }`}
                      data-testid={`amount-${p}`}
                    >
                      R{p}
                    </button>
                  ))}
                </div>
                <div className="mt-3 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                  <input
                    type="number" min="1" step="1"
                    placeholder="Other amount"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none"
                    data-testid="amount-custom"
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-3">Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "one-time", l: "One-time", Icon: Zap },
                    { v: "monthly", l: "Monthly", Icon: Repeat },
                  ].map(({ v, l, Icon }) => (
                    <button
                      key={v} type="button"
                      onClick={() => setFrequency(v)}
                      className={`py-3 rounded-xl font-semibold border-2 inline-flex items-center justify-center gap-2 transition-colors duration-150 ${
                        frequency === v ? "border-primary bg-primary text-white" : "border-border hover:border-primary"
                      }`}
                      data-testid={`freq-${v}`}
                    >
                      <Icon className="w-4 h-4" /> {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Full name" value={form.donor_name} onChange={(v) => setForm({ ...form, donor_name: v })} testid="donor-name" required />
                <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} testid="donor-email" required />
              </div>
              <Input label="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} testid="donor-phone" />
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Message (optional)</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none"
                  data-testid="donor-message"
                />
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="button" onClick={payWithPayFast}
                  className="btn-accent w-full !py-4 text-base flex-col sm:flex-row gap-2 sm:relative"
                  data-testid="donate-pay-payfast"
                >
                  <span className="inline-flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Pay with PayFast
                  </span>
                  <span className="sm:absolute sm:top-2 sm:right-3 text-[10px] uppercase tracking-widest font-bold bg-white/20 border border-white/30 rounded-full px-2 py-0.5 inline-flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5" /> Coming soon
                  </span>
                </button>
                <button type="submit" disabled={loading} className="btn-outline-primary w-full !py-4 text-base" data-testid="donate-submit">
                  <Heart className="w-4 h-4" /> {loading ? "Sending…" : "Pledge (we'll contact you)"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                PayFast card payments are launching once our merchant approval is complete. Donors will be able to pay by SA card, EFT, and Instant EFT.
                In the meantime, choose <strong>Pledge</strong> and we&apos;ll email you our banking details for a direct EFT donation.
              </p>
            </form>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Input({ label, value, onChange, testid, type = "text", required, ...rest }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-2">{label}{required && <span className="text-accent"> *</span>}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none"
        data-testid={testid}
        {...rest}
      />
    </div>
  );
}
