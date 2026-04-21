# A1 Explanation Blueprint

## Purpose

Lean first-pass blueprint for building explanation routes and supporting model choices for **A1.1 to A1.19** before authoring full question banks.

This is based on:
- Adam's A1 subtopic list
- `A1_lesson_breakdown...csv`
- `A1_skills_breakdown...csv`
- existing route structure used in `content/animations/*-route-*.json`

## Recommendation

Build **three explanation routes per subtopic** using the existing route pattern:
- **Route A: Procedural**
- **Route B: Conceptual**
- **Route C: Misconception / common-error correction**

Keep each route lean, usually **4 to 6 steps**, with one strong worked example and one clear misconception strip.

## A1 macro-clusters

### Cluster 1, Algebra language and notation
Covers:
- **A1.1** Algebraic terminology
- **A1.2** Algebraic notation / basic collecting like terms
- **A1.3** Collecting like terms

Lesson alignment:
- Lessons 1 to 4

Core declarative knowledge:
- variable
- term
- expression
- coefficient
- like terms share the same variable part and same index
- juxtaposition notation: `ab`, `3y`, `a^2`, `a/b`

Core procedural knowledge:
- identify variables, terms, expressions, coefficients
- identify like terms
- collect like terms using addition and subtraction
- distinguish collectable and non-collectable terms

Suggested model / visual types:
- `rule_callout`
- `step_reveal`
- `show_expression`
- `result_reveal`
- optional `classification_table` style via step lines if no formal table visual exists

Subtopic route emphasis:
- **A1.1**
  - A: identify term / expression / coefficient from examples
  - B: explain what each word means and how they differ
  - C: correct confusion between variable and coefficient, expression and equation
- **A1.2**
  - A: translate repeated addition / multiplication / powers / division into algebraic notation
  - B: explain why `ab` means multiply, why `a^2` means repeated multiplication
  - C: address common notation errors like `a+b` instead of `ab`, or `2a` misunderstood as `a+2`
- **A1.3**
  - A: collect like terms step by step, including perimeter/context examples
  - B: explain why only like terms combine
  - C: correct illegal combinations like `3x + 2y = 5xy`

### Cluster 2, Multiplying and dividing algebraic terms
Covers:
- **A1.4** Multiplying terms
- **A1.5** Dividing terms

Lesson alignment:
- Lessons 5 to 7

Core declarative knowledge:
- algebraic terms have coefficient part and variable part
- when multiplying or dividing terms, numbers and variables are treated separately
- powers combine according to repeated multiplication / division structure

Core procedural knowledge:
- multiply coefficients
- multiply variable parts
- divide coefficients where valid
- simplify variable powers in quotient form
- interpret area / missing side contexts

Suggested model / visual types:
- `show_expression`
- `step_reveal`
- `result_reveal`
- `rule_callout`

Subtopic route emphasis:
- **A1.4**
  - A: multiply coefficients and combine variables
  - B: explain why `x × x = x^2`, `x^2 × x = x^3`
  - C: correct errors like adding powers when the operation is not multiplication, or multiplying unlike terms incorrectly
- **A1.5**
  - A: divide coefficient part and variable part separately
  - B: explain cancellation and power reduction intuitively
  - C: address errors like dividing only the number part, or subtracting powers in the wrong direction

### Cluster 3, Substitution
Covers:
- **A1.6** Substituting into expressions with one operation
- **A1.7** Substituting into expressions with multiple operations
- **A1.8** Substituting into formulae

Lesson alignment:
- Lessons 8 to 10

Core declarative knowledge:
- substitution means replacing a variable with a number
- a formula is a rule connecting quantities

Core procedural knowledge:
- replace each variable accurately
- use brackets when substituting negatives if needed later
- evaluate expressions in the correct order
- substitute into formulae in context

Suggested model / visual types:
- `show_expression`
- `step_reveal`
- `result_reveal`
- `rule_callout`

Subtopic route emphasis:
- **A1.6**
  - A: direct substitution with one operation
  - B: explain variable replacement as value insertion
  - C: correct omission of multiplication, e.g. `3a` becoming `35` when `a=5`
- **A1.7**
  - A: multi-step substitution and evaluation
  - B: explain order of operations after substitution
  - C: correct errors from substituting one variable only, or evaluating in the wrong order
- **A1.8**
  - A: substitute into common formula forms
  - B: explain what each symbol stands for in context
  - C: correct symbol confusion and unit/context mix-ups

