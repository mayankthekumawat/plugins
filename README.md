# mstack

Agent Skills for real production work, beginning with a runtime-neutral pstack.

mstack collects skills that have earned a place in day-to-day engineering work. It starts with [pstack](./pstack/), created by [poteto](https://x.com/poteto), and replaces its runtime-specific interfaces with capability-based instructions that work across coding agents.

mstack is broader than pstack. pstack is the first collection, not the boundary. Future skills can cover deployment, incident response, access operations, maintenance, and other repeated work from production systems.

## How mstack differs from pstack

| | Original pstack | mstack |
|---|---|---|
| Purpose | One opinionated engineering stack | A home for pstack and other production skills |
| Runtime | Built as a Cursor plugin | Uses the Agent Skills format and capability-based instructions |
| Models | Can refer to runtime-specific model choices | Defaults to the current agent and supports optional workspace overrides |
| Runtime integrations | Runtime calls can appear inside the skills | Runtime-specific files live in isolated adapters |
| Growth | Extends the pstack workflow | Can add independent skills without folding them into pstack |

The port does not rewrite pstack's engineering principles, playbooks, or voice. It changes the parts that bind those instructions to one agent runtime.

## What belongs in mstack

A skill belongs here when it meets these conditions:

- It solves a repeated job from a real production system.
- It says when to run, what it may change, and what counts as done.
- Its core instructions do not depend on one agent's private tool names or model identifiers.
- It provides a direct way to verify the result.
- It credits any source material and keeps upstream authorship clear.

Read [the contribution guide](./CONTRIBUTING.md) before adding or adapting a skill.

## Collections

| Collection | What it contains | Status |
|---|---|---|
| [pstack](./pstack/) | Engineering workflows, review panels, verification tools, writing skills, and operating principles | Available |

New independent skills can live under `skills/`. Existing pstack work stays under `pstack/` so the source and its adaptations remain easy to audit.

## Install skills

Install the directories you want from [`pstack/skills/`](./pstack/skills/). You can also install the full collection.

- For Codex, copy each skill directory to `~/.codex/skills/`.
- For a workspace that follows the Agent Skills convention, copy them to `.agents/skills/`.
- For another agent, use that runtime's skill directory.

Start a new agent session if the runtime loads its skill registry only at startup.

Most pstack workflows start with `poteto-mode`. Individual skills such as `architect`, `interrogate`, `how`, `why`, and `tdd` can also run directly.

## Attribution

[pstack](https://github.com/cursor/plugins/tree/main/pstack) was created by [poteto](https://x.com/poteto). Its principles, playbooks, prompts, and voice remain his work.

The runtime-neutral modifications and the mstack repository are by [Mayank Kumawat](https://github.com/mayankthekumawat).

The included pstack collection retains its [MIT license](./pstack/LICENSE).
