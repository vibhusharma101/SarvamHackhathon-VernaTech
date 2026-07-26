#!/usr/bin/env node

// Think-In-HTML — self-contained HTML validator for FREEFORM outputs.
//
// In freeform mode the AI authors a full bespoke .html per subject. That trades
// the block schema for freedom, so the one invariant we DO enforce is: the file
// must be a single self-contained artifact that works offline with no external
// network dependencies. This checker is that gate. Zero npm dependencies.
//
// Usable two ways:
//   - CLI:            node core/build/check-html.mjs output.html
//   - imported module: import { checkSelfContained } from './check-html.mjs'

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Resource-loading references that must never point at a remote origin. Note we
// deliberately do NOT flag <a href="https://…"> — a hyperlink is navigation, not
// a resource load, and offline the page still renders fine.
const RULES = [
  { re: /<link\b[^>]*\bhref\s*=\s*["']?\s*https?:\/\//i, msg: 'external <link> (stylesheet/resource) — inline it instead' },
  { re: /<script\b[^>]*\bsrc\s*=\s*["']?\s*https?:\/\//i, msg: 'external <script src> — inline the code instead' },
  { re: /<(?:img|image|source|iframe|video|audio|embed|object|track|use)\b[^>]*\b(?:src|href|data|xlink:href)\s*=\s*["']?\s*https?:\/\//i, msg: 'external media/frame reference — embed as a data: URI instead' },
  { re: /@import\b/i, msg: '@import pulls a remote stylesheet — inline the CSS instead' },
  { re: /url\(\s*["']?\s*https?:\/\//i, msg: 'CSS url() points at a remote origin — use a data: URI instead' },
  { re: /\bsrcset\s*=\s*["'][^"']*https?:\/\//i, msg: 'external srcset — embed images as data: URIs instead' },
  { re: /@font-face[^}]*url\(\s*["']?\s*https?:\/\//i, msg: 'remote @font-face — use a system font stack or embed the font' },
];

// Returns { ok: boolean, errors: string[], warnings: string[] }.
export function checkSelfContained(html) {
  const errors = [];
  const warnings = [];

  if (!/<!doctype html>/i.test(html)) errors.push('missing <!doctype html>');
  if (!/<html[\s>]/i.test(html)) errors.push('missing <html> element');
  if (!/Content-Security-Policy/i.test(html)) {
    warnings.push('no Content-Security-Policy <meta> — recommended: default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:;');
  }

  for (const { re, msg } of RULES) {
    if (re.test(html)) errors.push(msg);
  }

  // Catch-all: any remaining https?:// inside a resource-y attribute we didn't
  // name above. Hyperlinks (<a href>) are stripped first so they don't trip it.
  const withoutLinks = html.replace(/<a\b[^>]*>/gi, '<a>');
  const leftover = withoutLinks.match(/\b(?:src|data|poster|background)\s*=\s*["']?\s*https?:\/\/[^"'\s>]+/gi) || [];
  for (const ref of leftover) errors.push(`external resource reference: ${ref.slice(0, 80)}`);

  return { ok: errors.length === 0, errors, warnings };
}

// ── CLI ──
function isMain() {
  return process.argv[1] && resolve(process.argv[1]).endsWith('check-html.mjs');
}

if (isMain()) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node check-html.mjs <output.html>');
    process.exit(1);
  }
  let html;
  try {
    html = readFileSync(resolve(file), 'utf-8');
  } catch (e) {
    console.error(`Cannot read ${file}: ${e.message}`);
    process.exit(1);
  }
  const { ok, errors, warnings } = checkSelfContained(html);
  warnings.forEach(w => console.warn(`  ! ${w}`));
  if (ok) {
    console.log(`✓ ${file} is self-contained (${Math.round(html.length / 1024)} KB).`);
    process.exit(0);
  }
  console.error(`✗ ${file} is NOT self-contained:`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}
