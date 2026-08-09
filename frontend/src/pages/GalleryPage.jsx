import React, { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { api } from "@/lib/api";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/public/gallery").then((r) => setItems(r.data)).catch(() => {}); }, []);

  return (
    <PublicLayout>
      <section className="section-pad" data-testid="gallery-hero">
        <div className="container-app max-w-4xl">
          <div className="eyebrow mb-4">Gallery</div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary leading-tight mb-6">
            Moments from the court &amp; the community.
          </h1>
        </div>
      </section>

      <section className="pb-24" data-testid="gallery-grid">
        <div className="container-app">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
            {items.map((g, i) => (
              <figure key={g.id} className="mb-6 break-inside-avoid rounded-2xl overflow-hidden shadow-sm animate-fade-up" style={{ animationDelay: `${i * 40}ms` }} data-testid={`gallery-item-${g.id}`}>
                <img src={g.image_url} alt={g.caption || "Langa Scorpions"} className="w-full h-auto" loading="lazy" />
              </figure>
            ))}
          </div>
          {items.length === 0 && (
            <div className="text-center text-muted-foreground py-16">More photos coming soon.</div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
