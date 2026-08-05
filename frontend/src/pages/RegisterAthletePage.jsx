import React, { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function RegisterAthletePage() {
  const [f, setF] = useState({
    athlete_name: "", date_of_birth: "", gender: "", disability: "",
    guardian_name: "", guardian_email: "", guardian_phone: "",
    city: "Cape Town", program: "Wheelchair Basketball", notes: "", consent: false,
  });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target?.value ?? e });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.consent) { toast.error("Please confirm parent / guardian consent."); return; }
    setLoading(true);
    try {
      await api.post("/public/athletes", f);
      toast.success("Registration received! We'll be in touch within 3 working days.");
      setF({ ...f, athlete_name: "", date_of_birth: "", disability: "", guardian_name: "", guardian_email: "", guardian_phone: "", notes: "", consent: false });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="register-hero">
        <div className="container-app max-w-3xl">
          <div className="eyebrow mb-4">Athlete registration</div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-4">Join the Scorpions.</h1>
          <p className="text-lg text-foreground/80 mb-10">
            Register a young person for our wheelchair basketball program. A coach will contact the guardian to arrange a first practice visit.
          </p>

          <form onSubmit={submit} className="card-soft p-8 md:p-10 space-y-6" data-testid="athlete-form">
            <FieldGroup title="Athlete details">
              <Grid>
                <TextField label="Athlete full name" value={f.athlete_name} onChange={upd("athlete_name")} testid="athlete-name" required />
                <TextField label="Date of birth" type="date" value={f.date_of_birth} onChange={upd("date_of_birth")} testid="athlete-dob" required />
                <TextField label="Gender (optional)" value={f.gender} onChange={upd("gender")} testid="athlete-gender" />
                <TextField label="City / area" value={f.city} onChange={upd("city")} testid="athlete-city" />
              </Grid>
              <TextArea label="Disability / mobility notes" value={f.disability} onChange={upd("disability")} testid="athlete-disability" required rows={3} />
            </FieldGroup>

            <FieldGroup title="Parent / guardian">
              <Grid>
                <TextField label="Guardian full name" value={f.guardian_name} onChange={upd("guardian_name")} testid="guardian-name" required />
                <TextField label="Guardian phone" value={f.guardian_phone} onChange={upd("guardian_phone")} testid="guardian-phone" required />
              </Grid>
              <TextField label="Guardian email" type="email" value={f.guardian_email} onChange={upd("guardian_email")} testid="guardian-email" required />
            </FieldGroup>

            <TextArea label="Anything else we should know?" value={f.notes} onChange={upd("notes")} testid="athlete-notes" rows={3} />

            <label className="flex items-start gap-3 cursor-pointer" data-testid="consent-wrap">
              <input
                type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-2 border-border text-accent focus:ring-accent"
                data-testid="athlete-consent"
              />
              <span className="text-sm text-foreground/80">
                I am the parent / legal guardian of this athlete and I consent to their participation in Langa Scorpions programs and to being contacted by the team.
              </span>
            </label>

            <button type="submit" disabled={loading} className="btn-accent w-full !py-4 text-base" data-testid="athlete-submit">
              {loading ? "Submitting…" : "Submit registration"}
            </button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}

const FieldGroup = ({ title, children }) => (
  <div>
    <div className="eyebrow mb-4">{title}</div>
    <div className="space-y-4">{children}</div>
  </div>
);
const Grid = ({ children }) => <div className="grid md:grid-cols-2 gap-4">{children}</div>;
const baseInput = "w-full px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none";
const TextField = ({ label, value, onChange, testid, type = "text", required }) => (
  <div>
    <label className="block text-sm font-semibold text-primary mb-2">{label}{required && <span className="text-accent"> *</span>}</label>
    <input type={type} value={value} onChange={onChange} required={required} className={baseInput} data-testid={testid} />
  </div>
);
const TextArea = ({ label, value, onChange, testid, required, rows = 4 }) => (
  <div>
    <label className="block text-sm font-semibold text-primary mb-2">{label}{required && <span className="text-accent"> *</span>}</label>
    <textarea rows={rows} value={value} onChange={onChange} required={required} className={baseInput} data-testid={testid} />
  </div>
);
