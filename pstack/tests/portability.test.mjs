import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  checkFidelity,
  validateFidelityTrees,
  validatePortableTree,
} from "../scripts/portability.mjs";

async function writeSkill(root, directory, contents) {
  const skillDirectory = join(root, "skills", directory);
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(join(skillDirectory, "SKILL.md"), contents, "utf8");
}

test("a standards-compatible runtime-neutral skill passes", async () => {
  const root = await mkdtemp(join(tmpdir(), "pstack-portable-"));
  await writeSkill(
    root,
    "portable-skill",
    `---
name: portable-skill
description: Use when a portable example is needed.
---

# Portable skill

Use the runtime's available delegation mechanism when it exists.
`,
  );

  assert.deepEqual(await validatePortableTree(root), []);
});

test("runtime-specific fields, paths, tools, commands, and models fail", async () => {
  const root = await mkdtemp(join(tmpdir(), "pstack-bound-"));
  await writeSkill(
    root,
    "bound-skill",
    `---
name: Bound Skill
description: Use for /bound-skill in Cursor.
disable-model-invocation: true
---

# Bound skill

Use AskQuestion, then make a Task call with subagent_type: generalPurpose.
Read ~/.cursor/rules/pstack-models.mdc and run /loop on claude-fable-5-thinking-max.
`,
  );

  const codes = new Set(
    (await validatePortableTree(root)).map((diagnostic) => diagnostic.code),
  );

  assert.ok(codes.has("skill-name-mismatch"));
  assert.ok(codes.has("unsupported-frontmatter"));
  assert.ok(codes.has("cursor-runtime-term"));
  assert.ok(codes.has("runtime-tool-name"));
  assert.ok(codes.has("slash-command"));
  assert.ok(codes.has("fixed-model-slug"));
});

test("missing relative references fail while existing references pass", async () => {
  const root = await mkdtemp(join(tmpdir(), "pstack-references-"));
  await writeSkill(
    root,
    "reference-skill",
    `---
name: reference-skill
description: Use when checking references.
---

Read [the present reference](references/present.md).
Read [the missing reference](references/missing.md).
Read [the runtime URL](\${url}).
Use [URL](url) as a prompt placeholder.
`,
  );
  const references = join(root, "skills", "reference-skill", "references");
  await mkdir(references, { recursive: true });
  await writeFile(join(references, "present.md"), "# Present\n", "utf8");

  const missing = (await validatePortableTree(root)).filter(
    (diagnostic) => diagnostic.code === "missing-reference",
  );

  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /references\/missing\.md/);
});

test("fidelity guard rejects edits to already-portable prose", () => {
  const before = `# Rule

Keep this opinionated sentence exactly as written.
`;
  const after = `# Rule

Rewrite this sentence into neutral house style.
`;

  const violations = checkFidelity(before, after, "skills/example/SKILL.md");

  assert.equal(violations.length, 1);
  assert.match(violations[0].message, /portable prose/);
});

test("fidelity guard permits the smallest replacement of a runtime-bound line", () => {
  const before = `# Rule

Run Cursor's /loop command until the check passes.
Keep this opinionated sentence exactly as written.
`;
  const after = `# Rule

Use the runtime's recurring mechanism until the check passes.
Keep this opinionated sentence exactly as written.
`;

  assert.deepEqual(
    checkFidelity(before, after, "skills/example/SKILL.md"),
    [],
  );
});

test("tree fidelity reports only changed portable lines", async () => {
  const beforeRoot = await mkdtemp(join(tmpdir(), "pstack-before-"));
  const afterRoot = await mkdtemp(join(tmpdir(), "pstack-after-"));
  const original = `---
name: example
description: Use when testing fidelity.
---

Run Cursor's /loop command until the check passes.
Keep this opinionated sentence exactly as written.
`;
  await writeSkill(beforeRoot, "example", original);
  await writeSkill(
    afterRoot,
    "example",
    original
      .replace(
        "Run Cursor's /loop command until the check passes.",
        "Use the runtime's recurring mechanism until the check passes.",
      )
      .replace(
        "Keep this opinionated sentence exactly as written.",
        "Rewrite this sentence into neutral house style.",
      ),
  );

  const violations = await validateFidelityTrees(beforeRoot, afterRoot);

  assert.equal(violations.length, 1);
  assert.equal(violations[0].file, "skills/example/SKILL.md");
  assert.equal(violations[0].line, 7);
});
