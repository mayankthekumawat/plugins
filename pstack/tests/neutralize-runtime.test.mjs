import assert from "node:assert/strict";
import test from "node:test";

import { neutralizeRuntimeText } from "../scripts/neutralize-runtime.mjs";

test("mechanical substitutions change interfaces and preserve portable prose", () => {
  const original = `---
name: example
description: Use for /example.
disable-model-invocation: true
---

Read ~/.cursor/rules/pstack-models.mdc with the Read tool.
Use AskQuestion, then make a Task call with subagent_type: generalPurpose.
Run Cursor's /loop command on claude-fable-5-thinking-max.
Use control-ui from the cursor-team-kit plugin.
Keep this opinionated sentence exactly as written.
`;

  assert.equal(
    neutralizeRuntimeText(original, new Set(["example"])),
    `---
name: example
description: Use for example.
---

Read .pstack/models.yaml with the runtime's file-reading mechanism.
Use the runtime's user-input mechanism, then make a delegation call with a generic subagent.
Use the runtime's recurring mechanism on inherit-parent.
Use an available browser or UI control capability.
Keep this opinionated sentence exactly as written.
`,
  );
});

test("skill invocation substitution is limited to known names", () => {
  assert.equal(
    neutralizeRuntimeText(
      "Use /known-skill, keep /tmp/example, architect/known-skill, and https://example.com/a/b.",
      new Set(["known-skill"]),
    ),
    "Use known-skill, keep /tmp/example, architect/known-skill, and https://example.com/a/b.",
  );
});
