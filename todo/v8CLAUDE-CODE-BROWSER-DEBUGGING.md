# Chrome DevTools MCP Setup for Claude Code

## Purpose

This document provides step-by-step instructions for Claude Code to set up Chrome DevTools MCP, enabling visual inspection, debugging, and testing of websites built in this project. Once configured, Claude Code can navigate to localhost URLs, capture screenshots, read console logs, inspect network requests, analyze performance, and debug runtime errors—all through natural language commands.

---

## Prerequisites Check

Before starting, Claude Code should verify these prerequisites:

```bash
# 1. Check Node.js version (requires v20.19+ or latest LTS)
node --version

# 2. Check npm is available
npm --version

# 3. Verify Chrome is installed (macOS)
ls "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 4. Verify Chrome is installed (Linux)
which google-chrome || which chromium-browser

# 5. Verify Chrome is installed (Windows - Git Bash)
ls "/c/Program Files/Google/Chrome/Application/chrome.exe"
```

If Node.js is not v20+ or Chrome is not found, Claude Code should inform the user and help resolve before proceeding.

---

## Installation

### Step 1: Add Chrome DevTools MCP to Claude Code

Run this single command to register the MCP server:

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

This registers the server globally. To add it only to the current project:

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest -s project
```

### Step 2: Verify Installation

```bash
# List all configured MCP servers
claude mcp list

# Get details about the chrome-devtools server
claude mcp get chrome-devtools
```

Expected output should show:
- Command: `npx`
- Args: `["chrome-devtools-mcp@latest"]`

### Step 3: Restart Claude Code

For the MCP server to be available, Claude Code must be restarted. Inform the user:

> "Chrome DevTools MCP is now installed. Please restart Claude Code (close and reopen the terminal session) for the changes to take effect."

After restart, verify the MCP is loaded by running `/mcp` in Claude Code and checking that `chrome-devtools` appears in the list.

---

## Persistent Authentication Setup (For Google SSO / Authenticated Sites)

Google's bot detection prevents automated login. The solution is to create a persistent Chrome profile where the user logs in manually once, and Claude Code reuses that authenticated session.

### Step 1: Create the Debug Profile Directory

```bash
# macOS / Linux
mkdir -p "$HOME/.chrome-debug-profile"

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.chrome-debug-profile"
```

### Step 2: Create a Launch Script

Create a script to launch Chrome with remote debugging enabled:

**macOS:** Create `~/.local/bin/chrome-debug` (or any location in PATH):

```bash
mkdir -p ~/.local/bin

cat > ~/.local/bin/chrome-debug << 'EOF'
#!/bin/bash
# Chrome Debug Launcher for Claude Code MCP
# Launches Chrome with remote debugging on port 9222

PROFILE_DIR="$HOME/.chrome-debug-profile"
PORT="${1:-9222}"

# Kill any existing debug Chrome instance on this port
lsof -ti:$PORT | xargs kill -9 2>/dev/null

# Launch Chrome
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=$PORT \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  "$2" &

echo "✅ Chrome launched with remote debugging on port $PORT"
echo "📁 Profile directory: $PROFILE_DIR"
echo "🔗 DevTools available at: http://127.0.0.1:$PORT"
EOF

chmod +x ~/.local/bin/chrome-debug
```

**Linux:** Create `~/.local/bin/chrome-debug`:

```bash
mkdir -p ~/.local/bin

cat > ~/.local/bin/chrome-debug << 'EOF'
#!/bin/bash
PROFILE_DIR="$HOME/.chrome-debug-profile"
PORT="${1:-9222}"

lsof -ti:$PORT | xargs kill -9 2>/dev/null

google-chrome \
  --remote-debugging-port=$PORT \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  "$2" &

echo "✅ Chrome launched with remote debugging on port $PORT"
EOF

chmod +x ~/.local/bin/chrome-debug
```

**Windows:** Create `chrome-debug.bat` in a folder in PATH:

```batch
@echo off
set PROFILE_DIR=%USERPROFILE%\.chrome-debug-profile
set PORT=%1
if "%PORT%"=="" set PORT=9222

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=%PORT% ^
  --user-data-dir="%PROFILE_DIR%" ^
  --no-first-run ^
  --no-default-browser-check

echo Chrome launched with remote debugging on port %PORT%
```

### Step 3: Add Script to PATH (if needed)

```bash
# Add to shell profile (bash)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Or for zsh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Step 4: Configure MCP to Connect to Persistent Profile

Remove the default MCP configuration and add one that connects to the persistent browser:

