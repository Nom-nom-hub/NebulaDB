# swarm-jsonl-ingest

A downstream tool that ingests [swarm-orchestrator](https://github.com/moonrunnerkc/swarm-orchestrator) JSONL ledger files into [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) for querying and analysis.

This tool is **not a vendored dependency** — it's a separate utility that reads the stable, documented JSONL ledger format and makes it queryable via NebulaDB's embedded query engine. No changes to the orchestrator are needed.

## Why?

swarm-orchestrator stores its runtime ledger in `.swarm/ledger/<run-id>.jsonl` — a hash-chained, append-only log that's excellent for integrity verification but not designed for ad-hoc queries. This tool gives you:

- **Filter by entry type** — `list obligation-satisfied`, `list candidate-recorded`
- **Cross-run stats** — aggregate token usage, obligation success rates, falsification results across multiple runs
- **Persona activity** — see everything a specific persona did across all runs
- **Obligation tracing** — follow a single obligation through its entire lifecycle
- **Search by any field** — find entries by adapter, status, score, etc.
- **Idempotent ingestion** — re-ingesting the same file skips existing data

## Install

```bash
cd examples/swarm-jsonl-ingest
npm install
npx tsc
```

## Usage

```bash
# Ingest a ledger file
node dist/index.js ingest /path/to/ledger.json

# List all entries (optionally filtered by type)
node dist/index.js list
node dist/index.js list obligation-satisfied

# Aggregate statistics
node dist/index.js stats

# List ingested runs
node dist/index.js runs

# Trace an obligation's lifecycle
node dist/index.js ob <runId> <obligationIndex>

# Search by any field
node dist/index.js search personaId architect

# Show falsification results
node dist/index.js falsification
```

## Format Support

Detects and handles two formats automatically:

| Format | Source | Fields |
|--------|--------|--------|
| JSONL (`.jsonl`) | Runtime ledger at `.swarm/ledger/<run-id>.jsonl` | Full header: `ts`, `runId`, `seq`, `prevHash`, `entryHash`, `type`, `payload` |
| JSON Array (`.json`) | Test fixtures in `evidence/` | Flat fields at top level with `runId` and `type` |

## Data Storage

Data persists at `~/.swarm-jsonl-ingest/db/` using NebulaDB's filesystem adapter. Each collection is stored as a JSON file on disk.

## How It Works

1. Reads a JSONL or JSON-Array ledger file
2. Normalizes entries (handling both runtime and fixture formats)
3. Flattens payload fields for indexed querying
4. Stores in NebulaDB with auto-generated timestamps and sequence numbers
5. Creates a run summary with metadata (contract hash, obligation count, duration)

## Commands

| Command | Description |
|---------|-------------|
| `ingest <file>` | Ingest a ledger file into NebulaDB |
| `list [type]` | List entries, optionally filtered by type |
| `stats` | Aggregate statistics across all data |
| `runs` | List all ingested runs |
| `ob <runId> <index>` | Trace an obligation's full lifecycle |
| `persona <personaId>` | Show all activity for a persona |
| `falsification` | Falsification results by adapter |
| `search <field> <value>` | Search entries by any field |
