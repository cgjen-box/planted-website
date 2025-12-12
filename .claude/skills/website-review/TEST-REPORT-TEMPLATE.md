# Website Review Report Template

Copy this template when generating review reports.

---

## Website Review Report: [Site Name]

**Date:** YYYY-MM-DD
**Reviewer:** Claude AI (using Chrome DevTools MCP)
**Target URL:** [URL reviewed]
**Environment:** [local-dev / staging / production]

---

### Executive Summary

**Overall Status:** PASS / PASS WITH WARNINGS / FAIL

| Category | Status | Issues Found |
|----------|--------|--------------|
| Visual Inspection | PASS/FAIL | X issues |
| Console/Network | PASS/FAIL | X issues |
| Accessibility | PASS/FAIL | X issues |
| Performance | PASS/FAIL | X issues |
| Interactive Tests | PASS/FAIL | X issues |

---

### 1. Visual Inspection

#### Screenshots

| Viewport | Size | Status | Notes |
|----------|------|--------|-------|
| Desktop | 1440x900 | PASS/FAIL | |
| Tablet | 768x1024 | PASS/FAIL | |
| Mobile | 375x812 | PASS/FAIL | |

**Screenshot Locations:**
- Desktop: [attached/path]
- Tablet: [attached/path]
- Mobile: [attached/path]

#### Visual Issues Found

| Issue | Severity | Element | Description |
|-------|----------|---------|-------------|
| VI-001 | high/medium/low | [selector] | [description] |

---

### 2. Console and Network

#### Console Messages

| Type | Count | Details |
|------|-------|---------|
| Errors | X | [list critical ones] |
| Warnings | X | [list notable ones] |
| Info | X | [summary] |

**Critical Errors:**
```
[Paste error messages here]
```

#### Network Requests

| Status | Count | Notes |
|--------|-------|-------|
| 2xx Success | X | |
| 3xx Redirect | X | |
| 4xx Client Error | X | [list failures] |
| 5xx Server Error | X | [list failures] |

**Failed Requests:**
| URL | Status | Type |
|-----|--------|------|
| [url] | 404 | [asset/api] |

---

### 3. Accessibility (WCAG 2.1 AA)

| Test | Status | Count | Details |
|------|--------|-------|---------|
| A11Y-001: Image Alt Text | PASS/FAIL | X missing | |
| A11Y-002: Form Labels | PASS/FAIL | X missing | |
| A11Y-003: Heading Hierarchy | PASS/FAIL | | [hierarchy] |
| A11Y-004: Keyboard Navigation | PASS/FAIL | | |
| A11Y-005: Touch Targets | PASS/FAIL | X undersized | |

**Accessibility Issues:**
| Issue | Element | WCAG Criterion | Recommendation |
|-------|---------|----------------|----------------|
| Missing alt | `img.hero` | 1.1.1 | Add descriptive alt text |

---

### 4. Performance (Core Web Vitals)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP (Largest Contentful Paint) | X.Xs | < 2.5s | GOOD/NEEDS IMPROVEMENT/POOR |
| INP (Interaction to Next Paint) | Xms | < 200ms | GOOD/NEEDS IMPROVEMENT/POOR |
| CLS (Cumulative Layout Shift) | 0.XX | < 0.1 | GOOD/NEEDS IMPROVEMENT/POOR |

**Performance Analysis:**
[Insights from performance trace]

**Recommendations:**
1. [Performance improvement recommendation]
2. [Performance improvement recommendation]

---

### 5. Interactive Tests

| Test | Status | Notes |
|------|--------|-------|
| INT-001: Navigation Links | PASS/FAIL | |
| INT-002: Form Submission | PASS/FAIL | |
| INT-003: Modal Dialogs | PASS/FAIL | |
| INT-004: Dropdowns | PASS/FAIL | |

**Interactive Issues:**
| Issue | Steps to Reproduce | Expected | Actual |
|-------|-------------------|----------|--------|
| [issue] | [steps] | [expected] | [actual] |

---

### 6. Page-Specific Tests

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| [ID] | [description] | PASS/FAIL | |

---

### Issues Summary

#### Critical (Must Fix)
1. [Issue description] - [location]

#### High Priority
1. [Issue description] - [location]

#### Medium Priority
1. [Issue description] - [location]

#### Low Priority
1. [Issue description] - [location]

---

### Recommendations

1. **[Category]:** [Specific actionable recommendation]
2. **[Category]:** [Specific actionable recommendation]

---

### Test Environment Details

- **Browser:** Chrome (via DevTools MCP)
- **Chrome Version:** [version if known]
- **MCP Tools Used:** [list of tools]
- **Test Duration:** [time taken]

---

### Sign-off

**Review Status:** APPROVED / REQUIRES FIXES

**Next Steps:**
- [ ] Fix critical issues
- [ ] Re-test after fixes
- [ ] Deploy to production
