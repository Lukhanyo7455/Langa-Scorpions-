import React, { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { Calendar, MapPin, Trophy, Users, Sparkles } from "lucide-react";

const KIND_META = {
  practice: { label: "Practice", color: "bg-primary/10 text-primary", icon: Users },
  game: { label: "Game", color: "bg-accent/15 text-accent-700", icon: Trophy },
  community: { label: "Community", color: "bg-primary-50 text-primary-700", icon: Users },
};

const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  useEffect(() => { api.get("/public/events").then((r) => setEvents(r.data)).catch(() => {}); }, []);

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="events-hero">
        <div className="container-app max-w-4xl">
          <div className="eyebrow mb-4">Events &amp; training</div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-6">
            Come see us play. Come train with us.
          </h1>
          <p className="text-xl text-foreground/80 leading-relaxed">
            Practices, matches, and community events. Everyone is welcome — bring a friend, bring the family.
          </p>
        </div>
      </section>

      <section className="pb-16" data-testid="events-list">
        <div className="container-app grid gap-6">
          {events.map((e) => {
            const meta = KIND_META[e.kind] || KIND_META.practice;
            const Icon = meta.icon;
            const featured = !!e.image_url;
            return (
              <article
                key={e.id}
                className={`card-soft overflow-hidden ${featured ? "grid md:grid-cols-2 gap-0" : "p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6"}`}
                data-testid={`event-${e.id}`}
              >
                {featured && (
                  <div className="relative">
                    <img src={e.image_url} alt={e.title} className="w-full h-full object-cover aspect-[4/3] md:aspect-auto md:min-h-[280px]" />
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full bg-accent text-white shadow-lg">
                        <Sparkles className="w-3 h-3" /> Launching soon
                      </span>
                    </div>
                  </div>
                )}
                <div className={featured ? "p-8 md:p-10 flex flex-col justify-center" : "flex-1 flex items-start md:items-center gap-6 w-full"}>
                  {!featured && (
                    <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${meta.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs uppercase tracking-widest font-semibold px-2 py-1 rounded ${meta.color}`}>{meta.label}</span>
                    </div>
                    <h3 className={`font-bold text-primary mb-2 ${featured ? "text-3xl md:text-4xl" : "text-2xl"}`}>{e.title}</h3>
                    {e.description && <p className="text-foreground/70 mb-3 leading-relaxed">{e.description}</p>}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" />{fmt(e.starts_at)}</span>
                      <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" />{e.location}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {events.length === 0 && (
            <div className="text-center text-muted-foreground py-16">No events scheduled yet. Check back soon.</div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="container-app mt-10">
          <div className="rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 p-6 md:p-8 text-center" data-testid="events-disclaimer">
            <div className="inline-flex items-center gap-2 text-accent font-semibold text-sm uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" /> More coming
            </div>
            <p className="text-foreground/80 text-base md:text-lg max-w-2xl mx-auto">
              Future games, tournaments, and community events will be shared here as they&apos;re confirmed.
              Follow us on social media or subscribe to our newsletter so you don&apos;t miss a fixture.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
