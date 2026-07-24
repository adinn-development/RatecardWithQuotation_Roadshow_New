# Innovative Model — Cost Confirmation Feature

This document tracks the changes made to support a pre-download cost-confirmation
step for "Innovative Model" vehicles in the Roadshow Quotation builder
(`src/RoadshowQO.tsx`), plus the related `vehicles.json` default change.

## Background / Requirement

For "Innovative Model" vehicles (hardcoded IDs `9`, `10`, `11` —
`INNOVATIVE_FABRICATION_VEHICLE_IDS`), the quotation uses a **Fabrication Cost**
(not "Branding Cost") plus location-based **RTO Permission** cost. Before
downloading the proposal PDF, staff must explicitly confirm these figures are
correct — with the option to edit them inline — instead of silently downloading
whatever was last entered in Section 06 (Commercial Pricing).

## What was built

### 1. Cost review popup (`src/RoadshowQO.tsx`)
- New state: `showCostReviewModal`.
- New ref: `commercialPricingSectionRef`, attached to the Section 06
  (`Commercial Pricing`) `<section>` via `ref={commercialPricingSectionRef}`
  and `id="qoCommercialPricingSection"`.
- New helpers:
  - `scrollToCommercialPricingSection` — scrolls the pricing section into view
    when the popup opens.
  - `focusFabricationCostInput` — focuses
    `document.getElementById("innovative-fabrication-cost")` (the Section 06
    input) when the user chooses to edit instead of proceeding.
- `handleDownloadPdf` was split: the original body was extracted into
  `runDownloadPdfWithValues(normalizedQuoteValues)`. For Innovative Model
  vehicles, `handleDownloadPdf` now opens `showCostReviewModal` and scrolls to
  the pricing section instead of downloading immediately. Non-Innovative
  vehicles are unaffected — they still download directly.
- `handleConfirmCostAndDownload` ("Yes, Proceed"): re-runs
  `validateRequiredFabricationCost()` and `normalizeMinimumFieldsForDownload()`
  **fresh at confirm-time** (not from a stale pre-popup snapshot), closes the
  modal, then calls `runDownloadPdfWithValues(...)`. This ensures any edits
  made inside the popup are what actually gets downloaded/saved.
- `handleRejectCostAndEdit` ("No, Edit Cost"): closes the modal and calls
  `focusFabricationCostInput()` so staff land back on the editable Section 06
  field.
- Modal JSX renders after the `approvalToastMessage` block:
  - Fabrication Cost — editable input (`.moneyInput` pattern), id
    `"innovative-fabrication-cost-modal"` (kept distinct from Section 06's
    `"innovative-fabrication-cost"` to avoid a duplicate-DOM-id clash, since
    the underlying section stays mounted behind the overlay), bound via
    `handlePricingChange("brandingCost", ...)`.
  - RTO Permission — editable input, same pattern, bound via
    `handlePricingChange("rtoPermission", ...)`.
  - **Promoter Cost row removed** — promoter cost is not mandatory for this
    flow, so it was dropped from the popup entirely.
  - "Yes, Proceed" / "No, Edit Cost" action buttons.

### 2. Styling (`src/RoadshowQO.css`)
- Added `.qoCostConfirmBackdrop`, `.qoCostConfirmModal`,
  `.qoCostConfirmModal h3`, `.qoCostConfirmModal > p`,
  `.qoCostConfirmQuestion`, `.qoCostConfirmActions`, `.qoCostConfirmNoBtn`,
  `.qoCostConfirmYesBtn` — mirrors the existing `.qoApprovalToast` design
  tokens (`--red-600`, `--ink-900`, `--shadow-red`, etc.) so the popup matches
  current UI styling.
- `.qoCostConfirmField` — label/input wrapper style for the now-editable
  Fabrication Cost / RTO Permission rows (replaces the earlier read-only
  `.qoCostConfirmRow`/`span`/`strong` rules).
- `.qoCostConfirmFieldError` — error text styling (used when Fabrication Cost
  is still 0/invalid).

### 3. `public/vehicles.json` — Fabrication Cost defaults zeroed
For the three Innovative Model vehicles, the `"Fabrication Cost"`
`locationCharges` row was changed to `₹0` for both `general` and `kerala`
columns (previously non-zero defaults):
- Vehicle `9`: `general`/`kerala` `₹10,000` / `₹20,000` → `₹0` / `₹0`
- Vehicle `10`: `general`/`kerala` `₹10,000` / `₹20,000` → `₹0` / `₹0`
- Vehicle `11`: `general`/`kerala` `₹20,000` / `₹30,000` → `₹0` / `₹0`

RTO Permission and Promoter rows were left unchanged. `"₹0"` still parses
correctly via `parseMoney`/`findCharge` (not treated as missing), so
`getDefaultPricing` now defaults `brandingCost: 0` for these vehicles — which
combines with the pre-existing `validateRequiredFabricationCost()` gate
(`brandingCost > 0` required) to force staff to manually enter the fabrication
cost every time, rather than silently inheriting a stale catalog default.

**Note:** `RoadshowQO.tsx` has `USE_LOCAL_JSON = false`, so it fetches the
live CDN catalog by default — this local `vehicles.json` edit only takes
effect there if `USE_LOCAL_JSON` is flipped to `true` for local testing, or
the same change is pushed to the live CDN JSON. `mainPage.tsx` already reads
this local file, so the public rate card reflects the change immediately.

## Files touched
- `src/RoadshowQO.tsx`
- `src/RoadshowQO.css`
- `public/vehicles.json`

## Verification
- `npx tsc --noEmit --jsx react-jsx --skipLibCheck --allowJs src/RoadshowQO.tsx` → no errors.
- `CI=true npm run build` → "Compiled successfully" after both rounds of edits.

## Open items (not yet actioned)
- The cost-confirmation popup is wired only into `handleDownloadPdf`.
  `handleSubmitForApproval` (used when a discount is present) does **not**
  currently trigger this review step — undecided whether it should.
