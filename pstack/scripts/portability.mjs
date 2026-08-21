import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const supportedFrontmatter = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);

const skillCommands = [
  "poteto-mode",
  "how",
  "why",
  "recall",
  "blast-radius",
  "architect",
  "arena",
  "swarm",
  "interrogate",
  "automate-me",
  "setup-pstack",
  "reflect",
  "teach",
  "tdd",
  "no-comments",
  "typescript-best-practices",
  "figure-it-out",
  "show-me-your-work",
  "create-verification-skill",
  "maintain-verification-skill",
  "unslop",
  "bro",
  "technical-writing",
  "deslop",
  "babysit",
  "loop",
  "create-skill",
  "goal",
  "add-plugin",
];

const runtimePatterns = [
  {
    code: "cursor-runtime-term",
    expression: /\bCursor\b|\.cursor(?:[\\/])|cursor-team-kit|@cursor-skill|CURSOR_[A-Z_]+/,
  },
  {
    code: "runtime-tool-name",
    expression:
      /\bAskQuestion\b|\bTask (?:call|subagent|tool|schema|prompts?)\b|`Task`|\bRead tool\b|subagent_type|generalPurpose|run_in_background|cloud_base_branch|`readonly`:\s*`?(?:true|false)|\breadonly:\s*(?:true|false)/,
  },
  {
    code: "slash-command",
    expression: new RegExp(
      `(?<![A-Za-z0-9._/-])/(?:${skillCommands.join("|")})(?=\\s|[),.'"]|\\x60|$)`,
    ),
  },
  {
    code: "fixed-model-slug",
    expression:
      /\b(?:claude-(?:fable|opus)-[a-z0-9.-]+|gpt-[0-9.]+-(?:sol|terra|luna)[a-z0-9.-]*|grok-[a-z0-9.-]+)\b/i,
  },
];

