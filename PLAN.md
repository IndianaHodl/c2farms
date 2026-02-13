# C2Farms — Project Plan

## Overview

**C2Farms** is a farm financial planning and management application. It guides users through a 4-step workflow: **Assumptions → Per-Unit → Accounting → Dashboard**, supporting multi-farm operations with QuickBooks integration and export capabilities.

---

## Current Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | React 18, Vite, MUI, AG Grid, Chart.js, Socket.io |
| **Backend** | Express, Prisma, PostgreSQL |
| **Auth** | JWT, bcrypt |
| **Integrations** | QuickBooks OAuth + sync |

---

## Implemented Features

### 1. Authentication & Multi-Farm
- [x] Login / JWT auth
- [x] User roles (`farm_manager`)
- [x] Farm selection (header)
- [x] User–farm roles (`UserFarmRole`)

### 2. Section 1 — Assumptions
- [x] Fiscal year (Nov–Oct default)
- [x] Total acres
- [x] Crops (JSON: acres, target yield, price per unit)
- [x] Bins (JSON)
- [x] Freeze assumptions (`is_frozen`, `frozen_at`)

### 3. Section 2 — Per-Unit
- [x] Monthly per-unit data grid
- [x] `MonthlyData` with `type: 'per_unit'`

### 4. Section 3 — Accounting
- [x] Monthly accounting data
- [x] Financial categories (hierarchical)
- [x] QuickBooks OAuth connect
- [x] QuickBooks sync (expenses)
- [x] QB → category mappings

### 5. Section 4 — Dashboard
- [x] KPIs (yield vs target, inputs adherence, labour cost/acre, machinery uptime, gross margin, cash flow)
- [x] Forecast service
- [x] Charts (Chart.js)

### 6. Exports
- [x] Excel (operating statement)
- [x] PDF (operating statement)

### 7. Infrastructure
- [x] Prisma schema + migrations
- [x] Seed data
- [x] Error handling middleware
- [x] Socket.io (real-time placeholder)

---

## Placeholders & Gaps

| Area | Status | Notes |
|------|--------|------|
| **Agronomy ingestion** | Placeholder | `POST /:farmId/ingest-agronomy` — accepts crop plan data (future) |
| **Inputs adherence** | Mock | Dashboard uses `92` |
| **Machinery uptime** | Mock | Dashboard uses `85` |
| **Fonts (PDF)** | Linux-specific | Liberation/DejaVu paths; may fail on macOS/Windows |

---

## Suggested Roadmap

### Phase 1 — Stabilization
1. Add unit tests (backend routes, forecast logic)
2. Add E2E tests (Playwright/Cypress)
3. Fix PDF font paths for cross-platform
4. Add `.env.example` and deployment docs

### Phase 2 — Agronomy & Data
1. Implement crop plan ingestion (`ingest-agronomy`)
2. Replace mock KPIs (inputs adherence, machinery uptime) with real logic or integrations
3. Add data validation (e.g. Zod) on API inputs

### Phase 3 — UX & Polish
1. Farm creation / management UI
2. User management (invite, roles)
3. Fiscal year selector in header
4. Loading states and error toasts

### Phase 4 — Scale
1. Multi-year comparison on dashboard
2. Audit log for frozen assumptions
3. Bulk import (CSV/Excel) for accounting
4. Mobile-responsive layout

---

## Data Flow

```
Assumptions (crops, bins, acres)
       ↓
Per-Unit (monthly yields, costs)
       ↓
Accounting (actuals from QB + manual)
       ↓
Dashboard (KPIs, forecasts, charts)
```

---

## Key Files

| Purpose | Path |
|---------|------|
| API entry | `backend/src/app.js` |
| Prisma schema | `backend/src/prisma/schema.prisma` |
| Forecast logic | `backend/src/services/forecastService.js` |
| QB service | `backend/src/services/quickbooksService.js` |
| App routes | `frontend/src/App.jsx` |
| Farm context | `frontend/src/contexts/FarmContext.jsx` |
