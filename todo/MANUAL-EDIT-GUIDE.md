# Manual Edit Guide for Hero Section

## Problem
The file `index.astro` is being watched by a linter/auto-save, preventing automated edits.

## Solution: Manual Integration in 2 Steps

---

## STEP 1: Replace Hero HTML Structure

### Location
File: `C:\Users\christoph\planted-website\planted-astro\src\pages\[locale]\index.astro`
Line: ~36-108

### What to Remove
Delete everything from line 36 to line 108 (the entire old hero section including the countries modal at the end of the hero section):

```astro
<!-- Hero Section - TV Set Design -->
<section class="hero">
    <div class="hero-video-wrapper">
        ...entire old structure...
    </div>
    ...
    <!-- Countries Modal -->
    <div class="countries-modal" id="countriesModal">
        ...
    </div>
</section>
```

### What to Add
Copy the ENTIRE contents of this file:
`C:\Users\christoph\planted-website\planted-astro\src\pages\[locale]\hero-section-new.txt`

Paste it in place of what you removed.

**Important:** Make sure you keep the `<!-- Statement Section -->` comment and everything after it. The new hero section should end with `</section>` and then immediately followed by `<!-- Statement Section -->`.

---

## STEP 2: Replace Hero CSS Styles

### Location
File: `C:\Users\christoph\planted-website\planted-astro\src\pages\[locale]\index.astro`
Line: ~390-723 (approximately)

### What to Remove
In the `<style>` section, find and DELETE all styles related to the Hero section. This includes:

```css
/* Hero Section */
.hero {
    ...
}

.hero-video-wrapper {
    ...
}

.hero-video-container {
    ...
}

.hero-video {
    ...
}

.hero-approved-claim {
    ...
}

.approved-svg {
    ...
}

@keyframes approvedFloat {
    ...
}

.hero-content {
    ...
}

.hero-content.animate-in {
    ...
}

@keyframes fadeSlideUp {
    ...
}

.hero-badge {
    ...
}

.hero-badge .bcorp-logo {
    ...
}

.hero h1 {
    ...
}

.hero-subtitle {
    ...
}

.hero-buttons {
    ...
}

.hero-buttons .btn-icon {
    ...
}

.hero-trust {
    ...
}

.trust-item {
    ...
}

.trust-divider {
    ...
}

.trust-countries {
    ...
}

.trust-countries:hover {
    ...
}

.countries-icon {
    ...
}

.trust-countries:hover .countries-icon {
    ...
}

.countries-modal {
    ...
}

.countries-modal.active {
    ...
}

.countries-modal-backdrop {
    ...
}

.countries-modal-content {
    ...
}

.countries-modal.active .countries-modal-content {
    ...
}

.countries-modal-close {
    ...
}

.countries-modal-close:hover {
    ...
}

.countries-modal-close svg {
    ...
}

.countries-modal-content h3 {
    ...
}

.countries-grid {
    ...
}

.country-item {
    ...
}

.country-item:hover {
    ...
}

.country-flag {
    ...
}

.country-item span:last-child {
    ...
}

@media (max-width: 640px) {
    .hero-approved-claim {
        ...
    }

    .hero-trust {
        ...
    }
}
```

**Stop deleting when you see:** `/* Statement Section */` - This should stay!

### What to Add
Copy the ENTIRE contents of this file:
`C:\Users\christoph\planted-website\planted-astro\src\pages\[locale]\hero-styles-new.txt`

Paste it where you just removed the old hero styles (before `/* Statement Section */`).

---

## STEP 3: Verify the Changes

### Check HTML Structure
1. Open the file and scroll to the Hero section (~line 36)
2. Verify it starts with:
   ```astro
   <!-- Hero Section - TV Set Design -->
   <section class="hero">
       <div class="container">
           <div class="hero-content">
   ```
3. Verify it contains both `.hero-text` and `.hero-visual` divs
4. Verify the countries modal is at the end of the hero section

### Check CSS Styles
1. Scroll to the `<style>` section (~line 390)
2. Verify it starts with:
   ```css
   /* ═══════════════════════════════════════════════════════════════
      HERO SECTION — TV SET EDITION
      ═══════════════════════════════════════════════════════════════ */
   ```
3. Verify all hero styles are present
4. Verify `/* Statement Section */` comment comes after all hero styles

---

## STEP 4: Test in Browser

1. Save the file
2. Restart your dev server (if running)
3. Open the homepage
4. Check:
   - [ ] Hero displays in 2-column layout (desktop)
   - [ ] TV frame shows with video playing
   - [ ] Red light glows at top of TV
   - [ ] Annotation card floats to the right
   - [ ] Approved badge shows at bottom-left
   - [ ] All animations work
   - [ ] Responsive layout works on mobile

---

## If You Encounter Issues

### Issue: Layout is broken
**Solution:** Make sure you copied the ENTIRE content from the reference files, including all opening and closing tags.

### Issue: Styles don't apply
**Solution:** Clear your browser cache and restart the dev server.

### Issue: Countries modal doesn't work
**Solution:** Check that the JavaScript section at the bottom of the file still has the countries modal code.

### Issue: Animations don't play
**Solution:** Check that all `@keyframes` rules are present in the styles.

---

## Reference Files
- HTML Structure: `C:\Users\christoph\planted-website\planted-astro\src\pages\[locale]\hero-section-new.txt`
- CSS Styles: `C:\Users\christoph\planted-website\planted-astro\src\pages\[locale]\hero-styles-new.txt`
- Original Design Reference: `C:\Users\christoph\planted-website\todo\planted-website-complete.html` (lines 328-780)

---

## Need Help?
If you run into any issues, check the `AGENT-1-COMPLETION-SUMMARY.md` file for more details about what was changed and why.
