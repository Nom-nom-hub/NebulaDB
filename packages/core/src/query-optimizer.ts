import type { Query, IndexDefinition } from './types';

/**
 * Query execution plan details
 */
export interface QueryPlan {
  /** Unique plan ID */
  planId: string;

  /** Original query */
  query: Query;

  /** Selected indexes (in order of use) */
  selectedIndexes: IndexDefinition[];

  /** Estimated number of documents to scan */
  estimatedRows: number;

  /** Cost estimate (lower is better) */
  cost: number;

  /** Whether full collection scan will be used */
  fullScan: boolean;

  /** Filter predicates and their selectivity */
  predicates: QueryPredicate[];

  /** Execution steps */
  steps: ExecutionStep[];

  /** Optimization notes */
  notes: string[];
}

/**
 * A single predicate in the query
 */
export interface QueryPredicate {
  /** Field being tested */
  field: string;

  /** Operator being used */
  operator: string;

  /** Estimated selectivity (0-1, where 1 means very selective) */
  selectivity: number;

  /** Estimated rows after this predicate */
  estimatedRows: number;
}

/**
 * Single execution step in query plan
 */
export interface ExecutionStep {
  /** Step type: INDEX_LOOKUP, FILTER, SORT, etc */
  type: 'INDEX_LOOKUP' | 'FILTER' | 'SORT' | 'LIMIT' | 'COLLECTION_SCAN';

  /** Description of this step */
  description: string;

  /** Estimated rows after this step */
  estimatedRows: number;

  /** Cost of this step */
  cost: number;

  /** Optional index used */
  indexName?: string;
}

/**
 * Query optimizer for NebulaDB
 * Analyzes queries and selects optimal execution strategy
 */
export class QueryOptimizer {
  private queryCache: Map<string, QueryPlan> = new Map();
  private stats: Map<string, FieldStats> = new Map();

  /**
   * Optimize a query given available indexes
   */
  analyzeQuery(
    query: Query,
    indexes: IndexDefinition[],
    collectionSize: number
  ): QueryPlan {
    // Check cache first
    const cacheKey = JSON.stringify({ query, indexCount: indexes.length });
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const plan: QueryPlan = {
      planId: this.generatePlanId(),
      query,
      selectedIndexes: [],
      estimatedRows: collectionSize,
      cost: 0,
      fullScan: true,
      predicates: [],
      steps: [],
      notes: []
    };

    // Extract predicates from query
    const predicates = this.extractPredicates(query);
    plan.predicates = predicates;

    // Score indexes for this query
    const scoredIndexes = this.scoreIndexes(query, indexes, predicates);

    // Select best indexes
    if (scoredIndexes.length > 0) {
      const bestIndex = scoredIndexes[0];

      if (bestIndex.score > 0.5) {
        // Index is worth using
        plan.selectedIndexes = [bestIndex.index];
        plan.fullScan = false;
        plan.notes.push(
          `Using index '${bestIndex.index.name}' (score: ${bestIndex.score.toFixed(2)})`
        );

        // Calculate cost of index lookup
        const indexLookupCost = Math.log(collectionSize) + 1;
        plan.steps.push({
          type: 'INDEX_LOOKUP',
          description: `Lookup in index '${bestIndex.index.name}'`,
          estimatedRows: Math.ceil(collectionSize * bestIndex.selectivity),
          cost: indexLookupCost,
          indexName: bestIndex.index.name
        });

        plan.estimatedRows = Math.ceil(collectionSize * bestIndex.selectivity);
        plan.cost += indexLookupCost;
      } else {
        plan.notes.push('No suitable indexes found, using full collection scan');
      }
    } else {
      plan.notes.push('No indexes available');
    }

    // Add filter steps for remaining predicates
    if (predicates.length > 1 && plan.selectedIndexes.length > 0) {
      const remainingPredicates = predicates.slice(1);
      for (const pred of remainingPredicates) {
        const filterCost = plan.estimatedRows * 0.1; // Estimate filter cost
        plan.steps.push({
          type: 'FILTER',
          description: `Filter on field '${pred.field}' (${pred.operator})`,
          estimatedRows: Math.ceil(plan.estimatedRows * pred.selectivity),
          cost: filterCost
        });

        plan.estimatedRows *= pred.selectivity;
        plan.cost += filterCost;
      }
    }

    // Add full scan step if needed
    if (plan.fullScan) {
      const scanCost = collectionSize * 0.5; // Linear scan cost
      plan.steps.unshift({
        type: 'COLLECTION_SCAN',
        description: 'Full collection scan',
        estimatedRows: collectionSize,
        cost: scanCost
      });

      plan.cost += scanCost;
    }

    // Cache the plan
    this.queryCache.set(cacheKey, plan);

    return plan;
  }

