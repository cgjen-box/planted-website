# Planted Products Carousel — Final Implementation

## Features
1. ✅ Fade edges (no scrollbar)
2. ✅ Scroll affordance (hint + cursor + animation)
3. ✅ Drag-to-scroll functionality
4. ✅ Schoolcraft hover texts on every product
5. ✅ Progress dots (optional)
6. ✅ Responsive

---

## Scroll Affordance — 4 Ways Users Know They Can Scroll

### 1. Cursor Change
```css
.products-grid {
  cursor: grab;
}

.products-grid:active {
  cursor: grabbing;
}
```

### 2. Initial Peek Animation
Cards slide in slightly from right on load, implying more content:
```css
.products-grid {
  animation: peekAnimation 0.8s ease-out;
  animation-delay: 0.3s;
}

@keyframes peekAnimation {
  0% { transform: translateX(30px); opacity: 0.5; }
  100% { transform: translateX(0); opacity: 1; }
}
```

### 3. "Drag to Explore" Hint (fades out after 3s)
```html
<div class="scroll-hint">
  <span>Ziehen zum Entdecken</span>
  <svg>→</svg>
</div>
```

```css
.scroll-hint {
  animation: hintFadeOut 3s ease-in-out forwards;
  animation-delay: 2s;
}

.scroll-hint svg {
  animation: hintSlide 1.5s ease-in-out infinite;
}
```

### 4. Fade Edges
Right edge fades, clearly indicating more content exists.

---

## All Hover Texts (Schoolcraft Personality)

### German (DE, CH-DE, AT)

| Product | Hover Text |
|---------|------------|
| planted.chicken Nature | Das Huhn, das nie eines war. |
| planted.chicken Lemon Herbs | Zitrone trifft Kräuter trifft kein-Huhn. |
| planted.chicken Jerusalem Style | Tel Aviv auf dem Teller. |
| planted.chicken Crispy Strips | Knusprig wie Nuggets. Besser als Nuggets. |
| planted.chicken Burger | Der Burger der dich anlügt. Auf die gute Art. |
| planted.steak Classic | Für alle, die dachten: «Steak geht doch nicht pflanzlich.» |
| planted.steak Paprika | Medium-rare? Geht auch pflanzlich. |
| planted.kebab Original | 3 Uhr nachts. Ohne Reue danach. |
| planted.pulled BBQ | Pulled ohne Schwein. Schmeckt wie texanischer Sommer. |
| planted.pulled Spicy Herbs | Scharf. Kräutrig. Schweinefrei. |
| planted.schnitzel Wiener Art | Sogar die Grossmutter gibt zu: fast wie damals. |
| planted.schnitzel Classic | Schnitzel ohne Kalb. Gleiche Panade. |
| planted.bratwurst Original | Der Grill weiss nicht, dass es pflanzlich ist. |
| planted.bratwurst Herbs | Kräuter-Brat. Ohne Brat. |
| planted.duck Asian Style | Peking-Ente. Ohne Ente. |
| planted.skewers Herbs | Spiessig im besten Sinne. |
| planted.skewers Tandoori | Indien ruft. Das Huhn bleibt daheim. |
| planted.filetwürfel Classic | Würfel ohne Opfer. |
| planted.filetwürfel A La Mexicana | Fiesta ohne Fleisch. |
| planted.burger Crispy | Knusper-Patty mit reinem Gewissen. |
| planted.nuggets Classic | Chicken McNobody. |

### English (UK, EN variants)

| Product | Hover Text |
|---------|------------|
| planted.chicken Nature | The chicken that never was. |
| planted.chicken Lemon Herbs | Lemon meets herbs meets no-chicken. |
| planted.chicken Jerusalem Style | Tel Aviv on your plate. |
| planted.chicken Crispy Strips | Crispy like nuggets. Better than nuggets. |
| planted.chicken Burger | The burger that lies to you. In the best way. |
| planted.steak Classic | For everyone who thought: "Steak can't be plant-based." |
| planted.steak Paprika | Medium-rare? Works plant-based too. |
| planted.kebab Original | 3am. No regrets after. |
| planted.pulled BBQ | Pulled without pig. Tastes like Texas summer. |
| planted.pulled Spicy Herbs | Spicy. Herby. Pig-free. |
| planted.schnitzel Wiener Art | Even grandma admits: almost like the old days. |
| planted.schnitzel Classic | Schnitzel without veal. Same breading. |
| planted.bratwurst Original | The grill doesn't know it's plant-based. |
| planted.bratwurst Herbs | Herb sausage. Without the sausage. |
| planted.duck Asian Style | Peking duck. Without the duck. |
| planted.skewers Herbs | Skewered in the best sense. |
| planted.skewers Tandoori | India calls. The chicken stays home. |
| planted.filetwürfel Classic | Cubes without casualties. |
| planted.filetwürfel A La Mexicana | Fiesta without flesh. |
| planted.burger Crispy | Crispy patty with a clean conscience. |
| planted.nuggets Classic | Chicken McNobody. |

