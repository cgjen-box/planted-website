# Planted Website Content Import Report
**Generated:** December 3, 2025  
**Source:** eatplanted.com crawl analysis  
**Purpose:** Document valuable content to import into Astro implementation

---

## 1. NEWS ARTICLES

The `src/content/news/` folder is **EMPTY**. The live site has 12+ pages of news content. Here are the priority articles to import:

### 2025 Articles (Recent - High Priority)

| Date | Title | Slug | Key Content |
|------|-------|------|-------------|
| 01.10.2025 | Planted Chicken now available in all Swiss Subway restaurants | `subway-partnership` | Partnership with Subway Switzerland, Planted Teriyaki Sandwich launched in all locations. Started from social media comment. Swissness strategy. CHF 6.90 Sub of the Day on Saturdays. |
| 30.09.2025 | "All You Need is Crunch!" - Planted takes off with new crispy range | `crispy-range-launch` | NEW: planted.schnitzel, planted.burger Crispy, planted.nuggets. First use of **mycoprotein** (mushroom-based protein from fermentation). Available at REWE and EDEKA Germany. High protein, fiber, vitamin B12. |
| 09.07.2025 | Planted launches the planted.steak as the Schwingerkönig edition | `steak-schwingerkonig-edition` | Limited edition at Lidl Switzerland, CHF 6.95. Christian Stucki partnership. 97% less CO₂, 81% less water vs beef. |
| 17.06.2025 | Planted opens state of the art production facility in southern Germany | `memmingen-production-facility` | New facility in Memmingen, Bavaria. 20+ tonnes/day capacity. Doubling overall production. 50 jobs created. Groundwater cooling, CO2-neutral design. Whole-Muscle Platform technology. |
| 05.06.2025 | Introducing planted.steak Bites - Juicy & tender Bites for busy days | `steak-bites-launch` | NEW product: planted.steak Bites. Umami-packed cubes from fermented steak muscle. Available at Coop Switzerland. |
| 02.05.2025 | No chicken, no cry: If it says Planted, it is Planted | `federal-court-ruling` | Swiss Federal Supreme Court ruling on meat terminology. Affirmed generic terms like "steak" and "fillet" can be used. 3,493,696 chickens saved stat. Judith Wemmer quote. |
| 10.04.2025 | Christian Stucki loves Planted on his barbeque | `christian-stucki-ambassador` | Christian Stucki (Schwingerkönig 2019) becomes brand ambassador. "Approved by Meat Lovers" campaign. planted.steak Paprika launch. TV campaign on ProSiebenSat.1. |

### 2024 Articles

| Date | Title | Slug | Key Content |
|------|-------|------|-------------|
| 10.09.2024 | Planted builds additional production facility for Europe in southern Germany | `memmingen-announcement` | Announcement of Germany expansion |
| 28.05.2024 | planted.steak in retail | `steak-retail-launch` | Retail expansion of planted.steak |
| 12.03.2024 | Planted launches first-of-its-kind fermented Steak & expands production | `fermented-steak-launch` | Innovative fermentation technology, groundbreaking steak product |

### 2023 Articles

| Date | Title | Slug | Key Content |
|------|-------|------|-------------|
| 04.12.2023 | Our tips for a sustainable Christmas | `sustainable-christmas-2023` | Seasonal/holiday content |
| 21.11.2023 | The new plant-based winter roast from Planted | `winter-roast-2023` | Seasonal product launch |
| 10.10.2023 | Planted introduces its chicken filet to retail and foodservice | `chicken-filet-launch` | New product category |
| 03.10.2023 | Planted launches at Tesco and introduces planted.duck | `tesco-duck-launch` | UK market expansion, duck product launch |
| 26.09.2023 | Planted receives B Corp certification | `b-corp-certification` | Major milestone, sustainability certification |
| 15.06.2023 | Deutsche Bahn introduces currywurst with planted.bratwurst | `deutsche-bahn-partnership` | Gastronomy partnership |
| 14.06.2023 | Planted and Fleury Michon launch products in France | `fleury-michon-partnership` | French market expansion, co-branded products |
| 30.05.2023 | Planted launches Special Edition by NENI and Haya Molcho | `neni-special-edition` | Chef collaboration |
| 01.03.2023 | Plant-based meat saves up to 87% greenhouse emissions and 90% water | `lca-updated` | Critical sustainability data (see Section 3) |

