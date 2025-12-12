---
argument-hint: <url>
---

# Website Review Command

Perform a comprehensive QA review of the specified URL using Chrome DevTools MCP.

## Arguments

`$ARGUMENTS` - The URL to review. Can be:
- `local` or `astro` - Reviews http://localhost:4321 (Astro dev server)
- `admin` or `dashboard` - Reviews http://localhost:5175 (Admin Dashboard V2)
- `prod` or `planted.com` - Reviews https://planted.com (production website)
- `admin-prod` - Reviews https://admin.planted.com (requires prior auth)
- Any full URL - Reviews that specific URL

## Prerequisites Check

Before starting the review, verify:

1. **Chrome debug instance running on port 9222**
   - If not running, display: "Start Chrome debug mode first: `scripts\chrome-debug.bat`"

2. **MCP server connected**
   - Check `/mcp` shows `chrome-devtools`
   - If not connected: "Restart Claude Code to load MCP servers"

3. **Dev server running (for local URLs)**
   - Astro: `cd planted-astro && pnpm dev`
   - Admin: `cd planted-availability-db/packages/admin-dashboard-v2 && pnpm dev`

## Review Workflow

Execute the `website-review` skill workflow:

### Phase 1: Navigate and Screenshot
1. Navigate to target URL using `navigate_page`
2. Wait for page load using `wait_for`
3. Capture desktop screenshot (1440x900)
4. Resize to tablet (768x1024), screenshot
5. Resize to mobile (375x812), screenshot

### Phase 2: Console/Network Check
1. `list_console_messages()` - check for errors
2. `list_network_requests()` - check for failures (4xx, 5xx)

### Phase 3: Accessibility Check
Run accessibility scripts via `evaluate_script`:
- Check missing alt text
- Check form labels
- Check heading hierarchy
- Check touch target sizes

### Phase 4: Performance (if requested)
1. `performance_start_trace()`
2. Navigate/interact
3. `performance_stop_trace()`
4. `performance_analyze_insight()`

### Phase 5: Interactive Tests
- Test key navigation links
- Test forms (if present)
- Test modals/dropdowns (if present)

### Phase 6: Generate Report
Use `TEST-REPORT-TEMPLATE.md` format:
- Include all screenshots
- List all errors found
- Provide severity ratings
- Give actionable recommendations

## Quick Reference

```bash
# Review local Astro site
/review-website local

# Review Admin Dashboard
/review-website admin

# Review production
/review-website prod

# Review production admin (login first in debug Chrome!)
/review-website admin-prod

# Review specific URL
/review-website https://planted.com/products
```

## URL Resolution

| Argument | Resolved URL |
|----------|--------------|
| `local`, `astro` | http://localhost:4321 |
| `admin`, `dashboard` | http://localhost:5175 |
| `prod`, `planted.com` | https://planted.com |
| `admin-prod` | https://admin.planted.com |
| Full URL | Use as-is |

## Important Notes

- For `admin-prod`, complete Google OAuth login in the debug Chrome window first
- Dev servers must be running before reviewing local URLs
- Full reviews include all phases; quick reviews skip performance tracing
- Review reports are generated using the TEST-REPORT-TEMPLATE.md format

## Related Documentation

- `.claude/skills/website-review/SKILL.md` - Full workflow details
- `.claude/skills/website-review/TESTING-MANUAL.md` - Test case definitions
- `.claude/skills/website-review/AUTH-SETUP.md` - Production auth setup
