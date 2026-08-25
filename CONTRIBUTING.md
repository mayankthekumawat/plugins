# Add skills to mstack

mstack is for skills that solve repeated work in production systems. A useful prompt is not enough. A skill needs a clear trigger, a bounded job, and a way to prove its result.

## Choose the right home

- Change files under `pstack/` when the work adapts or fixes the pstack collection.
- Put an independent mstack skill under `skills/<skill-name>/`.
- Keep runtime-specific manifests, automations, and agent definitions out of a generic skill. Put compatibility files in an `adapters/<runtime>/` directory owned by the relevant collection.

Do not move an upstream skill into mstack without preserving its license and attribution.

## Meet the production bar

Before proposing a skill, confirm these facts:

- The task has occurred more than once or has a clear operational owner.
- The description names the requests that trigger the skill.
- The instructions define scope, permissions, failure behavior, and completion.
- The skill uses capabilities instead of private tool names where a generic equivalent exists.
- Missing optional capabilities have a fallback or produce a clear stop condition.
- Verification checks the real output instead of trusting an agent's summary.
- Examples use plausible production constraints rather than toy work.

Keep one skill responsible for one job. Reuse another skill by name when that job already has an owner.

## Preserve adapted work

When modifying an existing collection, change only what the new runtime or requirement makes necessary. Keep portable prose, terminology, and voice intact.

If a mechanical conversion covers several files, commit the conversion script or checker. A reviewer should be able to distinguish required interface changes from editorial churn.

## Check the submission

Before opening a pull request:

1. Confirm that every `SKILL.md` has `name` and `description` frontmatter.
2. Check every relative file reference.
3. Search generic instructions for fixed model identifiers and runtime-only commands.
4. Run the collection's validators and tests.
5. Read the rendered Markdown and confirm that installation instructions match the repository tree.
6. Name the original source and describe what changed in the pull request.

For pstack changes, run:

```text
node pstack/scripts/portability.mjs check pstack
node pstack/tests/neutralize-runtime.test.mjs
node pstack/tests/portability.test.mjs
```