```bash
# Remove existing configuration
claude mcp remove chrome-devtools

# Add with browserUrl pointing to our debug Chrome
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest -- --browserUrl http://127.0.0.1:9222
```

### Step 5: Initial Authentication (One-Time User Action)

Instruct the user:

> **One-time setup required:**
> 1. Run `chrome-debug` in your terminal (or the equivalent for your OS)
> 2. In the Chrome window that opens, navigate to any sites requiring authentication (e.g., Google accounts)
> 3. Log in manually with your credentials
> 4. Close Chrome when done
> 
> Your login sessions are now saved. Claude Code can reuse them for all future debugging sessions.

---

## Usage Guide

Once configured, Claude Code can use these capabilities through natural language. The MCP exposes these tool categories:

### Navigation Tools
| Tool | Purpose |
|------|---------|
| `navigate_page` | Navigate to a URL |
| `go_back` | Navigate back in history |
| `go_forward` | Navigate forward in history |
| `reload_page` | Reload current page |

### Interaction Tools
| Tool | Purpose |
|------|---------|
| `click` | Click an element |
| `fill` | Fill a form field |
| `fill_form` | Fill multiple form fields |
| `hover` | Hover over an element |
| `select_option` | Select from dropdown |
| `press_key` | Press keyboard key |

### Inspection Tools
| Tool | Purpose |
|------|---------|
| `take_screenshot` | Capture visual screenshot |
| `take_snapshot` | Capture accessibility tree (structured DOM) |
| `get_page_content` | Get page HTML |
| `evaluate_javascript` | Execute JS in page context |

### Debugging Tools
| Tool | Purpose |
|------|---------|
| `list_console_messages` | Get browser console logs |
| `list_network_requests` | Get network request history |
| `wait_for` | Wait for element/condition |

### Performance Tools
| Tool | Purpose |
|------|---------|
| `performance_start_trace` | Start performance recording |
| `performance_stop_trace` | Stop and get trace data |

---

## Example Commands for Claude Code

### Basic Page Inspection

```
User: "Check if http://localhost:4322/planted-website/de/ loads correctly"

Claude Code should:
1. Use navigate_page to go to the URL
2. Use take_screenshot to capture the visual state
3. Use list_console_messages to check for JavaScript errors
4. Use list_network_requests to identify failed requests
5. Report findings to user
```

### Debugging a Broken Feature (e.g., Store Locator)

```
User: "The store locator at http://localhost:4322/planted-website/de/store-locator doesn't work. Debug it."

Claude Code should:
1. navigate_page("http://localhost:4322/planted-website/de/store-locator")
2. take_screenshot() - capture initial state
3. take_snapshot() - understand page structure
4. Identify the search input/button from snapshot
5. fill() the search field with a test location (e.g., "Zürich")
6. click() the search button
7. wait_for() results or error state
8. take_screenshot() - capture result state
9. list_console_messages() - check for JS errors
10. list_network_requests() - find failed API calls
11. Analyze and report: What failed? API 404? CORS error? Missing data?
```

### Performance Analysis

```
User: "Check the performance of the homepage"

Claude Code should:
1. navigate_page("http://localhost:4322/planted-website/de/")
2. performance_start_trace(reload=true, autoStop=true)
3. Wait for trace to complete
4. Analyze Core Web Vitals (LCP, CLS, INP)
5. Report performance issues and recommendations
```

### Visual Regression Check

```
User: "Take screenshots of the homepage at desktop and mobile sizes"

Claude Code should:
1. Navigate to page
2. take_screenshot() at default viewport (desktop)
3. Use evaluate_javascript to resize viewport to mobile (390x844)
4. take_screenshot() again
5. Present both screenshots for comparison
```

---

## Troubleshooting

### "Cannot connect to browser"

```bash
# Check if Chrome debug instance is running
lsof -i:9222

# If not running, start it
chrome-debug

# Verify it's accessible
curl -s http://127.0.0.1:9222/json/version
```

### "MCP server not found"

```bash
# Verify MCP is registered
claude mcp list

# Re-add if missing
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest -- --browserUrl http://127.0.0.1:9222

# Restart Claude Code
```

### "Port 9222 already in use"

```bash
# Find and kill process on port
lsof -ti:9222 | xargs kill -9

# Restart debug Chrome
chrome-debug
```

### "Authentication not persisting"

The persistent profile must be used consistently:

```bash
# Verify profile directory exists and has content
ls -la ~/.chrome-debug-profile

# Should contain directories like: Default, Local State, etc.
# If empty, Chrome wasn't launched with --user-data-dir correctly
```

### WSL-Specific Issues (Windows Subsystem for Linux)

