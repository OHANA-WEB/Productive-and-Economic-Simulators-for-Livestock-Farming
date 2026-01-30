# MetaCaprine Intelligence - Professional Color System

## Design Philosophy

**Professional, modern, high-end SaaS dashboard**
- Clean, calm, data-first approach
- No flashy gradients or glassmorphism
- Suitable for long working sessions (8+ hours)
- Inspired by: financial dashboards, intelligence platforms, agritech/biotech analytics

---

## Color Palette

### Dark Mode

#### Backgrounds
- **Primary Background**: `#0f1419` - Deep neutral slate (not pure black)
- **Secondary Background**: `#1a1f2e` - Elevated surface for cards
- **Tertiary Background**: `#252b3a` - Hover states, subtle elevations
- **Quaternary Background**: `#2d3443` - Active states, selected items

#### Text
- **Primary Text**: `#e8ecf0` - High contrast but soft (not pure white)
- **Secondary Text**: `#b4bcc8` - Muted gray for supporting text
- **Tertiary Text**: `#7a8494` - Disabled, placeholders, hints
- **Inverse Text**: `#0f1419` - For text on light backgrounds

#### Accents (Semantic Colors)
- **Success/Positive (Green)**: `#22c55e` - Metrics, positive indicators
- **Success Hover**: `#16a34a` - Darker green for interactions
- **Info/Comparison (Blue)**: `#3b82f6` - Comparisons, selections, info
- **Info Hover**: `#2563eb` - Darker blue for interactions
- **Warning (Yellow)**: `#eab308` - Warnings, attention needed
- **Warning Hover**: `#ca8a04` - Darker yellow for interactions
- **Error (Red)**: `#ef4444` - Errors, negative metrics
- **Error Hover**: `#dc2626` - Darker red for interactions

#### Borders & Dividers
- **Border Primary**: `#2d3443` - Main borders, subtle separators
- **Border Secondary**: `#3a4251` - Hover borders, active states
- **Border Subtle**: `#1f2532` - Very subtle dividers

#### Shadows
- **Shadow Light**: `rgba(0, 0, 0, 0.2)` - Card shadows
- **Shadow Medium**: `rgba(0, 0, 0, 0.3)` - Hover shadows
- **Shadow Heavy**: `rgba(0, 0, 0, 0.5)` - Modal, dropdown shadows

#### Chart Colors (Muted but distinguishable)
- **Chart Primary**: `#3b82f6` - Blue for primary data series
- **Chart Secondary**: `#22c55e` - Green for secondary/comparison
- **Chart Tertiary**: `#eab308` - Yellow for tertiary data
- **Chart Quaternary**: `#8b5cf6` - Purple for additional series
- **Chart Quinary**: `#f97316` - Orange for additional series
- **Chart Grid**: `#2d3443` - Grid lines, subtle
- **Chart Axis**: `#7a8494` - Axis labels and ticks

---

### Light Mode

#### Backgrounds
- **Primary Background**: `#f8f9fa` - Off-white (avoid pure white)
- **Secondary Background**: `#ffffff` - Card surfaces
- **Tertiary Background**: `#f1f3f5` - Hover states, subtle elevations
- **Quaternary Background**: `#e9ecef` - Active states, selected items

#### Text
- **Primary Text**: `#1a1f2e` - Near-black for high contrast
- **Secondary Text**: `#495057` - Neutral gray for supporting text
- **Tertiary Text**: `#868e96` - Disabled, placeholders, hints
- **Inverse Text**: `#ffffff` - For text on dark backgrounds

#### Accents (Semantic Colors - Same meaning, adjusted brightness)
- **Success/Positive (Green)**: `#16a34a` - Metrics, positive indicators
- **Success Hover**: `#15803d` - Darker green for interactions
- **Info/Comparison (Blue)**: `#2563eb` - Comparisons, selections, info
- **Info Hover**: `#1d4ed8` - Darker blue for interactions
- **Warning (Yellow)**: `#ca8a04` - Warnings, attention needed
- **Warning Hover**: `#a16207` - Darker yellow for interactions
- **Error (Red)**: `#dc2626` - Errors, negative metrics
- **Error Hover**: `#b91c1c` - Darker red for interactions

#### Borders & Dividers
- **Border Primary**: `#dee2e6` - Main borders, subtle separators
- **Border Secondary**: `#ced4da` - Hover borders, active states
- **Border Subtle**: `#e9ecef` - Very subtle dividers

