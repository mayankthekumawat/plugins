import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

function escapeExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function neutralizeRuntimeText(text, skillNames) {
  let result = text
    .replace(/^disable-model-invocation:\s*true\r?\n/gm, "")
    .replace(/^mode:\s*true\r?\n/gm, "")
    .replace(/^icon:\s*[^\r\n]+\r?\n/gm, "")
    .replace(/^color:\s*[^\r\n]+\r?\n/gm, "")
    .replace(/^reminder:\s*[^\r\n]+\r?\n/gm, "")
    .replace(/~\/\.cursor\/rules\/pstack-models\.mdc/g, ".pstack/models.yaml")
    .replace(/\.cursor\/rules\/pstack-models\.mdc/g, ".pstack/models.yaml")
    .replace(/~\/\.cursor\/skills/g, "~/.agents/skills")
    .replace(/\.cursor\/skills/g, ".agents/skills")
    .replace(/Run Cursor's `?\/loop`? command/gi, "Use the runtime's recurring mechanism")
    .replace(/Cursor's `?\/loop`? command/gi, "the runtime's recurring mechanism")
    .replace(/Cursor's recurring `?\/loop`? command/gi, "the runtime's recurring mechanism")
    .replace(/\/loop\b/g, "the runtime's recurring mechanism")
    .replace(/\bAskQuestion\b/g, "the runtime's user-input mechanism")
    .replace(/\bthe Read tool\b/g, "the runtime's file-reading mechanism")
    .replace(/\bRead tool\b/g, "file-reading mechanism")
    .replace(/\bTask calls\b/g, "delegation calls")
    .replace(/\bTask call\b/g, "delegation call")
    .replace(/\bTask error\b/g, "delegation error")
    .replace(/\bTask subagent\b/g, "delegated subagent")
    .replace(/`Task`/g, "the runtime's delegation mechanism")
    .replace(/\bsubagent_type:\s*"Comment Sicko"/g, "a generic subagent that reads `references/comment-sicko.md`")
    .replace(/\bsubagent_type:\s*"poteto-agent"/g, "a generic subagent instructed to use the `poteto-mode` skill")
    .replace(/\bsubagent_type:\s*generalPurpose\b/g, "a generic subagent")
    .replace(/\bsubagent_type:\s*"generalPurpose"/g, "a generic subagent")
    .replace(/\bgeneralPurpose\b/g, "generic subagent")
    .replace(/\brun_in_background:\s*true\b/g, "run asynchronously when supported")
    .replace(
      /Use control-ui from the cursor-team-kit plugin\./g,
      "Use an available browser or UI control capability.",
    )
    .replace(
      /`control-ui` \(for browser, Electron, web\) and `control-cli` \(for CLIs and TUIs\) ship in `cursor-team-kit` too\./g,
      "Use an available browser or UI control capability for browser, Electron, and web surfaces, and an available CLI control capability for CLIs and TUIs.",
    )
    .replace(
      /\b(?:claude-(?:fable|opus)-[a-z0-9.-]+|gpt-[0-9.]+-(?:sol|terra|luna)[a-z0-9.-]*|grok-[a-z0-9.-]+)\b/gi,
      "inherit-parent",
    );

  for (const name of [...skillNames].sort((left, right) => right.length - left.length)) {
    result = result.replace(
      new RegExp(
        `(?<![A-Za-z0-9._/-])/${escapeExpression(name)}(?=\\s|[\\x60),.:;]|$)`,
        "g",
      ),
      name,
    );
  }
  return result;
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

async function apply(root) {
  const absoluteRoot = resolve(root);
  const skillRoot = join(absoluteRoot, "skills");
  const skillNames = new Set(
    (await readdir(skillRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  const files = [
    ...(await walk(skillRoot)),
    ...(await walk(join(absoluteRoot, "docs"))),
    join(absoluteRoot, "README.md"),
  ].filter((file) => textExtensions.has(extname(file).toLowerCase()));
  let changed = 0;
  for (const file of files) {
    const before = await readFile(file, "utf8");
    const after = neutralizeRuntimeText(before, skillNames);
    if (after === before) continue;
    await writeFile(file, after, "utf8");
    changed += 1;
  }
  console.log(`updated ${changed} files`);
}

async function main() {
  const [, , command, root] = process.argv;
  if (command !== "apply" || !root) {
    console.error("usage: node neutralize-runtime.mjs apply <pstack-root>");
    process.exitCode = 2;
    return;
  }
  await apply(root);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
