# planted. Locator Implementation Guide

## Overview

This document provides complete instructions for implementing the planted. store/restaurant locator feature on eatplanted.com. The locator helps users find either restaurants serving planted products or retail stores selling them.

---

## Architecture

### Flow States

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SPLIT VIEW                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │   RESTAURANT PANEL   │  │          RETAIL PANEL                │ │
│  │   (Purple gradient)  │  │        (Green gradient)              │ │
│  │                      │  │                                      │ │
│  │   🍽️ Icon            │  │        🛒 Icon                       │ │
│  │   + Apple animation  │  │        + Apple animation             │ │
│  │                      │  │                                      │ │
│  │   "Lass es dir       │  │        "Selber machen"               │ │
│  │    kochen"           │  │                                      │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ZIP VIEW                                     │
│                    (Full screen overlay)                             │
│                                                                      │
│   ← Back                                                             │
│                                                                      │
│                      🍽️ / 🛒 Icon                                    │
│                    (blur → sharp reveal)                             │
│                                                                      │
│                     "Wo bist du?"                                    │
│                                                                      │
│                  ┌─────────────────────┐                             │
│                  │     PLZ eingeben    │ →                           │
│                  └─────────────────────┘                             │
│                                                                      │
│                          oder                                        │
│                                                                      │
│                  📍 Standort verwenden                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       RESULTS VIEW                                   │
│                                                                      │
│   ← 📍 Deutschland · 10115        [PLZ ändern]                       │
│      8 Restaurants in 10115                                          │
│                                                                      │
│   [🍽️ Restaurants]  [🛵 Lieferdienste]   ← Tabs (restaurant only)   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  🏪 dean&david                                    1.4 km    │   │
│   │  📍 Berlin Mitte · Healthy Bowls     ★ 4.4                  │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │  Tuscany Chicken Salad                           €12.90     │   │
│   │  planted.chicken mit italienischen Aromen...                │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │  [planted.chicken]                                          │   │
│   │  ─────────────────────────────────────────────────────────  │   │
│   │  [Lieferando ↗]  [Wolt ↗]                                   │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
/src
├── components/
│   └── locator/
│       ├── Locator.astro           # Main component wrapper
│       ├── SplitView.tsx           # Initial choice screen
│       ├── ZipInput.tsx            # ZIP code entry overlay
│       ├── Results.tsx             # Results display
│       ├── RestaurantCard.tsx      # Individual restaurant card
│       ├── RetailCard.tsx          # Individual store card
│       ├── IconRestaurant.tsx      # Restaurant SVG icon
│       └── IconRetail.tsx          # Retail SVG icon
├── styles/
│   └── locator.css                 # All locator styles
├── lib/
│   └── locator-api.ts              # API calls for locations
└── types/
    └── locator.ts                  # TypeScript interfaces
```

---

## Brand Colors

```css
:root {
  /* Primary */
  --planted-purple: #7B2D8E;
  --planted-purple-dark: #5C2269;
  --planted-purple-light: #9B4DB0;
  
  /* Secondary */
  --planted-green: #6BAB24;
  --planted-green-dark: #4a8a1a;
  --planted-green-light: #8BC53F;
  
  /* Accent */
  --planted-pink: #E91E8C;
  
  /* Neutrals */
  --planted-black: #0a0a0a;
  --planted-white: #ffffff;
}
```

---

## Animation Specifications

### Apple-Style Icon Hover Animation

The icon animation is a key differentiator. It creates a "blur → sharp" reveal effect inspired by Apple's product pages.

```javascript
// GSAP Timeline for hover-in
const tl = gsap.timeline();

// Step 1: Initial blur burst (0-150ms)
tl.to(icon, {
  filter: 'blur(12px)',
  scale: 1.25,
  duration: 0.15,
  ease: 'power2.out'
}, 0);

// Step 2: Sharpen while staying scaled (150-600ms)
tl.to(icon, {
  filter: 'blur(0px)',
  scale: 1.15,
  rotation: -3,  // Slight tilt for personality
  duration: 0.45,
  ease: 'power3.out'  // Apple's signature "settle" easing
}, 0.15);

// Step 3: Glow layers fade in
tl.to(glowLayer, {
  opacity: 1,
  scale: 1.15,
  duration: 0.6,
  ease: 'power2.out'
}, 0.1);
```

### Panel Expansion

When hovering, the active panel expands while the other shrinks:

```javascript
// Active panel
gsap.to(activePanel, {
  flex: 1.5,
  duration: 0.7,
  ease: 'power3.out'
});

// Other panel (dimmed)
gsap.to(otherPanel, {
  flex: 0.5,
  duration: 0.7,
  ease: 'power3.out'
});

