# Briefly · Orbit visual theme

Implemented the user-approved Orbit preview: black canvas, violet clouds, mint flames, a cratered ringed planet, dark translucent work panels and mint controls.

## Files

- `orbit-theme.css`: screen-only theme and responsive layouts; print keeps the original light styles.
- `assets/orbit-garden.webp`: decorative background, 1672 × 941, 140,208 bytes. AI-generated with the native image generation tool, then compressed to WebP.
- `index.html`: loads the theme and decorative background layer.
- `favicon.svg`: mint color treatment.

The application logic, parser, local storage keys and existing export functions are unchanged. Background animation is subtle and respects reduced-motion preferences.

## Artwork prompt

Create ONLY a reusable BACKGROUND ART image for the approved Chinese brief checklist website shown in the reference. The reference is a style/composition reference, NOT an edit target. Remove ALL interface, words, typography, panels, cards, buttons, logos, forms, dividers and icons. Generate only the cosmic scene so actual HTML panels can be overlaid. Landscape 16:9 high-resolution.

Faithfully retain the reference's visual universe: near-pure black upper half with generous empty negative space; along the lower edge a beautifully textured dark charcoal-purple cratered Saturn with elegant thin lavender and mint elliptical rings sweeping horizontally; richly shaded, softly grainy violet / purple cloud banks around the bottom corners and outer side edges; pale luminous mint-green stylized flame silhouettes behind the clouds and planet. Main ringed planet centered near 45% across, low enough that its lower portion is cropped by the bottom edge; a few small dark violet moons and at most two tiny satellites like in the reference. The Saturn and its rings should fill the lower central area, not be tiny. Violet clouds rise along the extreme side edges to about halfway up the image, leaving the central upper region mostly black for text. Keep plenty of black space in upper 45 percent and center. Artwork feels tactile, premium, dimensional, cinematic and whimsically cosmic rather than childish cartoon or generic neon sci-fi. No star-filled wallpaper; black background should stay quiet, with only a little subtle dust near the bottom. Purple velvet clouds, irregular cutout flame shapes, rough rocky planet lit with faint mint rim light, silver-lavender orbital rings. Black #030306, violet #6332bf, deep indigo-purple #201334, mint #b4f6d3. No orange-red, no teal-blue SaaS gradient. No white background. No writing or watermark anywhere. Deliver the clean atmospheric BACKGROUND ART only, no screenshot of a website.

## Verification

- Production build succeeded; JavaScript syntax checks passed.
- Browser layout checked at 1440 px, 667 px and 390 px with no horizontal page overflow.
- Example parsing produced 22 requirements and 3 questions.
- Checklist completion, edited notes and confirmed questions persisted after reload.
- Clipboard export included the checklist, completion state and edited notes.
- Overview, history dialog and export menu opened correctly; no browser console errors.
- Desktop and mobile screenshots saved locally in `test-results/briefly-orbit-*.jpg`.
