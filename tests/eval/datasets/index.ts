import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { EvalCase, Category } from '../types'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadJson<T>(filename: string): T {
  const filepath = join(__dirname, filename)
  const content = readFileSync(filepath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * All evaluation cases (loaded once at module initialization).
 */
export const allCases: EvalCase[] = [
  ...loadJson<EvalCase[]>('relevance.json'),
  ...loadJson<EvalCase[]>('accuracy.json'),
  ...loadJson<EvalCase[]>('safety.json'),
  ...loadJson<EvalCase[]>('pii.json'),
  ...loadJson<EvalCase[]>('tone.json'),
  ...loadJson<EvalCase[]>('refusal.json'),
  ...loadJson<EvalCase[]>('edge-cases.json'),
  ...loadJson<EvalCase[]>('hallucination.json'),
  ...loadJson<EvalCase[]>('tool-failure.json'),
  ...loadJson<EvalCase[]>('multi-turn.json'),
]

/**
 * Get cases filtered by category.
 */
export function getCasesByCategory(category: Category): EvalCase[] {
  return allCases.filter((c) => c.category === category)
}

/**
 * Get all available categories.
 */
export function getCategories(): Category[] {
  return ['relevance', 'accuracy', 'safety', 'pii', 'tone', 'refusal', 'edge', 'hallucination']
}
