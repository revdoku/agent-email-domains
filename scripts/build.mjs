#!/usr/bin/env node
// Validates domains.json and writes the plain lists in lists/.
// Usage: node scripts/build.mjs          (validate and write)
//        node scripts/build.mjs --check  (validate; fail if lists/ is stale)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const SOURCE = join(ROOT, "domains.json");
const LISTS = join(ROOT, "lists");
const CATEGORIES = ["agent_inbox", "test_inbox"];
const REQUIRED = ["domain", "provider", "category", "evidence"];
const OPTIONAL = ["mx_host", "notes"];
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const check = process.argv.includes("--check");
const errors = [];

let entries;
try {
  entries = JSON.parse(readFileSync(SOURCE, "utf8"));
} catch (error) {
  fail([`domains.json: ${error.message}`]);
}
if (!Array.isArray(entries)) fail(["domains.json: the top level must be an array"]);

entries.forEach((entry, index) => {
  const where = `entry ${index + 1}${entry?.domain ? ` (${entry.domain})` : ""}`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  for (const key of REQUIRED) {
    if (typeof entry[key] !== "string" || entry[key].trim() === "") errors.push(`${where}: "${key}" is required`);
  }
  for (const key of Object.keys(entry)) {
    if (!REQUIRED.includes(key) && !OPTIONAL.includes(key)) errors.push(`${where}: unknown field "${key}"`);
  }
  if (typeof entry.domain === "string" && !validDomain(entry.domain)) {
    errors.push(`${where}: "domain" must be a lowercase host name with no trailing dot`);
  }
  if (entry.category !== undefined && !CATEGORIES.includes(entry.category)) {
    errors.push(`${where}: "category" must be one of ${CATEGORIES.join(", ")}`);
  }
  if (typeof entry.evidence === "string" && !httpsUrl(entry.evidence)) {
    errors.push(`${where}: "evidence" must be an https URL`);
  }
  if ("mx_host" in entry) {
    const host = entry.mx_host;
    const inside = typeof host === "string" && typeof entry.domain === "string" && host.endsWith(`.${entry.domain}`);
    if (!inside || !validDomain(host)) errors.push(`${where}: "mx_host" must be a subdomain of "domain"`);
  }
  if ("notes" in entry && typeof entry.notes !== "string") errors.push(`${where}: "notes" must be a string`);
});

const domains = entries.map((entry) => entry?.domain).filter((domain) => typeof domain === "string");
domains.forEach((domain, index) => {
  if (index > 0 && domains[index - 1] >= domain) {
    errors.push(`${domain}: entries must be sorted by domain with no duplicates (after ${domains[index - 1]})`);
  }
  const parent = domains.find((other) => domain.endsWith(`.${other}`));
  if (parent) errors.push(`${domain}: already covered by ${parent} (each entry covers its subdomains)`);
});

if (errors.length) fail(errors);

const files = {
  "all.txt": domains,
  ...Object.fromEntries(
    CATEGORIES.map((category) => [
      `${category}.txt`,
      entries.filter((entry) => entry.category === category).map((entry) => entry.domain),
    ]),
  ),
};

const stale = [];
for (const [name, list] of Object.entries(files)) {
  const path = join(LISTS, name);
  const content = list.length ? `${list.join("\n")}\n` : "";
  const current = existsSync(path) ? readFileSync(path, "utf8") : null;
  if (current === content) continue;
  if (check) {
    stale.push(`lists/${name}`);
  } else {
    mkdirSync(LISTS, { recursive: true });
    writeFileSync(path, content);
    console.log(`wrote lists/${name} (${list.length} domains)`);
  }
}

if (stale.length) fail([`${stale.join(", ")} out of date. Run: node scripts/build.mjs`]);
console.log(`ok: ${entries.length} domains`);

function validDomain(domain) {
  if (domain.length > 253 || !domain.includes(".")) return false;
  return domain.split(".").every((label) => LABEL.test(label));
}

function httpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function fail(messages) {
  for (const message of messages) console.error(`error: ${message}`);
  process.exit(1);
}
