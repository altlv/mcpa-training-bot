# MCPA Exam Cheat Sheet
---

## ⭐ EXAM DOMAIN WEIGHTS (study time allocator!)

| Domain | Weight | Maps to Chapters | Question Bank |
|--------|--------|------------------|---------------|
| **Interactions & Execution** | **26%** | Server Features, Client Features, Building Servers, Client Best Practices, Debugging | ch3–6, 10 |
| **Security & Governance** | **24%** | Authorization (OAuth 2.1), Security & Trust, Lifecycle/Changelog, Governance & Security Policy | ch7, 8, 15, 16 |
| **Use Cases & Ecosystem** | **20%** | Inspector, Extensions, Registry | ch9, 13, 14 |
| **MCP Fundamentals** | **16%** | Fundamentals | ch1 |
| **Architecture & Components** | **14%** | Architecture, JSON-RPC, Transports | ch2, 11, 12 |

> **Rule of thumb:** Interactions + Security = 50% of the exam. Master the stateless request flow, MRTR, and OAuth before anything else.

---

## Quick Reference Card

### MCP
- **MCP** = Model Context Protocol (USB for AI)
- **Purpose** = Standardize how AI apps connect to tools/data
- **Created by** = Anthropic (announced **November 2024**)
- **Status** = Open standard, growing ecosystem
- **Current spec version** = **2026-07-28** (YYYY-MM-DD = last date of breaking changes)
- **Inspired by** = Language Server Protocol (LSP)
- **Solves** = M×N integration problem → M+N (5 apps × 8 systems = 40 connectors → 13 implementations)
- **Standardizes 3 things** = share context with LLMs · expose tools/capabilities · composable integrations

---

## 🔥 THE STATELESS CORE (2026-07-28) — HIGHEST-VALUE SECTION

### What changed (memorize this table!)
| Old (legacy, ≤2025-11-25) | New (modern, 2026-07-28) |
|---------------------------|--------------------------|
| `initialize` handshake + `notifications/initialized` | **Removed** — every request self-describes via `_meta` |
| `Mcp-Session-Id` header, protocol sessions | **Removed** — state via server-minted handles in tool args |
| Capabilities negotiated once per session | `clientCapabilities` in **every request's** `_meta` |
| Server-initiated requests (sampling/elicitation) | **MRTR**: server returns `InputRequiredResult`, client retries |
| HTTP GET endpoint + `resources/subscribe` | `subscriptions/listen` (opt-in, acknowledged, best-effort) |
| SSE resumability (`Last-Event-ID`) | **Removed** — re-issue lost requests with a new ID |
| `ping`, `logging/setLevel`, `notifications/roots/list_changed` | **Removed** (log level = per-request `_meta` key) |

### Every request MUST carry in `_meta`:
1. `io.modelcontextprotocol/protocolVersion` (required)
2. `io.modelcontextprotocol/clientCapabilities` (required)
3. `io.modelcontextprotocol/clientInfo` (SHOULD — optional!)
4. `io.modelcontextprotocol/logLevel` (optional — per-request log level)