gsap.to(otherPanel.querySelector('.icon'), {
  opacity: 0.4,
  scale: 0.85,
  filter: 'blur(3px)',
  duration: 0.5
});
```

### Screen Transitions

**Split → ZIP transition:**
1. Selected icon "explodes" with blur (0-500ms)
2. Other panel slides out (0-450ms)
3. ZIP overlay fades in (400ms+)
4. ZIP icon does blur→sharp reveal (500-1200ms)
5. Content fades up (550-1100ms)

**ZIP → Results transition:**
1. ZIP content fades out + scales down (0-300ms)
2. Results header slides down from top (350-800ms)
3. Cards stagger in from bottom (500ms+, 100ms stagger)

---

## TypeScript Interfaces

```typescript
// types/locator.ts

export type LocatorPath = 'restaurant' | 'retail';
export type ResultTab = 'restaurants' | 'delivery';

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  location: string;
  category: string;
  distance: string;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  dishes: Dish[];
  products: PlantedProduct[];
  orderLinks: OrderLink[];
  imageUrl?: string;
}

export interface Dish {
  name: string;
  description: string;
  price: string;
  priceValue: number;
  isVegan: boolean;
  isNew?: boolean;
}

export type PlantedProduct = 
  | 'planted.chicken'
  | 'planted.steak'
  | 'planted.pulled'
  | 'planted.kebab'
  | 'planted.schnitzel'
  | 'planted.bratwurst'
  | 'planted.burger';

export interface OrderLink {
  platform: 'lieferando' | 'ubereats' | 'wolt' | 'justeat' | 'website';
  url: string;
  label?: string;
}

export interface RetailStore {
  id: string;
  name: string;
  chain: string;
  address: string;
  city: string;
  postalCode: string;
  distance: string;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  products: PlantedProduct[];
  onlineShopUrl?: string;
}

export interface LocatorState {
  path: LocatorPath | null;
  zip: string;
  coordinates: { lat: number; lng: number } | null;
  tab: ResultTab;
  isLoading: boolean;
  error: string | null;
}
```

---

## API Integration

### Endpoint Structure

```typescript
// lib/locator-api.ts

const API_BASE = 'https://api.eatplanted.com/v1';

