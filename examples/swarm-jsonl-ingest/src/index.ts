#!/usr/bin/env node

/**
 * swarm-jsonl-ingest — Ingest swarm-orchestrator JSONL ledgers into NebulaDB.
 *
 * Usage:
 *   node dist/index.js ingest <file>             Parse and ingest a JSONL ledger file
 *   node dist/index.js list [type]               List entries (optionally filtered by type)
 *   node dist/index.js stats                     Show aggregate statistics
 *   node dist/index.js runs                      List all ingested runs
 *   node dist/index.js ob <runId> <index>        Trace an obligation's lifecycle
 *   node dist/index.js persona <personaId>       Show persona activity
 *   node dist/index.js falsification             Show falsification summary
 *   node dist/index.js search <field> <value>    Search entries by any field value
 *   node dist/index.js reset                     Delete all persisted data
 */

import readline from "readline";
import { initDb, resetDb } from "./db.js";
import { ingestFile } from "./ingest.js";
import {
  listEntries,
  showStats,
  listRuns,
  obligationTrace,
  personaActivity,
  falsificationSummary,
  search,
} from "./queries.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  // `reset` doesn't need DB initialization
  if (command === "reset") {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question("  ⚠  Delete ALL persisted data? This cannot be undone. (yes/no): ", resolve);
    });
    rl.close();
    if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
      resetDb();
    } else {
      console.log("  Reset cancelled.");
    }
    return;
  }

  const { db, entries, runs } = initDb();

  try {
    switch (command) {
      case "ingest": {
        const filePath = args[1];
        if (!filePath) {
          console.error("❌ Usage: swarm-jsonl-ingest ingest <file>");
          process.exit(1);
        }
        const result = await ingestFile(entries, runs, filePath);
        if (result.ingestedEntries > 0) {
          console.log("  Persisting to disk...");
          await db.save();
        }
        console.log(`\n✅ Done — ${result.ingestedEntries} entries ingested from ${result.filePath}`);
        if (result.entryTypes && Object.keys(result.entryTypes).length > 0) {
          console.log(`   Entry types: ${Object.entries(result.entryTypes).map(([t, c]) => `${t}(${c})`).join(", ")}`);
        }
        break;
      }

      case "list": {
        const typeFilter = args[1];
        await listEntries(entries, typeFilter);
        break;
      }

      case "stats": {
        await showStats(entries, runs);
        break;
      }

      case "runs": {
        await listRuns(runs);
        break;
      }

      case "ob":
      case "obligation": {
        const runId = args[1];
        const index = parseInt(args[2], 10);
        if (!runId || isNaN(index)) {
          console.error("❌ Usage: swarm-jsonl-ingest ob <runId> <obligationIndex>");
          process.exit(1);
        }
        await obligationTrace(entries, runId, index);
        break;
      }

      case "persona": {
        const personaId = args[1];
        if (!personaId) {
          console.error("❌ Usage: swarm-jsonl-ingest persona <personaId>");
          process.exit(1);
        }
        await personaActivity(entries, personaId);
        break;
      }

      case "falsification":
      case "falsify": {
        await falsificationSummary(entries);
        break;
      }

      case "search": {
        const field = args[1];
        const value = args[2];
        if (!field || !value) {
          console.error("❌ Usage: swarm-jsonl-ingest search <field> <value>");
          process.exit(1);
        }
        await search(entries, field, value);
        break;
      }

      default: {
        console.error(`❌ Unknown command: "${command}"`);
        printHelp();
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`\n❌ Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║            swarm-jsonl-ingest                          ║
║  Ingest swarm-orchestrator JSONL ledgers into NebulaDB  ║
╚══════════════════════════════════════════════════════════╝

USAGE
  swarm-jsonl-ingest <command> [options]

COMMANDS
  ingest <file>              Parse and ingest a JSONL ledger file
  list [type]                List all entries (optionally filter by type)
  stats                      Show aggregate statistics across all data
  runs                       List all ingested runs with summaries
  ob <runId> <index>         Trace a specific obligation's lifecycle
  persona <personaId>        Show all activity for a persona
  falsification              Show falsification results across runs
  search <field> <value>     Search entries by any field value
  reset                      Delete all persisted data

EXAMPLES
  swarm-jsonl-ingest ingest ./ledger.json
  swarm-jsonl-ingest list obligation-satisfied
  swarm-jsonl-ingest stats
  swarm-jsonl-ingest ob 9c6d05a16d6b7d71 0
  swarm-jsonl-ingest persona architect
  swarm-jsonl-ingest search personaId architect
  swarm-jsonl-ingest reset
`);
}

main();
