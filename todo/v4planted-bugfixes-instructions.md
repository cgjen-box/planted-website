# Planted Website — Bug Fixes & Visual Improvements

## Instructions for Claude Code

**Last Updated:** Based on screenshots from current implementation

---

## 🚨 EXECUTIVE SUMMARY — 3 Main Bugs

| Priority | Issue | What's Wrong | Fix |
|----------|-------|--------------|-----|
| 🔴 #1 | Impact Section | Cards stacked vertically | Change to `grid-template-columns: repeat(3, 1fr)` |
| 🔴 #2 | Products Section | Multi-row grid | Convert to horizontal scroll with `overflow-x: auto` |
| 🟡 #3 | Recipes Section | Generic headline + awkward link position | Update copy + fix layout |

**Quick CSS Check:** Look for any of these that might be forcing vertical layout:
- `flex-direction: column` 
- `grid-template-columns: 1fr`
- `display: block` on grid/flex containers
- Media queries overriding desktop styles

---

This document contains specific CSS/HTML fixes for the Planted website. Please implement these changes in order of priority.

---

## 🔴 BUG FIX 1: Impact Section — Horizontal Layout

**Problem:** The three stat cards (97% CO₂, 95% Wasser, 0 Tiere) are stacked vertically instead of being in a horizontal row.

**Screenshot Reference:** Image 1 shows vertical stacking

**Solution:** Update the CSS for the impact/stats section grid:

```css
/* FIND the impact stats container and UPDATE to: */
.impact-stats,
.stats-grid,
[class*="impact"] [class*="grid"],
[class*="stats"] {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Force 3 columns */
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

/* Tablet breakpoint - keep horizontal but smaller */
@media (max-width: 900px) {
  .impact-stats,
  .stats-grid,
  [class*="impact"] [class*="grid"] {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

/* Mobile only - then stack */
@media (max-width: 600px) {
  .impact-stats,
  .stats-grid,
  [class*="impact"] [class*="grid"] {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
}
```

**Alternative if using Flexbox:**
```css
.impact-stats,
.stats-grid {
  display: flex;
  flex-direction: row; /* NOT column */
  justify-content: center;
  gap: 24px;
  flex-wrap: nowrap; /* Prevent wrapping on desktop */
}

@media (max-width: 600px) {
  .impact-stats,
  .stats-grid {
    flex-direction: column;
    align-items: center;
  }
}
```

**Check for:** Any `flex-direction: column` or `grid-template-columns: 1fr` that's forcing single column layout on desktop.

---

## 🔴 BUG FIX 2: Products Section — Horizontal Scroll Carousel

**Problem:** Products are displayed in a multi-row grid. Should be a single-row horizontal scroll.

**Screenshot Reference:** Image 2 shows grid layout

**Solution:** Convert grid to horizontal scroll:

```css
/* Products container */
.products-grid,
[class*="products"] [class*="grid"],
.product-list {
  display: flex;
  flex-direction: row;
  gap: 24px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 20px 0 40px; /* Space for scrollbar */
  margin: 0 -24px; /* Bleed to edges */
  padding-left: 24px;
  padding-right: 24px;
  
  /* Hide scrollbar but keep functionality */
  scrollbar-width: thin;
  scrollbar-color: #7B2D8E #f0f0f0;
}

/* Optional: Hide scrollbar completely */
.products-grid::-webkit-scrollbar {
  height: 6px;
}

.products-grid::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.products-grid::-webkit-scrollbar-thumb {
  background: #7B2D8E;
  border-radius: 3px;
}

/* Individual product cards */
.product-card,
[class*="product-card"],
.products-grid > a,
.products-grid > div {
  flex: 0 0 auto; /* Don't grow or shrink */
  width: 220px; /* Fixed width */
  min-width: 220px;
  scroll-snap-align: start;
}

/* Remove any grid properties */
.products-grid {
  display: flex !important; /* Override grid */
  grid-template-columns: unset !important;
}
```

**Add scroll indicators (optional but recommended):**
```html
<!-- Add before/after the products container -->
<div class="products-scroll-container">
  <button class="scroll-btn scroll-left" aria-label="Scroll left">←</button>
  <div class="products-grid">
    <!-- products here -->
  </div>
  <button class="scroll-btn scroll-right" aria-label="Scroll right">→</button>
</div>
```

