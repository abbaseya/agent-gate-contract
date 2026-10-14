# Examples

| File | Shows |
|---|---|
| `allow.json` | a gate with nothing to report |
| `repaired-rewrite.json` | a hook that fixes the command itself instead of blocking |
| `repaired-generate.json` | a gate that generates a missing pull-request section |
| `block-patch-exhaustive.json` | two instances of one class in one answer, with a patch and a delegation |
| `escalate-budget.json` | the attempt budget spent, handed to a person with options |
| `related-links.json` | a 0.2 response with an `id` and `related` links. The `rel` and `type` values come from a profile, here the Agent SDLC interoperability profile. |
| `chains/code-review/` | three review rounds: a finding stays open, two are carried as closed, then `allow` |
| `invalid/` | one response per **[V]** rule it breaks. `expected.json` names the rule. |
| `invalid-chains/` | a chain that breaks a §9 or §3.1 rule |
