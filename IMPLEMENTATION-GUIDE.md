# Product Page Implementation Guide
## From Current → Reference Implementation

---

## Overview of Changes

The goal: **Show each piece of information exactly ONCE** in the most impactful location.

### Information Hierarchy (New)

| Info | Where it appears | Why |
|------|------------------|-----|
| **24g Protein** | Hero (giant) | The hero stat, shown huge |
| **5.7g Fiber** | Stats bar | Key nutrition, one place only |
| **72% Vitamin B12** | Stats bar | Key nutrition, one place only |
| **27% Iron** | Stats bar | Key nutrition, one place only |
| **0 Animals** | Stats bar | Impact stat |
| **6 Ingredients** | Ingredients section (note) | Context with actual ingredients |
| **77% Less CO₂** | Can add to Trust badges or keep in stats | Impact stat |
| **Full nutrition table** | Nutrition section | Detailed view for those who want it |

### What Was Removed

1. **Nutrition highlights box** (the 4 icons with Protein/Fiber/B12/Iron above the table)
   - Reason: This repeated info already shown in stats bar
   
2. **Protein in stats bar** 
   - Reason: Already shown huge in hero (24g)

3. **"6 Ingredients" in stats bar**
   - Reason: Better shown in context with actual ingredient pills

---

## File Structure

```
/products/steak/
  index.html      ← The product page
  images/
    hero-dish.png ← Main food photo
    pack.png      ← Product packaging
```

---

## Section-by-Section Implementation

---

### 1. HERO SECTION

#### HTML Structure
```html
<section class="hero" id="hero">
    <div class="hero-sticky">
        <!-- Animated gradient background -->
        <div class="hero-bg"></div>
        
        <!-- Dish photo (hidden initially, fades in on scroll) -->
        <div class="hero-dish" id="heroDish">
            <img src="images/hero-dish.png" alt="Planted steak dish">
        </div>
        
        <!-- Pack shot (visible initially, exits on scroll) -->
        <div class="hero-pack" id="heroPack">
            <img src="images/pack.png" alt="planted.steak packaging">
        </div>
        
        <!-- Product info (hidden initially, slides up on scroll) -->
        <div class="hero-info" id="heroInfo">
            <div class="hero-text">
                <h1>planted.steak</h1>
                <p class="variant">Classic — The one that started it all</p>
            </div>
            <div class="hero-protein">
                <div class="protein-number">
                    <span class="value">24</span><span class="unit">g</span>
                </div>
                <div class="protein-label">Protein per 100g</div>
            </div>
        </div>
        
        <!-- Scroll indicator -->
        <div class="scroll-hint" id="scrollHint">
            <span>Scroll</span>
            <div class="arrow"></div>
        </div>
    </div>
</section>
```

#### Key CSS for Hero
```css
.hero {
    min-height: 250vh; /* Extra height for scroll animation */
    position: relative;
}

.hero-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow: hidden;
}

/* Animated gradient background */
.hero-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        #7B3AAF 0%,
        #61269E 30%,
        #4A1D7A 70%,
        #3D1866 100%
    );
    background-size: 200% 200%;
    animation: gradientMove 12s ease infinite;
}

@keyframes gradientMove {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

/* Dish - starts hidden */
.hero-dish {
    position: absolute;
    inset: 0;
    opacity: 0;
    transform: scale(1.05);
    transition: opacity 0.8s ease, transform 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-dish.visible {
    opacity: 1;
    transform: scale(1);
}

.hero-dish img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 40%;
}

/* Gradient overlay on dish */
.hero-dish::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(97, 38, 158, 0.4) 0%,
        transparent 25%,
        transparent 55%,
        rgba(97, 38, 158, 0.95) 100%
    );
}

/* Pack shot */
.hero-pack {
    position: relative;
    z-index: 10;
    width: clamp(220px, 35vw, 380px);
    transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
    filter: drop-shadow(0 30px 50px rgba(0,0,0,0.3));
}

.hero-pack img {
    width: 100%;
    transform: rotate(-5deg);
}

/* Product info - starts hidden */
.hero-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 3rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 2rem;
    z-index: 20;
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    transition-delay: 0.2s;
}

.hero-info.visible {
    opacity: 1;
    transform: translateY(0);
}

/* THE BIG PROTEIN NUMBER */
.protein-number {
    font-family: 'VC Henrietta', serif;
    font-size: clamp(6rem, 22vw, 16rem);
    line-height: 0.75;
    letter-spacing: -0.04em;
    display: flex;
    align-items: baseline;
}

.protein-number .value {
    color: white;
    text-shadow: 
        0 4px 0 rgba(0,0,0,0.08),
        0 12px 30px rgba(0,0,0,0.15);
}

.protein-number .unit {
    color: #6BBF59;
    font-size: 0.6em;
    margin-left: -0.05em;
    text-shadow: 0 0 60px rgba(107, 191, 89, 0.5);
}

/* Mobile: stack vertically */
@media (max-width: 700px) {
    .hero-info {
        flex-direction: column;
        align-items: flex-start;
        padding: 2rem;
        gap: 1rem;
    }
    .hero-protein { text-align: left; }
}
```

