# Admin Dashboard v2 - User Guide

Welcome to the Admin Dashboard v2! This guide will help you navigate and use all features of the venue approval and management system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Approve Queue (Main Page)](#approve-queue-main-page)
3. [Live Website Page](#live-website-page)
4. [Stats Page](#stats-page)
5. [Keyboard Shortcuts Reference](#keyboard-shortcuts-reference)

---

## Getting Started

### Login

1. Navigate to the admin dashboard at [https://get-planted-db.web.app](https://get-planted-db.web.app)
2. Click **"Sign in with Google"** to authenticate using your Google account
3. You'll be redirected to the main dashboard after successful authentication

### Dashboard Overview

The dashboard consists of three main tabs:

- **Approve Queue** (/) - Review and approve discovered venues
- **Live Website** (/live) - View pending sync changes and publish to website
- **Stats** (/stats) - Monitor budget, queue metrics, and strategy performance

---

## Approve Queue (Main Page)

The Approve Queue is the main workflow for reviewing venues discovered by the scraping agents. This page uses a hierarchical tree structure to organize venues and a split-panel layout for efficient review.

### Layout

The page is divided into two main sections:

1. **Left Panel**: Hierarchical tree view of all venues in the queue
2. **Right Panel**: Detailed view of the selected venue, including dishes and approval actions

### Navigating the Hierarchy Tree

Venues are organized in a four-level hierarchy:

```
Country (e.g., GB, US, DE)
└── Venue Type (e.g., restaurant, cafe)
    └── Chain (e.g., "Wagamama", "Independent")
        └── Individual Venues
```

**Navigation:**
- Click on any node to expand/collapse it
- Click on a venue name to view its details in the right panel
- Use keyboard shortcuts for faster navigation (see below)

**Visual Indicators:**
- Each node shows a badge with the count of items it contains
- Country nodes display flag emojis
- Venue Type nodes show 🏪
- Chain nodes show 🔗
- Individual venues show 📍

### Reviewing Venue Details

When you select a venue, the right panel displays:

1. **Venue Information**
   - Name and address
   - Google Places ID (if available)
   - Discovery metadata (source platform, timestamp)
   - Confidence scores
   - Chain assignment (if applicable)

2. **Dish List**
   - Grid of all dishes found at the venue
   - Each dish shows:
     - Name and description
     - Price (if available)
     - Product category
     - Confidence score
     - Image (if available)

3. **Approval Actions**
   - Four buttons for different actions (see below)

### Approval Actions

#### 1. Approve All
- **Shortcut:** Press `a`
- **Action:** Approves the venue and all its dishes
- **Use when:** The venue and all dishes look correct and complete
- **Effect:** Venue moves to "verified" status and becomes ready for sync to website

#### 2. Partial Approve
- **Shortcut:** Press `e`
- **Action:** Opens a dialog to approve with feedback
- **Use when:** The venue is mostly correct but has minor issues or could be improved
- **Feedback Form:**
  - Select issue tags (e.g., "Incomplete dishes", "Wrong location", "Pricing issues")
  - Add detailed feedback notes
  - This feedback trains the AI agents to improve future discoveries

#### 3. Reject
- **Shortcut:** Press `r`
- **Action:** Opens a dialog to reject with reason
- **Use when:** The venue is incorrect, duplicate, or doesn't meet quality standards
- **Rejection Form:**
  - Select reason tags (e.g., "Not a venue", "Duplicate", "No vegan options")
  - Add detailed reason notes
  - This helps the system learn to avoid similar mistakes

#### 4. Flag (Priority)
- **Action:** Flags the venue for special handling
- **Use cases:**
  - Dish extraction needed
  - Re-verification required
  - Priority review

### Filtering Venues

Use the **Filter Bar** at the top to narrow down the queue:

- **Status Filter:**
  - Pending (default)
  - Verified
  - Rejected
  - Promoted

- **Country Filter:** Filter by specific country (GB, US, DE, etc.)

- **Search:** Search by venue name or location

- **Date Range:** Filter by discovery date

**Reset Filters:** Click the "Reset" button to clear all filters

### Stats Bar

The Stats Bar shows real-time metrics:
- **Pending:** Venues awaiting review
- **Verified:** Approved venues ready for sync
- **Rejected:** Venues that didn't meet quality standards
- **Promoted:** Venues published to the live website

Additional breakdowns:
- **By Country:** Distribution across countries
- **Flagged:** Venues marked for priority handling

### Chain Assignment

Some venues need to be assigned to a chain for better organization:

1. Click **"Assign Chain"** in the venue detail panel
2. Search for an existing chain or create a new one
3. The venue will be grouped with other venues in the same chain
4. This helps with bulk operations and hierarchy organization

### Bulk Actions

To approve or reject multiple venues at once:

1. Select multiple venues using the tree view (with Shift+Click or Ctrl+Click)
2. A **Bulk Actions Bar** appears at the bottom of the screen
3. Click **"Approve All"** or **"Reject All"**
4. For bulk reject, provide a reason that applies to all selected venues

### Auto-Refresh

The queue automatically refreshes every 5 minutes to show new discoveries. You can also manually refresh using the **Refresh** button in the top-right corner.

---

## Live Website Page

The Live Website page manages what gets published to the public Planted website. This is where approved venues are synced to make them visible to users.

### Overview

This page shows:
- Pending changes ready to be synced
- Last sync information
- Success/failure rates
- Link to view the live website

### Understanding Pending Changes

Pending changes are organized into three categories:

#### 1. New Additions (Green)
- Newly approved venues that haven't been published yet
- Shows venue name and number of dishes
- These venues will appear on the website for the first time

#### 2. Updates (Yellow)
- Existing venues with updated information
- Shows which fields changed (e.g., new dishes, updated hours)
- Updates existing entries on the website

#### 3. Removals (Red)
- Venues marked for removal from the website
- Usually because they closed or no longer serve vegan options
- Will be deleted from the live site

### Stats Cards

At the top of the page, you'll see:
- **Pending Sync:** Total number of changes waiting
- **New Additions:** Count of new venues to add
- **Updates:** Count of venues to update
- **Removals:** Count of venues to remove

### Executing a Sync

To publish changes to the live website:

1. Review the pending changes list
2. Click **"Sync All"** in the top-right corner
3. Confirm the action in the dialog
4. Wait for the sync to complete (usually 10-30 seconds)
5. You'll see a success message with the number of items synced

**Note:** Sync operations are logged and can be reviewed in the sync history.

### Last Sync Information

The page displays:
- **Last synced:** Timestamp of the most recent sync
- **Success rate:** Percentage of successful syncs
- **Total syncs:** Total number of sync operations performed

### Refreshing the Preview

Click the **Refresh** button to reload pending changes. This is useful if:
- New venues were just approved
- You want to verify changes before syncing
- You're checking if a manual database change appears

### View Live Website

At the bottom of the page, there's a link to **"View Live Website"** that opens the public Planted website in a new tab. Use this to verify that synced changes appear correctly.

---

## Stats Page

The Stats page provides insights into system performance, budget usage, and AI learning metrics.

### Budget Monitoring

The top-left card shows API cost tracking:

#### Budget Overview
- **Daily Usage:** Current day's spending vs. daily limit
- **Monthly Usage:** Current month's spending vs. monthly limit
- **Progress Bars:** Visual indication of budget consumption
- **Status Indicators:**
  - Green: Under 70% of budget
  - Yellow: 70-90% of budget
  - Red: Over 90% of budget

#### Cost Breakdown
- **OpenAI Costs:** GPT and embedding API calls
- **Google Places Costs:** Place searches and details
- **Other Costs:** Miscellaneous API usage

**Warning:** If you see red indicators, budget limits may be reached soon, which will pause automated scraping.

### Queue Status

The top-right card shows current queue statistics:

- **Pending Review:** Venues waiting for approval
- **Verified:** Approved venues ready for sync
- **Rejected:** Venues that didn't pass review
- **Promoted:** Venues published to the website

#### Flagged Stats
- **Dish Extraction:** Venues needing detailed dish information
- **Re-verification:** Venues requiring another review

#### By Country
Distribution of venues across different countries (GB, US, DE, etc.)

### Strategy Learning Performance

This section tracks the performance of AI discovery strategies using reinforcement learning.

#### Overview Metrics

- **Avg Success Rate:** Overall success rate of discovery strategies
- **Total Uses:** How many times strategies have been executed
- **Discoveries:** Total number of venues successfully discovered
- **False Positives:** Venues incorrectly identified as having vegan options

#### Strategy Tiers

Strategies are categorized by success rate:

- **High (70%+):** Well-performing strategies (Green)
- **Medium (40-69%):** Average performers (Yellow)
- **Low (<40%):** Underperforming strategies (Red)
- **Untested:** New strategies without enough data (Gray)

#### Top Performing Strategies

Shows the 5 best-performing discovery strategies:
- **Query Template:** The search pattern used
- **Platform:** Search engine or platform (Google, Bing, etc.)
- **Country:** Target country
- **Success Rate:** Percentage of valid discoveries
- **Total Uses:** Number of times executed

**Example:**
```
"vegan restaurant in {location}" | Google | GB | 85% | 1,234 uses
```

#### Struggling Strategies

Shows the 5 lowest-performing strategies that need attention:
- These may need to be deprecated or refined
- Shows false positive counts to identify problem patterns
- Helps prioritize strategy improvements

#### Strategy Origins

Distribution of where strategies came from:
- **Seed:** Initial hand-crafted strategies
- **Evolved:** Strategies created by evolutionary algorithms
- **Manual:** Manually added by operators
- **Agent:** AI-generated strategies

### Summary Bar

At the bottom:
- **Active Strategies:** Currently in use
- **Deprecated:** Disabled due to poor performance
- **Recently Used (7d):** Strategies executed in the last week
- **Total Venues in Queue:** Overall queue size

---

## Keyboard Shortcuts Reference

Keyboard shortcuts make reviewing venues faster and more efficient. These shortcuts work when the review queue is focused (not typing in a text field).

### Navigation

| Shortcut | Action | Description |
|----------|--------|-------------|
| `j` or `↓` | Navigate Down | Move to the next item in the tree |
| `k` or `↑` | Navigate Up | Move to the previous item in the tree |
| `l` or `→` | Expand Node | Expand the currently focused node |
| `h` or `←` | Collapse Node | Collapse the currently focused node |
| `Enter` | Select/Toggle | Select a venue or toggle node expansion |

### Approval Actions

| Shortcut | Action | Description |
|----------|--------|-------------|
| `a` | Approve | Approve the currently selected venue |
| `r` | Reject | Open reject dialog for current venue |
| `e` | Partial Approve | Open partial approval dialog (edit) |

### Help

| Shortcut | Action | Description |
|----------|--------|-------------|
| `?` | Show Help | Display the keyboard shortcuts help dialog |

### Tips for Efficient Review

1. **Use Vim-style navigation** (`h`, `j`, `k`, `l`) for faster tree traversal without moving your hand to arrow keys
2. **Chain shortcuts:** Navigate with `j`/`k`, then immediately use `a`/`r`/`e` for actions
3. **Focus the tree:** Click on the hierarchy tree panel to ensure shortcuts are active
4. **Learn the flow:** Most efficient pattern is `j` (next) → `a` (approve) → `j` (next) → `a` (approve)

### When Shortcuts Don't Work

Shortcuts are disabled when:
- You're typing in a text input, textarea, or select field
- A dialog is open (rejection/feedback forms)
- The browser focus is outside the dashboard

**To re-enable:** Click on the hierarchy tree or anywhere in the main content area.

---

## Tips & Best Practices

### Reviewing Venues Efficiently

1. **Start with the hierarchy:** Use the tree to get a sense of what's in the queue
2. **Review by country:** Filter to one country at a time for context
3. **Check chain assignments:** Independent venues vs. chains require different scrutiny
4. **Validate dishes carefully:** Ensure dishes are actually vegan and prices are reasonable
5. **Use partial approve liberally:** Provide feedback even for minor issues to improve AI

### Providing Good Feedback

When using Partial Approve or Reject:

**Be Specific:**
- Bad: "Wrong"
- Good: "Location is incorrect - this venue is actually 2 miles south"

**Use Tags:**
- Select relevant issue tags to help categorize problems
- Tags enable pattern recognition in the AI system

**Explain the Issue:**
- Why is it wrong?
- What should it be instead?
- How could the system detect this in the future?

### Managing Your Workflow

1. **Review in batches:** Process 20-30 venues per session
2. **Use bulk actions:** When you see multiple similar issues, bulk reject/approve
3. **Monitor the stats:** Keep an eye on approval rates and budget usage
4. **Sync regularly:** Don't let the verified queue get too large - sync often
5. **Check the live site:** Periodically verify that synced venues appear correctly

### Troubleshooting

**Venue won't load:**
- Try refreshing the page
- Check your internet connection
- Ensure you're still authenticated (check for redirect to login)

**Approval action fails:**
- Wait a moment and try again
- Check the browser console for error messages
- Verify you have the required permissions

**Sync not working:**
- Ensure you have items in the pending sync list
- Check for any error messages in the dialog
- Try refreshing and syncing again

**Keyboard shortcuts not responding:**
- Click on the hierarchy tree to focus it
- Make sure no dialogs are open
- Check that you're not in an input field

---

## Additional Resources

- **Technical Documentation:** See `TECHNICAL-DOCUMENTATION.md` for API details and architecture
- **Quick Start Guide:** See `QUICKSTART.md` for developer setup
- **Testing Protocol:** See `TESTING-PROTOCOL.md` for QA procedures

For issues or feature requests, contact the development team or file an issue in the repository.

---

**Last Updated:** 2025-12-10
