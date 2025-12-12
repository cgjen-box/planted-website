# Authentication Setup for Website Reviews

This guide explains how to set up persistent authentication for reviewing production sites that require login.

## Overview

The Chrome DevTools MCP connects to a running Chrome instance with a persistent profile. This means:
- You login once manually to production sites
- The auth state (cookies, tokens) persists in the profile
- Claude Code can then access authenticated pages without re-login

## Initial Setup (One-Time)

### Step 1: Start Chrome in Debug Mode

```bash
# Windows Command Prompt
scripts\chrome-debug.bat

# Or PowerShell
powershell -ExecutionPolicy Bypass -File scripts\Start-ChromeDebug.ps1
```

This creates a persistent profile at: `%USERPROFILE%\.chrome-debug-profile`

### Step 2: Login to Production Sites

In the Chrome window that opens:

1. **Navigate to admin.planted.com**
2. **Click "Sign in with Google"**
3. **Complete the OAuth flow**
4. **Verify you're logged in** (should see Review Queue)

### Step 3: Verify Auth Persists

1. Close the Chrome window (not force-quit)
2. Run `scripts\chrome-debug.bat` again
3. Navigate to admin.planted.com
4. You should still be logged in

### Step 4: Connect Claude Code

The MCP server is configured in `.mcp.json` and loads automatically when Claude Code starts. After restarting Claude Code, verify with `/mcp` command.

## Daily Workflow

```
1. Start your day: Run scripts\chrome-debug.bat
2. Check auth: Visit admin.planted.com in debug Chrome
3. Run reviews: Use /review-website commands
4. End of day: Close Chrome normally
```

## Troubleshooting

### Auth Lost After Restart

If authentication doesn't persist:

1. Check profile directory exists: `%USERPROFILE%\.chrome-debug-profile`
2. Ensure Chrome closed gracefully (not force-killed)
3. Re-login and wait for Chrome to sync cookies

### Multiple Google Accounts

If you have multiple Google accounts:

1. In debug Chrome, sign out of all accounts first
2. Sign in with the account that has admin access
3. Check "Remember me" if prompted

### Session Expired

Firebase Auth sessions expire after extended periods. If you see login prompts:

1. Login again manually in debug Chrome
2. Continue with website review

### MCP Not Connected

If `/mcp` doesn't show chrome-devtools:

1. Ensure Chrome debug instance is running
2. Verify port 9222 is listening: `netstat -ano | findstr 9222`
3. Restart Claude Code to reload MCP servers

### Port 9222 Already in Use

```bash
# Find process using port 9222
netstat -ano | findstr 9222

# Kill the process (replace PID with actual ID)
taskkill /PID <PID> /F

# Restart Chrome debug
scripts\chrome-debug.bat
```

## Security Notes

1. **Profile Location:** The debug profile is stored locally at `%USERPROFILE%\.chrome-debug-profile`
2. **Credential Safety:** Cookies and tokens are stored in this profile - treat it like sensitive data
3. **Port Security:** Debug port 9222 is only accessible from localhost
4. **Don't Share:** Never commit the profile directory to git (it's already in user directory, not project)

## Related Files

- `scripts\chrome-debug.bat` - Windows batch launcher
- `scripts\Start-ChromeDebug.ps1` - PowerShell launcher
- `.mcp.json` - MCP server configuration
- `.claude\settings.local.json` - Bash permissions
