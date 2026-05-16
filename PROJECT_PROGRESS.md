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

---

## PENDING

### Phase 7 — PWA Polish
- [ ] Offline banner indicator
- [ ] App install prompt (web)
- [ ] Splash screen animation

### Phase 8 — Quick Actions FAB
- [ ] Floating Action Button (FAB) for new shift / new gratificado

### Phase 7 — PWA Polish
- [ ] Offline banner indicator
- [ ] App install prompt (web)
- [ ] Splash screen animation

---

## MODIFIED FILES LOG

| File | Last Modified | Changes |
|------|--------------|---------|
| frontend/src/theme/colors.ts | Session 2 | Full premium palette |
| frontend/src/components/TabBar.tsx | Session 2 | Created: floating glass tab bar |
| frontend/app/(tabs)/_layout.tsx | Session 2 | Inter font, custom tab bar |
| frontend/app/login.tsx | Session 2 | Full redesign |
| frontend/app/register.tsx | Session 2 | Full redesign |
| frontend/app/(tabs)/index.tsx | Session 2 | Style updates |
| frontend/app/(tabs)/gratificados.tsx | Session 2 | Full redesign |
| frontend/app/(tabs)/stats.tsx | Session 2 | Full redesign |
| frontend/app/(tabs)/profile.tsx | Session 2 | Full redesign |
| frontend/app/(tabs)/ocorrencias.tsx | Session 2 | Style updates |
| frontend/src/components/ShiftModal.tsx | Session 2 | Full redesign |
| frontend/src/store/authStore.ts | Session 1 | Auth fixes |
| frontend/src/store/dataStore.ts | Session 1 | Data loss fix |
| frontend/src/components/ui/Toast.tsx | Session 3 | Created: animated toast notification |
| frontend/src/utils/toast.ts | Session 3 | Created: Zustand toast store + imperative API |
| frontend/src/utils/exportUtils.ts | Session 3 | Created: PDF/CSV export utilities |
| frontend/app/_layout.tsx | Session 3 | Added ToastContainer globally |
| frontend/app/(tabs)/index.tsx | Session 3 | Multi-select, duplicate, copy week, toasts, skeletons |
| frontend/app/(tabs)/stats.tsx | Session 3 | KPI cards, shift breakdown, yearly heatmap |
| frontend/app/(tabs)/profile.tsx | Session 3 | Export section (PDF + CSV) |

---

## ARCHITECTURE DECISIONS

- **Stack kept as Expo/React Native** (not migrated to Next.js — would break all existing functionality)
- **No backend changes** unless strictly required by new features
- **Design tokens** centralized in `colors.ts` (COLORS, SHADOWS, SHIFT_TYPE_COLORS)
- **Font strategy**: Inter injected via Google Fonts CSS on web; system font fallback on native
- **Reusable components** live in `frontend/src/components/ui/`
