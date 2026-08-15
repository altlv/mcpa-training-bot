# Question Bank vs Exam Cheat Sheet Gap Analysis

**Date:** Aug 15, 2026
**Purpose:** Identify gaps between exam expectations and current question coverage

---

## 📊 Summary

| Metric | Cheat Sheet | Questions | Gap |
|--------|-------------|-----------|-----|
| **Total Topics** | 35+ sections | 278 questions | Need analysis |
| **Exam Domains** | 5 domains | Covered | ✅ |
| **Critical Gaps** | See below | See below | ⚠️ |

---

## 🎯 Exam Domain Coverage

### 1. Interactions & Execution (26%)
**Cheat Sheet Topics:**
- Server Features (Tools, Resources, Prompts)
- Client Features (Sampling, Elicitation, Roots)
- Building Servers & Debugging
- Client Best Practices
- Control model (DO vs IS)
- MRTR flow (Multi-Round-Trip Requests)

**Questions Available:** ~110 questions

**🚨 CRITICAL GAPS:**

| Topic | Cheat Sheet Coverage | Question Status | Gap Level |
|-------|---------------------|-----------------|-----------|
| **MRTR Flow** | Detailed (lines 62-70) | ❌ No questions | 🔴 CRITICAL |
| **Control Model (DO vs IS)** | Detailed (lines 198-204) | ❌ No questions | 🔴 CRITICAL |
| **Server-initiated requests** | Detailed (line 42) | ❌ No questions | 🔴 CRITICAL |
| **InputRequiredResult** | Detailed (lines 59, 66-67) | ❌ No questions | 🔴 CRITICAL |
| **requestState handling** | Detailed (line 69) | ❌ No questions | 🔴 CRITICAL |
| **resultType values** | Detailed (lines 55-61) | ❌ No questions | 🔴 CRITICAL |
| **Progressive tool discovery** | Lines 295-300 | ❌ No questions | 🟡 MEDIUM |
| **Code mode (programmatic)** | Lines 301-306 | ❌ No questions | 🟡 MEDIUM |
| **Prompt-cache preservation** | Lines 307-312 | ❌ No questions | 🟡 MEDIUM |

---

### 2. Security & Governance (24%)
**Cheat Sheet Topics:**
- OAuth 2.1 Flow
- HTTP status codes (401, 403, 400)
- Token rules
- Attack patterns
- Scope design
- Key security principles

**Questions Available:** ~35 questions

**🚨 CRITICAL GAPS:**

| Topic | Cheat Sheet Coverage | Question Status | Gap Level |
|-------|---------------------|-----------------|-----------|
| **Attack patterns** | Detailed (lines 353-362) | ❌ No questions | 🔴 CRITICAL |
| **Confused deputy attack** | Line 354 | ❌ No questions | 🔴 CRITICAL |
| **SSRF mitigation** | Line 356 | ❌ No questions | 🔴 CRITICAL |
| **Token passthrough risks** | Line 358 | ❌ No questions | 🔴 CRITICAL |
| **Scope design mistakes** | Lines 363-367 | ❌ No questions | 🔴 CRITICAL |
| **Governance hierarchy** | Lines 478-491 | ❌ No questions | 🟡 MEDIUM |
| **Security Policy** | Lines 492-502 | ❌ No questions | 🟡 MEDIUM |
| **SIG responsibilities** | Lines 503-508 | ❌ No questions | 🟡 MEDIUM |

---

### 3. Use Cases & Ecosystem (20%)
**Cheat Sheet Topics:**
- MCP Inspector
- Extensions
- Registry
- Use Cases
- AAIF Projects
- Versioning & Lifecycle

**Questions Available:** ~65 questions

**🚨 CRITICAL GAPS:**

