# Website Review - Testing Manual

This document defines test cases for all Planted web properties. Execute these using Chrome DevTools MCP tools.

## Test Environment Setup

### Starting Debug Chrome
```bash
# Windows - Run once per session
scripts\chrome-debug.bat
```

### Starting Dev Servers
```bash
# Astro website (localhost:4321)
cd planted-astro && pnpm dev

# Admin Dashboard V2 (localhost:5175)
cd planted-availability-db/packages/admin-dashboard-v2 && pnpm dev
```

### Verify MCP Connection
Run `/mcp` in Claude Code - confirm `chrome-devtools` shows as connected.

---

# 1. Visual Inspection Tests

## VI-001: Screenshot Capture (All Pages)
**Applies To:** All target pages
**MCP Tools:** `navigate_page`, `resize_page`, `take_screenshot`, `wait_for`
**Steps:**
1. Navigate to target URL
2. Wait for main content to load (use appropriate selector)
3. Capture desktop screenshot (1440x900)
4. Resize to tablet (768x1024), capture
5. Resize to mobile (375x812), capture
**Expected Result:** Three screenshots showing responsive layout working correctly
**Pass Criteria:** No layout breaks, content visible at all sizes

## VI-002: DOM Snapshot
**MCP Tools:** `take_snapshot`
**Steps:**
1. Navigate to page
2. Capture DOM snapshot
**Expected Result:** Accessibility tree captured
**Pass Criteria:** Document structure is logical and complete

## VI-003: Image Loading Check
**MCP Tools:** `evaluate_script`
**Script:**
```javascript
Array.from(document.images).filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src)
```
**Expected Result:** Empty array (all images loaded)
**Pass Criteria:** No broken images

---

# 2. Console and Network Tests

## CN-001: JavaScript Error Check
**MCP Tools:** `list_console_messages`
**Steps:**
1. Navigate to page
2. Perform key interactions (scroll, click navigation)
3. List all console messages
**Expected Result:** No error-level messages
**Pass Criteria:**
- No uncaught exceptions
- No React/framework errors
- No undefined variable errors

## CN-002: Network Request Validation
**MCP Tools:** `list_network_requests`, `get_network_request`
**Steps:**
1. Clear network (refresh page)
2. List all requests after page load
3. Filter for failed requests (status 4xx, 5xx)
**Expected Result:** All requests succeed (2xx, 3xx)
**Pass Criteria:**
- No 404 errors for assets
- No 500 errors from API
- No CORS failures

## CN-003: API Response Time Check
**MCP Tools:** `list_network_requests`
**Steps:**
1. Filter for API/fetch requests
2. Check response times
**Expected Result:** API responses < 3000ms
**Pass Criteria:** No request takes longer than 3 seconds

---

# 3. Accessibility Tests (WCAG 2.1 AA)

## A11Y-001: Image Alt Text
**MCP Tools:** `evaluate_script`
**Script:**
```javascript
document.querySelectorAll('img:not([alt])').length
```
**Expected Result:** 0
**Pass Criteria:** All images have alt attributes

## A11Y-002: Form Labels
**MCP Tools:** `evaluate_script`
**Script:**
```javascript
Array.from(document.querySelectorAll('input, textarea, select'))
  .filter(el => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
  .map(el => ({ tag: el.tagName, type: el.type, name: el.name }))
```
**Expected Result:** Empty array
**Pass Criteria:** All form inputs have accessible labels

## A11Y-003: Heading Hierarchy
**MCP Tools:** `evaluate_script`
**Script:**
```javascript
Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({ level: h.tagName, text: h.textContent.substring(0, 50) }))
```
**Expected Result:** Logical heading hierarchy (h1 followed by h2, etc.)
**Pass Criteria:** No skipped heading levels

## A11Y-004: Keyboard Navigation
**MCP Tools:** `press_key`, `take_screenshot`
**Steps:**
1. Press Tab repeatedly to navigate through interactive elements
2. Verify focus indicator visible
3. Press Enter on links/buttons
**Expected Result:** All interactive elements reachable via keyboard
**Pass Criteria:**
- Focus ring visible on all focusable elements
- Tab order is logical
- Enter activates buttons/links

## A11Y-005: Touch Target Size
**MCP Tools:** `evaluate_script`
**Script:**
```javascript
Array.from(document.querySelectorAll('a, button, input, [role="button"]'))
  .filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  })
  .map(el => ({ tag: el.tagName, text: el.textContent?.substring(0, 30), width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }))
```
**Expected Result:** No elements smaller than 44x44px
**Pass Criteria:** All interactive elements meet minimum touch target

