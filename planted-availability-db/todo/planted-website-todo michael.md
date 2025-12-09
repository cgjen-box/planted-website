# Planted Website Improvements - Todo List

Based on feedback review and brand guidelines analysis. This document outlines all required changes for implementation.

---

## 🔴 HIGH PRIORITY - Brand Guidelines Violations

### 1. Remove Black Footer Bar
**Location:** Footer section (all pages)
**Issue:** The black footer bar ("Pflanzenbasiert. Swiss-made.") does not align with Planted brand CI. 
**Action:** Change the footer background from black to a brand-compliant color (purple or green).

### 2. B Corp Logo - Use Official Logo
**Location:** Hero section, "B Corp zertifiziert" badge
**Issue:** Currently showing text badge, should use official B Corp logo
**Action:** Replace text with official B Corp Certified™ logo (ensure you have proper licensing to use it)
**Note:** Also check if Coop partnership is still active - may need to adjust retailer section

---

## 🟡 MEDIUM PRIORITY - Content & UX Improvements

### 3. Wording Change: "Tiere getötet" → "Tiere geschlachtet"
**Location:** Statistics section ("Die Zahlen sprechen für sich")
**Issue:** "Tiere getötet" (animals killed) feels judgmental/personified to meat-eaters. Use more neutral language.
**Current:** `0 Tiere getötet`
**Change to:** `0 Tiere geschlachtet` (animals slaughtered - more neutral)
**Rationale:** Reduces perceived judgment of meat-eaters while maintaining the same factual message.

### 4. Add Positive Adjective to Value Proposition
**Location:** Main heading section
**Current:** 
```
"Wir glauben, dass Fleisch nicht von Tieren kommen muss. Es muss einfach unglaublich schmecken."
```
**Change to:** 
```
"Wir glauben, dass Fleisch nicht von Tieren kommen muss. Es muss einfach unglaublich lecker schmecken."
```
**Alternative options:** "unglaublich gut schmecken", "unglaublich saftig schmecken"
**Brand Reference:** Tone of voice - entertaining, standing out, being real.

### 5. Make "6 Länder" Clickable
**Location:** Hero stats bar ("Made in Switzerland | 8.000+ Restaurants | 6 Länder")
**Issue:** Users want to see which countries Planted is available in
**Action:** Make "6 Länder" clickable with either:
- Option A: Modal popup showing country flags and names
- Option B: Tooltip on hover
- Option C: Scroll to locator section with country filter active

**Countries to display:**
- 🇨🇭 Switzerland
- 🇩🇪 Germany  
- 🇦🇹 Austria
- 🇫🇷 France
- 🇮🇹 Italy
- 🇳🇱 Netherlands
- 🇬🇧 United Kingdom
- 🇪🇸 Spain

(Note: Count may actually be 8 based on the locator section)

### 6. Reduce Section Spacing
**Location:** Global - all feature sections
**Issue:** Large gaps between sections cause excessive scrolling; users spend little time on websites
**Action:** Reduce vertical padding/margins between major sections by ~20-30%

```css
/* Example adjustment */
section {
  padding: 60px 0; /* reduce from current larger values */
}

/* Or use a utility class */
.section-compact {
  padding-top: 3rem;
  padding-bottom: 3rem;
}
```

### 7. Enhance Tim Raue Section
**Location:** Restaurant partnerships / Ambassador section
**Current:** Tim Raue restaurant is listed in the restaurant section
**Improvements:**
1. Add Tim Raue's signature image (handwritten signature graphic)
2. Add link to a video clip featuring Tim Raue with Planted
3. Consider creating a dedicated ambassador quote section similar to Christian Stucki
4. Potentially add a testimonial quote from Tim Raue

**Design suggestion:**
```html
<!-- Add to restaurant card or create dedicated section -->
<div class="chef-endorsement">
  <img src="/images/ambassadors/tim-raue.jpg" alt="Tim Raue" />
  <blockquote>
    "..." <!-- Quote from Tim Raue -->
  </blockquote>
  <img src="/images/signatures/tim-raue-signature.svg" alt="" class="signature" />
  <a href="https://youtube.com/..." class="video-link">Watch video</a>
</div>
```

