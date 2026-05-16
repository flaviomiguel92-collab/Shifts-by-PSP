# PROJECT PROGRESS

## App: Turnos — Shift Management for PSP

**Stack:** Expo / React Native, Zustand, FastAPI + MongoDB (Render), Vercel (web)
**Platform:** iOS, Android, Web (PWA)

---

## COMPLETED

### Session 1 — Auth & Data Fixes
- [x] Fixed forced re-login on cold start (Render 503 treated as 401)
- [x] Fixed logout button freeze (fire-and-forget, no await)
- [x] Fixed shift type data loss on re-login (migration logic in fetchShiftTypes)
- [x] Fixed "Folga" resolving to pink (added to SHIFT_TYPE_COLORS → #64748B)

### Session 2 — Full UI Redesign
- [x] New premium color palette in `colors.ts` (COLORS, SHADOWS, SHIFT_TYPE_COLORS)
- [x] Custom floating glass tab bar (`TabBar.tsx`)
- [x] Tab layout with Inter font injection for web (`_layout.tsx`)
- [x] Redesigned login.tsx — glassmorphism card, gradient background
- [x] Redesigned register.tsx — matching login style
- [x] Redesigned gratificados.tsx — glass cards, KPI boxes, progress bars
- [x] Redesigned stats.tsx — hero gradient card, bar chart, monthly table
- [x] Redesigned profile.tsx — initials avatar, collapsible sections
- [x] Redesigned ShiftModal.tsx — drag handle, color swatch, gradient save btn
- [x] Updated index.tsx (calendar) — dark backgrounds, today cell glow
- [x] Updated ocorrencias.tsx — glass cards, dark inputs, premium badges

---

## COMPLETED (Session 3)

### Phase 1 — Design System & Component Library
- [x] PROJECT_PROGRESS.md, UI_SYSTEM.md, COMPONENT_MAP.md created
- [x] `src/components/ui/GlassCard.tsx` — glass card with optional press handler
- [x] `src/components/ui/Button.tsx` — 5 variants (primary/secondary/ghost/danger/success), 3 sizes, icon support, loading state
- [x] `src/components/ui/Input.tsx` — label, icon, focus states, error/hint, multiline
- [x] `src/components/ui/Badge.tsx` — 6 variants with icon support
- [x] `src/components/ui/EmptyState.tsx` — icon, title, subtitle, optional action button
- [x] `src/components/ui/Skeleton.tsx` — animated pulse + SkeletonCard + SkeletonCalendarRow
- [x] `src/components/ui/StatCard.tsx` — KPI card with trend indicator + StatCardRow layout
- [x] `src/components/ui/SectionHeader.tsx` — section title with optional right action
- [x] `src/components/ui/FAB.tsx` — floating action button with expandable sub-actions
- [x] `src/components/ui/index.ts` — barrel export

### Phase 2 — Calendar Enhancements
- [x] Multi-select mode: long-press a day cell to enter multi-select
- [x] Tap days to add/remove from selection (visual checkmark + blue highlight)
- [x] Floating action bar shows selected count + "Aplicar Turno" + "Cancelar"
- [x] Shift type picker modal for multi-select (shows all types with times)
- [x] Skeleton loading while `fetchShifts` is in progress

### Phase 3 — Stats Dashboard Expansion
- [x] New KPI cards row: Turnos este mês, Noites, Folgas, Dias consecutivos
- [x] Shift type breakdown chart for current month (per-type bar + color dot)
- [x] Night shift detection (by start_time or name heuristic)
- [x] Days off detection (by name: folga/off/descanso or is_working=false)
- [x] Consecutive working days calculation
- [x] Yearly heatmap: 12-month 2-column grid, each day colored by shift type

### Phase 4 — Loading & Feedback
- [x] Toast notification system (Zustand store + animated slide-in Toast component)
- [x] Toast wired into shift save, delete, duplicate, copy week, export
- [x] Skeleton loaders for calendar grid (SkeletonCalendarRow)

### Phase 5 — Export System
- [x] `src/utils/exportUtils.ts` — exportShiftsToCSV, exportGratifiedToCSV, shareCSV, exportMonthlyPDF
- [x] PDF export: styled HTML calendar with KPI boxes, open in print dialog (web) or share sheet (native)
- [x] CSV export: Blob download (web), FileSystem write + Sharing (native)
- [x] Export section in profile.tsx with 3 export buttons (PDF, Shifts CSV, Gratificados CSV)

### Phase 6 — Quick Actions
- [x] Duplicate shift: copies selected shift to next day (with update if exists)
- [x] Copy week: copies current week's shifts to the following week via bulkUpsertShifts

### Phase 7 — PWA Polish
- [x] `src/components/ui/OfflineBanner.tsx` — web-only banner on `navigator offline` event
- [x] `src/components/ui/InstallPrompt.tsx` — captures `beforeinstallprompt`, shows install CTA (dismissible), hides if already in standalone mode
- [x] `app/_layout.tsx` — animated splash screen (spring fade + scale + pulse glow on "S" logo), replaces bare ActivityIndicator; OfflineBanner + InstallPrompt mounted globally

### Phase 8 — Quick Actions FAB
- [x] `index.tsx` (calendar): FAB with 2 actions — Novo Turno (opens ShiftModal for today) + Novo Gratificado (opens GratifiedModal for today)
- [x] `gratificados.tsx`: FAB + GratifiedModal wired directly — Novo Gratificado for today's date

---

## COMPLETED (Session 4 — Technical Audit)

### Security & Backend
- [x] `/api/reports/generate` requires Bearer auth
- [x] Shift routes reordered: fixed paths before `{id}` (prevents `/bulk` and `/reset` conflicts)
- [x] OAuth sessions standardised to 30 days
- [x] `DemoAuthRequest` unused class removed
- [x] `requirements.txt`: removed boto3, jq, docxtpl, docx2pdf, pandas, numpy

### Frontend Quality
- [x] `sharp` removed from devDependencies; `package-lock.json` regenerated
- [x] `tsconfig.json`: removed `noImplicitAny: false` workaround — `strict: true` now passes clean
- [x] `src/store/dataStore.ts`: migrated from `create<any>` to fully typed `create<DataStore>`
- [x] `src/services/api.ts`: all functions typed (Occurrence, Shift, Gratification)
- [x] `app/(tabs)/ocorrencias.tsx`: reduced ~1500 → ~650 lines
  - `PersonFormModal` extracted → `src/components/occurrence/PersonFormModal.tsx`
  - `CreateOccurrenceModal` extracted → `src/components/occurrence/CreateOccurrenceModal.tsx`

### CI/CD
- [x] GitHub Actions: `npm ci`, lint, `npx tsc --noEmit`, web build as blocking checks
- [x] Vercel deploy via `npx vercel@latest` from repo root
- [x] Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` configured

---

## COMPLETED (Session 5)

### Phase 9 — Dashboard Charts
- [x] Donut/PieChart for shift type distribution (center label with total hours)
- [x] Area/LineChart for monthly evolution (this year, 12-month)
- [x] Yearly comparison LineChart (this year vs last year, `data2` prop)
- [x] Overtime hours KPI + overtime shift detection by type name heuristic
- [x] `shiftDurationMins()` helper — parses HH:MM strings, handles overnight shifts

### Phase 10 — Gratificados Improvements
- [x] Search / filter entries by name in month card (TextInput with clear button)
- [x] Excel (.xlsx) export via SheetJS — web: Blob download; native: FileSystem + Sharing

### Phase 11 — Global Search
- [x] `src/utils/search.ts` — Zustand store (isOpen / open / close / toggle)
- [x] `src/components/SearchModal.tsx` — animated modal, searches shifts + gratificados + occurrences, grouped results, max 40, min 2 chars
- [x] Wired into `app/(tabs)/_layout.tsx` — `<SearchModal />` mounted globally, Cmd+K / Ctrl+K + Escape keyboard listener on web
- [x] Search button (🔍) added to calendar header in `index.tsx`

### Other
- [x] App renamed from "Shift Olama" → **"Turnos"** (app.json name + slug)
- [x] PSP badge logo applied across all asset sizes (icon.png 1024, adaptive-icon.png 1024, splash-image.png 512, favicon.png 48)
- [x] Animated splash screen uses real logo image instead of letter
- [x] Ionicons web fix — added `'Ionicons'` to font-family fallback stack so PUA glyphs render correctly
- [x] Logout double-navigation bug fixed (removed redundant `router.replace` in `doLogout`)

---

## PENDING

### Phase 12 — Profile / Settings *(on hold)*
- [ ] Full JSON backup — export all store data (shifts, gratificados, occurrences, cycles, shiftTypes) as downloadable `.json`
- [ ] JSON restore — file picker import, replace store state
- [ ] Active sessions list with revoke
- [ ] Theme / language preferences

### Backend
- [ ] MongoDB indexes: `user_id`, `date`, `email`, `session_token`
- [ ] Migrate `cycles` and `gratifiedEntries` from localStorage to MongoDB
- [ ] Unify auth cookies (currently inconsistent `secure`/`samesite` flags)

---

## MODIFIED FILES LOG

| File | Last Modified | Changes |
|------|--------------|---------|
| frontend/src/theme/colors.ts | Session 2 | Full premium palette |
| frontend/src/components/TabBar.tsx | Session 2 | Created: floating glass tab bar |
| frontend/app/(tabs)/_layout.tsx | Session 2 | Inter font, custom tab bar |
| frontend/app/login.tsx | Session 2 | Full redesign |
| frontend/app/register.tsx | Session 2 | Full redesign |
| frontend/app/(tabs)/index.tsx | Session 2+3+4 | Redesign, multi-select, duplicate, copy week, toasts, skeletons, FAB |
| frontend/app/(tabs)/gratificados.tsx | Session 2+4 | Full redesign, FAB + GratifiedModal |
| frontend/app/(tabs)/stats.tsx | Session 2+3 | Full redesign, KPI cards, shift breakdown, yearly heatmap |
| frontend/app/(tabs)/profile.tsx | Session 2+3 | Full redesign, export section (PDF + CSV) |
| frontend/app/(tabs)/ocorrencias.tsx | Session 2+4 | Style updates, extracted PersonFormModal + CreateOccurrenceModal |
| frontend/src/components/ShiftModal.tsx | Session 2 | Full redesign |
| frontend/src/store/authStore.ts | Session 1 | Auth fixes |
| frontend/src/store/dataStore.ts | Session 1+4 | Data loss fix, full TypeScript typing |
| frontend/src/services/api.ts | Session 4 | Full TypeScript typing |
| frontend/src/components/ui/Toast.tsx | Session 3 | Created: animated toast notification |
| frontend/src/utils/toast.ts | Session 3 | Created: Zustand toast store + imperative API |
| frontend/src/utils/exportUtils.ts | Session 3 | Created: PDF/CSV export utilities |
| frontend/app/_layout.tsx | Session 3+4 | ToastContainer, animated splash, OfflineBanner, InstallPrompt |
| frontend/src/components/ui/OfflineBanner.tsx | Session 4 | Created: web offline indicator |
| frontend/src/components/ui/InstallPrompt.tsx | Session 4 | Created: PWA install CTA |
| frontend/src/components/occurrence/PersonFormModal.tsx | Session 4 | Created: extracted from ocorrencias.tsx |
| frontend/src/components/occurrence/CreateOccurrenceModal.tsx | Session 4 | Created: extracted from ocorrencias.tsx |
| frontend/tsconfig.json | Session 4 | Removed noImplicitAny:false — strict:true clean |
| backend/server.py | Session 4 | Auth fixes, route ordering, session duration |
| backend/requirements.txt | Session 4 | Removed 6 unused heavy dependencies |
| frontend/app/(tabs)/stats.tsx | Session 5 | PieChart donut, LineChart area + yearly comparison, overtime KPI |
| frontend/app/(tabs)/gratificados.tsx | Session 5 | Search/filter bar, XLSX export button |
| frontend/app/(tabs)/index.tsx | Session 5 | Search trigger button in header |
| frontend/app/(tabs)/_layout.tsx | Session 5 | SearchModal mount + Cmd+K/Escape keyboard listener, Ionicons font fix |
| frontend/app/(tabs)/profile.tsx | Session 5 | Logout double-nav bug fixed |
| frontend/app/_layout.tsx | Session 5 | Animated splash uses real logo image |
| frontend/app.json | Session 5 | Renamed app to "Turnos", slug to "turnos-psp" |
| frontend/assets/images/icon.png | Session 5 | PSP badge logo 1024×1024 |
| frontend/assets/images/adaptive-icon.png | Session 5 | PSP badge logo 1024×1024 |
| frontend/assets/images/splash-image.png | Session 5 | PSP badge logo 512×512 |
| frontend/assets/images/favicon.png | Session 5 | PSP badge logo 48×48 |
| frontend/src/utils/search.ts | Session 5 | Created: Zustand search modal store |
| frontend/src/components/SearchModal.tsx | Session 5 | Created: global animated search modal |
| frontend/src/utils/exportUtils.ts | Session 5 | Added exportGratifiedToXLSX (SheetJS) |

---

## ARCHITECTURE DECISIONS

- **Stack kept as Expo/React Native** (not migrated to Next.js — would break all existing functionality)
- **No backend changes** unless strictly required by new features
- **Design tokens** centralized in `colors.ts` (COLORS, SHADOWS, SHIFT_TYPE_COLORS)
- **Font strategy**: Inter injected via Google Fonts CSS on web; system font fallback on native
- **Reusable components** live in `frontend/src/components/ui/`
- **TypeScript strict mode** enforced — `create<DataStore>` in Zustand, all API functions typed
- **Component extraction**: large screens split into self-contained modal components under `src/components/`
