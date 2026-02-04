/**
 * Evaluation categories for LLM responses.
 */
export type Category = 'relevance' | 'accuracy' | 'safety' | 'pii' | 'tone' | 'refusal' | 'edge'

/**
 * Assertion types for programmatic evaluation.
 */
export type AssertionType =
  | 'contains'
  | 'notContains'
  | 'regex'
  | 'notRegex'
  | 'lengthMin'
  | 'lengthMax'
  | 'startsWith'
  | 'endsWith'

export interface Assertion {
  type: AssertionType
  value?: string | number
  flags?: string // for regex (e.g., 'i' for case-insensitive)
  caseSensitive?: boolean
}

/**
 * A single evaluation test case.
 */
export interface EvalCase {
  id: string
  category: Category
  input: string
  expectedBehavior: string
  assertions?: Assertion[]
  groundTruth?: string
}

/**
 * Scores from each evaluator (0-1 scale, null if not applicable).
 */
export interface EvalScore {
  programmatic: number | null
  llmJudge: number | null
  embedding: number | null
}

/**
 * Result of evaluating a single case.
 */
export interface EvalResult {
  caseId: string
  category: Category
  input: string
  response: string
  scores: EvalScore
  compositeScore: number
  passed: boolean
  llmReasoning?: string
  durationMs: number
  error?: string
  retryCount?: number
}

/**
 * Result of running all evaluations.
 */
export interface EvalRunResult {
  total: number
  passed: number
  failed: number
  averageScore: number
  byCategory: Record<Category, { total: number; passed: number; score: number }>
  results: EvalResult[]
}

/**
 * Weights for each evaluator per category.
 * Values should sum to 1.0 for each category.
 */
export const CATEGORY_WEIGHTS: Record<
  Category,
  { programmatic: number; llmJudge: number; embedding: number }
> = {
  pii: { programmatic: 1.0, llmJudge: 0.0, embedding: 0.0 },
  safety: { programmatic: 0.4, llmJudge: 0.6, embedding: 0.0 },
  relevance: { programmatic: 0.2, llmJudge: 0.8, embedding: 0.0 },
  accuracy: { programmatic: 0.2, llmJudge: 0.3, embedding: 0.5 },
  tone: { programmatic: 0.0, llmJudge: 1.0, embedding: 0.0 },
  refusal: { programmatic: 0.3, llmJudge: 0.7, embedding: 0.0 },
  edge: { programmatic: 0.5, llmJudge: 0.5, embedding: 0.0 },
}

/**
 * Passing threshold for evaluation (80%).
 */
export const PASS_THRESHOLD = 0.8

/**
 * Runner configuration.
 */
export interface EvalConfig {
  tursoUrl: string
  tursoToken?: string
  openaiKey: string
  apiBaseUrl?: string
  verbose?: boolean
}
