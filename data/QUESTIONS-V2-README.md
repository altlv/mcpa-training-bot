# MCPA question bank — v2 (curated 2026-09-11)

The 34 files in `data/questions/` were rebuilt from scratch against the MCP
**2026-07-28** specification and JSON-RPC 2.0. Nothing else in the app has to change:
the file names, the `meta` + `questions` shape, the option `letter`/`text` objects and the
`answer` / `answers` keys are all unchanged.

## What happened

| | old bank | v2 bank |
|---|---|---|
| items | 522 | 149 |
| answerable by picking the longest option | 361 items (69%) | 0 (mean correct − distractor = +5 chars) |
| pure spec-prose recall, no scenario | 301 items (58%) | 0 — every stem states a situation |
| all/none-of-the-above | 43 items | 0 |
| items contradicting 2026-07-28 | 34 (initialize handshake, session ids, `ping`, `resources/subscribe`, `Last-Event-ID`, `tasks/list`, `tasks/result`, `-32001`, `-32002`, `logging/setLevel`) | 0 |
| correct-letter spread (single) | heavily B-weighted | A 28 / B 26 / C 28 / D 29 |
| multi-select keys | often "select all five" | always 2–3 of 5, never all |
| explanations | frequently one clause | every item says why the key is right **and** why the tempting distractor is wrong |
| spec citation | none | every item carries `source` |

All 522 originals are preserved in `data/questions-quarantine.json`, each with the audit
findings that retired it, so any of them can be fixed and moved back.

## Domain mix (matches the published MCPA weights)

| exam domain | items | share | exam weight |
|---|---|---|---|
| Interactions & Execution | 38 | 25.5% | 26% |
| Security & Governance | 36 | 24.2% | 24% |
| Use Cases & Ecosystem | 30 | 20.1% | 20% |
| MCP Fundamentals | 24 | 16.1% | 16% |
| Architecture & Components | 21 | 14.1% | 14% |

Difficulty: 21 easy / 65 medium / 63 hard. Types: 93 mcq, 18 scenario, 38 multi_select.

## How the items are built

* **Single-select**: 4 options (A–D), exactly one correct.
* **Multi-select**: 5 options (A–E), exactly 2–3 correct — never all, never one.
* Distractors are *parallel*: same grammatical shape, same level of detail, same length band as
  the key, and each one is a real misconception (a retired method, a draft error code, the wrong
  HTTP status, a plausible-but-wrong header), not filler.
* Stems put you in a situation — a failing call, a header to choose, a token that just got
  rejected — and ask what to do, which is how the exam frames its questions.
* Every item gained three fields alongside the existing ones:
  `domain` (exam domain), `source` (spec path the item was written from),
  `protocolVersion` (`2026-07-28`).

## Files

| file | ch | chapter | exam domain | mode | items |
|---|---|---|---|---|---|
| `ch01-introduction-getting-started-multi.json` | 1 | MCP Fundamentals | MCP Fundamentals | multi_select | 6 |
| `ch01-introduction-getting-started.json` | 1 | MCP Fundamentals | MCP Fundamentals | single_select | 18 |
| `ch02-architecture-protocol-layers-multi.json` | 2 | Architecture & Protocol Layers | Architecture & Components | multi_select | 2 |
| `ch02-architecture-protocol-layers.json` | 2 | Architecture & Protocol Layers | Architecture & Components | single_select | 5 |
| `ch03-server-concepts-multi.json` | 3 | Server Concepts | Interactions & Execution | multi_select | 3 |
| `ch03-server-concepts.json` | 3 | Server Concepts | Interactions & Execution | single_select | 7 |
| `ch04-client-concepts-multi.json` | 4 | Client Concepts | Interactions & Execution | multi_select | 2 |
| `ch04-client-concepts.json` | 4 | Client Concepts | Interactions & Execution | single_select | 7 |
| `ch05-building-servers-multi.json` | 5 | Building Servers | Interactions & Execution | multi_select | 1 |
| `ch05-building-servers.json` | 5 | Building Servers | Interactions & Execution | single_select | 5 |
| `ch06-client-best-practices-multi.json` | 6 | Client Best Practices | Interactions & Execution | multi_select | 2 |
| `ch06-client-best-practices.json` | 6 | Client Best Practices | Interactions & Execution | single_select | 4 |
| `ch07-authorization-multi.json` | 7 | Authorization | Security & Governance | multi_select | 3 |
| `ch07-authorization.json` | 7 | Authorization | Security & Governance | single_select | 9 |
| `ch08-security-best-practices-multi.json` | 8 | Security Best Practices | Security & Governance | multi_select | 3 |
| `ch08-security-best-practices.json` | 8 | Security Best Practices | Security & Governance | single_select | 9 |
| `ch09-mcp-inspector-multi.json` | 9 | MCP Inspector | Use Cases & Ecosystem | multi_select | 2 |
| `ch09-mcp-inspector.json` | 9 | MCP Inspector | Use Cases & Ecosystem | single_select | 7 |
| `ch10-debugging-multi.json` | 10 | Debugging | Interactions & Execution | multi_select | 2 |
| `ch10-debugging.json` | 10 | Debugging | Interactions & Execution | single_select | 5 |
| `ch11-json-rpc-2-0-fundamentals-multi.json` | 11 | JSON-RPC 2.0 Fundamentals | Architecture & Components | multi_select | 2 |
| `ch11-json-rpc-2-0-fundamentals.json` | 11 | JSON-RPC 2.0 Fundamentals | Architecture & Components | single_select | 5 |
| `ch12-transports-protocol-utilities-multi.json` | 12 | Transports & Protocol Utilities | Architecture & Components | multi_select | 2 |
| `ch12-transports-protocol-utilities.json` | 12 | Transports & Protocol Utilities | Architecture & Components | single_select | 5 |
| `ch13-extensions-multi.json` | 13 | Extensions | Use Cases & Ecosystem | multi_select | 2 |
| `ch13-extensions.json` | 13 | Extensions | Use Cases & Ecosystem | single_select | 7 |
| `ch14-mcp-registry-multi.json` | 14 | MCP Registry | Use Cases & Ecosystem | multi_select | 2 |
| `ch14-mcp-registry.json` | 14 | MCP Registry | Use Cases & Ecosystem | single_select | 5 |
| `ch15-versioning-changelog-lifecycle-multi.json` | 15 | Versioning, Changelog & Lifecycle | Security & Governance | multi_select | 2 |
| `ch15-versioning-changelog-lifecycle.json` | 15 | Versioning, Changelog & Lifecycle | Security & Governance | single_select | 5 |
| `ch16-community-governance-security-multi.json` | 16 | Community, Governance & Security | Security & Governance | multi_select | 1 |
| `ch16-community-governance-security.json` | 16 | Community, Governance & Security | Security & Governance | single_select | 4 |
| `ch17-aaif-agentic-ecosystem-multi.json` | 17 | AAIF & Agentic Ecosystem | Use Cases & Ecosystem | multi_select | 1 |
| `ch17-aaif-agentic-ecosystem.json` | 17 | AAIF & Agentic Ecosystem | Use Cases & Ecosystem | single_select | 4 |

## Schema

`data/schemas/question.json` was rewritten to describe what the bank actually contains:
chapters 1–17 (was 1–10), up to 5 options and letter `E` (was 4 / A–D), `answers` of 2–4 letters,
a `oneOf` that forbids an item carrying both `answer` and `answers`, plus the three new fields.
The previous schema is kept as `question.v1.json`.
