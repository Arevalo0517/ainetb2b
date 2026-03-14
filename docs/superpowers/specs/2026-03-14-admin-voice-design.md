# Admin/Voice Frontend Pages — Design Spec

**Date:** 2026-03-14
**Status:** Approved
**Routes:** `/admin/voice/*`

---

## Overview

Four new admin pages for managing voice agents, phone numbers, call logs, and voice configuration. Uses Opción A: separate routes with sidebar navigation item.

---

## Navigation

Update `AdminSidebar` to support a collapsible sub-nav for "Voz":

- Add "Voz" as a parent nav item with `Phone` icon (lucide-react)
- The parent item is a clickable link to `/admin/voice` AND a toggle for sub-items
- Sub-items are visible **only** when the current path starts with `/admin/voice`
- Sub-items appear with left indent (pl-8), animated via framer-motion `initial={{ opacity: 0, x: -4 }}` consistent with existing `whileHover={{ x: 3 }}` pattern
- Sub-items:
  - Overview (`/admin/voice`)
  - Llamadas (`/admin/voice/calls`)
  - Números (`/admin/voice/phone-numbers`)
  - Configuración (`/admin/voice/config`)
- Active state: `pathname === href` for sub-items, `pathname.startsWith('/admin/voice')` for parent

**Implementation note:** The existing `AdminSidebar` NAV array is flat. Adding collapsible sub-nav requires adding a `children?: NavItem[]` field to the nav item type and rendering them conditionally.

---

## Page 1: `/admin/voice` — Overview

### Data Fetching
Two `voiceApi.calls()` fetches on mount:
1. `voiceApi.calls({ limit: 10 })` → for the recent calls table
2. `voiceApi.calls({ limit: 500 })` → for metric derivation and chart aggregation (7 days of data)

Plus `voiceApi.phoneNumbers()` for active numbers count.

### Metric Cards (4)
- **Llamadas Hoy:** count of calls in fetch #2 where `started_at` date === today
- **Minutos Consumidos:** sum of `duration_seconds / 60` from fetch #2, rounded to 1 decimal
- **Números Activos:** count of phone numbers with `status === 'active'`
- **Créditos de Voz (mes):** sum of `credits_used` from fetch #2 where `started_at` is within current calendar month (1st of current month → today)

### AreaChart
- Data: calls per day for last 7 calendar days, aggregated client-side from fetch #2
- Group by `started_at` date (YYYY-MM-DD), count per day
- recharts AreaChart, same pattern as dashboard page

### Recent Calls Table
- Data: fetch #1 (last 10 calls)
- Columns: PROYECTO | DIRECCIÓN | NÚMERO | DURACIÓN | ESTADO | CRÉDITOS | FECHA
- DURACIÓN: `duration_seconds` formatted as `Xm Ys`
- ESTADO: colored badge (completed=green, failed=red, in-progress=blue, others=gray)
- Empty state: "No hay llamadas registradas" centered in table body

### Modal: Iniciar Llamada
- Fields:
  - Project selector (dropdown, only projects with type starting with `voz-`)
  - `to_number` input (labeled "Número destino")
- On confirm → `voiceApi.initiateCall({ project_id, to_number })`
- Success: close modal, show inline success message
- Error: show error message inside modal

---

## Page 2: `/admin/voice/calls` — Call Logs

### Filters
- Search input: filter by `from_number` or `to_number` (client-side filter on fetched data)
- Direction selector: All | Inbound | Outbound → maps to `direction` param in API
- Status selector: All | Iniciada | En curso | Completada | Fallida | Sin respuesta → maps to all `CallStatus` values (`initiated`, `in-progress`, `completed`, `failed`, `no-answer`, `ringing`). **Note:** status filter is client-side only (API does not support status param) — fetch all calls then filter in-memory.
- Project selector: dropdown of all voice projects → maps to `project_id` param in API

### Table
- Columns: PROYECTO | DIRECCIÓN | DE | HACIA | DURACIÓN | ESTADO | CRÉDITOS | FECHA
- Pagination: 25 rows per page, client-side (fetch up to 500 rows)
- Row click → open Detail Drawer

### Detail Drawer (slide-in from right)
- Overlay backdrop, drawer width ~480px
- Sections:
  - **Metadatos:** call ID, LiveKit room name, Twilio SID, direction badge, status badge
  - **Transcript:** rendered as chat-bubble layout — each entry in the `transcript` array (`{ role, content, timestamp }`) shown as a message bubble. `role === 'agent'` on left (slate bg), `role === 'user'` on right (blue bg). Scrollable, max-height 300px.
  - **Grabación:** if `recording_url` exists, render `<audio controls src={recording_url} />`, else "Sin grabación"
  - **Costo:** `cost_breakdown` rendered as formatted key-value pairs (not raw JSON)
- Close button (X) top right

---

## Page 3: `/admin/voice/phone-numbers` — Phone Numbers

