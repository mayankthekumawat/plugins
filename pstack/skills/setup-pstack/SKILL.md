---
name: setup-pstack
description: Configure which models pstack uses per role. Detects your available models and writes a workspace configuration that overrides the skill defaults. Use for setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Write `.pstack/models.yaml`, a workspace configuration that sets pstack's model per role. The skills read it and fall back to their inline defaults when a line is absent, so this is an override layer, not a requirement.

## Steps

### 1. Detect available models

Enumerate the model identifiers the runtime accepts for delegated agents in this session; that is the dependable source. If the runtime exposes a models API or CLI that lists the user's entitled models, prefer it for completeness. If you cannot detect any, ask the user to paste the identifiers they have access to. Never write a real identifier you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected identifiers.

If the runtime has no delegated-agent or model-selection capability, keep every role on `inherit-parent`; the workflows still run in the parent through their documented fallbacks.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `.pstack/models.yaml` already exists, read it and treat its values as the current choices. Otherwise start from those defaults.

### 3. Map and confirm

Show every role with its current model, marking any real slug not in the detected set as needing a choice. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer the runtime's user-input mechanism over free text. For panel roles (how critics, arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set; `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again. A rule pointing at a model the user cannot use breaks every delegation that reads it.

### 5. Write the rule

Write `.pstack/models.yaml` with one entry per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```yaml
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the delegated model override). Alias entries in a panel list still count toward its fan-out.
"feature, refactoring": inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
"judgment and prose": inherit-parent
"hardest tasks": inherit-parent
"how explorer": inherit-parent
"how explainer": inherit-parent
"how critics": [inherit-parent, inherit-parent, inherit-parent, inherit-parent]
"why investigators": inherit-parent
"why synthesizer": inherit-parent
"reflect tooling": inherit-parent
"reflect judgment, divergent, synthesizer": inherit-parent
"arena runners": [inherit-parent, inherit-parent, inherit-parent, inherit-parent]
"arena cross-judge pool": [inherit-parent, inherit-parent, inherit-parent, inherit-parent]
"swarm workers": inherit-parent
"architect runners": [inherit-parent, inherit-parent, inherit-parent, inherit-parent]
"interrogate reviewers": [inherit-parent, inherit-parent, inherit-parent, inherit-parent]
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with create-verification-skill." On yes, invoke `create-verification-skill` (resolves wherever pstack is installed — workspace, user, or plugin). On no, move on without pushing.
