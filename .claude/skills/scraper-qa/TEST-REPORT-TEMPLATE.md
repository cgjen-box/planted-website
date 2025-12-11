# Test Report Template

Copy this template when generating test reports for scraper/discovery/extraction changes.

---

## Test Report: [Task/Feature Name]

**Date:** YYYY-MM-DD
**Status:** ALL TESTS PASSED / FAILED (X remaining)
**Component(s):** [Which agents/files were changed]

---

### Phase 1: Scope Analysis

**Task Description:**
Brief description of what was implemented/fixed.

**Components Affected:**
- [ ] SmartDiscoveryAgent
- [ ] SmartDishFinderAgent
- [ ] PuppeteerFetcher
- [ ] Platform adapters: [list]
- [ ] Search engine pool
- [ ] Query cache
- [ ] Country detection
- [ ] CLI tools
- [ ] Other: [specify]

**Risk Level:** low / medium / high

**Files Changed:**
- `path/to/file1.ts` - Description of change
- `path/to/file2.ts` - Description of change

---

### Phase 2: Test Cases Defined

| TC ID | Description | Type | Component |
|-------|-------------|------|-----------|
| TC-XXX-001 | Description | unit | File/function |
| TC-XXX-002 | Description | integration | File/function |
| TC-XXX-003 | Description | dry-run | Agent |

---

### Phase 3: Build Verification

**Command:** `cd planted-availability-db && pnpm build`

```
Build Results:
- Packages: 6
- Successful: X
- Failed: X
- Scrapers package: PASS / FAIL
```

**TypeScript Errors:** 0 / [list errors]

---

### Phase 4: Test Execution Results

#### Automated Tests

| TC ID | Description | Status | Evidence/Output |
|-------|-------------|--------|-----------------|
| TC-XXX-001 | Description | PASS / FAIL | [key log line or result] |
| TC-XXX-002 | Description | PASS / FAIL | [key log line or result] |

#### Dry Run Tests

**Command:**
```bash
cd packages/scrapers && pnpm run local --dry-run -c ../../scraper-config-test.json
```

**Output Summary:**
```
[Key log lines showing expected behavior]
```

**Status:** PASS / FAIL

#### Integration Tests

| Test | Status | Notes |
|------|--------|-------|
| Country detection | PASS / FAIL | |
| Venue processing | PASS / FAIL | |
| Dish extraction | PASS / FAIL | |

---

### Phase 5: Issues Found

#### ISSUE-001: [Issue Title] (if any)
**Severity:** critical / high / medium / low
**Status:** fixed / open
**Affected Test Case:** TC-XXX-00X

**Description:**
What went wrong.

**Root Cause:**
Why it happened.

**Fix Applied:**
What was changed to fix it.

---

### Phase 6: Regression Verification

After fixing issues, re-run ALL test cases:

| TC ID | Description | Status |
|-------|-------------|--------|
| TC-XXX-001 | Description | PASS |
| TC-XXX-002 | Description | PASS |

**Final Build:** PASS / FAIL
**All Tests:** PASS / FAIL

---

### Evidence

#### Key Log Output
```
[Paste relevant log lines showing correct behavior]
```

#### Database Verification (if applicable)
```
[Query results or Firestore data showing correct state]
```

---

### Final Checklist

- [ ] All test cases pass
- [ ] `pnpm build` succeeds with 0 errors
- [ ] No TypeScript errors in scrapers package
- [ ] Dry run produces expected output
- [ ] No regression in existing functionality
- [ ] Changes documented in fixes-done.md (if bug fix)

---

### Sign-off

**Test Status:** COMPLETE - ALL PASSED / INCOMPLETE - X FAILURES

**Summary:**
One-paragraph summary of what was tested and verified.

---

# Quick Report (for simple changes)

For minor changes, use this abbreviated format:

```markdown
## Test Report: [Brief Name]
**Date:** YYYY-MM-DD
**Status:** ALL PASSED

### Changes
- `file.ts`: Description

### Tests Run
| Test | Status |
|------|--------|
| Build | PASS |
| TC-XXX-001 | PASS |
| Dry run | PASS |

### Evidence
[One key log line or result proving success]
```
