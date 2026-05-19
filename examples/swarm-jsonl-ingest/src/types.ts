/**
 * Ledger entry type definitions for swarm-orchestrator's JSONL format.
 * Mirrors the types from swarm-orchestrator's src/ledger/types.ts
 */

/** Core header present in every ledger entry */
export interface LedgerEntryHeader {
  ts: string;
  runId: string;
  seq: number;
  prevHash: string;
  entryHash: string;
}

/** Provider attribution metadata */
export interface ProviderAttribution {
  provider?: string;
  modelId?: string;
  backend?: string;
  usageEstimated?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheWriteTokens?: number;
    cacheReadTokens?: number;
  };
}

/** Payload for each ledger entry type */
export interface LedgerEntryPayloadMap {
  "run-started": {
    contractId: string;
    contractHash: string;
    obligationCount: number;
    goal: string;
    mode: "tournament" | "single";
    repository: string;
    sha: string;
  };
  "run-finished": {
    status: "success" | "failure" | "aborted";
    satisfiedCount: number;
    failedCount: number;
    memoizedCount: number;
  };
  "run-resumed": {
    resumeOf: string;
    satisfiedCount: number;
    pendingCount: number;
  };
  "obligation-attempted": {
    obligationIndex: number;
    obligationType: string;
    personaId: string;
    providerAttribution?: ProviderAttribution;
  };
  "obligation-satisfied": {
    obligationIndex: number;
    obligationType: string;
    personaId: string;
    providerAttribution?: ProviderAttribution;
  };
  "obligation-failed": {
    obligationIndex: number;
    obligationType: string;
    personaId: string;
    error?: string;
    providerAttribution?: ProviderAttribution;
  };
  "obligation-memoized": {
    obligationIndex: number;
    obligationType: string;
    obligationKey: string;
    priorRunId: string;
    responseSha256: string;
  };
  "obligation-pre-verified": {
    obligationIndex: number;
    obligationType: string;
    responseSha256: string;
  };
  "obligation-rolled-back": {
    obligationIndex: number;
    obligationType: string;
    trigger: string;
    triggerType: string;
  };
  "obligation-deterministic-attempted": {
    obligationIndex: number;
    obligationType: string;
    strategy: string;
  };
  "obligation-deterministic-applied": {
    obligationIndex: number;
    obligationType: string;
    strategy: string;
    responseSha256: string;
  };
  "obligation-deterministic-failed": {
    obligationIndex: number;
    obligationType: string;
    strategy: string;
    error: string;
  };
  "candidate-recorded": {
    obligationIndex: number;
    candidateIndex: number;
    personaId: string;
    responseSha256: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
      cacheWriteTokens?: number;
      cacheReadTokens?: number;
    };
    providerAttribution?: ProviderAttribution;
  };
  "candidate-discarded": {
    obligationIndex: number;
    candidateIndex: number;
    personaId: string;
    reason: string;
    score: number;
  };
  "candidate-stream-aborted": {
    obligationIndex: number;
    candidateIndex: number;
    personaId: string;
    reason: string;
    bytesReceived: number;
  };
  "tournament-round-started": {
    obligationIndex: number;
    roundIndex: number;
    roundCap: number;
    personaIds: string[];
    temperature: number;
  };
  "tournament-winner-selected": {
    obligationIndex: number;
    winnerCandidateIndex: number;
    personaId: string;
    score: number;
    rationale: string;
    responseSha256: string;
  };
  "tournament-escalated": {
    obligationIndex: number;
    roundIndex: number;
    reason: string;
  };
  "post-merge-verified": {
    obligationIndex: number;
    predicate: string;
    passed: boolean;
  };
  "falsification-call": {
    obligationIndex: number;
    adapter: string;
    counterExamplesFound: number;
    durationMs: number;
  };
  "falsifier-dispatch-decision": {
    obligationIndex: number;
    decision: "dispatch" | "skip" | "error";
    reason: string;
  };
  "workspace-snapshot": {
    filesChanged: number;
    preBlobShas: string[];
    expectedPostBlobShas: string[];
  };
}

export type LedgerEntryType = keyof LedgerEntryPayloadMap;

/**
 * A single entry in the ledger.
 * Hash-chain header fields (ts, seq, prevHash, entryHash) are required in
 * the runtime JSONL format but may be absent in test fixture JSON arrays.
 * The parser will generate synthetic values for missing header fields.
 */
export interface LedgerEntry<T extends LedgerEntryType = LedgerEntryType> {
  /** Header fields (may be missing in fixture data) */
  ts?: string;
  runId: string;
  seq?: number;
  prevHash?: string;
  entryHash?: string;
  /** Discriminant */
  type: T;
  /** Type-specific payload fields */
  payload?: LedgerEntryPayloadMap[T];
  /** Additional flat fields that were hoisted from payload */
  [key: string]: unknown;
}

/** Flattened document stored in NebulaDB */
export interface LedgerDocument {
  id: string;
  /** Header */
  ts: string;
  runId: string;
  seq: number;
  prevHash: string;
  entryHash: string;
  /** Discriminant */
  type: string;
  /** Flattened payload fields */
  obligationIndex?: number;
  obligationType?: string;
  personaId?: string;
  contractId?: string;
  contractHash?: string;
  obligationCount?: number;
  status?: string;
  mode?: string;
  goal?: string;
  score?: number;
  rationale?: string;
  error?: string;
  trigger?: string;
  strategy?: string;
  responseSha256?: string;
  candidateIndex?: number;
  roundIndex?: number;
  roundCap?: number;
  temperature?: number;
  winnerCandidateIndex?: number;
  priorRunId?: string;
  obligationKey?: string;
  adapter?: string;
  counterExamplesFound?: number;
  durationMs?: number;
  decision?: string;
  passed?: boolean;
  predicate?: string;
  filesChanged?: number;
  /** Raw payload preserved for full detail */
  rawPayload?: string;
}
