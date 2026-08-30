# Waypoint

**Waypoint** is a mobile-first errand navigation and route management web application built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and **Supabase**.

It helps users manage daily errands, organize stop priority, and visualize optimal navigation routes on an interactive mobile layout.

---

## Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with CSS variables for dark/light themes
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) design system primitives & [Lucide React](https://lucide.dev/) icons
- **Backend & DB**: [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction) (`@supabase/supabase-js`)

---

## Features & Architecture

- **Mobile-First Layout**: Fixed top application header featuring "Waypoint" app branding and notifications, paired with a fixed mobile bottom tab bar.
- **Errands Tab (`/errands`)**: Interactive errands checklist with status filtering (All, Pending, In Progress, Completed), instant search, priority tagging, and Supabase client connection status.
- **Map Tab (`/map`)**: Route visualization canvas with location markers, navigation controls, distance & ETA calculations, and waypoint detail cards.
- **Supabase Integration**: Centralized Supabase JS client configuration reading `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.17 or higher
- [npm](https://www.npmjs.com/) v9 or higher

---

### Environment Setup

1. Create a local environment file named `.env.local` in the project root directory (or copy `.env.local.example`):

```bash
cp .env.local.example .env.local
```

2. Open `.env.local` and add your Supabase project URL and anonymous API key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
```

> **Note**: `.env.local` is listed in `.gitignore` to ensure credentials remain secure and are not committed to version control.

---

### Local Development

1. **Install dependencies**:

```bash
npm install
```

2. **Start the development server**:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your mobile browser or browser Developer Tools (Mobile View) to experience the app.

---

## Project Structure

```text
waypoint/
├── src/
│   ├── app/
│   │   ├── errands/        # Errands tab page view
│   │   ├── map/            # Map & navigation tab page view
│   │   ├── globals.css     # Tailwind CSS base & shadcn color tokens
│   │   ├── layout.tsx      # Root layout with AppHeader and BottomTabBar
│   │   └── page.tsx        # Redirects to /errands
│   ├── components/
│   │   ├── layout/         # AppHeader & BottomTabBar navigation components
│   │   └── ui/             # Custom shadcn UI components (Button, Card, Badge)
│   └── lib/
│       ├── supabase/       # Supabase client initialization (client & server)
│       └── utils.ts        # Tailwind merge utility helper (cn)
├── .env.local.example      # Environment variable template
├── .gitignore              # Git ignore rules (including .env.local)
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and npm scripts
└── README.md               # Project documentation
```
