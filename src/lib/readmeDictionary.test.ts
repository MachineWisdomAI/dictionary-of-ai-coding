import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { parseReadmeDictionary } from "./readmeDictionary";

const markdown = readFileSync(join(process.cwd(), "README.md"), "utf8");
const dictionary = parseReadmeDictionary(markdown);

test("parses the generated README structure", () => {
  assert.equal(dictionary.title, "AI Coding Dictionary");
  assert.equal(dictionary.sections.length, 7);
  assert.equal(dictionary.entries.length, 69);
  assert.equal(dictionary.sections[0]?.title, "Section 1 — The Model");
  assert.equal(
    dictionary.sections.at(-1)?.title,
    "Section 7 — Patterns of Work"
  );
});

test("keeps source section membership", () => {
  assert.deepEqual(dictionary.sections[0]?.entries.slice(0, 4), [
    "AI",
    "Model",
    "Parameters",
    "Training",
  ]);
  assert.deepEqual(dictionary.sections.at(-1)?.entries.slice(-3), [
    "Prototyping",
    "DX",
    "AX",
  ]);
});

test("generates stable entry slugs", () => {
  const slugs = new Map(
    dictionary.entries.map((entry) => [entry.term, entry.slug])
  );
  assert.equal(slugs.get("AI"), "ai");
  assert.equal(slugs.get("Next-token prediction"), "next-token-prediction");
  assert.equal(slugs.get("AGENTS.md"), "agentsmd");
});

test("extracts entry traits and preserves rendered tables", () => {
  const ai = dictionary.entries.find((entry) => entry.term === "AI");
  const model = dictionary.entries.find((entry) => entry.term === "Model");
  const effort = dictionary.entries.find((entry) => entry.term === "Effort");

  assert.ok(ai);
  assert.equal(ai.hasTable, true);
  assert.match(ai.bodyHtml, /<table>/);
  assert.equal(model?.hasUsage, true);
  assert.equal(effort?.hasAvoid, false);
});

test("extracts usage, avoid, and table counts", () => {
  assert.equal(dictionary.stats.usageCount, 69);
  assert.equal(dictionary.stats.avoidCount, 17);
  assert.equal(dictionary.stats.tableCount, 17);
  assert.equal(dictionary.stats.medianWords, 270);
});

test("builds the internal link graph", () => {
  const hubs = dictionary.linkGraph.hubs.map((hub) => hub.term);
  assert.deepEqual(hubs.slice(0, 7), [
    "Agent",
    "Session",
    "Model",
    "Harness",
    "Context",
    "Context window",
    "Token",
  ]);

  const model = dictionary.entries.find((entry) => entry.term === "Model");
  assert.ok(model);
  assert.ok(model.outboundLinks.includes("parameters"));
  assert.ok(model.inboundLinks.length > 30);
  assert.ok(dictionary.linkGraph.edges.length > 500);
});
