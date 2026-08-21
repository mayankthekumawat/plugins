# Generic pstack portability design

## Goal

Port `pstack` from a Cursor-bound plugin to a runtime-neutral Agent Skills collection without rewriting its guidance, weakening its opinions, changing its playbooks, or sanding off its personality.

The port changes interfaces, not ideas. Every edit must be necessary because the original text names a Cursor-only path, command, frontmatter field, agent type, model slug, tool name, automation surface, or dependency.

## Fidelity invariant

Preserve the original prose byte-for-byte wherever it is already portable.

When a line mixes portable guidance with a Cursor-specific interface, replace the smallest possible phrase or clause. Do not rewrite the paragraph for style. Preserve its tone, sentence order, examples, emphases, jokes, strong opinions, and decision rules.

The following are not reasons to edit a line:

- The prose is unconventional, terse, forceful, or personal.
- Another author might organize the material differently.
- A principle overlaps with another skill.
- A workflow could be simplified or made more conventional.
- The wording does not match a different agent vendor's house style.

Skill names and frontmatter may change only where the Agent Skills specification requires lowercase directory-matching names or where a field is runtime-specific.

## Portability target

The core collection follows the Agent Skills `SKILL.md` format and assumes only these capabilities:

- Read and edit files.
- Run commands when the environment provides a shell.
- Inspect available tools and connectors.
- Ask the user for input when a genuine preference or authorization is required.
- Delegate to isolated agents when the runtime supports delegation.
- Wait, resume, or monitor when the runtime supports long-running work.

A skill must detect optional capabilities before relying on them. When a capability is absent, preserve the playbook's outcome and use the closest available mechanism. If no mechanism can satisfy the outcome, report that concrete gap instead of inventing results.

## Surgical substitution map

Use the same neutral terms consistently throughout the collection.

| Cursor-bound text | Runtime-neutral equivalent |
| --- | --- |
| `Task` call, `subagent_type`, `generalPurpose`, Cursor cloud agent | the runtime's available delegation mechanism or an isolated agent |
| `AskQuestion` | the runtime's user-input mechanism, or a concise direct question |
| `Read` tool | the runtime's file-reading mechanism |
| `/skill-name` command | use the named `skill-name` skill |
| `/loop` | the runtime's recurring, wakeup, or bounded monitoring mechanism |
| `.cursor/rules/pstack-models.mdc` | `.pstack/models.yaml` in the current workspace |
| Cursor model slugs | configured role model; otherwise inherit the parent agent's model |
| Cursor transcript paths | the active runtime's task or conversation history, when exposed |
| `cursor-team-kit` control skills | an available browser, UI, CLI, or computer-control capability |
| Cursor plan mode or built-ins | the runtime's available planning, skill-authoring, or PR-monitoring capability |
| `.cursor/skills` | a standards-compatible Agent Skills directory, with `.agents/skills` used in examples |

These substitutions are semantic interfaces, not invitations to generalize surrounding prose.

## Repository shape

Keep the existing skill directories and supporting references. Make only the packaging changes required to separate the portable core from Cursor product extensions.

- `pstack/skills/` remains the portable core.
- The `poteto-agent` wrapper becomes a reference used by `poteto-mode`; the mode itself remains the entry point.
- Comment Sicko's prompt becomes a reference used by `no-comments`; its text remains intact.
- Cursor plugin metadata and the Benny Cursor automation pack move under `pstack/adapters/cursor/`. They remain available as a compatibility adapter but are not dependencies of the generic skills.
- Add installation documentation for standards-compatible skill directories. Runtime-specific adapter notes stay clearly separated from the core instructions.
- Preserve the MIT license and original attribution.

## Model configuration

`setup-pstack` writes `.pstack/models.yaml` in the workspace. Each role accepts either a runtime-recognized model identifier or `inherit-parent`.

The setup skill detects models only through capabilities actually exposed by the current runtime. It never writes an unverified identifier. If model enumeration is unavailable, it defaults every role to `inherit-parent` and offers the user a chance to provide supported identifiers.

The role names and routing logic remain unchanged. Only the storage path, syntax, and hard-coded vendor model defaults change.

## Optional capabilities

Multi-agent panels, transcript recovery, UI verification, long-running monitoring, MCP or connector evidence, Graphite, and GitHub remain optional capabilities.

The existing workflow still applies when the capability exists. When it does not:

- Preserve the requested outcome.
- Use another available capability when it provides equivalent evidence.
- Reduce fan-out to the parent agent only when delegation is unavailable.
- Report unavailable evidence sources explicitly.
- Never fabricate a completed panel, transcript check, UI run, or external status.

## Verification strategy

### Red: establish the current failure

Before changing skill text, add and run a portability validator against the current upstream content. It must fail on Cursor-only frontmatter, paths, commands, model defaults, agent types, built-ins, and hard dependencies in the generic core.

Create representative behavioral scenarios for the router and capability-heavy skills. Run them without the ported guidance and record where a non-Cursor agent cannot follow the instructions.

### Green: make surgical substitutions

Port one skill or tightly coupled skill group at a time. After each unit:

- Run the portability validator.
- Validate every changed `SKILL.md` against the Agent Skills specification.
- Run the unit's behavioral scenario when it has runtime-dependent behavior.
- Review the diff before starting the next unit.

### Fidelity guard

Add a diff-based check against `upstream/main` that flags deleted or modified prose lines unless the original line contains an approved runtime-specific token or exact frontmatter field. The allowlist is narrow and reviewable.

The guard does not approve replacement prose automatically. Every added line still receives manual review. Its purpose is to catch editorial drift and accidental rewrites of portable text.

### Final checks

- The generic core contains no Cursor-only dependency.
- All skill names match their directories and all frontmatter validates.
- Every relative reference resolves.
- Existing Bun tests under `poteto-mode/scripts` pass.
- Shell and TypeScript helpers still work on their supported platforms.
- Representative routing, delegation, review, recall, setup, and verification scenarios behave correctly with available capabilities and fail honestly without them.
- The complete diff passes the fidelity guard and a manual line-by-line review.

## Delivery

Work on `codex/generic-pstack` in `mayankthekumawat/plugins`. Keep the fork's `origin` and `cursor/plugins` as `upstream`.

Commit the approved design separately. Implement the port in verifiable units, then push the completed branch. Do not open a pull request to the Cursor repository unless the user asks for one.

## Out of scope

- Editorial cleanup or prose modernization.
- Renaming pstack, poteto-mode, playbooks, or principles for taste.
- Changing autonomy, testing, review, architecture, or writing philosophies.
- Adding new playbooks or principles.
- Replacing optional third-party workflows with a new orchestration framework.
- Claiming universal support for capabilities an agent runtime does not expose.
