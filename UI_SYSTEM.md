# UI SYSTEM — Turnos Design Tokens

## Philosophy
Dark futuristic premium UI inspired by Linear, Raycast, Revolut.
Glassmorphism cards, neon blue accents, smooth animations.

---

## COLOR PALETTE

All tokens defined in `frontend/src/theme/colors.ts` as `COLORS`.

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#050816` | Root screen background |
| `backgroundSecondary` | `#0B1120` | Card / modal sheet bg |
| `backgroundTertiary` | `#111827` | Elevated surface |
| `glass` | `rgba(11,17,32,0.75)` | Glassmorphism card |
| `glassBorder` | `rgba(59,130,246,0.12)` | Card border |

### Brand
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#3B82F6` | Primary actions, active states |
| `primaryDark` | `#1D4ED8` | Gradient end |
| `primaryLight` | `#60A5FA` | Hover, active text |
| `primaryGlow` | `rgba(59,130,246,0.3)` | Shadow glow |
| `secondary` | `#8B5CF6` | Document types, secondary actions |
| `secondaryGlow` | `rgba(139,92,246,0.25)` | Secondary glow |

### Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#10B981` | Positive values, completed |
| `warning` | `#F59E0B` | Pending, in-analysis |
| `error` | `#EF4444` | Danger, delete |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `textPrimary` | `#F1F5F9` | Headings, primary content |
| `textSecondary` | `#CBD5E1` | Body text |
| `textTertiary` | `#94A3B8` | Meta, labels |
| `textMuted` | `#475569` | Placeholders, section labels |
| `textInactive` | `#334155` | Empty states |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `borderLight` | `rgba(255,255,255,0.06)` | Subtle dividers |
| `borderMedium` | `rgba(255,255,255,0.10)` | Input borders |
| `borderAccent` | `rgba(59,130,246,0.20)` | Focused inputs |

---

## TYPOGRAPHY

Font: **Inter** (via Google Fonts on web, system on native)

### Scale
| Name | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 36px | 800 | Hero values (totals) |
| Title | 24px | 800 | Page titles |
| Heading | 18px | 700 | Modal titles, card headings |
| SubHeading | 16px | 700 | Section subheadings |
| Body | 14px | 400 | Primary content |
| BodyStrong | 14px | 600 | Emphasized body |
| Caption | 12px | 500 | Metadata, dates |
| Label | 10px | 700 | Section labels (UPPERCASE + letterSpacing 1.2) |
| Micro | 9px | 600 | Tab labels |

### Rules
- Section labels: `UPPERCASE`, `letterSpacing: 1.2`, color: `textMuted`
- Values/metrics: `fontWeight: 800`, color: `textPrimary` or semantic color
- Dates/meta: color: `textTertiary`

---

## SPACING

Based on 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, tight spacing |
| sm | 8px | Chip padding, small gaps |
| md | 12px | Standard component padding |
| lg | 16px | Card padding, section gaps |
| xl | 20px | Screen horizontal padding |
| xxl | 24px | Large section separation |
| 3xl | 32px | Hero section padding |

---

## BORDER RADIUS

| Element | Radius |
|---------|--------|
| Cards | 18px |
| Modals | 26px (top corners) |
| Buttons | 14px |
| Inputs | 12px |
| Chips/Badges | 10px |
| Dots/Avatars | 50% |
| Tab bar container | 22px |

---

## SHADOWS

Defined in `SHADOWS` export from `colors.ts`.

| Name | Usage |
|------|-------|
| `SHADOWS.card` | Glass cards |
| `SHADOWS.glow` | Today cell, active elements |
| `SHADOWS.modal` | Bottom sheet modals |
| `SHADOWS.button` | Primary CTA buttons |

---

## GLASS CARD STYLE

Standard glass card:
```
backgroundColor: rgba(11, 17, 32, 0.75)
borderRadius: 18
borderWidth: 1
borderColor: rgba(59, 130, 246, 0.1)
padding: 18
shadowColor: #000
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.3
shadowRadius: 12
elevation: 6
```

---

## BUTTON VARIANTS

### Primary
```
backgroundColor: #3B82F6 (or LinearGradient ['#3B82F6', '#1D4ED8'])
borderRadius: 14
paddingVertical: 14
shadow: SHADOWS.button
```

### Secondary / Outline
```
backgroundColor: rgba(59, 130, 246, 0.1)
borderWidth: 1
borderColor: rgba(59, 130, 246, 0.3)
borderRadius: 14
```

### Ghost
```
backgroundColor: rgba(255,255,255,0.05)
borderRadius: 14
```

### Danger
```
backgroundColor: rgba(239, 68, 68, 0.1)
borderWidth: 1
borderColor: rgba(239, 68, 68, 0.2)
```

---

## INPUT STYLE

Standard input:
```
backgroundColor: rgba(5, 8, 22, 0.6)
borderRadius: 12
borderWidth: 1
borderColor: rgba(255, 255, 255, 0.06)
padding: 14
color: #F1F5F9
fontSize: 14
```

Focused:
```
borderColor: rgba(59, 130, 246, 0.4)
```

---

## BADGE VARIANTS

| Status | Background | Text |
|--------|-----------|------|
| Active/Success | rgba(16,185,129,0.15) | #10B981 |
| Warning | rgba(245,158,11,0.15) | #F59E0B |
| Error | rgba(239,68,68,0.15) | #EF4444 |
| Neutral | rgba(148,163,184,0.1) | #94A3B8 |
| Primary | rgba(59,130,246,0.15) | #60A5FA |

---

## ANIMATIONS

### Timing
- Fast: 150ms (hover, tap feedback)
- Normal: 250ms (transitions, modals)
- Slow: 400ms (page transitions, skeleton)

### Easing
- Standard: `ease-in-out`
- Spring: `useNativeDriver: true` + spring for scale

### Patterns
- Tab active: scale 1.0 → 1.1, glow opacity 0 → 1
- Button tap: scale 0.97 (activeOpacity: 0.85)
- Modal: `animationType="slide"` (bottom sheet)
- Cards: `activeOpacity: 0.75`
