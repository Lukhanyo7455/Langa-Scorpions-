import React from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { Check, ArrowRight, Clock, MapPin } from "lucide-react";

const IMG = "https://customer-assets-agu9un31.emergentagent.net/job_adaptive-sports-3/artifacts/x7lgbcdq_753812518_4144571109168312_4658145872786109362_n.webp";

const INCLUDED = [
  "Structured practices",
  "Provided sports wheelchairs — no equipment needed to start",
  "Certified coaching in adaptive basketball fundamentals",
  "Strength &amp; conditioning tailored to each athlete",
  "Life-skills workshops (goal setting, communication, financial basics)",
  "Team travel to friendly matches &amp; provincial tournaments",
];

export default function ProgramsPage() {
  return (
    <PublicLayout>
      <section className="section-pad" data-testid="programs-hero">
        <div className="container-app grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">Programs</div>
            <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-6">
              Wheelchair Basketball
            </h1>
            <p className="text-lg text-foreground/80 mb-8 leading-relaxed">
              Our founding program — a full season of coaching, competition, and community for young
              athletes with disabilities aged 16 to 35. Every athlete is welcome, at every level.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn-accent" data-testid="program-register-btn">
                Register an athlete <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/donate" className="btn-outline-primary" data-testid="program-donate-btn">
                Fund the program
              </Link>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <img src={IMG} alt="Langa Scorpions team celebrating in their red-and-black kit at the community sports hall" className="w-full aspect-[4/3] object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20" data-testid="programs-included">
        <div className="container-app">
          <div className="card-soft p-8 md:p-12 grid md:grid-cols-2 gap-6">
            <div>
              <div className="eyebrow mb-3">What&apos;s included</div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Everything an athlete needs.</h2>
            </div>
            <ul className="space-y-3">
              {INCLUDED.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-1 w-6 h-6 rounded-full bg-accent/10 text-accent grid place-items-center shrink-0">
                    <Check className="w-4 h-4" />
                  </span>
                  <span className="text-foreground/80" dangerouslySetInnerHTML={{ __html: t }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section-pad bg-primary text-white" data-testid="programs-schedule">
        <div className="container-app">
          <div className="eyebrow !text-accent mb-3">Weekly schedule</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-8">When we train.</h2>
          <div className="grid md:grid-cols-1 gap-6 max-w-xl">
            {[
              { day: "Sundays", time: "16:00 – 19:00", loc: "Langa Community Sports Hall" },
            ].map((s) => (
              <div key={s.day} className="rounded-2xl border border-white/15 p-8 bg-white/5">
                <div className="text-2xl font-bold mb-3">{s.day}</div>
                <div className="flex items-center gap-2 text-white/85 mb-2"><Clock className="w-4 h-4 text-accent" /> {s.time}</div>
                <div className="flex items-center gap-2 text-white/85"><MapPin className="w-4 h-4 text-accent" /> {s.loc}</div>
              </div>
            ))}
          </div>
          <p className="text-white/70 text-sm mt-6">
            Future programs coming soon: adaptive athletics, swim, and boccia. Want to help us launch the next one? <Link to="/contact" className="underline text-accent">Get in touch.</Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
