# COMPONENT MAP — Turnos

All components live in `frontend/src/components/`.
Reusable UI primitives are in `frontend/src/components/ui/`.

---

## UI PRIMITIVES (`src/components/ui/`)

| Component | File | Props | Used In |
|-----------|------|-------|---------|
| GlassCard | `ui/GlassCard.tsx` | children, style, onPress | All screens |
| Button | `ui/Button.tsx` | title, onPress, variant, icon, loading | All screens |
| Input | `ui/Input.tsx` | label, icon, value, onChangeText, focused, multiline | Login, Register, Modals |
| Badge | `ui/Badge.tsx` | label, variant (success/warning/error/neutral/primary) | Ocorrencias, Stats |
| EmptyState | `ui/EmptyState.tsx` | icon, title, subtitle, action | All list screens |
| Skeleton | `ui/Skeleton.tsx` | width, height, borderRadius, style | Calendar, Stats, Lists |
| StatCard | `ui/StatCard.tsx` | label, value, icon, color, trend | Stats, Dashboard |
| SectionHeader | `ui/SectionHeader.tsx` | title, rightLabel, onRightPress | All screens |
| PageContainer | `ui/PageContainer.tsx` | children, scrollable, padded | All screens |

---

## FEATURE COMPONENTS (`src/components/`)

| Component | File | Props | Used In |
|-----------|------|-------|---------|
| CustomTabBar | `TabBar.tsx` | (expo-router TabBar props) | `(tabs)/_layout.tsx` |
| ShiftModal | `ShiftModal.tsx` | visible, onClose, onSave, onDelete, date, existingShift | index.tsx |
| CycleModal | `CycleModal.tsx` | visible, onClose, onSave | index.tsx |
| GratificationModal | `GratificationModal.tsx` | (gratification props) | gratificados.tsx |
| GratifiedModal | `GratifiedModal.tsx` | (gratified entry props) | gratificados.tsx |
| Calendar | `Calendar.tsx` | (calendar props) | index.tsx |
| ShiftsSummary | `ShiftsSummary.tsx` | (summary props) | index.tsx |
| StatsCard | `StatsCard.tsx` | label, value, icon | stats.tsx (legacy) |
| HeaderWithBack | `HeaderWithBack.tsx` | title | ocorrencias.tsx (legacy) |
| PSPLogo | `PSPLogo.tsx` | size, color | login.tsx, profile.tsx |

---

## SCREEN FILES (`app/`)

| Screen | File | Description |
|--------|------|-------------|
| Root Layout | `app/_layout.tsx` | Auth gate, root navigation |
| Root Index | `app/index.tsx` | Redirect to /login or /(tabs) |
| Login | `app/login.tsx` | Authentication form |
| Register | `app/register.tsx` | User registration |
| Tabs Layout | `app/(tabs)/_layout.tsx` | Tab navigation + Inter font injection |
| Calendar | `app/(tabs)/index.tsx` | Monthly calendar + shift management |
| Gratificados | `app/(tabs)/gratificados.tsx` | Extra pay tracking |
| Ocorrencias | `app/(tabs)/ocorrencias.tsx` | Incident report management |
| Stats | `app/(tabs)/stats.tsx` | Dashboard + charts |
| Profile | `app/(tabs)/profile.tsx` | User settings |

---

## STORES (`src/store/`)

| Store | File | Key State |
|-------|------|-----------|
| Auth | `authStore.ts` | user, isAuthenticated, sessionToken |
| Data | `dataStore.ts` | shifts, shiftTypes, gratifiedEntries, cycles, occurrences |

---

## SERVICES (`src/services/`)

| Service | File | Purpose |
|---------|------|---------|
| API | `api.ts` | All backend HTTP calls (CRUD for all entities) |

---

## UTILITIES (`src/utils/`)

| Utility | File | Key Exports |
|---------|------|-------------|
| Helpers | `helpers.ts` | formatDate, formatMonth, formatCurrency, resolveShiftColor, getCalendarDays |
| Storage | `storage.ts` | AsyncStorage/localStorage abstraction |
| Holidays | `holidays.ts` | Portuguese public holidays |
| GratifiedCalc | `gratifiedCalc.ts` | Extra pay calculation logic |

---

## COMPONENT CREATION RULES

1. **All new UI components** go in `src/components/ui/`
2. **Feature-specific components** go in `src/components/`
3. **Import tokens** from `src/theme/colors.ts` — never hardcode hex values
4. **Never duplicate** card/button/input patterns — use the `ui/` library
5. **StyleSheet.create** for all styles (performance + hot-reload)
6. **Props interface** for every component (`interface XProps {}`)