### Cluster 4, Expanding and factorising
Covers:
- **A1.9** Expand single brackets
- **A1.10** Expand two single brackets and simplify expressions
- **A1.11** Factorising into a single bracket

Lesson alignment:
- Lessons 11 to 16

Core declarative knowledge:
- expanding means multiplying out brackets
- factorising is the reverse of expanding

Core procedural knowledge:
- distribute a factor across bracket terms
- simplify after expansion
- identify a common factor and factorise into a single bracket

Suggested model / visual types:
- `show_expression`
- `step_reveal`
- `result_reveal`
- `rule_callout`
- area/context examples can still be rendered as textual step visuals if no dedicated algebra area model exists yet

Subtopic route emphasis:
- **A1.9**
  - A: single-bracket expansion including powers up to cubed where appropriate
  - B: explain distribution as repeated multiplication
  - C: correct errors like multiplying only the first term in a bracket
- **A1.10**
  - A: expand two separate single brackets then simplify total expression
  - B: explain the sequence expand first, then collect like terms
  - C: correct partial expansion and missed simplification
- **A1.11**
  - A: find highest common factor and factorise into one bracket
  - B: explain reverse relationship with expanding
  - C: correct factor extracted inconsistently from different terms

### Cluster 5, Sequences and nth term
Covers:
- **A1.12** Diagram sequences
- **A1.13** Continue linear sequences
- **A1.14** Generate linear sequences with term-to-term rules
- **A1.15** Common sequences
- **A1.16** Geometric sequences
- **A1.17** Generate geometric sequences
- **A1.18** Generate sequences from algebraic rules
- **A1.19** Find the nth term of a sequence

Lesson alignment:
- Lessons 17 to 24

Core declarative knowledge:
- linear sequences have constant difference
- nth term generates any term
- Fibonacci rule
- quadratic sequences have constant second difference
- geometric sequences have constant multiplier

Core procedural knowledge:
- continue and describe sequences
- generate using term-to-term rule
- generate from nth-term rule by substitution
- identify special sequences
- find nth term of a linear sequence

Suggested model / visual types:
- `step_reveal`
- `rule_callout`
- `result_reveal`
- `show_expression`
- a future sequence-diagram visual would help, but initial route versions can still work with line-by-line reveals

Subtopic route emphasis:
- **A1.12**
  - A: identify pattern growth in diagrams
  - B: connect visual growth to next term prediction
  - C: correct counting only visible edge parts or missing repeated structure
- **A1.13**
  - A: find constant difference and continue linear sequence
  - B: explain what makes a sequence linear
  - C: correct inconsistent difference checking
- **A1.14**
  - A: generate terms from a term-to-term rule
  - B: explain how each new term depends on the previous term
  - C: correct applying the rule to the starting number only once
- **A1.15**
  - A: recognise triangular, square, cube, Fibonacci patterns
  - B: explain defining feature of each special sequence
  - C: correct confusion between additive and multiplicative growth
- **A1.16**
  - A: continue geometric sequences using a constant multiplier
  - B: explain ratio-based growth
  - C: correct using a constant difference instead of multiplier
- **A1.17**
  - A: generate geometric sequences from given multiplier/start value
  - B: explain repeated multiplication from one term to the next
  - C: correct one-step-only multiplication errors
- **A1.18**
  - A: substitute term position into nth-term rules
  - B: explain position-to-term mapping
  - C: correct substituting the previous term instead of the term number
- **A1.19**
  - A: find nth term of a linear sequence
  - B: explain difference-plus-adjustment structure
  - C: correct using one tested term only without generalising

## Suggested route naming pattern

For each A1 subtopic, create:
- `A1.x-route-A.json` → Procedural
- `A1.x-route-B.json` → Conceptual
- `A1.x-route-C.json` → Misconception

## Suggested minimal route skeleton

Each route should usually contain:
1. introduce the idea / example
2. state the rule or structure
3. work one example step by step
4. highlight common trap or boundary
5. reveal the general result / takeaway

## Build order recommendation

To reduce drift, build routes in this order:
1. **A1.1 to A1.3**
2. **A1.4 to A1.5**
3. **A1.6 to A1.8**
4. **A1.9 to A1.11**
5. **A1.12 to A1.19**

## Practical note

For A1, the goal should be **clarity and consistency first**, not perfect visual sophistication. Text-led animation steps using the existing route schema are enough to get a strong first version in place.
