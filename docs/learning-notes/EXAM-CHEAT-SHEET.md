# MCPA Exam Cheat Sheet
## Fill this in as you study - Review before exam!

---

## EXAM DOMAIN WEIGHTS (study time allocator!)

| Domain | Weight | Maps to Chapters | Question Bank |
|--------|--------|------------------|---------------|
| **Interactions & Execution** | **26%** | Server Features, Client Features, Building Servers, Client Best Practices, Debugging | ch3–6, 10 |
| **Security & Governance** | **24%** | Authorization (OAuth 2.1), Security & Trust, Lifecycle/Changelog | ch7, 8, 15 |
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

## THE STATELESS CORE (2026-07-28) — HIGHEST-VALUE SECTION

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
3. `io.modelcontextprotocol/clientInfo` (SHOULD)

### `server/discover` (mandatory RPC — replaces handshake discovery)
Returns: `supportedVersions` · `capabilities` (incl. extensions) · `serverInfo` · `ttlMs` · `cacheScope`

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

### MCP Transport details
| Transport | Characteristic |
|-----------|----------------|
| **stdio** | Client launches the server as a subprocess |
| **stdio** | Communication via `stdin`/`stdout` (newline-delimited JSON-RPC) |
| **stdio** | Single shared bidirectional channel |
| **stdio** |  stdout is protocol-only — log to **stderr** (`print()`/`console.log()` = corruption!) |
| **stdio** | Best for local, same-machine integrations |
| **Streamable HTTP** | Server runs as an independent process handling multiple clients |
| **Streamable HTTP** | Client sends each JSON-RPC message as an HTTP POST |
| **Streamable HTTP** | Server responds with either a single JSON object or a per-request SSE stream |
| **Streamable HTTP** | Supports remote/networked deployments |
| **HTTP+SSE (legacy)** |  DEPRECATED — two-endpoint design replaced by Streamable HTTP (2025-03-26) |

### Required HTTP headers (SEP-2243) — NEW EXAM MATERIAL
| Header | When | Purpose |
|--------|------|---------|
| `Mcp-Method` | **Every request** | Gateway routing without body parsing |
| `Mcp-Name` | `tools/call`, `resources/read`, `prompts/get` | Names the target |
| `Mcp-Param-*` | Params annotated `x-mcp-header` | Surface arg values to infra |
| Header ≠ body? | → **400 + HeaderMismatch (-32020)** | Anti-spoofing |

### subscriptions/listen (replaces GET endpoint + resources/subscribe)
- Opt-in types: `toolsListChanged` · `promptsListChanged` · `resourcesListChanged` · `resourceSubscriptions`
- Server ACKs first: `notifications/subscriptions/acknowledged`
- `subscriptionId` = the listen request's JSON-RPC id (tags every notification)
- Delivery = **best-effort** (no replay — poll as backup)
-  `notifications/progress` does NOT ride here — it flows on the originating request's response stream

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
- Notification = **no id** → server MUST NOT reply (id `null` = discouraged request, NOT a notification)
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
| `-32020` | HeaderMismatch | HTTP headers disagree with body |
| `-32021` | MissingRequiredClientCapability | Request `_meta` lacks a needed capability |
| `-32022` | UnsupportedProtocolVersion | `data` field lists supported versions |
| `-32000..-32019` | Implementation-defined | SDK/app errors (grandfathered) |
| `-32020..-32099` | **Reserved for MCP spec** | Allocation policy |

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

## Client Features (26% domain) —  MOSTLY DEPRECATED IN 2026-07-28!

| Feature | Purpose | 2026-07-28 Status | Migration |
|---------|---------|-------------------|-----------|
| **Elicitation** | Server asks user for input | ✅ **Active** (via MRTR) | — |
| **Sampling** | Server asks AI to generate | **Deprecated** (SEP-2577) | Direct LLM provider APIs |
| **Roots** | Filesystem boundaries |  **Deprecated** (SEP-2577) | Tool params / resource URIs / config |
| **Logging** | `notifications/message` |  **Deprecated** (SEP-2577) | stderr / OpenTelemetry |

