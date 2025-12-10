# Admin Dashboard - Testing Manual

This document defines use cases and test procedures for ALL admin dashboards in this project. Every feature must be tested against the relevant use cases before being marked complete.

**This is a living document** - Add new use cases as features are developed.

## Test Environment Setup

Replace `$DASHBOARD` with the target dashboard (e.g., `admin-dashboard-v2`):

```bash
# Start development server
cd planted-availability-db/packages/$DASHBOARD && pnpm dev

# Run automated tests
cd planted-availability-db/packages/$DASHBOARD && pnpm test

# Run tests with coverage
cd planted-availability-db/packages/$DASHBOARD && pnpm test:coverage

# Run specific test
cd planted-availability-db/packages/$DASHBOARD && pnpm test [test-file-path]
```

## Coverage Requirements

Check the dashboard's `vitest.config.ts` or `jest.config.js` for specific thresholds. Defaults:

- **Lines:** 95%
- **Branches:** 90%
- **Functions:** 95%
- **Statements:** 95%

## Adding New Use Cases

When implementing a new feature, add use cases following this format:

```markdown
## UC-[MODULE]-[NUMBER]: [Use Case Name]
**Preconditions:** [Setup required]
**Steps:**
1. Step 1
2. Step 2
**Expected Result:** [What should happen]
**Test Type:** [unit/integration/e2e/manual]
```

---

# 1. Authentication Module

## UC-AUTH-001: Google Sign-In
**Preconditions:** User is not authenticated, on login page
**Steps:**
1. Click "Sign in with Google" button
2. Complete Google OAuth flow
3. Observe redirect
**Expected Result:** User is redirected to Review Queue page, user info shown in header
**Test Type:** integration, manual

## UC-AUTH-002: Protected Route Redirect
**Preconditions:** User is not authenticated
**Steps:**
1. Navigate directly to `/` (Review Queue)
2. Navigate directly to `/live` (Live Website)
3. Navigate directly to `/stats` (Stats)
**Expected Result:** All routes redirect to `/login`
**Test Type:** unit, integration

## UC-AUTH-003: Sign Out
**Preconditions:** User is authenticated
**Steps:**
1. Click user menu in header
2. Click "Sign Out"
**Expected Result:** User is logged out and redirected to login page
**Test Type:** integration, manual

## UC-AUTH-004: Session Persistence
**Preconditions:** User is authenticated
**Steps:**
1. Refresh the browser
2. Close and reopen browser tab
**Expected Result:** User remains authenticated
**Test Type:** manual

## UC-AUTH-005: Public Route Redirect
**Preconditions:** User is authenticated
**Steps:**
1. Navigate to `/login`
**Expected Result:** User is redirected to `/` (Review Queue)
**Test Type:** unit, integration

---

# 2. Review Queue Module

## 2.1 Loading & Display

## UC-RQ-001: Initial Load
**Preconditions:** User is authenticated
**Steps:**
1. Navigate to Review Queue (`/`)
**Expected Result:**
- Loading spinner shown while fetching
- Queue items displayed after load
- First venue auto-selected
- Stats bar shows counts
**Test Type:** unit, integration

## UC-RQ-002: Empty State
**Preconditions:** No pending venues in queue
**Steps:**
1. Navigate to Review Queue
**Expected Result:** Empty state message displayed with "Reset Filters" action
**Test Type:** unit

## UC-RQ-003: Error State
**Preconditions:** API returns error
**Steps:**
1. Navigate to Review Queue with network error
**Expected Result:** Error state with retry button displayed
**Test Type:** unit

## UC-RQ-004: Auto-Refresh
**Preconditions:** User on Review Queue page
**Steps:**
1. Wait 5 minutes without interaction
**Expected Result:** Queue automatically refreshes without page reload
**Test Type:** integration

## UC-RQ-005: Manual Refresh
**Preconditions:** User on Review Queue page
**Steps:**
1. Click "Refresh" button in header
**Expected Result:** Queue data reloads, current selection preserved if still valid
**Test Type:** unit, integration

