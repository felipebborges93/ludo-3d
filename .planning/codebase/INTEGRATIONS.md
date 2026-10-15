---
last_mapped_commit: d3c2c30333a6a2903596f2bf0409282661dfc173
last_mapped_at: 2026-10-15
---
# External Integrations

**Analysis Date:** 2026-10-15

## APIs & External Services

**Real-Time Networking:**

- PeerJS Cloud Broker / WebRTC Signaling (`peerjs@^1.5.5`) - Used for matchmaking rooms and establishing P2P WebRTC DataChannels between players in `src/net/network.ts`.
  - SDK/Client: `peerjs`
  - Auth: Public default cloud broker (or custom peer server if configured)

## Data Storage

**Databases:**

- None (100% client-side and ephemeral peer-to-peer session state).

**File Storage:**

- Local filesystem only during build / static web assets served directly by Vite/Vercel.

**Caching:**

- Browser HTTP cache for static bundles (`dist/`).

## Authentication & Identity

**Auth Provider:**

- None (Anonymous / ephemeral player nicknames assigned per room session in `src/net/network.ts`).

## Monitoring & Observability

**Error Tracking:**

- None / Browser developer console.

**Logs:**

- In-game game log HUD (`ui.gameLog` in `src/ui/hud.ts`) showing turn events, dice rolls, captures, and card effects.

## CI/CD & Deployment

**Hosting:**

- Vercel (`vercel.json`) - Configured for static frontend delivery from `dist/`.

**CI Pipeline:**

- None configured in repository yet; local `npm test` and `npm run build` verify integrity.

## Environment Configuration

**Required env vars:**

- None (Fully zero-config client-side project).

**Secrets location:**

- None required.

## Webhooks & Callbacks

**Incoming:**

- None.

**Outgoing:**

- None.

---

*Integration audit: 2026-10-15*
