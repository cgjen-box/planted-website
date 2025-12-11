When the user confirms a fix worked (e.g., "great this fix worked", "the fix is working", "that fixed it", "bug is fixed now"), automatically document it in the fixes-done skill file.

Steps:
1. Read the current fixes-done.md file at `planted-availability-db/.claude/skills/fixes-done.md`
2. Summarize the fix that was just completed based on the conversation context:
   - Problem: What was broken?
   - Root Cause: Why was it broken?
   - Fix Applied: What code/config changes were made? Include file paths and line numbers.
   - Prevention: How does this prevent future occurrences?
3. Append a new dated entry to the fixes-done.md file
4. Confirm to the user that the fix has been logged

Format for new entries:
```markdown
---

## YYYY-MM-DD: [Short Bug Title]

### Problem
[1-2 sentences describing the symptom]

### Root Cause
[Technical explanation of why it happened]

### Fix Applied
**File:** `path/to/file.ts`

[Code snippets or description of changes]

### Prevention
[How this fix prevents the issue from recurring]

---
```