#### JavaScript for Hero Animation
```javascript
const hero = document.getElementById('hero');
const heroPack = document.getElementById('heroPack');
const heroDish = document.getElementById('heroDish');
const heroInfo = document.getElementById('heroInfo');
const scrollHint = document.getElementById('scrollHint');

let ticking = false;

function updateHero() {
    const rect = hero.getBoundingClientRect();
    const scrollDistance = hero.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / scrollDistance, 0), 1);
    
    // Pack: scale down, rotate, move up, fade out, blur
    if (progress < 0.5) {
        const packProgress = progress * 2; // 0 to 1 over first half
        const scale = 1 - (packProgress * 0.5);
        const rotate = packProgress * 25;
        const translateY = packProgress * -35;
        const opacity = 1 - (packProgress * 1.5);
        const blur = packProgress * 6;
        
        heroPack.style.transform = `scale(${scale}) rotate(${rotate}deg) translateY(${translateY}vh)`;
        heroPack.style.opacity = Math.max(opacity, 0);
        heroPack.style.filter = `drop-shadow(0 30px 50px rgba(0,0,0,0.3)) blur(${blur}px)`;
    } else {
        heroPack.style.opacity = 0;
    }
    
    // Dish: fade in at 25% scroll
    if (progress > 0.25) {
        heroDish.classList.add('visible');
    } else {
        heroDish.classList.remove('visible');
    }
    
    // Info: slide up at 45% scroll
    if (progress > 0.45) {
        heroInfo.classList.add('visible');
    } else {
        heroInfo.classList.remove('visible');
    }
    
    // Hide scroll hint
    if (progress > 0.05) {
        scrollHint.classList.add('hidden');
    } else {
        scrollHint.classList.remove('hidden');
    }
    
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateHero);
        ticking = true;
    }
});

updateHero(); // Initial call
```

---

### 2. STATS BAR

#### HTML (Updated - no more protein, added B12 and Iron)
```html
<section class="stats">
    <div class="stats-grid">
        <div class="stat">
            <div class="stat-value">5.7g</div>
            <div class="stat-label">Fiber</div>
        </div>
        <div class="stat">
            <div class="stat-value">72%</div>
            <div class="stat-label">Vitamin B12</div>
        </div>
        <div class="stat">
            <div class="stat-value">27%</div>
            <div class="stat-label">Iron</div>
        </div>
        <div class="stat highlight">
            <div class="stat-value">0</div>
            <div class="stat-label">Animals</div>
        </div>
    </div>
</section>
```

#### CSS
```css
.stats {
    background: #61269E;
    padding: 2rem 1.5rem;
}

.stats-grid {
    display: flex;
    justify-content: center;
    gap: 3rem;
    flex-wrap: wrap;
    max-width: 700px;
    margin: 0 auto;
}

.stat {
    text-align: center;
    min-width: 80px;
}

.stat-value {
    font-family: 'VC Henrietta', serif;
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    color: #6BBF59;
    line-height: 1;
}

.stat-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.6);
    margin-top: 0.4rem;
}

/* "0 Animals" in white for emphasis */
.stat.highlight .stat-value {
    color: white;
}
```

---

### 3. NUTRITION SECTION

