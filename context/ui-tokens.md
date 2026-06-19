# Nexora UI Tokens

## Purpose

This file defines Nexora's visual design tokens. Use these values across the frontend to keep the UI consistent. Do not hardcode colors in feature components.

## Brand Direction

Nexora should feel premium, social, professional, intelligent, and modern. The palette should use deep indigo, violet energy, cyan discovery accents, clean white surfaces, and calm neutral text.

---

## Tailwind v4 Token Setup

Use Tailwind CSS v4 `@theme` variables in `globals.css`.

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", sans-serif;

  --color-background: #f6f8fc;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-surface-muted: #f1f5f9;
  --color-surface-elevated: #ffffff;

  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  --color-border-soft: #edf2f7;

  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-text-inverse: #ffffff;

  --color-brand: #4f46e5;
  --color-brand-dark: #3730a3;
  --color-brand-light: #eef2ff;
  --color-brand-soft: #f5f3ff;

  --color-accent: #7c3aed;
  --color-accent-dark: #5b21b6;
  --color-accent-light: #f3e8ff;

  --color-cyan: #06b6d4;
  --color-cyan-dark: #0891b2;
  --color-cyan-light: #ecfeff;

  --color-success: #10b981;
  --color-success-dark: #047857;
  --color-success-light: #ecfdf5;

  --color-warning: #f59e0b;
  --color-warning-dark: #b45309;
  --color-warning-light: #fffbeb;

  --color-error: #ef4444;
  --color-error-dark: #b91c1c;
  --color-error-light: #fef2f2;

  --color-info: #3b82f6;
  --color-info-dark: #1d4ed8;
  --color-info-light: #eff6ff;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 20px 40px rgba(15, 23, 42, 0.12);
}
```

---

## Color Tokens

| Token | Value | Purpose |
|---|---|---|
| background | #F6F8FC | App background |
| surface | #FFFFFF | Cards and panels |
| surface-secondary | #F9FAFB | Secondary surface |
| surface-muted | #F1F5F9 | Muted UI blocks |
| border | #E2E8F0 | Default border |
| border-strong | #CBD5E1 | Strong divider/border |
| text-primary | #0F172A | Main text |
| text-secondary | #475569 | Secondary text |
| text-muted | #94A3B8 | Metadata and helper text |
| brand | #4F46E5 | Main Nexora indigo |
| brand-dark | #3730A3 | Hover/active brand |
| brand-light | #EEF2FF | Brand background |
| accent | #7C3AED | Violet accent |
| accent-light | #F3E8FF | Accent background |
| cyan | #06B6D4 | Discovery/search/link accent |
| cyan-light | #ECFEFF | Cyan background |
| success | #10B981 | Success actions |
| success-light | #ECFDF5 | Success background |
| warning | #F59E0B | Warning actions |
| warning-light | #FFFBEB | Warning background |
| error | #EF4444 | Destructive action |
| error-light | #FEF2F2 | Error background |
| info | #3B82F6 | Informational action |
| info-light | #EFF6FF | Information background |

---

## Typography Tokens

| Token | Value | Use |
|---|---|---|
| Display | 48px / 56px / 700 | Landing hero |
| Page Title | 32px / 40px / 700 | Page heading |
| Section Title | 20px / 28px / 600 | Major page sections |
| Card Title | 16px / 24px / 600 | Card headings |
| Body | 14px / 22px / 400 | Normal content |
| Body Medium | 14px / 22px / 500 | Important body text |
| Small | 12px / 18px / 400 | Metadata |
| Label | 12px / 16px / 500 | Form labels, badges |

---

## Spacing Tokens

| Token | Value | Use |
|---|---|---|
| space-1 | 4px | Tiny gap |
| space-2 | 8px | Small gap |
| space-3 | 12px | Form gap |
| space-4 | 16px | Standard gap |
| space-5 | 20px | Medium gap |
| space-6 | 24px | Card padding |
| space-8 | 32px | Page section gap |
| space-10 | 40px | Large section gap |
| space-12 | 48px | Hero block gap |
| space-16 | 64px | Landing section spacing |

---

## Component Tokens

### App Shell

| Property | Value |
|---|---|
| Background | background |
| Max width | 1440px |
| Desktop feed grid | 260px / minmax(0, 640px) / 320px |
| Mobile layout | Single column |
| Navbar height | 64px |

### Card

| Property | Value |
|---|---|
| Background | surface |
| Border | border |
| Radius | radius-lg |
| Padding | 24px |
| Shadow | shadow-sm |

### Post Card

| Property | Value |
|---|---|
| Background | surface |
| Border | border |
| Radius | radius-xl |
| Padding | 20px |
| Gap | 16px |

### Primary Button

| Property | Value |
|---|---|
| Background | brand |
| Hover | brand-dark |
| Text | white |
| Radius | radius-md |
| Height | 40px |
| Padding | 12px 16px |

### Secondary Button

| Property | Value |
|---|---|
| Background | surface |
| Border | border |
| Text | text-primary |
| Hover | surface-secondary |
| Radius | radius-md |
| Height | 40px |

### Danger Button

| Property | Value |
|---|---|
| Background | error |
| Hover | error-dark |
| Text | white |
| Radius | radius-md |
| Height | 40px |

### Input

| Property | Value |
|---|---|
| Background | surface |
| Border | border |
| Focus Border | brand |
| Text | text-primary |
| Placeholder | text-muted |
| Radius | radius-md |
| Height | 40px |

### Badge

| Property | Value |
|---|---|
| Radius | radius-full |
| Padding | 2px 8px |
| Font | 12px / 16px / 500 |

---

## Semantic Badge Colors

| Badge Type | Background | Text |
|---|---|---|
| Role/Admin | brand-light | brand-dark |
| Moderator | accent-light | accent-dark |
| Success/Active | success-light | success-dark |
| Pending/Warning | warning-light | warning-dark |
| Suspended/Error | error-light | error-dark |
| Info/Public | info-light | info-dark |
| Hashtag | cyan-light | cyan-dark |
