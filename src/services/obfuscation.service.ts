export type PIIType = 'EMAIL' | 'PHONE' | 'SSN' | 'CREDIT_CARD'

export interface PIIToken {
  type: PIIType
  index: number
  placeholder: string
  original: string
}

interface PIIPattern {
  type: PIIType
  pattern: RegExp
}

const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'EMAIL',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    type: 'PHONE',
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  },
  {
    type: 'SSN',
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  },
  {
    type: 'CREDIT_CARD',
    pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
  },
]

/**
 * Service for detecting and obfuscating PII (Personally Identifiable Information).
 * Replaces sensitive data with numbered placeholders that can be reversed.
 */
export class ObfuscationService {
  /**
   * Detects and obfuscates PII in the given text.
   * Returns the obfuscated text and an array of tokens for reversal.
   */
  obfuscate(text: string): { text: string; tokens: PIIToken[] } {
    const tokens: PIIToken[] = []
    const counts: Record<PIIType, number> = {
      EMAIL: 0,
      PHONE: 0,
      SSN: 0,
      CREDIT_CARD: 0,
    }

    let result = text

    // Process each PII type
    for (const { type, pattern } of PII_PATTERNS) {
      // Reset pattern lastIndex for global patterns
      pattern.lastIndex = 0

      // Find all matches first
      const matches: { match: string; start: number }[] = []
      let match: RegExpExecArray | null

      // Create a fresh copy of the pattern for each iteration
      const freshPattern = new RegExp(pattern.source, pattern.flags)

      while ((match = freshPattern.exec(result)) !== null) {
        matches.push({ match: match[0], start: match.index })
      }

      // Replace matches in reverse order to preserve indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const { match: matchedText } = matches[i]
        counts[type]++
        const placeholder = `[${type}_${counts[type]}]`

        tokens.push({
          type,
          index: counts[type],
          placeholder,
          original: matchedText,
        })

        result = result.replace(matchedText, placeholder)
      }
    }

    return { text: result, tokens }
  }

  /**
   * Reverses the obfuscation by replacing placeholders with original values.
   */
  deobfuscate(text: string, tokens: PIIToken[]): string {
    let result = text

    for (const token of tokens) {
      result = result.replace(token.placeholder, token.original)
    }

    return result
  }

  /**
   * Checks if the text contains any PII patterns.
   */
  containsPII(text: string): boolean {
    for (const { pattern } of PII_PATTERNS) {
      const freshPattern = new RegExp(pattern.source, pattern.flags)
      if (freshPattern.test(text)) {
        return true
      }
    }
    return false
  }
}

export const obfuscationService = new ObfuscationService()
