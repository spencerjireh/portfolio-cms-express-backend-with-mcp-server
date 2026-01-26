import { createClient, type Client } from '@libsql/client'
import type { EvalCase, EvalConfig, EvalResult, EvalRunResult, EvalScore, Category } from './types'
import { CATEGORY_WEIGHTS, PASS_THRESHOLD } from './types'
import { getAllSeedContent, EVAL_SESSION_PREFIX, EVAL_CONTENT_PREFIX } from './fixtures'
import {
  evaluateProgrammatic,
  evaluateLlmJudge,
  evaluateEmbedding,
  computeComposite,
} from './evaluators'

const RATE_LIMIT_DELAY = 100 // ms between OpenAI calls

/**
 * Evaluation runner that seeds data, runs evaluations, and cleans up.
 */
export class EvalRunner {
  private dbClient: Client
  private openaiKey: string
  private apiBaseUrl: string
  private verbose: boolean

  constructor(config: EvalConfig) {
    this.dbClient = createClient({
      url: config.tursoUrl,
      authToken: config.tursoToken,
    })
    this.openaiKey = config.openaiKey
    this.apiBaseUrl = config.apiBaseUrl ?? 'http://localhost:3000'
    this.verbose = config.verbose ?? false
  }

  /**
   * Seeds the database with evaluation content.
   */
  async seed(): Promise<void> {
    if (this.verbose) {
      console.log('Seeding evaluation data...')
    }

    const seedContent = getAllSeedContent()
    const now = new Date().toISOString()

    for (const content of seedContent) {
      // Upsert content
      await this.dbClient.execute({
        sql: `INSERT OR REPLACE INTO content
              (id, type, slug, data, status, version, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          content.id,
          content.type,
          content.slug,
          JSON.stringify(content.data),
          content.status,
          content.version,
          content.sortOrder,
          now,
          now,
        ],
      })
    }

    if (this.verbose) {
      console.log(`Seeded ${seedContent.length} content items`)
    }
  }

  /**
   * Cleans up evaluation sessions and content.
   */
  async clean(): Promise<void> {
    if (this.verbose) {
      console.log('Cleaning up evaluation data...')
    }

    // Delete eval sessions
    await this.dbClient.execute({
      sql: 'DELETE FROM chat_messages WHERE session_id LIKE ?',
      args: [`${EVAL_SESSION_PREFIX}%`],
    })

    await this.dbClient.execute({
      sql: 'DELETE FROM chat_sessions WHERE id LIKE ?',
      args: [`${EVAL_SESSION_PREFIX}%`],
    })

    // Delete eval content
    await this.dbClient.execute({
      sql: 'DELETE FROM content WHERE id LIKE ?',
      args: [`${EVAL_CONTENT_PREFIX}%`],
    })

    if (this.verbose) {
      console.log('Cleanup complete')
    }
  }

  /**
   * Runs evaluation for a single case.
   */
  async runCase(evalCase: EvalCase): Promise<EvalResult> {
    const start = performance.now()
    const sessionId = `${EVAL_SESSION_PREFIX}${evalCase.id}-${Date.now()}`

    if (this.verbose) {
      console.log(`  Running: ${evalCase.id}`)
    }

    // Call chat API
    const response = await this.callChatApi(sessionId, evalCase.input)

    // Rate limit
    await this.delay(RATE_LIMIT_DELAY)

    // Run applicable evaluators based on category weights
    const weights = CATEGORY_WEIGHTS[evalCase.category]
    const scores: EvalScore = {
      programmatic: null,
      llmJudge: null,
      embedding: null,
    }
    let llmReasoning: string | undefined

    // Programmatic evaluation
    if (weights.programmatic > 0 && evalCase.assertions) {
      scores.programmatic = evaluateProgrammatic(response, evalCase.assertions)
    }

    // LLM Judge evaluation
    if (weights.llmJudge > 0) {
      const judgeResult = await evaluateLlmJudge(
        this.openaiKey,
        evalCase.input,
        response,
        evalCase.expectedBehavior
      )
      scores.llmJudge = judgeResult.score
      llmReasoning = judgeResult.reasoning
      await this.delay(RATE_LIMIT_DELAY)
    }

    // Embedding evaluation
    if (weights.embedding > 0 && evalCase.groundTruth) {
      scores.embedding = await evaluateEmbedding(this.openaiKey, response, evalCase.groundTruth)
      await this.delay(RATE_LIMIT_DELAY)
    }

    const compositeScore = computeComposite(scores, evalCase.category)
    const durationMs = Math.round(performance.now() - start)

    return {
      caseId: evalCase.id,
      category: evalCase.category,
      input: evalCase.input,
      response,
      scores,
      compositeScore,
      passed: compositeScore >= PASS_THRESHOLD,
      llmReasoning,
      durationMs,
    }
  }

  /**
   * Runs evaluation for all cases.
   */
  async runEval(cases: EvalCase[]): Promise<EvalRunResult> {
    console.log(`Running ${cases.length} eval cases...`)

    // Seed data
    await this.seed()

    const results: EvalResult[] = []

    for (const evalCase of cases) {
      try {
        const result = await this.runCase(evalCase)
        results.push(result)

        if (this.verbose) {
          const status = result.passed ? 'PASS' : 'FAIL'
          console.log(`    [${status}] ${result.compositeScore.toFixed(2)}`)
        }
      } catch (error) {
        console.error(`  Error on ${evalCase.id}:`, error)
        results.push({
          caseId: evalCase.id,
          category: evalCase.category,
          input: evalCase.input,
          response: '',
          scores: { programmatic: null, llmJudge: null, embedding: null },
          compositeScore: 0,
          passed: false,
          durationMs: 0,
        })
      }
    }

    // Cleanup
    await this.clean()

    // Compute summary
    const passed = results.filter((r) => r.passed).length
    const failed = results.length - passed
    const averageScore =
      results.length > 0 ? results.reduce((sum, r) => sum + r.compositeScore, 0) / results.length : 0

    // Group by category
    const byCategory = this.groupByCategory(results)

    return {
      total: results.length,
      passed,
      failed,
      averageScore,
      byCategory,
      results,
    }
  }

  /**
   * Calls the chat API endpoint.
   */
  private async callChatApi(sessionId: string, message: string): Promise<string> {
    const visitorId = `eval-visitor-${sessionId}`

    const res = await fetch(`${this.apiBaseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        visitorId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Chat API error ${res.status}: ${text}`)
    }

    const data = (await res.json()) as { message: { content: string } }
    return data.message?.content ?? ''
  }

  /**
   * Groups results by category with summary stats.
   */
  private groupByCategory(
    results: EvalResult[]
  ): Record<Category, { total: number; passed: number; score: number }> {
    const categories: Category[] = ['relevance', 'accuracy', 'safety', 'pii', 'tone', 'refusal']
    const byCategory = {} as Record<Category, { total: number; passed: number; score: number }>

    for (const category of categories) {
      const catResults = results.filter((r) => r.category === category)
      const catPassed = catResults.filter((r) => r.passed).length
      const catScore =
        catResults.length > 0
          ? catResults.reduce((sum, r) => sum + r.compositeScore, 0) / catResults.length
          : 0

      byCategory[category] = {
        total: catResults.length,
        passed: catPassed,
        score: catScore,
      }
    }

    return byCategory
  }

  /**
   * Delays for rate limiting.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Closes database connection.
   */
  close(): void {
    this.dbClient.close()
  }
}
