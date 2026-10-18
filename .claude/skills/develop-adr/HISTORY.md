# develop-adr - Version History

| Version | Date | Release | Effort | Type | Summary |
|---------|------|---------|--------|------|---------|
| 3.0.0 | 2026-08-21 | v2.33.0 | C-1 | **major** | Conditional `Model Choice` subsection inside Consequences: build vs buy vs prompt, what is coupled to the choice, operating cost accepted, reversal cost, and the observation that would reopen the ADR. The six Nygard headings are untouched. **Retyped from 2.2.0 minor before release** (G1 adversarial finding 1): when the condition applies the subsection is required for completeness, which is the tie-breaker rule's major case. 2.2.0 never shipped. |
| 2.1.0 | 2026-06-10 | v2.26.0 | F-12-batch-2 | minor | Quality convergence: When NOT to Use + output-contract enumeration (F-12 Batch 2) |
| 2.0.0 | 2026-01-26 | - | - | baseline | Prior published version |

## 3.0.0 (2026-08-21)

AI-product family Track 1 (effort C-1), the `develop-adr` increment ruled in
[the C-3 spec](../../docs/internal/release-plans/v2.32.0/spec_c3-ai-product-family.md) section 2.2.
Adds a conditional `Model Choice` subsection **inside** `Consequences`, alongside Positive, Negative
and Neutral. The six Nygard headings (Status, Context, Decision, Consequences, Alternatives
Considered, References) are untouched, so the Output Format enumeration is unchanged and an ADR about
anything other than a model reads exactly as before.

**Why it belongs under Consequences and not under Decision.** A model choice differs from an ordinary
dependency choice in one way that matters for a record meant to be read years later: the thing you
evaluated will be replaced, often inside the life of the decision. Which model won is the least
durable part of the record. What the choice costs to undo is the part a future reader actually needs,
and that is a consequence. The subsection therefore asks for build-versus-buy-versus-prompt and what
ruled the others out, what is now coupled to the choice (prompts, evaluation sets, output schemas,
latency budgets), the operating cost accepted and the volume at which it stops being acceptable, the
real reversal cost given that coupling, and the observation that would reopen the ADR, stated as a
trigger rather than a review date.

**Timing.** This increment was deliberately held until after the C-2 weak-model re-test was run and
recorded ([`output-eval-weak-model-20260816.md`](../../docs/internal/release-plans/v2.33.0/records/output-eval-weak-model-20260816.md)),
because `develop-adr` is one of that experiment's four eval pairs and editing its body mid-run would
have confounded the generation model with a body change, exactly as had already happened to
`foundation-okr-writer`. The re-test returned VOID, and its pre-registered consequence is that
increments must be structure-bearing rather than prose exhortation. This one is a five-row table a
reader fills.

**Why this is a MAJOR, and why it was first typed 2.2.0.** The content below shipped as a drafted
`2.2.0` minor on 2026-08-16, on the reasoning quoted in the struck sentence below: that a conditional
block is additive and therefore cannot break existing usage. The v2.33.0 G1 adversarial review
overturned that reasoning before the tag, and the ruling was to retype rather than defend it. `2.2.0`
never shipped.

Conditionality narrows *who* is affected; it does not change *what happens to them*. For an artifact
whose condition applies, the subsection is now required for completeness and a Quality Checklist item
must pass. That is the tie-breaker rule in [`skill-versioning.md`](../../docs/internal/skill-versioning.md)
verbatim: *"If a user must do something new to stay compliant with the skill's required contract,
classify as major"*, with the worked cases *"'You must now include section X' -> major"* and *"New
required checklist item added -> major"*.

A skill MAJOR does not imply a repo MAJOR; `skill-versioning.md` versions the repo independently, so
this ships inside the v2.33.0 minor.

~~Minor rather than patch: the subsection asks for decisions the skill did not previously request and
adds an optional block to the artifact, which is additive behavior under the versioning tie-breaker.~~
**Corrected 2026-08-21 (G1 adversarial finding 1):** the block is conditional, not optional, and a
conditional requirement is still a requirement for the population it selects.

### Changes
- Added the conditional `Model Choice` subsection under `Consequences`.
- Instructions gained a sixth, conditional step.
- Quality Checklist gained one conditional item.
- Status, Context, Decision, Alternatives Considered and References unchanged; no change to the
  Output Format section enumeration.

## 2.1.0 (2026-06-10)

Quality-convergence minor (F-12 Batch 2): added a "When NOT to Use" section with boundary pointers to neighboring skills, and the Output Format now enumerates the template sections a complete artifact fills. No template or example changes.

## 2.0.0 (2026-01-26)

Baseline row for the prior published version; see git history for its changes.
