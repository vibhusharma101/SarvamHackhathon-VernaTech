# /think-in-html

Generate an interactive HTML explainer from code, thinking transcripts, or text. The output is a single self-contained `.html` file that anyone can open in a browser — no server, no dependencies. **Every explainer is authored fresh — a different design and a different interactive model each time.**

## Arguments

$ARGUMENTS — the target to analyze (a file path, folder, or a description of what to explain).
Optional flags:
- `--mode code|thinking|text` — the kind of input (default `code`).
- `--blocks` — use the legacy template engine (schema-validated teaching blocks + preset skins) instead of freeform. Use only when the user explicitly wants the templated output.
- `-o <path>` — output file (default `output.html`).

## Default flow — Freeform (author the whole page on the fly)

This is the default. You design and build a complete, bespoke, interactive HTML file for
THIS subject — its own layout, its own visual system, its own interactive logic. **No two
outputs should look alike, and the interactive part must be driven by the subject's real
logic**, not decoration.

1. **Read the instructions.** Read `think-in-html/core/instructions/FREEFORM.md` (the quality rubric,
   the "make the core mechanic tangible" mandate, the variety requirement, and the hard
   self-contained safety constraints). Also read `think-in-html/core/instructions/mode-{mode}.md` for
   input-type guidance.

2. **Read the target thoroughly.** Understand the real logic, constants, names, and edge
   cases. If it's a folder, pick the single most teachable flow — don't try to cover
   everything.

3. **Pick the core mechanic to make tangible.** Decide the one dynamic the reader should
   be able to *play with*, and design a small working model of it that reimplements the
   subject's real rule (same formula/thresholds/states).

4. **Choose a bespoke design direction** from the domain — palette, layout, type, and a
   recurring motif — deliberately different from anything you've produced before.

5. **Write the single `.html`** to the output path with everything inline (CSS + JS), the
   required CSP `<meta>`, system fonts, and any imagery as inline SVG / `data:` URIs.
   Escape anything echoed verbatim from the source. No network at runtime.

6. **Validate self-containment:**
   ```
   node think-in-html/core/build/check-html.mjs output.html
   ```
   Fix every error it reports and re-check until it passes.

7. **Report.** Tell the user where the file is and, in one line, what the interactive
   centerpiece lets them do.

## Legacy flow — Blocks (`--blocks`)

Only when the user explicitly asks for the templated engine:

1. Read `think-in-html/core/instructions/ANALYZE.md` and `think-in-html/core/schema/analysis.schema.json`.
2. Compose an ordered `blocks` array (`hook`, `analogy`, `flow`, `steps`, `concept`,
   `code`, `compare`, `aha`, `quiz`, `recap`, `glossary`) and an optional bespoke `design`
   theme (ANALYZE.md → *Step 3*).
3. Write `analysis.json`, then `node think-in-html/core/build/inline.mjs analysis.json -o output.html`.
4. Report the output path; the reader can switch skins live in the 🎨 picker.

## Important

- **Freeform must pass `check-html.mjs`** — if it flags an external resource, inline it (or
  use a `data:` URI) and re-check. The file must work fully offline.
- **Different every time.** If your draft resembles a hero + card grid you've used before,
  choose a different structure. Let the subject pick the shape.
- **Real logic, not a cartoon.** The interactive model must reflect the source's actual
  behavior — read the code and use its real constants and names.
- **Teacher voice.** Explain like the reader is smart but new to this; gloss jargon in
  plain English.
- A worked reference at the intended quality bar:
  `examples/novus-pricing-desk.freeform.html`. Study it, then build something different.
