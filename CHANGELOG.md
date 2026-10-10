# Changelog

## 0.1.1 — 2026-10-11 (draft)

- §6: a runtime that cannot apply a `rewrite` or `generate` remedy now downgrades the finding to the strongest remedy it can carry and returns `block`. 0.1.0 said to send the remedy unapplied, which contradicted §6's own validator rule and `examples/invalid/block-when-self-fixable.json`. Found by a stdlib port of the validator during the first adoption.
- Validator: a `block` now fails §6 when any blocking finding carries an unapplied `rewrite` or `generate` remedy, not only when all of them do. New invalid example `block-with-unapplied-rewrite.json`.

## 0.1.0 — 2026-10-10 (draft)

- First draft of the specification: the response object, verdicts, findings, the remedy ladder, checks, coverage, rounds, attempts and preview mode.
- JSON Schema 2020-12 for the response.
- Validator for single responses and ordered chains, with tests over valid and invalid examples.
- Claude Code and judgment-agent bindings, and a SARIF mapping.
- Evidence from one production harness: 695 deterministic blocks and 122 judgment rounds.
