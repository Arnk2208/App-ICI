---
name: TriajeIA Perú Spatial Glass
colors:
  surface: '#f6faff'
  surface-dim: '#d5dbe0'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4fa'
  surface-container: '#e9eef4'
  surface-container-high: '#e4e9ef'
  surface-container-highest: '#dee3e9'
  on-surface: '#171c21'
  on-surface-variant: '#434655'
  inverse-surface: '#2b3136'
  inverse-on-surface: '#ecf1f7'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#ae0010'
  on-tertiary: '#ffffff'
  tertiary-container: '#d52022'
  on-tertiary-container: '#ffecea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f6faff'
  on-background: '#171c21'
  surface-variant: '#dee3e9'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system is tailored for high-speed, empathetic medical pre-triage across Peru's public and private healthcare landscapes. The brand personality balances clinical precision, life-critical urgency, and spatial tranquility. It removes clinical anxiety through airy, crystalline spatial glass interfaces while maintaining rigorous diagnostic hierarchy.

The design movement combines **Apple Spatial UI** and **Liquid Glassmorphism**:
- Multi-planar, refractive liquid glass panels that float above ambient clinical environments.
- Continuous squircle silhouettes that eliminate abrasive mechanical sharp edges.
- High-contrast chromatic signals mapped directly to triage acuity tiers (critical emergency, urgent, non-urgent consultation).
- Tactile, elevated responsiveness that confirms critical triage choices with high clarity.

## Colors

The color system anchors clinical diagnostics in intuitive chromatic associations:

- **Primary (`#2563EB` - Electric Medical Blue):** Used for primary interactive actions, triage progression indicators, and focal diagnostic highlights.
- **Secondary (`#10B981` - Emerald Triage Badge):** Reserved for ambulatory confirmation, low-risk classification (Nivel V / IV triaje), and confirmed vital status.
- **Tertiary (`#DC2626` - Vibrant Emergency Crimson):** Exclusively reserved for high-risk triage signals (Nivel I Reanimación / Nivel II Emergencia), distress indicators, and instant ambulance dispatch triggers.
- **Warning Alert (`#F59E0B` - Amber Priority):** Designates intermediate urgency (Nivel III Urgencia Relativa) requiring medical evaluation within 30–60 minutes.
- **Canvas & Neutral Surfaces:**
  - *Icy Crystal Canvas (Light Mode default):* Base fill `#EEF3F9` with ambient radial refraction in `#E0ECFA` and `#F8FAFC`.
  - *Obsidian Dark Mode:* Base canvas `#0B0F17` paired with deep crystalline slate overlays `#131B2A`.

Every translucent layer maintains strict WCAG 2.1 AA/AAA contrast ratios against dynamic backdrops by backing text with adaptive light-refracting backing fills.

## Typography

The design system employs **Plus Jakarta Sans** across all tiers. Its geometry provides instant legibility on spatial glass surfaces, maintaining structural clarity when viewed over dynamic blurs and refractive light leaks.

- **Numerics & Vitals:** Heart rates, O2 saturations, systolic/diastolic meters, and queue times use tabular figures (`font-variant-numeric: tabular-nums`) within `headline-md` and `headline-lg` to prevent layout shift during live readings.
- **Bilingual & Medical Clarity:** Medical terminology and dual Peruvian Spanish/Quechua clinical labels utilize distinct label tiers (`label-sm` and `label-md`) with deliberate tracking to ensure unambiguous recognition under stress.
- **Mobile Adaptations:** Display titles drop down smoothly below the 768px threshold to prevent awkward wrapping of critical health instructions.

## Layout & Spacing

The layout utilizes a floating spatial grid that feels expansive yet compact enough for one-handed operation in triage intake workflows:

- **Desktop & Clinical Tablets (>= 1024px):** 12-column responsive fluid grid with `2rem` outer margin and `1.5rem` gutters. Accommodates two-pane layouts: intake chat/telemetry on the left, floating spatial glass diagnostics card on the right.
- **Handheld & Mobile (< 768px):** 4-column layout with `1rem` outer margin and `1rem` gutters. Primary triage interaction zones concentrate in the lower 60% of viewport ("Thumb Zone") inside floating glass bottom sheets.
- **Rhythm Rules:** All layout heights, margins, and gaps adhere to a foundational 4px/8px incremental scale, using `space-xs` (6px) for micro-tags up to `space-xl` (48px) for separating triage stages.

