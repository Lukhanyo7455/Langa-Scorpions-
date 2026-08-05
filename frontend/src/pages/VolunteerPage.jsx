import React, { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function VolunteerPage() {
  const [f, setF] = useState({ full_name: "", email: "", phone: "", role_interest: "General volunteer", availability: "", experience: "" });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target?.value ?? e });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/public/volunteers", f);
      toast.success("Thanks for signing up — we'll reach out soon!");
      setF({ full_name: "", email: "", phone: "", role_interest: "General volunteer", availability: "", experience: "" });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Something went wrong.");
    } finally { setLoading(false); }
  };

  const baseInput = "w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none";

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="volunteer-hero">
        <div className="container-app max-w-3xl">
          <div className="eyebrow mb-4">Volunteer &amp; coaches</div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-4">
            Bring your time. Change a life.
          </h1>
          <p className="text-lg text-foreground/80 mb-10">
            We need coaches, physios, drivers, event helpers, photographers, and admin volunteers.
            Whatever your skill, we&apos;ll find a way to use it well.
          </p>

          <form onSubmit={submit} className="card-soft p-8 md:p-10 space-y-5" data-testid="volunteer-form">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Full name <span className="text-accent">*</span></label>
                <input required value={f.full_name} onChange={upd("full_name")} className={baseInput} data-testid="vol-name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Email <span className="text-accent">*</span></label>
                <input type="email" required value={f.email} onChange={upd("email")} className={baseInput} data-testid="vol-email" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Phone</label>
                <input value={f.phone} onChange={upd("phone")} className={baseInput} data-testid="vol-phone" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Role interest <span className="text-accent">*</span></label>
                <select required value={f.role_interest} onChange={upd("role_interest")} className={baseInput} data-testid="vol-role">
                  {["General volunteer", "Coach / assistant coach", "Physio / medical", "Driver / transport", "Events & fundraising", "Media & photography", "Admin & office", "Mentorship"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">Availability</label>
              <input placeholder="e.g. Saturdays &amp; some evenings" value={f.availability} onChange={upd("availability")} className={baseInput} data-testid="vol-availability" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">Relevant experience</label>
              <textarea rows={4} value={f.experience} onChange={upd("experience")} className={baseInput} data-testid="vol-experience" />
            </div>
            <button type="submit" disabled={loading} className="btn-accent w-full !py-4 text-base" data-testid="volunteer-submit">
              {loading ? "Sending…" : "I want to volunteer"}
            </button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}
