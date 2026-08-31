# Waypoint

**Waypoint** is a location-aware errand and journey planner built for campus life. You tell it what you need to do and where — a print shop, a stationery store, the canteen — and Waypoint watches your live GPS position in the background. The moment you physically walk into range of that location, it pops up the reminder, so you never forget an errand just because you weren't thinking about it at the right place.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Supabase** (Postgres + Auth + Row Level Security), and **Leaflet** on free OpenStreetMap tiles.

**Live app:** https://waypoint-one-kappa.vercel.app

---

## The problem

Errand reminders that fire at a *time* are easy to ignore or dismiss and forget again. Waypoint reminds you at a *place* instead — the moment you're standing where the errand can actually be done, not two hours earlier while you're still in class.

---

## Features

### 1. Authentication
Email/password signup, login, and logout via Supabase Auth. Every user's data is isolated with Postgres Row Level Security — one account can never read or modify another's errands, locations, or quests.

### 2. Errands (core CRUD entity)
Create, edit, complete, and delete errands. Each errand can carry **one or more geofenced locations** — so a single errand like "buy medicine" can be tied to two different pharmacies, and Waypoint will remind you at whichever one you reach first.

### 3. Live Geofence Map (core business flow)
The `/map` view tracks your live position with the browser's Geolocation API and continuously checks your distance (via the Haversine formula) against every active errand location and the current quest stop. Cross into a configured radius and Waypoint fires an in-app toast and a browser notification — the actual "walk in, get reminded" journey the whole product exists for.

### 4. Search-to-pin location picker
Instead of hunting for the right spot on a bare map, type a place name and Waypoint geocodes it (via `leaflet-geosearch` against OpenStreetMap's Nominatim, biased to India) and drops the pin for you. Map defaults to the MICA campus area in Ahmedabad rather than a generic US location.

### 5. Quests — chained, sequential errands
A Quest is an ordered chain of stops — a "journey" rather than a single errand. Reach stop 1 and it unlocks (reveals the location of) stop 2, and so on, with a progress bar and a completion celebration at the end. Useful for multi-step trips like "library → printing → submission office" where you don't want to see the whole route until you've earned it.

---

## Tech Stack

- **Framework**: [Next.js 14.2.5](https://nextjs.org/) (App Router, static export)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) primitives + [Lucide React](https://lucide.dev/) icons
- **Backend**: [Supabase](https://supabase.com/) — Postgres database, email/password Auth, Row Level Security policies scoped per user
- **Maps**: [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) on free OpenStreetMap tiles (no API key required)
- **Geocoding**: [leaflet-geosearch](https://github.com/smeijer/leaflet-geosearch) using the OpenStreetMap Nominatim provider
- **Location & alerts**: Browser Geolocation API (`watchPosition`) + Notifications API, with Haversine distance for radius checks
- **Hosting**: [Vercel](https://vercel.com/)

---

## Data Model

- `errands` — id, user_id, title, note, is_done, created_at
- `errand_locations` — id, errand_id (FK), label, lat, lng, radius_m — one-to-many, enabling multi-location errands
- `quests` — id, user_id, title, note, created_at
- `quest_stops` — id, quest_id (FK), order_index, title, note, lat, lng, radius_m, is_done — ordered, sequential stops

All child tables enforce access control via RLS policies that check ownership through their parent record, not just a direct `user_id` column.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18.17 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- A [Supabase](https://supabase.com/) project (free tier is enough)

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.local.example .env.local
   ```
2. Fill in your Supabase project's API URL and anon key (found in Supabase → Project Settings → API — **not** the dashboard page URL):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```
3. Run the SQL migrations in `supabase/migrations/` (in order) via the Supabase SQL Editor to create the `errands`, `errand_locations`, `quests`, and `quest_stops` tables with their RLS policies.

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For the geofencing flow, allow location permissions when prompted, and test over a real GPS signal (or use the in-app dev "Simulate" control) rather than desktop wifi-based location.

---

## Project Structure

```text
waypoint/
├── src/
│   ├── app/
│   │   ├── login/, signup/     # Auth pages
│   │   ├── errands/            # Errands CRUD + multi-location picker
│   │   ├── quests/             # Quests list, creation, and detail timeline
│   │   ├── map/                # Live geofence tracking map (core business flow)
│   │   └── layout.tsx          # Root layout, header, bottom tab bar
│   ├── components/
│   │   ├── auth/                # AuthProvider, AuthGuard
│   │   ├── errands/              # ErrandModal, LocationPickerMap, MultiLocationPickerMap, MapSearchBox
│   │   ├── quests/               # QuestModal, QuestDetailView
│   │   ├── map/                  # LiveGeofenceMap
│   │   └── ui/                   # shadcn/ui primitives
│   └── lib/
│       ├── supabase/              # Supabase client config
│       ├── services/               # Data-access functions per entity
│       └── constants/map.ts        # Default map center (MICA, Ahmedabad) & zoom
├── supabase/migrations/            # SQL migrations, applied in order
├── .env.local.example
└── package.json
```

---

## Known Issues

- Geolocation accuracy depends on the device and signal — indoor GPS can be noisy, so radii are tuned generously (tens of meters) rather than pinpoint-precise.
- Background tracking only runs while the `/map` tab is open in the browser; there's no native background service worker push yet.
- Nominatim's free geocoding tier is rate-limited, so very rapid repeated searches may briefly throttle.
