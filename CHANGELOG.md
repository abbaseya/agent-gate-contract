# Changelog

## 0.2.0 — 2026-10-14 (draft)

- Contract version `"0.2"`. A response may carry an `id` (§3.1) and a `related` array of links (§3.2). Each link is `{rel, type, id, href?}`, the link shape of the Agent SDLC interoperability profile. AGC defines no `rel` or `type` values; a profile that uses the links owns them.
- The schema accepts `"0.1"` and `"0.2"`. A response with `id` or `related` must declare `"0.2"`, because the 0.1 schema rejects both fields. A response without them is valid in both versions.
- Validator: two rounds of one chain must not carry the same response `id`. New invalid examples for a link in a 0.1 response, a link without `type`, a link with an extra field, and a chain that repeats an `id`. New valid example `related-links.json`.
- SPEC.md and BINDINGS.md no longer tie the non-normative bindings to version 0.1.

## 0.1.4 — 2026-10-13 (draft)

- BINDINGS (Claude Code): `escalate` now also sends a `systemMessage` naming the person to ask. Measured on Claude Code 2.1.296: an interactive session shows the `stopReason`, but `claude -p` drops it. With stream-json output, the `systemMessage` reaches the caller as a `system` event. With JSON output, none of the three hook texts reaches the caller. Bindings are non-normative, so the contract version is unchanged.
- SPEC.md's version line now names the release. It said 0.1.2 in the 0.1.3 release.

## 0.1.3 — 2026-10-13 (draft)

- The validator package now carries the JSON Schema when it is packed, so a Yarn install from Git at a tag loads it. The specification and the schema are unchanged.
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
