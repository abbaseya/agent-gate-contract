# Agent Gate Contract (AGC)

**Your agent hit a gate. The gate told it exactly what to fix. Two commands later, it made the same mistake again.**

Hooks, linters, reviewers and auditors now stop AI coding agents many times a day. Almost all of them answer the same way: a block and a sentence of advice. But a model does not learn from a sentence. Its weights stay the same, the advice reaches only its current context, and the next subagent never sees it. So the agent fixes one instance, misses the sibling three files away, and the next round finds it. A fix that was right gets voided by an unrelated commit. The review runs again. Measured in one production harness, **half of all repeat review rounds came from how the gates answered, not from the code.** See [EVIDENCE.md](EVIDENCE.md).

**The Agent Gate Contract is a standard shape for a gate's answer, built to end the loop rather than explain it.** One JSON object, the same for a pre-tool hook and for a code-review agent:

```json
{
  "agc": "0.1",
  "gate": { "id": "workstream-isolation", "kind": "deterministic" },
  "subject": { "kind": "tool-call", "fingerprint": "sha256:9c1e4f0a7b2d", "scope": ["Bash.command"] },
  "verdict": "repaired",
  "findings": [{
    "id": "workstream-isolation/main-checkout-access/Bash.command",
    "class": "main-checkout-access",
    "location": "Bash.command",
    "what": "The command runs in the main checkout, not in the session's workstream.",
    "why": "A pinned session works only in its workstream.",
    "severity": "blocking",
    "status": "new",
    "remedy": { "kind": "rewrite", "applied": true, "input": { "command": "cd /work/.worktrees/metrics-fix/backend && git status" } },
    "check": { "kind": "preview" }
  }],
  "coverage": { "complete": true, "classes": ["main-checkout-access"] },
  "attempt": { "n": 1, "budget": 3 }
}
```

The gate did not explain the fix. **It applied it.** No round happened.

## What the contract requires

| Rule | Loop it ends |
|---|---|
| **`repaired` before `block`.** If the gate can fix the action or produce the artifact, it does. | the same one-line mistake, made again and again |
| **The strongest remedy:** `rewrite` > `generate` > `patch` > `command` > `delegate` > `decide` | advice where a fix was possible |
| **A `check` on every finding**, runnable before resubmitting | "still wrong" rounds |
| **Exhaustive `coverage`:** every instance of a class, in one answer | whack-a-mole across siblings |
| **A scoped `subject.fingerprint`:** a verdict survives changes outside what was judged | re-reviews of unchanged code |
| **Stable finding ids** with `new`, `still-open` and `regressed`, plus `carried` | rounds that re-judge everything |
| **An attempt `budget`,** after which the gate must `escalate` to a person | loops without end |
| **A `preview` mode:** the same check, before the boundary | failures found at the last step |

[SPEC.md](SPEC.md) is the normative reference. [BINDINGS.md](BINDINGS.md) maps the contract onto Claude Code hooks, judgment agents and SARIF.

## Two kinds of gate, one contract

A **deterministic gate** (a hook, a linter, a policy script) and a **judgment gate** (a code-review agent, a spec auditor, a human reviewer) return the same object. That is the point. An orchestrator acts on `verdict`, `remedy` and `check`. It never parses prose, and it never has to tell a hook's text apart from a reviewer's report.

## Validate

```bash
yarn install
yarn test                                   # the validator's own tests
yarn validate                               # every example in examples/
node scripts/validate-examples.js my.json   # one response
node scripts/validate-examples.js --chain rounds/   # an ordered chain of rounds
```

The validator checks the JSON Schema and the rules a schema cannot express. Those rules are marked **[V]** in the spec:
- the verdict agrees with the findings;
- the attempt budget is respected;
- a `still-open`, `regressed` or `carried` id is consistent across a chain.

## Layout

| Path | What |
|---|---|
| `SPEC.md` | the normative specification |
| `EVIDENCE.md` | the measurement behind each rule |
| `BINDINGS.md` | runtime bindings |
| `schema/agc.schema.json` | JSON Schema 2020-12 |
| `examples/` | valid responses, a three-round review chain, and invalid cases with the rule each breaks |
| `packages/validator` | `validateResponse` and `validateChain` |

## Status

Draft 0.1. Field names may still change before 1.0. Bindings for Codex, Cursor and other hook runtimes are open.

## Related

- [SARIF](https://docs.oasis-open.org/sarif/sarif/v2.1.0/) standardises static-analysis results for tools. AGC standardises gate answers for agents, and maps onto SARIF in CI.

## License

[MIT](LICENSE).
