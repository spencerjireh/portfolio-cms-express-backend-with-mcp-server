import type { Assertion, Category, EvalScore } from './types'
import { CATEGORY_WEIGHTS } from './types'

const OPENAI_API_URL = 'https://api.openai.com/v1'

/**
 * Evaluates response using programmatic assertions.
 * Returns score from 0-1 based on passing assertions.
 */
export function evaluateProgrammatic(response: string, assertions: Assertion[]): number {
  if (!assertions || assertions.length === 0) {
    return 1.0 // No assertions = full score
  }

  let passed = 0
  const normalizedResponse = response.toLowerCase()

  for (const assertion of assertions) {
    const value = assertion.caseSensitive ? assertion.value : assertion.value.toLowerCase()
    const searchIn = assertion.caseSensitive ? response : normalizedResponse

    if (assertion.type === 'contains') {
      if (searchIn.includes(value)) {
        passed++
      }
    } else if (assertion.type === 'notContains') {
      if (!searchIn.includes(value)) {
        passed++
      }
    }
  }

  return passed / assertions.length
}

/**
 * LLM-as-judge evaluation result.
 */
export interface LLMJudgeResult {
  score: number // 0-1 (normalized from 1-5)
  reasoning: string
}

/**
 * Evaluates response using LLM-as-judge approach.
 * Returns normalized score (0-1) and reasoning.
 */
export async function evaluateLlmJudge(
  apiKey: string,
  input: string,
  response: string,
  expectedBehavior: string
): Promise<LLMJudgeResult> {
  const systemPrompt = `You are an expert evaluator assessing AI assistant responses.
Rate the response on a scale of 1-5 based on how well it meets the expected behavior.

Scoring guide:
5 - Excellent: Fully meets expected behavior, accurate, helpful, appropriate
4 - Good: Mostly meets expectations with minor issues
3 - Acceptable: Partially meets expectations, some notable gaps
2 - Poor: Significant issues, mostly fails expectations
1 - Fail: Completely fails to meet expected behavior

Respond in this exact JSON format:
{"score": <1-5>, "reasoning": "<brief explanation>"}`

  const userPrompt = `User Query: ${input}

Expected Behavior: ${expectedBehavior}

Assistant Response: ${response}

Evaluate the response.`

  const res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM Judge API error: ${res.status}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const content = data.choices[0]?.message?.content ?? ''

  try {
    // Parse JSON response
    const parsed = JSON.parse(content) as { score: number; reasoning: string }
    const rawScore = Math.max(1, Math.min(5, parsed.score))
    // Normalize 1-5 to 0-1
    const normalizedScore = (rawScore - 1) / 4
    return { score: normalizedScore, reasoning: parsed.reasoning }
  } catch {
    // Fallback: try to extract score from text
    const match = content.match(/score[:\s]*(\d)/i)
    const score = match ? parseInt(match[1], 10) : 3
    return { score: (score - 1) / 4, reasoning: 'Failed to parse structured response' }
  }
}

/**
 * Computes cosine similarity between two embedding vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Gets embeddings from OpenAI API.
 */
async function getEmbedding(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch(`${OPENAI_API_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!res.ok) {
    throw new Error(`Embedding API error: ${res.status}`)
  }

  const data = (await res.json()) as {
    data: Array<{ embedding: number[] }>
  }

  return data.data[0].embedding
}

/**
 * Evaluates response using embedding similarity to ground truth.
 * Returns cosine similarity (0-1).
 */
export async function evaluateEmbedding(
  apiKey: string,
  response: string,
  groundTruth: string
): Promise<number> {
  const [responseEmb, truthEmb] = await Promise.all([
    getEmbedding(apiKey, response),
    getEmbedding(apiKey, groundTruth),
  ])

  const similarity = cosineSimilarity(responseEmb, truthEmb)
  // Clamp to 0-1 range (similarity can be negative for very different texts)
  return Math.max(0, similarity)
}

/**
 * Computes weighted composite score based on category weights.
 */
export function computeComposite(scores: EvalScore, category: Category): number {
  const weights = CATEGORY_WEIGHTS[category]

  let weightedSum = 0
  let totalWeight = 0

  if (scores.programmatic !== null && weights.programmatic > 0) {
    weightedSum += scores.programmatic * weights.programmatic
    totalWeight += weights.programmatic
  }

  if (scores.llmJudge !== null && weights.llmJudge > 0) {
    weightedSum += scores.llmJudge * weights.llmJudge
    totalWeight += weights.llmJudge
  }

  if (scores.embedding !== null && weights.embedding > 0) {
    weightedSum += scores.embedding * weights.embedding
    totalWeight += weights.embedding
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}
