import React, { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { User, Users } from "lucide-react";

export default function RegisterAthletePage() {
  const [mode, setMode] = useState("adult"); // "adult" | "minor"
  const [f, setF] = useState({
    athlete_name: "", date_of_birth: "", gender: "", disability: "",
    email: "", phone: "",
    guardian_name: "", guardian_email: "", guardian_phone: "",
    city: "Cape Town", program: "Wheelchair Basketball", notes: "", consent: false,
  });
  const [loading, setLoading] = useState(false);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target?.value ?? e });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.consent) { toast.error("Please tick the consent box to register."); return; }
    setLoading(true);
    const payload = { ...f, is_minor: mode === "minor" };
    if (mode === "adult") {
      payload.guardian_name = null;
      payload.guardian_email = null;
      payload.guardian_phone = null;
    } else {
      payload.email = null;
      payload.phone = null;
    }
    // Coerce any empty strings on optional fields to null so Pydantic EmailStr validators pass
    ["email", "guardian_email", "phone", "guardian_phone", "guardian_name", "gender", "city", "notes"].forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    try {
      await api.post("/public/athletes", payload);
      toast.success("Registration received! We'll be in touch within 3 working days.");
      setF({ ...f, athlete_name: "", date_of_birth: "", disability: "", email: "", phone: "", guardian_name: "", guardian_email: "", guardian_phone: "", notes: "", consent: false });
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
            Register for our Wheelchair Basketball program. A coach will contact you within 3 working days to arrange a first practice visit.
          </p>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-3 mb-8" role="radiogroup" aria-label="Registration type" data-testid="register-mode">
            <button
              type="button" role="radio" aria-checked={mode === "adult"}
              onClick={() => setMode("adult")}
              className={`p-5 rounded-2xl border-2 text-left transition-colors duration-150 ${
                mode === "adult" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}
              data-testid="mode-adult"
            >
              <User className={`w-6 h-6 mb-2 ${mode === "adult" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="font-heading font-bold text-primary text-lg">Adult (18+)</div>
              <div className="text-xs text-muted-foreground mt-1">I&apos;m registering myself.</div>
            </button>
            <button
              type="button" role="radio" aria-checked={mode === "minor"}
              onClick={() => setMode("minor")}
              className={`p-5 rounded-2xl border-2 text-left transition-colors duration-150 ${
                mode === "minor" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}
              data-testid="mode-minor"
            >
              <Users className={`w-6 h-6 mb-2 ${mode === "minor" ? "text-accent" : "text-muted-foreground"}`} />
              <div className="font-heading font-bold text-primary text-lg">Under 18</div>
              <div className="text-xs text-muted-foreground mt-1">Parent / guardian is registering a child.</div>
            </button>
          </div>

          <form onSubmit={submit} className="card-soft p-8 md:p-10 space-y-6" data-testid="athlete-form">
            <FieldGroup title="Athlete details">
              <Grid>
                <TextField label={mode === "minor" ? "Athlete full name" : "Your full name"} value={f.athlete_name} onChange={upd("athlete_name")} testid="athlete-name" required />
                <TextField label="Date of birth" type="date" value={f.date_of_birth} onChange={upd("date_of_birth")} testid="athlete-dob" required />
                <TextField label="Gender (optional)" value={f.gender} onChange={upd("gender")} testid="athlete-gender" />
                <TextField label="City / area" value={f.city} onChange={upd("city")} testid="athlete-city" />
              </Grid>
              <TextArea label="Disability / mobility notes" value={f.disability} onChange={upd("disability")} testid="athlete-disability" required rows={3} />
            </FieldGroup>

            {mode === "adult" ? (
              <FieldGroup title="Your contact details">
                <Grid>
                  <TextField label="Email" type="email" value={f.email} onChange={upd("email")} testid="athlete-email" required />
                  <TextField label="Phone" value={f.phone} onChange={upd("phone")} testid="athlete-phone" required />
                </Grid>
              </FieldGroup>
            ) : (
              <FieldGroup title="Parent / guardian details">
                <Grid>
                  <TextField label="Guardian full name" value={f.guardian_name} onChange={upd("guardian_name")} testid="guardian-name" required />
                  <TextField label="Guardian phone" value={f.guardian_phone} onChange={upd("guardian_phone")} testid="guardian-phone" required />
                </Grid>
                <TextField label="Guardian email" type="email" value={f.guardian_email} onChange={upd("guardian_email")} testid="guardian-email" required />
              </FieldGroup>
            )}

            <TextArea label="Anything else we should know?" value={f.notes} onChange={upd("notes")} testid="athlete-notes" rows={3} />

            <label className="flex items-start gap-3 cursor-pointer" data-testid="consent-wrap">
              <input
                type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-2 border-border text-accent focus:ring-accent"
                data-testid="athlete-consent"
              />
              <span className="text-sm text-foreground/80">
                {mode === "adult"
                  ? "I confirm that I am 18 or older and I consent to my participation in Langa Scorpions programs and to being contacted by the team."
                  : "I am the parent or legal guardian of this athlete and I consent to their participation in Langa Scorpions programs and to being contacted by the team."}
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