### Layout
- Header: "Números de Teléfono" + "Comprar Número" button
- 3-column card grid
- Empty state: "No hay números registrados. Compra tu primer número." with CTA button

### Phone Number Card
- Phone number formatted (e.g. +1 (555) 123-4567)
- Project name (or "Sin asignar" if `project_id` is null)
- Status badge: active=green, released=gray, pending=yellow
- Country code flag or text
- Actions dropdown (DropdownMenu): Reasignar | Liberar

### Modal: Comprar Número
**Single-step flow** (API does not support search-then-confirm):
- Client selector dropdown (admin selects which client)
- Project selector dropdown (filtered by selected client, only voice projects)
- `area_code` input (optional, labeled "Código de área")
- On confirm → `voiceApi.purchaseNumber({ project_id, client_id, area_code: areaCodeInput || undefined })`
- The API auto-selects the first available number matching the area code
- Success: close modal, refresh list
- Error: show error message inside modal

### Modal: Reasignar
- Project selector (all voice projects)
- On confirm → `voiceApi.reassignNumber(id, { project_id })`

### Confirm Dialog: Liberar
- Warning: "¿Liberar este número? Esta acción no se puede deshacer y el número será devuelto a Twilio."
- Confirm → `voiceApi.releaseNumber(id)`
- On success: refresh list

### Data Sources
- `voiceApi.phoneNumbers()` on mount
- `projectsApi.list()` for project selectors (filter by type starting with `voz-`)
- `clientsApi.list()` for client selector in purchase modal

---

## Page 4: `/admin/voice/config` — Voice Configuration

### Initial State
- Page loads with a project selector in the header, no project pre-selected
- When no project is selected: form sections are hidden, show placeholder text "Selecciona un proyecto para ver su configuración"
- When a project is selected: fetch config via `voiceApi.getConfig(projectId)`
  - If response is 404 (no config exists): show empty form with default values and a note "Este proyecto no tiene configuración de voz. Guarda para crear una."
  - If response is 200: populate form fields

### Project Selector
- Dropdown of all projects with type starting with `voz-`
- Fetched via `projectsApi.list()` on mount

### Form Sections

#### 1. Pipeline
- STT Model: `<select>` with options: `deepgram-nova-2`, `deepgram-nova`, `whisper-1`
- TTS Model: `<select>` with options: `deepgram-aura-asteria-en`, `deepgram-aura-luna-en`, `deepgram-aura-stella-en`
- LLM Model: `<select>` with options: `gpt-4o-mini`, `gpt-4o`
- TTS Language: text input (e.g. `en-US`)

#### 2. Comportamiento
- Greeting Message: `<textarea>` (rows=3)
- End Call Phrases: tag-style input — type a phrase, press Enter to add. Stored as string array. Each tag shows an X to remove.
- Max Call Duration: number input (seconds), labeled "Duración máxima (seg)"
- Silence Timeout: number input (seconds), labeled "Silencio antes de colgar (seg)"
- Transfer Number: text input (phone number format)

#### 3. Integración n8n
- n8n Voice Webhook URL: text input (URL)
- Voice Tools: `<textarea>` (rows=6, monospace font) for JSON array of tool definitions. Show a placeholder `[{"name": "example_tool", "description": "..."}]`

#### 4. Avanzado
- LiveKit Room Prefix: text input
- Voice Max Tokens: number input

### Save Behavior
- "Guardar Configuración" button at bottom
- On save → `voiceApi.updateConfig(projectId, formData)`
- Success: show inline green success message "Configuración guardada"
- Error: show inline red error message with error text

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

src/components/shared/
  AdminSidebar.tsx             ← Update: add collapsible Voz sub-nav
```

No new shared components. Reuse: MetricCard, existing UI primitives (Button, Input, Badge, Table, DropdownMenu, etc.)

---

## Design Patterns (matching existing codebase)

- **Colors:** `#0F172A` bg, `#2B79FF` blue, `#64748B` slate, `#F8FAFC` white, `#10B981` green
- **Classes:** `glass-card`, `glow-blue` utility classes from globals.css
- **Animations:** framer-motion `initial={{ opacity: 0, y: 20 }}` with stagger via `delay` prop on MetricCards
- **Charts:** recharts AreaChart pattern from dashboard page
- **Tables:** custom styled tables matching clients/projects pages
- **Modals:** inline state-driven modals with backdrop `bg-black/50`, matching NewClientModal pattern
- **Loading:** spinner or "Cargando..." text while fetching, no skeleton components
- **Error states:** inline error message below the relevant section
- **CRITICAL:** `DropdownMenuTrigger` does NOT support `asChild` prop in this shadcn v4

---

## Out of Scope

- Real-time call status updates (WebSocket/polling)
- Audio recording playback controls beyond native `<audio>` element
- Voice agent performance analytics
- Adding `/api/voice/calls?status=` filter to backend (status filtering is client-side only)