### News Collection Schema Addition Needed

```typescript
// Add to src/content/config.ts
const news = defineCollection({
    type: 'data',
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        date: z.string(), // ISO date format
        summary: z.string(),
        content: z.string().optional(),
        image: z.string().optional(),
        category: z.enum(['product-launch', 'partnership', 'sustainability', 'company-news', 'milestone']),
        tags: z.array(z.string()).optional(),
        readingTime: z.number().optional(), // in minutes
    }),
});
```

---

## 2. GASTRONOMY CONTENT

### B2B Page Required: `gastronomy.astro`

**Live Site Navigation:** Shows "Gastronomy" as main menu item linking to B2B section

#### Key Messaging
- "I own a restaurant, retail store, online shop, or am a reseller and would like to become a customer"
- Free samples available for B2B customers
- B2B prices and conditions available
- Products shipped frozen
- Dedicated delivery for gastronomy partners

#### Notable Gastronomy Partnerships
1. **Subway Switzerland** - Planted Teriyaki Sandwich (all locations)
2. **Deutsche Bahn** - Currywurst with planted.bratwurst
3. **Tim Raue** (2-Michelin star restaurant in Berlin-Kreuzberg)
4. **Fleury Michon** (French charcuterie partnership)
5. **NENI / Haya Molcho** - Special Edition products

#### B2B Section Features to Implement
- Contact form for gastronomy inquiries
- B2B pricing request
- Sample request system
- Locations integration (locations.eatplanted.com)

---

## 3. SUSTAINABILITY DATA

### Critical Statistics (For `sustainability.astro`)

#### LCA Data (Life Cycle Assessment) - Updated March 2023
**Source:** Independent analysis by Eaternity

| Product | CO2 Savings vs Animal | Water Savings vs Animal |
|---------|----------------------|------------------------|
| planted.chicken | 77% | 85% |
| planted.pulled | 83% | 75% |
| planted.kebab | 87% | 85% |
| planted.schnitzel | 87% | 90% |
| **planted.steak** | **97%** | **81%** |

#### Concrete Examples
- **planted.chicken:** 1.62 kg CO2-eq/kg vs 7.01 kg CO2-eq/kg for animal chicken (77% reduction)
- **planted.chicken water:** 85% less fresh water, 80% less scarce water
- **planted.schnitzel CO2:** Production equivalent to 7km car journey vs 54km for pork schnitzel
- **planted.schnitzel water:** 7 dishwasher cycles vs 67 for pork schnitzel (90% savings)

#### Animal Counter (Dynamic)
The live site shows a running counter:
- Chickens rescued: [dynamic counter]
- Pigs rescued: [dynamic counter]
- Cattle rescued: [dynamic counter]

**Stat from court ruling article:** 3,493,696 chicken lives saved (as of May 2025)

#### Sustainability Pillars (from /pages/sustainability)
1. Energy & Water
2. Innovation
3. Circularity
4. Partners
5. Packaging
6. Resource Efficiency
7. Team & Community
8. Climate Protection Project

#### Downloadable Reports
- Sustainability Overview 2024
- Sustainability Report 2023
- Sustainability Report 2022
- Sustainability Report 2021

#### B Corp Certification
- Certified September 2023
- Audited across all European offices and manufacturing facilities
- Part of global and Swiss B Corp community

---

## 4. FAQ CONTENT

The live site has an FAQ page with 4 categories. Questions are collapsed (answers not fully visible in crawl).

### General
1. Where are Planted products manufactured?
2. Where can I buy Planted?
3. How do I prepare Planted correctly?
4. Why does Planted look like animal meat and why do you name products after animal products?
5. What makes Planted different from other plant-based meats?
6. How is Planted meat made?
7. Can Planted meat be frozen?
8. Can Planted be reheated after preparation?
9. What is the shelf life of Planted meat?
10. Is it possible to visit the Planted production facility?

