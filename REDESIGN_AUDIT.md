# Portfolio Redesign Audit & Refactor Report

## 1) Design audit

### UI problems found
- The visual system relied on bright neon gradients, heavy shadows, and glass effects without restraint, which made the interface feel dated rather than premium.
- Typography hierarchy was weak: hero, section titles, cards, and article pages did not feel like one system.
- Spacing was inconsistent because many sections used inline styles and one-off spacing values.
- Buttons, cards, and filters did not share a coherent component language.
- CTA placement was generic and did not create a strong first-impression path.

### UX problems found
- Navigation links in nested pages were broken because relative paths were incorrect in multiple subdirectories.
- The content flow was serviceable but not intentional: hero, featured works, writings, and contact did not feel like a clear product journey.
- Search, filtering, and pagination in writings/gallery pages lacked a unified interaction model.
- The site did not have a skip link, a theme toggle, or a clearly marked active nav state.

### Motion problems found
- The old motion system mixed reveal effects, float effects, glow effects, and hover transforms in a way that could compete visually.
- 3D tilt and hover transforms were applied too broadly to cards.
- Scroll reveal behavior was duplicated and not consistently reduced for motion-sensitive users.
- Motion hierarchy was not defined, so every element tried to “do something.”

### Technical problems found
- Nested-page link paths were incorrect, breaking navigation and some project links.
- The codebase depended on inline styles and one-off scripts.
- `gallery.html` had inline script logic, while other pages depended on shared JS, creating inconsistency.
- The old animation layer was heavier than necessary and not centralized.
- Some document downloads were missing from the archive, leaving broken links.

## 2) Redesign strategy
- Replace the old neon-heavy look with a restrained premium dark system and light-mode support.
- Use a single design language across hero, cards, filters, forms, gallery, writings, and article pages.
- Standardize spacing, radius, shadows, borders, and typography through CSS tokens.
- Simplify motion to smooth reveals, subtle hover elevation, and controlled micro-interactions.
- Convert the site shell into a more semantic, accessible structure with skip link, active nav state, and theme toggle.
- Fix nested path handling by standardizing links to root-relative URLs.
- Restore missing document downloads with clean placeholder PDFs so the links remain functional.

## 3) New design system
### Typography
- Hero display: clamp-based oversized title with tight leading and negative letter spacing.
- Heading XL/L/M: consistent scale for sections, cards, and articles.
- Body large/body/caption: unified reading rhythm for long-form pages and metadata.

### Color system
- Dark-first base with optional light mode.
- Controlled accent palette: indigo, cyan, and soft green.
- No neon saturation spikes or random gradients.
- Strong contrast for accessibility.

### Spacing system
- Tokenized spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- No ad hoc spacing values for core UI layers.

### Components
- Shared buttons
- Premium cards
- Page intro sections
- Responsive navigation
- Filter chips
- Modal
- Form fields
- Timeline-style journey cards
- Project / writing / gallery cards

## 4) Refactored architecture
- `css/style.css`: base design system, layout, surfaces, cards, forms, navigation, gallery, writings, footer.
- `css/animations.css`: motion primitives and reduced-motion support.
- `css/responsive.css`: breakpoint-specific refinements.
- `js/script.js`: theme, nav, reveal, gallery modal, writings filters, contact form, active states.
- `js/animations.js`: lightweight counter animation only.

## 5) Accessibility improvements
- Added a skip link.
- Added semantic `<main id="main-content">` wrapper.
- Added keyboard-friendly menu and modal handling.
- Added `aria-current` for active navigation.
- Added reduced-motion behavior.
- Improved focus states and contrast.

## 6) Performance improvements
- Added lazy loading and async decoding for images.
- Added width/height injection for images where dimensions were available.
- Removed heavy hover tilt logic.
- Consolidated interaction logic into fewer scripts.
- Kept animations lightweight and observer-based.

## 7) Fixed issues summary
- Broken nested links repaired.
- Shared header/footer navigation standardized.
- Gallery inline script removed in favor of shared JS.
- Missing PDF downloads restored with placeholder files.
- Motion conflicts reduced.
- Global theme toggle added.
- Page shells upgraded with skip link and main landmark.

## 8) Notes
- The placeholder PDFs are intentionally labeled as generated placeholders because the original documents were not present in the archive.
- The visual redesign is implemented as a complete system refresh, not a color tweak.
