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

## Deferred / Backlog
- **P0**: Live Stripe checkout for donations (user selected "Skip for now" alongside Stripe). Currently donations are captured as pledges. Backend has a clear insertion point in POST /api/public/donations.
- **P1**: Transactional email confirmations (Resend) for donation pledges, registrations, contact acknowledgments.
- **P1**: Object Storage for admin-side image uploads (currently URL-only for gallery/stories).
- **P2**: PayFast / Yoco (SA-local payments), PayPal.
- **P2**: Multi-language support (isiXhosa, Afrikaans).
- **P2**: Athlete portal with training resources; coach app; WhatsApp integration (Twilio); merchandise store; grant/report tools.

## Test Credentials
See `/app/memory/test_credentials.md`.

## Architecture
- Backend: FastAPI + MongoDB (Motor). Env-driven config; JWT (12h) via cookie + Bearer fallback; bcrypt password hashing; startup seed for admin & sample content.
- Frontend: React 19 + Tailwind + Shadcn UI + Sonner toasts + Axios. AuthContext (session probe on mount). Routes under `/admin` protected by `AdminGuard`.