| Topic | Cheat Sheet Coverage | Question Status | Gap Level |
|-------|---------------------|-----------------|-----------|
| **MCP Inspector details** | Lines 370-386 | ❌ No questions | 🔴 CRITICAL |
| **Extensions (opt-in)** | Lines 387-395 | ❌ No questions | 🔴 CRITICAL |
| **Registry (discovery)** | Lines 396-409 | ❌ No questions | 🔴 CRITICAL |
| **Feature lifecycle (SEP-2596)** | Lines 436-440 | ❌ No questions | 🟡 MEDIUM |
| **Deprecated vs Removed** | Lines 441-449 | ❌ No questions | 🟡 MEDIUM |
| **Protocol eras** | Lines 428-435 | ❌ No questions | 🟡 MEDIUM |

---

### 4. MCP Fundamentals (16%)
**Cheat Sheet Topics:**
- What is MCP
- Why it exists
- M×N problem
- LSP analogy
- Three things it standardizes

**Questions Available:** ~21 questions

**✅ Coverage:** Good

**Minor Gaps:**

| Topic | Cheat Sheet Coverage | Question Status | Gap Level |
|-------|---------------------|-----------------|-----------|
| **Current spec version** | Line 27 | ⚠️ May be outdated | 🟢 LOW |
| **Created by (Anthropic)** | Line 25 | ⚠️ May be outdated | 🟢 LOW |

---

### 5. Architecture & Components (14%)
**Cheat Sheet Topics:**
- Three Participants
- Cardinality
- Two Layers
- Transports
- JSON-RPC 2.0
- Error Codes

**Questions Available:** ~19 questions

**🚨 CRITICAL GAPS:**

| Topic | Cheat Sheet Coverage | Question Status | Gap Level |
|-------|---------------------|-----------------|-----------|
| **Stateless Core changes** | Lines 34-45 | ❌ No questions | 🔴 CRITICAL |
| **Every request _meta** | Lines 47-51 | ❌ No questions | 🔴 CRITICAL |
| **server/discover** | Lines 52-54 | ❌ No questions | 🔴 CRITICAL |
| **Required HTTP headers** | Lines 138-145 | ❌ No questions | 🔴 CRITICAL |
| **subscriptions/listen** | Lines 146-152 | ❌ No questions | 🟡 MEDIUM |
| **Caching (SEP-2549)** | Lines 153-159 | ❌ No questions | 🟡 MEDIUM |
| **MCP-specific Error Codes** | Lines 185-195 | ❌ No questions | 🔴 CRITICAL |

---

## 🔴 TOP 10 CRITICAL GAPS (Must Fix!)

### 1. **MRTR Flow (Multi-Round-Trip Requests)**
**Why Critical:** "EXAM FAVORITE" label in cheat sheet
**Cheat Sheet:** Lines 62-70
**Questions:** 0
**Impact:** 26% domain (Interactions)

**What to Add:**
- MRTR flow steps
- InputRequiredResult handling
- requestState purpose
- When to use MRTR vs single request

---

### 2. **Stateless Core (2026-07-28)**
**Why Critical:** "HIGHEST-VALUE SECTION" label
**Cheat Sheet:** Lines 34-71
**Questions:** 0
**Impact:** Multiple domains

**What to Add:**
- What changed from legacy
- Every request _meta requirements
- server/discover flow
- resultType values

---

### 3. **Control Model (DO vs IS)**
**Why Critical:** "EXAM FAVORITE" label
**Cheat Sheet:** Lines 198-204
**Questions:** 0
**Impact:** 26% domain (Interactions)

**What to Add:**
- Tools = DO (model executes)
- Resources = IS (model reads)
- Prompts = templates
- Decision scenarios

---

### 4. **Attack Patterns**
**Why Critical:** Security domain (24%)
**Cheat Sheet:** Lines 353-362
**Questions:** 0
**Impact:** 24% domain (Security)

**What to Add:**
- Confused deputy attack
- SSRF mitigation
- Token passthrough risks
- Mitigation strategies

---

### 5. **MCP Inspector**
**Why Critical:** Use Cases domain (20%)
**Cheat Sheet:** Lines 370-386
**Questions:** 0
**Impact:** 20% domain (Use Cases)

