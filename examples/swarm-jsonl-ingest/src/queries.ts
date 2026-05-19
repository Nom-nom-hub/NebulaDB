import type { ICollection, Document } from "@nebula-db/core";
import type { LedgerDocument } from "./types.js";

/** Format a number with commas */
function n(x: number): string {
  return x.toLocaleString();
}

/** Print a horizontal rule */
function hr() {
  console.log("─".repeat(60));
}

/** Format ISO timestamp to locale string */
function fmtTs(ts: string): string {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleString();
}

/** Cast a NebulaDB Document to LedgerDocument */
function asLedgerDoc(d: Document): LedgerDocument {
  return d as unknown as LedgerDocument;
}

/** Get a typed field from a document */
function getField<T>(doc: Document, field: string, defaultVal: T): T {
  return (doc as Record<string, unknown>)[field] as T ?? defaultVal;
}

/**
 * List all entries with optional type filter.
 */
export async function listEntries(collection: ICollection, typeFilter?: string) {
  const query = typeFilter ? { type: typeFilter } : {};
  const entries = await collection.find(query);

  if (entries.length === 0) {
    console.log("No entries found.");
    return;
  }

  // Sort by seq
  entries.sort((a, b) => (getField<number>(a, "seq", 0)) - (getField<number>(b, "seq", 0)));

  console.log(`\n📋 Entries: ${n(entries.length)}${typeFilter ? ` (filtered by type: "${typeFilter}")` : ""}`);
  hr();

  for (const entry of entries) {
    const ts = fmtTs(getField<string>(entry, "ts", ""));
    const seq = String(getField<number>(entry, "seq", 0)).padStart(4);
    const type = String(getField<string>(entry, "type", "")).padEnd(35);
    const info = summarizeEntry(entry);
    console.log(`  ${seq}  ${ts}  ${type}  ${info}`);
  }
  hr();
  console.log(`Total: ${n(entries.length)} entries\n`);
}

/**
 * Show aggregate statistics across all ingested entries.
 */
export async function showStats(collection: ICollection, runsCollection: ICollection) {
  const allEntries = await collection.find({});
  const allRuns = await runsCollection.find({});

  if (allEntries.length === 0) {
    console.log("\nNo data ingested yet. Use the `ingest` command first.\n");
    return;
  }

  // Count by type
  const typeCounts: Record<string, number> = {};
  for (const e of allEntries) {
    const type = getField<string>(e, "type", "unknown");
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  // Obligation stats
  const satisfied = allEntries.filter((e) => getField<string>(e, "type", "") === "obligation-satisfied").length;
  const failed = allEntries.filter((e) => getField<string>(e, "type", "") === "obligation-failed").length;
  const memoized = allEntries.filter((e) => getField<string>(e, "type", "") === "obligation-memoized").length;

  // Unique personas
  const personas = new Set<string>();
  for (const e of allEntries) {
    const pid = getField<string>(e, "personaId", "");
    if (pid) personas.add(pid);
  }

  // Time span
  const timestamps = allEntries
    .map((e) => getField<string>(e, "ts", ""))
    .filter(Boolean)
    .sort();
  const timeSpan = timestamps.length >= 2
    ? `${timestamps[0].slice(0, 10)} → ${timestamps[timestamps.length - 1].slice(0, 10)}`
    : "N/A";

  console.log(`\n📊 Ledger Statistics`);
  hr();
  console.log(`  Total entries:     ${n(allEntries.length)}`);
  console.log(`  Total runs:        ${n(allRuns.length)}`);
  console.log(`  Time span:         ${timeSpan}`);
  console.log(`  Unique personas:   ${personas.size}`);
  console.log(``);
  console.log(`  Obligations:`);
  console.log(`    Satisfied:       ${n(satisfied)}`);
  console.log(`    Failed:          ${n(failed)}`);
  console.log(`    Memoized:        ${n(memoized)}`);
  console.log(`    Total:           ${n(satisfied + failed + memoized)}`);
  console.log(``);
  console.log(`  Runs:`);
  console.log(`    Successful:      ${n(allRuns.filter((r) => getField<string>(r, "status", "") === "success").length)}`);
  console.log(`    Failed:          ${n(allRuns.filter((r) => getField<string>(r, "status", "") === "failure").length)}`);
  console.log(``);
  console.log(`  Entry Types:`);
  hr();

  // Sort by count descending
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const pct = ((count / allEntries.length) * 100).toFixed(1);
    console.log(`    ${type.padEnd(38)} ${String(count).padStart(6)} (${pct}%)`);
  }

  // Token usage if available
  let totalInput = 0;
  let totalOutput = 0;
  for (const e of allEntries) {
    if (getField<string>(e, "type", "") === "candidate-recorded") {
      try {
        const raw = JSON.parse(getField<string>(e, "rawPayload", "{}"));
        totalInput += raw.usage?.inputTokens || 0;
        totalOutput += raw.usage?.outputTokens || 0;
      } catch { /* skip */ }
    }
  }
  if (totalInput > 0 || totalOutput > 0) {
    console.log(``);
    console.log(`  Token Usage:`);
    console.log(`    Input tokens:    ${n(totalInput)}`);
    console.log(`    Output tokens:   ${n(totalOutput)}`);
  }

  hr();
}

