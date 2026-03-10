# ADR-001: Learning Module Boundaries (diagnostic, learn, knowledge-state)

- **Status:** Accepted
- **Date:** 2026-03-10

## Context

As the platform expands, responsibilities have started to overlap between diagnostic flows, core learning flows, and knowledge-state scoring. This creates risk of duplicate writes, inconsistent business rules, and hard-to-trace regressions.

## Decision

Define explicit boundaries and write ownership:

1. **Diagnostic module**
   - Owns: initial signal capture, route recommendation inputs, confidence snapshots.
   - Must not: mutate durable learner mastery state directly.

2. **Learn module**
   - Owns: delivery runtime (question presentation, reteach interactions, immediate correctness events).
   - Must not: directly compute or persist long-term mastery labels.

3. **Knowledge-state module**
   - Owns: mastery scoring, durability/trend calculations, next-question policy updates.
   - Is the only module allowed to persist durable knowledge-state records.

## Cross-module write policy

- **Allowed pattern:**
  - Diagnostic/Learn write events + attempts only.
  - Knowledge-state consumes those inputs and writes durable state.
- **Disallowed pattern:**
  - Diagnostic or Learn writing directly into knowledge-state tables/fields.
- **Integration contract:**
  - Cross-module communication uses typed payloads and validated schemas.
  - Any new durable learner-state field must be owned by knowledge-state and reviewed at ADR level.

## Consequences

- Better auditability and clearer fault isolation.
- Slightly more orchestration code, but safer long-term evolution.
- CI/content validators can enforce boundary assumptions more reliably.
