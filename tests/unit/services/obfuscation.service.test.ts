import { describe, it, expect, beforeEach } from '@jest/globals'
import { ObfuscationService, obfuscationService } from '@/services/obfuscation.service'

describe('ObfuscationService', () => {
  let service: ObfuscationService

  beforeEach(() => {
    service = new ObfuscationService()
  })

  describe('obfuscate', () => {
    describe('email detection', () => {
      it('should detect and obfuscate a single email', () => {
        const input = 'Contact me at john@example.com for more info'
        const result = service.obfuscate(input)

        expect(result.text).toBe('Contact me at [EMAIL_1] for more info')
        expect(result.tokens).toHaveLength(1)
        expect(result.tokens[0]).toEqual({
          type: 'EMAIL',
          index: 1,
          placeholder: '[EMAIL_1]',
          original: 'john@example.com',
        })
      })

      it('should detect and obfuscate multiple emails', () => {
        const input = 'Email john@example.com or jane@test.org'
        const result = service.obfuscate(input)

        // Due to reverse iteration, order may vary
        expect(result.text).toContain('[EMAIL_')
        expect(result.tokens).toHaveLength(2)
        expect(result.tokens.map((t) => t.original).sort()).toEqual([
          'jane@test.org',
          'john@example.com',
        ])
      })

      it('should handle various email formats', () => {
        const emails = [
          'user@domain.com',
          'user.name@domain.co.uk',
          'user+tag@domain.org',
          'user123@sub.domain.com',
        ]

        for (const email of emails) {
          const result = service.obfuscate(`Contact: ${email}`)
          expect(result.tokens).toHaveLength(1)
          expect(result.tokens[0].original).toBe(email)
        }
      })
    })

    describe('phone detection', () => {
      it('should detect standard US phone formats', () => {
        const phones = [
          '555-123-4567',
          '(555) 123-4567',
          '555.123.4567',
          '5551234567',
          '+1 555-123-4567',
          '1-555-123-4567',
        ]

        for (const phone of phones) {
          const service = new ObfuscationService()
          const result = service.obfuscate(`Call me at ${phone}`)
          expect(result.tokens.length).toBeGreaterThanOrEqual(1)
          expect(result.tokens.some((t) => t.type === 'PHONE')).toBe(true)
        }
      })

      it('should obfuscate phone numbers', () => {
        const input = 'Call 555-123-4567 for support'
        const result = service.obfuscate(input)

        expect(result.text).toContain('[PHONE_')
        expect(result.tokens.some((t) => t.type === 'PHONE')).toBe(true)
      })
    })

    describe('SSN detection', () => {
      it('should detect SSN formats', () => {
        const ssns = ['123-45-6789', '123.45.6789', '123 45 6789']

        for (const ssn of ssns) {
          const service = new ObfuscationService()
          const result = service.obfuscate(`SSN: ${ssn}`)
          expect(result.tokens.some((t) => t.type === 'SSN')).toBe(true)
        }
      })

      it('should obfuscate SSN', () => {
        const input = 'My SSN is 123-45-6789'
        const result = service.obfuscate(input)

        expect(result.text).toContain('[SSN_')
        expect(result.tokens.some((t) => t.type === 'SSN')).toBe(true)
      })
    })

    describe('credit card detection', () => {
      it('should detect credit card formats', () => {
        const cards = [
          '1234-5678-9012-3456',
          '1234 5678 9012 3456',
          '1234.5678.9012.3456',
        ]

        for (const card of cards) {
          const service = new ObfuscationService()
          const result = service.obfuscate(`Card: ${card}`)
          expect(result.tokens.some((t) => t.type === 'CREDIT_CARD')).toBe(true)
        }
      })

      it('should obfuscate credit card numbers', () => {
        const input = 'Card number: 1234-5678-9012-3456'
        const result = service.obfuscate(input)

        expect(result.text).toContain('[CREDIT_CARD_')
        expect(result.tokens.some((t) => t.type === 'CREDIT_CARD')).toBe(true)
      })
    })

    describe('multiple PII types', () => {
      it('should detect multiple types in one message', () => {
        const input = 'Email: john@example.com, Phone: 555-123-4567, SSN: 123-45-6789'
        const result = service.obfuscate(input)

        expect(result.tokens.some((t) => t.type === 'EMAIL')).toBe(true)
        expect(result.tokens.some((t) => t.type === 'PHONE')).toBe(true)
        expect(result.tokens.some((t) => t.type === 'SSN')).toBe(true)
      })
    })

    describe('no PII', () => {
      it('should return original text when no PII found', () => {
        const input = 'Hello, how can I help you today?'
        const result = service.obfuscate(input)

        expect(result.text).toBe(input)
        expect(result.tokens).toHaveLength(0)
      })

      it('should handle empty string', () => {
        const result = service.obfuscate('')

        expect(result.text).toBe('')
        expect(result.tokens).toHaveLength(0)
      })
    })
  })

  describe('deobfuscate', () => {
    it('should restore original text from tokens', () => {
      const original = 'Contact john@example.com for info'
      const obfuscated = service.obfuscate(original)

      const restored = service.deobfuscate(obfuscated.text, obfuscated.tokens)

      expect(restored).toBe(original)
    })

    it('should restore multiple PII items', () => {
      const original = 'Email: john@example.com, jane@test.org'
      const obfuscated = service.obfuscate(original)

      const restored = service.deobfuscate(obfuscated.text, obfuscated.tokens)

      expect(restored).toBe(original)
    })

    it('should handle empty tokens array', () => {
      const text = 'No PII here'
      const restored = service.deobfuscate(text, [])

      expect(restored).toBe(text)
    })

    it('should not modify text if placeholders not found', () => {
      const text = 'Some text without placeholders'
      const tokens = [
        {
          type: 'EMAIL' as const,
          index: 1,
          placeholder: '[EMAIL_1]',
          original: 'test@example.com',
        },
      ]

      const restored = service.deobfuscate(text, tokens)

      expect(restored).toBe(text)
    })
  })

  describe('containsPII', () => {
    it('should return true when email is present', () => {
      expect(service.containsPII('Contact john@example.com')).toBe(true)
    })

    it('should return true when phone is present', () => {
      expect(service.containsPII('Call 555-123-4567')).toBe(true)
    })

    it('should return true when SSN is present', () => {
      expect(service.containsPII('SSN: 123-45-6789')).toBe(true)
    })

    it('should return true when credit card is present', () => {
      expect(service.containsPII('Card: 1234-5678-9012-3456')).toBe(true)
    })

    it('should return false when no PII present', () => {
      expect(service.containsPII('Hello world')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(service.containsPII('')).toBe(false)
    })
  })

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(obfuscationService).toBeInstanceOf(ObfuscationService)
    })

    it('should work correctly with singleton', () => {
      const result = obfuscationService.obfuscate('Email: test@example.com')
      expect(result.tokens).toHaveLength(1)
    })
  })
})
