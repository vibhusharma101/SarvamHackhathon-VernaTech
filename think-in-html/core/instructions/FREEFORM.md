# Think-In-HTML: Freeform Mode — author the whole page on the fly

This is the **default** generation mode. You are not filling a template and you are
not emitting block JSON. **You are designing and building a complete, bespoke,
interactive HTML explainer from scratch for THIS specific subject** — its own layout,
its own visual system, and its own interactive logic.

Two outputs that look alike are a failure. A page whose "interactive" part is
decorative is a failure. Aim for something a smart person would call *genuinely good*.

## The one non-negotiable idea: make the core mechanic tangible

Before you write any HTML, answer one question:

> **What is the single most important dynamic in this subject — the thing that, if the
> reader could *play with it*, they'd finally get it?**

Then build a small **working model of that dynamic** the reader can manipulate, with
real logic behind it (not a canned animation). Examples of the *kind* of thinking:

- A pricing endpoint that clamps an AI's output → a number-line where the reader asks
  the AI for a price, toggles "go rogue," and watches the clamp pull a wild value into
  the safe band, with the real formula computed live.
- A rate limiter → a button the reader can spam, watching the token bucket drain and
  refill and requests flip from 200 to 429.
- A parser / state machine → feed it characters and watch it walk states and accept/reject.
- A retry-with-backoff → a flaky request the reader can trigger, watching delays grow.
- A diffing / reconciliation algorithm → two lists the reader edits, seeing the minimal ops.
- A cache → issue reads/writes and watch hits, misses, and eviction.

The interaction must be **driven by the subject's real logic** — reimplement the
essential rule faithfully (same formula, same thresholds, same states) so the reader is
learning the actual behavior, not a cartoon of it. Read the source and use its real
constants and names.

## Vary the design every time (this is a hard requirement)

Derive the whole look from the subject so no two explainers resemble each other. Choose,
per subject:

- **Palette & mood** — from the domain. A carbon exchange is not a game engine is not a
  crypto wallet is not a children's tutorial. Pick colors, contrast, and temperature that
  fit. Light or dark, both are fine — commit to one and do it well.
- **Layout & rhythm** — a scrollytelling story, a dashboard, a split explainer, a
  terminal, a notebook, a timeline. Let the content pick the shape.
- **Type & motif** — a font stack (system fonts only) and a small recurring visual motif
  (a ledger line, a circuit trace, a node graph, a receipt) that ties the page together.

If you catch yourself reaching for the same hero + card grid you used last time, stop and
choose a different structure.

## Quality bar (hit most of these)

1. **A hero** that states the real question the code answers — specific, not generic.
2. **The interactive centerpiece** described above.
3. **The real code**, shown and explained — pull actual snippets and syntax-style them.
4. **A crisp "aha"** — one sentence naming the insight, visually emphasized.
5. **Teacher voice** throughout — explain like the reader is smart but new to this. No
   jargon without a plain-English gloss.
6. **Motion with restraint** — reveal-on-scroll, hover states, a scroll-progress cue;
   always guard `@media (prefers-reduced-motion: reduce)`.
7. **Responsive** — works from 360px to desktop; nothing overflows the viewport.
8. **A short recap** the reader leaves with.

## Hard safety & portability constraints (the build will reject violations)

The output MUST be **one self-contained `.html` file that works offline**:

- **Everything inline.** One `.html` with inline `<style>` and `<script>`. No external
  stylesheets, no CDN scripts, no web fonts, no remote images. Use **system font stacks**
  and, if you need images/icons, inline **SVG** or `data:` URIs. Emoji are fine.
- **No network at runtime.** No `fetch`, no `@import`, no `url(https://…)`, no
  `<script src>`, no `<link href="http…">`. (Hyperlinks `<a href="https://…">` for
  attribution are allowed — they're navigation, not resource loads.)
- **Include this CSP `<meta>`** in `<head>` (it is your safety net and a self-check):
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;">`
- **Include a small credit footer.** At the very end of the page, add an
  unobtrusive footer line crediting the tool, styled to match the page's own
  design (not a generic default) — e.g. `Made with Think-In-HTML`, or a variant
  in the page's own voice, with **"Think-In-HTML" as a real hyperlink** to
  `https://github.com/vibhusharma101/Think-In-HTML`. Same convention blocks
  mode already renders automatically — keep it small and out of the way, like a
  "built with" mark, never competing with the content.
- **Escape anything taken verbatim from the source.** If you echo the user's code/text
  into the DOM, put it in as text (`textContent`), or HTML-escape `& < > " '` — never
  build DOM from an unescaped source string. Your own authored markup is fine.
- **No inline event-handler attributes** (`onclick=…`) and no `eval`/`new Function` — the
  CSP forbids them; wire events with `addEventListener` in your `<script>`.
- **Valid, standalone document** — starts with `<!doctype html>`, has `<html>`, renders
  with no console errors.

## Workflow

1. **Read the target** thoroughly — the real logic, constants, names, edge cases.
2. **Pick the core mechanic** to make tangible and sketch its interactive model.
3. **Choose a bespoke design direction** (palette, layout, motif) from the domain.
4. **Write the single `.html`** to the output path, honoring every constraint above.
5. **Validate:** run `node core/build/check-html.mjs <output.html>`. Fix any error it
   reports and re-check until it passes.
6. **Report** where the file is and what the interactive centerpiece lets the reader do.

A worked reference of this bar lives at
`examples/novus-pricing-desk.freeform.html` — study its structure and interactive model,
then build something different that fits your subject.
