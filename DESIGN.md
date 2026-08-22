---
version: alpha
name: Hanji
description: A quiet comparative proof sheet for regional Han character forms.
colors:
  ink: '#16151a'
  ink-soft: '#4a4852'
  ink-mute: '#86838d'
  paper: '#fbfaf7'
  paper-sunk: '#f2f0ea'
  rule: '#dfdcd4'
  proof-red: '#d1503f'
  blue-pencil: '#3f72bd'
  ochre: '#b8871f'
  violet: '#8d5cb4'
  verdigris: '#1f8d81'
  night-ink: '#e9e7e2'
  night-ink-soft: '#a6a39d'
  night-ink-mute: '#74716c'
  night-paper: '#121215'
  night-paper-sunk: '#1b1b1f'
  night-rule: '#2f2f35'
  night-proof-red: '#d2604f'
  night-blue-pencil: '#5d8fd4'
  night-ochre: '#c08f33'
  night-violet: '#9d79c9'
  night-verdigris: '#3da294'
typography:
  glyph-display:
    fontFamily: "'Hanji Sans CN', sans-serif"
    fontSize: 11rem
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "'UI Latin Sans', 'UI zh-CN Sans', 'Noto Sans', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif"
    fontSize: 1.875rem
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "'UI Latin Sans', 'UI zh-CN Sans', 'Noto Sans', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif"
    fontSize: 1.5rem
    fontWeight: 400
    lineHeight: 1.333
  body:
    fontFamily: "'UI Latin Sans', 'UI zh-CN Sans', 'Noto Sans', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "'UI Latin Sans', 'UI zh-CN Sans', 'Noto Sans', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  control-small:
    fontFamily: "'UI Latin Sans', 'UI zh-CN Sans', 'Noto Sans', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1
  prose:
    fontFamily: "'UI Latin Sans', 'UI zh-CN Sans', 'Noto Sans', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "'UI Latin Sans', 'UI zh-CN Sans', 'Noto Sans', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif"
    fontSize: 0.6875rem
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.04em
rounded:
  micro: 1px
  sm: 3px
  control: 4px
  md: 6px
  lg: 8px
  full: 999px
spacing:
  micro: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 40px
  section: 64px
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '8px 16px'
    height: 36px
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.ink-soft}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '6px 12px'
    height: 32px
  input-search:
    backgroundColor: '{colors.paper-sunk}'
    textColor: '{colors.ink}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 10px'
    height: 28px
  chip-selected:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.paper}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 8px'
    height: 28px
  chip-resting:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink-soft}'
    typography: '{typography.body-small}'
    rounded: '{rounded.md}'
    padding: '0 8px'
    height: 28px
  region-option-selected:
    backgroundColor: '{colors.paper}'
    borderColor: 'color-mix(in srgb, {colors.ink-soft} 75%, {colors.ink-mute})'
    textColor: '{colors.ink}'
    typography: '{typography.control-small}'
    rounded: '{rounded.control}'
    padding: '0 8px'
    height: 28px
  navigation-control:
    backgroundColor: transparent
    textColor: '{colors.ink-mute}'
    rounded: '{rounded.md}'
    size: 32px
  floating-menu:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: 6px
  table-container:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
  character-row:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    padding: '10px 20px'
  overprint-glyph:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    size: 11rem
---

# Design System: Hanji

## Overview

**Creative North Star: "The Comparative Proof Sheet"**

Hanji behaves like a comparative proof pulled from a careful type workshop:
warm paper, cool ink, fine rules, registration colors, and character forms
treated as evidence rather than ornament. The overprint is the system's
signature object. It places regional forms in one footprint, then lets their
departures emerge as colored registration marks.

The system is precise, quiet, scholarly, and materially print-like without
becoming nostalgic. It is dense where comparison benefits from density and
generous where a character needs to be inspected. Controls feel like
restrained editorial instruments: compact, clear, lightly outlined, and solid
only when selection needs to read immediately.

**Key Characteristics:**

- Warm paper and cool ink in light mode, with an equally deliberate night
  proof in dark mode.
- Hairline rules and spacing carry structure before color or elevation does.
- Regional glyphs are the visual subject; interface furniture stays quiet.
- Registration accents describe glyph groups and departures, never geography.
- Motion explains stacking, separation, selection, or navigation and yields to
  reduced-motion preferences.

## Colors

The palette pairs paper-like neutrals with five mid-lightness proof colors that
remain distinguishable on both themes. The frontmatter is normative; dark-mode
tokens are the `night-*` counterparts of the light proof.

### Primary

- **Ink** (`ink`): Baseline character forms, primary text, selected controls,
  and the strongest rules.
- **Paper** (`paper`): The page ground and resting surface for controls and
  tables.

### Secondary