---

## 🟢 LOWER PRIORITY - Enhancements

### 8. Restaurant Section - Add Delivery Service Links
**Location:** Restaurant partnerships / Locator "Order" tab
**Issue:** Restaurant section is strong but could be even stronger by directly linking to delivery services
**Action:** The "bestellen" tab already shows delivery options - ensure all restaurant cards have direct links to:
- Uber Eats
- Lieferando
- Wolt
- Deliveroo
- etc.

### 9. Review Coop Partnership Status
**Location:** Retailer section
**Issue:** Feedback mentions potential end of Coop partnership - verify if Coop should still be featured
**Action:** Confirm with Planted team whether Coop partnership is ongoing. If discontinued:
- Remove Coop from retailer list
- Update any related content

---

## 📋 Additional Brand Compliance Checks

### Logo Usage Verification
Based on brand guidelines, verify:
- [ ] Logo is positioned at edges, not floating in middle of page
- [ ] Logo maintains proper spacing (at least 5 points from edge, measured by logo dot size)
- [ ] Logo background container is only purple or green (not other colors like beige/peach)
- [ ] White wordmark only used on purple backgrounds
- [ ] No transparent logo overlays on images

### Color Palette Check
- ❌ Black should NOT be used as a primary background color (see footer)

### Typography Check
- Verify brand fonts are properly loaded
- Check headline hierarchy follows brand guidelines
- Ensure "planted." product logos include trademark where appropriate

---

## 🛠 Implementation Order

### Phase 1 - Quick Fixes (Same Day)
1. ✅ Change "Tiere getötet" → "Tiere geschlachtet"
2. ✅ Add positive adjective ("lecker") to value proposition
3. ✅ Change black footer to brand color

### Phase 2 - Content Updates (1-2 Days)
4. Replace B Corp text with official logo
5. Reduce section spacing globally
6. Make "6 Länder" interactive

### Phase 3 - Feature Enhancements (3-5 Days)
7. Enhance Tim Raue section with signature and video
8. Verify/update Coop partnership status
9. Audit all pages for brand guideline compliance

---

## 📁 Files Likely Needing Changes

```
/ch-de/
├── index.html          (main landing page)
├── styles/
│   ├── main.css        (global styles, spacing, colors)
│   └── footer.css      (footer styling)
├── components/
│   ├── hero.html       (stats bar, country click)
│   ├── statistics.html (Tiere geschlachtet change)
│   ├── footer.html     (black bar fix)
│   └── partners.html   (Tim Raue enhancement)
└── assets/
    └── images/
        ├── b-corp-logo.svg     (official logo)
        └── signatures/
            └── tim-raue.svg    (signature graphic)
```

---

## 📝 Copy Changes Summary

| Location | Current | New |
|----------|---------|-----|
| Statistics | "0 Tiere getötet" | "0 Tiere geschlachtet" |
| Value Prop | "Es muss einfach unglaublich schmecken" | "Es muss einfach unglaublich lecker schmecken" |

---

## 🔗 Reference Links

- Brand Guidelines: `/mnt/user-data/uploads/guidelines.pdf`
- Brand Strategy: `/mnt/user-data/uploads/brand.pdf`
- Live Website: https://cgjen-box.github.io/planted-website/ch-de/
- Official Brand Portal: https://brand.eatplanted.com

---

## ✅ Verification Checklist

After implementation, verify:
- [ ] Footer is purple or green, not black
- [ ] B Corp shows official logo
- [ ] "Tiere geschlachtet" is displayed
- [ ] "unglaublich lecker" is in the value proposition
- [ ] "6 Länder" is clickable and shows country list
- [ ] Section spacing is reduced and feels more compact
- [ ] Tim Raue section has signature and/or video link
- [ ] All subpages follow same brand guidelines
- [ ] No brand guideline violations remain
