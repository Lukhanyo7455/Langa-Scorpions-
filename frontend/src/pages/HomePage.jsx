import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { ArrowRight, Heart, Trophy, Users, HandHeart, Sparkles, Quote, Calendar, Hexagon, Circle, Diamond, Square } from "lucide-react";

const HERO_IMG = "https://customer-assets-agu9un31.emergentagent.net/job_adaptive-sports-3/artifacts/1m64lh18_683848679_17860667106686930_4862815288554787130_n.jpg";
const PROGRAM_IMG = "https://images.unsplash.com/photo-1679306352618-136e6fdfd450?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHw0fHx3aGVlbGNoYWlyJTIwYmFza2V0YmFsbHxlbnwwfHx8fDE3ODU5NjgwMTF8MA&ixlib=rb-4.1.0&q=85";

export default function HomePage() {
  const [impact, setImpact] = useState({ athletes: 24, volunteers: 18, programs: 1, events_upcoming: 3 });
  const [stories, setStories] = useState([]);
  const [events, setEvents] = useState([]);
  const [sponsors, setSponsors] = useState([]);

  useEffect(() => {
    api.get("/public/impact").then((r) => setImpact(r.data)).catch(() => {});
    api.get("/public/stories").then((r) => setStories(r.data.slice(0, 2))).catch(() => {});
    api.get("/public/events").then((r) => setEvents(r.data.slice(0, 3))).catch(() => {});
    api.get("/public/sponsors").then((r) => setSponsors(r.data)).catch(() => {});
  }, []);

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden" data-testid="home-hero">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="The Langa Scorpions team celebrating on the court" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/50" />
        </div>
        <div className="container-app relative py-28 md:py-40 lg:py-48 text-white animate-fade-up">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-[0.18em] mb-8 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Adaptive sports for young people in Langa
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[0.98] mb-6">
              Sport that <span className="text-accent">rewrites</span> what's possible.
            </h1>
            <p className="text-lg md:text-xl text-white/85 max-w-2xl leading-relaxed mb-10">
              Langa Scorpions empowers young persons with disabilities through wheelchair basketball,
              life skills, and community &mdash; building confidence on and off the court.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/donate" className="btn-accent" data-testid="hero-donate-btn">
                <Heart className="w-4 h-4" /> Donate
              </Link>
              <Link to="/register" className="btn-outline-white" data-testid="hero-register-btn">
                Register an athlete <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/volunteer" className="btn-outline-white" data-testid="hero-volunteer-btn">
                Volunteer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section className="section-pad" data-testid="home-impact">
        <div className="container-app">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Users, label: "Athletes in program", value: `${Math.max(impact.athletes || 0, 30)}+` },
              { icon: HandHeart, label: "Active volunteers", value: impact.volunteers },
              { icon: Trophy, label: "Programs running", value: impact.programs },
              { icon: Calendar, label: "Upcoming events", value: impact.events_upcoming },
            ].map(({ icon: Icon, label, value }, i) => (
              <div key={label} className="card-soft p-8 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <Icon className="w-7 h-7 text-accent mb-4" />
                <div className="text-4xl font-heading font-bold text-primary">{value}</div>
                <div className="text-sm text-muted-foreground mt-2">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAM SPOTLIGHT */}
      <section className="section-pad bg-primary text-white" data-testid="home-program">
        <div className="container-app grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <img src={PROGRAM_IMG} alt="Group of adaptive athletes playing basketball" className="w-full h-full object-cover aspect-[4/3]" />
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="eyebrow !text-accent mb-4">Our first program</div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">Wheelchair Basketball</h2>
            <p className="text-white/85 text-lg leading-relaxed mb-6">
              Structured weekly practices, competitive matches, and mentorship for young persons with
              disabilities aged 12–25. Chairs and equipment are provided — all we ask is your commitment.
            </p>
            <ul className="space-y-3 text-white/85 mb-8">
              {["Free coaching from experienced adaptive-sport coaches", "Provided sports wheelchairs and gear", "Life-skills workshops and mentorship", "Pathway to provincial and national competition"].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />{t}
                </li>
              ))}
            </ul>
            <Link to="/programs" className="btn-accent" data-testid="programs-cta">
              Learn about the program <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section className="section-pad" data-testid="home-stories">
        <div className="container-app">
          <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
            <div>
              <div className="eyebrow mb-3">Athlete stories</div>
              <h2 className="text-4xl md:text-5xl font-bold text-primary">Every athlete has a spark.</h2>
            </div>
            <Link to="/stories" className="text-primary font-semibold inline-flex items-center gap-2 hover:text-accent">
              All stories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {stories.map((s) => (
              <article key={s.id} className="card-soft overflow-hidden" data-testid={`story-card-${s.id}`}>
                {s.image_url && <img src={s.image_url} alt={s.athlete_name || s.title} className="w-full aspect-[4/3] object-cover" />}
                <div className="p-8">
                  <div className="eyebrow mb-3">{s.athlete_name}</div>
                  <h3 className="text-2xl font-bold text-primary mb-2">{s.title}</h3>
                  {s.subtitle && <p className="text-foreground/70 italic mb-4">{s.subtitle}</p>}
                  <Quote className="w-6 h-6 text-accent mb-3" />
                  <p className="text-foreground/80 leading-relaxed line-clamp-4">{s.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="section-pad bg-accent text-white" data-testid="home-cta">
        <div className="container-app text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Your support builds the team.</h2>
          <p className="text-lg text-white/90 mb-8">
            R500 covers a month of transport for one athlete. R2 500 sponsors gear for the whole practice.
            Every rand goes back into our young people.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/donate" className="btn-primary-solid" data-testid="cta-donate-btn">Donate now</Link>
            <Link to="/contact" className="btn-outline-white" data-testid="cta-partner-btn">Partner with us</Link>
          </div>
        </div>
      </section>

      {/* SPONSORS */}
      {sponsors.length > 0 && (
        <section className="section-pad" data-testid="home-sponsors">
          <div className="container-app">
            <div className="text-center mb-12">
              <div className="eyebrow mb-3">Our partners &amp; sponsors</div>
              <h2 className="text-4xl md:text-5xl font-bold text-primary">In this together.</h2>
              <p className="text-foreground/70 mt-4 max-w-xl mx-auto">
                The organizations and grantors making Scorpions possible — season after season.
              </p>
            </div>
            <SponsorGrid sponsors={sponsors} />
          </div>
        </section>
      )}
    </PublicLayout>
  );
}

const TIER_ICONS = { headline: Diamond, partner: Hexagon, grant: Square, community: Circle };
const TIER_LABEL = { headline: "Headline sponsor", partner: "Partner", grant: "Grant funder", community: "Community" };

function SponsorGrid({ sponsors }) {
  const grouped = sponsors.reduce((acc, s) => {
    (acc[s.tier] = acc[s.tier] || []).push(s);
    return acc;
  }, {});
  const order = ["headline", "partner", "grant", "community"];
  return (
    <div className="space-y-8">
      {order.filter((t) => grouped[t]?.length).map((tier) => {
        const Icon = TIER_ICONS[tier];
        return (
          <div key={tier}>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 text-center">
              {TIER_LABEL[tier]}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {grouped[tier].map((s) => (
                <a
                  key={s.id}
                  href={s.website || "#"}
                  target={s.website ? "_blank" : undefined}
                  rel="noreferrer"
                  className="card-soft p-6 text-center hover:shadow-md transition-shadow duration-200"
                  data-testid={`sponsor-${s.id}`}
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-14 mx-auto mb-3 object-contain" />
                  ) : (
                    <Icon className="w-8 h-8 mx-auto mb-3 text-accent" strokeWidth={1.5} />
                  )}
                  <div className="font-heading font-bold text-primary tracking-wide">{s.name}</div>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
