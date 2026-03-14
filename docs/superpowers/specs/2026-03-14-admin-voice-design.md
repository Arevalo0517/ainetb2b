# Admin/Voice Frontend Pages — Design Spec

**Date:** 2026-03-14
**Status:** Approved
**Routes:** `/admin/voice/*`

---

## Overview

Four new admin pages for managing voice agents, phone numbers, call logs, and voice configuration. Uses Opción A: separate routes with sidebar navigation item.

---

## Navigation

Add a "Voz" item to `AdminSidebar` with a `Phone` icon (lucide-react). Active when current path starts with `/admin/voice`. Sub-items shown with indent when active:
- Overview (`/admin/voice`)
- Llamadas (`/admin/voice/calls`)
- Números (`/admin/voice/phone-numbers`)
- Configuración (`/admin/voice/config`)

---

## Page 1: `/admin/voice` — Overview

### Layout
- Header: "Voz & Telefonía" title + "Iniciar Llamada" button (right)
- 4 MetricCards: Llamadas Hoy | Minutos Consumidos | Números Activos | Créditos de Voz (mes)
- AreaChart: calls per day (last 7 days) using recharts
- Table: last 10 calls — PROYECTO, DIRECCIÓN, NÚMERO, DURACIÓN, ESTADO, CRÉDITOS, FECHA

### Modal: Iniciar Llamada
- Dropdown: select voice project (voz-basico/intermedio/avanzado only)
- Input: destination phone number
- Confirm button → calls `voiceApi.initiateCall()`

### Data Sources
- `voiceApi.calls({ limit: 10 })` for recent calls
- `voiceApi.phoneNumbers()` count for active numbers
- Derived metrics from calls data (today's count, minutes, credits)

---

## Page 2: `/admin/voice/calls` — Call Logs

### Layout
- Header with search bar (by phone number) + filters
- Filters: direction (inbound/outbound/all), status (all/completed/failed/no-answer), project selector
- Full paginated table with all CallLog columns
- Pagination: 25 rows per page

### Table Columns
PROYECTO | DIRECCIÓN | DE | HACIA | DURACIÓN | ESTADO | CRÉDITOS | FECHA

### Detail Drawer (slide-in from right, on row click)
- Call metadata: ID, room, twilio SID
- Transcript: scrollable text area
- Recording: audio player if recording_url exists
- Cost breakdown: JSON formatted display
- Close button

### Data Source
`voiceApi.calls(params)` with filter params, `voiceApi.callDetail(id)` for drawer

---

## Page 3: `/admin/voice/phone-numbers` — Phone Numbers

### Layout
- Header: "Números de Teléfono" + "Comprar Número" button
- 3-column card grid, each card shows:
  - Phone number (formatted)
  - Assigned project name (or "Sin asignar")
  - Status badge (active=green, released=gray, pending=yellow)
  - Country code
  - Actions dropdown: Reasignar | Liberar

### Modal: Comprar Número
- Input: area_code
- Button: "Buscar disponibles"
- Results list: available numbers with select button
- Confirm → `voiceApi.purchaseNumber({ phone_number, project_id, area_code })`

### Modal: Reasignar
- Project selector (voice projects only)
- Confirm → `voiceApi.reassignNumber(id, { project_id })`

### Confirm Dialog: Liberar
- Warning text about releasing Twilio number
- Confirm → `voiceApi.releaseNumber(id)`

### Data Source
`voiceApi.phoneNumbers()`, `projectsApi.list()` for project selector

---

## Page 4: `/admin/voice/config` — Voice Configuration

### Layout
- Header: "Configuración de Voz" + project selector dropdown (voice projects only)
- Form with save button, sections:

#### 1. Pipeline
- STT Model: select (deepgram-nova-2, deepgram-nova, whisper)
- TTS Model: select (deepgram-aura-asteria-en, deepgram-aura-luna-en, etc.)
- LLM Model: select (gpt-4o-mini, gpt-4o)
- TTS Language: input text

#### 2. Comportamiento
- Greeting Message: textarea
- End Call Phrases: tag-style input (comma-separated, stored as array)
- Max Call Duration: number input (seconds)
- Silence Timeout: number input (seconds)
- Transfer Number: phone input

#### 3. Integración n8n
- n8n Voice Webhook URL: text input
- Voice Tools: JSON textarea (array of tool definitions)

#### 4. Avanzado
- LiveKit Room Prefix: text input
- Voice Max Tokens: number input

### Behavior
- On project select → fetch config via `voiceApi.getConfig(projectId)`
- On save → `voiceApi.updateConfig(projectId, data)`
- Show success/error toast

---

## Component Structure

```
src/app/(admin)/admin/voice/
  page.tsx                    ← Overview
  calls/
    page.tsx                  ← Call logs
  phone-numbers/
    page.tsx                  ← Phone numbers
  config/
    page.tsx                  ← Voice config
```

No new shared components needed — reuse MetricCard, AdminSidebar (update nav), existing UI primitives.

---

## Design Patterns (matching existing codebase)

- **Colors:** `#0F172A` bg, `#2B79FF` blue, `#64748B` slate, `#F8FAFC` white, `#10B981` green
- **Classes:** `glass-card`, `glow-blue` utility classes from globals.css
- **Animations:** framer-motion `initial={{ opacity: 0, y: 20 }}` with stagger via `delay` prop
- **Charts:** recharts AreaChart pattern from dashboard
- **Tables:** custom styled tables (not shadcn Table) matching clients/projects pages
- **Modals:** inline state-driven modals with backdrop blur, matching NewClientModal pattern
- **Note:** `DropdownMenuTrigger` does NOT support `asChild` prop in this shadcn version

---

## Data Flow

All data fetched client-side with `useEffect` + `useState`. No server components for data fetching (matching existing pattern). Error states shown inline. Loading states with spinner or skeleton.

---

## Out of Scope

- Real-time call status updates (WebSocket)
- Audio recording playback controls beyond basic `<audio>` element
- Voice agent performance analytics (separate future feature)
