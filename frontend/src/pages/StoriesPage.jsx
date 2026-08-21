import React, { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { Quote } from "lucide-react";

export default function StoriesPage() {
  const [stories, setStories] = useState([]);
  useEffect(() => { api.get("/public/stories").then((r) => setStories(r.data)).catch(() => {}); }, []);

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="stories-hero">
        <div className="container-app max-w-4xl">
          <div className="eyebrow mb-4">Impact &amp; stories</div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-6">
            The scoreboard tells one story. The court tells a bigger one.
          </h1>
          <p className="text-xl text-foreground/80 leading-relaxed">
            Meet the young people behind the jerseys, their journeys, their setbacks, and the wins
            that don&apos;t always show up in a box score.
          </p>
        </div>
      </section>

      <section className="pb-24" data-testid="stories-list">
        <div className="container-app grid md:grid-cols-2 gap-8">
          {stories.map((s, i) => (
            <article key={s.id} className="card-soft overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 60}ms` }} data-testid={`story-${s.id}`}>
              {s.image_url && <img src={s.image_url} alt={s.athlete_name || s.title} className="w-full aspect-[4/3] object-contain bg-white" />}
              <div className="p-8">
                <div className="eyebrow mb-3">{s.athlete_name}</div>
                <h2 className="text-2xl font-bold text-primary mb-2">{s.title}</h2>
                {s.subtitle && <p className="text-foreground/70 italic mb-4">{s.subtitle}</p>}
                <Quote className="w-6 h-6 text-accent mb-3" />
                <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{s.body}</p>
              </div>
            </article>
          ))}
          {stories.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-16">Stories coming soon.</div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
