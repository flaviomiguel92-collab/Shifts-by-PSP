# PSP Turnos - Brand Guidelines

## Visual Identity

### Logo
- **Name**: PSP Officer Badge Logo
- **Style**: Police officer silhouette with tactical star
- **Colors**: Tactical Blue (#3B82F6) primary, Dark Blue (#1E40AF) secondary, White accents
- **Variants**: Badge (square), Icon (circular), Full (with text)

### Color Palette

#### Primary Colors
- **Primary Blue**: `#3B82F6` - Authority, trust, primary actions
- **Dark Blue**: `#1E40AF` - Backgrounds for badges, secondary actions
- **Light Blue**: `#60A5FA` - Accents, borders, highlights

#### Background Colors
- **Base Dark**: `#0F172A` - Main background for all screens
- **Secondary Dark**: `#1E293B` - Secondary backgrounds, cards
- **Tertiary Gray**: `#334155` - Borders, dividers

#### Text Colors
- **Primary Text**: `#E2E8F0` - Main text content
- **Secondary Text**: `#CBD5E1` - Secondary content
- **Tertiary Text**: `#94A3B8` - Labels, captions
- **Muted Text**: `#64748B` - Disabled text, timestamps

#### Status Colors
- **Success**: `#22C55E` - Morning shifts, positive actions
- **Night Shift**: `#A855F7` - Night shifts (purple)
- **Administrative**: `#EF4444` - Admin shifts (red)
- **Evening**: `#F59E0B` - Evening shifts (orange)
- **Error**: `#EF4444` - Errors, warnings
- **Warning**: `#F59E0B` - Caution states

### Typography
- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Sizes**: 11px, 12px, 14px, 16px, 18px, 24px, 28px
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Spacing System
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 20px
- **2xl**: 24px
- **3xl**: 32px

### Border Radius
- **sm**: 4px
- **md**: 6px
- **lg**: 8px
- **xl**: 12px
- **full**: 9999px

## Favicon Generation

### Setup
1. Ensure `sharp` is installed: `npm install --save-dev sharp`
2. Place `favicon.svg` in the `public` folder

### Generate All Favicon Sizes
```bash
npm run generate-favicons
```

This will create:
- `favicon.svg` - SVG favicon (scalable, used as primary)
- `favicon.png` - 32x32 browser tab icon
- `apple-touch-icon.png` - 180x180 iOS home screen icon
- `icon-192x192.png` - 192x192 PWA icon
- `icon-512x512.png` - 512x512 PWA icon (splash screens)
- `icon-maskable-192x192.png` - 192x192 maskable icon (for adaptive icons)
- `mstile-150x150.png` - 150x150 Windows tile icon

### iOS Installation
When users "Add to Home Screen" on iOS:
1. They will see the PSP Turnos app name
2. The icon will be the tactical blue badge with officer silhouette
3. Launch screen will use the tactical dark blue (#3B82F6) theme color

### Web Installation
- Browser tab displays small 32x32 favicon
- PWA installation dialog shows both 192x192 and 512x512 icons
- Splash screen uses theme color (#3B82F6)

## Using the Logo Component

### React Native
```tsx
import { PSPLogo } from '../components/PSPLogo';

// Badge variant (default)
<PSPLogo size={80} />

// Icon variant (circular)
<PSPLogo size={64} variant="icon" />

// Full variant (with text)
<PSPLogo size={120} variant="full" />
```

### Web
The SVG favicon is automatically served from `/favicon.svg` and is the primary icon source.

## Brand Applications

### Login Screen
- Display full PSP Logo with text
- Use primary blue (#3B82F6) for action buttons
- Dark tactical background (#0F172A)

### Dashboard
- Mini badge logo in header
- Color-coded shift types using status colors
- Professional, clean layout

### Notifications
- Use badge icon in notification badges
- Match color scheme in notification sounds/haptics

### App Store
- Use 512x512 icon for app store listings
- Use the full logo variant in store screenshots
- Highlight tactical, professional aspects in description

## Color Usage Guidelines

### When to Use Each Color
- **Primary Blue (#3B82F6)**: Buttons, links, primary UI elements, important text
- **Dark Blue (#1E40AF)**: Badge backgrounds, large section headers
- **Success Green (#22C55E)**: Morning shifts, positive actions, approved items
- **Night Purple (#A855F7)**: Night shifts, special indicators
- **Admin Red (#EF4444)**: Administrative duties, holidays, errors
- **Evening Orange (#F59E0B)**: Evening shifts, warnings, secondary shifts
- **Dark Gray (#1E293B)**: Card backgrounds, secondary surfaces
- **Light Blue (#60A5FA)**: Borders, accents, highlights

### Do's and Don'ts
✅ **Do**:
- Use dark backgrounds (#0F172A, #1E293B) for contrast
- Combine bright blue with dark backgrounds
- Use status colors for shift types consistently
- Apply shadows to badges for depth

❌ **Don't**:
- Use light backgrounds with dark text
- Mix too many status colors in one view
- Use brand colors for disabled states
- Apply brand blue on light backgrounds without contrast testing

## Future Updates
- High-resolution assets for print materials
- 3D logo variations for future app versions
- Animation guidelines for logo reveal
- Localized variants for international markets