### Elicitation — two modes (EXAM FAVORITE)
| Mode | For | Rules |
|------|-----|-------|
| **Form** | Ordinary structured data (schema-validated) |  NEVER passwords/API keys/tokens/payment data |
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
| **Confused deputy** | Per-client user consent (never trust cached consent cookie from another client ID) |
| **Token passthrough** | aud validation; reject same-issuer tokens for other services |
| **SSRF** | HTTPS-only, block private IPs (10/8, 172.16/12, 192.168/16, **169.254.169.254**), no manual IP parsing, egress proxies |
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
- `--catalog` (writable, default `~/.mcp-inspector/mcp.json`) vs `--config` (read-only) — **mutually exclusive!**
- Protocol era: `auto` | `modern` | `legacy`
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
| **Tasks** (`io.modelcontextprotocol/tasks`) | `CreateTaskResult` (resultType `"task"`) · poll `tasks/get` · `tasks/update` (input) · `tasks/cancel` (cooperative) · statuses: working, input_required, **completed✓ failed✓ cancelled✓** (✓=terminal) · NO tasks/list or tasks/result! |
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
-  No private servers (self-host a registry) · consume via **aggregators**, not directly

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
|  Deprecated (still works 12 mo) | 🗑️ Removed (gone in modern era) |
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

### MCP governance
- Changes via **SEPs** (Specification Enhancement Proposals) — PR-based, sponsored, label-driven status
- Know the big ones: SEP-2575 (stateless), SEP-2322 (MRTR/resultType), SEP-2577 (deprecations), SEP-2243 (headers), SEP-2596 (lifecycle)

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
> "20-21-22: Header, Capability, Version" (-32020/-32021/-32022)

---

## Common Exam Traps

### Trap 1: Confusing Tools and Resources
- Tools = Functions (can cause side effects), MODEL-controlled
- Resources = Data (read-only), APPLICATION-controlled

### Trap 2: Notification vs Request
- Request expects response (has ID)
- Notification doesn't (NO id member — `id: null` is NOT a notification!)

### Trap 3: Transport Security
- stdio = OS-level security (not OAuth)
- HTTP = Needs OAuth 2.1

### Trap 4: Sampling Direction
- Sampling = Server asks Client's AI (not the other way!)
- ...and in 2026-07-28 sampling is DEPRECATED (via MRTR while it lasts)

### Trap 5: "Session" anything = legacy
- Mcp-Session-Id, initialize, sticky routing → all removed in modern era

### Trap 6: Resumability
- Broken SSE stream ≠ resume with Last-Event-ID → RE-ISSUE with new request ID

### Trap 7: list_changed vs TTL
- Fresh TTL does NOT save a cache once list_changed arrives

### Trap 8: Tasks methods
- tasks/get + tasks/update + tasks/cancel exist; tasks/list and tasks/result DON'T

### Trap 9: Extensions default
- NEVER active by default — both sides must declare (server returning a task to a non-declaring client = violation)

### Trap 10: Resource not found
- Now -32602 (Invalid params), NOT -32002!

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
| Inspector | 20% | ___/5 | |
| Extensions | 20% | ___/5 | |
| Registry | 20% | ___/5 | |
| AAIF | — | ___/5 | |

**Target:** All topics >= 4/5 before exam — start with the 26% and 24% rows!

---

## Last-Minute Review (Exam Day)

1. **Architecture diagram** - Can you draw it from memory?
2. **The three required `_meta` fields** - protocolVersion, clientCapabilities, clientInfo?
3. **MRTR loop** - input_required → inputResponses + requestState → retry?
4. **Control model** - Model→Tools, App→Resources, User→Prompts?
5. **OAuth flow** - 401 → PRM → AS metadata → PKCE → aud validation?
6. **401 vs 403 vs 400** - authenticate / step-up scope union / header mismatch?
7. **Error codes** - -32601 = ? (Method not found) · -32020/21/22 = Header/Capability/Version?
8. **Deprecated trio** - Roots, Sampling, Logging (12-month window)?
9. **Task terminal statuses** - completed, failed, cancelled?
10. **Registry markers** - mcpName / mcp-name / OCI label / fileSha256?
