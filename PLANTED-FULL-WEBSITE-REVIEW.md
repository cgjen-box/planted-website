# Planted Website — Comprehensive Design & Usability Review

**Site:** https://cgjen-box.github.io/planted-website/  
**Primary Audit Page:** /ch-de/ (Switzerland - German)  
**Review Date:** December 2024  
**Document Version:** 2.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Site Architecture](#site-architecture)
3. [Critical Issues](#critical-issues)
4. [High Priority Issues](#high-priority-issues)
5. [Medium Priority Issues](#medium-priority-issues)
6. [Low Priority Issues](#low-priority-issues)
7. [Localization Audit](#localization-audit)
8. [Accessibility Audit](#accessibility-audit)
9. [Performance Audit](#performance-audit)
10. [SEO Audit](#seo-audit)
11. [Cross-Browser Testing](#cross-browser-testing)
12. [Full Audit Checklist](#full-audit-checklist)
13. [Remediation Roadmap](#remediation-roadmap)

---

## Executive Summary

### Overall Assessment

The Planted website is a visually polished multi-locale e-commerce site with **17 locale variations** across **8 countries** and **6 languages**. The design system is strong, but significant localization gaps and functional issues undermine the user experience.

### Issue Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 5 | Blocks launch |
| 🟠 High | 8 | Fix within 1 week |
| 🟡 Medium | 12 | Fix within 2 weeks |
| 🟢 Low | 7 | Nice to have |
| **Total** | **32** | |

### Key Findings

1. **Broken Core Functionality** — Impact section counters show `0%` instead of animating
2. **Severe Localization Gaps** — ~40% of German page content is in English
3. **Accessibility Failures** — Cookie banner, forms, and navigation lack proper labels
4. **Legal Risk** — Cookie banner not translated (GDPR compliance issue)
5. **UX Issues** — Geolocation has no fallback; product list text concatenated without spacing

---

## Site Architecture

### Locale Structure (17 Total)

```
planted-website/
├── global/                 # International English
├── ch-de/                  # 🇨🇭 Switzerland - German
├── ch-fr/                  # 🇨🇭 Switzerland - French
├── ch-it/                  # 🇨🇭 Switzerland - Italian
├── ch-en/                  # 🇨🇭 Switzerland - English
├── de/                     # 🇩🇪 Germany - German
├── de-en/                  # 🇩🇪 Germany - English
├── at/                     # 🇦🇹 Austria - German
├── at-en/                  # 🇦🇹 Austria - English
├── fr/                     # 🇫🇷 France - French
├── fr-en/                  # 🇫🇷 France - English
├── it/                     # 🇮🇹 Italy - Italian
├── it-en/                  # 🇮🇹 Italy - English
├── nl/                     # 🇳🇱 Netherlands - Dutch
├── nl-en/                  # 🇳🇱 Netherlands - English
├── uk/                     # 🇬🇧 United Kingdom - English
├── es/                     # 🇪🇸 Spain - Spanish
└── es-en/                  # 🇪🇸 Spain - English
```

### Page Types Per Locale

| Page | Path | Estimated Count |
|------|------|-----------------|
| Homepage | `/` | 17 |
| Products Listing | `/products` | 17 |
| Product Detail (PDP) | `/products/[slug]` | ~21 × 17 = 357 |
| Recipes Listing | `/recipes` | 17 |
| Recipe Detail | `/recipes/[slug]` | ~50 × 17 = 850 |
| Our Mission | `/our-mission` | 17 |
| Sustainability | `/sustainability` | 17 |
| Gastronomy | `/gastronomy` | 17 |
| News | `/news` | 17 |
| Press | `/press` | 17 |
| FAQ | `/faq` | 17 |
| Privacy | `/privacy` | 17 |
| Terms | `/terms` | 17 |
| Imprint | `/imprint` | 17 |
| **Total Unique URLs** | | **~1,500+** |

### Products Catalog (21 Products)

| Category | Products |
|----------|----------|
| planted.chicken | Nature, Lemon Herbs, Jerusalem Style, Crispy Strips, Burger |
| planted.steak | Classic, Paprika |
| planted.pulled | BBQ, Spicy Herbs |
| planted.schnitzel | Wiener Art, Classic |
| planted.bratwurst | Original, Herbs |
| planted.kebab | Original |
| planted.duck | Asian Style |
| planted.skewers | Herbs, Tandoori |
| planted.filetwürfel | Classic, A La Mexicana |
| planted.burger | Crispy |
| planted.nuggets | Classic |

---

## Critical Issues

### 🔴 CRIT-001: Impact Section Counter Broken

**Location:** Homepage → Impact Section  
**Affected:** All locales  

**Problem:**
```html
<!-- Current (broken) -->
<div class="stat-value">0%</div>  <!-- Should show 97% -->
<div class="stat-value">0%</div>  <!-- Should show 95% -->
<div class="stat-value">0</div>   <!-- Should show 0 (correct value but no animation) -->
```

The impact counters display static `0%` instead of animating from 0 to their target values (97%, 95%, 0).

**Expected Behavior:**
- On scroll into view, numbers animate from 0 → target
- Uses Intersection Observer API
- Duration: ~1.5s with easing

**Impact:**
- Key sustainability message completely lost
- Most prominent data visualization is broken
- Users see meaningless "0%" values

**Fix Required:**
```javascript
// Add IntersectionObserver + requestAnimationFrame counter
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
    }
  });
}, { threshold: 0.5 });

function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 1500;
  // ... animation logic
}
```

**Priority:** 🔴 Critical — Blocks credibility

---

### 🔴 CRIT-002: Mixed Language Content (ch-de)

**Location:** Multiple sections on German homepage  
**Affected:** ch-de (likely other locales too)

**English Content Found on German Page:**

| Section | English Text | Should Be |
|---------|--------------|-----------|
| Footer | "Sustainability" | "Nachhaltigkeit" |
| Footer | "Gastronomy" | "Gastronomie" |
| Footer | "News" | "Neuigkeiten" |
| Cookie Banner | "We use cookies" | "Wir verwenden Cookies" |
| Cookie Banner | "Accept All" | "Alle akzeptieren" |
| Cookie Banner | "Necessary Only" | "Nur Notwendige" |
| Cookie Banner | "Settings" | "Einstellungen" |
| Cookie Banner | "Learn more" | "Mehr erfahren" |
| Newsletter | "Privacy Policy" | "Datenschutzrichtlinie" |
| Country Selector | "Select your shipping location and language" | "Wähle dein Land und deine Sprache" |
| Restaurant Cards | ALL descriptions in English | Should be German |
| Recipe Cards | "Easy" | "Einfach" |
| Store Locator | Country names in English | Should be German |

**Impact:**
- Unprofessional appearance
- Confuses German-speaking users
- Damages brand credibility
- ~40% of page content is wrong language

**Priority:** 🔴 Critical — Major UX failure

---

### 🔴 CRIT-003: Cookie Banner Not Translated

**Location:** Cookie consent modal (all pages)  
**Affected:** All non-English locales

**Current (English only):**
```
🍪 We use cookies
We use cookies to improve your experience and analyze site traffic.
By clicking "Accept All", you consent to our use of cookies.
[Accept All] [Necessary Only] [Settings]
```

**Required Translations:**

| Locale | "We use cookies" | "Accept All" | "Necessary Only" |
|--------|------------------|--------------|------------------|
| DE | "Wir verwenden Cookies" | "Alle akzeptieren" | "Nur Notwendige" |
| FR | "Nous utilisons des cookies" | "Tout accepter" | "Nécessaires uniquement" |
| IT | "Utilizziamo i cookie" | "Accetta tutti" | "Solo necessari" |
| NL | "Wij gebruiken cookies" | "Alles accepteren" | "Alleen noodzakelijk" |
| ES | "Usamos cookies" | "Aceptar todo" | "Solo necesarias" |

**Impact:**
- **GDPR Compliance Risk** — Consent must be in user's language
- Legal exposure in EU markets
- Poor user experience

**Priority:** 🔴 Critical — Legal compliance

---

### 🔴 CRIT-004: Geolocation Fallback Missing

**Location:** Store Locator section  
**Affected:** All locales

**Problem:**
```
"Standort wird ermittelt..."
```
This loading message shows indefinitely if:
- User denies location permission
- Geolocation API fails
- User is on VPN/proxy
- Browser doesn't support geolocation

**Expected Behavior:**
1. Show loading state (max 5 seconds)
2. If denied/failed, show:
   - Manual location input
   - Country dropdown selection
   - Default to locale's primary country

**Impact:**
- Users stuck on loading state
- Cannot find stores
- High bounce rate expected

**Priority:** 🔴 Critical — Core feature broken

---

### 🔴 CRIT-005: Product List Text Concatenation

**Location:** Store Locator → Retailer cards  
**Affected:** All locales

**Current (broken):**
```
Verfügbare Produkte:
planted.chickenplanted.steakplanted.pulledplanted.schnitzel +3
```

**Should Be:**
```
Verfügbare Produkte:
planted.chicken, planted.steak, planted.pulled, planted.schnitzel +3
```

**Impact:**
- Unreadable product lists
- Unprofessional appearance
- Confusing UX

**Fix:**
Add comma + space between product names, or use proper list formatting.

**Priority:** 🔴 Critical — Basic readability

---

## High Priority Issues

### 🟠 HIGH-001: "Approved by Meat Lovers" Not Localized

**Location:** Hero section  
**Type:** SVG image with embedded text

**Problem:**
The claim badge is an image (`/images/approvedclaim.svg`) with English text baked in. Cannot be translated per-locale.

**Options:**
1. Create localized SVG versions for each language
2. Replace with HTML text overlay on generic badge
3. Use dynamic text rendering

**Translations Needed:**
| Locale | Translation |
|--------|-------------|
| DE | "Von Fleischliebhabern empfohlen" |
| FR | "Approuvé par les amateurs de viande" |
| IT | "Approvato dagli amanti della carne" |
| NL | "Goedgekeurd door vleesliefhebbers" |
| ES | "Aprobado por los amantes de la carne" |

**Priority:** 🟠 High

---

### 🟠 HIGH-002: Emoji Flags Cross-Platform Issues

**Location:** Store locator, Newsletter, Country selector  

**Problem:**
```
🇦🇹 Austria  🇫🇷 France  🇩🇪 Germany...
🇨🇭 Switzerland 🇩🇪 Germany 🇦🇹 Austria...
```

Emoji flags:
- Render as text codes on Windows (CH, DE, AT)
- Look different across OS/browsers
- Not accessible to screen readers

**Fix:**
Replace with SVG flag icons:
```html
<img src="/images/flags/ch.svg" alt="" class="flag-icon" aria-hidden="true">
<span>Switzerland</span>
```

**Priority:** 🟠 High

---

### 🟠 HIGH-003: Restaurant Descriptions All English

**Location:** Store Locator → Restaurants tab  
**Affected:** All non-English locales

**Examples on ch-de (German page):**
```
"Two Michelin stars. Berlin's most celebrated chef serving 
planted.pulled Peking duck salad and planted.chicken with 
Jerusalem artichoke."

"Planted Teriyaki Sandwich. Our signature planted.chicken 
glazed in teriyaki sauce, at Subway locations across Switzerland."
```

All 5 restaurant partner descriptions are in English on the German page.

**Priority:** 🟠 High

---

### 🟠 HIGH-004: "Neu" Badge Not Localized

**Location:** Product cards  
**Affected:** All non-German locales

**Current:** Shows "Neu" (German) on all locales

**Needed:**
| Locale | Badge Text |
|--------|------------|
| EN | "New" |
| FR | "Nouveau" |
| IT | "Nuovo" |
| NL | "Nieuw" |
| ES | "Nuevo" |

**Priority:** 🟠 High

---

### 🟠 HIGH-005: Recipe Metadata Not Localized

**Location:** Recipe cards  
**Examples:**
```
21 Min • Easy
34 Min • Easy
43 Min • Easy
```

**Issues:**
- "Easy" should be "Einfach" (DE), "Facile" (FR), etc.
- "Min" acceptable but could be localized
- Bullet separator (•) acceptable

**Priority:** 🟠 High

---

### 🟠 HIGH-006: Mobile Menu Close Button

**Location:** Mobile navigation  
**Current:** Uses Unicode character `✕`

**Problems:**
- May not render on all devices
- Missing `aria-label`
- Touch target size unclear

**Fix:**
```html
<button class="close-menu" aria-label="Close menu">
  <svg>...</svg>
</button>
```

Ensure 44×44px minimum touch target.

**Priority:** 🟠 High

---

### 🟠 HIGH-007: Form Accessibility

**Location:** Newsletter signup, Store locator search  

**Problems:**
- Email input has no visible label
- Placeholder text disappears on focus
- No associated `<label>` elements
- Error states unclear

**Fix:**
```html
<label for="email" class="sr-only">Email address</label>
<input type="email" id="email" placeholder="your@email.com" required>
```

**Priority:** 🟠 High

---

### 🟠 HIGH-008: Copyright Year Outdated

**Location:** Footer  
**Current:** `© 2024 planted. Alle Rechte vorbehalten.`  
**Should Be:** `© 2025` (or dynamic year)

**Priority:** 🟠 High

---

## Medium Priority Issues

### 🟡 MED-001: Country Names Not Localized

**Location:** Store locator country filter  
**Example (on German page):**
```
🇦🇹 Austria  🇫🇷 France  🇩🇪 Germany  🇮🇹 Italy...
```

**Should be (German):**
```
🇦🇹 Österreich  🇫🇷 Frankreich  🇩🇪 Deutschland  🇮🇹 Italien...
```

**Priority:** 🟡 Medium

---

### 🟡 MED-002: Retailer Country Labels Not Localized

**Location:** Store locator retailer cards  
**Example:**
```
REWE
GermanyAustria    ← Missing space AND should be localized
```

**Should be:**
```
REWE
Deutschland, Österreich
```

**Priority:** 🟡 Medium

---

### 🟡 MED-003: Newsletter Heading Localization

**Location:** Newsletter section  
**Current (DE):** "Hungrig nach mehr?" ✅ (correct)  
**But also:** "Privacy Policy" ❌ (should be "Datenschutzrichtlinie")

**Priority:** 🟡 Medium

---

### 🟡 MED-004: Alt Text Quality

**Location:** All images  
**Current examples:**
```
alt="planted.chicken Nature"
alt="Ajvar Auflauf"
```

**Better examples:**
```
alt="Packaged planted.chicken Nature, plant-based chicken strips"
alt="Completed Ajvar Auflauf recipe in baking dish"
```

**Priority:** 🟡 Medium

---

### 🟡 MED-005: Video Accessibility

**Location:** Hero section  
**Issues:**
- No captions/subtitles
- No audio description
- No pause control visible
- `autoplay` may cause motion sensitivity issues

**Recommendations:**
- Add visible pause/play button
- Provide `prefers-reduced-motion` media query
- Consider static image fallback

**Priority:** 🟡 Medium

---

### 🟡 MED-006: Social Links Missing

**Location:** Footer  
**Issue:** No social media links visible (Instagram, LinkedIn, YouTube expected)

**Priority:** 🟡 Medium

---

### 🟡 MED-007: Stats Bar Text Inconsistency

**Location:** Hero section stats  
**Current:**
```
Made in Switzerland  8.000+ Restaurants  6 Länder
```

**Issues:**
- "Made in Switzerland" is English on German page
- Number format: 8.000 is European (correct for DE/CH)
- "Länder" is German ✅

**Priority:** 🟡 Medium

---

### 🟡 MED-008: Product Variant Names Strategy

**Location:** Product cards  
**Question:** Should variants be translated?

| Current | Potential DE | Potential FR |
|---------|--------------|--------------|
| Lemon Herbs | Zitrone & Kräuter | Citron & Herbes |
| Jerusalem Style | Jerusalem Art | Style Jérusalem |
| Asian Style | Asiatisch | Style Asiatique |
| Crispy Strips | Knusprige Streifen | Lanières Croustillantes |

**Recommendation:** Define consistent strategy (keep English for brand consistency OR fully localize)

**Priority:** 🟡 Medium

---

### 🟡 MED-009: Tab Labels Not Styled Consistently

**Location:** Store locator  
**Current:**
```
Geschäfte          Restaurants
```

**Issues:**
- No visual indication of active tab state in text content
- Accessibility: are these proper `<button>` or `role="tab"` elements?

**Priority:** 🟡 Medium

---

### 🟡 MED-010: "Ändern" (Change) Button Context

**Location:** Store locator  
**Text:** "Ergebnisse für  Ändern"

**Issue:** Orphan button without location shown (placeholder state?)

**Priority:** 🟡 Medium

---

### 🟡 MED-011: Online Shop Link

**Location:** Store locator fallback  
**Current:** Links to `https://shop.eatplanted.com`

**Question:** Does this link go to locale-appropriate shop? Should be `/ch-de/shop` etc.

**Priority:** 🟡 Medium

---

### 🟡 MED-012: B Corp Badge Not Linked

**Location:** Hero section  
**Issue:** "B Corp zertifiziert" text not linked to B Corp certification page

**Recommendation:** Link to B Corp profile or sustainability page

**Priority:** 🟡 Medium

---

## Low Priority Issues

### 🟢 LOW-001: Cookie Emoji in Banner

**Location:** Cookie consent  
**Current:** `🍪 We use cookies`

**Issue:** Emoji may not render consistently; consider SVG icon

**Priority:** 🟢 Low

---

### 🟢 LOW-002: Footer Tagline Inconsistency

**Location:** Footer  
**Current:** "Pflanzenbasiert. Swiss-made."

**Issue:** "Swiss-made" is English on German page

**Priority:** 🟢 Low

---

### 🟢 LOW-003: Email Contact Link

**Location:** Footer  
**Current:** `mailto:hello@eatplanted.com`

**Recommendation:** Consider locale-specific emails (hello-de@, hello-fr@) for better routing

**Priority:** 🟢 Low

---

### 🟢 LOW-004: Product Card Hover State

**Location:** Product grid  
**Issue:** Verify hover animations work on touch devices (no hover state on mobile)

**Priority:** 🟢 Low

---

### 🟢 LOW-005: Recipe Time Precision

**Location:** Recipe cards  
**Current:** "21 Min" — oddly specific

**Recommendation:** Round to 5-minute increments (20 min, 25 min) for readability

**Priority:** 🟢 Low

---

### 🟢 LOW-006: Gastronomy Stats Formatting

**Location:** B2B section  
**Current:**
```
8.000+
Partner-Restaurants
```

**Issue:** "Partner-Restaurants" compound word — verify hyphenation in other languages

**Priority:** 🟢 Low

---

### 🟢 LOW-007: Print Stylesheet

**Location:** All pages  
**Issue:** No `@media print` styles detected

**Recommendation:** Add print styles for recipe pages at minimum

**Priority:** 🟢 Low

---

## Localization Audit

### Translation Completeness Matrix

Use ✅ (complete), ⚠️ (partial), ❌ (missing), — (N/A)

| Element | DE | FR | IT | NL | ES | EN |
|---------|----|----|----|----|----|----|
| **Navigation** |
| Products link | ✅ | ? | ? | ? | ? | ✅ |
| Recipes link | ✅ | ? | ? | ? | ? | ✅ |
| Our Mission link | ✅ | ? | ? | ? | ? | ✅ |
| Find Us link | ✅ | ? | ? | ? | ? | ✅ |
| **Hero** |
| Headline | ✅ | ? | ? | ? | ? | ✅ |
| Subheadline | ✅ | ? | ? | ? | ? | ✅ |
| CTA buttons | ✅ | ? | ? | ? | ? | ✅ |
| Stats bar | ⚠️ | ? | ? | ? | ? | ✅ |
| Approved claim | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Impact Section** |
| Heading | ✅ | ? | ? | ? | ? | ✅ |
| Stat labels | ✅ | ? | ? | ? | ? | ✅ |
| Source text | ✅ | ? | ? | ? | ? | ✅ |
| **Products** |
| Section heading | ✅ | ? | ? | ? | ? | ✅ |
| "New" badge | ❌ | ? | ? | ? | ? | ✅ |
| Product names | ⚠️ | ? | ? | ? | ? | ✅ |
| **Recipes** |
| Section heading | ✅ | ? | ? | ? | ? | ✅ |
| Recipe titles | ✅ | ? | ? | ? | ? | ✅ |
| Difficulty | ❌ | ? | ? | ? | ? | ✅ |
| **Store Locator** |
| Heading | ✅ | ? | ? | ? | ? | ✅ |
| Country names | ❌ | ? | ? | ? | ? | ✅ |
| Tab labels | ✅ | ? | ? | ? | ? | ✅ |
| Restaurant descriptions | ❌ | ? | ? | ? | ? | ✅ |
| **Newsletter** |
| Heading | ✅ | ? | ? | ? | ? | ✅ |
| Privacy link | ❌ | ? | ? | ? | ? | ✅ |
| **Footer** |
| Section headings | ✅ | ? | ? | ? | ? | ✅ |
| Sustainability link | ❌ | ? | ? | ? | ? | ✅ |
| Gastronomy link | ❌ | ? | ? | ? | ? | ✅ |
| News link | ❌ | ? | ? | ? | ? | ✅ |
| Copyright text | ✅ | ? | ? | ? | ? | ✅ |
| **Cookie Banner** |
| All text | ❌ | ? | ? | ? | ? | ✅ |
| **Country Selector** |
| Modal heading | ❌ | ? | ? | ? | ? | ✅ |

**Legend:** ? = Needs verification (not fetched)

### ch-de Specific Issues

Total strings audited: ~85  
Correctly translated: ~50 (59%)  
English strings remaining: ~35 (41%)  

**Conclusion:** German locale is ~60% translated — unacceptable for production.

---

## Accessibility Audit

### WCAG 2.1 AA Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| **1.1.1 Non-text Content** | ⚠️ | Alt text present but low quality |
| **1.2.1 Audio-only/Video-only** | ❌ | Hero video has no alternative |
| **1.3.1 Info and Relationships** | ⚠️ | Forms lack proper labels |
| **1.4.1 Use of Color** | ✅ | Color not sole indicator |
| **1.4.3 Contrast (Minimum)** | ? | Needs tool verification |
| **1.4.4 Resize Text** | ? | Needs 200% zoom test |
| **2.1.1 Keyboard** | ? | Needs manual testing |
| **2.4.1 Bypass Blocks** | ❌ | No skip-to-main link |
| **2.4.2 Page Titled** | ✅ | Title present |
| **2.4.4 Link Purpose** | ⚠️ | Some links generic |
| **2.4.7 Focus Visible** | ? | Needs verification |
| **3.1.1 Language of Page** | ⚠️ | `lang="de"` but English content |
| **3.2.1 On Focus** | ✅ | No unexpected changes |
| **3.3.1 Error Identification** | ? | Form errors untested |
| **3.3.2 Labels or Instructions** | ❌ | Form labels missing |
| **4.1.1 Parsing** | ? | Needs HTML validation |
| **4.1.2 Name, Role, Value** | ⚠️ | Some interactive elements lack labels |

### Required Fixes

1. Add skip-to-main-content link
2. Add proper form labels
3. Ensure focus indicators visible
4. Add video alternatives
5. Fix language declaration vs content mismatch

---

## Performance Audit

### Lighthouse Targets

| Metric | Target | Desktop | Mobile |
|--------|--------|---------|--------|
| Performance | 90+ | ⬜ | ⬜ |
| Accessibility | 90+ | ⬜ | ⬜ |
| Best Practices | 90+ | ⬜ | ⬜ |
| SEO | 90+ | ⬜ | ⬜ |

### Core Web Vitals Targets

| Metric | Good | Target |
|--------|------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | < 2.0s |
| FID (First Input Delay) | < 100ms | < 50ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.05 |
| INP (Interaction to Next Paint) | < 200ms | < 100ms |

### Optimization Recommendations

1. **Images:** Convert to WebP, implement lazy loading
2. **Video:** Provide poster image, consider lazy loading
3. **Fonts:** Ensure font-display: swap is set
4. **CSS:** Critical CSS inline, defer non-critical
5. **JavaScript:** Minimize, defer non-critical scripts

---

## SEO Audit

### Per-Locale Requirements

| Element | Status | Notes |
|---------|--------|-------|
| `<title>` unique | ✅ | Locale-specific |
| `<meta description>` | ? | Needs verification |
| Single `<h1>` | ✅ | Present |
| Heading hierarchy | ✅ | H1→H2→H3 |
| `hreflang` tags | ? | Critical for multi-locale |
| Canonical URLs | ? | Needs verification |
| Open Graph tags | ? | For social sharing |
| Twitter Card tags | ? | For social sharing |
| Structured data | ? | Organization, Product schemas |
| Alt text | ⚠️ | Present but basic |
| Internal links valid | ✅ | No obvious 404s |
| Sitemap.xml | ? | Not accessible |
| Robots.txt | ? | Not accessible |

### Critical SEO Requirements

1. **hreflang Implementation:**
```html
<link rel="alternate" hreflang="de-CH" href="https://.../ch-de/" />
<link rel="alternate" hreflang="fr-CH" href="https://.../ch-fr/" />
<link rel="alternate" hreflang="it-CH" href="https://.../ch-it/" />
<link rel="alternate" hreflang="en-CH" href="https://.../ch-en/" />
<link rel="alternate" hreflang="de-DE" href="https://.../de/" />
<!-- ... all 17 locales -->
<link rel="alternate" hreflang="x-default" href="https://.../global/" />
```

2. **Structured Data (Organization):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Planted Foods AG",
  "url": "https://eatplanted.com",
  "logo": "https://.../logo.svg",
  "sameAs": [
    "https://instagram.com/eatplanted",
    "https://linkedin.com/company/planted"
  ]
}
```

---

## Cross-Browser Testing

### Browser Matrix

| Browser | Windows | macOS | iOS | Android |
|---------|---------|-------|-----|---------|
| Chrome 120+ | ⬜ | ⬜ | ⬜ | ⬜ |
| Firefox 120+ | ⬜ | ⬜ | — | ⬜ |
| Safari 17+ | — | ⬜ | ⬜ | — |
| Edge 120+ | ⬜ | ⬜ | — | — |
| Samsung Internet | — | — | — | ⬜ |

### Device Matrix

| Device Type | Screen Size | Status |
|-------------|-------------|--------|
| Mobile S | 320px | ⬜ |
| Mobile M | 375px | ⬜ |
| Mobile L | 425px | ⬜ |
| Tablet Portrait | 768px | ⬜ |
| Tablet Landscape | 1024px | ⬜ |
| Laptop | 1280px | ⬜ |
| Desktop | 1440px | ⬜ |
| Large Desktop | 1920px | ⬜ |
| 4K | 2560px | ⬜ |

---

## Full Audit Checklist

### Locale Testing Checklist (Repeat for Each of 17 Locales)

#### Page Load
- [ ] Page loads without errors
- [ ] All images load
- [ ] Video plays (where applicable)
- [ ] Fonts render correctly
- [ ] No console errors

#### Navigation
- [ ] Logo links to locale homepage
- [ ] All nav links work
- [ ] Mobile menu opens/closes
- [ ] Country selector works
- [ ] Language selector works

#### Content Translation
- [ ] Page title translated
- [ ] All headings translated
- [ ] All body text translated
- [ ] All button labels translated
- [ ] All form labels translated
- [ ] Error messages translated
- [ ] Footer fully translated
- [ ] Cookie banner translated

#### Functionality
- [ ] Product cards link correctly
- [ ] Recipe cards link correctly
- [ ] Store locator works
- [ ] Newsletter form submits
- [ ] Cookie consent saves

#### Visual Consistency
- [ ] Brand colors consistent
- [ ] Typography consistent
- [ ] Spacing consistent
- [ ] No text overflow
- [ ] Responsive at all breakpoints

---

## Remediation Roadmap

### Phase 1: Critical Fixes (Days 1-3)

| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| Fix impact counter animation | Dev | 2h | ⬜ |
| Complete ch-de translations | Localization | 4h | ⬜ |
| Translate cookie banner (all locales) | Localization | 2h | ⬜ |
| Add geolocation fallback | Dev | 3h | ⬜ |
| Fix product list spacing | Dev | 30m | ⬜ |

### Phase 2: High Priority (Days 4-7)

| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| Create localized "Approved" badges | Design | 4h | ⬜ |
| Replace emoji flags with SVG | Dev | 2h | ⬜ |
| Translate restaurant descriptions | Localization | 3h | ⬜ |
| Localize "New" badges | Dev | 1h | ⬜ |
| Localize recipe difficulty | Localization | 1h | ⬜ |
| Fix mobile menu accessibility | Dev | 1h | ⬜ |
| Add form labels | Dev | 1h | ⬜ |
| Update copyright year | Dev | 15m | ⬜ |

### Phase 3: Medium Priority (Days 8-14)

| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| Localize country names | Localization | 2h | ⬜ |
| Improve alt text quality | Content | 4h | ⬜ |
| Add video accessibility | Dev | 3h | ⬜ |
| Add social links to footer | Dev | 30m | ⬜ |
| Define product name localization strategy | Product | 2h | ⬜ |
| Audit all 17 locales | QA | 16h | ⬜ |

### Phase 4: Low Priority (Days 15-21)

| Task | Owner | Effort | Status |
|------|-------|--------|--------|
| Replace cookie emoji | Dev | 15m | ⬜ |
| Add print stylesheets | Dev | 2h | ⬜ |
| Cross-browser testing | QA | 8h | ⬜ |
| Performance optimization | Dev | 4h | ⬜ |
| SEO implementation | Dev | 4h | ⬜ |

---

## Appendix: Issue Tracker

| ID | Issue | Priority | Category | Status |
|----|-------|----------|----------|--------|
| CRIT-001 | Impact counter broken | 🔴 | Functionality | Open |
| CRIT-002 | Mixed language ch-de | 🔴 | Localization | Open |
| CRIT-003 | Cookie banner not translated | 🔴 | Legal/L10n | Open |
| CRIT-004 | Geolocation no fallback | 🔴 | UX | Open |
| CRIT-005 | Product list text concat | 🔴 | UX | Open |
| HIGH-001 | Approved badge not localized | 🟠 | Localization | Open |
| HIGH-002 | Emoji flags | 🟠 | Design | Open |
| HIGH-003 | Restaurant descriptions EN | 🟠 | Localization | Open |
| HIGH-004 | Neu badge not localized | 🟠 | Localization | Open |
| HIGH-005 | Recipe metadata EN | 🟠 | Localization | Open |
| HIGH-006 | Mobile menu a11y | 🟠 | Accessibility | Open |
| HIGH-007 | Form accessibility | 🟠 | Accessibility | Open |
| HIGH-008 | Copyright 2024 | 🟠 | Content | Open |
| MED-001 | Country names EN | 🟡 | Localization | Open |
| MED-002 | Retailer labels | 🟡 | Localization | Open |
| MED-003 | Privacy Policy EN | 🟡 | Localization | Open |
| MED-004 | Alt text quality | 🟡 | Accessibility | Open |
| MED-005 | Video accessibility | 🟡 | Accessibility | Open |
| MED-006 | Social links missing | 🟡 | Design | Open |
| MED-007 | Stats bar EN | 🟡 | Localization | Open |
| MED-008 | Product variants strategy | 🟡 | Content | Open |
| MED-009 | Tab styling | 🟡 | Design | Open |
| MED-010 | Ändern button | 🟡 | UX | Open |
| MED-011 | Shop link locale | 🟡 | UX | Open |
| MED-012 | B Corp not linked | 🟡 | UX | Open |
| LOW-001 | Cookie emoji | 🟢 | Design | Open |
| LOW-002 | Footer tagline | 🟢 | Localization | Open |
| LOW-003 | Email routing | 🟢 | Operations | Open |
| LOW-004 | Mobile hover states | 🟢 | Design | Open |
| LOW-005 | Recipe time precision | 🟢 | Content | Open |
| LOW-006 | Compound words | 🟢 | Localization | Open |
| LOW-007 | Print stylesheet | 🟢 | Design | Open |

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product Owner | | | ⬜ |
| Dev Lead | | | ⬜ |
| Design Lead | | | ⬜ |
| QA Lead | | | ⬜ |
| Localization Lead | | | ⬜ |
| Legal/Compliance | | | ⬜ |

---

*Document generated: December 2024*  
*Based on analysis of ch-de homepage. Full audit requires verification across all 17 locales.*
