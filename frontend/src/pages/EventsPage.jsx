import React, { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { Calendar, MapPin, Trophy, Users } from "lucide-react";

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

      <section className="pb-24" data-testid="events-list">
        <div className="container-app grid gap-4">
          {events.map((e) => {
            const meta = KIND_META[e.kind] || KIND_META.practice;
            const Icon = meta.icon;
            return (
              <article key={e.id} className="card-soft p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6" data-testid={`event-${e.id}`}>
                <div className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${meta.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs uppercase tracking-widest font-semibold px-2 py-1 rounded ${meta.color}`}>{meta.label}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-primary mb-2">{e.title}</h3>
                  {e.description && <p className="text-foreground/70 mb-3">{e.description}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" />{fmt(e.starts_at)}</span>
                    <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" />{e.location}</span>
                  </div>
                </div>
              </article>
            );
          })}
          {events.length === 0 && (
            <div className="text-center text-muted-foreground py-16">No events scheduled yet. Check back soon.</div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