export async function searchRestaurants(params: {
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // km, default 10
  limit?: number;  // default 20
}): Promise<Restaurant[]> {
  const response = await fetch(`${API_BASE}/locations/restaurants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
}

export async function searchRetail(params: {
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  limit?: number;
}): Promise<RetailStore[]> {
  const response = await fetch(`${API_BASE}/locations/retail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return response.json();
}

export async function geocodePostalCode(
  postalCode: string,
  country: string = 'DE'
): Promise<{ lat: number; lng: number; city: string }> {
  const response = await fetch(
    `${API_BASE}/geo/postal-code?code=${postalCode}&country=${country}`
  );
  return response.json();
}
```

---

## Component Implementation

### Main Locator Component (Astro)

```astro
---
// components/locator/Locator.astro
import './locator.css';
---

<div class="locator-container" id="planted-locator">
  <!-- Split View -->
  <div class="split-view" id="splitView">
    <div class="panel panel-restaurant" id="panelRestaurant">
      <!-- Content injected by React -->
    </div>
    <div class="panel panel-retail" id="panelRetail">
      <!-- Content injected by React -->
    </div>
  </div>

  <!-- ZIP Overlay -->
  <div class="zip-overlay" id="zipView">
    <!-- Content injected by React -->
  </div>

  <!-- Results Overlay -->
  <div class="results-overlay" id="resultsView">
    <!-- Content injected by React -->
  </div>
</div>

<script>
  import { gsap } from 'gsap';
  import { initLocator } from './locator-init';
  
  document.addEventListener('DOMContentLoaded', () => {
    initLocator();
  });
</script>
```

### React Split View Component

```tsx
// components/locator/SplitView.tsx
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import IconRestaurant from './IconRestaurant';
import IconRetail from './IconRetail';

interface SplitViewProps {
  onSelectPath: (path: 'restaurant' | 'retail') => void;
}

export default function SplitView({ onSelectPath }: SplitViewProps) {
  const restaurantRef = useRef<HTMLDivElement>(null);
  const retailRef = useRef<HTMLDivElement>(null);

  const handleHoverIn = (panel: 'restaurant' | 'retail') => {
    const activeRef = panel === 'restaurant' ? restaurantRef : retailRef;
    const otherRef = panel === 'restaurant' ? retailRef : restaurantRef;
    
    if (!activeRef.current || !otherRef.current) return;

    const icon = activeRef.current.querySelector('.icon-main');
    const glow1 = activeRef.current.querySelector('.icon-glow-1');
    const glow2 = activeRef.current.querySelector('.icon-glow-2');

    const tl = gsap.timeline();

    // Apple blur animation
    tl.to(icon, {
      filter: 'blur(12px)',
      scale: 1.25,
      duration: 0.15,
      ease: 'power2.out'
    }, 0);

    tl.to(icon, {
      filter: 'blur(0px)',
      scale: 1.15,
      rotation: -3,
      duration: 0.45,
      ease: 'power3.out'
    }, 0.15);

    tl.to([glow1, glow2], {
      opacity: 1,
      scale: 1.15,
      duration: 0.6,
      ease: 'power2.out'
    }, 0.1);

    // Panel expansion
    gsap.to(activeRef.current, {
      flex: 1.5,
      duration: 0.7,
      ease: 'power3.out'
    });

    gsap.to(otherRef.current, {
      flex: 0.5,
      duration: 0.7,
      ease: 'power3.out'
    });

    // Dim other panel
    gsap.to(otherRef.current.querySelector('.icon-main'), {
      opacity: 0.4,
      scale: 0.85,
      filter: 'blur(3px)',
      duration: 0.5
    });
  };

  const handleHoverOut = () => {
    gsap.to('.icon-main', {
      filter: 'blur(0px)',
      scale: 1,
      rotation: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out'
    });

    gsap.to(['.icon-glow-1', '.icon-glow-2'], {
      opacity: 0,
      scale: 0.8,
      duration: 0.5
    });

    gsap.to([restaurantRef.current, retailRef.current], {
      flex: 1,
      duration: 0.7,
      ease: 'power3.out'
    });
  };

  return (
    <>
      <div 
        ref={restaurantRef}
        className="panel panel-restaurant"
        onMouseEnter={() => handleHoverIn('restaurant')}
        onMouseLeave={handleHoverOut}
        onClick={() => onSelectPath('restaurant')}
      >
        <div className="panel-bg" />
        <div className="panel-content">
          <div className="icon-container">
            <div className="icon-glow-1" />
            <div className="icon-glow-2" />
            <IconRestaurant className="icon-main" />
          </div>
          <h2 className="panel-title">Lass es dir kochen</h2>
          <p className="panel-subtitle">
            8.000+ Restaurants servieren planted.<br />
            Jemand anderes macht die Arbeit.
          </p>
          <button className="panel-cta">
            Restaurants finden <span className="arrow">→</span>
          </button>
        </div>
      </div>

      <div 
        ref={retailRef}
        className="panel panel-retail"
        onMouseEnter={() => handleHoverIn('retail')}
        onMouseLeave={handleHoverOut}
        onClick={() => onSelectPath('retail')}
      >
        <div className="panel-bg" />
        <div className="panel-content">
          <div className="icon-container">
            <div className="icon-glow-1" />
            <div className="icon-glow-2" />
            <IconRetail className="icon-main" />
          </div>
          <h2 className="panel-title">Selber machen</h2>
          <p className="panel-subtitle">
            Pack auf. Pfanne. 6 Minuten.<br />
            So einfach ist das.
          </p>
          <button className="panel-cta">
            Laden finden <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </>
  );
}
```

### SVG Icon Components

```tsx
// components/locator/IconRestaurant.tsx
export default function IconRestaurant({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Plate */}
      <ellipse 
        cx="50" cy="72" rx="38" ry="10" 
        stroke="white" strokeWidth="2.5" 
        fill="none" opacity="0.9"
      />
      {/* Steak */}
      <ellipse cx="50" cy="55" rx="25" ry="12" fill="white" opacity="0.95"/>
      {/* Grill marks */}
      <line x1="35" y1="52" x2="50" y2="60" stroke="#7B2D8E" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="45" y1="48" x2="60" y2="56" stroke="#7B2D8E" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Steam */}
      <path d="M40 35 Q45 25, 40 15" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <path d="M55 32 Q60 22, 55 12" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      {/* Herb leaf */}
      <ellipse cx="70" cy="50" rx="8" ry="5" fill="#6BAB24" transform="rotate(30 70 50)"/>
    </svg>
  );
}
```

```tsx
// components/locator/IconRetail.tsx
export default function IconRetail({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bag */}
      <path 
        d="M25 35 L28 82 Q30 88, 50 88 Q70 88, 72 82 L75 35" 
        stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" opacity="0.9"
      />
      {/* Handle */}
      <path 
        d="M35 35 L35 25 Q35 15, 50 15 Q65 15, 65 25 L65 35" 
        stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"
      />
      {/* Purple packages inside */}
      <rect x="33" y="45" width="15" height="30" rx="3" fill="#7B2D8E"/>
      <rect x="52" y="42" width="15" height="33" rx="3" fill="#9B4DB0"/>
      {/* Leaf on top */}
      <ellipse cx="50" cy="22" rx="12" ry="6" fill="white" opacity="0.9" transform="rotate(-10 50 22)"/>
    </svg>
  );
}
```

---

## CSS Specifications

### Critical Animation Properties

```css
/* Hardware acceleration for smooth animations */
.icon-main,
.icon-glow-1,
.icon-glow-2,
.panel,
.panel-bg {
  will-change: transform, opacity, filter;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

/* Icon glow layers */
.icon-glow-1 {
  position: absolute;
  inset: -30px;
  background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 60%);
  border-radius: 50%;
  opacity: 0;
  filter: blur(25px);
  z-index: 1;
}

