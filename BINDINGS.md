# Runtime bindings

How an AGC response travels through a real runtime. Bindings are **non-normative in 0.1**. A binding marked *verified* was checked against the runtime's own documentation. A binding marked *open* is not yet written.

| Runtime | Status |
|---|---|
| Claude Code hooks | verified against the [hooks reference](https://code.claude.com/docs/en/hooks) |
| Judgment agents (any runtime) | defined here |
| CI and SARIF | mapping defined. The SARIF structure was checked against secondary sources only. |
| Codex, Cursor, other hook runtimes | open. Contributions welcome. |

## Claude Code — PreToolUse

| AGC verdict | Hook output |
|---|---|
| `allow` | exit 0 with no output |
| `repaired` | the rewritten arguments in `updatedInput` and the rendered findings in `additionalContext`, with **no** `permissionDecision`, so the rewritten call still goes through the normal permission flow |
| `block` | `permissionDecision: "deny"`, the rendered findings in `permissionDecisionReason`, and the AGC JSON in `additionalContext` |
| `escalate` | as `block`, and the hook also sets `continue: false` with a `stopReason` naming the person to ask |

A `repaired` response:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "updatedInput": { "command": "cd /work/.worktrees/metrics-fix/backend && git status" },
    "additionalContext": "AGC repaired: workstream-isolation/main-checkout-access/Bash.command — the command now runs in the workstream."
  }
}
```

**Never send `permissionDecision: "allow"` with a repair.** The hooks reference says `"allow"` "skips the permission prompt", and pairs `updatedInput` with `"allow"` "to auto-approve". A gate that repairs a call must not also approve it: the person's permission settings still decide whether the rewritten call runs. Deny and ask rules are evaluated against the rewritten input either way.

Sending `updatedInput` without a `permissionDecision` is not described in the hooks reference. It was measured on Claude Code 2.1.296 on 2026-10-11: the rewrite applied, and the call still needed the usual approval. Re-check it on your version. If you need a guarantee instead of a measurement, send `permissionDecision: "ask"`, which always shows the person the rewritten call.

Exit code 2 still blocks, and Claude Code shows its stderr to the model. A gate that only exits 2 loses `updatedInput`, so a gate that returns `repaired` MUST use the JSON output.

## Claude Code — PostToolUse

The tool has already run, so `repaired` uses `updatedToolOutput` to replace the result, and `block` uses the top-level `decision: "block"` with a `reason`. Put the AGC JSON in `additionalContext` either way.

## Judgment agents

A reviewer, auditor or other judging agent ends its final message with exactly one fenced block whose info string is `agc`:

````markdown
```agc
{ "agc": "0.1", "gate": { "id": "code-review", "kind": "judgment" }, "...": "..." }
```
````

The orchestrator parses that block, validates it, and acts on `verdict` and `findings`. It does not parse the prose. The prose above the block is for people, and §12 of the spec requires it to agree with the block.

## CI and SARIF

| AGC | SARIF 2.1.0 |
|---|---|
| response | one `run` |
| `gate.id` | `tool.driver.name` |
| finding `class` | `result.ruleId` |
| finding `what` and `why` | `result.message.text` |
| finding `location` | `result.locations`. A symbol location needs the producer to resolve a region. |
| `severity: blocking` | `level: "error"` |
| `severity: advisory` | `level: "warning"` |
| `remedy.kind: patch` | `result.fixes[].artifactChanges[].replacements`. Each `find` must be resolved to a `deletedRegion`. |
| `verdict` | not represented. Keep the AGC object as a run property. |