### Ingredients
1. What ingredients does Planted Meat consist of?
2. Are Planted products certified organic?
3. Are Planted products vegan?
4. Are Planted products gluten-free?
5. What are the nutritional values of Planted?
6. Do your products contain GMOs?
7. Where does the Vitamin B12 used come from?
8. Why is vitamin B12 added?

### Sustainability
1. Is Planted B Corp certified?
2. How is the CO2 and water footprint of Planted products calculated?
3. How is biodiversity considered when selecting products?
4. Is Planted more sustainable compared to animal products?
5. How does Planted consider the circular economy?
6. Are the products produced in an environmentally friendly way?
7. How sustainable is the sourcing of raw materials?
8. How sustainable is pea protein?
9. What does Planted do about food waste?
10. How are Planted raw materials transported?
11. Where do the figures from the comparison with animal products come from?
12. What is the packaging made of?
13. Where are the ingredients sourced from?

### Gastronomy (B2B)
1. How do I become a B2B customer?
2. Can I receive free samples? Which products?
3. Where can I see B2B prices and conditions?
4. What quantities can I purchase as a B2B customer?
5. How long does delivery take?
6. Are products shipped frozen?
7. Can I buy products online?

### FAQ Collection Schema

```typescript
const faqs = defineCollection({
    type: 'data',
    schema: z.object({
        question: z.string(),
        answer: z.string(),
        category: z.enum(['general', 'ingredients', 'sustainability', 'gastronomy']),
        order: z.number().default(0),
    }),
});
```

---

## 5. AMBASSADOR CONTENT

### Christian Stucki - Brand Ambassador

**Profile:**
- **Title:** Schwingerkönig 2019 (Wrestling King)
- **Role:** Official Planted Brand Ambassador (since April 2025)
- **Tagline:** "Approved by Meat Lovers"
- **Personal:** Lost ~25kg since active wrestling, focuses on balanced diet

**Key Quotes:**
> "When I tried the planted.steak, I was genuinely surprised at how good it tastes. The bite, the juiciness and the colour blew me away. I now cook it regularly for my family."

> "Health is very important to me and I'm always open to alternatives. Great plant-based products like those from Planted make it easy for me to eat more consciously without sacrificing enjoyment."

**Campaign:** 
- TV commercials on ProSiebenSat.1 channels (Germany, Austria)
- Joyn streaming platform
- Swiss channels (ProSieben Schweiz, SRF)
- Digital media and DOOH in Switzerland

**Special Products:**
- planted.steak Schwingerkönig Edition (Lidl exclusive, CHF 6.95)
- planted.steak Paprika (BBQ campaign focus)

### Other Chef Partnerships
- **Tim Raue** - 2-Michelin star chef, Berlin-Kreuzberg (products on menu since Oct 2021)
- **Haya Molcho / NENI** - Special Edition collaboration (May 2023)

### Ambassador Page Schema

```typescript
const ambassadors = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
        title: z.string(),
        role: z.string(),
        photo: z.string(),
        bio: z.string(),
        quotes: z.array(z.string()),
        products: z.array(z.string()).optional(), // featured products
        socialLinks: z.object({
            instagram: z.string().optional(),
            website: z.string().optional(),
        }).optional(),
    }),
});
```

---

## 6. MISSING FEATURES

### Pages to Create

| Page | Priority | Description |
|------|----------|-------------|
| `/news` | HIGH | News listing page with pagination |
| `/news/[slug]` | HIGH | Individual news article pages |
| `/sustainability` | HIGH | Dedicated sustainability page with LCA data, B Corp info, counters |
| `/faq` | MEDIUM | FAQ page with collapsible sections |
| `/gastronomy` | MEDIUM | B2B/Gastronomy partner page |
| `/press` | MEDIUM | Press & Media page with downloads |
| `/sponsoring` | LOW | Sponsorship request form |
| `/festtage` (seasonal) | LOW | Festive/seasonal landing page |

### Features Missing from Current Implementation

1. **Store Locator Integration**
   - Live site links to: `locations.eatplanted.com`
   - Should integrate or link to location finder

