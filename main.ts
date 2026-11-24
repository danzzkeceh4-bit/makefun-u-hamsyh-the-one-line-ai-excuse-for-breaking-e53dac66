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
// Reject control characters (other than the already-excluded newline)
// and accidental double spaces: either would silently change what the
// sealed scorer reads, so fail loudly instead of shipping it.
if (/[\u0000-\u001F\u007F]/.test(LINE)) {
  throw new Error("entry must not contain control characters");
}
if (LINE.includes("  ")) {
  throw new Error("entry must not contain consecutive spaces");
}

// Byte-length guard: the scorer reads raw bytes, so the UTF-8 byte
// length must stay within the same 180-byte budget as the code-point
// count — a line of 180 multi-byte characters would otherwise pass the
// code-point check but overflow the scorer's byte limit.
const byteLength = Buffer.byteLength(LINE, "utf8");
if (byteLength > 180) {
  throw new Error(
    `entry must be at most 180 bytes, got ${byteLength} bytes for ${codePoints.length} code points`
  );
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
