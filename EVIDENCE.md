# Evidence

Each rule in `SPEC.md` that cites an `E-n` comes from one measurement on this page.

## Source

The sessions of one developer who works through a production, multi-repository AI development harness built on Claude Code. They ran from 2026-09-25 to 2026-10-10. The harness has deterministic gates (pre-tool hooks) and judgment gates (code review, decision audit, spec audit and readiness agents).

Before this contract, every deterministic gate already answered with a fixed text shape: what was wrong, why, how to fix it, and which rule. The loops below happened **with** that shape in place.

The raw transcripts are private. This page publishes the method and the aggregates.

## Method

1. **Deterministic blocks.** Every tool result in every main and subagent transcript that carried a gate block was extracted with the gate's stated fix. For each block, the turns and the seconds until the same tool next succeeded were measured.
2. **Judgment rounds.** Every judging agent run was grouped into rounds, one per review family and session. Parallel members of one round count once. A chain is the sequence of rounds on one piece of work.
3. **Why each repeat round existed.** Five independent model readers labelled every repeat round against a fixed rubric. Each label had to carry a verbatim quote from the transcript, and a script confirmed all 77 quotes as exact substrings.
4. **Reliability.** A sixth reader relabelled a seeded random 20 rounds without seeing the first labels.

## Results

| Measurement | Value |
|---|---|
| deterministic blocks | 695 |
| median cost of one block | 1 turn, about 5 seconds |
| judgment rounds | 122 (45 first rounds, 77 repeats) |
| re-judging time in repeat rounds | 18.4 h |
| reader agreement, exact label | 14 / 20 |
| reader agreement, avoidable or not | 16 / 20 (9 avoidable from both readers) |

### Why repeat rounds existed

| Reason | Rounds | Re-judge hours | Removed by |
|---|---|---|---|
| the same item still wrong | 15 | 6.8 | §7.2 `check` (E-2) |
| an approval voided by an unrelated commit | 10 | 1.4 | §5 scoped `fingerprint` (E-3) |
| bookkeeping a machine could produce | 6 | 1.4 | §7.1 `generate` (E-4) |
| another instance of a reported class | 6 | 2.2 | §8 exhaustive `coverage` (E-5) |
| a check that could run earlier | 2 | 0.3 | §11 `preview` (E-7) |
| new work since the last round | 17 | 3.2 | none: real work |
| a human ruling | 9 | 0.9 | none |
| missed by an earlier round | 8 | 1.9 | partly §8. Not counted. |
| other | 4 | 0.2 | none |

**Avoidable: 39 of 77 repeat rounds (51%), and 12.1 of 18.4 re-judging hours (66%).**

## The evidence items

- **E-1 — one-line fixes repeated.** In 378 of 695 blocks, the gate named the exact fix as a one-line prefix of the same command, and the agent still made the same mistake again later. 68 more blocks asked only to drop one argument, and 3 to replace a number with a stable key. That is 449 blocks a gate could have repaired itself. They cost about 530 turns but only about 1.3 hours. Repair removes turns, not hours.
- **E-2 — the same finding still wrong.** The most common avoidable reason: 15 repeat rounds as the primary reason, and 20 more as a secondary one.
- **E-3 — approvals voided.** 10 repeat rounds re-ran only because a commit voided an approval, and found nothing blocking that was new.
- **E-4 — bookkeeping.** 6 repeat rounds failed only on records a machine could produce, such as citation form, counts and generated text. 18 more carried such findings as a secondary reason. When the same harness began generating pull-request bodies by script, review agents fell from 17.4% to 3.9% of working time.
- **E-5 — sibling instances.** 6 repeat rounds found another instance of a class an earlier round had already reported, and 12 more had this as a secondary reason. One auditor wrote: "Every round-2 finding repeats a round-1 class".
- **E-6 — unbounded chains.** One spec-audit chain ran 11 rounds. Externally, all 68 confirmed infinite agent loops in a study of 6,549 repositories lacked a strong bound ([arXiv 2607.01641](https://arxiv.org/abs/2607.01641)).
- **E-7 — late checks.** The suite-before-pull-request gate blocked 78 times at the last step, where its check could have run earlier.

## Limits

- **One developer, one harness, 15 days.** The shape is credible. The percentages will move elsewhere.
- **Upper bound.** The removal figures assume each rule fully removes its reason.
- **Model-judged labels.** Agreement was 70% exact and 80% on the avoidable question.
- **External evidence is thin.**
  - Models self-correct poorly without external feedback ([Huang et al., ICLR 2024](https://arxiv.org/abs/2310.01798)).
  - Self-repair is limited by the quality of its feedback ([Olausson et al., ICLR 2024](https://arxiv.org/abs/2306.09896)).
  - The one controlled study of compiler-style diagnostics for agents used a 0.5B model and found no gain over plain schemas. That settles nothing either way ([arXiv 2603.13404](https://arxiv.org/abs/2603.13404)).
- **No prior standard found.** No published cross-vendor standard for a gate's answer was found as of 2026-10-10.