## 2.2 Navigation

## UC-RQ-010: Select Venue
**Preconditions:** Queue has multiple venues
**Steps:**
1. Click on different venue in hierarchy tree
**Expected Result:**
- Detail panel updates to show selected venue
- Dishes grid shows venue's dishes
- Approval buttons visible if status is pending
**Test Type:** unit, integration

## UC-RQ-011: Keyboard Navigation (j/k)
**Preconditions:** Queue has multiple venues, no dialog open
**Steps:**
1. Press `j` key
2. Press `k` key
**Expected Result:** Selection moves down (j) and up (k) through venues
**Test Type:** unit

## UC-RQ-012: Keyboard Navigation (arrows)
**Preconditions:** Queue has multiple venues
**Steps:**
1. Press `↓` key
2. Press `↑` key
**Expected Result:** Selection moves through venues
**Test Type:** unit

## UC-RQ-013: Expand/Collapse Tree
**Preconditions:** Queue has hierarchical data
**Steps:**
1. Click expand icon on chain/country node
2. Click collapse icon
3. Press `l` or `→` to expand
4. Press `h` or `←` to collapse
**Expected Result:** Tree nodes expand/collapse correctly
**Test Type:** unit

## 2.3 Filtering

## UC-RQ-020: Filter by Status
**Preconditions:** Queue has venues with different statuses
**Steps:**
1. Select "Pending" from status filter
2. Select "Approved" from status filter
3. Select "Rejected" from status filter
4. Select "All" from status filter
**Expected Result:** Queue shows only venues matching selected status
**Test Type:** unit, integration

## UC-RQ-021: Filter by Chain
**Preconditions:** Queue has venues from multiple chains
**Steps:**
1. Select a chain from chain filter dropdown
**Expected Result:** Only venues from selected chain displayed
**Test Type:** unit, integration

## UC-RQ-022: Filter by Country
**Preconditions:** Queue has venues from multiple countries
**Steps:**
1. Select a country from country filter
**Expected Result:** Only venues from selected country displayed
**Test Type:** unit, integration

## UC-RQ-023: Search by Name
**Preconditions:** Queue has venues
**Steps:**
1. Type venue name in search box
**Expected Result:** Queue filters to show matching venues
**Test Type:** unit, integration

## UC-RQ-024: Reset Filters
**Preconditions:** Filters are applied
**Steps:**
1. Click "Reset" button
**Expected Result:** All filters cleared, queue shows default view (pending)
**Test Type:** unit

## UC-RQ-025: Combined Filters
**Preconditions:** Queue has diverse venues
**Steps:**
1. Apply status filter
2. Apply chain filter
3. Apply search term
**Expected Result:** Filters combine with AND logic, only matching venues shown
**Test Type:** integration

## 2.4 Approval Workflow

## UC-RQ-030: Approve Venue
**Preconditions:** Pending venue selected
**Steps:**
1. Click "Approve" button (or press `a`)
**Expected Result:**
- Venue status changes to approved
- Venue removed from pending queue
- Next venue auto-selected
- Stats bar updates
**Test Type:** unit, integration

## UC-RQ-031: Partial Approve
**Preconditions:** Pending venue selected
**Steps:**
1. Click "Partial" button (or press `e`)
2. Select feedback tags
3. Enter additional feedback text
4. Click "Submit"
**Expected Result:**
- Dialog opens for feedback
- After submit, venue marked as partial
- Feedback saved with venue
- Venue removed from queue
**Test Type:** unit, integration

## UC-RQ-032: Reject Venue
**Preconditions:** Pending venue selected
**Steps:**
1. Click "Reject" button (or press `r`)
2. Select rejection reason tags
3. Enter additional reason text
4. Click "Submit"
**Expected Result:**
- Dialog opens for reason
- After submit, venue marked as rejected
- Reason saved with venue
- Venue removed from queue
**Test Type:** unit, integration

## UC-RQ-033: Cancel Partial/Reject Dialog
**Preconditions:** Partial or Reject dialog is open
**Steps:**
1. Click "Cancel" button
2. Or click outside dialog
3. Or press Escape key
**Expected Result:** Dialog closes, no changes made
**Test Type:** unit