2. **Newsletter Signup**
   - Present in footer on all pages
   - Country selector dropdown
   - Privacy policy checkbox

3. **Dynamic Animal Counter**
   - Chickens/Pigs/Cattle rescued counter
   - Could be estimated based on sales data

4. **Product Comparison Widget**
   - CO2/Water savings vs animal products
   - Interactive comparison on product pages

5. **Recipe Filtering**
   - By product type (steak, chicken, pulled, etc.)
   - By tags (festtage, seasonal, difficulty)

6. **Multi-language Support**
   - Site has language switcher
   - Current implementation has `/[locale]/` routes - needs full content

7. **Festive/Seasonal Sections**
   - `/pages/festtage` shows seasonal recipes and products
   - Time-limited promotions

8. **YouTube Video Integration**
   - Homepage has embedded video: `youtube.com/watch?v=Hezr27P3LnE`

---

## 7. CONTENT GAPS

### Products Comparison

**Our Products (21 total):**
```
bratwurst-herbs, bratwurst-original, burger-crispy, chicken-burger, 
chicken-crispy-strips, chicken-jerusalem, chicken-lemon-herbs, 
chicken-nature, duck-asian, filetwuerfel-classic, filetwuerfel-mexicana, 
kebab, nuggets, pulled-bbq, pulled-spicy-herbs, schnitzel-wiener, 
schnitzel, skewers-herbs, skewers-tandoori, steak-paprika, steak
```

**Live Site Products Found:**
- planted.steak ✅
- planted.steak Paprika ✅
- planted.steak Bites Classic ✅ (maps to filetwuerfel-classic)
- planted.steak Bites A La Mexicana ✅ (maps to filetwuerfel-mexicana)
- planted.kebab ✅
- planted.chicken Nature ✅
- planted.chicken Lemon & Herb ✅
- planted.chicken Jerusalem ✅
- planted.duck ✅
- planted.pulled BBQ ✅
- planted.pulled Spicy Herbs ✅
- planted.schnitzel ✅
- planted.schnitzel Viennese style ✅
- planted.skewers Herbs ✅
- planted.skewers Tandoori ✅
- planted.bratwurst (Original) ✅
- planted.bratwurst Herbs ✅
- planted.nuggets ✅ (NEW - Crispy range, uses mycoprotein)
- planted.burger Crispy ✅ (NEW - Crispy range)

**Potentially Missing Products:**
1. ❓ **planted.chicken Teriyaki** (Subway partnership product)
2. ❓ **planted.chicken Filet** (launched Oct 2023)
3. ❓ **Winter Roast** (seasonal product)
4. ❓ **planted.steak Schwingerkönig Edition** (Lidl exclusive)

### Recipe Categories on Live Site
Found recipe tags:
- Festtagsrezepte (festive recipes)
- planted.steak
- planted.steak Bites
- planted.chicken
- planted.pulled
- planted.kebab
- planted.schnitzel
- planted.bratwurst
- planted.duck
- planted.skewers
- planted.chicken Crispy Strips

**We have 154 recipes** - appears comprehensive, would need full crawl to compare

### Missing Retailer Information

**European Retailers (from news articles):**
- 🇨🇭 Switzerland: Coop, Migros, Lidl
- 🇩🇪 Germany: REWE, EDEKA, Kaufland
- 🇦🇹 Austria: Interspar, Eurospar, Spar Gourmet, Billa, Billa Plus
- 🇬🇧 UK: Tesco
- 🇫🇷 France: Carrefour (+ Fleury Michon partnership)
- 🇳🇱 Netherlands: Albert Heijn
- 🇧🇪🇱🇺 BeNeLux: [listed in markets but no specific retailers found]
- 🇮🇹 Italy: [listed in markets but no specific retailers found]

---

## 8. COMPANY INFORMATION

### Core Facts (for About page)

- **Founded:** July 2019
- **Headquarters:** The Valley, Kemptthal, Switzerland
- **Employees:** 200+
- **Markets:** CH, DE, AT, FR, IT, UK, BeNeLux
- **Production Facilities:** 
  - Kemptthal, Switzerland (original, lab opened Nov 2021)
  - Memmingen, Bavaria, Germany (opened June 2025)

