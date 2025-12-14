# Attack Zero v2: Master Agent + Sub-Agent Architecture

## Objective
Achieve 100% data quality for venues and dishes through a coordinated multi-agent system that:
- Automates scraping/processing
- Manually verifies results via Chrome DevTools
- Fixes bugs iteratively
- Never runs out of context (delegates work efficiently)

## Verification Endpoints
- **Admin Dashboard:** https://get-planted-db.web.app/live-venues
- **Website Locator:** https://cgjen-box.github.io/planted-website/ch-de/locator-v3/

## Files
- `attackZero.md` - This plan
- `attackZeroProgress.md` - Progress log with Task Queue, session logs, checkpoints
- `.claude/commands/attack-zero*.md` - Agent slash commands

---

## Agent Architecture

```
                         ┌─────────────────────┐
                         │    MASTER-AGENT     │
                         │ (Coordinator/Router)│
                         │ Context: ~2K tokens │
                         └──────────┬──────────┘
                                    │
        ┌───────────┬───────────────┼───────────────┬───────────┐
        │           │               │               │           │
   ┌────▼────┐ ┌────▼────┐   ┌──────▼─────┐  ┌─────▼────┐ ┌────▼─────┐
   │ VENUE   │ │  DISH   │   │  SCRAPER   │  │   QA     │ │ MONITOR  │
   │ AGENT   │ │  AGENT  │   │   AGENT    │  │  AGENT   │ │  AGENT   │
   └────┬────┘ └────┬────┘   └──────┬─────┘  └─────┬────┘ └────┬─────┘
        │           │               │               │           │
        └───────────┴───────────────┴───────────────┴───────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │     attackZeroProgress.md     │
                    │     (Shared Progress Log)     │
                    └───────────────────────────────┘
```

---

## Slash Commands

| Command | Agent | Purpose |
|---------|-------|---------|
| `/attack-zero master` | MASTER | Coordinate next priority task |
| `/attack-zero venue --task=<task>` | VENUE | Fix duplicates, country codes, venue linking |
| `/attack-zero dish --task=<task>` | DISH | Extract, validate, sync dishes |
| `/attack-zero scraper --task=<task>` | SCRAPER | Fix extraction bugs |
| `/attack-zero qa --task=<task>` | QA | Visual verification via Chrome DevTools |
| `/attack-zero monitor --task=<task>` | MONITOR | Progress summaries and trends |

---

## Agent Responsibilities

### MASTER-AGENT (Coordinator)
- Reads last 50 lines of `attackZeroProgress.md`
- Determines next priority task from Task Queue
- Spawns appropriate sub-agent
- Performs random 10% spot-checks
- **NEVER performs actual fixes** (only coordinates)

### VENUE-AGENT (Venue Specialist)
| Task | Description |
|------|-------------|
| `duplicates` | Merge duplicate venues (keep one with most dishes) |
| `country-fix` | Fix FR -> DE/AT misclassifications |
| `normalize` | Standardize venue names and addresses |
| `link` | Connect discovered_venues to production venues |

### DISH-AGENT (Dish Specialist)
| Task | Description |
|------|-------------|
| `extract` | Extract dishes from venues with 0 dishes |
| `validate` | Check dish fields (name, price, currency, photo) |
| `sync` | Sync embedded dishes to production `dishes` collection |
| `dedupe` | Remove duplicate dishes within venues |

### SCRAPER-AGENT (Bug Fixer)
| Task | Description |
|------|-------------|
| `debug` | Investigate extraction failures |
| `fix-adapter` | Fix platform-specific issues |
| `fix-url` | Handle URL pattern edge cases |
| `fix-query` | Improve discovery search queries |

### QA-AGENT (Visual Verifier)
| Task | Description |
|------|-------------|
| `verify-venue` | Check venue in Admin Dashboard |
| `verify-locator` | Check venue on Website Locator map |
| `spot-check` | Random verification of sub-agent work |

### MONITOR-AGENT (Progress Tracker)
| Task | Description |
|------|-------------|
| `summary` | Generate current metrics |
| `trends` | Week-over-week changes |
| `alert` | Flag regressions |

---

## Context Management

### Why This Works
1. **MASTER stays minimal** (~2K tokens) - only reads, routes, delegates
2. **Sub-agents are single-task** - complete task, log, exit
3. **Progress file is the memory** - all state persisted
4. **Checkpoints enable recovery** - any agent can resume

### Handoff Protocol
```
MASTER reads progress → picks task → spawns agent
SUB-AGENT completes task → logs to progress → exits
MASTER reads progress → confirms → picks next task
```

---

## Quality Assurance

### Random Spot-Checks
- Every 10th completed task triggers QA-AGENT
- CRITICAL priority tasks always verified
- Uses `website-review` skill (Chrome DevTools MCP)

### Verification Process
1. Navigate to Admin Dashboard
2. Search for venue by name
3. Verify data matches expected
4. Check for console errors
5. Take screenshot as evidence

---

## Success Criteria

| Agent | Target |
|-------|--------|
| VENUE-AGENT | 0 duplicates, 0 country errors |
| DISH-AGENT | 90%+ venues have dishes |
| SCRAPER-AGENT | All known bugs fixed |
| QA-AGENT | 100% spot-check pass rate |
| **Overall** | 90%+ venues with dishes, 0 duplicates, 0 errors |

---

## Getting Started

### Prerequisites
1. Chrome in debug mode: `scripts\chrome-debug.bat`
2. MCP connected (check with `/mcp`)

### First Run
```bash
/attack-zero master
```

The MASTER-AGENT will:
1. Read current state from attackZeroProgress.md
2. Identify highest priority task (likely T001: Vapiano duplicates)
3. Spawn VENUE-AGENT to fix it
4. Log results and continue to next task

---

## Current State (from attackZeroProgress.md)

| Metric | Count | Target |
|--------|-------|--------|
| Total venues | 2246 | - |
| With dishes | 216 (9.6%) | 90% |
| Duplicates pending | ~45 | 0 |
| Country errors | 9 | 0 |

### Task Queue
- T001: Vapiano UK duplicates (HIGH)
- T002: Rice Up! Bern duplicates (HIGH)
- T003: Country code fixes (MEDIUM)
- T004: dean&david DE extraction (HIGH)
- T005: CH promoted venues extraction (HIGH)
