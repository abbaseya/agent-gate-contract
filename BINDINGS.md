# Runtime bindings

How an AGC response travels through a real runtime. Bindings are **non-normative in 0.1**. A binding marked *verified* was checked against the runtime's own documentation. A binding marked *open* is not yet written.

| Runtime | Status |
|---|---|
| Claude Code hooks | verified against the [hooks reference](https://code.claude.com/docs/en/hooks) |
| Judgment agents (any runtime) | defined here |
| CI and SARIF | mapping defined. The SARIF structure was checked against secondary sources only. |
| Codex hooks | verified against the [hooks documentation](https://learn.chatgpt.com/docs/hooks), and measured on codex-cli 0.159.0 |
| Cursor, other hook runtimes | open. Contributions welcome. |

## Claude Code — PreToolUse

| AGC verdict | Hook output |
|---|---|
| `allow` | exit 0 with no output |
| `repaired` | the rewritten arguments in `updatedInput` and the rendered findings in `additionalContext`, with **no** `permissionDecision`, so the rewritten call still goes through the normal permission flow |
| `block` | `permissionDecision: "deny"`, the rendered findings in `permissionDecisionReason`, and the AGC JSON in `additionalContext` |
| `escalate` | as `block`, and the hook also sets `continue: false` with a `stopReason` naming the person to ask, and a `systemMessage` with the same text |

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

**Where the person's name appears on `escalate`.** This was measured on Claude Code 2.1.296 on 2026-10-13, with 3 runs per mode. In every run, the blocked call did not run.

- Interactive session, measured without a `systemMessage`: the screen shows the `stopReason` and the deny reason.
- `claude -p --output-format json`: the session ends with `terminal_reason` `"hook_stopped"`. The `stopReason`, the deny reason and the `systemMessage` appear nowhere in the output or on stderr.
- `claude -p --output-format stream-json --verbose`: the `systemMessage` arrives as a `system` event with subtype `informational`, and the deny reason as the `tool_result` of a `user` event. The `stopReason` does not appear.

A caller that runs `claude -p` with JSON output cannot read the name from Claude Code. It needs the name from the gate itself. Re-check this on your version.

## Claude Code — PostToolUse

The tool has already run, so `repaired` uses `updatedToolOutput` to replace the result, and `block` uses the top-level `decision: "block"` with a `reason`. Put the AGC JSON in `additionalContext` either way.

## Codex — PreToolUse

| AGC verdict | Hook output |
|---|---|
| `allow` | exit 0 with no output |
| `repaired` | `permissionDecision: "allow"` with the rewritten arguments in `updatedInput`, and the rendered findings in `additionalContext` |
| `block` | exit 2, with the rendered findings on stderr, followed by the AGC JSON in one fenced block whose info string is `agc` |
| `escalate` | as `block`, and the stderr text names the person to ask |

For Bash and `apply_patch`, `updatedInput` holds a string `command`. A repaired `apply_patch` call keeps the patch and changes only the paths in its file headers. For MCP and other local tools, `updatedInput` is the replacement arguments object.

**A Codex repair still sends `"allow"`.** The documentation says to return `updatedInput` "only with `permissionDecision: "allow"`". It does not say whether that `"allow"` skips the approval. It was measured on codex-cli 0.159.0 on 2026-10-11, with `--ask-for-approval on-request` and a read-only sandbox:

- A rewritten Bash call and a rewritten `apply_patch` call each ran the rewritten input.
- Each still raised the usual approval, as the control run without a hook did.
- The first, non-escalated Bash attempt ran inside the sandbox and was denied there. `"allow"` did not bypass the sandbox.

Re-check it on your version and approval policy.

**Carry a block on stderr.** The documentation allows exit 2 with the reason on stderr. In the same measurement, a hook that exited 2 had its stderr shown to the model. The `permissionDecisionReason` it also wrote to stdout never reached the model. The documented alternative is exit 0 with `permissionDecision: "deny"` and the reason in `permissionDecisionReason`. That path was not measured.

**Never send `continue`, `stopReason`, `suppressOutput` or `permissionDecision: "ask"`.** The documentation says these are "parsed but not supported yet". Codex then "marks that hook run as failed, reports the error, and continues the tool call". So `escalate` cannot stop the session on Codex. It blocks the call, and the person named in the text decides.

Whether the model acts on `additionalContext` after a repair was not confirmed. In the `apply_patch` run, the agent reported the original file name.

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