### Français (FR, CH-FR)

| Product | Hover Text |
|---------|------------|
| planted.chicken Nature | Le poulet qui n'en a jamais été un. |
| planted.chicken Lemon Herbs | Citron rencontre herbes rencontre pas-de-poulet. |
| planted.chicken Jerusalem Style | Tel Aviv dans ton assiette. |
| planted.chicken Crispy Strips | Croustillant comme des nuggets. Meilleur que des nuggets. |
| planted.chicken Burger | Le burger qui te ment. De la meilleure façon. |
| planted.steak Classic | Pour tous ceux qui pensaient: «Le steak ne peut pas être végétal.» |
| planted.steak Paprika | À point ? Ça marche aussi en végétal. |
| planted.kebab Original | 3h du mat. Sans regrets après. |
| planted.pulled BBQ | Effiloché sans porc. Goût d'été texan. |
| planted.pulled Spicy Herbs | Épicé. Aux herbes. Sans cochon. |
| planted.schnitzel Wiener Art | Même mamie avoue: presque comme avant. |
| planted.schnitzel Classic | Schnitzel sans veau. Même panure. |
| planted.bratwurst Original | Le grill ne sait pas que c'est végétal. |
| planted.bratwurst Herbs | Saucisse aux herbes. Sans la saucisse. |
| planted.duck Asian Style | Canard laqué. Sans canard. |
| planted.skewers Herbs | En brochette dans le meilleur sens. |
| planted.skewers Tandoori | L'Inde appelle. Le poulet reste à la maison. |
| planted.filetwürfel Classic | Dés sans victimes. |
| planted.filetwürfel A La Mexicana | Fiesta sans viande. |
| planted.burger Crispy | Patty croustillant avec la conscience tranquille. |
| planted.nuggets Classic | Chicken McNobody. |

### Italiano (IT, CH-IT)

| Product | Hover Text |
|---------|------------|
| planted.chicken Nature | Il pollo che non lo è mai stato. |
| planted.chicken Lemon Herbs | Limone incontra erbe incontra non-pollo. |
| planted.chicken Jerusalem Style | Tel Aviv nel piatto. |
| planted.chicken Crispy Strips | Croccante come nuggets. Meglio dei nuggets. |
| planted.chicken Burger | Il burger che ti mente. Nel modo migliore. |
| planted.steak Classic | Per tutti quelli che pensavano: «La bistecca non può essere vegetale.» |
| planted.steak Paprika | Al sangue? Funziona anche vegetale. |
| planted.kebab Original | Le 3 di notte. Senza rimpianti dopo. |
| planted.pulled BBQ | Sfilacciato senza maiale. Sa di estate texana. |
| planted.pulled Spicy Herbs | Piccante. Alle erbe. Senza maiale. |
| planted.schnitzel Wiener Art | Anche la nonna ammette: quasi come una volta. |
| planted.schnitzel Classic | Schnitzel senza vitello. Stessa panatura. |
| planted.bratwurst Original | La griglia non sa che è vegetale. |
| planted.bratwurst Herbs | Salsiccia alle erbe. Senza salsiccia. |
| planted.duck Asian Style | Anatra alla pechinese. Senza anatra. |
| planted.skewers Herbs | Infilzato nel senso migliore. |
| planted.skewers Tandoori | L'India chiama. Il pollo resta a casa. |
| planted.filetwürfel Classic | Cubetti senza vittime. |
| planted.filetwürfel A La Mexicana | Fiesta senza carne. |
| planted.burger Crispy | Patty croccante con la coscienza pulita. |
| planted.nuggets Classic | Chicken McNobody. |

### Nederlands (NL)

| Product | Hover Text |
|---------|------------|
| planted.chicken Nature | De kip die er nooit een was. |
| planted.chicken Lemon Herbs | Citroen ontmoet kruiden ontmoet geen-kip. |
| planted.chicken Jerusalem Style | Tel Aviv op je bord. |
| planted.chicken Crispy Strips | Knapperig als nuggets. Beter dan nuggets. |
| planted.chicken Burger | De burger die tegen je liegt. Op de beste manier. |
| planted.steak Classic | Voor iedereen die dacht: "Steak kan niet plantaardig." |
| planted.steak Paprika | Medium-rare? Werkt ook plantaardig. |
| planted.kebab Original | 3 uur 's nachts. Geen spijt daarna. |
| planted.pulled BBQ | Pulled zonder varken. Smaakt naar Texaanse zomer. |
| planted.pulled Spicy Herbs | Pittig. Kruidig. Varkensvrij. |
| planted.schnitzel Wiener Art | Zelfs oma geeft toe: bijna zoals vroeger. |
| planted.schnitzel Classic | Schnitzel zonder kalfsvlees. Zelfde paneermeel. |
| planted.bratwurst Original | De grill weet niet dat het plantaardig is. |
| planted.bratwurst Herbs | Kruidenworst. Zonder worst. |
| planted.duck Asian Style | Pekingeend. Zonder eend. |
| planted.skewers Herbs | Gespiest in de beste zin. |
| planted.skewers Tandoori | India roept. De kip blijft thuis. |
| planted.filetwürfel Classic | Blokjes zonder slachtoffers. |
| planted.filetwürfel A La Mexicana | Fiesta zonder vlees. |
| planted.burger Crispy | Knapperige patty met een schoon geweten. |
| planted.nuggets Classic | Chicken McNobody. |