/**
 * List all unique runs with their summaries.
 */
export async function listRuns(runsCollection: ICollection) {
  const runs = await runsCollection.find({});

  if (runs.length === 0) {
    console.log("\nNo runs found.\n");
    return;
  }

  console.log(`\n🏃 Runs: ${runs.length}`);
  hr();

  for (const run of runs) {
    const id = (getField<string>(run, "runId", "???").slice(0, 12));
    const started = fmtTs(getField<string>(run, "startedAt", ""));
    const obligations = getField<number>(run, "obligationCount", 0);
    const entries = getField<number>(run, "totalEntries", 0);
    const status = getField<string>(run, "status", "");
    const statusIcon = status === "success" ? "✅" : status === "failure" ? "❌" : "❓";
    console.log(`  ${statusIcon} ${id}...  ${started}  ${obligations} obligations  ${entries} entries`);
    const goal = getField<string>(run, "goal", "");
    if (goal) console.log(`     Goal: ${goal.slice(0, 80)}`);
  }
  hr();
}

/**
 * Find all entries related to a specific obligation index within a run.
 */
export async function obligationTrace(collection: ICollection, runId: string, obligationIndex: number) {
  const entries = await collection.find({ runId, obligationIndex });

  if (entries.length === 0) {
    console.log(`\nNo entries found for obligation #${obligationIndex} in run ${runId.slice(0, 12)}...\n`);
    return;
  }

  entries.sort((a, b) => (getField<number>(a, "seq", 0)) - (getField<number>(b, "seq", 0)));

  const obTypeEntry = entries.find((e) => getField<string>(e, "obligationType", ""));
  const obType = obTypeEntry ? getField<string>(obTypeEntry, "obligationType", "?") : "?";
  console.log(`\n🔍 Obligation #${obligationIndex} (${obType}) — ${entries.length} entries`);
  hr();

  for (const entry of entries) {
    const seq = String(getField<number>(entry, "seq", 0)).padStart(4);
    const type = String(getField<string>(entry, "type", "")).padEnd(35);
    const info = summarizeEntry(entry);
    console.log(`  ${seq}  ${type}  ${info}`);
  }
  hr();
}

/**
 * Find entries for a specific persona across all runs.
 */
export async function personaActivity(collection: ICollection, personaId: string) {
  const entries = await collection.find({ personaId });

  if (entries.length === 0) {
    console.log(`\nNo entries found for persona "${personaId}"\n`);
    return;
  }

  entries.sort((a, b) => (getField<number>(a, "seq", 0)) - (getField<number>(b, "seq", 0)));

  const runs = new Set(entries.map((e) => getField<string>(e, "runId", "")));
  const types: Record<string, number> = {};
  for (const e of entries) {
    const t = getField<string>(e, "type", "unknown");
    types[t] = (types[t] || 0) + 1;
  }

  console.log(`\n👤 Persona: "${personaId}"`);
  console.log(`  Runs involved:    ${runs.size}`);
  console.log(`  Total entries:    ${entries.length}`);
  console.log(`  Entry types:      ${Object.entries(types).map(([t, c]) => `${t}(${c})`).join(", ")}`);
  hr();

  for (const entry of entries.slice(0, 20)) {
    const ts = fmtTs(getField<string>(entry, "ts", ""));
    const run = getField<string>(entry, "runId", "?").slice(0, 8);
    const type = String(getField<string>(entry, "type", "")).padEnd(35);
    console.log(`  [${run}]  ${ts}  ${type}`);
  }

  if (entries.length > 20) {
    console.log(`  ... and ${entries.length - 20} more entries`);
  }
  hr();
}

/**
 * Show falsification results across runs.
 */
export async function falsificationSummary(collection: ICollection) {
  const calls = await collection.find({ type: "falsification-call" });

  if (calls.length === 0) {
    console.log("\nNo falsification data found.\n");
    return;
  }

  const byAdapter: Record<string, { calls: number; counterExamples: number; totalMs: number }> = {};
  for (const c of calls) {
    const adapter = getField<string>(c, "adapter", "unknown");
    if (!byAdapter[adapter]) byAdapter[adapter] = { calls: 0, counterExamples: 0, totalMs: 0 };
    byAdapter[adapter].calls++;
    byAdapter[adapter].counterExamples += getField<number>(c, "counterExamplesFound", 0);
    byAdapter[adapter].totalMs += getField<number>(c, "durationMs", 0);
  }

  console.log(`\n🔬 Falsification Summary — ${calls.length} total calls`);
  hr();
  for (const [adapter, data] of Object.entries(byAdapter)) {
    const avgMs = data.calls > 0 ? (data.totalMs / data.calls).toFixed(1) : "0";
    console.log(`  ${adapter.padEnd(25)} ${n(data.calls)} calls  ${n(data.counterExamples)} counterexamples  ${avgMs}ms avg`);
  }
  hr();
}