const fidelityPatterns = [
  ...runtimePatterns.map(({ expression }) => expression),
  /\bcursor\b/i,
  /cursor_automation_id/,
  /\bcreate-skill\b/,
  /\bTask\b/,
  /\breadonly\b/,
  /^\s*- `model`:/,
  /\bcloud(?:-agent)?\b|control-(?:ui|cli)/i,
  /\/<handle>-mode/,
  /automations\/benny/,
  /^\s*```(?:bash)?\s*$/,
  /^---\s*$/,
  /\binstall the plugin\b/i,
  /\bmodel rule applies to new sessions\b/i,
  /description: pstack per-role model choices/,
  /alwaysApply:/,
  /agent-transcripts|JSONL|message\.content/,
  /\.jsonl\b/i,
  /\btodo(?:list| list)\b/i,
  /\bMCP\b/,
  /\/tmp\//,
  /\bls -t\b/,
  /current agent's store \(path in the system prompt\)/,
  /arm it via the loop skill/,
  /^### 2\. Spawn three reviewers in parallel$/,
  /^\s*$/,
  /^slug=\$\(printf /,
  /^\s*(?:disable-model-invocation|mode|icon|color|reminder):/,
  /disable-model-invocation/,
  /^name:\s+Poteto Mode\s*$/,
];

const textExtensions = new Set([
  ".md",
  ".json",
  ".yaml",
  ".yml",
  ".ts",
  ".js",
  ".mjs",
  ".sh",
]);

function lineNumberAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

function diagnostic(file, code, line, message) {
  return { file, code, line, message };
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;

  const entries = [];
  for (const [index, line] of match[1].split(/\r?\n/).entries()) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):(?:\s*(.*))?$/);
    if (key) entries.push({ key: key[1], value: key[2] ?? "", line: index + 2 });
  }
  return { entries };
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  if (!(await exists(directory))) return [];
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

function portableRelative(root, file) {
  return relative(root, file).split(sep).join("/");
}

function validateFrontmatter(root, file, text) {
  const fileName = portableRelative(root, file);
  const parsed = parseFrontmatter(text);
  if (!parsed) {
    return [diagnostic(fileName, "missing-frontmatter", 1, "SKILL.md has no YAML frontmatter")];
  }

  const diagnostics = [];
  const values = new Map(parsed.entries.map((entry) => [entry.key, entry]));
  for (const required of ["name", "description"]) {
    if (!values.has(required)) {
      diagnostics.push(
        diagnostic(fileName, "missing-frontmatter-field", 1, `missing ${required} field`),
      );
    }
  }

  for (const entry of parsed.entries) {
    if (!supportedFrontmatter.has(entry.key)) {
      diagnostics.push(
        diagnostic(
          fileName,
          "unsupported-frontmatter",
          entry.line,
          `unsupported frontmatter field: ${entry.key}`,
        ),
      );
    }
  }

  const name = values.get("name")?.value.replace(/^['"]|['"]$/g, "");
  const directoryName = dirname(file).split(sep).at(-1);
  if (
    name &&
    (name !== directoryName ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) ||
      name.length > 64)
  ) {
    diagnostics.push(
      diagnostic(
        fileName,
        "skill-name-mismatch",
        values.get("name").line,
        `skill name ${JSON.stringify(name)} must match directory ${JSON.stringify(directoryName)}`,
      ),
    );
  }

  return diagnostics;
}

async function validateReferences(root, file, text) {
  const diagnostics = [];
  const expression = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(expression)) {
    const target = match[1].split(/[?#]/, 1)[0];
    if (
      !target ||
      target.startsWith("#") ||
      target === "url" ||
      target.includes("${") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target) ||
      target.startsWith("/")
    ) {
      continue;
    }
    const decoded = decodeURIComponent(target.replace(/^<|>$/g, ""));
    if (!(await exists(resolve(dirname(file), decoded)))) {
      diagnostics.push(
        diagnostic(
          portableRelative(root, file),
          "missing-reference",
          lineNumberAt(text, match.index),
          `missing relative reference: ${target}`,
        ),
      );
    }
  }
  return diagnostics;
}

function validateRuntimeTerms(root, file, text) {
  const diagnostics = [];
  for (const { code, expression } of runtimePatterns) {
    for (const match of text.matchAll(new RegExp(expression.source, `${expression.flags}g`))) {
      diagnostics.push(
        diagnostic(
          portableRelative(root, file),
          code,
          lineNumberAt(text, match.index),
          `runtime-specific text: ${match[0]}`,
        ),
      );
    }
  }
  return diagnostics;
}

async function collectPortableFiles(absoluteRoot) {
  const candidates = [join(absoluteRoot, "skills")];
  for (const optional of ["README.md", "docs"]) {
    const path = join(absoluteRoot, optional);
    if (await exists(path)) candidates.push(path);
  }

  const files = [];
  for (const candidate of candidates) {
    if ((await exists(candidate)) && extname(candidate)) files.push(candidate);
    else files.push(...(await walk(candidate)));
  }
  return files
    .filter((file) => textExtensions.has(extname(file).toLowerCase()))
    .sort();
}

export async function validatePortableTree(root) {
  const absoluteRoot = resolve(root);
  const files = await collectPortableFiles(absoluteRoot);

  const diagnostics = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (file.endsWith(`${sep}SKILL.md`)) {
      diagnostics.push(...validateFrontmatter(absoluteRoot, file, text));
    }
    diagnostics.push(...validateRuntimeTerms(absoluteRoot, file, text));
    diagnostics.push(...(await validateReferences(absoluteRoot, file, text)));
  }

  return diagnostics.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.code.localeCompare(right.code),
  );
}

function longestCommonSubsequence(left, right) {
  const lengths = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0),
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      lengths[leftIndex][rightIndex] =
        left[leftIndex - 1] === right[rightIndex - 1]
          ? lengths[leftIndex - 1][rightIndex - 1] + 1
          : Math.max(
              lengths[leftIndex - 1][rightIndex],
              lengths[leftIndex][rightIndex - 1],
            );
    }
  }

  const retained = new Set();
  let leftIndex = left.length;
  let rightIndex = right.length;
  while (leftIndex > 0 && rightIndex > 0) {
    if (left[leftIndex - 1] === right[rightIndex - 1]) {
      retained.add(leftIndex - 1);
      leftIndex -= 1;
      rightIndex -= 1;
    } else if (
      lengths[leftIndex - 1][rightIndex] >= lengths[leftIndex][rightIndex - 1]
    ) {
      leftIndex -= 1;
    } else {
      rightIndex -= 1;
    }
  }
  return retained;
}

export function checkFidelity(before, after, file) {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const retained = longestCommonSubsequence(beforeLines, afterLines);
  const violations = [];
  for (const [index, line] of beforeLines.entries()) {
    if (retained.has(index) || fidelityPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }
    violations.push(
      diagnostic(
        file,
        "portable-prose-changed",
        index + 1,
        `portable prose was removed or rewritten: ${line}`,
      ),
    );
  }
  return violations;
}

export async function validateFidelityTrees(beforeRoot, afterRoot) {
  const absoluteBefore = resolve(beforeRoot);
  const absoluteAfter = resolve(afterRoot);
  const beforeFiles = await collectPortableFiles(absoluteBefore);
  const afterFiles = await collectPortableFiles(absoluteAfter);
  const relativeFiles = new Set([
    ...beforeFiles.map((file) => portableRelative(absoluteBefore, file)),
    ...afterFiles.map((file) => portableRelative(absoluteAfter, file)),
  ]);
  const violations = [];
  for (const file of [...relativeFiles].sort()) {
    const beforePath = join(absoluteBefore, file);
    const afterPath = join(absoluteAfter, file);
    if (!(await exists(beforePath))) continue;
    const before = await readFile(beforePath, "utf8");
    const after = (await exists(afterPath)) ? await readFile(afterPath, "utf8") : "";
    violations.push(...checkFidelity(before, after, file));
  }
  return violations;
}

function printDiagnostics(diagnostics) {
  for (const item of diagnostics) {
    console.error(`${item.file}:${item.line} [${item.code}] ${item.message}`);
  }
}

async function main() {
  const [, , command = "check", first = ".", second] = process.argv;
  let diagnostics;
  if (command === "check") {
    diagnostics = await validatePortableTree(first);
  } else if (command === "fidelity" && second) {
    diagnostics = await validateFidelityTrees(first, second);
  } else {
    console.error(
      "usage: node portability.mjs check <pstack-root> | fidelity <before-root> <after-root>",
    );
    process.exitCode = 2;
    return;
  }
  printDiagnostics(diagnostics);
  if (diagnostics.length > 0) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
