---
title: "ADR-006: PII Obfuscation"
description: Token-based obfuscation for LLM calls
---

# ADR 006: PII Obfuscation for LLM Calls

## Status

<Badge type="tip" text="Accepted" />

## Context

The chat feature sends user messages to external LLM providers (OpenAI, Anthropic, etc.). Users may inadvertently include personally identifiable information (PII) in their messages:

- Email addresses
- Phone numbers
- Physical addresses
- Names (when combined with other data)
- Financial information (credit card numbers, etc.)

Sending PII to external providers creates:
1. **Privacy risk**: Data stored in provider logs/training data
2. **Compliance concerns**: GDPR, CCPA implications
3. **Trust issues**: Users expect privacy in conversations

We need to protect user privacy while maintaining conversation quality.

## Decision

Implement **token-based PII obfuscation** that:
1. Detects PII patterns in user messages before sending to LLM
2. Replaces PII with deterministic placeholders (e.g., `[EMAIL_1]`)
3. Stores the mapping per conversation
4. De-obfuscates LLM responses before returning to user

## Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **No obfuscation** | Simple, no quality loss | Privacy risk, compliance issues |
| **Full message encryption** | Maximum privacy | LLM can't process encrypted content |
| **On-device LLM only** | Complete privacy | Limited capability, high cost |
| **Generic replacement** (`[REDACTED]`) | Simple | LLM can't reference data coherently |
| **Token-based obfuscation** | Preserves conversation flow, reversible | Detection complexity, edge cases |

## PII Detection Approach

### Pattern-Based Detection

| Category | Examples | Placeholder |
|----------|----------|-------------|
| Email addresses | `john@example.com` | `[EMAIL_1]` |
| Phone numbers | `+1 (555) 123-4567` | `[PHONE_1]` |
| Credit cards | `4111-1111-1111-1111` | `[CARD_1]` |
| SSN (US) | `123-45-6789` | `[SSN_1]` |
| IP addresses | `192.168.1.1` | `[IP_1]` |

### What We Don't Detect (Intentionally)

| Category | Reason |
|----------|--------|
| Names | Too many false positives, context-dependent |
| Addresses | Complex patterns, many formats |
| Dates of birth | Ambiguous, often needed for context |
| Usernames | Could be anything |

Names and addresses in chat context are acceptable because:
- Users often need to discuss people/places
- Portfolio chat is informational, not transactional
- False positives would degrade experience significantly

## Obfuscation Flow

```
User Message                     Obfuscated Message
---------------------------------------------------------------------
"Contact me at                   "Contact me at
 john@example.com                 [EMAIL_1]
 or call 555-1234"               or call [PHONE_1]"
        |                                |
        v                                v
+------------------+            +------------------+
|  PIIObfuscator   |            |    LLM Call      |
|                  |            |                  |
|  detect()        |----------->|  chat(messages)  |
|  obfuscate()     |            |                  |
|  storeMapping()  |            +--------+---------+
+------------------+                     |
        ^                                v
        |                       +------------------+
        |                       |  LLM Response    |
        +-----------------------|  "I'll reach    |
           deobfuscate()        |   you at        |
                                |   [EMAIL_1]"    |
                                +--------+---------+
                                         |
                                         v
                                "I'll reach you at
                                 john@example.com"
```

### Conversation Continuity

Placeholders are consistent within a session:

```
Message 1: "My email is john@example.com"
           -> "My email is [EMAIL_1]"

Message 2: "Did you get that? It's john@example.com"
           -> "Did you get that? It's [EMAIL_1]"

LLM sees consistent references, can discuss coherently:
LLM: "Yes, I noted [EMAIL_1] as your contact"
     -> "Yes, I noted john@example.com as your contact"
```

## Consequences

### Positive

- **Privacy protection**: PII never sent to external providers
- **Conversation quality**: LLM can reference placeholders coherently
- **Audit trail**: Mappings stored (encrypted) for debugging
- **Reversible**: Original content restored in responses
- **Deterministic**: Same input -> same placeholder within session

### Negative

- **Detection limits**: Some PII patterns may be missed
- **False positives**: Some non-PII matching patterns (e.g., product codes)
- **Complexity**: Additional processing on every message
- **Edge cases**: LLM might generate new placeholders (handled by ignoring)

### Mitigations

- **Pattern tuning**: Regularly review false positive/negative rates
- **User feedback**: Allow users to report missed PII
- **Fallback**: If deobfuscation fails, return obfuscated version (safe default)
- **Logging**: Never log original PII, only placeholder mappings

## Storage

| Data | Storage | Encryption |
|------|---------|------------|
| Obfuscated messages | Database | None (safe) |
| Original messages | Never stored | N/A |
| Mappings | Memory only (session-scoped) | N/A |

Mappings are held in memory for session duration only. When session ends or server restarts, mappings are lost. This is intentional - PII should not persist.

## References

- [OWASP Data Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html)
- [GDPR Article 25 - Data Protection by Design](https://gdpr-info.eu/art-25-gdpr/)
- [OpenAI Data Usage Policy](https://openai.com/policies/api-data-usage-policies)
