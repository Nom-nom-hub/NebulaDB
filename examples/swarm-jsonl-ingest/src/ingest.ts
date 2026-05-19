import fs from "fs";
import path from "path";
import readline from "readline";
import type { ICollection } from "@nebula-db/core";
import type { LedgerDocument, LedgerEntry } from "./types.js";

/**
 * Detect file format: JSONL (one JSON object per line) or JSON array.
 * Returns "jsonl", "json-array", or throws on empty/unknown.
 */
function detectFormat(filePath: string): "jsonl" | "json-array" {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  if (!content) throw new Error("File is empty");

  if (content.startsWith("[")) return "json-array";
  return "jsonl";
}

/**
 * Parse a JSONL file (one JSON object per line).
 */
async function* parseJsonlStream(filePath: string): AsyncGenerator<LedgerEntry> {
  const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const raw = JSON.parse(trimmed);
      if (!raw.runId || !raw.type) {
        console.warn(`  ⚠  Line ${lineNum}: Skipping malformed entry (missing runId/type)`);
        continue;
      }
      yield normalizeEntry(raw, lineNum);
    } catch (err) {
      console.warn(`  ⚠  Line ${lineNum}: Skipping invalid JSON: ${(err as Error).message}`);
    }
  }
}

/**
 * Parse a JSON array file.
 */