> ⚠️ Missing a REQUIRED field = malformed request → **-32602 + HTTP 400**.
> Fields present but a needed *capability* undeclared → **-32021** (`data.requiredCapabilities` lists what's missing). Don't confuse the two!
> Every *result* SHOULD carry `io.modelcontextprotocol/serverInfo` in its `_meta` — self-reported, display/logging only, NEVER for security decisions.

### `server/discover` (servers MUST implement — clients MAY call)
Returns: `supportedVersions` · `capabilities` (incl. extensions) · `serverInfo` (in result `_meta`) · optional `instructions` · `ttlMs` + `cacheScope` (cacheable)
- Clients can skip it entirely and just handle `-32022 UnsupportedProtocolVersion` inline
- Main uses: present server info in one call · **stdio legacy-vs-modern probe** (no HTTP status to drive fallback)

### `resultType` (required on EVERY result)
| Value | Meaning |
|-------|---------|
| `"complete"` | Normal final result (missing field from legacy server = treat as complete) |
| `"input_required"` | MRTR interim result — answer `inputRequests`, retry |
| `"task"` | Reserved for Tasks extension |

### MRTR flow (Multi-Round-Trip Requests) — EXAM FAVORITE
```
1. Client sends request (e.g., tools/call)
2. Server returns InputRequiredResult (resultType: "input_required")
   with inputRequests[] + requestState
3. Client gathers answers (e.g., shows elicitation form to user)
4. Client RETRIES THE ORIGINAL REQUEST with inputResponses[] + echoed requestState
5. Server completes (resultType: "complete")
```
> requestState = server's encoded state, so ANY stateless instance can resume.

### MRTR hard rules (spec MUSTs — trap-heavy!)
- Only **3 requests** support `InputRequiredResult`: `prompts/get`, `resources/read`, `tools/call` — MUST NOT on anything else
- Every `InputRequiredResult` MUST include **≥ 1 of** `inputRequests` / `requestState`; if only `requestState`, client MAY retry immediately
- Retry MUST use a **NEW JSON-RPC id** (independent request — correlation is via requestState, not id)
- `inputRequests` values = only `ElicitRequest` · `CreateMessageRequest` · `ListRootsRequest`; server MUST NOT send a type the client didn't declare in capabilities
- Client MUST echo `requestState` exactly — never inspect/parse/modify; omit it if the server sent none; never reuse on other requests
- Server MUST treat `requestState` as **attacker-controlled**: HMAC/AEAD if it affects authz/business logic; embed principal + short TTL + request digest for replay defense; single-use must be enforced server-side
- Retry missing requested info → server SHOULD send a **new InputRequiredResult** (re-ask), NOT an error; unknown extra fields are ignored

---

## Architecture (14%)

### The Three Participants
| Participant | Role | Example |
|-------------|------|---------|
| **Host** | AI application | Claude Desktop, Goose |
| **Client** | Protocol handler | Built into host |
| **Server** | Provides tools/data | Your MCP server |

### MCP Participant roles
| Participant | Responsibility |
|-------------|----------------|
| **Host** | Creates and manages multiple client instances |
| **Host** | Controls client connection permissions and lifecycle |
| **Host** | Enforces security policies and consent requirements |
| **Host** | Handles user authorization decisions |
| **Host** | Coordinates AI/LLM integration and sampling |
| **Host** | Manages context aggregation across clients |
| **Client** | Communicates with exactly one server |
| **Client** | Attaches protocol version and capabilities to every request |
| **Client** | Routes protocol messages bidirectionally |
| **Client** | Manages subscriptions and notifications |
| **Client** | Maintains security boundaries between servers |
| **Server** | Exposes resources, tools and prompts via MCP primitives |
| **Server** | Operates independently with focused responsibilities |
| **Server** | Requests client input (sampling, elicitation, roots) via `InputRequiredResult` within a reply |
| **Server** | Must respect security constraints |
| **Server** | Can be a local process or a remote service |

### Cardinality (EXAM FAVORITE!)
```
Host --> Many Clients
Client --> One Server (dedicated 1:1)
Host --> Many Servers (via multiple clients)
Remote server --> Many Clients | Local stdio server --> typically 1 client
```

### Two Layers
| Layer | Owns |
|-------|------|
| **Data layer** (inner) | JSON-RPC 2.0 semantics, primitives, discovery, notifications |
| **Transport layer** (outer) | Connections, framing, transport-level auth |

### Transports
| Transport | Use Case | Security |
|-----------|----------|----------|
| **stdio** | Local, same machine | OS permissions |
| **Streamable HTTP** | Remote, network | TLS + OAuth |



#### Transport deep-dive — EXAM CRITICAL
| Feature | stdio | Streamable HTTP |
|---------|-------|-----------------|
| **Connection** | Client launches server as subprocess | HTTP POST to server endpoint |
| **Message format** | Newline-delimited JSON-RPC over stdin/stdout | JSON-RPC in HTTP POST body |
| **Server-to-client** | stdout | Optional SSE stream on POST response |
| **Logging** | stderr (captured by client) | Server-side log aggregation / OpenTelemetry |
| **Multi-client** | Single client only | Multiple clients supported |
| **Resumability** | N/A | **Removed in 2026-07-28** (was Last-Event-ID) |
| **Sessions** | N/A | **Removed in 2026-07-28** (was Mcp-Session-Id) |

#### Streamable HTTP vs legacy HTTP+SSE (EXAM TRAP!)
- **HTTP+SSE** = two endpoints (GET/SSE for server→client + POST for client→server) → **Deprecated** 2026-07-28
- **Streamable HTTP** = single endpoint, POST carries client messages, optional SSE streaming on response
- **Key removals in 2026-07-28:** sessions, Last-Event-ID resumability, standalone GET endpoint
- **Broken stream = re-issue as new request** (no resume, no replay)

#### Mcp-Method / Mcp-Name headers (SEP-2243) — NEW EXAM MATERIAL
- `Mcp-Method` required on **every request AND notification** (e.g., `tools/call`)
- `Mcp-Name` required for `tools/call`, `resources/read`, `prompts/get` (the target name)
- **Purpose:** Gateway routing, WAF policies, rate limiting — without parsing JSON body
- **Mismatch = 400 + HeaderMismatch (-32020)** — headers and body must agree

### MCP Transport details
| Transport | Characteristic |
|-----------|----------------|
| **stdio** | Client launches the server as a subprocess |
| **stdio** | Communication via `stdin`/`stdout` (newline-delimited JSON-RPC) |
| **stdio** | Single shared bidirectional channel |
| **stdio** | ⚠️ stdout is protocol-only — log to **stderr** (`print()`/`console.log()` = corruption!) |
| **stdio** | Best for local, same-machine integrations |
| **Streamable HTTP** | Server runs as an independent process handling multiple clients |
| **Streamable HTTP** | Client sends each JSON-RPC message as an HTTP POST |
| **Streamable HTTP** | Server responds with either a single JSON object or a per-request SSE stream |
| **Streamable HTTP** | Supports remote/networked deployments |
| **HTTP+SSE (legacy)** | ❌ DEPRECATED — two-endpoint design replaced by Streamable HTTP (2025-03-26) |

### Required HTTP headers (SEP-2243) — NEW EXAM MATERIAL
| Header | When | Purpose |
|--------|------|---------|
| `Mcp-Method` | **Every request AND notification** | Gateway routing without body parsing |
| `Mcp-Name` | `tools/call` (`params.name`), `resources/read` (`params.uri`), `prompts/get` (`params.name`) | Names the target |
| `Mcp-Param-*` | Params annotated `x-mcp-header` | Surface arg values to infra |
| Header ≠ body / missing / bad Base64? | → **400 + HeaderMismatch (-32020)** | Anti-spoofing |

- ⚠️ HeaderMismatch was **-32001 in the SEP text** — renumbered to **-32020** in the final spec (distractor alert!)
- `x-mcp-header`: **primitive types only** — string/integer/boolean, `number` explicitly excluded; names case-insensitively unique; violating tool def → client drops **that one tool** from `tools/list` (not the whole list)
- Non-ASCII / leading-trailing-space values → Base64 with sentinel `=?base64?...?=` (lowercase, case-sensitive markers)
- Header **names** case-insensitive; method **values** case-sensitive (`TOOLS/CALL` = reject)
- Never mark secrets/PII with `x-mcp-header` — headers are visible to every intermediary

### subscriptions/listen (replaces GET endpoint + resources/subscribe/unsubscribe)
- Long-lived **POST**-response stream; opt-in types: `toolsListChanged` · `promptsListChanged` · `resourcesListChanged` · `resourceSubscriptions`
- Server acknowledges the subscription, then MUST tag every delivered notification with `io.modelcontextprotocol/subscriptionId` in its `_meta` (correlates to the originating listen request) — *(the exact ack method name / "id = listen request's id" claim is NOT stated in the spec pages — don't bet on it)*
- Graceful close: server sends the empty `subscriptions/listen` JSON-RPC result before closing; stream drop **without** a result = unexpected disconnect → re-listen
- Delivery = **best-effort** (no replay — poll as backup); its state is scoped to the *request*, not the connection
- ⚠️ `notifications/progress` AND `notifications/message` do NOT ride here — they flow only on the originating request's response stream

### Caching (SEP-2549)
- `ttlMs` + `cacheScope` (`public`/`private`) required on: `tools/list`, `prompts/list`, `resources/list`, `resources/templates/list`, `resources/read`
- `list_changed` notification **beats** an unexpired TTL
- Return tools in **deterministic order** (protects LLM prompt caches)

---

## JSON-RPC 2.0 (part of 14%)

### Message Types
| Type | Direction | Has ID? | Example |
|------|-----------|---------|---------|
| **Request** | Both | Yes | `{"jsonrpc":"2.0","method":"tools/list","id":1}` |
| **Response** | Both | Yes | `{"jsonrpc":"2.0","result":{"resultType":"complete"},"id":1}` |
| **Notification** | Both | No | `{"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":1}}` |

### Rules (MEMORIZE!)
- `jsonrpc` must be **exactly "2.0"**
- Response = `result` XOR `error` (never both)
- Notification = **no id** → receiver MUST NOT reply
- ⚠️ **MCP is stricter than base JSON-RPC on ids**: request id MUST be string or integer, **MUST NOT be `null`** (base JSON-RPC only *discourages* null — MCP forbids it), and MUST be unique among the sender's outstanding requests
- Method names starting `rpc.` = reserved
- Empty batch `[]` = invalid → single `-32600` error; batch responses arrive in any order, match by id

### Error Codes (MEMORIZE!)
| Code | Name | Meaning |
|------|------|---------|
| `-32700` | Parse error | Invalid JSON |
| `-32600` | Invalid request | Not valid JSON-RPC |
| `-32601` | Method not found | Unknown method |
| `-32602` | Invalid params | Wrong parameters / missing `_meta` fields / **resource not found (moved from -32002!)** |
| `-32603` | Internal error | Server bug |

### MCP-specific Error Codes (NEW — MEMORIZE!)
| Code | Name | Trigger |
|------|------|---------|
| `-32001` | InvalidProtocolVersion | Protocol version in `_meta` is invalid/malformed |
| `-32020` | HeaderMismatch | HTTP headers disagree with body |
| `-32021` | MissingRequiredClientCapability | Request `_meta` lacks a needed capability |
| `-32022` | UnsupportedProtocolVersion | `data` field lists supported versions |
| `-32000..-32019` | Implementation-defined | Grandfathered SDK/app errors — **no NEW codes here** |
| `-32020..-32099` | **Reserved for MCP spec** | Only spec-defined codes may be emitted |

- `-32002` (old resource-not-found) & `-32042` (old URL-elicitation): modern servers **MUST NOT emit**, but clients **SHOULD still accept** `-32002` from legacy servers
- New app-specific codes → allocate **outside** the JSON-RPC reserved range (`-32768..-32000`)

---

## Server Features (26% domain)

### Control model (EXAM FAVORITE — beats "DO vs IS"!)
| Primitive | Controlled by | Methods |
|-----------|--------------|---------|
| **Tools** | **Model** (LLM decides, user approves) | `tools/list`, `tools/call` |
| **Resources** | **Application** (host decides) | `resources/list`, `resources/templates/list`, `resources/read` |
| **Prompts** | **User** (explicit selection, e.g., slash command) | `prompts/list`, `prompts/get` |

### Tools
```json
{
  "name": "get_weather",
  "description": "Get weather for a location",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": {"type": "string"}
    }
  }
}
```
**Key:** Tools are FUNCTIONS the AI can call
- Name unique **per server** (cross-server collisions = host's problem)
- Execution failure → `isError: true` in the RESULT (not a protocol error!)
- Human oversight: UI visibility · per-call approval · pre-approval settings · activity logs

### Resources
```json
{
  "uri": "file:///docs/readme.md",
  "name": "README",
  "mimeType": "text/markdown"
}
```
**Key:** Resources are DATA the AI can read
- Direct (fixed URI) vs Templates (`weather://forecast/{city}/{date}`, support completion)
- Watch changes: `subscriptions/listen` + `resourceSubscriptions` filter

### Prompts
```json
{
  "name": "code-review",
  "description": "Review code for issues",
  "arguments": [
    {"name": "code", "required": true}
  ]
}
```
**Key:** Prompts are TEMPLATES for AI interactions

---

## Client Features (26% domain) — ⚠️ MOSTLY DEPRECATED IN 2026-07-28!

| Feature | Purpose | 2026-07-28 Status | Migration |
|---------|---------|-------------------|-----------|
| **Elicitation** | Server asks user for input | ✅ **Active** (via MRTR) | — |
| **Sampling** | Server asks AI to generate | ❌ **Deprecated** (SEP-2577) | Direct LLM provider APIs |
| **Roots** | Filesystem boundaries | ❌ **Deprecated** (SEP-2577) | Tool params / resource URIs / config |
| **Logging** | `notifications/message` | ❌ **Deprecated** (SEP-2577) | stderr / OpenTelemetry |

### Elicitation — two modes (EXAM FAVORITE)
| Mode | For | Rules |
|------|-----|-------|
| **Form** | Ordinary structured data (schema-validated) | ❌ NEVER passwords/API keys/tokens/payment data |
| **URL** | Credentials, third-party OAuth | Show full URL · explicit consent · NEVER auto-fetch · client learns only consent outcome |

---

## Building Servers & Debugging (26% domain)

### claude_desktop_config.json
```json
{ "mcpServers": { "weather": {
    "command": "uv", "args": ["run", "/ABS/PATH/server.py"],
    "env": {"API_KEY": "..."} } } }
```
- **Absolute paths** only · valid JSON · **fully quit** Claude (not just close window)
- No `port` key — stdio has no TCP!

### Requirements
- Python quickstart: **Python 3.10+, SDK 2.0.0+** · TypeScript: **Node 20+** · Inspector: **Node 22.19.0+**

### Log locations
| OS | Path |
|----|------|
| macOS | `~/Library/Logs/Claude/` |
| Windows | `%APPDATA%\Claude\logs\` |

- `mcp.log` = general connections · `mcp-server-NAME.log` = that server's **stderr**

### Debug checklist (connection failures)
1. Client logs → 2. server process running? → 3. test standalone in **Inspector** → 4. `server/discover` for version/capability match

---



### Agent Skills — building MCP servers with AI (Ch5, EXAM material!)
- **mcp-server-dev plugin** bundles three skills: `build-mcp-server`, `build-mcp-app`, `build-mcpb`
- **Entry skill** (`build-mcp-server`) runs discovery first: connection target, audience, action surface, interaction needs, auth — then recommends a deployment path
- **Four deployment paths:**

| Path | When to Use | Example |
|------|-------------|---------|
| **Remote Streamable HTTP** | Wrapping cloud APIs (default recommendation) | CRM connector, weather API |
| **MCP Apps** | Interactive UI widgets rendered in chat | Dashboard, form builder |
| **MCPB (MCP Bundles)** | Local server + runtime as single `.mcpb` archive | File system access, desktop apps |
| **Local stdio** | Prototyping, upgrade path to MCPB | Quick dev testing |

- **MCPB** = packages local stdio server + runtime → one-click install, no dev environment needed
- **Remote Streamable HTTP** = zero install friction, one deployment serves all users, OAuth works properly
- **Multi-language support** — skills cover Python, TypeScript, and more (NOT Python-only!)

## Client Best Practices (26% domain)

### Progressive tool discovery
- When: large catalogs eating ~**1–5%+** of context window
- Loop: **Catalog → Inspect → Execute** (light list → full schema for candidates → call)
- Strategies: keyword (BM25) · embeddings · subagent · hybrid
- Refresh on `notifications/tools/list_changed`

### Code mode (programmatic tool calling)
- Sandbox has **no network** — all calls via host broker
- Credentials stay with broker, never in generated code
- **Per-call authorization** (approving script ≠ blanket approval)
- `isError` results → exceptions in sandbox

### Prompt-cache preservation
- Append new tool defs **after cache breakpoint** — never re-sort mid-conversation
- Or route via one stable `call_tool({name, args})` meta-tool

---

## Security (24% domain — SECOND HEAVIEST!)

### Key Principles (per the spec — corrected!)
1. **User Consent and Control** — explicit consent for all data access & operations
2. **Data Privacy** — hosts must not transmit resource data without consent
3. **Tool Safety** — tools = arbitrary code; descriptions untrusted unless from trusted server
4. *(pre-2026 revisions added:* **LLM Sampling Controls** *— know it for legacy-flavored questions)*

### OAuth 2.1 Flow (EXAM HEAVY!)
```
1. Client -> MCP Server: request (no token)
2. MCP Server -> Client: 401 + WWW-Authenticate (points to PRM)
3. Client fetches Protected Resource Metadata (RFC 9728)
4. Client fetches Authorization Server Metadata (RFC 8414 / OIDC)
5. Client registers (static | DCR [deprecated] | CIMD [recommended])
6. User authorizes at auth endpoint (PKCE required!)
7. Client exchanges code for token (validate iss if present - MUST)
8. Client -> MCP Server: Authorization: Bearer <token>
9. Server validates signature + exp + AUD + iss -> serves request
```

### HTTP status decision table (EXAM FAVORITE)
| Situation | Status | Client reaction |
|-----------|--------|-----------------|
| No/invalid/expired token | **401** + `WWW-Authenticate` | Run/redo OAuth flow |
| Valid token, missing scope | **403** `insufficient_scope` | Step-up: request **union** of old + new scopes |
| Headers contradict body | **400** + HeaderMismatch | Fix the request |
| Empty scope challenge | — | Fall back to full `scopes_supported` |

### Token rules
| Type | Purpose | Lifetime |
|------|---------|----------|
| **Access Token** | Access resources | Short (hours) |
| **Refresh Token** | Get new access token | Long (days) |
| **ID Token** | User identity | One-time use |

- Validate: **signature + exp + aud + iss** (aud = THIS server!)
- **Token passthrough = FORBIDDEN** (never accept/forward tokens minted for another audience)
- Credentials keyed **per issuer** — never reuse across auth servers

### Attack patterns (know the mitigation!)
| Attack | Mitigation |
|--------|------------|
| **Confused deputy** | **Proxy servers using static client IDs** MUST obtain user consent for each dynamically registered client before forwarding to third-party AS. Never trust a consent cookie from another client ID. OAuth `state`: crypto-random, **set only AFTER consent approval**, single-use, short expiry, exact match at callback |
| **Token passthrough** | MUST NOT accept tokens not issued **to this server** (aud validation); never forward client tokens downstream |
| **SSRF** | MUST consider + mitigate; individual mitigations are SHOULDs: HTTPS (http loopback-only in dev), block private/reserved ranges (10/8, 172.16/12, 192.168/16, 127/8, **169.254/16 incl. 169.254.169.254**, `fc00::/7`, `fe80::/10`), no manual IP parsing (octal/hex/IPv6-mapped tricks), validate redirect hops, egress proxies (e.g. Smokescreen), pin DNS vs TOCTOU rebinding. Attacker-controlled inputs: `resource_metadata` (WWW-Authenticate) · `authorization_servers` (PRM) · AS-metadata endpoints |
| **State-handle hijacking** | Handle ≠ auth! Random handles, bind `user_id:handle`, authorize via token every request |
| **Malicious one-click config** | MUSTs: show full command · flag as dangerous · explicit approval · cancellable |
| **URL scheme abuse** | Open only `http(s)://`, never pass to shell, reject `javascript:`/custom schemes |

### Scope design mistakes
Publishing all scopes in `scopes_supported` · wildcard scopes (`*`, `all`) · bundling privileges · trusting claimed scopes without server-side authz

---

## Ecosystem: Inspector, Extensions, Registry (20% domain)

### MCP Inspector
- Launch: `npx @modelcontextprotocol/inspector` (Node **22.19.0+**)
- Web UI port **6274** (session token in URL) · CLI/TUI OAuth callback **6276**
- `--catalog` (writable, default `~/.mcp-inspector/mcp.json`; created + seeded if missing) vs `--config` (read-only, never written/seeded, **errors if file missing**) — **mutually exclusive!**
- Seeding differs by client: web seeds 2 sample servers · CLI/TUI seed empty `{ "mcpServers": {} }`
- Per-server `protocolEra` in catalog: default **`legacy`**; `modernLogLevel` default `debug`
- OAuth callback URL MUST be loopback (`127.0.0.1`/`localhost`, default port 6276) — code arrives over plaintext http, no override flag exists
- NEVER combine `DANGEROUSLY_OMIT_AUTH` + `DANGEROUSLY_BIND_ALL_INTERFACES`
- CI: `--stored-auth-only` (fail fast, no interactive OAuth)

| CLI exit code | Meaning |
|---------------|---------|
| 0 | Success |
| 1 | Usage/unexpected error |
| 2 | No MCP App found (`--app-info`) |
| 3 | Auth required |
| 4 | Server unreachable |
| 5 | Tool error (`isError`/not found) |

### Extensions (opt-in BOTH sides, never default-on!)
- ID format: `{vendor-prefix}/{extension-name}` — official = `io.modelcontextprotocol/*`, repos = `ext-*`
| Extension | Key facts |
|-----------|-----------|
| **MCP Apps** (`io.modelcontextprotocol/ui`) | `ui://` scheme · `text/html;profile=mcp-app` · `_meta.ui.resourceUri` · sandboxed iframe · postMessage JSON-RPC · UI tool calls hit normal consent path |
| **Tasks** (`io.modelcontextprotocol/tasks`) | `CreateTaskResult` (resultType `"task"`) · **server decides per-request** whether to return a task (client opts in once via extension capability, never per-call) · poll `tasks/get` (respect `pollIntervalMs`) · mid-flight input via **`tasks/update`** — NOT a retry of the original request (≠ core MRTR!) · `tasks/cancel` (cooperative — may still end non-cancelled) · statuses: working, input_required, **completed✓ failed✓ cancelled✓** (✓=terminal) · NO tasks/list or tasks/result! · optional `notifications/tasks` via subscriptions/listen replaces polling |
| **Client Credentials** | M2M auth, no user in loop |
| **EMA** | IdP-managed access, zero-touch SSO, per-group scoping |

### MCP Registry
- Metadata only (code lives on npm/PyPI/Docker Hub) · `server.json` · reverse-DNS names
- Publish: `mcp-publisher init` → `login github` → `publish` (`--dry-run` to validate)
- Namespaces: `io.github.user/*` = GitHub OAuth · `com.acme/*` = DNS/HTTP challenge (remotes must live on acme.com)
| Package type | Ownership marker |
|--------------|------------------|
| npm | `mcpName` in package.json |
| PyPI / NuGet | `mcp-name: <server>` in README |
| Docker/OCI | `io.modelcontextprotocol.server.name` LABEL |
| MCPB | URL contains "mcp" + `fileSha256` (client-validated) |
- ❌ No private servers (self-host a registry) · consume via **aggregators**, not directly

---

## Use Cases (Ch9)

### Who Builds What?
| Who | Builds | Example |
|-----|--------|---------|
| **Tool Providers** | MCP Servers | Database, API, Filesystem |
| **App Developers** | MCP Clients | AI assistants, IDEs |
| **Infrastructure** | Hosts, Gateways | Claude Desktop, Goose |

### Portability Benefit
- Write server ONCE -> Use in ANY MCP client
- No vendor lock-in
- Ecosystem grows faster

---

## Versioning & Lifecycle (part of 24%)

### Protocol eras
| Era | Versions | Handshake |
|-----|----------|-----------|
| **Legacy** | ≤2025-11-25 | `initialize` |
| **Modern** | ≥2026-07-28 | Per-request `_meta` + `server/discover` |
| **Dual-era** | Both | Server routes per request (header presence) |
> Negotiation DETECTS mismatch — it does NOT bridge eras!

### Feature lifecycle (SEP-2596)
- States: **Active → Deprecated → Removed**
- Minimum **12-month** deprecation window; removal needs its own proposal
- "Nothing breaks on July 28"

### Deprecated vs Removed (2026-07-28) — TRAP MATERIAL
| ❌ Deprecated (still works 12 mo) | 🗑️ Removed (gone in modern era) |
|----------------------------------|-------------------------------|
| Roots, Sampling, Logging | `initialize` handshake, sessions/`Mcp-Session-Id` |
| HTTP+SSE transport | `ping`, `logging/setLevel`, `notifications/roots/list_changed` |
| DCR (→ CIMD) | SSE resumability, GET endpoint, `resources/subscribe` |

---

## AAIF (Ch10)

### What is AAIF?
- **Agentic AI Foundation** - Non-profit
- **Purpose** - Govern MCP standard
- **Members** - Anthropic, Google, Microsoft, etc.

### Key Projects
| Project | What It Does |
|---------|--------------|
| **MCP** | The protocol itself |
| **Goose** | Open-source AI agent |
| **AGENTS.md** | Agent configuration standard |
| **agentgateway** | MCP gateway/proxy |



### AGENTS.md — agent configuration standard (Ch17)
- **What:** Universal standard giving AI coding agents consistent project-specific guidance
- **Contributed by:** OpenAI to the AAIF (August 2025)
- **Adoption:** Tens of thousands of open-source projects; integrated by Cursor, GitHub Copilot, VS Code
- **Purpose:** Repos hand project-specific instructions to coding agents → agents operate reliably across repositories and toolchains
- **NOT:** A changelog, a registry of agents, or an authorization config file

### AgentGateway — MCP infrastructure proxy (Ch17)
- **What:** AAIF gateway/proxy project (originally from Solo.io)
- **Purpose:** Mediate agent and MCP traffic — sits in front of agent/MCP traffic
- **Why it matters:** Benefits from 2026-07-28's `Mcp-Method`/`Mcp-Name` header routing — can route, meter, and authorize at the edge without body parsing
- **Use case:** Per-tool rate limiting, WAF policies, load balancing — all visible in HTTP headers

### MCP governance
- Changes via **SEPs** (Specification Enhancement Proposals) — PR-based, sponsored, label-driven status
- Know the big ones: SEP-2575 (stateless), SEP-2322 (MRTR/resultType), SEP-2577 (deprecations), SEP-2243 (headers), SEP-2596 (lifecycle)

---

## Governance & Security Policy (part of 24% — ch16)

### Legal & licensing
- Entity: **Model Context Protocol, a Series of LF Projects, LLC**
- Code + spec contributions: **Apache 2.0** · Docs (excl. specs): **CC BY 4.0**
- Contributors **retain copyright** (no assignment)

### Governance hierarchy (like Python/PyTorch)
| Role | Powers |
|------|--------|
| **Contributors** | Issues, PRs, discussions |
| **Maintainers** | Own components (SDKs, docs, WGs), write access |
| **Core Maintainers** | Project direction; veto Maintainers by majority; appoint/remove Maintainers; bi-weekly meetings (public notes) |
| **Lead Maintainers (BDFL)** | Veto ANYTHING; appoint/remove Core; must publicly explain reasoning |

- All maintainer tiers = **MCP Steering Group** (Member & Community Moderator sit outside it — see Contributor Ladder)
- Membership = **individuals, not companies** (no corporate seats, merit-based, no term limit)
- Everyone (even Leads) uses the **same PR process** as external contributors
- **Interest Groups** articulate problems · **Working Groups** build solutions (SEPs/implementations) — SEP-1302
- Governance channel = maintainer Discord; decisions must be recorded transparently

### Security Policy (community/security)
| Rule | Detail |
|------|--------|
| **Report via** | GitHub Security Advisories (**private** reporting) on the affected repo |
| **NEVER via** | Public issues, discussions, PRs |
| **CVEs** | GitHub's CNA through the GHSA workflow |
| **Cross-SDK** | Receiving maintainers coordinate so fixes/advisories ship **together**; spec-level root cause → escalate to spec maintainers |
| **In scope** | Protocol vulns, authn/z bypass, injection/memory-safety, sandbox escapes, session hijacking, token leakage, cross-tenant access |
| **OUT of scope** | **stdio peer attacks** (peer-only crash/hang/DoS) — stdio transport is NOT a sandbox; peers share a trust boundary |
| **Back IN scope** | Same code reachable via a **remote transport**, or causes a **sandbox escape** |

### Security Interest Group (SIG) — owns vs delegates
- Owns: MCP threat discussion, security proposal review, **disclosure routing**
- Delegates: OAuth mechanics → Authorization IG · TLS/mTLS → Transports WG · annotation design → Tool Annotations IG · registry ops → Registry WG

---

## Memory Hooks

### For Architecture:
> "Host has Clients, Clients talk to Servers"
> (Like a manager has employees who talk to vendors)

### For JSON-RPC:
> "Request has ID, Response has ID, Notification is silent"
> (Notification = text message, no reply expected)

### For OAuth:
> "401 = who are you? 403 = I know you, but no. 400 = what are you even saying?"

### For Tools vs Resources vs Prompts (control model):
> "Model calls Tools, App reads Resources, User picks Prompts"

### For the stateless era:
> "Every request is a stranger — it must introduce itself (_meta) every time"

### For MRTR:
> "Server never calls you back — it hands you a form (input_required) and waits for the retry"

### For MCP error codes:
> "20-21-22: Header, Capability, Version" (-32020/-32021/-32022) + "01: Invalid Version" (-32001)

---

## Common Exam Traps

### Trap 1: Confusing Tools and Resources
- Tools = Functions (can cause side effects), MODEL-controlled
- Resources = Data (read-only), APPLICATION-controlled

### Trap 2: Notification vs Request
- Request expects response (has ID)
- Notification doesn't (NO id member)
- `id: null` is NOT a notification — and in MCP it's not a valid request either: **null ids are forbidden** (base JSON-RPC only discourages them)

### Trap 3: Transport Security
- stdio = OS-level security (not OAuth)
- HTTP = Needs OAuth 2.1

### Trap 4: Sampling Direction
- Sampling = Server asks Client's AI (not the other way!)
- ...and in 2026-07-28 sampling is DEPRECATED (via MRTR while it lasts)

### Trap 5: "Session" anything = legacy
- Mcp-Session-Id, initialize, sticky routing → all removed in modern era

### Trap 6: Resumability
- Broken SSE stream ≠ resume with Last-Event-ID → RE-ISSUE as new request **with new request ID** (spec MUST)

### Trap 7: list_changed vs TTL
- Fresh TTL does NOT save a cache once list_changed arrives

### Trap 8: Tasks methods
- tasks/get + tasks/update + tasks/cancel exist; tasks/list and tasks/result DON'T

### Trap 9: Extensions default
- NEVER active by default — both sides must declare (server returning a task to a non-declaring client = violation)

### Trap 10: Resource not found
- Now -32602 (Invalid params), NOT -32002!
- But clients SHOULD still ACCEPT -32002 from legacy servers

### Trap 11: MRTR scope
- InputRequiredResult is legal ONLY on prompts/get, resources/read, tools/call — never on tools/list, server/discover, etc.
- The retry gets a NEW JSON-RPC id (correlation via requestState, not id)

### Trap 12: HeaderMismatch numbering
- SEP-2243 text says -32001; the final spec renumbered it to **-32020** — answer -32020 unless the question explicitly quotes the SEP

### Trap 13: Missing _meta vs missing capability
- Missing required _meta field → -32602 + HTTP 400
- _meta present but needed capability undeclared → -32021 (data.requiredCapabilities)

### Trap 14: Tasks input ≠ MRTR retry
- Core MRTR: answer by RETRYING the original request with inputResponses
- Tasks extension: answer via tasks/update against the taskId — no retry

---

## Confidence Tracker

Rate yourself 1-5 after studying each topic:

| Topic | Weight | Confidence | Notes |
|-------|--------|------------|-------|
| MCP Basics | 16% | ___/5 | |
| Architecture | 14% | ___/5 | |
| JSON-RPC | 14% | ___/5 | |
| Stateless core / MRTR | 26% | ___/5 | |
| Server Features | 26% | ___/5 | |
| Client Features | 26% | ___/5 | |
| Building & Debugging | 26% | ___/5 | |
| Security | 24% | ___/5 | |
| OAuth 2.1 | 24% | ___/5 | |
| Versioning & Lifecycle | 24% | ___/5 | |
| Governance & Security Policy | 24% | ___/5 | |
| Inspector | 20% | ___/5 | |
| Extensions | 20% | ___/5 | |
| Registry | 20% | ___/5 | |
| AAIF | — | ___/5 | |

**Target:** All topics >= 4/5 before exam — start with the 26% and 24% rows!

---

## Last-Minute Review (Exam Day)

1. **Architecture diagram** - Can you draw it from memory?
2. **`_meta` fields** - REQUIRED: protocolVersion + clientCapabilities (missing → -32602/400); clientInfo is only SHOULD?
3. **MRTR loop** - input_required → inputResponses + echoed requestState → retry with a NEW id? Only on prompts/get, resources/read, tools/call?
4. **Control model** - Model→Tools, App→Resources, User→Prompts?
5. **OAuth flow** - 401 → PRM → AS metadata → PKCE → aud validation?
6. **401 vs 403 vs 400** - authenticate / step-up scope union / header mismatch?
7. **Error codes** - -32601 = ? (Method not found) · -32001 = InvalidProtocolVersion · -32020/21/22 = Header/Capability/Version?
8. **Deprecated trio** - Roots, Sampling, Logging (12-month window)?
9. **Task terminal statuses** - completed, failed, cancelled?
10. **Registry markers** - mcpName / mcp-name / OCI label / fileSha256?
11. **JSON-RPC id in MCP** - string or int, never null, unique among outstanding requests?
12. **-32001 vs -32020** - HeaderMismatch is -32020 in the final spec (SEP text said -32001)?
