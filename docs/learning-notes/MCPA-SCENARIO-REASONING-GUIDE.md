# MCPA Scenario Reasoning Guide — Tester Edition

> **Revised 2026-09-11.** Every rule below was re-checked against the MCP specification 2026-07-28 and JSON-RPC 2.0. Corrections are marked **[FIXED]** and additions **[ADDED]**. Where the text says "in the supplied material", the rule has now been confirmed in the spec unless noted otherwise.

## Purpose

This guide is designed to sit beside the scenario questions in the MCPA question bank. It assumes you are comfortable testing software behavior but may not write MCP clients or servers yourself.

The goal is not to teach implementation syntax. It is to teach a repeatable way to reason about **what component owns a behavior, what observable result should occur, and which protocol/security rule explains it**.

When a scenario feels technical, ask these four questions first:

1. **Who is acting?** Host, client, server, gateway, authorization server, user, or model?
2. **Which layer is involved?** MCP data/JSON-RPC semantics, transport, authorization/security, or an optional extension?
3. **What is observable?** Request shape, response shape, HTTP status, JSON-RPC error, resultType, log stream, notification, or UI consent?
4. **Is this modern MCP, legacy MCP, or an extension?** Many exam traps come from mixing these models.

---

## 1. The mental model: Host → Client → Server

### What you need to know

A **host** is the AI application. It owns the overall user experience and can manage multiple MCP client instances. A **client** is the protocol handler associated with one server. A **server** exposes MCP features such as tools, resources, and prompts.

The useful cardinality rule is:

- One host can manage many clients.
- One client communicates with one server.
- A host therefore reaches many servers through separate clients.
- A remote server can serve many clients.

### Tester reasoning

If a scenario says one host is connected to a filesystem server and a CRM server, do not imagine one client object multiplexing both server relationships. Think of two logical client/server relationships managed by the host.

This helps with defect localization. A failure affecting only one server relationship can live in that client's configuration, transport, authorization, or server. A host-wide failure may sit above those individual relationships.

### Common trap

**Server supports many clients** does not mean **one client supports many servers**.

---

## 2. Data layer vs transport layer

MCP can be reasoned about as two layers.

**Data layer:** JSON-RPC semantics, MCP methods and primitives, discovery, results, errors, and notifications.

**Transport layer:** how messages physically move and are framed, such as stdio or Streamable HTTP, plus transport-level security concerns.

### Tester reasoning

When you see malformed JSON-RPC, wrong IDs, wrong method names, incorrect result/error structure, or MCP-specific result semantics, think **data layer**.

When you see stdin/stdout, HTTP POST, SSE, TLS, process launching, or HTTP headers, think **transport layer**.

This distinction prevents category errors. TLS terminating at a gateway is not automatically a JSON-RPC defect. A correct HTTP 200 does not prove the JSON-RPC result inside it is semantically valid.

---

## 3. Tools, resources, and prompts: classify before reasoning

Use this memory rule:

> **Model calls Tools. App reads Resources. User picks Prompts.**

### Tools

Tools are callable functions/actions. They may have side effects. The model can select a tool, while the host should provide appropriate user visibility and approval controls.

A tool execution can fail even though the protocol exchange itself worked. That is why an execution failure can appear as a normal tool result with `isError: true` rather than a JSON-RPC protocol error.

### Resources

Resources are data that the application reads. They are commonly addressed with URIs. A document, record, or other retrievable data item is conceptually different from an action.

### Prompts

Prompts are reusable interaction templates and are user-controlled in the simplified control model.

### Tester reasoning

First ask: **Is the system trying to do something, read something, or select a reusable interaction template?** That often tells you whether the scenario is about a tool, resource, or prompt before any method names appear.

---

## 4. JSON-RPC: test the envelope before MCP semantics

MCP uses JSON-RPC 2.0 semantics, with some MCP-specific constraints.

### Request

A request has an `id` because a response is expected.

### Response

A response correlates to a request by `id`. It contains **either** `result` **or** `error`, never both.

### Notification

A notification has **no `id`** and the receiver does not respond.

### Important MCP ID rule

For MCP requests, IDs are strings or integers and cannot be `null`. IDs also need to be unique among a sender's outstanding requests.

### Tester reasoning

When a response arrives out of order, that is not inherently a bug. Correlation is by ID, not FIFO order.

When you see `id: null`, do not classify it as a notification. A notification omits the ID member; MCP also forbids null request IDs.

