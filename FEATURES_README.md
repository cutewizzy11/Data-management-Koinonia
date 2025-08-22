
# Koinonia Data Management — Feature Upgrade (Vetted Workflow & NIN Auto-Verification)

This update adds:
- **Vetted workflow** with status, undo, dedicated **Vetted** page (search + date-range filters), and audit logging.
- **NIN auto-verification** (manual trigger now; auto on submit can be wired later) with provider-agnostic service (MOCK by default) and clear UI badges.
- **Roles & permissions** guard (viewer vs reviewer/admin).
- **Audit trail** persisted to localStorage and optionally sent to a backend/webhook.

## How to use
1. Copy `.env.example` to `.env` and adjust values. Keep `VITE_NIN_PROVIDER=MOCK` for local testing.
2. Run the app as usual (`npm i && npm run dev`). You’ll see a new **Vetted** nav item.
3. In **Applicants** or **Table** views:
   - Click **Vetted** to mark an applicant. A toast appears with **Undo**.
   - Click **Verify NIN** to run a (mock) verification and set MATCH/MISMATCH/ERROR.
4. The **Vetted** page lists all vetted applicants with **search** and **date filters**.

## Persistence
- Vetting + NIN statuses are overlaid via `VettingContext` and stored in `localStorage` by `id`.
- `services/auditService.ts` writes an audit log to `localStorage` and optionally POSTs to `VITE_WRITE_WEBHOOK_URL` so you can capture it (e.g., in Google Apps Script that writes back to your Sheets).

## Wiring to your backend / Google Apps Script
- Implement a small endpoint that accepts JSON from the frontend and updates the row by `id`:
  - `action: 'VETTED' | 'NIN_VERIFY' | 'UNDO_VETTED'`
  - `applicantId`, `actor`, timestamps, provider refs, etc.
- Set `VITE_WRITE_WEBHOOK_URL` to that endpoint and the app will POST audit events automatically.
- Alternatively, extend the existing GAS endpoint to support writes (e.g., `?action=updateVetting`) and call it from `auditService` or a new `writeService`.

## Compliance notes
- Prefer **vNIN** (virtual NIN) in `services/ninService.ts` (we send `vnin` when present).
- The app restricts sensitive actions to **reviewer/admin** roles.
- All actions are logged via the **audit trail**.