/**
 * Search entries by any field value.
 */
export async function search(collection: ICollection, field: string, value: string) {
  // Try exact match first
  let entries = await collection.find({ [field]: value });

  // If no results, try partial/contains via regex
  if (entries.length === 0) {
    entries = await collection.find({ [field]: { $regex: value, $options: "i" } });
  }

  if (entries.length === 0) {
    console.log(`\nNo entries found with ${field} = "${value}"\n`);
    return;
  }

  entries.sort((a, b) => (getField<number>(a, "seq", 0)) - (getField<number>(b, "seq", 0)));

  console.log(`\n🔎 Search: ${field} = "${value}" — ${entries.length} matches`);
  hr();

  for (const entry of entries.slice(0, 30)) {
    const seq = String(getField<number>(entry, "seq", 0)).padStart(4);
    const type = String(getField<string>(entry, "type", "")).padEnd(35);
    const info = summarizeEntry(entry);
    console.log(`  ${seq}  ${type}  ${info}`);
  }

  if (entries.length > 30) {
    console.log(`  ... and ${entries.length - 30} more entries`);
  }
  hr();
}

// ─── Helpers ────────────────────────────────────────────────────

function summarizeEntry(entry: Document): string {
  const type = getField<string>(entry, "type", "");
  const oi = getField<number>(entry, "obligationIndex", -1);
  const ot = getField<string>(entry, "obligationType", "");
  const pid = getField<string>(entry, "personaId", "");
  const idx = oi >= 0 ? `#${oi}` : "";

  switch (type) {
    case "run-started":
      return `obligations=${getField<number>(entry, "obligationCount", 0)}, mode=${getField<string>(entry, "mode", "")}`;
    case "run-finished":
      return `status=${getField<string>(entry, "status", "")}`;
    case "obligation-attempted":
      return `${idx} ${ot} by ${pid}`;
    case "obligation-satisfied":
      return `${idx} ${ot} ✓ by ${pid}`;
    case "obligation-failed":
      return `${idx} ${ot} ✗ ${(getField<string>(entry, "error", "")).slice(0, 40)}`;
    case "obligation-memoized":
      return `${idx} ${ot} (from ${(getField<string>(entry, "priorRunId", "")).slice(0, 8)}...)`;
    case "obligation-deterministic-attempted":
      return `${idx} strategy=${getField<string>(entry, "strategy", "")}`;
    case "obligation-deterministic-applied":
      return `${idx} ✓ strategy=${getField<string>(entry, "strategy", "")}`;
    case "obligation-deterministic-failed":
      return `${idx} ✗ strategy=${getField<string>(entry, "strategy", "")}`;
    case "candidate-recorded":
      return `${idx} candidate=${getField<number>(entry, "candidateIndex", -1)} by ${pid}`;
    case "candidate-discarded":
      return `${idx} candidate=${getField<number>(entry, "candidateIndex", -1)} score=${getField<number>(entry, "score", 0)} — ${(getField<string>(entry, "rationale", "")).slice(0, 40)}`;
    case "candidate-stream-aborted":
      return `${idx} candidate=${getField<number>(entry, "candidateIndex", -1)} bytes=${getField<number>(entry, "bytesReceived", 0)} — ${(getField<string>(entry, "reason", "")).slice(0, 40)}`;
    case "tournament-round-started":
      return `${idx} round=${getField<number>(entry, "roundIndex", 0)}`;
    case "tournament-winner-selected":
      return `${idx} winner=${pid} score=${getField<number>(entry, "score", 0)}`;
    case "tournament-escalated":
      return `${idx} round=${getField<number>(entry, "roundIndex", 0)}`;
    case "post-merge-verified":
      return `${idx} ${getField<string>(entry, "predicate", "")} ${getField<boolean>(entry, "passed", false) ? "✓" : "✗"}`;
    case "falsification-call":
      return `${idx} adapter=${getField<string>(entry, "adapter", "")} counterExamples=${getField<number>(entry, "counterExamplesFound", 0)}`;
    case "falsifier-dispatch-decision":
      return `${idx} decision=${getField<string>(entry, "decision", "")}`;
    case "workspace-snapshot":
      return `filesChanged=${getField<number>(entry, "filesChanged", 0)}`;
    case "obligation-rolled-back":
      return `${idx} trigger=${getField<string>(entry, "trigger", "")}`;
    case "obligation-pre-verified":
      return `${idx}`;
    default:
      return "";
  }
}
