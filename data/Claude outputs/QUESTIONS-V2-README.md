# MCPA question bank — v2.1 (curated 2026-09-12)

The 34 files in `data/questions/` were rebuilt from scratch against the MCP
**2026-07-28** specification and JSON-RPC 2.0, and `data/search-index.json` was rebuilt to
match. Nothing else in the app has to change: the file names, the `meta` + `questions`
shape, the option `letter`/`text` objects and the `answer` / `answers` keys are unchanged.

## What happened

| | old bank | v2.1 bank |
|---|---|---|
| items | 522 | 200 |
| correct option is the longest | 361 items (69%) | 25% — exactly chance |
| always answering one letter | B-weighted | A 38 / B 37 / C 37 / D 38 — chance |
| multi-select: picking the longest N | usually right | 10% exact, 57% overlap — at or below chance |
| pure spec-prose recall, no scenario | 301 items (58%) | 0 — every stem states a situation |
| all/none-of-the-above | 43 items | 0 |
| items contradicting 2026-07-28 | 34 (initialize handshake, session ids, `ping`, `resources/subscribe`, `Last-Event-ID`, `tasks/list`, `tasks/result`, `-32001`, `-32002`, `logging/setLevel`) | 0 |
| multi-select keys | often "select all five" | always 2–3 of 5, never all |
| explanations | frequently one clause | every item says why the key is right **and** why the tempting distractor is wrong |
| spec citation | none | every item carries `source` |

## Domain mix — exactly the published MCPA weights

| exam domain | items | share | exam weight |
|---|---|---|---|
| Interactions & Execution | 52 | 26.0% | 26% |
| Security & Governance | 48 | 24.0% | 24% |
| Use Cases & Ecosystem | 40 | 20.0% | 20% |
| MCP Fundamentals | 32 | 16.0% | 16% |
| Architecture & Components | 28 | 14.0% | 14% |

Difficulty: 23 easy / 96 medium / 81 hard. Types: 106 mcq, 44 scenario, 50 multi-select.

## Why the anti-gaming numbers matter

A bank can be "correct" and still be useless for practice if a test-taker can score well
without knowing MCP. The old bank could be beaten three ways: pick the longest option (69%),
lean on B, or select everything on a multi-select. Each of those is now at chance, so a score
on this bank means what a score on the exam means.

## How the items are built

* **Single-select**: 4 options (A–D), exactly one correct.
* **Multi-select**: 5 options (A–E), exactly 2–3 correct — never all, never one.
* Distractors are *parallel*: same grammatical shape, same level of detail, same length band
  as the key, and each one is a real misconception (a retired method, a draft error code,
  the wrong HTTP status, a plausible-but-wrong header), not filler.
* Stems put you in a situation — a failing call, a header to choose, a token that just got
  rejected — and ask what to do, which is how the exam frames its questions.
* Every item carries `domain` (exam domain), `source` (spec path it was written from) and
  `protocolVersion` (`2026-07-28`) alongside the fields the app already reads.

## Search index

`data/search-index.json` was rebuilt: the 522 stale question documents were replaced with the
200 current ones, and the chunks for `EXAM-CHEAT-SHEET.md` and
`MCPA-SCENARIO-REASONING-GUIDE.md` were re-derived from the corrected versions of those two
files. `LEARNING-LOG.md`, `LEARNING-LOG-TEMPLATE.md` and the two spec documents were left
untouched. The BM25 parameters (`k1` 1.5, `b` 0.75) and the document shape are unchanged.

> **Note:** the two markdown source files themselves live outside `data/`. Replace them with
> the corrected copies, or the next index rebuild will reintroduce the errors that were fixed
> — notably the non-existent error code `-32001` and `-32002` presented as current.

## Files

