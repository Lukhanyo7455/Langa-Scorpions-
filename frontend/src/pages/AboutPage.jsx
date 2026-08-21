import React from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { HeartHandshake, Target, Sparkles, Trophy } from "lucide-react";

const VALUES = [
  { icon: HeartHandshake, title: "Inclusion first", body: "Every young person deserves a team, a coach, and a chance to compete." },
  { icon: Target, title: "Excellence with heart", body: "We train seriously — and we celebrate every single win, big or small." },
  { icon: Sparkles, title: "Whole-person growth", body: "Sport is our vehicle; confidence, life skills, and community are our destination." },
  { icon: Trophy, title: "Pathways to more", body: "We open doors to provincial competition, education, and employment." },
];

const TEAM = [
  { name: "Lukhanyo Mdunyelwa", role: "Founder & Chairperson" },
  { name: "Charisma Van Eck", role: "Administrative Coordinator" },
  { name: "Ralph Reynolds", role: "Head Coach, Men's Team (Wheelchair Basketball)" },
  { name: "Rebecca Cullum", role: "Strength & Conditioning · Head Coach, Women's Team (Wheelchair Basketball)" },
  { name: "Ralph Williams", role: "Assistant Coach" },
  { name: "Yolanda Dlakhulu", role: "Assistant Coach, Women's Team (Wheelchair Basketball)" },
  { name: "Lubabalo Ndzaba", role: "Ambassador" },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <section className="section-pad" data-testid="about-hero">
        <div className="container-app max-w-4xl">
          <div className="eyebrow mb-4">About us</div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6 leading-tight">
            A team built in Langa, for young people who refuse to sit out.
          </h1>
          <p className="text-xl text-foreground/80 leading-relaxed">
            Langa Scorpions Adaptive Sports &amp; Development started as an idea in 2025 and became a reality in January 2026.
            Founded by Lukhanyo Mdunyelwa, the organisation was built on the belief that disability should never be a barrier to sport.
            We believe in equality and that everyone deserves the opportunity to participate, grow, and thrive through sport.
            Today, Langa Scorpions continues to create inclusive sporting opportunities for people with disabilities and inspire the next generation of adaptive athletes.
          </p>
        </div>
      </section>

      <section className="pb-20" data-testid="about-values">
        <div className="container-app">
          <div className="grid md:grid-cols-2 gap-6">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card-soft p-8">
                <div className="w-12 h-12 rounded-2xl bg-accent-50 text-accent grid place-items-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">{title}</h3>
                <p className="text-foreground/70 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-primary text-white" data-testid="about-team">
        <div className="container-app">
          <div className="eyebrow !text-accent mb-3">Our team</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-10">Our Team</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {TEAM.map((p) => (
              <div key={p.name} className="rounded-2xl border border-white/15 p-6 bg-white/5">
                <div className="w-14 h-14 rounded-full bg-accent text-white grid place-items-center font-bold text-lg mb-4">
                  {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="font-semibold text-lg">{p.name}</div>
                <div className="text-sm text-white/70">{p.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
