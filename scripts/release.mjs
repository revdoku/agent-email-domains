#!/usr/bin/env node
// Prepares the next release from the changes in domains.json since the last v* tag.
// It picks the version, adds a section to CHANGELOG.md and writes the release notes.
// Prints the version, or nothing when domains.json has not changed.
// Usage: node scripts/release.mjs --notes FILE
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const args = process.argv.slice(2);
const notesPath = args[args.indexOf("--notes") + 1];
if (!args.includes("--notes") || !notesPath) fail("usage: node scripts/release.mjs --notes FILE");

const current = JSON.parse(readFileSync(join(ROOT, "domains.json"), "utf8"));
const lastTag = git(["describe", "--tags", "--abbrev=0", "--match", "v*"]);

let version;
let lines;
if (!lastTag) {
  version = "1.0.0";
  lines = [`- First release, with ${current.length} domains.`];
} else {
  const previous = JSON.parse(git(["show", `${lastTag}:domains.json`]) ?? "[]");
  const before = new Map(previous.map((entry) => [entry.domain, entry]));
  const after = new Map(current.map((entry) => [entry.domain, entry]));
  const added = current.filter((entry) => !before.has(entry.domain));
  const removed = previous.filter((entry) => !after.has(entry.domain));
  const changed = current.filter(
    (entry) => before.has(entry.domain) && JSON.stringify(before.get(entry.domain)) !== JSON.stringify(entry),
  );
  if (!added.length && !removed.length && !changed.length) process.exit(0);

  const [major, minor, patch] = lastTag.slice(1).split(".").map(Number);
  version = added.length || removed.length ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
  const describe = (entry) => `\`${entry.domain}\` (${entry.provider})`;
  lines = [
    added.length ? `- Added: ${added.map(describe).join(", ")}.` : null,
    removed.length ? `- Removed: ${removed.map(describe).join(", ")}.` : null,
    changed.length ? `- Updated: ${changed.map(describe).join(", ")}.` : null,
  ].filter(Boolean);
}

const date = new Date().toISOString().slice(0, 10);
const notes = `${lines.join("\n")}\n`;
const changelog = readFileSync(CHANGELOG, "utf8");
if (!changelog.includes(`\n## ${version} `)) {
  const section = `## ${version} - ${date}\n\n${notes}\n`;
  const at = changelog.indexOf("\n## ");
  writeFileSync(CHANGELOG, at === -1 ? `${changelog.trimEnd()}\n\n${section}` : `${changelog.slice(0, at + 1)}${section}${changelog.slice(at + 1)}`);
}
writeFileSync(notesPath, notes);
console.log(version);

function git(argv) {
  try {
    return execFileSync("git", argv, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