| file | ch | chapter | exam domain | mode | items |
|---|---|---|---|---|---|
| `ch01-introduction-getting-started-multi.json` | 1 | MCP Fundamentals | MCP Fundamentals | multi-select | 8 |
| `ch01-introduction-getting-started.json` | 1 | MCP Fundamentals | MCP Fundamentals | single-select | 24 |
| `ch02-architecture-protocol-layers-multi.json` | 2 | Architecture & Protocol Layers | Architecture & Components | multi-select | 3 |
| `ch02-architecture-protocol-layers.json` | 2 | Architecture & Protocol Layers | Architecture & Components | single-select | 7 |
| `ch03-server-concepts-multi.json` | 3 | Server Concepts | Interactions & Execution | multi-select | 3 |
| `ch03-server-concepts.json` | 3 | Server Concepts | Interactions & Execution | single-select | 8 |
| `ch04-client-concepts-multi.json` | 4 | Client Concepts | Interactions & Execution | multi-select | 2 |
| `ch04-client-concepts.json` | 4 | Client Concepts | Interactions & Execution | single-select | 8 |
| `ch05-building-servers-multi.json` | 5 | Building Servers | Interactions & Execution | multi-select | 2 |
| `ch05-building-servers.json` | 5 | Building Servers | Interactions & Execution | single-select | 9 |
| `ch06-client-best-practices-multi.json` | 6 | Client Best Practices | Interactions & Execution | multi-select | 3 |
| `ch06-client-best-practices.json` | 6 | Client Best Practices | Interactions & Execution | single-select | 7 |
| `ch07-authorization-multi.json` | 7 | Authorization | Security & Governance | multi-select | 3 |
| `ch07-authorization.json` | 7 | Authorization | Security & Governance | single-select | 12 |
| `ch08-security-best-practices-multi.json` | 8 | Security Best Practices | Security & Governance | multi-select | 3 |
| `ch08-security-best-practices.json` | 8 | Security Best Practices | Security & Governance | single-select | 10 |
| `ch09-mcp-inspector-multi.json` | 9 | MCP Inspector | Use Cases & Ecosystem | multi-select | 2 |
| `ch09-mcp-inspector.json` | 9 | MCP Inspector | Use Cases & Ecosystem | single-select | 8 |
| `ch10-debugging-multi.json` | 10 | Debugging | Interactions & Execution | multi-select | 3 |
| `ch10-debugging.json` | 10 | Debugging | Interactions & Execution | single-select | 7 |
| `ch11-json-rpc-2-0-fundamentals-multi.json` | 11 | JSON-RPC 2.0 Fundamentals | Architecture & Components | multi-select | 3 |
| `ch11-json-rpc-2-0-fundamentals.json` | 11 | JSON-RPC 2.0 Fundamentals | Architecture & Components | single-select | 6 |
| `ch12-transports-protocol-utilities-multi.json` | 12 | Transports & Protocol Utilities | Architecture & Components | multi-select | 3 |
| `ch12-transports-protocol-utilities.json` | 12 | Transports & Protocol Utilities | Architecture & Components | single-select | 6 |
| `ch13-extensions-multi.json` | 13 | Extensions | Use Cases & Ecosystem | multi-select | 2 |
| `ch13-extensions.json` | 13 | Extensions | Use Cases & Ecosystem | single-select | 8 |
| `ch14-mcp-registry-multi.json` | 14 | MCP Registry | Use Cases & Ecosystem | multi-select | 3 |
| `ch14-mcp-registry.json` | 14 | MCP Registry | Use Cases & Ecosystem | single-select | 7 |
| `ch15-versioning-changelog-lifecycle-multi.json` | 15 | Versioning, Changelog & Lifecycle | Security & Governance | multi-select | 3 |
| `ch15-versioning-changelog-lifecycle.json` | 15 | Versioning, Changelog & Lifecycle | Security & Governance | single-select | 8 |
| `ch16-community-governance-security-multi.json` | 16 | Community, Governance & Security | Security & Governance | multi-select | 2 |
| `ch16-community-governance-security.json` | 16 | Community, Governance & Security | Security & Governance | single-select | 7 |
| `ch17-aaif-agentic-ecosystem-multi.json` | 17 | AAIF & Agentic Ecosystem | Use Cases & Ecosystem | multi-select | 2 |
| `ch17-aaif-agentic-ecosystem.json` | 17 | AAIF & Agentic Ecosystem | Use Cases & Ecosystem | single-select | 8 |

## Schema

`data/schemas/question.json` describes what the bank actually contains: chapters 1–17
(was 1–10), up to 5 options and letter `E` (was 4 / A–D), `answers` of 2–4 letters, a `oneOf`
that forbids an item carrying both `answer` and `answers`, plus the three new fields. The
previous schema is kept as `question.v1.json`.