**What to Add:**
- What is Inspector
- How to use it
- Debugging capabilities
- When to use

---

### 6. **Extensions**
**Why Critical:** Use Cases domain (20%)
**Cheat Sheet:** Lines 387-395
**Questions:** 0
**Impact:** 20% domain (Use Cases)

**What to Add:**
- What are extensions
- Opt-in model
- How to enable
- Default behavior

---

### 7. **Registry**
**Why Critical:** Use Cases domain (20%)
**Cheat Sheet:** Lines 396-409
**Questions:** 0
**Impact:** 20% domain (Use Cases)

**What to Add:**
- What is Registry
- Discovery mechanism
- Publishing servers
- Finding servers

---

### 8. **MCP-specific Error Codes**
**Why Critical:** Architecture domain (14%)
**Cheat Sheet:** Lines 185-195
**Questions:** 0
**Impact:** 14% domain (Architecture)

**What to Add:**
- MCP-specific codes vs JSON-RPC codes
- When to use each
- Error handling patterns

---

### 9. **Required HTTP Headers**
**Why Critical:** "NEW EXAM MATERIAL" label
**Cheat Sheet:** Lines 138-145
**Questions:** 0
**Impact:** 14% domain (Architecture)

**What to Add:**
- SEP-2243 headers
- Protocol version header
- Client capabilities header
- When required

---

### 10. **Feature Lifecycle**
**Why Critical:** Versioning domain (24%)
**Cheat Sheet:** Lines 436-449
**Questions:** 0
**Impact:** 24% domain (Security/Governance)

**What to Add:**
- Deprecated vs Removed
- SEP-2596 process
- Migration strategies
- Exam traps

---

## 🟡 MEDIUM PRIORITY GAPS

| Topic | Domain | Questions Needed |
|-------|--------|-----------------|
| Progressive tool discovery | Interactions | 3-5 |
| Code mode (programmatic) | Interactions | 2-3 |
| Prompt-cache preservation | Interactions | 2-3 |
| Scope design mistakes | Security | 3-5 |
| Governance hierarchy | Security | 2-3 |
| Protocol eras | Use Cases | 2-3 |
| subscriptions/listen | Architecture | 2-3 |
| Caching (SEP-2549) | Architecture | 2-3 |

---

## 📋 Recommended Question Addition Plan

### Phase 1: Critical Gaps (This Week)
**Target:** Add 50+ questions for top 10 gaps

| Gap | Questions to Add | Priority |
|-----|-----------------|----------|
| MRTR Flow | 10 | 🔴 |
| Stateless Core | 10 | 🔴 |
| Control Model | 8 | 🔴 |
| Attack Patterns | 8 | 🔴 |
| Inspector/Extensions/Registry | 10 | 🔴 |
| Error Codes | 5 | 🔴 |

### Phase 2: Medium Gaps (Next Week)
**Target:** Add 25+ questions for medium gaps

### Phase 3: Scenario Questions (Week 3)
**Target:** Add 20+ scenario-based questions

---

## 🎯 Quick Wins

### Add These Tags to Questions:
```json
{
  "tags": [
    "mrap-flow",
    "stateless-core", 
    "control-model",
    "attack-patterns",
    "inspector",
    "extensions",
    "registry",
    "error-codes",
    "http-headers",
    "feature-lifecycle"
  ]
}
```

### Question Types Needed:
- [ ] MRTR flow scenarios
- [ ] Stateless request examples
- [ ] Control model decisions
- [ ] Attack mitigation scenarios
- [ ] Inspector usage
- [ ] Extension configuration
- [ ] Registry operations
- [ ] Error handling patterns

---

## 🚀 Next Steps

1. **Immediate:** Add 50 questions for critical gaps
2. **This Week:** Update schema for new question types
3. **Next Week:** Add scenario questions
4. **Week 3:** Create practice exam from gaps

---

**Generated:** Aug 15, 2026
**Next Review:** After adding critical gap questions