#### HTML (Simplified - removed highlights box)
```html
<section class="nutrition">
    <div class="nutrition-layout">
        <!-- Food image on left -->
        <div class="nutrition-image">
            <img src="images/nutrition-dish.jpg" alt="Planted steak close-up">
        </div>
        
        <!-- Table on right -->
        <div class="nutrition-content">
            <div class="nutrition-header">
                <h2>Nutritional values</h2>
                <button class="nutrition-toggle" id="nutritionToggle">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </button>
            </div>
            
            <!-- NO MORE HIGHLIGHTS BOX HERE -->
            
            <div class="nutrition-table" id="nutritionTable">
                <div class="nutrition-table-inner">
                    <table>
                        <thead>
                            <tr>
                                <th>Per 100g</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Energy</td><td>718 kJ / 172 kcal</td></tr>
                            <tr><td>Fat</td><td>8.1 g</td></tr>
                            <tr class="sub"><td>of which saturates</td><td>0.7 g</td></tr>
                            <tr><td>Carbohydrates</td><td>4.9 g</td></tr>
                            <tr class="sub"><td>of which sugars</td><td>2.1 g</td></tr>
                            <tr><td>Fiber</td><td>5.7 g</td></tr>
                            <tr class="protein-row"><td>Protein</td><td>24 g</td></tr>
                            <tr><td>Salt</td><td>0.8 g</td></tr>
                            <tr><td>Vitamin B12</td><td>1.8 µg (72%*)</td></tr>
                            <tr><td>Iron</td><td>3.8 mg (27%*)</td></tr>
                        </tbody>
                    </table>
                    <p class="nutrition-note">*of daily reference intake</p>
                </div>
            </div>
        </div>
    </div>
</section>
```

#### CSS for Collapsible Table (THE FIX)
```css
/* This is the correct way to animate height */
.nutrition-table {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.4s ease;
}

.nutrition-table.open {
    grid-template-rows: 1fr;
}

.nutrition-table-inner {
    overflow: hidden;
}
```

#### JavaScript for Toggle
```javascript
const nutritionToggle = document.getElementById('nutritionToggle');
const nutritionTable = document.getElementById('nutritionTable');

// Start open by default
nutritionTable.classList.add('open');
nutritionToggle.classList.add('open');

nutritionToggle.addEventListener('click', () => {
    nutritionTable.classList.toggle('open');
    nutritionToggle.classList.toggle('open');
});
```

---

### 4. INGREDIENTS SECTION

The "6 ingredients" note stays here, in context:

```html
<section class="ingredients">
    <h2>What's inside</h2>
    <div class="pills">
        <div class="pill">Water</div>
        <div class="pill">Pea Protein <span class="pct">(33%)</span></div>
        <div class="pill">Pea Fiber</div>
        <div class="pill">Rapeseed Oil</div>
        <div class="pill">Salt</div>
        <div class="pill">Vitamin B12</div>
    </div>
    <div class="ingredient-note">That's it. 6 ingredients.</div>
</section>
```

---

## Summary of What to Delete

### Delete from Stats Bar:
```html
<!-- DELETE THIS -->
<div class="stat">
    <div class="stat-value">24g</div>
    <div class="stat-label">Protein</div>
</div>

<!-- DELETE THIS -->
<div class="stat">
    <div class="stat-value">6</div>
    <div class="stat-label">Ingredients</div>
</div>
```

### Delete from Nutrition Section:
```html
<!-- DELETE THIS ENTIRE BLOCK -->
<div class="nutrition-highlights">
    <div class="nh-item">
        <svg>...</svg>
        <span class="val">24g</span>
        <span class="lbl">Protein</span>
    </div>
    <div class="nh-item">
        <svg>...</svg>
        <span class="val">5.7g</span>
        <span class="lbl">Fiber</span>
    </div>
    <div class="nh-item">
        <svg>...</svg>
        <span class="val">72%</span>
        <span class="lbl">Vitamin B12</span>
    </div>
    <div class="nh-item">
        <svg>...</svg>
        <span class="val">27%</span>
        <span class="lbl">Iron</span>
    </div>
</div>
```

### Delete from CSS:
```css
/* DELETE ALL OF THIS */
.nutrition-highlights { ... }
.nh-item { ... }
.nh-item svg { ... }
.nh-item .val { ... }
.nh-item .lbl { ... }
```

---

## Checklist Before Launch

- [ ] Hero shows 24g HUGE (white number, green "g")
- [ ] Stats bar shows: Fiber, B12, Iron, 0 Animals (NOT protein)
- [ ] Nutrition highlights box is REMOVED
- [ ] Nutrition table toggle works (opens/closes smoothly)
- [ ] Ingredients section has "6 ingredients" note
- [ ] No emojis anywhere
- [ ] Pack animation is smooth (not janky)
- [ ] All easing uses cubic-bezier, not linear

---

## Quick Reference: Easing Curves

```css
/* Smooth, natural feel */
cubic-bezier(0.16, 1, 0.3, 1)

/* For exits/entrances */
cubic-bezier(0.4, 0, 0.2, 1)

/* Bouncy (use sparingly) */
cubic-bezier(0.34, 1.56, 0.64, 1)
```

---

## Files Included

1. **product-page-reference.html** - Complete working example
2. **This guide** - Implementation instructions

The reference file is self-contained (CSS + JS inline). Open it in browser to see it working, then extract the patterns you need.
