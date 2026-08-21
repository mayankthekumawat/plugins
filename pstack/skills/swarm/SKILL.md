---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
---

# Swarm

Fan out N parallel workers in isolated environments when supported. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

## Start

Open a todolist with one entry per phase before launching anything. If the runtime has no todo capability, keep the same entries in an explicit checklist.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is total workers, not the runtime's concurrency limit.
4. Pick the worker model from `swarm workers` in `.pstack/models.yaml` when present. Otherwise use `inherit-parent`. For a model race, name each arm's model up front.
   Omit the delegated model override for `inherit-parent` or `auto`, or when the runtime does not support model overrides.
5. Give each worker its own writable output when it writes. Use a worktree, branch, or a runtime-provided temporary directory such as `<temp>/swarm-<slug>/worker-<n>/`.

## Phase B: Fan out

Spawn all N workers in one message as generic subagents, run them asynchronously when supported, and use the configured model. Prefer isolated remote environments when the runtime supports them. Use local workers when they need access to something on the user's computer.

If the runtime has no subagent capability, run the same standalone briefs as labeled sequential passes in the parent. If it cannot run work asynchronously, drain the workers synchronously. Keep the same coverage, race rule, and aggregation contract.

When a worker must start from a non-default pushed branch, set its base branch with the runtime's supported delegation option.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.
