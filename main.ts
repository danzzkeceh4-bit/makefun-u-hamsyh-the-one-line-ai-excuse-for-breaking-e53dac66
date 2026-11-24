import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
// Output contract: /output/entry.txt holds exactly one line, the excuse,
// 102 code points, no trailing newline — the sealed scorer reads it verbatim.
// The program is fully deterministic: no network, no input, no randomness,
// so every run produces the same single line byte-for-byte.
const LINE =
  "I only pushed to production because the tests passed — and the tests only passed because I wrote them.";

// Validate the entry against the sealed scorer's gate before writing:
// 1-180 code points, exactly one line, and not whitespace-only.
// (Code points, not UTF-16 units, so multi-byte characters count as one.)
const codePoints = [...LINE];
if (codePoints.length < 1 || codePoints.length > 180) {
  throw new Error(`entry must be 1-180 code points, got ${codePoints.length}`);
}
if (LINE.trim().length === 0 || LINE.includes("\n")) {
  throw new Error("entry must be a single non-blank line");
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, "entry.txt"), LINE, "utf8");

// Read-back guard: the file on disk must be byte-identical to the
// validated constant, so a partial or truncated write fails loudly
// instead of shipping a corrupted entry to the scorer.
const written = readFileSync(join(OUTPUT_DIR, "entry.txt"), "utf8");
if (written !== LINE) {
  throw new Error("entry.txt read-back mismatch");
}
