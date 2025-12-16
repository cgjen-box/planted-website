#!/usr/bin/env node
/**
 * Full Scraping Runner
 * Runs both Lieferando and Just Eat scraping sequentially
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const outputFile = path.join(__dirname, 'full-scraping-results.txt');
const stream = fs.createWriteStream(outputFile, { flags: 'w' });

function runScraper(platform) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Starting ${platform} scraping ===\n`);
    stream.write(`\n=== Starting ${platform} scraping ===\n`);
    stream.write(`Started at: ${new Date().toISOString()}\n\n`);

    const scraper = spawn('node', [
      'puppeteer-dish-scraper.cjs',
      `--platform=${platform}`,
      '--execute'
    ], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    scraper.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      stream.write(text);
    });

    scraper.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      stream.write(`ERROR: ${text}`);
    });

    scraper.on('close', (code) => {
      stream.write(`\nCompleted at: ${new Date().toISOString()}\n`);
      stream.write(`Exit code: ${code}\n\n`);

      if (code === 0) {
        console.log(`\n=== ${platform} scraping completed successfully ===\n`);
        resolve();
      } else {
        console.error(`\n=== ${platform} scraping failed with code ${code} ===\n`);
        reject(new Error(`Scraper exited with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('Full Dish Image Scraping - Starting...');
  console.log(`Output file: ${outputFile}\n`);

  stream.write('='.repeat(80) + '\n');
  stream.write('FULL DISH IMAGE SCRAPING\n');
  stream.write('='.repeat(80) + '\n');
  stream.write(`Started at: ${new Date().toISOString()}\n`);
  stream.write('='.repeat(80) + '\n\n');

  try {
    // Run Lieferando first
    await runScraper('lieferando');

    // Then run Just Eat
    await runScraper('just-eat');

    stream.write('\n' + '='.repeat(80) + '\n');
    stream.write('ALL SCRAPING COMPLETED\n');
    stream.write(`Finished at: ${new Date().toISOString()}\n`);
    stream.write('='.repeat(80) + '\n');

    console.log('\nAll scraping completed successfully!');
    console.log(`Full results saved to: ${outputFile}`);

  } catch (error) {
    console.error('Scraping failed:', error.message);
    stream.write(`\nFATAL ERROR: ${error.message}\n`);
    process.exit(1);
  } finally {
    stream.end();
  }
}

main();