---

# 4. Performance Tests (Core Web Vitals)

## PERF-001: Page Load Performance
**MCP Tools:** `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`
**Steps:**
1. Start trace
2. Navigate to page (fresh load)
3. Wait for load complete
4. Stop trace
5. Analyze insights
**Expected Result:**
- LCP < 2.5s
- CLS < 0.1
**Pass Criteria:** Core Web Vitals in "good" range

## PERF-002: Interaction Response
**MCP Tools:** `performance_start_trace`, `click`, `performance_stop_trace`
**Steps:**
1. Start trace
2. Click interactive element (button, link)
3. Measure response time
4. Stop trace
**Expected Result:** INP < 200ms
**Pass Criteria:** Interactions feel instant

## PERF-003: Layout Stability
**MCP Tools:** `evaluate_script`
**Script:**
```javascript
new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    console.log('CLS:', entry.value);
  }
}).observe({ type: 'layout-shift', buffered: true });
```
**Expected Result:** No unexpected layout shifts
**Pass Criteria:** CLS < 0.1 cumulative

---

# 5. Interactive Tests

## INT-001: Navigation Links
**MCP Tools:** `click`, `wait_for`, `evaluate_script`
**Steps:**
1. Find all navigation links
2. Click each link
3. Verify page change
4. Go back
**Expected Result:** All navigation works
**Pass Criteria:** Each link navigates to correct destination

## INT-002: Form Submission
**MCP Tools:** `fill`, `fill_form`, `click`, `wait_for`
**Steps:**
1. Fill form fields
2. Click submit button
3. Wait for response
**Expected Result:** Form submits successfully
**Pass Criteria:** Success message or redirect occurs

## INT-003: Modal Dialogs
**MCP Tools:** `click`, `wait_for`, `press_key`
**Steps:**
1. Click element that opens modal
2. Verify modal appears
3. Press Escape to close
4. Verify modal closes
**Expected Result:** Modal opens and closes correctly
**Pass Criteria:** Focus trapped in modal, Escape closes

## INT-004: Dropdown/Select Interactions
**MCP Tools:** `click`, `evaluate_script`
**Steps:**
1. Click dropdown trigger
2. Verify options appear
3. Click an option
4. Verify selection applied
**Expected Result:** Dropdown works correctly
**Pass Criteria:** Selection persists after clicking option

---

# 6. Page-Specific Test Cases

## Planted Website (localhost:4321 / planted.com)

### PW-001: Homepage Hero
**Steps:** Navigate to `/`, verify hero loads with CTA buttons
**Expected:** Hero image loads, CTA buttons clickable

### PW-002: Product Grid
**Steps:** Navigate to `/products`, verify product cards display
**Expected:** Products load with images, cards hover correctly

### PW-003: Store Locator (LocatorV2)
**Steps:** Navigate to `/find`, interact with location search
**Expected:** Map renders, location results populate

### PW-004: Recipe Pages
**Steps:** Navigate to `/recipes`, click individual recipe
**Expected:** Recipe detail loads with ingredients, instructions

---

## Admin Dashboard V2 (localhost:5175 / admin.planted.com)

### AD-001: Login Flow
**Steps:** Navigate to login, complete Google OAuth (in debug Chrome)
**Expected:** Redirected to Review Queue after auth

### AD-002: Review Queue Load
**Steps:** Navigate to `/` (Review Queue)
**Expected:** Queue items load, first venue auto-selected

### AD-003: Venue Approval Flow
**Steps:** Select pending venue, click Approve
**Expected:** Venue status changes, moved to next item

### AD-004: Keyboard Navigation
**Steps:** Use j/k keys to navigate queue
**Expected:** Selection moves through venues

### AD-005: Filter Functionality
**Steps:** Apply status/chain/country filters
**Expected:** Queue filters correctly, reset button works

---

# Test Execution Checklist

When running a full review:

## Visual
- [ ] Desktop screenshot captured
- [ ] Tablet screenshot captured
- [ ] Mobile screenshot captured
- [ ] DOM snapshot captured
- [ ] All images loading

## Console/Network
- [ ] No JavaScript errors
- [ ] No failed network requests
- [ ] API response times acceptable

## Accessibility
- [ ] All images have alt text
- [ ] All forms have labels
- [ ] Heading hierarchy logical
- [ ] Keyboard navigation works
- [ ] Touch targets adequate

## Performance
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] INP < 200ms (if applicable)

## Interactive
- [ ] Navigation works
- [ ] Forms submit correctly
- [ ] Modals open/close
- [ ] Dropdowns function
