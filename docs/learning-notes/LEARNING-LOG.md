#  Day 1

**Author:** Student
**Date:** Aug 13, 2026

---

MCP stands for Model Context Protocol. It's an open-source and community-backed standard to connect AI apps (e.g. Claude, ChatGPT/Goose) to data sources (e.g. local files, search engines), tools and workflows. This enables AI applications not only to retrieve and provide information but also to perform tasks and interact with other apps. In short - MCP provides an access standard to external systems using a server-client architecture.

---

## Key Concepts from Day 1:
- **MCP** = A standard protocol for AI-to-tool communication
- **Server** = Provides tools, resources, prompts
- **Client** = Connects to servers, requests capabilities
- **Transport** = How messages travel (stdio, HTTP)

## What is a Host?

The **host** is the AI application the user actually runs — e.g., Claude Desktop, an IDE, or an agent like Goose. It acts as the **container and coordinator**:

- Creates and manages one or more **client** instances (one per server connection)
- Controls connection permissions and lifecycle
- Enforces security policies and consent requirements
- Handles user authorization decisions
- Coordinates the AI/LLM integration (decides what context and tools the model sees)
- Aggregates context across all connected servers

> Think: **the manager** — it hires the employees (clients) and decides the rules.

## What is a Client?

A **client** is a protocol component *inside the host* that maintains a **dedicated 1:1 connection with exactly one server**:

- Communicates with exactly one server (host spawns a new client per server)
- Attaches the protocol version and capabilities to every request (`_meta`, 2026-07-28)
- Routes protocol messages bidirectionally
- Manages subscriptions and notifications
- Maintains the security boundary between servers

> Think: **the employee** assigned to exactly one vendor.
> **Cardinality:** Host → many clients; each client → one server.

## What is a Server?

A **server** is a program that provides specialized context and capabilities to AI applications:

- Exposes the three primitives: **tools** (model-controlled functions), **resources** (application-controlled data), **prompts** (user-controlled templates)
- Operates independently with a focused responsibility
- Requests client input (elicitation) via `InputRequiredResult` within a reply (MRTR)
- Must respect security constraints
- Can be a **local process** (stdio subprocess) or a **remote service** (Streamable HTTP)

> Think: **the vendor** — same server works with any MCP-compliant host (write once, use anywhere).

## What's the difference between stdio and HTTP transports?

| | **stdio** | **Streamable HTTP** |
|---|---|---|
| **Server runs as** | Subprocess launched by the client | Independent process |
| **Message channel** | `stdin`/`stdout`, newline-delimited JSON-RPC (single shared bidirectional channel) | Each JSON-RPC message = HTTP POST; response is a single JSON object **or** a per-request SSE stream |
| **Clients served** | Typically one (the launching host) | Many clients concurrently |
| **Reach** | Local, same machine only | Remote / networked deployments |
| **Security model** | OS permissions (process isolation) | TLS + OAuth 2.1 (Bearer tokens) |
| **Logging rule** | stdout is protocol-only — log to **stderr** (`print()`/`console.log()` corrupts the stream) | Log freely; stdout isn't the wire |
| **Extra headers (2026-07-28)** | n/a | `Mcp-Method` on every request; `Mcp-Name` for `tools/call`, `resources/read`, `prompts/get` |

> **Rule of thumb:** same machine → stdio; anything over a network → Streamable HTTP.
> (Legacy **HTTP+SSE** with its two-endpoint design is deprecated — replaced by Streamable HTTP.)


**Date:** 2026.08.13

**What I learned (facts):**
- the introduction basics of MCP and its structure

**What I understood (concepts):**
- client-server aspect
- roles

**What confused me (questions):**
- transport layer

**What I'd do differently:**
- i have an urge to write the cheat sheet and these lessons into a paper notebook :D So it sticks better :D as this is still nothing compared to the whole content here :D
