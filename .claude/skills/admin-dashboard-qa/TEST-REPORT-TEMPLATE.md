# Test Report Template

Copy this template when generating test reports.

---

## Test Report: [Feature Name]

**Date:** YYYY-MM-DD
**Tester:** Claude AI
**Feature/Task:** Brief description of what was implemented
**Related Files:**
- `path/to/file1.tsx`
- `path/to/file2.ts`

---

### Phase 1: PM Summary

**Risk Level:** low / medium / high
**Affected Components:**
- Component 1
- Component 2

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Implementation Checklist:**
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

---

### Phase 2: Use Cases Defined

| UC ID | Description | Test Type |
|-------|-------------|-----------|
| UC-XXX-001 | Description | unit |
| UC-XXX-002 | Description | integration |
| UC-XXX-003 | Description | manual |

---

### Phase 3: Automated Test Results

**Command:** `cd packages/admin-dashboard-v2 && pnpm test`

```
Test Results:
- Total Tests: X
- Passed: X
- Failed: X
- Skipped: X

Coverage:
- Lines: X% (threshold: 95%)
- Branches: X% (threshold: 90%)
- Functions: X% (threshold: 95%)
- Statements: X% (threshold: 95%)
```

**Build Status:** PASS / FAIL
**Lint Status:** PASS / FAIL

---

### Phase 4: Use Case Execution Results

| UC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| UC-XXX-001 | Description | PASS | |
| UC-XXX-002 | Description | PASS | |
| UC-XXX-003 | Description | FAIL | Bug found - see BUG-001 |

---

### Phase 5: Bugs Found

#### BUG-001: [Bug Title]
**Severity:** critical / high / medium / low
**Status:** open / fixed / verified
**Affected Use Case:** UC-XXX-003

**Description:**
Brief description of the bug.

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen.

**Actual Result:**
What actually happened.

**Fix Applied:**
Description of fix (after fixed).

---

### Phase 6: Regression Test Results

After all bug fixes, re-run ALL related use cases:

| UC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| UC-XXX-001 | Description | PASS | |
| UC-XXX-002 | Description | PASS | |
| UC-XXX-003 | Description | PASS | Bug fixed |

**Final Test Command:** `pnpm test`

```
Final Test Results:
- Total Tests: X
- Passed: X
- Failed: 0

Final Coverage:
- Lines: X%
- Branches: X%
- Functions: X%
- Statements: X%
```

---

### Final Checklist

- [ ] All unit tests pass
- [ ] Coverage thresholds met
- [ ] All defined use cases pass
- [ ] No open bugs remain
- [ ] Build succeeds
- [ ] Lint passes
- [ ] TypeScript compiles without errors

---

### Sign-off

**Feature Status:** APPROVED / NEEDS WORK

**Notes:**
Any additional notes or observations.