## Elevation & Depth

Spatial depth is achieved through layered optical refraction, continuous squircle containment, and translucent materials rather than flat drop shadows:

- **Material Base (Liquid Glass):** 
  - `backdrop-filter: blur(32px) saturate(180%)`
  - Fill: Light mode uses `rgba(255, 255, 255, 0.68)`; Dark mode uses `rgba(17, 24, 39, 0.72)`.
- **Refraction Borders & Inner Glow:**
  - 1px border constructed with linear gradients reflecting light from top-left: `rgba(255, 255, 255, 0.85)` at apex fading to `rgba(255, 255, 255, 0.2)` at base.
  - Inner glow: `box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.04)`.
- **Elevation Layers:**
  - **Level 0 (Canvas):** Underlying icy crystal backdrop `#EEF3F9` or obsidian `#0B0F17`.
  - **Level 1 (Ambient Cards):** `0 12px 32px -4px rgba(37, 99, 235, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)`.
  - **Level 2 (Interactive Floating Sheets & Modals):** `0 24px 48px -8px rgba(37, 99, 235, 0.16), 0 8px 24px -4px rgba(15, 23, 42, 0.08)`.
  - **Level 3 (Emergency Overlays / Priority Alerts):** `0 32px 64px -12px rgba(220, 38, 38, 0.28), 0 12px 28px -6px rgba(15, 23, 42, 0.16)`.

## Shapes

The design system enforces continuous squircle curves across all geometric components:

- **Large Glass Cards & Modals:** Continuous squircle border-radius between `28px` and `36px` (`corner-smoothing: 60%` or CSS squircle simulation).
- **Interactive Buttons & Input Fields:** Standardized at `20px` to `24px` radius for natural palm and finger ergonomics.
- **Pills, Badges & Triage Status Indicator Chips:** Full pill radius (`9999px`) to immediately convey status markers, categorizations, and categorical tags.
- Structural elements never terminate in 90-degree right angles, creating a frictionless spatial flow.

## Components

### Buttons
- **Primary Spatial Button:** Pill-shaped or 24px squircle. Background: Electric Medical Blue `#2563EB` with an overlay gradient of `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)`. White text (`label-lg`), inner highlight border `rgba(255,255,255,0.4)`, dynamic drop shadow `0 8px 20px rgba(37,99,235,0.3)`.
- **Emergency Button:** Vibrant Emergency Crimson `#DC2626` base, pulsing subtle ambient glow `0 0 24px rgba(220,38,38,0.45)` for direct SOS or critical triage escalation.
- **Secondary Glass Button:** Translucent glass fill `rgba(255, 255, 255, 0.5)`, 1px crystalline border, text `#2563EB`.

### Cards & Triage Panels
- Standard triage intake cards feature `32px` squircle corners, `backdrop-filter: blur(32px)`, and top-to-bottom optical refraction borders.
- Padding uses `space-lg` (32px) on desktop and `space-md` (20px) on mobile.

### Chips & Acuity Badges
- Continuous pill shape (`border-radius: 9999px`), padding `6px 14px`.
- **Nivel I (Resucitación):** `#DC2626` text, `rgba(220,38,38,0.12)` liquid fill, `#DC2626` border at 30% opacity.
- **Nivel II/III (Emergencia / Urgencia):** `#F59E0B` text, `rgba(245,158,11,0.12)` fill.
- **Nivel IV/V (No Urgente):** `#10B981` text, `rgba(16,185,129,0.12)` fill.

### Input Fields & Symptom Selectors
- Height: 56px with `20px` squircle radius.
- Background: `rgba(255, 255, 255, 0.6)`. Active focus transitions the border to Electric Medical Blue `#2563EB` with an external halo glow `0 0 0 4px rgba(37,99,235,0.15)`.

### Checkboxes & Segmented Radio Discs
- 24px continuous rounded squares (checkbox) or circular lens discs (radio).
- Unchecked: Translucent liquid border `rgba(15, 23, 42, 0.18)` over glass. Checked: Filled with `#2563EB` with an inset micro-glint reflection and crisp white iconography.

### Additional Specialty Component: Vital Telemetry Gauge
- Real-time glass circular dials with liquid fills indicating heart rate, blood pressure, and oxygen saturation with chromatic warnings transitioning from Emerald (`#10B981`) to Amber (`#F59E0B`) to Crimson (`#DC2626`).