#!/usr/bin/env node

/**
 * Generate favicon images from SVG
 * Run: node generate-favicons.js
 * 
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const outputDir = path.join(__dirname, 'public');

const sizes = [
  { name: 'favicon.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-maskable-192x192.png', size: 192 },
  { name: 'mstile-150x150.png', size: 150 },
];

async function generateFavicons() {
  console.log('🎨 Generating favicons from SVG...');
  
  try {
    for (const { name, size } of sizes) {
      const outputPath = path.join(outputDir, name);
      console.log(`  📦 Creating ${name} (${size}x${size})...`);
      
      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 30, g: 64, b: 175, alpha: 1 }, // #1E40AF
        })
        .png()
        .toFile(outputPath);
      
      console.log(`  ✅ ${name} created`);
    }
    
    console.log('\n✨ All favicons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
