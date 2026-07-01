# StockPilot

A modular full-stack Warehouse Management System built with Next.js 14, Prisma, PostgreSQL, and Redis.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v5 (credentials + RBAC)
- **Queue**: BullMQ + Redis
- **Barcode**: @bwip-js (generation), quagga2 (camera scan)
- **Shipping**: Shippo SDK
- **Testing**: Jest + Playwright

## Quick Start (Docker Compose)

```bash
# Clone and configure
git clone https://github.com/nelsonthegr8/stockpilot.git
cd stockpilot
cp .env.example .env
```

Edit `.env` and set:
- `NEXTAUTH_SECRET` — any random 32+ character string

> **Accessing from other devices on your network:** No extra configuration needed. The app automatically detects the host from each request. Just navigate to `http://<your-server-ip>:3000` from any device on the same network.
>
> **Running without Docker (bare metal):** Set `NEXTAUTH_URL=http://<your-server-ip-or-domain>:3000` in your `.env` file so NextAuth knows the canonical URL.

```bash
# Start all services
docker compose up -d

# Run migrations + seed (uses the builder stage which has full node_modules)
docker compose --profile migrate run --rm migrate

# Open http://<your-server-ip>:3000
# Login: admin@stockpilot.dev / admin123
```

## Manual Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, REDIS_URL

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — login with `admin@stockpilot.dev` / `admin123`.

## Development with Docker Compose

```bash
# Start with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# View logs
docker compose logs -f app
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Jest unit tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:generate` | Regenerate Prisma client |

## Business Profile Types

| Type | Description |
|------|-------------|
| `3D_PRINT` | Print-on-demand or pre-printed finished goods |
| `RETAIL_ARBITRAGE` | Sourced from retail stores, tracks purchase price vs sell |
| `DROP_SHIP` | Supplier-fulfilled, no physical stock |
| `WHOLESALE` | Standard bulk stocked inventory |

## User Roles

| Role | Access |
|------|--------|
| `ADMIN` | Full access including user management |
| `MANAGER` | Full operations, no user management |
| `PICKER_PACKER` | Inventory, picking, shipping only |
| `VIEWER` | Read-only access |

## Environment Variables

See `.env.example` for the full list. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Min 32 character random secret
- `NEXTAUTH_URL` — App URL (e.g., `http://localhost:3000`)
- `REDIS_URL` — Redis connection string

## Features

- **Products & SKUs** — 3-tier hierarchy (Product → Variant → SKU) with business profile-specific fields
- **Barcode** — Code128 barcode generation; 1.5"×1.5" thermal label PDF generation
- **Inventory** — Multi-location inventory levels, adjustments, cycle counts
- **Receiving** — PO-based or ad-hoc receiving with partial receive support
- **Orders** — Multi-channel order management with automatic routing logic
- **Print Queue** — 3D print job management with optional BambuBuddy integration
- **Picking** — Pick lists with scan-each-unit or qty-confirm modes; USB scanner support
- **Shipping** — Shippo rate shopping + label purchase, or manual tracking entry
- **Analytics** — Revenue dashboard, SKU P&L, channel profitability, CSV export
- **Channels** — Shopify, Etsy, Amazon, eBay integrations
- **Settings** — Printers, BambuBuddy, operator buttons, user management

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, invite pages
│   ├── (dashboard)/     # All dashboard pages
│   └── api/             # Route handlers
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── dashboard/       # Layout components
│   └── barcode/         # Barcode components
├── lib/                 # Service layer
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   ├── orderRouting.ts  # Order routing logic
│   ├── bambubuddy.ts    # BambuBuddy integration
│   ├── shippo.ts        # Shippo wrapper
│   └── channels/        # Sales channel integrations
└── store/               # Zustand stores
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Database seed
```

## CI/CD

- **CI** (`ci.yml`): Runs on all pushes/PRs — type check → lint → tests → build
- **Release** (`release.yml`): Runs on merge to `main` — full CI + Docker build + GitHub Release

## License

Private — All rights reserved.