.icon-glow-2 {
  position: absolute;
  inset: -50px;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0;
  filter: blur(40px);
  z-index: 0;
}

/* Panel gradients */
.panel-restaurant .panel-bg {
  background: linear-gradient(165deg, #9B4DB0 0%, #7B2D8E 50%, #5C2269 100%);
}

.panel-retail .panel-bg {
  background: linear-gradient(165deg, #8BC53F 0%, #6BAB24 50%, #4a8a1a 100%);
}

/* Subtle noise texture */
.panel-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
}
```

### Glass Morphism for UI Elements

```css
.zip-back,
.zip-detect,
.results-back,
.results-change {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.15);
}
```

---

## Accessibility Considerations

1. **Keyboard Navigation**: All interactive elements must be focusable and operable with keyboard
2. **Screen Reader**: Add proper ARIA labels for icons and interactive elements
3. **Reduced Motion**: Respect `prefers-reduced-motion` media query
4. **Color Contrast**: Ensure text meets WCAG AA standards
5. **Focus Indicators**: Visible focus states for all interactive elements

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Performance Optimizations

1. **Lazy Load Results**: Only render visible cards, use virtualization for large lists
2. **Debounce ZIP Input**: Wait 300ms after user stops typing
3. **Cache API Responses**: Store results in memory/localStorage
4. **Preload Icons**: Include SVGs inline to avoid network requests
5. **GPU Acceleration**: Use `transform` and `opacity` for animations

---

## Testing Checklist

- [ ] Split view renders correctly on desktop (1920px+)
- [ ] Split view stacks vertically on mobile (<768px)
- [ ] Icon hover animations work smoothly (60fps)
- [ ] Panel expansion/contraction is smooth
- [ ] ZIP input validates correctly (4-5 digits for DE/CH)
- [ ] Geolocation permission request works
- [ ] Results load and display correctly
- [ ] Cards animate in with stagger effect
- [ ] Tab switching works (restaurant path only)
- [ ] Back navigation works from all states
- [ ] All external links open in new tab
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces state changes
- [ ] Works in Safari, Chrome, Firefox, Edge
- [ ] No layout shift during animations

---

## Deployment Notes

1. **Dependencies**: 
   - GSAP 3.12+ (CDN or npm)
   - React 18+ (for interactive components)
   - Astro 5.x (as page wrapper)

2. **Environment Variables**:
   ```
   PUBLIC_API_BASE=https://api.eatplanted.com/v1
   PUBLIC_MAPS_API_KEY=your_google_maps_key
   ```

3. **Analytics Events**:
   - `locator_view` - Initial page view
   - `locator_path_selected` - User clicks restaurant/retail
   - `locator_zip_submitted` - User submits ZIP
   - `locator_geolocation_used` - User uses location
   - `locator_result_clicked` - User clicks on a result
   - `locator_order_clicked` - User clicks order link

---

## Files Included

1. `planted-locator-final.html` - Complete standalone HTML with all functionality
2. `planted-icons-v2.html` - Icon reference and AI prompts
3. `icon-restaurant-steak.svg` - Restaurant icon (detailed)
4. `icon-retail-packaging.svg` - Retail icon (detailed)
5. `icon-restaurant-simple.svg` - Restaurant icon (simple)
6. `icon-retail-simple.svg` - Retail icon (simple)

---

## Quick Start

To test the locator immediately:

1. Open `planted-locator-final.html` in a browser
2. Hover over panels to see Apple-style animations
3. Click a panel to enter ZIP flow
4. Enter any 4+ digit ZIP code
5. View mock results

To integrate into eatplanted.com:

1. Extract CSS into `locator.css`
2. Convert HTML to Astro/React components
3. Replace mock data with API calls
4. Add analytics tracking
5. Test across browsers and devices
