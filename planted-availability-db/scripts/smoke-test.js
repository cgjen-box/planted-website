#!/usr/bin/env node

/**
 * Production Smoke Test Script
 *
 * Run this AFTER deploying to verify the deployment is working.
 *
 * Usage:
 *   node scripts/smoke-test.js
 *   pnpm run smoke-test
 *
 * Exit codes:
 *   0 = All tests passed
 *   1 = Tests failed
 */

const https = require('https');

const API_BASE = 'https://europe-west6-get-planted-db.cloudfunctions.net';
const DASHBOARD_URL = 'https://get-planted-db.web.app';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, message = '') {
  const icon = passed ? '\u2705' : '\u274C';
  const msg = message ? ` - ${message}` : '';
  console.log(`  ${icon} ${name}${msg}`);
  return passed;
}

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          ok: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testHealthCheck() {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/adminHealthCheck`);
    const latency = Date.now() - start;

    if (response.ok) {
      const data = JSON.parse(response.data);
      return logTest('Health Check', true, `${data.status} (${latency}ms)`);
    } else {
      return logTest('Health Check', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    return logTest('Health Check', false, error.message);
  }
}

async function testCORSPreflight(endpoint) {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': DASHBOARD_URL,
        'Access-Control-Request-Method': 'GET',
      },
    });
    const latency = Date.now() - start;

    const corsOrigin = response.headers['access-control-allow-origin'];
    const corsMethods = response.headers['access-control-allow-methods'];

    if ((response.status === 204 || response.status === 200) && corsOrigin) {
      return logTest(`CORS Preflight (${endpoint})`, true, `${latency}ms, Origin: ${corsOrigin}`);
    } else {
      return logTest(`CORS Preflight (${endpoint})`, false, `Status: ${response.status}, CORS: ${corsOrigin || 'missing'}`);
    }
  } catch (error) {
    return logTest(`CORS Preflight (${endpoint})`, false, error.message);
  }
}

async function testAuthRequired(endpoint) {
  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      headers: {
        'Origin': DASHBOARD_URL,
      },
    });
    const latency = Date.now() - start;

    const corsOrigin = response.headers['access-control-allow-origin'];

    if (response.status === 401) {
      if (corsOrigin) {
        return logTest(`Auth Required (${endpoint})`, true, `401 with CORS (${latency}ms)`);
      } else {
        return logTest(`Auth Required (${endpoint})`, false, `401 but CORS headers missing!`);
      }
    } else if (response.status === 200) {
      return logTest(`Auth Required (${endpoint})`, false, `200 - auth not working!`);
    } else {
      return logTest(`Auth Required (${endpoint})`, false, `Unexpected: ${response.status}`);
    }
  } catch (error) {
    return logTest(`Auth Required (${endpoint})`, false, error.message);
  }
}

async function testDashboard() {
  const start = Date.now();
  try {
    const response = await fetch(DASHBOARD_URL);
    const latency = Date.now() - start;

    if (response.ok && response.data.includes('<!DOCTYPE html>')) {
      return logTest('Dashboard HTML', true, `Loaded (${latency}ms)`);
    } else {
      return logTest('Dashboard HTML', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    return logTest('Dashboard HTML', false, error.message);
  }
}

async function testTestPage() {
  const start = Date.now();
  try {
    const response = await fetch(`${DASHBOARD_URL}/test`);
    const latency = Date.now() - start;

    // Note: SPA returns same HTML for all routes
    if (response.ok && response.data.includes('<!DOCTYPE html>')) {
      return logTest('Test Page Route', true, `Loaded (${latency}ms)`);
    } else {
      return logTest('Test Page Route', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    return logTest('Test Page Route', false, error.message);
  }
}

async function main() {
  log('\n========================================', 'cyan');
  log('  PRODUCTION SMOKE TESTS', 'cyan');
  log('========================================\n', 'cyan');

  log(`API Base: ${API_BASE}`, 'blue');
  log(`Dashboard: ${DASHBOARD_URL}\n`, 'blue');

  let allPassed = true;

  // 1. Health Check
  log('1. API Health', 'blue');
  allPassed = await testHealthCheck() && allPassed;
  console.log();

  // 2. CORS Tests
  log('2. CORS Configuration', 'blue');
  allPassed = await testCORSPreflight('adminHealthCheck') && allPassed;
  allPassed = await testCORSPreflight('adminReviewQueue') && allPassed;
  console.log();

  // 3. Auth Tests
  log('3. Authentication', 'blue');
  allPassed = await testAuthRequired('adminReviewQueue') && allPassed;
  allPassed = await testAuthRequired('adminBudgetStatus') && allPassed;
  console.log();

  // 4. Dashboard Tests
  log('4. Dashboard', 'blue');
  allPassed = await testDashboard() && allPassed;
  allPassed = await testTestPage() && allPassed;
  console.log();

  // Summary
  log('========================================', 'cyan');
  if (allPassed) {
    log('  ALL SMOKE TESTS PASSED', 'green');
    log('========================================\n', 'cyan');
    log('Deployment verified successfully!\n', 'green');
    log('Next steps:', 'blue');
    log(`  1. Open ${DASHBOARD_URL}/test to visually verify`);
    log(`  2. Test Google Sign-In manually`);
    log(`  3. Verify dashboard functionality\n`);
    process.exit(0);
  } else {
    log('  SMOKE TESTS FAILED', 'red');
    log('========================================\n', 'cyan');
    log('Deployment may have issues. Check the failures above.\n', 'yellow');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Smoke test error:', error);
  process.exit(1);
});