### Founders
- Pascal Bieri (co-founder, met meat alternatives in US 2017)
- Lukas Böni (co-founder, PhD food process engineering)
- Eric Stirnemann (ETH doctoral student, wet extrusion expert)
- Christoph Jenny (co-founder, finance, foodservice experience)
- Judith Wemmer (late founder, joined Executive Board 2020, President of Swiss Protein Association)

### Key Milestones Timeline
- 2018: Research, experiment, taste
- Aug 2019: Company foundation, webshop, first restaurant partners
- Oct 2019: CHF 7M funding, production facility construction begins
- Jan 2020: Coop launch (first major retailer)
- Aug 2020: Kemptthal production facility operational (32 employees, 3 products)
- Nov 2020: EDEKA Südwest launch (Germany entry)
- Jan 2021: Planted.pulled launch, SPAR Austria
- Feb 2021: CHF 17M funding round
- Jul 2021: 2 years, 4 countries, 100 employees
- Sep 2021: Guinness World Record - 119m longest schnitzel
- Oct 2021: Tim Raue partnership
- Nov 2021: planted.schnitzel retail launch, own lab
- Dec 2021: Top 100 Startup Award winner
- May 2022: Production volume doubled, first Sustainability Report
- Jul 2022: 3 years, 6 countries, 170+ employees
- Aug 2022: CHF 70M Series B funding, planted.chicken Tenders (gastro)
- Sep 2022: Green Business Award 2022, first whole chicken breast
- Nov 2022: First vegan whole roast
- Dec 2022: Swiss yellow peas purchase
- Feb 2023: Tim Raue Special Edition (Green Paprika & Lime)
- Mar 2023: LCA update published (87% CO2, 90% water savings)
- Apr 2023: planted.bratwurst launch
- May 2023: Sustainability Report 2022, NENI Special Edition
- Jun 2023: Deutsche Bahn partnership, Fleury Michon France launch
- Sep 2023: B Corp certification, Swiss Startup Awards 2nd place
- Oct 2023: Tesco UK launch, planted.duck launch, chicken filet launch
- Mar 2024: Fermented steak launch
- May 2024: planted.steak retail expansion
- Sep 2024: Memmingen facility announced
- Apr 2025: Christian Stucki ambassador, TV campaign
- May 2025: Federal Supreme Court ruling
- Jun 2025: Memmingen facility opens, planted.steak Bites launch
- Jul 2025: Schwingerkönig Edition (Lidl)
- Sep 2025: Crispy range launch (mycoprotein products)
- Oct 2025: Subway Switzerland partnership

---

## 9. RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Critical Content (Week 1)
1. Create news collection schema
2. Import 7 key 2025 news articles
3. Create `/news` and `/news/[slug]` pages
4. Create `/sustainability` page with LCA data

### Phase 2: B2B & FAQ (Week 2)
1. Create FAQ collection and import questions
2. Create `/faq` page with collapsible sections
3. Create `/gastronomy` page for B2B
4. Add gastronomy partnerships section

### Phase 3: Ambassador & Press (Week 3)
1. Create ambassador collection
2. Add Christian Stucki profile
3. Create `/press` page
4. Add press kit downloads

### Phase 4: Enhancements (Week 4)
1. Add animal counter to sustainability page
2. Implement product comparison widget
3. Add newsletter signup to footer
4. Link store locator

---

## APPENDIX: Content Source URLs

| Page | URL |
|------|-----|
| Homepage | https://eatplanted.com |
| News | https://eatplanted.com/blogs/news |
| About | https://eatplanted.com/pages/about |
| Sustainability | https://eatplanted.com/pages/sustainability |
| FAQ | https://eatplanted.com/pages/faqs |
| Press | https://eatplanted.com/pages/press |
| Products | https://eatplanted.com/collections/products |
| Recipes | https://eatplanted.com/blogs/recipes |
| Festive | https://eatplanted.com/pages/festtage |
| Sponsoring | https://eatplanted.com/pages/sponsoring |
| Locations | https://locations.eatplanted.com |