  /**
   * Extract query predicates
   */
  private extractPredicates(query: Query): QueryPredicate[] {
    const predicates: QueryPredicate[] = [];

    if (!query || typeof query !== 'object') {
      return predicates;
    }

    for (const [field, condition] of Object.entries(query)) {
      if (field.startsWith('$')) {
        // Logical operator, skip for now
        continue;
      }

      let operator = '$eq';
      let selectivity = 0.1; // Default: moderately selective

      if (typeof condition === 'object' && condition !== null) {
        // Extract operator and selectivity
        if ('$eq' in condition) {
          operator = '$eq';
          selectivity = 0.05; // Equality is very selective
        } else if ('$gt' in condition || '$gte' in condition) {
          operator = condition.$gt ? '$gt' : '$gte';
          selectivity = 0.3; // Range is moderately selective
        } else if ('$lt' in condition || '$lte' in condition) {
          operator = condition.$lt ? '$lt' : '$lte';
          selectivity = 0.3;
        } else if ('$in' in condition) {
          operator = '$in';
          selectivity = Math.min(0.2, condition.$in.length * 0.05);
        } else if ('$regex' in condition) {
          operator = '$regex';
          selectivity = 0.15; // Regex is moderately selective
        }
      } else {
        // Simple equality
        operator = '$eq';
        selectivity = 0.05;
      }

      predicates.push({
        field,
        operator,
        selectivity,
        estimatedRows: 0 // Will be filled in later
      });
    }

    // Sort by selectivity (most selective first)
    predicates.sort((a, b) => a.selectivity - b.selectivity);

    return predicates;
  }

  /**
   * Score indexes for relevance to query
   */
  private scoreIndexes(
    query: Query,
    indexes: IndexDefinition[],
    predicates: QueryPredicate[]
  ): Array<{ index: IndexDefinition; score: number; selectivity: number }> {
    if (predicates.length === 0 || indexes.length === 0) {
      return [];
    }

    const scored: Array<{ index: IndexDefinition; score: number; selectivity: number }> = [];

    for (const index of indexes) {
      let score = 0;
      let selectivity = 1;

      // Check how many predicates this index covers
      const coveredPredicates = predicates.filter(pred =>
        index.fields.includes(pred.field)
      );

      if (coveredPredicates.length === 0) {
        continue; // Index not useful for this query
      }

      // Score based on coverage and selectivity
      const coverageRatio = coveredPredicates.length / predicates.length;
      const avgSelectivity = coveredPredicates.reduce((sum, p) => sum + p.selectivity, 0) /
        coveredPredicates.length;

      // Prefer indexes that cover more fields
      score += coverageRatio * 0.6;

      // Prefer indexes on selective fields
      score += avgSelectivity * 0.4;

      // Boost compound indexes
      if (index.fields.length > 1) {
        score *= 1.2;
      }

      selectivity = avgSelectivity;

      scored.push({ index, score, selectivity });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Update field statistics
   */
  updateFieldStats(field: string, cardinality: number, distinctValues: number): void {
    this.stats.set(field, {
      field,
      cardinality,
      distinctValues,
      selectivity: distinctValues / Math.max(cardinality, 1),
      updatedAt: Date.now()
    });
  }

  /**
   * Get field statistics
   */
  getFieldStats(field: string): FieldStats | undefined {
    return this.stats.get(field);
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; plans: string[] } {
    return {
      size: this.queryCache.size,
      plans: Array.from(this.queryCache.keys())
    };
  }

  /**
   * Generate a unique plan ID
   */
  private generatePlanId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format plan as human-readable string
   */
  formatPlan(plan: QueryPlan): string {
    let output = `\n${'═'.repeat(60)}\nQuery Plan: ${plan.planId}\n${'═'.repeat(60)}\n`;

    output += `\nEstimated Rows: ${plan.estimatedRows}\n`;
    output += `Total Cost: ${plan.cost.toFixed(2)}\n`;
    output += `Full Scan: ${plan.fullScan ? 'Yes' : 'No'}\n`;

    if (plan.selectedIndexes.length > 0) {
      output += `\nSelected Indexes:\n`;
      for (const idx of plan.selectedIndexes) {
        output += `  • ${idx.name} (${idx.fields.join(', ')})\n`;
      }
    }

    if (plan.predicates.length > 0) {
      output += `\nPredicates:\n`;
      for (const pred of plan.predicates) {
        output += `  • ${pred.field} ${pred.operator} (selectivity: ${(pred.selectivity * 100).toFixed(1)}%)\n`;
      }
    }

    if (plan.steps.length > 0) {
      output += `\nExecution Steps:\n`;
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        output += `  ${i + 1}. ${step.type}\n`;
        output += `     ${step.description}\n`;
        output += `     Rows: ${step.estimatedRows}, Cost: ${step.cost.toFixed(2)}\n`;
      }
    }

    if (plan.notes.length > 0) {
      output += `\nNotes:\n`;
      for (const note of plan.notes) {
        output += `  • ${note}\n`;
      }
    }

    output += `\n${'═'.repeat(60)}\n`;

    return output;
  }
}

/**
 * Field statistics for optimization
 */
export interface FieldStats {
  field: string;
  cardinality: number;
  distinctValues: number;
  selectivity: number;
  updatedAt: number;
}