async function* parseJsonArray(filePath: string): AsyncGenerator<LedgerEntry> {
  const content = fs.readFileSync(filePath, "utf-8");
  let entries: unknown[];

  try {
    entries = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse JSON array: ${(err as Error).message}`);
  }

  if (!Array.isArray(entries)) {
    throw new Error("Expected JSON array at top level");
  }

  for (let i = 0; i < entries.length; i++) {
    const raw = entries[i];
    try {
      if (!raw || typeof raw !== "object") {
        console.warn(`  ⚠  Entry ${i}: Skipping non-object element`);
        continue;
      }
      const obj = raw as Record<string, unknown>;
      if (!obj.runId || !obj.type) {
        console.warn(`  ⚠  Entry ${i}: Skipping malformed entry (missing runId/type): ${JSON.stringify(obj).slice(0, 100)}`);
        continue;
      }
      yield normalizeEntry(obj, i);
    } catch (err) {
      console.warn(`  ⚠  Entry ${i}: Skipping invalid entry: ${(err as Error).message}`);
    }
  }
}

/**
 * Normalize a raw entry object to a LedgerEntry.
 * Handles two formats:
 *   1. Runtime JSONL: has ts, runId, seq, prevHash, entryHash, type, payload
 *   2. Fixture JSON array: flat fields (runId, type, obligationIndex, etc.), no hash-chain headers
 */
function normalizeEntry(raw: Record<string, unknown>, _index: number): LedgerEntry {
  const runId = String(raw.runId);
  const type = String(raw.type);

  // Check if this is a runtime format (has nested payload) or fixture format (flat fields)
  const hasNestedPayload = raw.payload !== undefined && typeof raw.payload === "object";

  // Extract or synthesize header fields
  const ts: string | undefined = raw.ts ? String(raw.ts) : undefined;
  const seq: number | undefined = raw.seq !== undefined ? Number(raw.seq) : undefined;
  const prevHash: string | undefined = raw.prevHash ? String(raw.prevHash) : undefined;
  const entryHash: string | undefined = raw.entryHash ? String(raw.entryHash) : undefined;

  // Build the entry
  const entry: Record<string, unknown> = {
    runId,
    type,
  };

  if (ts) entry["ts"] = ts;
  if (seq !== undefined) entry["seq"] = seq;
  if (prevHash) entry["prevHash"] = prevHash;
  if (entryHash) entry["entryHash"] = entryHash;

  if (hasNestedPayload) {
    entry["payload"] = raw.payload;
  } else {
    // Fixture format: copy all extra fields to the entry level
    // These will be hoisted by entryToDocument for indexed querying
    for (const key of Object.keys(raw)) {
      if (!(key in entry)) {
        entry[key] = raw[key];
      }
    }
  }

  return entry as unknown as LedgerEntry;
}

/**
 * Convert a LedgerEntry into a flat LedgerDocument suitable for NebulaDB storage.
 * Supports two formats:
 *   1. Runtime JSONL format: header fields + nested payload object
 *   2. Fixture format: flat fields at top level, no hash-chain headers
 */
function entryToDocument(entry: LedgerEntry): LedgerDocument {
  // Determine the source of payload fields
  const hasNestedPayload = entry.payload !== undefined;
  const payload = (entry.payload || {}) as Record<string, unknown>;

  // Generate synthetic header fields if missing
  const syntheticTs = entry.ts || new Date().toISOString();
  const syntheticSeq = entry.seq ?? 0;
  const syntheticId = entry.entryHash || `${entry.runId}-${syntheticSeq}`;

  const doc: LedgerDocument = {
    id: syntheticId,
    ts: syntheticTs,
    runId: entry.runId,
    seq: syntheticSeq,
    prevHash: entry.prevHash || "",
    entryHash: entry.entryHash || "",
    type: entry.type,
    rawPayload: hasNestedPayload ? JSON.stringify(payload) : JSON.stringify(entry),
  };

  // Collect payload fields from either the nested payload object or the entry itself
  // For fixture format, the entry IS the payload (no nesting)
  const sourceFields: Record<string, unknown> = hasNestedPayload
    ? payload
    : { ...entry } as Record<string, unknown>;

  // Remove header fields from source
  delete sourceFields["ts"];
  delete sourceFields["runId"];
  delete sourceFields["seq"];
  delete sourceFields["prevHash"];
  delete sourceFields["entryHash"];
  delete sourceFields["type"];
  delete sourceFields["payload"];

  // Hoist all remaining payload fields to top level for indexed querying
  const hoistFields = [
    "obligationIndex", "obligationType", "personaId",
    "contractId", "contractHash", "obligationCount",
    "status", "mode", "goal", "score", "rationale",
    "error", "trigger", "strategy", "responseSha256",
    "candidateIndex", "roundIndex", "roundCap", "temperature",
    "winnerCandidateIndex", "priorRunId", "obligationKey",
    "adapter", "counterExamplesFound", "durationMs",
    "decision", "passed", "predicate", "filesChanged",
    "providerAttribution",
  ];

  for (const field of hoistFields) {
    if (field in sourceFields) {
      (doc as any)[field] = sourceFields[field];
    }
  }

  return doc;
}

/**
 * Extract a run summary from the first run-started and any run-finished entries.
 * Handles both nested payload (runtime format) and flat fields (fixture format).
 */
function parseRunSummary(entries: LedgerEntry[]) {
  const started = entries.find((e) => e.type === "run-started");
  const finished = entries.find((e) => e.type === "run-finished");

  if (!started) return null;

  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];

  const startedPayload = (started.payload || {}) as Record<string, unknown>;
  const finishedPayload = (finished?.payload || {}) as Record<string, unknown>;

  // For fixture format, fields are at the top level of the entry
  const startedFields = started.payload ? startedPayload : { ...started } as Record<string, unknown>;
  const finishedFields = finished?.payload ? finishedPayload : (finished ? { ...finished } as Record<string, unknown> : {});

  return {
    id: firstEntry.runId,
    runId: firstEntry.runId,
    contractId: startedFields.contractId as string | undefined,
    contractHash: startedFields.contractHash as string | undefined,
    obligationCount: startedFields.obligationCount as number | undefined,
    goal: startedFields.goal as string | undefined,
    mode: startedFields.mode as string | undefined,
    repository: startedFields.repository as string | undefined,
    sha: startedFields.sha as string | undefined,
    totalEntries: entries.length,
    startedAt: firstEntry.ts || "",
    finishedAt: lastEntry?.ts || firstEntry.ts || "",
    status: (finishedFields.status as string) || "unknown",
  };
}

/**
 * Ingest a JSONL or JSON-array ledger file into NebulaDB.
 * Returns summary stats about what was ingested.
 */
export async function ingestFile(
  entriesCollection: ICollection,
  runsCollection: ICollection,
  filePath: string
): Promise<{
  filePath: string;
  totalEntries: number;
  ingestedEntries: number;
  runId: string | null;
  entryTypes: Record<string, number>;
}> {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  const stat = fs.statSync(absPath);
  const fileSizeKb = (stat.size / 1024).toFixed(1);
  const format = detectFormat(absPath);
  console.log(`\n📄 Reading: ${absPath} (${fileSizeKb} KB, format: ${format})`);

  // Parse all entries
  const parsedEntries = await parseEntries(absPath);

  if (parsedEntries.length === 0) {
    console.log("  No valid entries found in file.");
    return { filePath: absPath, totalEntries: 0, ingestedEntries: 0, runId: null, entryTypes: {} };
  }

  console.log(`  Parsed ${parsedEntries.length} entries`);

  // Convert to documents and count by type
  const docs = parsedEntries.map(entryToDocument);
  const entryTypes: Record<string, number> = {};
  for (const entry of parsedEntries) {
    entryTypes[entry.type] = (entryTypes[entry.type] || 0) + 1;
  }

  // Check if this run already exists — skip if already ingested
  const runId = parsedEntries[0].runId;
  const existing = await entriesCollection.find({ runId });
  if (existing.length > 0) {
    console.log(`  ⚠  Run ${runId.slice(0, 12)}... already ingested (${existing.length} entries exist) — skipping`);
    return {
      filePath: absPath,
      totalEntries: parsedEntries.length,
      ingestedEntries: 0,
      runId,
      entryTypes,
    };
  }

  // Batch insert into NebulaDB
  console.log(`  Ingesting ${docs.length} documents...`);
  await entriesCollection.insertBatch(docs);
  console.log(`  ✅ ${docs.length} entries stored in NebulaDB`);

  // Create run summary
  const summary = parseRunSummary(parsedEntries);
  if (summary) {
    await runsCollection.insert(summary);
    console.log(`  📊 Run summary created (${summary.totalEntries} entries, ${summary.obligationCount} obligations)`);
  }

  return {
    filePath: absPath,
    totalEntries: parsedEntries.length,
    ingestedEntries: docs.length,
    runId,
    entryTypes,
  };
}

/**
 * Parse entries from a ledger file, auto-detecting the format.
 */
async function parseEntries(filePath: string): Promise<LedgerEntry[]> {
  const format = detectFormat(filePath);
  const generator = format === "jsonl" ? parseJsonlStream(filePath) : parseJsonArray(filePath);

  const entries: LedgerEntry[] = [];
  for await (const entry of generator) {
    entries.push(entry);
  }
  return entries;
}
