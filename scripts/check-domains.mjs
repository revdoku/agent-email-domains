#!/usr/bin/env node
// Checks that every domain in domains.json still works:
//   1. MX: the domain (or its "mx_host") has an MX record.
//   2. Evidence: the "evidence" page loads and still mentions the domain.
// Usage: node scripts/check-domains.mjs                 (check, exit 1 on failures)
//        node scripts/check-domains.mjs --report FILE   (also write a Markdown report of failures)
import { readFileSync, writeFileSync } from "node:fs";
import { Resolver } from "node:dns/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const SOURCE = join(fileURLToPath(import.meta.url), "../../domains.json");
const USER_AGENT = "agent-email-domains-check (+https://github.com/revdoku/agent-email-domains)";
const args = process.argv.slice(2);
const reportIndex = args.indexOf("--report");
const reportPath = reportIndex === -1 ? null : args[reportIndex + 1];

const entries = JSON.parse(readFileSync(SOURCE, "utf8"));
const resolver = new Resolver({ timeout: 5000, tries: 3 });
const today = new Date().toISOString().slice(0, 10);
const pages = new Map();

const results = await Promise.all(
  entries.map(async (entry) => {
    const [mx, evidence] = await Promise.all([checkMx(entry), checkEvidence(entry)]);
    return { entry, mx, evidence, ok: mx.ok && evidence.ok };
  }),
);
const failures = results.filter((result) => !result.ok);

for (const { entry, mx, evidence, ok } of results) {
  console.log(`${ok ? "ok  " : "FAIL"} ${entry.domain.padEnd(28)} mx: ${mx.detail} | evidence: ${evidence.detail}`);
}

if (reportPath) {
  const rows = failures.map(({ entry, mx, evidence }) => {
    const problems = [mx.ok ? null : `MX: ${mx.detail}`, evidence.ok ? null : `Evidence: ${evidence.detail}`];
    return `| \`${entry.domain}\` | ${entry.provider} | ${problems.filter(Boolean).join("<br>")} | ${entry.evidence} |`;
  });
  const report = failures.length
    ? [
        `The domain check on ${today} found ${failures.length} problem domain(s).`,
        "",
        "| Domain | Provider | Problem | Evidence |",
        "|---|---|---|---|",
        ...rows,
        "",
        "Check whether the provider still gives out inboxes on these domains. Update the evidence URL if the page moved. A temporary DNS or network error can also cause a failure.",
      ].join("\n")
    : `The domain check on ${today} passed for all ${entries.length} domains.`;
  writeFileSync(reportPath, `${report}\n`);
}

console.log(`${results.length - failures.length}/${results.length} domains passed`);
process.exit(failures.length ? 1 : 0);

async function checkMx(entry) {
  const host = entry.mx_host ?? entry.domain;
  const label = host === entry.domain ? "" : ` (${host})`;
  try {
    const records = (await resolver.resolveMx(host)).sort((a, b) => a.priority - b.priority);
    const usable = records.filter((record) => record.exchange && record.exchange !== ".");
    if (!usable.length) return { ok: false, detail: `null MX${label}` };
    return { ok: true, detail: `${usable[0].exchange}${label}` };
  } catch (error) {
    const reason = error.code === "ENODATA" ? "no MX record" : `DNS error ${error.code ?? error.message}`;
    return { ok: false, detail: `${reason}${label}` };
  }
}

async function checkEvidence(entry) {
  if (!pages.has(entry.evidence)) pages.set(entry.evidence, fetchPage(entry.evidence));
  const page = await pages.get(entry.evidence);
  if (page.error) return { ok: false, detail: page.error };
  if (!page.text.includes(entry.domain)) return { ok: false, detail: "page no longer mentions the domain" };
  return { ok: true, detail: "found" };
}

async function fetchPage(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) return { error: `HTTP ${response.status}` };
      return { text: (await response.text()).toLowerCase() };
    } catch (error) {
      lastError = error.cause?.code ?? error.name;
    }
  }
  return { error: `request failed (${lastError})` };
}
