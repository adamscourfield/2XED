# Misconception Tag Taxonomy — v1

Each tag follows the pattern: `[strand]_m[number]_[short_descriptor]`

Tags are used to:
1. Route students to the correct explanation route (Route C = misconception-corrective for that specific error)
2. Surface class-level patterns in teacher analytics

---

## N1 — Place Value, Ordering, Rounding

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `pv_m1_place_vs_value` | Gives the digit itself rather than its value (e.g. "7" instead of "700,000") | "What is the value of 7 in 3,742,915?" |
| `pv_m2_zero_shift` | Misreads a number containing zeros; skips or shifts a column | Numbers like 504,081 or 8,030,406 |
| `pv_m3_reading_direction` | Assigns place value right-to-left instead of left-to-right | Any place value identification question |
| `pv_m4_decimal_symmetry` | Thinks decimal columns mirror integer columns (tenths → "oneths", hundredths → "tens") | Decimal place value questions |
| `pv_m5_rounding_boundary` | Rounds down when boundary digit is exactly 5, or rounds to wrong column | Rounding to nearest 10/100/1000 |
| `pv_m6_negative_ordering` | Reverses the order of negatives (thinks −5 > −2 because 5 > 2) | Ordering integers including negatives |
| `pv_m7_decimal_ordering` | Treats decimal digits as integers (thinks 0.9 < 0.12 because 9 < 12) | Ordering or comparing decimals |

---

## N2 — Addition, Subtraction, Perimeter

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `add_m1_no_carry` | Forgets to carry in column addition, or carries incorrectly | Column addition with carrying |
| `add_m2_decimal_align` | Misaligns decimal columns when adding or subtracting decimals | Decimal column addition/subtraction |
| `add_m3_subtract_reversal` | Subtracts smaller digit from larger regardless of column position (e.g. 52−37 → 25 instead of 15) | Column subtraction with exchange |
| `add_m4_perimeter_vs_area` | Confuses perimeter with area — multiplies side lengths instead of adding | Any perimeter question |
| `add_m5_compound_sides` | Double-counts shared sides or omits unlabelled sides in compound shapes | Perimeter of compound shapes |
| `add_m6_standard_form` | Applies addition to the powers rather than the coefficients in standard form | Standard form addition/subtraction |

---

## N3 — Multiplication, Division, Area

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `mult_m1_carrying` | Loses or misplaces a carried digit in long multiplication | Multiplication with carrying |
| `mult_m2_decimal_place` | Wrong number of decimal places in decimal multiplication (counts wrong or ignores) | Decimal × decimal |
| `mult_m3_order_of_ops` | Ignores operator precedence — works left to right regardless | Any BIDMAS/BODMAS question |
| `mult_m4_area_formula` | Uses perimeter formula for area, or confuses length × width with length + width | Area questions |
| `mult_m5_factor_multiple` | Confuses factors with multiples — lists multiples when asked for factors | Factor/multiple questions |
| `mult_m6_hcf_lcm_swap` | Applies LCM method when asked for HCF, or vice versa | HCF and LCM questions |
| `mult_m7_unit_conversion` | Converts in wrong direction or uses wrong multiplier for metric units | Metric unit conversion |
| `mult_m8_mean_divisor` | Divides by wrong count (e.g. divides sum by number of unique values, not total values) | The mean |
| `mult_m9_remainder_decimal` | Stops division at remainder rather than continuing to decimal | Short division with decimals |

---

## N4 — Directed (Negative) Numbers

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `neg_m1_ignore_sign` | Drops the negative sign — treats a negative number as positive | Any directed number calculation |
| `neg_m2_double_negative` | Does not resolve −(−n) to +n; treats it as −n | Subtracting a negative number |
| `neg_m3_cross_zero` | Makes an error when a calculation passes through zero | Addition/subtraction crossing zero |
| `neg_m4_number_line_direction` | Moves in the wrong direction on the number line for subtraction | Number line questions |
| `neg_m5_multiply_sign_rule` | Wrong sign in result of multiplying/dividing two negatives (expects negative) | Multiplication/division with negatives |
| `neg_m6_mixed_sign_multiply` | Correct for two negatives but wrong for mixed positive/negative | Mixed-sign multiplication |
| `neg_m7_ops_order_with_neg` | Applies operations left to right without respecting BIDMAS when negatives are involved | Order of operations with negatives |

---

## N5 — Fractions

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `frac_m1_add_denominators` | Adds both numerators and both denominators (e.g. ½ + ⅓ = 2/5) | Adding fractions |
| `frac_m2_common_denom_error` | Finds a common denominator but adjusts only the denominator, not the numerator | Adding/subtracting unlike fractions |
| `frac_m3_improper_conversion` | Error converting mixed number to improper fraction (e.g. multiplies wrong part) | Mixed/improper fraction questions |
| `frac_m4_simplify_non_hcf` | Divides by a common factor but not the HCF — leaves fraction not fully simplified | Simplifying fractions |
| `frac_m5_fraction_of_whole` | Confuses "find ¾ of 24" with ¾ + 24 or other arithmetic | Fraction of an amount |
| `frac_m6_number_line_place` | Places fraction at the wrong position on a number line | Placing fractions on a number line |
| `frac_m7_negative_fraction` | Loses or misplaces the negative sign when adding/subtracting negative fractions | Fractions with negatives |
| `frac_m8_mixed_subtraction` | Tries to subtract a larger fractional part from a smaller one without regrouping | Subtracting mixed numbers |