- **Proof Red** (`proof-red`): The first departure color and active stroke
  accent.
- **Blue Pencil** (`blue-pencil`): The second departure color, checkbox accent,
  and keyboard focus outline.

### Tertiary

- **Ochre** (`ochre`), **Violet** (`violet`), and **Verdigris** (`verdigris`):
  Additional grouping colors used only when a comparison needs more distinct
  forms.

### Neutral

- **Soft Ink** (`ink-soft`): Secondary copy and ordinary interactive text.
- **Muted Ink** (`ink-mute`): Metadata, hints, dormant controls, and quiet
  labels.
- **Sunk Paper** (`paper-sunk`): Recessed fields, segmented-control wells, and
  hover surfaces.
- **Rule** (`rule`): Borders, dividers, guides, and understated underlines.

### Dark Theme

The `night-*` tokens preserve the same roles rather than inverting values
mechanically. Night Ink is warm near-white, Night Paper is cool near-black, and
the five accents remain deliberately below the baseline's visual strength.

### Named Rules

**The Grouping, Not Geography Rule.** Accents encode glyph grouping and
departures; they never assign a permanent color to a region.

**The Baseline Wins Rule.** Ink is the reference form; proof colors annotate
only where other forms depart, and spacing remains the primary non-color cue.

## Typography

**Display Font:** The matching regional Hanji Sans face, with the corresponding
Hanji Serif face in serif mode.

**Body Font:** Self-hosted UI Latin plus the interface locale's UI CJK face,
switching together between sans and serif.

**Label Font:** The same locale-aware UI stack with tabular numerals where data
must align.

**Character:** Type is restrained and region-faithful. The interface never
borrows a data glyph's font, and a comparison glyph never follows the interface
locale by accident.

### Hierarchy

- **Glyph Display** (regular, 11rem, line-height 1): The interactive hero
  overprint; it scales down on small screens without changing its square
  footprint.
- **Headline** (regular, 1.875rem, line-height 1.2): The hero's explanatory
  claim.
- **Title** (regular, 1.5rem, line-height 1.333): Route titles and major reading
  headings.
- **Body** (regular, 1rem, line-height 1.5): Interface explanations and
  ordinary content.
- **Control Small** (regular, 0.75rem, line-height 1): Compact filter and
  region-option labels that must align inside a 1.75rem control.
- **Prose** (regular, 0.9375rem, line-height 1.85): Long-form methodology and
  source notes, held to a readable 42rem measure.
- **Label** (regular, 0.6875rem, letter-spacing 0.04em): Section labels,
  regions, metadata headings, and proof annotations.

### Named Rules

**The Region Owns the Glyph Rule.** Every comparison glyph uses the font for
the region it represents, regardless of interface locale.

**The Interface Follows the Reader Rule.** Interface copy uses the selected
locale's self-hosted CJK face, with sans and serif as equal user-selectable
modes.

**The Figures Line Up Rule.** Code points, stroke counts, ranks, and page
numbers use tabular numerals.

## Layout

The application uses one centered 72rem content rail with 1rem mobile gutters
and 1.5rem gutters from the small breakpoint upward. The sticky header occupies
4rem on narrow screens and 4.5rem from the medium breakpoint. Primary sections
usually advance in 2rem to 2.5rem steps; long route sections use a 2.5rem rhythm,
and the footer begins after 4rem.

The home hero is one column on small screens and becomes a measured two-column
composition at 40rem. The glyph stage keeps a fixed specimen width while the
copy stays within 32rem. Character rows use a three-part grid: overprint
thumbnail, flexible regional columns, and stroke-count metadata. Regional data
columns keep equal tracks.

Responsive behavior protects comparison fidelity. Dense source tables become
labeled blocks below 40rem. The character table and detail tables scroll
horizontally rather than crushing or reordering regional columns. At wider
viewports, the detail overprint becomes a sticky left specimen beside the data
tables.

### Named Rules

**The Columns Stay Columns Rule.** Regional character columns do not reflow
into cards on narrow screens; scale them or allow horizontal scrolling.

## Elevation & Depth

The system is flat by default. Paper versus Sunk Paper, text contrast, one-pixel
rules, and sticky positioning establish hierarchy. A selected segmented option
may use the system's smallest lift (`0 1px 2px rgb(0 0 0 / 0.06)`). Temporary
menus alone receive the floating shadow (`0 10px 15px -3px rgb(0 0 0 / 0.05),
0 4px 6px -4px rgb(0 0 0 / 0.05)`). Nothing else casts a resting shadow.

### Named Rules

**The Flat-by-Default Rule.** Resting surfaces are separated by tone and
hairlines; shadows are reserved for a temporary floating layer or a selected
inset control.

## Shapes

