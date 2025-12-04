#!/usr/bin/env node

/**
 * Script to automatically detect and add product field to recipe JSON files
 * based on recipe title, filename, and ingredients.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_DIR = path.join(__dirname, '../src/content/recipes');

// Product detection patterns (order matters - more specific patterns first)
const productPatterns = [
    { product: 'crispy-strips', patterns: ['crispy strips', 'crispy-strips', 'crispystrips'] },
    { product: 'steak', patterns: ['steak', 'planted.steak'] },
    { product: 'chicken', patterns: ['chicken', 'planted.chicken', 'güggeli', 'guggeli'] },
    { product: 'pulled', patterns: ['pulled', 'planted.pulled'] },
    { product: 'kebab', patterns: ['kebab', 'planted.kebab', 'döner', 'doner', 'gyros'] },
    { product: 'schnitzel', patterns: ['schnitzel', 'planted.schnitzel'] },
    { product: 'bratwurst', patterns: ['bratwurst', 'planted.bratwurst', 'hot dog', 'hotdog', 'currydog', 'wurst'] },
    { product: 'duck', patterns: ['duck', 'planted.duck', 'ente'] },
    { product: 'skewers', patterns: ['skewers', 'planted.skewers', 'spiess', 'spieß', 'satay', 'sate'] },
    { product: 'nuggets', patterns: ['nuggets', 'planted.nuggets', 'popcorn'] },
];

function detectProduct(recipe) {
    const title = (recipe.title || '').toLowerCase();
    const slug = (recipe.slug || '').toLowerCase();
    const ingredients = (recipe.ingredients || []).join(' ').toLowerCase();
    const instructions = (recipe.instructions || []).join(' ').toLowerCase();

    const searchText = `${title} ${slug} ${ingredients} ${instructions}`;

    for (const { product, patterns } of productPatterns) {
        for (const pattern of patterns) {
            if (searchText.includes(pattern.toLowerCase())) {
                return product;
            }
        }
    }

    return null; // No product detected
}

function processRecipes() {
    const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json'));
    let updated = 0;
    let skipped = 0;
    let noProduct = 0;

    const stats = {};

    for (const file of files) {
        const filePath = path.join(RECIPES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const recipe = JSON.parse(content);

        // Skip if product already set
        if (recipe.product) {
            skipped++;
            stats[recipe.product] = (stats[recipe.product] || 0) + 1;
            continue;
        }

        const detectedProduct = detectProduct(recipe);

        if (detectedProduct) {
            recipe.product = detectedProduct;

            // Write back with proper formatting
            const newContent = JSON.stringify(recipe, null, 4);
            fs.writeFileSync(filePath, newContent);

            console.log(`✓ ${file}: ${detectedProduct}`);
            updated++;
            stats[detectedProduct] = (stats[detectedProduct] || 0) + 1;
        } else {
            console.log(`? ${file}: No product detected`);
            noProduct++;
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already has product): ${skipped}`);
    console.log(`No product detected: ${noProduct}`);
    console.log(`Total: ${files.length}`);
    console.log('\n--- By Product ---');
    for (const [product, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${product}: ${count}`);
    }
}

processRecipes();
