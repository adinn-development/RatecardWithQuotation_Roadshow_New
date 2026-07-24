# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is the **frontend only** of Adinn's Roadshow Vehicle Rate Card & Quotation system — a Create React App (TypeScript) single-page app used by Adinn staff to:

1. Browse a catalog of roadshow advertising vehicles (Flex branding vans, LED vehicles, hybrid LED+Flex) with pricing, specs, and location-wise charges (`/`).
2. Build a priced, printable/PDF quotation for a client campaign, with discount and admin-approval workflow (`/roadshowQO`).
3. Search, review, and approve previously saved quotations (`/roadshow-quotations`).

There is **no backend or database code in this repository**. The app talks to:
- A vehicle-catalog JSON file hosted on a DigitalOcean Spaces CDN
- A separate Node-style REST backend at `https://roadshow-backend.onrender.com` (source not in this repo)

Everything below that describes "the backend" or "the database" is **inferred from the frontend's API calls and payload shapes** — treat it as a contract the frontend expects, not a verified server-side schema.

## Tech Stack

- **React 19** + **react-router-dom 7** (client-side routing, `BrowserRouter`)
- **TypeScript** — but see [Coding Standards](#coding-standards): the three main pages opt out of type checking
- **Create React App** (`react-scripts` 5.0.1) — build tooling, dev server, Jest test runner, ESLint config (`react-app`, `react-app/jest`)
- **axios** — listed as a dependency, though most API calls in the reviewed pages use native `fetch`
- **html2canvas** + **jsPDF** — loaded at runtime from `cdnjs.cloudflare.com` (not npm packages) for client-side PDF generation of quotations
- Plain CSS files per page/feature (no CSS-in-JS, no Tailwind, no component library)
- `@testing-library/*` + CRA's built-in Jest setup for testing (minimal test coverage currently — only the CRA-default `App.test.js` exists)

## Folder Structure

```
public/
  index.html                        CRA HTML shell
  vehicles.json                     Local/dev copy of the vehicle catalog (used when USE_LOCAL_JSON=true)
  vehicles_live.json                Snapshot of the live CDN catalog, kept for reference/diffing (not fetched by the app)
  images/, roadshow-vehicles/       Vehicle photos referenced by vehicles.json
  adinn-logo.png                    Default company logo used in quotations

src/
  App.tsx                           Router root: route table + a hidden "admin quick access" overlay
  mainPage.tsx                      MainApp — public vehicle rate-card browser ("/")
  RoadshowQO.tsx                    RoadshowQO — the quotation builder ("/roadshowQO"); ~5,900 lines, core business logic
  RoadshowQuotationList.tsx         Admin list/search/approval view ("/roadshow-quotations")
  newPage.tsx                       Unused placeholder page ("/newPage")
  App.css                           Styles for mainPage.tsx
  RoadshowQO.css (if present) / inline styles  Styles for the quotation builder
  RoadshowQuotationList.css
  RoadshowQuotationList.approval.css  Approval-flow-specific styles
  RoadshowQOWatermark.css           Styles for the "unapproved" watermark shown on gated quotations
  index.js, index.css               CRA entry point
  reportWebVitals.js, setupTests.js, App.test.js  CRA defaults, largely untouched
```

There is no `components/`, `hooks/`, `services/`, or `utils/` directory — each page file is self-contained, including its own types, constants, API helper functions, and pure formatting helpers defined at the top of the file.

## Coding Standards

- **No shared code between pages.** `mainPage.tsx`, `RoadshowQO.tsx`, and `RoadshowQuotationList.tsx` each independently redefine near-identical helpers (`formatPrice`, `normalizeCategory`, `API_BASE_URL`/`USE_LOCAL_API`, etc.) rather than importing from a shared module. When fixing a formatting/business-logic bug, check whether the same logic is duplicated in the other page files.
- **Type checking and linting are disabled** on the three main page files via `/* eslint-disable */` and `// @ts-nocheck` at the top. TypeScript types are still written (interfaces/types are defined and used for editor hints), but the compiler will not catch mismatches — read logic carefully instead of trusting types.
- **No environment variables.** Configuration (API base URL, use-local-JSON/API toggles) is hardcoded as `const` flags at the top of each file — see [Environment Setup](#environment-setup).
- **State is local component state only.** No Redux/Context/Zustand; no `localStorage`/`sessionStorage`. Everything resets on page reload, including in-progress quotations.
- **Styling** is plain CSS files imported per page, plus a significant amount of inline `style={{ ... }}` objects directly in JSX (especially in `RoadshowQO.tsx` and the `AdminQuickAccess` component in `App.tsx`).
- **Naming**: camelCase for variables/functions, PascalCase for components/types, `SCREAMING_SNAKE_CASE` for module-level constants (e.g. `API_BASE_URL`, `UP_DOWN_FREE_KM_LIMIT`).
- Helper functions are pure and declared above the component that uses them; state-derived values use `useMemo`; expensive/side-effecting logic (fetches, DOM listeners) is in `useEffect`.

## Architecture

### Routing (`src/App.tsx`)
| Path | Component | Purpose |
|---|---|---|
| `/` | `MainApp` (`mainPage.tsx`) | Public rate-card browser |
| `/roadshowQO` | `RoadshowQO` | Quotation builder |
| `/roadshow-quotations` | `RoadshowQuotationList` | Admin search/approval list |
| `/q/:quotationNo` | `ShortQuotationRedirect` | SMS/DLT-friendly short link; normalizes a raw number or `EST1234` into `EST-1234` and redirects to `/roadshow-quotations?qn=...` |
| `/newPage` | `NewPage` | Unused stub |

`App.tsx` also renders `AdminQuickAccess`, a hidden floating panel that appears after clicking anywhere with "login" text, offering a shortcut link to the quotations list.

### Data flow
1. **Vehicle catalog**: fetched client-side as raw JSON (no backend call) — either `public/vehicles.json` (local) or the DigitalOcean Spaces CDN URL (live), depending on each file's `USE_LOCAL_JSON` flag. Cache-busted with a `?v=timestamp` query param and `cache: "no-store"`.
2. **Quotation persistence**: `RoadshowQO.tsx` builds a large JSON payload (see [Database Collections](#database-collections)) and `POST`s it to the external backend to save a quotation, then generates a PDF client-side and `PUT`s it to the backend, which appears to also trigger an approval email server-side (see `approvalMailError` handling).
3. **Approval workflow**: quotations with any discount are marked `approval.required = true` server-side; `RoadshowQuotationList.tsx` lets an admin approve via a password-gated `PATCH .../approve` call, which unlocks Print/PDF download for that quotation.

### `mainPage.tsx` — rate card browser
Fetches the vehicle catalog, lets users filter by category (`Flex Branding`, `Hybrid LED + Flex`, `LED Vehicles`) and search/sort by price, and renders `VehicleCard`s showing images, quick specs, included items, add-ons, and a location-wise charges table. Includes a hidden triple-click-the-logo "JSON Manager" panel to download/upload the cloud `vehicles.json` directly (calls `PUT /api/update-vehicles-json` on the backend). The "Innovative Model" category is explicitly filtered out on this page.

### `RoadshowQO.tsx` — quotation builder (core business logic)
See [Business Rules](#business-rules) below. Structurally:
- Constants/types/pure helpers → ~40+ `useState` hooks for form state → derived `useMemo`s (selected vehicle/variant, rates, RTO billing months, terms) → pricing engine (`buildQuoteLineItemsForValues`) → field change handlers → payload builder (`buildRoadshowQuotationPayload`) → PDF generation/upload/approval submission → JSX (vehicle picker → pricing/discount form → printable multi-page quotation preview).

### `RoadshowQuotationList.tsx` — admin view
Paginated/searchable list of saved quotations (debounced search, 400ms). Reconstructs a read-only preview (`QuotationProtectedPreview`) from each record's `rawPayload`, shows status badges (`saved`, `waiting_for_approval`, `approved`, `pdf_uploaded`, `failed`), and exposes the password-gated approve action.

## Business Rules

These live in `RoadshowQO.tsx` and are the most important logic to understand before making pricing changes:

- **Categories**: raw catalog category `"LED Vehicle"` is displayed as `"Hybrid LED + Flex"`; `"Premium LED"` is displayed as `"LED Vehicles"` (`normalizeCategory`, duplicated in `mainPage.tsx`).
- **Regional pricing**: branding cost, RTO permission, and promoter charges are looked up per-region (`chennai`, `rotn`, `kerala`, `andhara`/`andhra`, `telungana`/`telangana`, `karnataka`, `otherStates`) from each vehicle's `locationCharges` rows, using fuzzy/normalized key matching (`getLocationChargeValue`) with region-specific fallback chains (e.g. Chennai/ROTN promoter cost falls back to a "Tamilnadu" key if no exact match exists).
- **RTO billing**: billed in months = `floor(days / 30)`, minimum 1 month (`getRtoBillingMonths`). RTO permission validity is tracked via `RTO_PERMISSION_VALIDITY_DAYS`.
- **Up & Down transport charge**: only applies when campaign `days < 25` (`UP_DOWN_CHARGE_DAYS_THRESHOLD`) **and** `upDownKm > 200` (`UP_DOWN_FREE_KM_LIMIT`).
- **Extra KM / Extra Hour charges**: billed per-vehicle-variant rate when usage exceeds the included daily km limit or campaign hours.
- **"Innovative Model" category**: specific vehicle IDs use "Fabrication Cost" terminology instead of "Branding Cost"; a non-zero fabrication cost is required to build a valid payload for these vehicles (throws otherwise). In Kerala, RTO for this category becomes a manually-editable "based on design" value instead of a fixed catalog rate. This category is hidden on the main rate-card page but selectable in the quotation builder.
- **GST**: flat 18% (`gstPercent`, default 18) applied to the line-item subtotal.
- **Discounts & approval gating**: three independent discounts are supported — vehicle rate discount, branding/fabrication cost discount, RTO permission discount — each capped so it cannot exceed the actual chargeable amount. Any non-zero branding or RTO discount sets `approval.required = true` in the saved payload, which locks Print/PDF download (shown with a watermark, see `RoadshowQOWatermark.css`) until an admin approves it via `RoadshowQuotationList.tsx`.
- **Advance payment**: quotations always quote a 50% advance (`advancePercent: 50`, `advanceAmount = grandTotal * 0.5`).
- **Custom add-ons**: promoter, 43" LED TV, and power backup are toggleable optional add-ons layered onto the base vehicle price; each becomes a human-readable line in `addOns.selectedAddOns`.

## Environment Setup

There are no `.env` files or environment variables used anywhere in the app. Configuration is hardcoded per-file and must be edited directly in source before switching contexts:

```ts
// Present independently in mainPage.tsx, RoadshowQO.tsx, RoadshowQuotationList.tsx
const USE_LOCAL_JSON = true/false; // vehicle catalog: public/vehicles.json vs the CDN
const USE_LOCAL_API  = false;      // backend: http://localhost:3001 vs the live Render backend
```

**These flags are not centralized** — check the current value in each file before assuming which data source is active. As committed, `mainPage.tsx` reads the local catalog (`USE_LOCAL_JSON = true`) while `RoadshowQO.tsx` reads the live CDN catalog (`USE_LOCAL_JSON = false`); all three files currently point `USE_LOCAL_API` at the live Render backend. If you need to develop against a local backend, you also need that backend's repo running separately on `localhost:3001` — it is not part of this repository.

## Commands to Run the Project

```bash
npm install        # install dependencies
npm start           # dev server at http://localhost:3000, hot reload
npm test             # Jest/RTL in interactive watch mode
npm test -- --testPathPattern=App.test.js   # run a single test file
CI=true npm test -- --watchAll=false        # non-interactive run (CI-style)
npm run build       # production build to build/
```

There is no separate `lint` script; linting runs as part of `start`/`build` via CRA's `eslint-config-react-app`, and (as noted above) is disabled inside the three main page files via inline directives.

## Important APIs

All backend endpoints below are relative to `API_BASE_URL` (`https://roadshow-backend.onrender.com`, or `http://localhost:3001` when `USE_LOCAL_API = true`). None of this backend's implementation lives in this repo — treat these as the contract the frontend depends on.

| Method | Endpoint | Caller | Purpose |
|---|---|---|---|
| `GET` | `/api/roadshow-quotations/next-number` | `RoadshowQO.tsx` | Get the next sequential quotation number before creating a draft |
| `POST` | `/api/roadshow-quotations` | `RoadshowQO.tsx` | Create/save a quotation (full payload, see below) |
| `GET` | `/api/roadshow-quotations/:id` | `RoadshowQuotationList.tsx` | Fetch full details of one saved quotation |
| `PUT` | `/api/roadshow-quotations/:id/pdf` | `RoadshowQO.tsx` | Upload the client-generated PDF (multipart `FormData`: `pdf` blob + `fileName`); response may include `approvalMailError` if the server's approval-notification email failed |
| `PATCH` | `/api/roadshow-quotations/:id/approve` | `RoadshowQuotationList.tsx` | Password-gated approval of a quotation with pending discounts |
| `PUT` | `/api/update-vehicles-json` | `mainPage.tsx` (hidden JSON Manager panel) | Overwrite the live vehicle catalog JSON on the CDN |

Non-backend data source:
| Method | URL | Purpose |
|---|---|---|
| `GET` | `https://adinn-space.sgp1.cdn.digitaloceanspaces.com/roadshowRateCard/vehicles.json` | Live vehicle catalog (static JSON on a CDN, not the REST backend) |

## Database Collections

No database code exists in this repo. Based on the payload built by `buildRoadshowQuotationPayload` in `RoadshowQO.tsx` and the `RoadshowQuotationItem` type in `RoadshowQuotationList.tsx`, the backend appears to persist one **quotation document** per record (likely MongoDB, given the `_id` field naming convention) shaped roughly like:

```
{
  _id, quotationNumber, payloadVersion, source, quotationType, status,
  company: { name, title, validityDays, defaultLogoSrc, displayLogoSrc },
  quotation: { draftProposalNumber, displayedProposalNumber, proposalDate,
               proposalDateDisplay, validUntilDate, validUntilDateDisplay, validityDays },
  clientDetails: { clientName, companyName, gstNumber, billingAddress,
                    contactNumber, email, campaignName, campaignLocation },
  preparedByDetails: { staffName, staffPhone, companyName, email, staff: { name, phoneNumber } },
  campaign: { region, regionLabel, selectedCategory, selectedVehicleId,
              selectedVehicleVariantId, quantity, days, promoterQuantity, promoterDays,
              extraKm, extraHours, upDownKm, kmLimit, minimumDays, gstPercent,
              rtoBillingMonths, ... (pricing/km/rate snapshot fields) },
  vehicle: { selectedCategory, selectedVehicleId, selectedVehicleVariantId,
             selectedVehicleVariantSnapshot, selectedVehicleSnapshot },
  pricing: { currency, pricingDetails: {...}, quoteLineItems: [...],
             actualSubtotal, totalDiscountAmount, subtotal, gstPercent, gstAmount,
             grandTotal, advancePercent, advanceAmount },
  addOns: { includePromoter, includeLed, includePowerBackup, selectedAddOns: [] },
  assets: { logo: {...}, signature: {...} },
  approval: { required, status, requestedAt, requestedBy?, approvedAt, approvedBy? },
  pdf: { status, fileName, publicUrl?, cdnUrl?, downloadUrl?, uploadedAt },
  termsAndConditions: [...],
  createdAt, updatedAt
}
```

`RoadshowQuotationList.tsx` reads back through `quotation.rawPayload` (i.e., the backend appears to store the exact payload sent by the client under a `rawPayload` field, alongside top-level `status`/`approval`/`pdf`/timestamps it manages itself). There is no separate "vehicles" database collection — the vehicle catalog is a static JSON file on a CDN, updated wholesale via `PUT /api/update-vehicles-json`.

## Development Guidelines

- Before changing pricing/discount/region logic, read the full relevant section of `RoadshowQO.tsx` (see line ranges of Business Rules above) — the pricing engine (`buildQuoteLineItemsForValues`) and the payload builder (`buildRoadshowQuotationPayload`) must stay in sync, since the payload re-derives totals independently rather than reusing a single source of truth.
- If you fix a formatting or category-normalization bug in one page file, grep for the same helper name (`formatPrice`, `normalizeCategory`, `getLocationChargeValue`, etc.) in the other two page files — they are copy-pasted, not shared.
- Treat `public/vehicles.json` and the live CDN JSON as separate artifacts that can drift (confirmed: they currently have different prices and schema for some fields, including whether vehicles have `variants`). Don't assume editing one updates the other.
- When testing quotation flows locally, check `USE_LOCAL_API`/`USE_LOCAL_JSON` in the specific file you're working on — don't assume it matches another file.
- The three main files are `// @ts-nocheck`; if you want type safety for new code, either write it in a new file without that directive, or be extra careful manually — the compiler will not help.

## Do's and Don'ts

**Do:**
- Keep new business logic inside the existing per-file pattern (helpers above the component) unless you're deliberately introducing shared modules — and if you do introduce a shared module, update all three page files, not just one.
- Preserve the discount-triggers-approval invariant (`approval.required`) whenever touching discount logic — this is a business control, not incidental.
- Re-check both `vehicles.json` (local) and the live CDN catalog when changing any code that reads vehicle fields, since their shapes have drifted.
- Cache-bust catalog fetches (`?v=timestamp`, `cache: "no-store"`) as the existing code does, to avoid staff seeing stale pricing.

**Don't:**
- Don't add `localStorage`/`sessionStorage`-based persistence without discussing it — the current design deliberately keeps everything ephemeral/in-memory.
- Don't remove `// @ts-nocheck`/`/* eslint-disable */` from the main pages as a drive-by cleanup — it will surface a large number of pre-existing type errors unrelated to your change; do it as its own deliberate effort if ever undertaken.
- Don't hardcode a new backend URL or duplicate `API_BASE_URL` logic yet again — prefer updating the existing per-file constants.
- Don't assume there's a `lint` or `typecheck` npm script — there isn't one beyond what CRA runs implicitly.
- Don't bypass the approval-required gating in the UI (e.g. enabling Print/PDF for discounted-but-unapproved quotations) — this is enforced business logic tied to an admin password check on the backend.

## Future Contributors Guidelines

- This repo currently has no shared `utils`/`services` layer and significant logic duplication across `mainPage.tsx`, `RoadshowQO.tsx`, and `RoadshowQuotationList.tsx`. If the codebase grows further, extracting shared helpers (formatting, category normalization, API base config) into a common module would reduce drift risk — but do this deliberately and update every call site, not incrementally.
- The backend (`roadshow-backend.onrender.com`) is out of scope for this repo; if you need to change API behavior (new fields, validation, the approval email), that work belongs in the backend's own repository, not here.
- Given the size of `RoadshowQO.tsx` (~5,900 lines in a single file), prefer small, well-scoped edits over large refactors unless a refactor is explicitly requested — the file mixes state, business logic, and rendering, and unrelated regressions are easy to introduce.
- No automated tests currently cover the pricing engine, payload builder, or approval flow — only the CRA-default smoke test exists. Manual verification (running `npm start` and exercising the quotation flow) is currently the only way to confirm pricing/approval changes behave correctly.