### Español (ES)

| Product | Hover Text |
|---------|------------|
| planted.chicken Nature | El pollo que nunca lo fue. |
| planted.chicken Lemon Herbs | Limón conoce hierbas conoce no-pollo. |
| planted.chicken Jerusalem Style | Tel Aviv en tu plato. |
| planted.chicken Crispy Strips | Crujiente como nuggets. Mejor que nuggets. |
| planted.chicken Burger | La hamburguesa que te miente. De la mejor manera. |
| planted.steak Classic | Para todos los que pensaron: «El filete no puede ser vegetal.» |
| planted.steak Paprika | ¿Poco hecho? También funciona vegetal. |
| planted.kebab Original | Las 3 de la mañana. Sin arrepentimientos después. |
| planted.pulled BBQ | Deshilachado sin cerdo. Sabe a verano texano. |
| planted.pulled Spicy Herbs | Picante. Con hierbas. Sin cerdo. |
| planted.schnitzel Wiener Art | Hasta la abuela admite: casi como antes. |
| planted.schnitzel Classic | Schnitzel sin ternera. Mismo empanado. |
| planted.bratwurst Original | La parrilla no sabe que es vegetal. |
| planted.bratwurst Herbs | Salchicha de hierbas. Sin salchicha. |
| planted.duck Asian Style | Pato pekín. Sin pato. |
| planted.skewers Herbs | Ensartado en el mejor sentido. |
| planted.skewers Tandoori | India llama. El pollo se queda en casa. |
| planted.filetwürfel Classic | Cubos sin víctimas. |
| planted.filetwürfel A La Mexicana | Fiesta sin carne. |
| planted.burger Crispy | Patty crujiente con la conciencia tranquila. |
| planted.nuggets Classic | Chicken McNobody. |

---

## HTML Structure

```html
<a href="/product/[slug]" class="product-card">
  <div class="product-image">
    <!-- Optional: <span class="product-badge">Neu</span> -->
    <img src="[image-url]" alt="[product-name]">
  </div>
  <div class="product-info">
    <span class="product-category">[category]</span>
    <h3 class="product-name">[name]</h3>
  </div>
  <div class="product-hover-text">[hover-text]</div>
</a>
```

---

## Complete CSS