When a response has both `result` and `error`, stop there: the response envelope itself is invalid before you reason about tool behavior.

**[ADDED]** MCP carries **no JSON-RPC batches**. Each Streamable HTTP POST body is exactly one request or notification, and each stdio line is exactly one message. If a scenario sends an array of requests, base JSON-RPC batch rules do not apply to MCP.

**[ADDED]** Every MCP result carries a `resultType`. If a legacy server omits it, treat the result as `"complete"`. A value the client doesn't recognise is invalid.

### Core error anchors

- `-32700` — invalid JSON / Parse error
- `-32600` — invalid JSON-RPC request
- `-32601` — method not found
- `-32602` — invalid params, including required request metadata problems in the supplied study material
- `-32603` — internal error

Modern MCP-specific anchors (these are **all** of them):

- `-32020` — HeaderMismatch (HTTP 400)
- `-32021` — MissingRequiredClientCapability (HTTP 400)
- `-32022` — UnsupportedProtocolVersion (HTTP 400; `data.supported` lists the server's versions)

**[FIXED]** The earlier "`-32001` — InvalidProtocolVersion" line was wrong: that code does not exist in the 2026-07-28 spec. The drafts used -32001 for HeaderMismatch, and the changelog renumbered it to -32020. A *missing* protocol version is a malformed request (-32602). A version that is present but *unsupported* is -32022. Codes from -32000 to -32019 are legacy, implementation-defined codes, and receivers must not assume any meaning for them.

**[ADDED]** Two retired codes: `-32002` (old resource-not-found; clients should still accept it from legacy servers) and `-32042` (old URL-elicitation-required). Modern servers must not emit either.

A useful memory hook is **20 / 21 / 22 = Header / Capability / Version**.

---

## 5. Modern stateless MCP: every request introduces itself

The modern model in the supplied study material is deliberately stateless at the protocol-session level.

Every request carries required `_meta` information including:

- `io.modelcontextprotocol/protocolVersion`
- `io.modelcontextprotocol/clientCapabilities`

`clientInfo` is recommended rather than required, and log level can be request-specific.

### The critical testing distinction

There are two superficially similar failures:

**A required `_meta` field is absent.** The request is malformed. In the supplied material this maps to `-32602` and HTTP 400.

**The capabilities metadata exists, but a capability required for the operation was not declared.** The request is structurally valid but capability-incompatible. This maps to `-32021`, and on HTTP it is also a `400 Bad Request`. `data.requiredCapabilities` lists what's missing. **[FIXED: added the status]**

**[ADDED] A third look-alike: the version is present but the server doesn't support it.** This is `-32022` UnsupportedProtocolVersion with HTTP 400. The client should retry with a version from `data.supported`. It is not a malformed request.

This is an excellent exam distinction because both can be described casually as “the client doesn't support what the server needs.” Inspect the exact failure condition.

### serverInfo

Server information in result metadata is self-reported. Treat it as display/logging information, not a trustworthy security identity.

---

## 6. MRTR: server needs more input without calling the client back

MRTR (Multi-Round-Trip Requests) is easiest to understand as a continuation loop.

1. Client sends the original request.
2. Server cannot complete it yet and returns `resultType: "input_required"`.
3. The result contains input requests and/or opaque `requestState`.
4. The client obtains the needed information.
5. The client **retries the original operation as a new JSON-RPC request with a new ID**, including the answers and echoing `requestState` exactly if one was supplied.
6. The server eventually returns `resultType: "complete"`.

### Why the new ID matters

The retry is a new JSON-RPC request. Continuation is represented by the supplied state, not by pretending the old JSON-RPC request is still alive.

### Scope restriction

In the supplied study material, `InputRequiredResult` is legal only for:

- `prompts/get`
- `resources/read`
- `tools/call`

A scenario using it on `tools/list` or `server/discover` should make you suspicious.

### requestState is opaque and untrusted

The client should echo it exactly rather than parsing or modifying it. The server, however, must treat the returned value as attacker-controlled because it traveled through the client.

If the state affects authorization or business logic, integrity protection and replay defenses matter. A server should not trust an embedded `user_id` merely because it originally minted the state.

### Tester analogy

Think of a server handing the client a **sealed claim ticket**. The client carries it back; the client should not need to understand it. When it comes back, the server still checks that the ticket is genuine and appropriate.

---

## 7. MRTR vs Tasks: similar-looking, different continuation mechanisms

This is a high-value trap.

### Core MRTR

Input is returned by **retrying the original request** with a new JSON-RPC ID plus input responses/request state.

### Tasks extension

A long-running task has a `taskId`. Mid-flight input is supplied with **`tasks/update`**, not by retrying the original request.

Task status can be polled with `tasks/get`, respecting `pollIntervalMs`. The supplied material lists completed, failed, and cancelled as terminal states.

There is no `tasks/list` or `tasks/result` in the supplied study summary.

### Extension negotiation

Extensions are opt-in. Do not assume a server may return task behavior simply because it implements Tasks. The client also has to declare support.

### Tester reasoning

If you see `input_required`, ask one extra question: **Is this core MRTR or a Task?** The correct next request depends on that answer.

---

## 8. stdio: treat stdout like a protocol wire

With stdio, the client launches the server as a subprocess and communicates over stdin/stdout.

### The testing rule

**stdout is protocol-only.** Logs go to stderr.

A harmless-looking `print("starting server")` on stdout can corrupt protocol framing and produce parse failures.

### Relative path failure

A server that works from a terminal but not when launched by a desktop client often has a working-directory assumption. Absolute paths are a high-value check because the host may launch the process from somewhere else.

### No TCP port

stdio is not a network socket. A `port` setting does not make sense as the connection mechanism for a stdio server.

### Fault isolation

A practical test sequence from the supplied material is:

1. Inspect client logs.
2. Verify the server process starts/runs.
3. Test the server standalone in Inspector.
4. Check version/capability compatibility, including discovery where relevant.

Passing Inspector narrows the fault domain; it does not prove every host integration detail is correct.

---

## 9. Streamable HTTP: POST, headers, and broken streams

Modern Streamable HTTP uses HTTP POST for client messages. A response can be a normal JSON response or a per-request SSE stream.

The older two-endpoint HTTP+SSE pattern with a separate GET stream has been deprecated **since 2025-03-26**. The 2026-07-28 revision only reclassified it under the new lifecycle policy. **[FIXED: date]**

### MCP-Protocol-Version, Mcp-Method and Mcp-Name

These headers expose the version, method and target to gateways, so they can route, meter, rate-limit or apply WAF policy without parsing the JSON body.

- `MCP-Protocol-Version`: required on **every POST**, and it must equal the protocol version in the body's `_meta`. **[ADDED]**
- `Mcp-Method`: required on **all requests**. **[FIXED: this revision defines no header rules for notifications]**
- `Mcp-Name`: required for `tools/call`, `resources/read` and `prompts/get`.

If a header says one thing and the body says another, or a required header is missing, expect **HTTP 400 + HeaderMismatch (`-32020`)**. If the version header matches the body but the server doesn't support that version, expect **HTTP 400 + UnsupportedProtocolVersion (`-32022`)**.

### Other observable HTTP outcomes [ADDED]

| Observation | Expected |
|---|---|
| Notification POST accepted | `202 Accepted`, no body |
| `Origin` header present but invalid | `403 Forbidden` (DNS-rebinding defence) |
| Unknown JSON-RPC method | `404` with JSON-RPC error `-32601` in the body |
| GET or DELETE sent to a modern-only endpoint | `405 Method Not Allowed` |
| `Mcp-Session-Id` or `Last-Event-ID` sent by an old client | Ignored; the server never mints session ids |

**Tester tip:** a `400`/`404` *with* a recognised modern JSON-RPC error in the body means the server speaks modern MCP. An empty or unrecognised body is how a dual-era client decides to fall back to legacy `initialize`.

### Cancellation differs by transport [ADDED]

On Streamable HTTP, closing the request's SSE response stream *is* the cancellation. On stdio, the client sends `notifications/cancelled` with the request id, because there is only one shared channel.

### Broken SSE stream

Do not think “resume from Last-Event-ID.” In the supplied modern model, resumability is removed. A lost request is re-issued as a new request with a new JSON-RPC ID.

### subscriptions/listen

Long-lived subscription delivery is opt-in and best-effort. A list-change notification can invalidate a cache even when its TTL has not expired.

**[ADDED]** The first message on the stream is `notifications/subscriptions/acknowledged`, which lists the subset of the filter the server will honour. Every later notification carries `_meta["io.modelcontextprotocol/subscriptionId"]`, equal to the JSON-RPC id of the `subscriptions/listen` request. A graceful close sends the listen request's result before the stream closes. A drop without that result is an unexpected disconnect. `notifications/progress` and `notifications/message` never travel on the listen stream.

---

## 10. OAuth: separate authentication, authorization, and malformed requests

A tester-friendly memory hook:

> **401 = Who are you? 403 = I know you, but you cannot do that. 400 = the request itself is wrong.**

### 401

No token, invalid token, or expired token → 401 plus `WWW-Authenticate`. The client uses discovery metadata and runs/re-runs the authorization flow. A token issued for a *different* audience is an invalid token too, so it also gets **401**. **[ADDED]**

### 403

The token is valid but lacks permission/scope → 403 `insufficient_scope`. The supplied material says the client should request the **union** of existing and newly required scopes.

### 400

A transport/request integrity problem such as MCP header/body mismatch → 400, not an OAuth challenge. In modern MCP, a missing required `_meta` field (-32602), an undeclared capability (-32021) and an unsupported version (-32022) are also 400s. **[ADDED]**

### Client registration order [ADDED]

When a scenario asks how the client obtains a `client_id`, the spec's priority order is:

1. Pre-registered credentials, if the client has them.
2. Client ID Metadata Documents (CIMD), if the authorization server advertises `client_id_metadata_document_supported`.
3. Dynamic Client Registration, which is deprecated and only a fallback.
4. Asking the user to enter client details.

### Issuer validation (mix-up attacks) [ADDED]

The client records the authorization server's `issuer` before redirecting. When the code comes back, it compares the `iss` parameter to that recorded value with an exact string match, before redeeming the code. PKCE alone does not stop a mix-up attack.

### Token validation

The supplied material emphasizes validating:

- signature
- expiration (`exp`)
- audience (`aud`)
- issuer (`iss`)

The audience is especially important. A token for Server B does not become valid at Server A merely because both trust the same identity provider.

### Token passthrough

Do not accept or forward tokens minted for another audience. This prevents services from treating bearer tokens as generic credentials.

---

## 11. SSRF: authorization metadata can still be attacker input

Some authorization flows require the client/server to follow metadata URLs. Those URLs can become SSRF entry points.

The supplied security material highlights blocking private/reserved destinations, including loopback, RFC1918 ranges, link-local addresses, and cloud metadata addresses such as `169.254.169.254`.

### Tester reasoning

Do not test only the first URL string. Good SSRF testing also considers:

- redirects to blocked addresses
- alternate IP encodings
- IPv6 and IPv4-mapped forms
- DNS rebinding / resolution changes
- whether egress controls exist

The conceptual rule is: **metadata discovery is network access influenced by potentially untrusted input**.

---

## 12. Human consent is part of the security model

MCP connects models to capabilities that can expose data or cause actions. Therefore a technically valid protocol exchange can still be unsafe at the product level.

Useful test questions include:

- Can the user see what tool/action is about to run?
- Is approval required where appropriate?
- Is an approval narrowly scoped or accidentally blanket permission?
- Does a local one-click configuration show the actual command before executing it?
- Can the user cancel?
- Are credentials kept away from generated sandbox code?

For URL elicitation involving credentials or third-party authorization, the supplied material emphasizes showing the full URL, obtaining explicit consent, and not automatically fetching it on the user's behalf.

---

## 13. Inspector: know what it proves and what it does not

Inspector is a diagnostic/conformance aid. It is useful for testing a server independently from a particular host.

### Catalog vs config

In the supplied material:

- `--catalog` is writable and can be created/seeded.
- `--config` is read-only, is not written/seeded, and errors if the referenced file is missing.
- They are mutually exclusive.

For CI, `--stored-auth-only` supports fail-fast behavior where interactive OAuth is unavailable.

### Security warning

Do not combine settings that both omit authentication and broadly bind the Inspector interface.

### Tester reasoning

If Inspector succeeds and the desktop host fails, you have learned something useful: basic server operation is plausible, so host-specific launch environment, config, permissions, or compatibility deserve attention next. You have **not** proven the server is bug-free.

---

## 14. Caching and progressive tool discovery

Large tool catalogs can consume significant context. A scalable client may use:

> **Catalog → Inspect → Execute**

The client first works with a lighter catalog, inspects detailed schemas for likely candidates, then executes the chosen tool.

### Cache invalidation

The supplied material uses `ttlMs` and `cacheScope` for several list/read operations. A relevant `list_changed` notification overrides an unexpired TTL.

### Tester reasoning

Test both time-based and event-based invalidation. A cache that only watches TTL can remain stale after the server explicitly announces a change.

---

## 15. Version eras: legacy vs modern

The supplied study material separates:

**Legacy (≤ 2025-11-25):** initialization handshake and session-oriented mechanisms.

**Modern (≥ 2026-07-28):** per-request `_meta`, stateless behavior, discovery, MRTR, and removal of several old session/resume mechanisms.

### Deprecated is not Removed

Deprecated means still present during a migration window. Removed means the modern protocol no longer has that feature.

The supplied material marks Roots, Sampling, Logging, and HTTP+SSE as deprecated, while items such as the initialize handshake, protocol sessions, ping, and SSE resumability are removed in the modern era.

**[ADDED] Removal clocks differ.** Roots, Sampling, Logging and Dynamic Client Registration were deprecated in 2026-07-28. They become eligible for removal in the first revision released on or after 2027-07-28, following the 12-month minimum. HTTP+SSE has been deprecated since 2025-03-26, and its earliest removal is three months after SEP-2596 reaches Final. A proven security risk can shorten the 12-month window, but never below 90 days.

### Tester reasoning

Before answering any lifecycle scenario, identify the target era. A behavior can be correct for a legacy endpoint and wrong for a modern one.

Negotiation/discovery helps identify compatibility. It does not magically translate fundamentally different semantics between eras.

---

## 16. Registry: metadata and ownership, not code hosting

The MCP Registry is metadata. Actual code/artifacts live in package/container distribution systems.

Ownership markers differ by package type in the supplied material, for example:

- npm → `mcpName`
- PyPI/NuGet → `mcp-name` marker in README
- OCI → MCP server-name label
- MCPB → URL/file hash-related validation

Names use reverse-DNS-style ownership. A namespace such as `com.acme/*` implies proof of control of the corresponding domain.

### Tester reasoning

Registry tests are often provenance tests: **Does this metadata legitimately point to an artifact controlled by the claimed publisher?**

---

## 17. Governance and vulnerability reporting

Protocol changes are governed through the project process, including SEPs. An informal message, blog post, or chat discussion is not automatically normative specification text.

Security vulnerabilities should be reported privately through the affected repository's GitHub Security Advisory workflow rather than public issues/discussions/PRs.

For vulnerabilities spanning multiple SDKs, coordinated disclosure/fixing matters so one public fix does not unnecessarily expose still-vulnerable sibling implementations.

The supplied policy summary also distinguishes peer-only stdio crash/hang/DoS issues from remotely reachable vulnerabilities or sandbox escapes. This reflects the assumption that local stdio peers share a trust boundary rather than stdio being a sandbox.

---

## 18. A repeatable scenario-solving algorithm

When you answer a difficult MCPA scenario, use this sequence.

### Step 1 — Identify the actor

Who made the questionable decision: host, client, server, gateway, auth server, user, or model?

### Step 2 — Identify the operation

Is it a tool action, resource read, prompt retrieval, discovery call, subscription, task, OAuth operation, or raw JSON-RPC behavior?

### Step 3 — Identify the era/extension

Modern stateless MCP? Legacy MCP? Tasks extension? This removes many distractors immediately.

### Step 4 — Separate transport from protocol

HTTP status/header problem or JSON-RPC/MCP semantic problem?

### Step 5 — Separate malformed from unsupported

Missing required structure is different from valid structure that declares insufficient capability.

### Step 6 — Separate protocol success from business success

A tool can return `isError: true` while the JSON-RPC exchange itself is valid.

### Step 7 — Apply the trust-boundary question

Which values came through an untrusted party? Tokens, URLs, requestState, tool descriptions, local commands, and self-reported server metadata deserve skepticism.

### Step 8 — Pick the most specific rule

Certification distractors often contain statements that are generally sensible but do not address the exact protocol rule being tested.

---

## 19. Tester-focused mini examples

### Example A — malformed metadata vs missing capability

**Observation:** `clientCapabilities` is absent entirely.

**Reasoning:** Required request structure is missing.

**Expected concept:** Invalid params / malformed request (`-32602`, HTTP 400 in the supplied material).

Now change the observation: `clientCapabilities` exists, but the capability needed for a server-requested input type is not declared.

**Reasoning:** Structure is valid; compatibility/capability is insufficient.

**Expected concept:** `-32021` MissingRequiredClientCapability (HTTP 400).

Change it once more: `protocolVersion` is present and well-formed, `"2027-01-01"`, but the server doesn't know it.

**Expected concept:** `-32022` UnsupportedProtocolVersion (HTTP 400). The client retries with a version from `data.supported`. **[ADDED]**

### Example B — tool failure vs protocol failure

**Observation:** `tools/call` was valid and reached the tool, but the downstream API rejected the business operation.

**Reasoning:** The protocol worked; the action failed.

**Expected concept:** tool result with `isError: true`, not automatically a JSON-RPC protocol error.

**Contrast [ADDED]:** if the tool *name* doesn't exist, or the request fails the `tools/call` schema, that is a protocol error: JSON-RPC `-32602`.

### Example C — lost HTTP stream

**Observation:** SSE response stream drops.

**Wrong legacy instinct:** resume with Last-Event-ID.

**Modern reasoning:** no resumability; re-issue as a new request with a new ID.

### Example D — task asks for input

**Observation:** Tasks extension task has status/input requirement.

**Wrong MRTR instinct:** retry the original tools/call.

**Correct Tasks reasoning:** send the input through `tasks/update` for the task.

### Example E — valid token, wrong audience

**Observation:** Signature and expiry are valid, but `aud` names another MCP server.

**Reasoning:** Cryptographically valid does not mean valid for this resource server.

**Expected concept:** reject with **HTTP 401** (an invalid token for this server); token passthrough/cross-audience acceptance is forbidden. **[FIXED: added the status]**

### Example F — header says one thing, body another [ADDED]

**Observation:** a gateway rate-limits by `Mcp-Name: get_balance`, but the body calls `transfer_funds`.

**Reasoning:** different components trusting different sources of truth is exactly what header validation prevents.

**Expected concept:** the MCP server rejects it with HTTP 400 + `-32020` HeaderMismatch.

### Example G — the version header is missing [ADDED]

**Observation:** the POST has `Mcp-Method` and a correct `_meta` protocol version, but no `MCP-Protocol-Version` header.

**Expected concept:** HTTP 400 + `-32020`. A missing required header is a header-validation failure. (A server that deliberately supports pre-2025-06-18 clients may instead assume `2025-03-26`.)

---

## 20. What you do NOT need to be a developer to understand

For exam scenarios, you usually do not need to know how to implement an OAuth library, create an SSE parser, write an MCP SDK, or calculate an HMAC by hand.

You do need to recognize **contracts and invariants**:

- Which component owns which responsibility?
- What fields must exist?
- Which values must match?
- What should never be trusted blindly?
- Which status/error/result represents the observed failure?
- What changes between legacy and modern behavior?
- What continuation mechanism belongs to MRTR versus Tasks?

That is very close to ordinary black-box and integration testing: establish the contract, vary inputs and state, observe outputs, and check trust boundaries.

---

## 21. High-value memory hooks

- **Host has clients; each client talks to one server.**
- **Model → Tools, App → Resources, User → Prompts.**
- **Request has ID; response matches ID; notification has no ID.**
- **Every modern request is a stranger: it introduces itself in `_meta`.**
- **Missing metadata ≠ missing capability.**
- **MRTR: input_required → gather input → retry original operation with NEW ID.**
- **Tasks: input goes through tasks/update.**
- **stdio stdout = protocol wire; stderr = logs.**
- **401 identity, 403 permission, 400 malformed/integrity problem.**
- **20/21/22 = Header / Capability / Version, and there are no others.**
- **Missing = malformed (-32602); present but unsupported = -32022.**
- **Three headers: Version on every POST, Method on every request, Name on the three named methods.**
- **A token for another audience is not your token.**
- **Deprecated still exists; Removed does not.**
- **Registry stores metadata, not the server code.**

---

## Source boundary

This guide was originally written from the **MCPA Exam Cheat Sheet** and the question-bank structure. In the 2026-09-11 revision, every rule was re-checked against the MCP specification 2026-07-28, the Security Best Practices page and the JSON-RPC 2.0 specification.

Changes in this revision:

1. Removed the non-existent `-32001 InvalidProtocolVersion`.
2. Added HTTP 400 to -32021 and -32022, plus a -32022 example.
3. Added the `MCP-Protocol-Version` header and corrected the `Mcp-Method` scope.
4. Added a table of HTTP outcomes (202 / 403 Origin / 404 / 405).
5. Noted that cancellation differs by transport.
6. Added the subscription acknowledgment details.
7. Noted that MCP carries no batching, and the `resultType` rules.
8. Added the client-registration order and `iss` validation.
9. Added 401 for a wrong audience.
10. Corrected the HTTP+SSE deprecation date and added the removal clocks.
11. Added Examples F and G.

The specification remains authoritative if anything here disagrees with it.
