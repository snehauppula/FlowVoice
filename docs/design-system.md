# FlowVoice design system

Source of truth: `app/globals.css`. Palette read from the rendered reference site
(dairy-trends-delta.vercel.app, light mode) on 2026-10-23. Values marked *derived* are FlowVoice additions.

## Palette

| Token | HEX | Origin |
| --- | --- | --- |
| `--background` | `#fffcf4` | reference `--background` |
| `--surface` (cards) | `#fffffd` | reference `--card` |
| `--surface-muted` | `#faf2e7` | reference `--muted` |
| `--sidebar` | `#fffbf4` | reference `--sidebar` |
| `--foreground` | `#3c161c` | reference `--foreground` (brand ink) |
| `--muted` (secondary text) | `#735959` | reference `--muted-foreground` |
| `--primary` (brand berry) | `#dd4c5c` | reference `--primary` |
| `--primary-strong` (button fill, pink text) | `#c8404f` | *derived*: berry darkened so white text reaches 4.5:1 |
| `--primary-hover` | `#b33644` | *derived* |
| `--primary-foreground` | `#fffdfa` | reference `--brand-on-berry` |
| `--primary-soft` (selected, badges) | `#ffe4e6` | reference `--brand-blush` |
| `--primary-pale` (card accents, hover) | `#fff3f1` | *derived* |
| `--rose` (chart 2) | `#e874b3` | reference `--chart-5` |
| `--lilac` (chart 3) | `#a380fe` | reference `--brand-lilac` |
| `--border` | `#f3dbd7` | reference `--border` |
| `--border-strong` | `#e6c3bf` | *derived* |
| `--ring` | `#dd4c5c` | reference `--ring` |
| `--success` / `--warning` / `--danger` | `#2f7a4a` / `#8a5a00` / `#b3261e` | *derived* text colors; soft fills `#e6f4ea` / `#fff4cc` (reference butter) / `#fdecea` |

Note: the reference's "pink" is a coral-berry (hue ≈ 18°), with true pink `#e874b3` only as a chart color.
FlowVoice follows the reference rather than shifting it toward magenta.

White text on `#dd4c5c` is about 3.9:1, which is below 4.5:1, so filled buttons use `--primary-strong`.
`--primary` itself is used for charts, icons and decoration.

## Type and shape

- Family: Figtree (the reference's font), weights 400 and 600 only.
- Sizes: 14px body/utility, 16px section titles, 24px page titles and key numbers.
  Exception: the landing hero scales to 28–44px.
- Radius: pill (buttons, chips), 10px controls, 12–16px cards. Shadows are two soft ink-tinted levels.

## Components

Shared utilities `btn-primary`, `btn-secondary`, `chip`, `chip-active` live in `globals.css`.
React components: `Button`, `Card`, `PageHeader`, `EmptyState`, `Tag`, `SimulatedBadge`, `Notice`,
`TableWrap`, `Pagination`, `Field`/`Input`/`Select`/`Textarea`, `SimpleForm`.
Toasts (`ToasterProvider`) use the same hex values, bottom-right, 4s.