```powershell
# Run in PowerShell as Administrator - allow WSL to connect to Chrome
New-NetFirewallRule -DisplayName "WSL Chrome Debug" -Direction Inbound -LocalPort 9222 -Protocol TCP -Action Allow
```

Then in WSL, connect to Windows Chrome:

```bash
# Find Windows host IP
export WINDOWS_HOST=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')

# Configure MCP to connect to Windows Chrome
claude mcp remove chrome-devtools
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest -- --browserUrl http://$WINDOWS_HOST:9222
```

---

## Best Practices for Claude Code

### 1. Always Start with Reconnaissance

Before attempting to debug, gather context:

```
1. take_snapshot() - Understand DOM structure
2. list_console_messages() - Check existing errors
3. list_network_requests() - See what's already loaded/failed
```

### 2. Use Accessibility Tree Over Screenshots When Possible

The `take_snapshot()` tool returns structured accessibility tree data, which is:
- More token-efficient than screenshots
- Provides element references for clicking/filling
- Better for understanding page structure

Use `take_screenshot()` for:
- Visual verification
- Layout/styling issues
- Capturing state for the user

### 3. Wait Appropriately for Dynamic Content

After interactions, use `wait_for()` before capturing results:

```
click(submit_button)
wait_for(".results-container")  // Wait for results to appear
take_screenshot()
```

### 4. Check Network Requests for API Debugging

Most "feature doesn't work" issues are API-related. Always check:

```
list_network_requests()

Look for:
- 4xx errors (client errors - wrong URL, missing auth)
- 5xx errors (server errors)
- CORS errors (check console messages)
- Requests that never completed
```

### 5. Report Findings Clearly

When reporting to the user, include:
- What was tested
- What worked
- What failed (with specific error messages)
- Suggested fixes

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│ CHROME DEVTOOLS MCP - QUICK REFERENCE                           │
├─────────────────────────────────────────────────────────────────┤
│ SETUP                                                           │
│   claude mcp add chrome-devtools npx chrome-devtools-mcp@latest │
│   chrome-debug                    # Start debug browser         │
│                                                                 │
│ NAVIGATION                                                      │
│   navigate_page(url)              # Go to URL                   │
│   go_back() / go_forward()        # History navigation          │
│   reload_page()                   # Refresh                     │
│                                                                 │
│ INSPECTION                                                      │
│   take_screenshot()               # Visual capture              │
│   take_snapshot()                 # DOM/accessibility tree      │
│   list_console_messages()         # JS console output           │
│   list_network_requests()         # HTTP request log            │
│                                                                 │
│ INTERACTION                                                     │
│   click(element)                  # Click element               │
│   fill(element, text)             # Type into field             │
│   fill_form({field: value, ...})  # Fill multiple fields        │
│   hover(element)                  # Mouse hover                 │
│   press_key(key)                  # Keyboard input              │
│                                                                 │
│ PERFORMANCE                                                     │
│   performance_start_trace()       # Begin recording             │
│   performance_stop_trace()        # End and get results         │
│                                                                 │
│ DEBUGGING WORKFLOW                                              │
│   1. navigate_page → 2. take_snapshot → 3. interact             │
│   4. wait_for → 5. list_console_messages → 6. list_network      │
│   7. take_screenshot → 8. report findings                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project-Specific Configuration

For the Planted website project, use these defaults:

```
Base URL: http://localhost:4322/planted-website/de/
Key pages to test:
  - Homepage: /
  - Store Locator: /store-locator
  - Products: /products

Common issues to check:
  - API endpoints returning 404 (check network requests)
  - Missing environment variables (check console for errors)
  - CORS issues (check console for CORS errors)
  - Asset loading failures (check network for failed image/script loads)
```

---

## Summary

Chrome DevTools MCP transforms Claude Code from a "code-only" assistant into a full debugging partner. By following this setup:

1. **Claude Code can see** - Screenshots and DOM snapshots reveal visual state
2. **Claude Code can debug** - Console logs and network requests expose errors
3. **Claude Code can interact** - Click, type, and navigate like a real user
4. **Claude Code can measure** - Performance traces identify bottlenecks

For authenticated sites, the persistent Chrome profile ensures sessions are maintained without requiring Claude Code to handle login flows it cannot automate.

When asked to debug a visual issue or broken feature, Claude Code should:
1. Start the debug browser (or verify it's running)
2. Navigate to the problematic page
3. Capture state (screenshot + snapshot)
4. Interact with the feature
5. Gather diagnostics (console + network)
6. Analyze and report findings
7. Suggest code fixes based on the evidence

This closes the loop between code generation and runtime verification, enabling truly effective AI-assisted web development.
