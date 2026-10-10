# Agent Gate Contract (AGC) Specification

**Version 0.1 — draft.** This is the single normative reference for the Agent Gate Contract. `README.md` is the tour, `EVIDENCE.md` is the measurement behind each rule, and [`schema/agc.schema.json`](schema/agc.schema.json) encodes the fields. [`packages/validator`](packages/validator) enforces the schema plus the rules a JSON Schema cannot express. The rules it checks are marked **[V]** below.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT** and **MAY** follow [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

## 1. Scope

A **gate** is any check that can stop an AI agent's work. AGC defines the answer a gate gives. It covers both kinds of gate:

- a **deterministic gate** decides from its input alone. Examples: a pre-tool hook, a linter in CI, a policy script.
- a **judgment gate** decides by reading. Examples: a code-review agent, a spec auditor, a human reviewer.

**Both kinds MUST answer with the same object.** A hook that answers with free text and a reviewer that answers with a report leave the agent to translate each into its next action. Correction loops grow in that translation.

AGC does not define what a rule says. It defines only how a gate answers. It does not replace a runtime's hook API. It sits above it, as SARIF sits above each static analyser.

## 2. Design principles

A gate answer has one job: **end the correction loop in the fewest rounds.** Four principles follow.

1. **Change the action, not the model.** A model's weights do not change between turns, and its context does not reach the next subagent or the next session. A gate MUST prefer fixing the action or the artifact itself over sending text the agent must act on.
2. **One round per class, not per instance.** A gate MUST report every instance it finds.
3. **Every finding is checkable before resubmission.** The agent MUST be able to confirm a fix without asking the gate again.
4. **Every loop has a bound.** A gate MUST count its attempts and escalate at the bound.

## 3. The response object

A response is one JSON object. JSON is the only normative representation.

| Field | Required | Type | Meaning |
|---|---|---|---|
| `agc` | MUST | `"0.1"` | contract version |
| `gate` | MUST | object | §4 |
| `subject` | MUST | object | what was judged (§5) |
| `verdict` | MUST | enum | `allow`, `repaired`, `block` or `escalate` (§6) |
| `findings` | MUST unless `verdict` is `allow` | array | §7 |
| `coverage` | MUST | object | what was checked and what was not (§8) |
| `attempt` | MUST | object | §10 |
| `carried` | MAY | array of finding ids | earlier findings this response accepts as closed (§9) |

## 4. Gate

| Field | Required | Meaning |
|---|---|---|
| `id` | MUST | stable identifier of the gate, unique in its project |
| `kind` | MUST | `deterministic` or `judgment` |
| `version` | SHOULD | version of the gate's rules. A change of rules is a change of version. |

## 5. Subject

| Field | Required | Meaning |
|---|---|---|
| `kind` | MUST | `tool-call`, `diff`, `commit`, `artifact`, `pull-request` or `session` |
| `fingerprint` | MUST | a hash of exactly the content the gate judged, and of nothing else |
| `scope` | SHOULD | the paths, fields or units that content covers |

A verdict MUST remain valid while the content inside its `scope` is unchanged. A change outside the scope MUST NOT void the verdict.

A project MAY bind a verdict to a wider subject for a trust reason, for example "a reviewer approved this exact commit". It MUST then state that reason in the gate's documentation.

*Evidence: E-3 (approvals voided by unrelated commits).*

## 6. Verdict

| Verdict | Meaning | The runtime |
|---|---|---|
| `allow` | nothing blocks | runs the action |
| `repaired` | the gate fixed every blocking finding itself | runs the **repaired** action, and tells the agent what changed |
| `block` | the agent must act | stops the action, and gives the agent `findings` |
| `escalate` | the attempt budget is spent, or only a person can decide | stops the loop, and hands it to the person named in a `decide` remedy |

- **[V]** `allow` MUST NOT carry a blocking finding.
- **[V]** `block` MUST carry at least one blocking finding.
- **[V]** `repaired` MUST carry at least one blocking finding, and every blocking finding MUST have a `rewrite` or `generate` remedy with `applied: true`.
- **[V]** `block` MUST NOT be used when every blocking finding has a `rewrite` or `generate` remedy. Such a gate MUST apply the remedies and return `repaired`.
- **[V]** `escalate` MUST carry at least one finding with a `decide` remedy.

A gate that cannot apply a remedy in its runtime MUST still send that remedy as data, with `applied: false`, and return `block`.

*Evidence: E-1 (one-line fixes repeated by the agent).*

## 7. Findings

A finding is one violation at one location.

| Field | Required | Meaning |
|---|---|---|
| `id` | MUST | stable fingerprint of gate, class and location. The same violation MUST get the same `id` in every response. **[V]** Ids MUST be unique within a response. |
| `class` | MUST | stable id of the rule class. All instances of one class share it. |
| `location` | MUST | where it is: a path plus a symbol, a tool-call field, or a section of a document. A location SHOULD NOT be a bare line number, which moves when the file changes. |
| `what` | MUST | one sentence: what is wrong |
| `why` | MUST | one sentence: which rule it breaks |
| `severity` | MUST | `blocking` or `advisory`. Only `blocking` findings can stop the action. |
| `status` | MUST | `new`, `still-open` or `regressed` (§9) |
| `remedy` | MUST | §7.1 |
| `check` | MUST | §7.2 |

The RECOMMENDED form of `id` is `<gate.id>/<class>/<location>`.

### 7.1 Remedy

`remedy.kind` names the strongest fix available, in this order:

| Kind | Meaning | Required payload |
|---|---|---|
| `rewrite` | the gate can replace the action's input | `input`: the replacement input |
| `generate` | a tool can produce the missing artifact | `tool`: the command or generator |
| `patch` | an exact edit is known | `edits`: an array of `{path, find, replace}` |
| `command` | one exact command fixes it | `run` |
| `delegate` | a named role must fix it | `role`. SHOULD carry `authority`, the rule or spec item that permits the change. |
| `decide` | a person must choose | `ask` (who) and `options` (at least two) |

- A gate MUST NOT use a weaker kind when a stronger one is available.
- **[V]** Each kind MUST carry its payload.
- `applied` MUST be `true` only when the gate applied the remedy itself.

*Evidence: E-4 (bookkeeping a machine could produce).*

### 7.2 Check

`check` lets the agent confirm a fix before it resubmits.

| Kind | Meaning | Required payload |
|---|---|---|
| `command` | a command whose exit status 0 means fixed | `run` |
| `preview` | this gate in preview mode (§11) on the new subject | — |
| `condition` | an acceptance condition a reader can confirm | `condition`. SHOULD also carry `run`. |

- **[V]** A deterministic gate MUST use `command` or `preview`.
- A judgment gate MAY use `condition`. It SHOULD name a test or a command whenever one exists.

*Evidence: E-2 (the same finding still wrong in the next round).*

## 8. Coverage

| Field | Required | Meaning |
|---|---|---|
| `complete` | MUST | `true` only when the response reports every instance of every class in `classes` |
| `classes` | MUST | the classes this gate checked |
| `not_checked` | SHOULD | what the gate did not check |

- **[V]** When `complete` is `true`, every finding's `class` MUST appear in `classes`.
- A judgment gate MUST report every instance it found of each class, not only the first one.

*Evidence: E-5 (another instance of an already-reported class).*

## 9. Rounds

A **round** is one response to one subject scope. A sequence of rounds on the same scope is a **chain**.

After a `block`, the next round SHOULD judge only two things:
- the findings it raised;
- content whose fingerprint changed since the last round.

- `status: new` — first seen in this round.
- `status: still-open` — **[V]** the same `id` appeared as a finding in an earlier round of the chain.
- `status: regressed` — **[V]** the same `id` appeared in an earlier round's `carried`.
- `carried` — **[V]** each id MUST have appeared as a finding in an earlier round, and MUST NOT appear in this round's `findings`.

The validator checks the **[V]** rules of this section when it is given a chain in order.

## 10. Attempts

| Field | Required | Meaning |
|---|---|---|
| `n` | MUST | the number of this round in its chain, starting at 1 |
| `budget` | MUST | the most rounds this gate allows on one scope |

- **[V]** `n` MUST NOT exceed `budget`.
- **[V]** At `n == budget`, the verdict MUST NOT be `block`. The gate MUST `escalate` instead.
- A gate SHOULD escalate early when the same `class` is `still-open` in two consecutive rounds.

*Evidence: E-6 (chains of up to 11 rounds) and the external study cited there.*

## 11. Preview mode

Every gate MUST offer a preview mode. Preview runs the same code on a proposed subject and returns the same object. In preview a gate MUST NOT block, and it MUST NOT write state.

An agent SHOULD run preview before the action the gate guards.

*Evidence: E-7 (checks that fired only at the last step).*

## 12. Rendering for people

A runtime that shows a response to a person or to a model as text SHOULD render each finding as `what`, `why`, the remedy and the check, in that order. The text MUST be derived from the object, never written separately from it.

## 13. Runtime bindings

See [`BINDINGS.md`](BINDINGS.md). Bindings are non-normative in 0.1.

## Change history

See [`CHANGELOG.md`](CHANGELOG.md).