```css
/* ================================================
   PRODUCTS SECTION
   ================================================ */
.products-section {
  padding: 80px 0;
  overflow: hidden;
  background: #FDF8F3;
}

/* Header */
.products-header {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.products-header h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  color: #7B2D8E;
}

.view-all-link {
  color: #7B2D8E;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: gap 0.2s ease;
}

.view-all-link:hover {
  gap: 12px;
}

/* ================================================
   CAROUSEL WRAPPER
   ================================================ */
.products-carousel-wrapper {
  position: relative;
}

/* Fade edges */
.products-carousel-wrapper::before,
.products-carousel-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100px;
  z-index: 10;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.products-carousel-wrapper::before {
  left: 0;
  background: linear-gradient(to right, #FDF8F3 0%, transparent 100%);
  opacity: 0;
}

.products-carousel-wrapper::after {
  right: 0;
  background: linear-gradient(to left, #FDF8F3 0%, transparent 100%);
}

.products-carousel-wrapper.scrolled::before {
  opacity: 1;
}

.products-carousel-wrapper.at-end::after {
  opacity: 0;
}

/* ================================================
   SCROLL HINT
   ================================================ */
.scroll-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7B2D8E;
  font-size: 0.85rem;
  opacity: 0.7;
  z-index: 20;
  pointer-events: none;
  animation: hintFadeOut 3s ease-in-out forwards;
  animation-delay: 2s;
}

.scroll-hint svg {
  animation: hintSlide 1.5s ease-in-out infinite;
}

@keyframes hintSlide {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(8px); }
}

@keyframes hintFadeOut {
  0% { opacity: 0.7; }
  100% { opacity: 0; visibility: hidden; }
}

/* ================================================
   PRODUCTS GRID
   ================================================ */
.products-grid {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;
  padding: 24px 48px 60px;
  
  /* Hide scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  /* Drag cursor */
  cursor: grab;
  
  /* Peek animation */
  animation: peekAnimation 0.8s ease-out;
  animation-delay: 0.3s;
  animation-fill-mode: backwards;
}

.products-grid::-webkit-scrollbar {
  display: none;
}

.products-grid:active {
  cursor: grabbing;
}

@keyframes peekAnimation {
  0% { transform: translateX(30px); opacity: 0.5; }
  100% { transform: translateX(0); opacity: 1; }
}

/* ================================================
   PRODUCT CARD
   ================================================ */
.product-card {
  flex: 0 0 auto;
  width: 240px;
  scroll-snap-align: start;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  display: block;
  position: relative;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s ease;
}

.product-card:hover {
  transform: translateY(-12px);
  box-shadow: 0 24px 48px rgba(123, 45, 142, 0.18);
}

/* Product Image */
.product-image {
  position: relative;
  padding: 28px;
  background: linear-gradient(145deg, #FDF8F3 0%, white 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  overflow: hidden;
}

.product-image img {
  max-height: 150px;
  width: auto;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.product-card:hover .product-image img {
  transform: scale(1.1) rotate(-3deg);
}

/* NEW Badge */
.product-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #7B2D8E;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 5px 10px;
  border-radius: 20px;
}

/* Product Info */
.product-info {
  padding: 20px;
  position: relative;
  z-index: 2;
  background: white;
}

.product-category {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6AB547;
}

.product-name {
  font-family: 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #7B2D8E;
  margin-top: 2px;
}

/* ================================================
   HOVER TEXT — Schoolcraft Personality
   ================================================ */
.product-hover-text {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #7B2D8E;
  color: white;
  padding: 16px 20px;
  font-family: 'Caveat', cursive;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 5;
}

.product-card:hover .product-hover-text {
  transform: translateY(0);
}

/* Optional: Small arrow indicator */
.product-hover-text::before {
  content: '↑';
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: #7B2D8E;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
}

/* ================================================
   PROGRESS DOTS (optional)
   ================================================ */
.scroll-progress {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: -20px;
  padding-bottom: 20px;
}

.scroll-progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #D1D5DB;
  transition: all 0.3s ease;
}

.scroll-progress-dot.active {
  width: 20px;
  border-radius: 3px;
  background: #7B2D8E;
}

/* ================================================
   RESPONSIVE
   ================================================ */
@media (max-width: 768px) {
  .products-header {
    padding: 0 24px;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .products-header h2 {
    font-size: 1.75rem;
  }
  
  .products-grid {
    padding: 20px 24px 50px;
    gap: 16px;
  }
  
  .product-card {
    width: 200px;
  }
  
  .products-carousel-wrapper::before,
  .products-carousel-wrapper::after {
    width: 50px;
  }
  
  .scroll-hint {
    display: none; /* Touch devices don't need this */
  }
}
```

---

## JavaScript

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.products-carousel-wrapper');
  const grid = document.querySelector('.products-grid');
  const progressDots = document.querySelectorAll('.scroll-progress-dot');
  
  if (!wrapper || !grid) return;
  
  // Update scroll state for fade edges
  function updateScrollState() {
    const scrollLeft = grid.scrollLeft;
    const maxScroll = grid.scrollWidth - grid.clientWidth;
    
    wrapper.classList.toggle('scrolled', scrollLeft > 20);
    wrapper.classList.toggle('at-end', scrollLeft >= maxScroll - 20);
    
    // Update progress dots (if present)
    if (progressDots.length > 0) {
      const progress = scrollLeft / maxScroll;
      const activeIndex = Math.min(
        Math.floor(progress * progressDots.length),
        progressDots.length - 1
      );
      
      progressDots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
      });
    }
  }
  
  grid.addEventListener('scroll', updateScrollState);
  updateScrollState();
  
  // Drag to scroll functionality
  let isDown = false;
  let startX;
  let scrollLeftStart;
  
  grid.addEventListener('mousedown', (e) => {
    isDown = true;
    grid.style.cursor = 'grabbing';
    startX = e.pageX - grid.offsetLeft;
    scrollLeftStart = grid.scrollLeft;
  });
  
  grid.addEventListener('mouseleave', () => {
    isDown = false;
    grid.style.cursor = 'grab';
  });
  
  grid.addEventListener('mouseup', () => {
    isDown = false;
    grid.style.cursor = 'grab';
  });
  
  grid.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - grid.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    grid.scrollLeft = scrollLeftStart - walk;
  });
});
```

---

## Scroll Hint Translations

| Language | Text |
|----------|------|
| DE | Ziehen zum Entdecken |
| EN | Drag to explore |
| FR | Glisser pour découvrir |
| IT | Trascina per scoprire |
| NL | Sleep om te ontdekken |
| ES | Arrastra para explorar |
