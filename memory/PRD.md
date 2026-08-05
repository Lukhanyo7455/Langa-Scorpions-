# Langa Scorpions — PRD

## Problem Statement (original)
Non-profit website + admin dashboard for Langa Scorpions Adaptive Sports & Development,
empowering young persons with disabilities through wheelchair basketball, life skills, and social empowerment.
Public site drives donations and sign-ups (athletes, volunteers, newsletter). Admin CMS lets the team
manage content, view registrations, and export data.

## Core Requirements (static)
- Public site: Home, About, Programs (Wheelchair Basketball), Impact & Stories, Events, Gallery, Contact, Donate, Register (athlete), Volunteer.
- Admin dashboard: JWT login, overview stats, tables (donations, athletes, volunteers, messages, newsletter),
  CRUD (events, stories, gallery), CSV exports.
- Warm, hopeful design: deep green (#0B4F3A) + orange (#FF7B40) + cream. Outfit + DM Sans fonts.
- Mobile-first, accessibility-first (WCAG AA).

## User Personas
- Donors / sponsors (individual + corporate)
- Young persons with disabilities + their guardians
- Volunteers / coaches
- Community & media
- Internal admin team

## Implemented (2026-02-06)
- Full public site with all 10 pages (Home, About, Programs, Stories, Events, Gallery, Contact, Donate, Register, Volunteer)
- 6 public form endpoints: donations (pledge), athlete registration (guardian consent enforced), volunteers, contact, newsletter (idempotent on duplicate email).
- JWT-based admin auth (email/password); admin@langascorpions.org seeded idempotently from env.
- Admin dashboard: overview stats + 5 read-only tables + 3 CRUD sections (events, stories, gallery) + settings + CSV export for 5 datasets.
- Design guidelines applied: brand palette, Outfit/DM Sans, pill CTAs, glass-nav header, athlete photography (Unsplash), no gradients on white.
- Placeholder content seeded: 3 events, 2 athlete stories, 3 gallery items, org settings.
- Testing agent iteration 1: 100% backend + 100% frontend pass.

## Implemented (2026-02-06 — Round 2)
- **Sponsor Wall** on home page grouped by tier (headline, partner, grant, community) with Lucide icon fallback for missing logos. Backend seeds 6 partners.
- **Admin Sponsors CMS**: full CRUD with tier selector + logo upload. Row list fixed to show sponsor name/tier.
- **Object Storage image uploads**: reusable `ImageUploader` component wired into Gallery, Stories, and Sponsors admin forms. Backend endpoint `/api/admin/upload` (8MB limit, JPG/PNG/WebP/GIF only, admin-only) + public `/api/files/{path}` streaming with 24h cache.
- **Live Stripe donations (Flow B, test mode)**: `/api/public/donations/checkout` creates a Stripe session; frontend redirects to `checkout.stripe.com`. `/donate/success` polls `/api/public/donations/status/{sid}` and mirrors paid sessions into the `donations` collection so the admin CSV export includes them. Webhook wired at `/api/webhook/stripe`. Pledge flow (contact-me) preserved as second CTA.
- Testing agent iteration 2: 100% backend + 100% frontend pass. Minor CmsPage row-render bug found & fixed by testing agent.

## Deferred / Backlog
- **P1**: Claim a real Stripe account for South African donations. Stripe's Emergent-managed sandbox does not support `ZA` — the app currently uses the platform test key. To go live: user must sign up at stripe.com and set `STRIPE_API_KEY` to their live key, OR wire in PayFast/Yoco for local SA payments.
- **P1**: Transactional email confirmations (Resend) for donation pledges, registrations, contact acknowledgments.
- **P1**: Recurring / monthly donations (requires Stripe Price IDs + subscription mode — currently one-time only).
- **P2**: PayFast / Yoco (SA-local payments), PayPal.
- **P2**: Multi-language support (isiXhosa, Afrikaans).
- **P2**: Athlete portal, coach app, WhatsApp integration, merchandise store.

## Test Credentials
See `/app/memory/test_credentials.md`.

## Architecture
- Backend: FastAPI + MongoDB (Motor). Env-driven config; JWT (12h) via cookie + Bearer fallback; bcrypt password hashing; startup seed for admin & sample content.
- Frontend: React 19 + Tailwind + Shadcn UI + Sonner toasts + Axios. AuthContext (session probe on mount). Routes under `/admin` protected by `AdminGuard`.