---

## A1 — Algebra

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `alg_m1_unlike_terms` | Adds or combines unlike terms (e.g. x + x² = 2x²) | Collecting like terms |
| `alg_m2_implicit_coeff` | Misreads implicit coefficient — treats 3y as 3 + y rather than 3 × y | Algebraic notation |
| `alg_m3_expand_partial` | Multiplies bracket only by first term outside (e.g. 3(x + 2) = 3x + 2) | Expanding single brackets |
| `alg_m4_expand_sign_loss` | Loses negative sign when expanding (e.g. −2(x − 3) = −2x − 6) | Expanding with negatives |
| `alg_m5_substitution_ops` | Wrong order of operations when substituting (e.g. evaluates addition before power) | Substitution with multiple operations |
| `alg_m6_factorise_partial` | Takes out a common factor that is not the HCF — leaves incompletely factorised | Factorising into a single bracket |
| `alg_m7_nth_term_vs_term_term` | Confuses position-to-term rule (nth term) with term-to-term rule | nth term questions |
| `alg_m8_geometric_as_linear` | Identifies a geometric sequence as linear (looks at first two differences only) | Identifying sequence types |
| `alg_m9_sequence_rule_error` | Generates wrong terms from a given nth term (substitutes wrong n) | Generating sequences from nth term |

---

## G1 — Angles and Polygons

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `geo_m1_angle_type` | Misidentifies angle type — most commonly confuses obtuse with reflex, or acute with right | Naming/classifying angles |
| `geo_m2_protractor_scale` | Reads the wrong scale on a protractor (inner vs outer) | Measuring angles |
| `geo_m3_straight_line` | Does not apply or misapplies the angles on a straight line = 180° rule | Angles on a straight line |
| `geo_m4_vertically_opp` | Confuses vertically opposite angles with supplementary angles (adds to 180° instead of equating) | Vertically opposite angles |
| `geo_m5_triangle_angle_sum` | Does not know or incorrectly applies triangle angle sum = 180° | Triangle properties |
| `geo_m6_quad_angle_sum` | Does not know or misapplies quadrilateral angle sum = 360° | Quadrilateral properties |
| `geo_m7_interior_exterior` | Confuses interior and exterior angles — uses the wrong one in calculation | Interior/exterior angle questions |
| `geo_m8_polygon_sum_formula` | Uses wrong formula for sum of interior angles (e.g. 180n instead of 180(n−2)) | Sum of interior angles of a polygon |
| `geo_m9_diagonal_property` | Assumes all quadrilaterals share the same diagonal properties | Diagonal properties of quadrilaterals |

---

## N6 — Fractions, Decimals, Percentages

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `fdp_m1_percent_decimal` | Converts percentage to decimal incorrectly (e.g. 45% → 4.5 not 0.45) | FDP conversion |
| `fdp_m2_fraction_to_decimal` | Error in long division when converting fraction to decimal | Fraction to decimal conversion |
| `fdp_m3_percent_of_amount` | Divides by 100 but forgets to multiply by the amount | Percentage of an amount |
| `fdp_m4_percent_change_base` | Uses the wrong base when calculating percentage change (uses new value instead of original) | Percentage change |
| `fdp_m5_reverse_percent` | Works backwards by adding/subtracting the percentage from the result rather than dividing by multiplier | Reverse percentages |
| `fdp_m6_compound_vs_simple` | Applies simple interest method to a compound interest question | Compound interest |
| `fdp_m7_ordering_mixed` | Cannot correctly order a mixed list of fractions, decimals, and percentages | Ordering FDP |

---

## S1 — Probability

| Tag | Description | Common trigger |
|-----|-------------|----------------|
| `prob_m1_outside_scale` | Gives a probability outside 0–1 (e.g. probability of 3 out of 5 = 3) | Any probability question |
| `prob_m2_complement` | Does not subtract from 1 to find the complement of an event | Complementary probability |
| `prob_m3_incomplete_sample_space` | Lists an incomplete sample space — typically missing combinations for two events | Sample space diagrams |
| `prob_m4_venn_double_count` | Counts elements in the intersection twice when finding totals in Venn diagrams | Venn diagram probability |
| `prob_m5_venn_universal_set` | Ignores elements outside all circles (the universal set remainder) | Venn diagrams with full information |
| `prob_m6_union_vs_intersection` | Confuses union (∪) with intersection (∩) | Set notation questions |
| `prob_m7_fdp_form` | Cannot express probability as a fraction, decimal, and percentage interchangeably | Probability with FDP |

---

## Usage Notes

- Tags are assigned at **question level**, not skill level — one skill may have 2–4 distinct tags across its items
- Route C explanation routes are authored **per tag** — one misconception-corrective route per distinct error in a skill
- When a student triggers a tag, the system routes to the Route C explanation for that specific tag
- Analytics group by tag to surface class-level patterns (e.g. "11 students in Y7 have `frac_m1_add_denominators`")

## Tag Naming Convention

```
[strand]_m[number]_[short_descriptor]

strand      = lowercase strand code (pv, add, mult, neg, frac, alg, geo, fdp, prob)
number      = sequential integer within strand, padded to 1 digit
descriptor  = snake_case, max 3 words, describes the error not the topic
```
