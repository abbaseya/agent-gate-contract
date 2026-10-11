# Changelog

## Unreleased

- BINDINGS (Codex): a new binding for Codex PreToolUse hooks, checked against the Codex hooks documentation and measured on codex-cli 0.159.0. A repair sends `"allow"` with `updatedInput`, which Codex requires, and the call still raised the usual approval in the measurement. A block exits 2 and carries the AGC JSON on stderr, because the stdout JSON of an exit-2 hook never reached the model. Bindings are non-normative, so the contract version is unchanged.

## 0.1.2 — 2026-10-11 (draft)

- BINDINGS (Claude Code): `repaired` no longer sends `permissionDecision: "allow"`. The hooks reference documents that `"allow"` skips the permission prompt, so 0.1.0 and 0.1.1 told a repairing gate to auto-approve the call it rewrote. A repair now sends `updatedInput` and `additionalContext` only. Found during the first adoption, by a readiness review that measured it with three `claude -p` runs.

## 0.1.1 — 2026-10-11 (draft)

- §6: a runtime that cannot apply a `rewrite` or `generate` remedy now downgrades the finding to the strongest remedy it can carry and returns `block`. 0.1.0 said to send the remedy unapplied, which contradicted §6's own validator rule and `examples/invalid/block-when-self-fixable.json`. Found by a stdlib port of the validator during the first adoption.
- Validator: a `block` now fails §6 when any blocking finding carries an unapplied `rewrite` or `generate` remedy, not only when all of them do. New invalid example `block-with-unapplied-rewrite.json`.

## 0.1.0 — 2026-10-10 (draft)

- First draft of the specification: the response object, verdicts, findings, the remedy ladder, checks, coverage, rounds, attempts and preview mode.
- JSON Schema 2020-12 for the response.
- Validator for single responses and ordered chains, with tests over valid and invalid examples.
- Claude Code and judgment-agent bindings, and a SARIF mapping.
- Evidence from one production harness: 695 deterministic blocks and 122 judgment rounds.
