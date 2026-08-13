# 🎯 MCPA Exam Cheat Sheet
## Fill this in as you study - Review before exam!

---

## 📋 Quick Reference Card

### MCP in 30 Seconds
- **MCP** = Model Context Protocol (USB for AI)
- **Purpose** = Standardize how AI apps connect to tools/data
- **Created by** = Anthropic (2023)
- **Status** = Open standard, growing ecosystem

---

## 🏗️ Architecture (Ch2)

### The Three Participants
| Participant | Role | Example |
|-------------|------|---------|
| **Host** | AI application | Claude Desktop, Goose |
| **Client** | Protocol handler | Built into host |
| **Server** | Provides tools/data | Your MCP server |

### Cardinality (EXAM FAVORITE!)
```
Host ──► Many Clients
Client ──► One Server
Client ──► Many Servers (via multiple clients)
```

### Transports
| Transport | Use Case | Security |
|-----------|----------|----------|
| **stdio** | Local, same machine | OS permissions |
| **HTTP+SSE** | Remote, network | TLS + OAuth |

---

## 📨 JSON-RPC 2.0 (Ch3)

### Message Types
| Type | Direction | Has ID? | Example |
|------|-----------|---------|---------|
| **Request** | Both | ✅ Yes | `{"jsonrpc":"2.0","method":"tools/list","id":1}` |
| **Response** | Both | ✅ Yes | `{"jsonrpc":"2.0","result":{},"id":1}` |
| **Notification** | Both | ❌ No | `{"jsonrpc":"2.0","method":"notifications/initialized"}` |

### Error Codes (MEMORIZE!)
| Code | Name | Meaning |
|------|------|---------|
| `-32700` | Parse error | Invalid JSON |
| `-32600` | Invalid request | Not valid JSON-RPC |
| `-32601` | Method not found | Unknown method |
| `-32602` | Invalid params | Wrong parameters |
| `-32603` | Internal error | Server bug |

---

## 🔧 Server Features (Ch4)

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

### Resources
```json
{
  "uri": "file:///docs/readme.md",
  "name": "README",
  "mimeType": "text/markdown"
}
```
**Key:** Resources are DATA the AI can read

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

## 🖥️ Client Features (Ch5)

| Feature | Purpose | Exam Hint |
|---------|---------|-----------|
| **Sampling** | Server asks AI to generate | "Server-initiated AI call" |
| **Roots** | Client tells server what it can access | "Filesystem boundaries" |
| **Elicitation** | Server asks user for input | "Human-in-the-loop" |

---

## 🔒 Security (Ch7-8)

### Four Key Principles
1. **User Consent** - User must approve actions
2. **Data Privacy** - Don't leak sensitive data
3. **Tool Safety** - Validate all inputs
4. **Trust Boundaries** - Know who trusts whom

### OAuth 2.1 Flow (EXAM HEAVY!)
```
1. Client → Auth Server: "User wants to access server"
2. Auth Server → User: "Do you authorize?"
3. User → Auth Server: "Yes"
4. Auth Server → Client: "Here's authorization code"
5. Client → Auth Server: "Exchange code for token"
6. Auth Server → Client: "Here's access token"
7. Client → Resource Server: "Here's token, give me data"
```

### Token Types
| Type | Purpose | Lifetime |
|------|---------|----------|
| **Access Token** | Access resources | Short (hours) |
| **Refresh Token** | Get new access token | Long (days) |
| **ID Token** | User identity | One-time use |

---

## 🌐 Use Cases (Ch9)

### Who Builds What?
| Who | Builds | Example |
|-----|--------|---------|
| **Tool Providers** | MCP Servers | Database, API, Filesystem |
| **App Developers** | MCP Clients | AI assistants, IDEs |
| **Infrastructure** | Hosts, Gateways | Claude Desktop, Goose |

### Portability Benefit
- Write server ONCE → Use in ANY MCP client
- No vendor lock-in
- Ecosystem grows faster

---

## 🏛️ AAIF (Ch10)

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

---

## 🧠 Memory Hooks

### For Architecture:
> "Host has Clients, Clients talk to Servers"
> (Like a manager has employees who talk to vendors)

### For JSON-RPC:
> "Request has ID, Response has ID, Notification is silent"
> (Notification = text message, no reply expected)

### For OAuth:
> "Authorization Code Flow = User says yes → Get code → Exchange for token"
> (Like checking into a hotel: ID → Room key → Access room)

### For Tools vs Resources:
> "Tools DO things, Resources ARE things"
> (Tool = hammer, Resource = wood)

---

## ⚠️ Common Exam Traps

### Trap 1:混淆 Tools and Resources
- Tools = Functions (can cause side effects)
- Resources = Data (read-only)

### Trap 2: Notification vs Request
- Request expects response (has ID)
- Notification doesn't (no ID)

### Trap 3: Transport Security
- stdio = OS-level security (not OAuth)
- HTTP = Needs OAuth 2.1

### Trap 4: Sampling Direction
- Sampling = Server asks Client's AI (not the other way!)

---

## 📊 Confidence Tracker

Rate yourself 1-5 after studying each topic:

| Topic | Confidence | Notes |
|-------|------------|-------|
| MCP Basics | ___/5 | |
| Architecture | ___/5 | |
| JSON-RPC | ___/5 | |
| Server Features | ___/5 | |
| Client Features | ___/5 | |
| Security | ___/5 | |
| OAuth 2.1 | ___/5 | |
| Use Cases | ___/5 | |
| AAIF | ___/5 | |

**Target:** All topics ≥ 4/5 before exam

---

## 🎯 Last-Minute Review (Exam Day)

1. **Architecture diagram** - Can you draw it from memory?
2. **JSON-RPC message types** - Request/Response/Notification?
3. **Tool vs Resource** - DO vs IS?
4. **OAuth flow** - Steps 1-7?
5. **Error codes** - 32601 = ? (Method not found)

---

## 📝 Your Notes Here

### Things that surprised me:
- 
- 
- 

### Things I keep forgetting:
- 
- 
- 

### Questions to ask before exam:
- 
- 
- 

---

*Last updated: 2026-08-13*
*Exam date: 2026-09-12*
*Status: Filling in as you study* 📚