## UC-RQ-034: Approve Loading State
**Preconditions:** Approving a venue
**Steps:**
1. Click approve and observe
**Expected Result:** Button shows loading spinner, disabled during request
**Test Type:** unit

## 2.5 Bulk Actions

## UC-RQ-040: Select Multiple Venues
**Preconditions:** Queue has multiple venues
**Steps:**
1. Check checkbox on venue 1
2. Check checkbox on venue 2
3. Check checkbox on venue 3
**Expected Result:** Bulk action bar appears with count
**Test Type:** unit

## UC-RQ-041: Bulk Approve
**Preconditions:** Multiple venues selected
**Steps:**
1. Click "Approve All" in bulk action bar
**Expected Result:** All selected venues approved, selection cleared
**Test Type:** unit, integration

## UC-RQ-042: Bulk Reject
**Preconditions:** Multiple venues selected
**Steps:**
1. Click "Reject All" in bulk action bar
2. Enter rejection reason
3. Submit
**Expected Result:** All selected venues rejected with reason, selection cleared
**Test Type:** unit, integration

## UC-RQ-043: Clear Selection
**Preconditions:** Venues selected
**Steps:**
1. Click "Clear Selection" in bulk action bar
**Expected Result:** All venues deselected, bulk action bar hidden
**Test Type:** unit

## 2.6 Venue Details

## UC-RQ-050: View Venue Information
**Preconditions:** Venue selected
**Steps:**
1. Observe venue detail panel
**Expected Result:** Shows name, address, chain, country, source URL, discovery date
**Test Type:** unit

## UC-RQ-051: View Dishes
**Preconditions:** Venue with dishes selected
**Steps:**
1. Observe dishes grid
**Expected Result:** All venue dishes displayed with names, descriptions, prices
**Test Type:** unit

## UC-RQ-052: Assign to Chain
**Preconditions:** Venue selected
**Steps:**
1. Click "Assign Chain" button
2. Search for chain
3. Select chain
4. Confirm
**Expected Result:** Venue associated with selected chain
**Test Type:** unit, integration

## 2.7 Keyboard Shortcuts

## UC-RQ-060: Help Dialog
**Preconditions:** No dialog open
**Steps:**
1. Press `?` key
**Expected Result:** Keyboard shortcuts help dialog opens
**Test Type:** unit

## UC-RQ-061: Shortcuts Disabled in Input
**Preconditions:** Focus in text input/textarea
**Steps:**
1. Type `a`, `r`, `e`, `j`, `k`
**Expected Result:** Characters typed normally, no actions triggered
**Test Type:** unit

## UC-RQ-062: Shortcuts Disabled During Dialog
**Preconditions:** Any dialog open
**Steps:**
1. Press shortcut keys
**Expected Result:** No actions triggered
**Test Type:** unit

---

# 3. Live Website Module

## UC-LW-001: View Published Venues
**Preconditions:** User authenticated, on Live Website tab
**Steps:**
1. Navigate to `/live`
**Expected Result:** List of published venues displayed
**Test Type:** unit, integration

## UC-LW-002: Search Published Venues
**Preconditions:** On Live Website page
**Steps:**
1. Enter search term
**Expected Result:** Results filtered to matching venues
**Test Type:** unit, integration

## UC-LW-003: Sync Preview
**Preconditions:** Approved venues waiting to sync
**Steps:**
1. Click "Preview Sync"
**Expected Result:** Shows diff of what will be synced
**Test Type:** unit, integration

## UC-LW-004: Execute Sync
**Preconditions:** Sync preview shown
**Steps:**
1. Click "Sync Now"
2. Confirm
**Expected Result:** Venues synced to production, progress shown
**Test Type:** integration, manual

## UC-LW-005: Sync History
**Preconditions:** Previous syncs have occurred
**Steps:**
1. View sync history section
**Expected Result:** List of past syncs with dates, counts, status
**Test Type:** unit

---

