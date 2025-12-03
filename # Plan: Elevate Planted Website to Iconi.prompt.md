# Plan: Elevate Planted Website to Iconic Brand Status

**TL;DR**: Transform the planted-website from a functional Astro rebuild into a bold, culturally-relevant brand experience. The technical foundation is solid—21 products, 154 recipes, 10 locales. Now we need to fill content gaps, add missing pages (Gastronomy, Sustainability, News), implement interactive features (newsletter, store locator, cookie consent), and polish with SEO/structured data. Think Oatly-level provocation meets Apple-level craft.

---

## Current State

### What's Working
- **Pages**: Homepage, Products, Product Detail, Recipes, Recipe Detail, Our Story — all functional with Apple-style scroll animations
- **Products**: 21 items with full nutrition data, cooking instructions, category gradients
- **Recipes**: 154 items (but many have placeholder instructions)
- **i18n**: 10 locales (CH-de, CH-fr, CH-it, DE, AT, IT, FR, NL, UK, ES) with 6 translation files
- **Brand**: Purple (#61269E) + Green (#6BBF59) + Cream (#FDF8F3), VC Henrietta + Galano Grotesque typography

### What's Missing
| Gap | Priority | Notes |
|-----|----------|-------|
| News/Blog content | High | Collection exists, 0 articles |
| Retailer data | High | Collection exists, empty |
| Recipe real instructions | High | 154 recipes with placeholders |
| Gastronomy page | Medium | B2B/Foodservice section |
| Sustainability page | Medium | LCA data, environmental impact |
| Newsletter signup | Medium | No form implementation |
| Store locator | Medium | Placeholder section, no API |
| Cookie consent | Medium | GDPR requirement |
| JSON-LD structured data | Medium | SEO for Products/Recipes |
| Sitemap + robots.txt | Low | Technical SEO |
| Search | Low | No site-wide search |
| 404 page | Low | No custom error page |

---

## Steps

### 1. Populate Empty Content Collections
Add news articles to `src/content/news/` with bold brand voice; fix 154 recipes with placeholder instructions; complete retailer data.

**Files to create/modify:**
- `src/content/news/*.json` — 5-10 launch articles
- `src/content/retailers/*.json` — Per-country retailer data
- `src/content/recipes/*.json` — Replace placeholder instructions

---

### 2. Build Missing Brand Pages
Create Gastronomy/B2B page (foodservice clients), Sustainability/Impact page (LCA data, environmental storytelling), and 404 page with brand personality.

**Files to create:**
- `src/pages/gastronomy.astro`
- `src/pages/sustainability.astro`
- `src/pages/404.astro`
- Localized versions in `src/pages/[locale]/`

---

### 3. Implement Interactive Features
Add newsletter signup form (country-aware), cookie consent banner (GDPR), integrate store locator API in `index.astro` placeholder section.

**Components to create:**
- `src/components/NewsletterSignup.astro`
- `src/components/CookieConsent.astro`
- `src/components/StoreLocator.astro`

---

### 4. Add SEO & Technical Polish
Implement JSON-LD structured data (Product, Recipe schemas) in `Layout.astro`; generate sitemap.xml; add robots.txt.

**Files to modify/create:**
- `src/layouts/Layout.astro` — Add JSON-LD slots
- `src/pages/products/[slug].astro` — Product schema
- `src/pages/recipes/[slug].astro` — Recipe schema
- `public/robots.txt`
- `astro.config.mjs` — Enable sitemap integration

---

### 5. Refine Ambassador/Cultural Content
Add Christian Stucki feature section, seasonal campaign flexibility, and editorial "Planted News" storytelling—not just product announcements.

**Content strategy:**
- Ambassador spotlights (athletes, chefs)
- Seasonal campaigns (holiday, summer BBQ)
- Cultural provocations (sustainability hot takes)

---

### 6. Optimize Assets & Performance
Replace Unsplash placeholders with real product photography; implement Astro Image component; add font subsetting.

**Files to modify:**
- All pages using `<img>` → `<Image>` component
- `astro.config.mjs` — Add image optimization
- `public/fonts/` — Subset font files

---

## Open Questions

1. **E-commerce strategy?** Static site vs. Shopify Buy Button integration vs. headless commerce — which approach fits your timeline?

2. **Recipe content ownership**: Are the 154 recipes with placeholder instructions awaiting real content, or should we generate them from product/cuisine context?

3. **Brand voice intensity**: How provocative should copy be? Oatly-level challenger brand statements, or more premium-subtle positioning?
follow the brand guidelines

---

## Execution Order

```
Phase 1: Content Foundation (Steps 1, 5)
├── News articles (5-10)
├── Retailer data
├── Recipe instruction fixes (batch)
└── Ambassador content

Phase 2: Missing Pages (Step 2)
├── Gastronomy page
├── Sustainability page
└── 404 page

Phase 3: Interactive Features (Step 3)
├── Newsletter signup
├── Cookie consent
└── Store locator

Phase 4: Technical Polish (Steps 4, 6)
├── JSON-LD structured data
├── Sitemap + robots.txt
├── Image optimization
└── Performance audit
```

---

## Agent Coordination

To implement this plan, coordinate sub-agents for:

1. **Content Agent**: Generate news articles, fix recipe placeholders, create retailer data
2. **Page Builder Agent**: Create gastronomy.astro, sustainability.astro, 404.astro with brand styling
3. **Component Agent**: Build NewsletterSignup, CookieConsent, StoreLocator components
4. **SEO Agent**: Add JSON-LD schemas, sitemap config, robots.txt
5. **Optimization Agent**: Replace img tags, audit performance, subset fonts
