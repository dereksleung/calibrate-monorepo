---
name: Lush Kinetic
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#424936'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#727a64'
  outline-variant: '#c2cab0'
  surface-tint: '#446900'
  primary: '#446900'
  on-primary: '#ffffff'
  primary-container: '#a3e635'
  on-primary-container: '#416400'
  inverse-primary: '#98da27'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#F4FCE3'
  on-tertiary: '#ffffff'
  tertiary-container: '#ced6be'
  on-tertiary-container: '#555d4a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2f746'
  primary-fixed-dim: '#98da27'
  on-primary-fixed: '#121f00'
  on-primary-fixed-variant: '#334f00'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#dee6cd'
  tertiary-fixed-dim: '#c2cab2'
  on-tertiary-fixed: '#171e0f'
  on-tertiary-fixed-variant: '#424937'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  container-margin: 24px
  gutter-md: 16px
  section-gap: 40px
  element-padding: 20px
---

## Brand & Style

This design system is built on an "Electric Nature" aesthetic—fusing the organic freshness of a green apple with the high-octane energy of a digital-first interface. It is designed to feel vibrant, playful, and hyper-modern, targeting an audience that values health, speed, and expressive technology.

The visual direction leans into **High-Contrast Boldness** with an infusion of **Minimalism**. It utilizes expansive whites and deep blacks to make the neon-leaning primary color vibrate on screen. The mood is optimistic and fresh, using generous negative space and oversized interactive elements to create a UI that feels physically satisfying to navigate.

## Colors

The palette is dominated by **Apple Neon (#A3E635)**, a high-chroma green that serves as the primary driver for brand recognition and primary actions. 

- **Primary:** Use for main action buttons, active states, and key brand accents.
- **Secondary:** Solid Black is used for high-impact text and secondary containers to provide a structural anchor.
- **Tertiary:** A soft, lime-tinted cream (#F4FCE3) used for subtle background fills and decorative surface layering.
- **Neutral:** A range of deep grays for secondary text and borders, ensuring legibility against the vibrant primary.

## Typography

We use **Manrope** across all levels for its soft, geometric modernism that aligns with the "rounded" aesthetic. 

- **Headlines:** Set with tight tracking and medium (500) weights. They should feel impactful and "tight," commanding attention immediately.
- **Body:** Prioritize readability with slightly increased line heights. Use the Regular (400) weight for primary information to maintain a bold presence.
- **Labels:** Use uppercase styling and medium (500) weights for small metadata or button labels to ensure they aren't lost against vibrant backgrounds.

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous safe areas. 

- **Mobile:** A 4-column grid with 24px side margins. Elements often span the full width to maximize touch targets.
- **Desktop/Tablet:** A 12-column grid. Max-width for content is capped at 1280px to maintain the intimacy of the design.
- **Spacing Rhythm:** Based on an 8px base unit. Large gaps (40px+) are encouraged between sections to allow the vibrant colors to "breathe" without feeling cluttered.

## Elevation & Depth

In this high-contrast light environment, depth is communicated through **Tonal Layers** and subtle color shifts rather than heavy shadows.

- **Level 0 (Background):** Pure White (#ffffff) or Tertiary Lime-White (#F4FCE3).
- **Level 1 (Cards/Navigation):** Clean white with a subtle 1px border in a light grey or the Tertiary color.
- **Level 2 (Modals/Popovers):** White surface with "Ambient Shadows"—light, low-opacity (#000000 at 10%) with large diffusion to create a soft lift.

Shadows are used sparingly. For primary action elements, a soft outer glow using the Primary Color at 15% opacity can be used to indicate focus or "kinetic" energy.

## Shapes

The shape language is defined by **hyper-roundedness**. 

Everything is soft and approachable. Corner radii should never feel sharp. Main cards and containers should utilize the `rounded-xl` (24px-32px) standard to mimic the organic curve of an apple. Buttons should be fully pill-shaped to encourage interaction.

## Components

### Buttons
- Buttons are pill-shaped for the playful energy.
- **Primary:** Solid Primary Color (#a3e635) with Absolute Black (#0a0a0a) text. No border.
- **Secondary:** Solid Secondary Grey (#1e1e1e) with white text, providing a heavy anchor point.
- **Tertiary:** Ghost style. Transparent background with a 1.5px Primary Color border and Absolute Black text.
### Cards
- **Container:** White background, 1px border (#e0e0e0) or Tertiary background (#F4FCE3), 8px corner radius.
- **Interactive:** Slight lift on hover (move -2px Y-axis) with a subtle primary color border.

### Inputs
- **Field:** White or Tertiary background with a subtle bottom border (2px) in Neutral Grey that turns into the Primary Color (#a3e635) on focus.
- **Labels:** Placed above the field in Label-SM style using the Secondary Color.


- **Chips/Tags:** Small, pill-shaped elements used for categorization. Use high-contrast combinations (Black text on Green Apple) for active tags.
- **Lists:** Separated by thin, low-opacity neutral borders. Highlight active items with a vertical primary-color bar on the left edge.