# 4. Stats Module

## UC-ST-001: View Budget Status
**Preconditions:** User authenticated, on Stats tab
**Steps:**
1. Navigate to `/stats`
**Expected Result:** Current budget usage displayed (API calls, costs)
**Test Type:** unit, integration

## UC-ST-002: View Discovery Stats
**Preconditions:** On Stats page
**Steps:**
1. Observe discovery statistics
**Expected Result:** Shows venues discovered, success rate, by strategy
**Test Type:** unit, integration

## UC-ST-003: View Strategy Performance
**Preconditions:** On Stats page
**Steps:**
1. View strategy breakdown
**Expected Result:** Performance metrics per discovery strategy shown
**Test Type:** unit, integration

---

# 5. Layout & Navigation

## UC-NAV-001: Tab Navigation
**Preconditions:** User authenticated
**Steps:**
1. Click "Review Queue" tab
2. Click "Live Website" tab
3. Click "Stats" tab
**Expected Result:** Correct page content loads, tab highlighted
**Test Type:** unit

## UC-NAV-002: Active Tab Indicator
**Preconditions:** On any page
**Steps:**
1. Observe tab bar
**Expected Result:** Current page's tab is visually highlighted
**Test Type:** unit

## UC-NAV-003: Mobile Responsive
**Preconditions:** View on mobile viewport
**Steps:**
1. Resize browser to mobile width
2. Navigate between pages
**Expected Result:** Layout adapts, all functionality accessible
**Test Type:** manual

## UC-NAV-004: 404 Handling
**Preconditions:** User authenticated
**Steps:**
1. Navigate to `/nonexistent-route`
**Expected Result:** Redirected to Review Queue (catch-all route)
**Test Type:** unit

---

# 6. Shared Components

## UC-SC-001: Loading State
**Preconditions:** Data is loading
**Steps:**
1. Trigger any loading operation
**Expected Result:** Loading spinner with message displayed
**Test Type:** unit

## UC-SC-002: Error State
**Preconditions:** Error has occurred
**Steps:**
1. Trigger error (e.g., network failure)
**Expected Result:** Error message with retry button displayed
**Test Type:** unit

## UC-SC-003: Empty State
**Preconditions:** No data available
**Steps:**
1. View page with no data
**Expected Result:** Helpful empty state message with action if applicable
**Test Type:** unit

## UC-SC-004: Dialog Close on Escape
**Preconditions:** Any dialog open
**Steps:**
1. Press Escape key
**Expected Result:** Dialog closes
**Test Type:** unit

## UC-SC-005: Dialog Close on Outside Click
**Preconditions:** Any dialog open
**Steps:**
1. Click outside dialog
**Expected Result:** Dialog closes
**Test Type:** unit

---

# 7. Error Handling

## UC-ERR-001: API Error Display
**Preconditions:** API returns error response
**Steps:**
1. Trigger API call that fails
**Expected Result:** User-friendly error message displayed, not raw error
**Test Type:** unit, integration

## UC-ERR-002: Network Timeout
**Preconditions:** Slow/no network
**Steps:**
1. Perform action with network disconnected
**Expected Result:** Timeout error shown with retry option
**Test Type:** manual

## UC-ERR-003: Error Boundary
**Preconditions:** Component throws error
**Steps:**
1. Trigger runtime error in component
**Expected Result:** Error boundary catches, shows fallback UI
**Test Type:** unit

---

# Test Execution Checklist

When completing a feature, run through this checklist:

## Automated Tests
- [ ] `pnpm test` passes with no failures
- [ ] Coverage meets thresholds (95%/90%/95%/95%)
- [ ] No TypeScript errors (`pnpm build` succeeds)
- [ ] No ESLint errors (`pnpm lint` passes)

## Manual Verification (for UI changes)
- [ ] Visual appearance matches design
- [ ] Responsive on mobile viewports
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Loading states shown appropriately
- [ ] Error states handled gracefully
- [ ] Console has no errors/warnings

## Regression Tests
After bug fixes, run ALL related use cases to ensure no regressions.