Most controls use gently squared corners: the small `control` radius for
segmented choices and the `md` radius for buttons, chips, and fields. Menus and
table containers use the `lg` radius. Tiny comparison runs and scrollbar
thumbs may be fully rounded because they read as marks rather than containers.
Character tables, reading tables, and prose remain predominantly rectilinear.

### Named Rules

**The Quiet Radius Rule.** Corners soften controls without becoming a visual
motif; large capsules belong only to tiny run markers and scroll thumbs.

## Components

### Buttons

- **Primary:** Ink-filled with Paper text, used sparingly for a true action such
  as playing stroke order. Hover lowers opacity instead of introducing a new
  hue.
- **Ghost:** Transparent with a Rule border and Soft Ink text. Hover strengthens
  the border and text; it does not lift the button.
- **Icon-only:** A compact square with Muted Ink, becoming Ink on hover. Every
  focusable control uses the Blue Pencil two-pixel focus outline with a
  two-pixel offset.

### Chips

- **Resting:** Paper fill, Rule border, Soft Ink text.
- **Selected:** Ink slab with Paper text and an Ink border so selection reads
  across a dense filter bar without relying on color.
- **Disabled or hidden:** Opacity communicates unavailability only after the
  label and control state remain programmatically explicit.

**The Selected State Is a Slab Rule.** Non-regional content filters use
ink-on-paper inversion for the selected state, not a brighter border alone.
Region options are the explicit artwork-safe exception defined below.

### Region Options

Region selectors use one compact outlined control whether they appear as a
single-choice index, a visibility toggle, or a listing filter. Because a flag
is full-color artwork, it never carries selection state and never sits on an
inverted Ink slab. Selection instead strengthens the border to a quiet blend
between Soft Ink and Muted Ink, then returns the control to Paper; resting
flags and the Sunk Paper surface recede so the chosen marks remain easy to
scan. This edge-and-surface contrast stays visible with short text labels, in
grayscale, and in both themes.

**The Artwork Never Carries State Rule.** A region option must remain visibly
selected when its flag or text label is removed. State belongs to the control
edge and surface, while the artwork only names the region.

### Cards / Containers

The system does not use a generic card grid. The character table is a single
Paper sheet bounded by a Rule border and an `lg` corner, with rows divided by
hairlines. Content groups elsewhere prefer open layout and horizontal rules
over individually elevated boxes.

### Inputs / Fields

Search and numeric fields sit in Sunk Paper with a Rule border and `md` corner.
They are compact, use inherited locale-aware type, and share the standard focus
outline. The hero's character entry is the deliberate exception: a real input
is visually hidden behind the overprint, with a drawn caret showing where the
next character lands.

### Navigation

The header is a flat sticky Paper band with no separating shadow. Navigation
starts muted, becomes Ink on hover or exact-route activation, and uses compact
icon controls for preferences. Floating menus use the only substantial shadow
in the system and return focus to their trigger when closed by keyboard.

### Overprint Glyph

The overprint is Hanji's signature component. Region-specific glyph layers
share one square, use the baseline in Ink, and color only the departure layers.
Hover introduces a slight registration fan; dragging separates the plates;
the explicit split state places every regional form in Ink with labels. The
same object appears in the hero, row thumbnails, and detail page so navigation
can morph one specimen into the next.

### Character Tables

Character tables prioritize aligned evidence: equal regional tracks, tabular
metadata, tiny region labels, hairline row rules, and large region-correct
glyphs. Gaps between colored runs remain the primary grouping signal, with
color as redundant support. Hover changes only the row ground to Sunk Paper.

### Stroke Order

The stroke board is a square Sunk Paper field with Rule guides and rounded
stroke caps. Completed strokes use Ink, the active stroke uses Proof Red, and
the controls reuse the primary and ghost button treatments. Loading and error
states preserve the same footprint.

**The Glyph Leads Rule.** Controls, labels, rules, and motion remain subordinate
to the character forms.

## Do's and Don'ts

### Do:

- **Do** preserve the current proof-sheet identity when extending or refining
  the interface.
- **Do** select every data glyph's font from its region, independently of the
  interface language.
- **Do** use spacing and run separation as the primary comparison cue, with the
  five proof colors as redundant annotation.
- **Do** keep controls compact, labels explicit, focus visible, and meaningful
  states understandable without color.
- **Do** respect reduced-motion preferences and keep motion tied to stacking,
  separation, selection, or navigation.

### Don't:

- **Don't** assign permanent colors to regions or use flags as the primary
  brand language.
- **Don't** turn the interface into a dashboard of independent cards.
- **Don't** introduce gradients, glass effects, decorative shadows, or effects
  that compete with the glyphs.
- **Don't** allow the interface locale to substitute for a regional glyph font.
- **Don't** reflow regional comparison columns into a different order on small
  screens.
