import { describe, it, expect } from "vitest";
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const CLI = path.resolve(__dirname, "..", "dist", "index.js");
const FIXTURE = "/tmp/swarm-orchestrator/evidence/phase-3-parity/population/satisfied-three-obligations/ledger.json";
const DB_DIR = path.join(os.homedir(), ".swarm-jsonl-ingest", "db");

/**
 * Run a CLI command and return { stdout, stderr, exitCode }.
 * Pipes input for commands that need it (e.g., reset confirmation).
 */
function run(args: string[], input?: string) {
  const result = spawnSync("node", [CLI, ...args], {
    input: input ?? undefined,
    encoding: "utf-8",
    timeout: 30_000,
  });
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    exitCode: result.status ?? 1,
  };
}

describe("swarm-jsonl-ingest integration", () => {
  // Guard: skip data-dependent tests if fixture isn't available
  const fixtureExists = fs.existsSync(FIXTURE);

  it("--help prints usage and exits 0", () => {
    const { stdout, exitCode } = run(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("swarm-jsonl-ingest");
    expect(stdout).toContain("ingest");
    expect(stdout).toContain("reset");
  });

  (fixtureExists ? it : it.skip)("ingest reads the fixture file and stores entries", () => {
    const { stdout, exitCode } = run(["ingest", FIXTURE]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("28 entries ingested");
    expect(stdout).toContain("obligation-satisfied(3)");
    expect(stdout).toContain("run-started(1)");
    expect(stdout).toContain("run-finished(1)");
  });

  (fixtureExists ? it : it.skip)("re-ingesting the same file is idempotent (skipped)", () => {
    const { stdout, exitCode } = run(["ingest", FIXTURE]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("already ingested");
    expect(stdout).toContain("0 entries ingested");
  });

  describe("queries", () => {
    (fixtureExists ? it : it.skip)("stats shows 28 entries and 1 run", () => {
      const { stdout, exitCode } = run(["stats"]);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/Total entries:\s+28/);
      expect(stdout).toMatch(/Total runs:\s+1/);
      expect(stdout).toMatch(/Unique personas:\s+3/);
      expect(stdout).toMatch(/Satisfied:\s+3/);
    });

    (fixtureExists ? it : it.skip)("list shows all entries unfiltered", () => {
      const { stdout, exitCode } = run(["list"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Entries: 28");
      expect(stdout).toContain("Total: 28 entries");
    });

    (fixtureExists ? it : it.skip)("list filtered by type returns correct count", () => {
      const { stdout, exitCode } = run(["list", "obligation-satisfied"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('filtered by type: "obligation-satisfied"');
      expect(stdout).toContain("✓");
      expect(stdout).toContain("Total: 3 entries");
    });

    (fixtureExists ? it : it.skip)("list filtered by a type not present returns empty", () => {
      const { stdout, exitCode } = run(["list", "obligation-failed"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("No entries found");
    });

    (fixtureExists ? it : it.skip)("runs lists the run summary", () => {
      const { stdout, exitCode } = run(["runs"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Runs: 1");
      expect(stdout).toContain("28 entries");
      expect(stdout).toContain("tournament parity capture");
    });

    (fixtureExists ? it : it.skip)("search finds entries by personaId", () => {
      const { stdout, exitCode } = run(["search", "personaId", "architect"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("5 matches");
      expect(stdout).toContain("architect");
    });

    (fixtureExists ? it : it.skip)("search with no matches returns empty", () => {
      const { stdout, exitCode } = run(["search", "personaId", "nonexistent"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("No entries found");
    });

    (fixtureExists ? it : it.skip)("persona shows activity for architect", () => {
      const { stdout, exitCode } = run(["persona", "architect"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Persona: "architect"');
      expect(stdout).toMatch(/Total entries:\s+5/);
    });

    (fixtureExists ? it : it.skip)("persona with unknown ID returns empty", () => {
      const { stdout, exitCode } = run(["persona", "ghost"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('No entries found for persona "ghost"');
    });

    (fixtureExists ? it : it.skip)("falsification shows no data for fixture file", () => {
      const { stdout, exitCode } = run(["falsification"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("No falsification data found");
    });

    (fixtureExists ? it : it.skip)("obligation trace works for obligation #0", () => {
      const { stdout, exitCode } = run(["ob", "<RUN>", "0"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Obligation #0");
      expect(stdout).toContain("obligation-satisfied");
    });

    (fixtureExists ? it : it.skip)("obligation trace with invalid index returns empty", () => {
      const { stdout, exitCode } = run(["ob", "<RUN>", "999"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("No entries found for obligation #999");
    });
  });

  describe("reset", () => {
    (fixtureExists ? it : it.skip)("reset prompts before deleting", () => {
      // Answer "no" — should cancel
      const { stdout, exitCode } = run(["reset"], "no\n");
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Reset cancelled");
    });

    (fixtureExists ? it : it.skip)("reset with confirmation clears the database", () => {
      // Verify data exists before reset
      expect(fs.existsSync(DB_DIR)).toBe(true);
      // Answer "yes"
      const { stdout, exitCode } = run(["reset"], "yes\n");
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Cleared persistence directory");
      // Verify data directory is gone
      expect(fs.existsSync(DB_DIR)).toBe(false);
    });

    (fixtureExists ? it : it.skip)("stats shows empty after reset", () => {
      const { stdout, exitCode } = run(["stats"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("No data ingested yet");
    });

    (fixtureExists ? it : it.skip)("runs shows empty after reset", () => {
      const { stdout, exitCode } = run(["runs"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("No runs found");
    });

    (fixtureExists ? it : it.skip)("reset on empty database reports no data", () => {
      const { stdout, exitCode } = run(["reset"], "yes\n");
      expect(exitCode).toBe(0);
      expect(stdout).toContain("No data directory found");
    });
  });
});