```css
.products-scroll-container {
  position: relative;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  border: 2px solid #7B2D8E;
  color: #7B2D8E;
  font-size: 1.25rem;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 150ms ease;
}

.scroll-btn:hover {
  background: #7B2D8E;
  color: white;
}

.scroll-left { left: 8px; }
.scroll-right { right: 8px; }

/* Hide on mobile where swipe is natural */
@media (max-width: 768px) {
  .scroll-btn { display: none; }
}
```

**JavaScript for scroll buttons:**
```javascript
document.querySelectorAll('.scroll-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const container = btn.parentElement.querySelector('.products-grid');
    const scrollAmount = 240; // card width + gap
    const direction = btn.classList.contains('scroll-left') ? -1 : 1;
    container.scrollBy({ left: scrollAmount * direction, behavior: 'smooth' });
  });
});
```

---

## 🟡 BUG FIX 3: Recipes Section — Styling & Copy

**Problem:** "Lass dich inspirieren" is generic/boring, "Alle Rezepte ansehen" link is awkwardly positioned, recipe card text overlay needs better visibility.

**Screenshot Reference:** Image 3

### Fix 3.1 — Header Layout

**Current:** "Alle Rezepte ansehen →" floats to the far right, disconnected from headline
**Fix:** Better header layout with headline and link grouped properly

```css
/* Recipes header container */
.recipes-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  gap: 24px;
  flex-wrap: wrap;
}

.recipes-header h2 {
  margin: 0;
}

.recipes-header .view-all-link {
  color: #7B2D8E;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: gap 150ms ease;
}

.recipes-header .view-all-link:hover {
  gap: 10px;
}
```

### Fix 3.2 — Headline Copy (Schoolcraft Personality)

Change from:
```
"Lass dich inspirieren"
```
To:
```
"Was kochst du heute Abend?"
```

Add a subline:
```html
<div class="recipes-header">
  <div>
    <h2>Was kochst du heute Abend?</h2>
    <p class="recipes-subline">Keine Sorge, wir haben Ideen. Alle unter 45 Minuten.</p>
  </div>
  <a href="/recipes" class="view-all-link">Alle Rezepte ansehen →</a>
</div>
```

```css
.recipes-subline {
  color: #6B7280;
  font-size: 1.05rem;
  margin-top: 8px;
}
```

### Fix 3.3 — Recipe Card Text Visibility

**Problem:** Recipe titles at bottom of cards are hard to read (low contrast)

```css
/* Recipe card overlay */
.recipe-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
}

.recipe-card .recipe-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 48px 20px 20px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.6) 40%,
    transparent 100%
  );
  color: white;
}

.recipe-card .recipe-title {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.15rem;
  margin-bottom: 4px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.recipe-card .recipe-meta {
  font-size: 0.85rem;
  opacity: 0.9;
}
```

### Alternative Headlines (All Languages)

| Language | Headline | Subline |
|----------|----------|---------|
| DE | Was kochst du heute Abend? | Keine Sorge, wir haben Ideen. Alle unter 45 Minuten. |
| EN | What's for dinner tonight? | Don't worry, we've got ideas. All under 45 minutes. |
| FR | Qu'est-ce qu'on mange ce soir ? | Pas de panique, on a des idées. Toutes en moins de 45 minutes. |
| IT | Cosa cucini stasera? | Tranquillo, abbiamo qualche idea. Tutte sotto i 45 minuti. |
| NL | Wat eten we vanavond? | Geen zorgen, we hebben ideeën. Allemaal onder de 45 minuten. |
| ES | ¿Qué cocinas esta noche? | No te preocupes, tenemos ideas. Todas en menos de 45 minutos. |

---

## 🟡 VISUAL IMPROVEMENT 4: Recipe Cards — Better Hover

**Current:** Basic hover
**Improved:** More engaging interaction

```css
.recipe-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s ease;
}

.recipe-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(123, 45, 142, 0.2);
}

.recipe-card img {
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.recipe-card:hover img {
  transform: scale(1.08);
}

/* Recipe info overlay */
.recipe-card .recipe-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
  color: white;
}

.recipe-card .recipe-title {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  margin-bottom: 4px;
}

.recipe-card .recipe-meta {
  font-size: 0.85rem;
  opacity: 0.9;
}
```

---

## 🟡 VISUAL IMPROVEMENT 5: Section Spacing Consistency