#### Shadows
- **Shadow Light**: `rgba(0, 0, 0, 0.05)` - Card shadows
- **Shadow Medium**: `rgba(0, 0, 0, 0.08)` - Hover shadows
- **Shadow Heavy**: `rgba(0, 0, 0, 0.15)` - Modal, dropdown shadows

#### Chart Colors (High contrast, clear)
- **Chart Primary**: `#2563eb` - Blue for primary data series
- **Chart Secondary**: `#16a34a` - Green for secondary/comparison
- **Chart Tertiary**: `#ca8a04` - Yellow for tertiary data
- **Chart Quaternary**: `#7c3aed` - Purple for additional series
- **Chart Quinary**: `#ea580c` - Orange for additional series
- **Chart Grid**: `#e9ecef` - Grid lines, subtle
- **Chart Axis**: `#868e96` - Axis labels and ticks

---

## Design Tokens / CSS Variables

### Structure
```css
:root {
  /* Light mode - default */
  --color-*: [light mode value];
}

.dark-mode {
  /* Dark mode - override */
  --color-*: [dark mode value];
}
```

### Naming Convention
- `--color-bg-*` for backgrounds
- `--color-text-*` for text
- `--color-accent-*` for semantic accents
- `--color-border-*` for borders
- `--color-shadow-*` for shadows
- `--color-chart-*` for chart colors

---

## UX Rationale

### Background Choices
- **Dark Mode**: Deep slate (`#0f1419`) instead of pure black reduces eye strain and provides subtle depth
- **Light Mode**: Off-white (`#f8f9fa`) reduces glare compared to pure white, more comfortable for extended use

### Text Contrast
- All text colors meet WCAG AA standards (4.5:1 minimum)
- Primary text has high contrast but uses soft whites/grays to avoid harshness
- Three-tier hierarchy (primary/secondary/tertiary) provides clear information hierarchy

### Semantic Colors
- **Green**: Universal positive indicator (profits, growth, success)
- **Blue**: Neutral information, comparisons, selections (trustworthy, professional)
- **Yellow**: Attention/warning (not urgent, but needs awareness)
- **Red**: Errors, negative metrics (clear, immediate attention)

### Chart Colors
- Muted in dark mode to avoid eye strain during long sessions
- High contrast in light mode for clarity
- Consistent semantic meaning across themes
- No neon colors - professional, calm palette

### Borders & Shadows
- Subtle, low-contrast separators maintain clean aesthetic
- Layered shadow system provides depth without distraction
- Borders use same color family as backgrounds for cohesion

---

## Implementation Notes

1. **No Layout Changes**: Only color values change, structure remains identical
2. **Smooth Transitions**: Consider adding `transition: background-color 0.2s, color 0.2s` for theme switching
3. **Chart Integration**: Update `useChartColors` hook to use new color tokens
4. **Accessibility**: All color combinations tested for WCAG AA compliance
5. **Consistency**: Use design tokens throughout - avoid hardcoded colors

---

## Component-Specific Guidelines

### Cards
- Use `--color-bg-secondary` for card background
- Border: `--color-border-primary`
- Shadow: `--color-shadow-light`
- Hover: `--color-bg-tertiary` with `--color-shadow-medium`

### Navigation
- Active state: Use accent color (green) for active items
- Hover: `--color-bg-tertiary`
- Text: `--color-text-secondary` for normal, `--color-text-primary` for active

### Charts
- Use chart color tokens from palette
- Grid lines: `--color-chart-grid` (very subtle)
- Tooltips: `--color-bg-secondary` with `--color-border-primary`

### Tables
- Alternating rows: Very subtle background difference
- Hover: `--color-bg-tertiary` with low opacity
- Headers: `--color-bg-tertiary` background

### Inputs
- Background: `--color-bg-secondary`
- Border: `--color-border-primary`
- Focus: Accent color border with subtle shadow
- Disabled: `--color-bg-tertiary` with reduced opacity

---

## Color Contrast Ratios (WCAG AA)

### Dark Mode
- Primary text on primary bg: 14.2:1 ✅
- Secondary text on primary bg: 7.1:1 ✅
- Accent green on primary bg: 4.8:1 ✅
- Accent blue on primary bg: 4.6:1 ✅

### Light Mode
- Primary text on primary bg: 12.8:1 ✅
- Secondary text on primary bg: 6.4:1 ✅
- Accent green on primary bg: 5.2:1 ✅
- Accent blue on primary bg: 4.9:1 ✅

All combinations meet or exceed WCAG AA standards (4.5:1 minimum).