**Problem:** Inconsistent padding between sections

```css
/* Standardize section padding */
section,
[class*="section"] {
  padding: 96px 24px;
}

@media (max-width: 768px) {
  section,
  [class*="section"] {
    padding: 64px 16px;
  }
}

/* Container max-width consistency */
.container,
[class*="container"],
section > div:first-child {
  max-width: 1280px;
  margin: 0 auto;
}
```

---

## 🟡 VISUAL IMPROVEMENT 6: Typography Hierarchy

**Ensure consistent heading styles:**

```css
h1 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 900;
  line-height: 1.1;
  color: #7B2D8E;
}

h2 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 800;
  line-height: 1.2;
  color: #7B2D8E;
}

h3 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.25rem, 2vw, 1.5rem);
  font-weight: 700;
  line-height: 1.3;
}

p {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #4B5563;
}
```

---

## 🟢 VISUAL IMPROVEMENT 7: Button Consistency

```css
/* Primary button */
.btn-primary,
[class*="btn-primary"],
button[type="submit"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  background: #6AB547;
  color: white;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 150ms ease;
  text-decoration: none;
}

.btn-primary:hover {
  background: #5A9F3A;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(106, 181, 71, 0.3);
}

/* Secondary button */
.btn-secondary,
[class*="btn-secondary"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  background: transparent;
  color: #7B2D8E;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  border: 2px solid #7B2D8E;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 150ms ease;
  text-decoration: none;
}

.btn-secondary:hover {
  background: #7B2D8E;
  color: white;
}
```

---

## 🟢 VISUAL IMPROVEMENT 8: Card Shadows Consistency

```css
/* Standard card shadow */
.card,
[class*="card"] {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05),
              0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.card:hover,
[class*="card"]:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

---

## Summary Checklist

### Bugs (Must Fix)
- [ ] Impact section: Change to `grid-template-columns: repeat(3, 1fr)` on desktop
- [ ] Products section: Convert from grid to horizontal scroll with `overflow-x: auto`
- [ ] Recipes headline: Update copy to "Was kochst du heute Abend?"
- [ ] Recipes: Fix "Alle Rezepte" link positioning
- [ ] Recipe cards: Improve text overlay visibility

### Improvements (Should Do)
- [ ] Add subline under recipes headline
- [ ] Recipe cards: Add better hover effects
- [ ] Consistent section padding (96px desktop, 64px mobile)
- [ ] Consistent typography hierarchy

### Nice to Have
- [ ] Scroll buttons for products carousel
- [ ] Consistent button styling
- [ ] Consistent card shadows

---

## 🔍 Additional Visual Issues Noticed

### Issue: Impact Cards Width
The cards seem to have inconsistent widths. Ensure:
```css
.impact-card {
  flex: 1;
  min-width: 280px;
  max-width: 360px;
}
```

### Issue: Decorative Circles
The purple/green blurred circles in the background are nice but might be causing layout issues. Ensure they're positioned with:
```css
.decorative-circle {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}

/* Content should be above */
.impact-content {
  position: relative;
  z-index: 1;
}
```

### Issue: Mobile Responsiveness
Test at these breakpoints:
- 1280px (large desktop)
- 1024px (small desktop)
- 768px (tablet)
- 480px (mobile)

The impact section should:
- 1024px+: 3 columns horizontal
- 768px-1023px: 3 columns horizontal (smaller)
- Below 768px: Stack vertically

---

## How to Debug

If the layout issues persist, check for:

1. **Conflicting media queries** — Look for `@media` rules that override the grid/flex settings
2. **Inline styles** — Check if there are `style=""` attributes on elements
3. **!important declarations** — Search for `!important` that might be forcing layouts
4. **Container width issues** — Ensure parent containers aren't constraining width

**Debug CSS to add temporarily:**
```css
/* Add this to see container boundaries */
* {
  outline: 1px solid rgba(255, 0, 0, 0.1);
}
```

---

## File Locations (Likely)

Based on typical project structure:
- Main CSS: `/css/style.css` or `/styles/main.css`
- Component CSS: `/css/components/*.css`
- Page-specific: `/css/pages/home.css`

Look for class names like:
- `.impact-section`, `.stats-section`, `.impact-grid`
- `.products-section`, `.products-grid`, `.product-list`
- `.recipes-section`, `.recipe-grid`
