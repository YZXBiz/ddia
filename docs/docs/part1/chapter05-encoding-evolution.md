---
sidebar_position: 5
title: "Chapter 5. Encoding and Evolution"
description: "Data encoding formats and schema evolution for maintaining compatibility across versions"
---

# Chapter 5. Encoding and Evolution

> Everything changes and nothing stands still.
>
> _Heraclitus of Ephesus, as quoted by Plato in Cratylus (360 BCE)_

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1. [The Challenge of Change](#11-the-challenge-of-change)
   - 1.2. [Compatibility Requirements](#12-compatibility-requirements)
2. [Formats for Encoding Data](#2-formats-for-encoding-data)
   - 2.1. [Language-Specific Formats](#21-language-specific-formats)
   - 2.2. [JSON, XML, and Binary Variants](#22-json-xml-and-binary-variants)
   - 2.3. [Protocol Buffers](#23-protocol-buffers)
   - 2.4. [Avro](#24-avro)
   - 2.5. [The Merits of Schemas](#25-the-merits-of-schemas)
3. [Modes of Dataflow](#3-modes-of-dataflow)
   - 3.1. [Dataflow Through Databases](#31-dataflow-through-databases)
   - 3.2. [Dataflow Through Services: REST and RPC](#32-dataflow-through-services-rest-and-rpc)
   - 3.3. [Durable Execution and Workflows](#33-durable-execution-and-workflows)
   - 3.4. [Event-Driven Architectures](#34-event-driven-architectures)
4. [Summary](#4-summary)

---

## 1. Introduction

**In plain English:** Think about updating an app on your phone. Some users update immediately, others wait weeks or months. During that time, the new version and old version need to work together, sharing data without breaking. This chapter is about how to make that happen.

**In technical terms:** This chapter explores how to encode data structures into bytes for storage or transmission, and how to evolve those encodings over time while maintaining compatibility between different versions of your application.

**Why it matters:** Applications inevitably change. Without careful planning for how data is encoded and versioned, you'll either break existing systems or be unable to deploy new features. The techniques in this chapter enable smooth, zero-downtime deployments.

### 1.1. The Challenge of Change

Applications inevitably change over time. Features are added or modified as new products are launched, user requirements become better understood, or business circumstances change. In Chapter 2 we introduced the idea of evolvability: we should aim to build systems that make it easy to adapt to change.

In most cases, a change to an application's features also requires a change to data that it stores: perhaps a new field or record type needs to be captured, or perhaps existing data needs to be presented in a new way.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT REALITY                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  SERVER-SIDE                           CLIENT-SIDE                        │
│  ────────────                          ───────────                        │
│                                                                           │
│  Rolling Upgrade:                      User Updates:                      │
│  ┌─────────┐  ┌─────────┐             ┌─────────┐  ┌─────────┐          │
│  │  v1.0   │  │  v1.1   │             │  v1.0   │  │  v1.0   │          │
│  │ Server  │  │ Server  │             │ Mobile  │  │ Mobile  │          │
│  └─────────┘  └─────────┘             └─────────┘  └─────────┘          │
│       │            │                        │            │               │
│       └────────────┼────────────────────────┴────────────┘               │
│                    │                                                      │
│                    ▼                                                      │
│            ┌─────────────┐                                                │
│            │  Database   │                                                │
│            │ (Mixed data │                                                │
│            │  versions)  │                                                │
│            └─────────────┘                                                │
│                                                                           │
│  Challenge: Old and new versions coexist and must interoperate           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Deployment scenarios requiring version coexistence:**

- **Rolling upgrades (server-side)**: Deploy new version to a few nodes at a time, checking whether the new version runs smoothly, gradually working through all nodes. This allows deployments without service downtime.

- **User-controlled updates (client-side)**: You're at the mercy of users, who may not install updates for weeks or months.

> **💡 Insight**
>
> The fundamental challenge is that old and new versions of code, and old and new data formats, may all coexist in the system simultaneously. This isn't a temporary state—it's the normal operating condition of most production systems.

### 1.2. Compatibility Requirements

To maintain system functionality during version transitions, we need compatibility in both directions:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    COMPATIBILITY REQUIREMENTS                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  BACKWARD COMPATIBILITY                                                   │
│  ───────────────────────                                                  │
│  Newer code can read data written by older code                           │
│                                                                           │
│  Old Writer  ────▶  Data  ────▶  New Reader                               │
│   (v1.0)                          (v1.1)                                  │
│                                                                           │
│  Example: New app version reads old database records                      │
│  Difficulty: ⭐⭐ (Usually straightforward)                                │
│                                                                           │
│  ════════════════════════════════════════════════════════════════════     │
│                                                                           │
│  FORWARD COMPATIBILITY                                                    │
│  ──────────────────────                                                   │
│  Older code can read data written by newer code                           │
│                                                                           │
│  New Writer  ────▶  Data  ────▶  Old Reader                               │
│   (v1.1)                          (v1.0)                                  │
│                                                                           │
│  Example: Old app version reads new database records                      │
│  Difficulty: ⭐⭐⭐⭐ (Requires careful design)                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Backward compatibility** is normally not hard to achieve: as author of the newer code, you know the format of data written by older code, and so you can explicitly handle it.

**Forward compatibility** can be trickier, because it requires older code to ignore additions made by a newer version of the code.

**The data loss problem:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    FORWARD COMPATIBILITY CHALLENGE                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Step 1: New code writes record with new field                           │
│  ┌────────────────────────────────────────────────┐                      │
│  │ {                                               │                      │
│  │   "name": "Alice",                              │                      │
│  │   "email": "alice@example.com",                 │                      │
│  │   "phone": "+1-555-0100"  ← New field          │                      │
│  │ }                                               │                      │
│  └────────────────────────────────────────────────┘                      │
│                    ↓                                                      │
│              Write to DB                                                  │
│                    ↓                                                      │
│  Step 2: Old code reads and decodes record                               │
│  ┌────────────────────────────────────────────────┐                      │
│  │ class User {                                    │                      │
│  │   String name;                                  │                      │
│  │   String email;                                 │                      │
│  │   // No phone field defined!                    │                      │
│  │ }                                               │                      │
│  └────────────────────────────────────────────────┘                      │
│                    ↓                                                      │
│  Step 3: Old code updates and writes back                                │
│  ┌────────────────────────────────────────────────┐                      │
│  │ {                                               │                      │
│  │   "name": "Alice Smith",  ← Updated             │                      │
│  │   "email": "alice@example.com"                  │                      │
│  │   // phone field is LOST! ⚠️                    │                      │
│  │ }                                               │                      │
│  └────────────────────────────────────────────────┘                      │
│                                                                           │
│  Solution: Preserve unknown fields during decode                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Formats for Encoding Data

**In plain English:** Your program works with objects, lists, and dictionaries in memory. But to save data to a file or send it over the network, you need to convert it into a sequence of bytes. This conversion process is called encoding (or serialization).

**In technical terms:** Programs work with data in two representations: (1) in-memory data structures optimized for CPU access, and (2) self-contained byte sequences for storage or transmission. Encoding translates from (1) to (2); decoding reverses the process.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ENCODING PROCESS                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  IN MEMORY                              ON DISK / NETWORK                 │
│  ─────────                              ────────────────                  │
│                                                                           │
│  ┌──────────────────┐                  ┌──────────────────┐              │
│  │ Objects          │                  │ Byte Sequence    │              │
│  │ Structs          │   ──Encode──▶    │ (no pointers!)   │              │
│  │ Lists/Arrays     │                  │                  │              │
│  │ Hash Tables      │   ◀──Decode──    │ Self-contained   │              │
│  │ Trees            │                  │ representation   │              │
│  └──────────────────┘                  └──────────────────┘              │
│                                                                           │
│  Optimized for:                         Optimized for:                    │
│  • Fast CPU access                      • Network transfer               │
│  • Pointer traversal                    • Disk storage                   │
│  • Mutable                              • Immutable                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Terminology note:** Serialization is unfortunately also used in the context of transactions (Chapter 8) with a completely different meaning. We'll use "encoding" to avoid confusion.

### 2.1. Language-Specific Formats

Many programming languages have built-in serialization:
- Java: `java.io.Serializable`
- Python: `pickle`
- Ruby: `Marshal`
- Third-party: Kryo (Java)

**Problems with language-specific formats:**

| Problem | Impact |
|---------|--------|
| **Language lock-in** | Data encoded in Java cannot be read by Python. You're committed to your current language. |
| **Security vulnerabilities** | Decoding can instantiate arbitrary classes, enabling remote code execution attacks. |
| **Versioning neglected** | Forward/backward compatibility often an afterthought. |
| **Efficiency neglected** | Java serialization notorious for poor performance and bloated encoding. |

> **💡 Insight**
>
> The appeal of language-specific formats is convenience: minimal code to save and restore objects. But this convenience comes at enormous cost. Use them only for transient, in-process caching, never for storage or inter-service communication.

### 2.2. JSON, XML, and Binary Variants

When moving to standardized encodings that can be written and read by many programming languages, JSON and XML are the obvious contenders. CSV is another popular language-independent format, but only supports tabular data without nesting.

**Advantages:**
- Widely known and supported
- Human-readable text format
- Built-in browser support (JSON)

**Subtle problems:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    TEXTUAL FORMAT LIMITATIONS                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  PROBLEM 1: Number Ambiguity                                              │
│  ────────────────────────                                                 │
│  XML/CSV: Cannot distinguish number from string of digits                │
│  JSON: Cannot distinguish integers from floating-point                    │
│                                                                           │
│  Example: Twitter post IDs (64-bit integers > 2^53)                       │
│  {                                                                        │
│    "id": 1234567890123456789,        // Lost precision in JavaScript!    │
│    "id_str": "1234567890123456789"   // Workaround: include as string    │
│  }                                                                        │
│                                                                           │
│  PROBLEM 2: Binary Data                                                   │
│  ───────────────────                                                      │
│  JSON/XML: No native binary string support                                │
│  Workaround: Base64 encoding                                              │
│  Cost: 33% size increase + decoding overhead                              │
│                                                                           │
│  PROBLEM 3: Schema Complexity                                             │
│  ──────────────────────────                                               │
│  XML Schema and JSON Schema are powerful but complicated                  │
│  Learning curve steep, implementation non-trivial                         │
│                                                                           │
│  PROBLEM 4: CSV Vagueness                                                 │
│  ─────────────────────                                                    │
│  No schema → application defines meaning                                  │
│  Ambiguous escaping rules (commas in values? newlines?)                   │
│  Not all parsers implement spec correctly                                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

Despite these flaws, JSON, XML, and CSV remain popular for data interchange between organizations. The difficulty of getting different organizations to agree on anything outweighs most other concerns.

#### JSON Schema

JSON Schema has become widely adopted for modeling data exchanged between systems:

**Key features:**
- Standard primitive types: strings, numbers, integers, objects, arrays, booleans, nulls
- Validation constraints: min/max values, pattern matching, required fields
- Open vs. closed content models

**Content models:**

```json
// OPEN CONTENT MODEL (default: additionalProperties: true)
// Allows undefined fields with any type
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "age": {"type": "integer"}
  }
  // Unknown fields allowed by default
}

// CLOSED CONTENT MODEL (additionalProperties: false)
// Only defined fields permitted
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "port": {"type": "integer", "minimum": 1, "maximum": 65535}
  },
  "additionalProperties": false
}
```

**Complex example: Map with integer keys:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "patternProperties": {
    "^[0-9]+$": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
```

This defines a map where keys must be digit strings (JSON requires string keys) and values must be strings.

> **💡 Insight**
>
> JSON Schema's power comes from its flexibility, but this also makes schemas complex and evolution challenging. Features like conditional logic, remote schema references, and open content models create schemas that are difficult to reason about and evolve safely.

#### Binary Encoding

JSON is less verbose than XML, but both use considerable space compared to binary formats. This led to many binary JSON encodings: MessagePack, CBOR, BSON, BJSON, UBJSON, BISON, Hessian, Smile.

**Example record for encoding comparisons:**

```json
{
    "userName": "Martin",
    "favoriteNumber": 1337,
    "interests": ["daydreaming", "hacking"]
}
```

**MessagePack encoding:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MESSAGEPACK ENCODING                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Byte Sequence:                                                           │
│  ┌────┬────┬───────────────┬────┬─────────────┬────┬─────────────┐       │
│  │0x83│0xa8│userName...    │0xa6│Martin       │0xd0│1337         │...    │
│  └────┴────┴───────────────┴────┴─────────────┴────┴─────────────┘       │
│    │    │         │          │        │          │       │               │
│    │    │         │          │        │          │       │               │
│    │    │         └──────────┴────────┘          │       │               │
│    │    │         Field name (8 bytes)           │       │               │
│    │    │                                        │       │               │
│    │    └─ String, 8 bytes long                  │       │               │
│    │                                             │       │               │
│    └─ Object with 3 fields                       │       │               │
│                                                  │       │               │
│                                  String, 6 bytes │       │               │
│                                         ("Martin")       │               │
│                                                          │               │
│                                              Integer: 1337               │
│                                                                           │
│  Total: 66 bytes (vs 81 bytes JSON with whitespace removed)              │
│  Savings: Modest 18% reduction                                            │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key limitation:** Binary JSON variants still include field names in the encoded data. To do much better, we need schemas.

### 2.3. Protocol Buffers

Protocol Buffers (protobuf) is a binary encoding library developed at Google. It requires a schema for any data that is encoded.

**Schema definition (IDL):**

```protobuf
syntax = "proto3";

message Person {
    string user_name = 1;
    int64 favorite_number = 2;
    repeated string interests = 3;
}
```

**Code generation:**
The schema is compiled into classes for various programming languages. Your application calls generated code to encode/decode records.

**Binary encoding:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PROTOCOL BUFFERS ENCODING                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Byte Sequence:                                                           │
│  ┌────┬────────┬────┬────────┬────┬─────────────┬────┬──────────┐        │
│  │0x0a│0x06    │M a │r t i n │0x10│0xb9 0x0a    │0x1a│0x0b...   │        │
│  └────┴────────┴────┴────────┴────┴─────────────┴────┴──────────┘        │
│    │     │                      │       │          │                     │
│    │     │                      │       │          │                     │
│    │     │                      │       │          └─ Tag 3 (interests)  │
│    │     │                      │       │                                │
│    │     │                      │       └─ 1337 (variable-length)        │
│    │     │                      │                                        │
│    │     │                      └─ Tag 2 + type (int64)                  │
│    │     │                                                                │
│    │     └─ Length: 6 bytes                                               │
│    │                                                                      │
│    └─ Tag 1 + type (string)                                               │
│                                                                           │
│  Total: 33 bytes (vs 66 bytes MessagePack, 81 bytes JSON)                │
│                                                                           │
│  Key Difference: Field tags (1, 2, 3) replace field names                │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**How it achieves compactness:**

1. **Field tags instead of names**: Numbers 1, 2, 3 instead of strings "userName", "favoriteNumber", "interests"
2. **Variable-length integers**: Number 1337 uses 2 bytes, not 8
3. **Packed encoding**: Field type and tag combined into single byte
4. **Omitted defaults**: Unset fields not included

> **💡 Insight**
>
> Protocol Buffers achieves 60% size reduction over JSON by using field tags (numbers) instead of field names (strings). The schema acts as metadata that both sender and receiver must agree on—it's not included in the encoded data.

#### Field Tags and Schema Evolution

**The fundamental rule:** You can change field names, but you cannot change field tags.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SCHEMA EVOLUTION RULES                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ADDING NEW FIELDS                                                        │
│  ──────────────────                                                       │
│  ✅ ALLOWED: Assign new tag number                                        │
│                                                                           │
│  Old Writer          New Reader                                           │
│  (no field 4)   →    (expects field 4)                                    │
│                      ↓                                                    │
│                      Uses default value                                   │
│                                                                           │
│  New Writer          Old Reader                                           │
│  (includes field 4) → (doesn't know field 4)                              │
│                       ↓                                                   │
│                       Skips unknown tag, preserves bytes                  │
│                                                                           │
│  REMOVING FIELDS                                                          │
│  ────────────────                                                         │
│  ✅ ALLOWED: Tag number must never be reused                              │
│  Reserve deleted tag numbers in schema                                    │
│                                                                           │
│  CHANGING FIELD NAMES                                                     │
│  ─────────────────────                                                    │
│  ✅ ALLOWED: Encoded data never includes names                            │
│                                                                           │
│  CHANGING FIELD TAGS                                                      │
│  ────────────────────                                                     │
│  ❌ FORBIDDEN: Makes all existing data invalid                            │
│                                                                           │
│  CHANGING FIELD TYPES                                                     │
│  ─────────────────────                                                    │
│  ⚠️ RISKY: Some conversions possible, may truncate data                   │
│  Example: int32 → int64 works forward, may truncate backward             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**How unknown fields are preserved:**

1. Parser encounters tag number it doesn't recognize
2. Type annotation indicates how many bytes to skip
3. Bytes are preserved in memory (not discarded)
4. When record is re-encoded, unknown fields are included

This prevents the data loss problem shown earlier!

### 2.4. Avro

Apache Avro is another binary encoding format, started in 2009 as a Hadoop subproject. It takes a different approach from Protocol Buffers.

**Schema definition (Avro IDL):**

```
record Person {
    string               userName;
    union { null, long } favoriteNumber = null;
    array<string>        interests;
}
```

**Equivalent JSON schema representation:**

```json
{
    "type": "record",
    "name": "Person",
    "fields": [
        {"name": "userName",       "type": "string"},
        {"name": "favoriteNumber", "type": ["null", "long"], "default": null},
        {"name": "interests",      "type": {"type": "array", "items": "string"}}
    ]
}
```

**Binary encoding:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AVRO ENCODING                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Byte Sequence:                                                           │
│  ┌────┬───────────┬────┬────────┬────┬──────────────────────┐            │
│  │0x06│M a r t i n│0x02│0xb9 0x14│0x02│0x0c d a y d r e a...│            │
│  └────┴───────────┴────┴────────┴────┴──────────────────────┘            │
│    │       │        │      │       │            │                        │
│    │       │        │      │       │            │                        │
│    │       │        │      │       │            └─ Array items           │
│    │       │        │      │       │                                     │
│    │       │        │      │       └─ Array length: 2                    │
│    │       │        │      │                                             │
│    │       │        │      └─ 1337 (variable-length)                     │
│    │       │        │                                                    │
│    │       │        └─ Union index: 1 (long, not null)                  │
│    │       │                                                             │
│    │       └─ UTF-8 bytes "Martin"                                       │
│    │                                                                     │
│    └─ Length: 6 bytes                                                    │
│                                                                           │
│  Total: 32 bytes (vs 33 bytes Protocol Buffers)                          │
│                                                                           │
│  Key Difference: NO field tags or names in encoding!                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Critical difference:** Nothing identifies fields or types. The encoding is just values concatenated together.

**How can this work?** The parser uses the schema to decode:

1. Read first value using schema's first field type (string)
2. Read second value using schema's second field type (union)
3. Read third value using schema's third field type (array)

The binary data can only be decoded correctly if the reader is using the **exact same schema** as the writer.

> **💡 Insight**
>
> Avro's approach seems crazy at first: how can you decode data without knowing what the fields are? The answer: you need the exact schema used by the writer. This requirement leads to interesting solutions for schema distribution and evolution.

#### The Writer's Schema and the Reader's Schema

Avro uses **two schemas** for decoding:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AVRO SCHEMA RESOLUTION                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ENCODING (Writing)                                                       │
│  ───────────────────                                                      │
│  ┌────────────────┐         ┌────────────────┐                           │
│  │ Application    │  uses   │ Writer's       │                           │
│  │ encodes data   │────────▶│ Schema         │                           │
│  └────────────────┘         └────────────────┘                           │
│         │                                                                 │
│         ▼                                                                 │
│  ┌────────────────────────────────┐                                      │
│  │ Binary data (no field names)   │                                      │
│  └────────────────────────────────┘                                      │
│                                                                           │
│  DECODING (Reading)                                                       │
│  ───────────────────                                                      │
│  ┌────────────────────────────────┐                                      │
│  │ Binary data (no field names)   │                                      │
│  └────────────────┬────────────────┘                                      │
│                   │                                                       │
│                   ▼                                                       │
│  ┌────────────────┐         ┌────────────────┐                           │
│  │ Application    │  uses   │ Writer's Schema│  Schema                   │
│  │ decodes data   │────────▶│      +         │  Resolution               │
│  └────────────────┘         │ Reader's Schema│                           │
│                             └────────────────┘                           │
│                                                                           │
│  Schema Resolution:                                                       │
│  • Match fields by name (order irrelevant)                                │
│  • Field in writer but not reader → ignored                               │
│  • Field in reader but not writer → filled with default                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Schema resolution process:**

1. Avro library compares writer's schema with reader's schema
2. Translates data from writer's schema into reader's schema
3. Handles differences according to evolution rules

**Example:**

```
Writer's Schema (v1):           Reader's Schema (v2):
{                               {
  "userName": string,             "userName": string,
  "favoriteNumber": long          "favoriteNumber": long,
}                                 "email": string  ← New field
                                }
```

When reader decodes v1 data with v2 schema:
- `userName` and `favoriteNumber` decoded normally
- `email` filled with default value (empty string or null)

#### Schema Evolution Rules

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    AVRO EVOLUTION RULES                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  FORWARD COMPATIBILITY (New writer → Old reader)                          │
│  ────────────────────────────────────────────────                         │
│  ✅ Adding field: MUST have default value                                 │
│  ✅ Removing field: No restrictions                                       │
│                                                                           │
│  BACKWARD COMPATIBILITY (Old writer → New reader)                         │
│  ─────────────────────────────────────────────────                        │
│  ✅ Adding field: No restrictions                                         │
│  ✅ Removing field: MUST have had default value                           │
│                                                                           │
│  FIELD ORDERING                                                           │
│  ──────────────                                                           │
│  ✅ Can reorder fields freely (matched by name, not position)             │
│                                                                           │
│  FIELD NAMES                                                              │
│  ────────────                                                             │
│  ⚠️ Renaming: Backward compatible via aliases, not forward compatible     │
│                                                                           │
│  FIELD TYPES                                                              │
│  ────────────                                                             │
│  ⚠️ Changing types: Avro can convert some types                           │
│                                                                           │
│  NULL VALUES                                                              │
│  ────────────                                                             │
│  ⚠️ Use union types: `union { null, long } field = null;`                 │
│     Null is not default for all types (prevents bugs)                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Union type example:**

```
// Allows null, long, or string values
union { null, long, string } field;

// To use null as default, it must be first branch
union { null, long } field = null;  // ✅ Valid
union { long, null } field = null;  // ❌ Invalid
```

#### But What Is the Writer's Schema?

The critical question: how does the reader obtain the writer's schema?

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SCHEMA DISTRIBUTION STRATEGIES                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  STRATEGY 1: Large File with Many Records                                │
│  ──────────────────────────────────────                                  │
│  ┌────────────────────────────────────────┐                              │
│  │ Avro Object Container File             │                              │
│  ├────────────────────────────────────────┤                              │
│  │ Header: Writer's Schema (once)         │                              │
│  ├────────────────────────────────────────┤                              │
│  │ Record 1 (binary)                      │                              │
│  │ Record 2 (binary)                      │                              │
│  │ Record 3 (binary)                      │                              │
│  │ ... millions more ...                  │                              │
│  └────────────────────────────────────────┘                              │
│                                                                           │
│  Use case: Hadoop data files, batch processing                            │
│                                                                           │
│  STRATEGY 2: Database with Individually Written Records                   │
│  ────────────────────────────────────────────────────                     │
│  ┌──────────────────────────────────────────────────────┐                │
│  │ Database Record Structure:                            │                │
│  │ ┌──────────────┬─────────────────────────────────┐   │                │
│  │ │ Schema       │ Record Data                     │   │                │
│  │ │ Version: 42  │ (binary, encoded with schema 42)│   │                │
│  │ └──────────────┴─────────────────────────────────┘   │                │
│  └──────────────────────────────────────────────────────┘                │
│                                                                           │
│  Schema Registry:                                                         │
│  ┌──────────────────────────────────────┐                                │
│  │ Version 42 → Schema definition       │                                │
│  │ Version 43 → Schema definition       │                                │
│  │ ...                                  │                                │
│  └──────────────────────────────────────┘                                │
│                                                                           │
│  Use case: Kafka (Confluent Schema Registry), Espresso                    │
│                                                                           │
│  STRATEGY 3: Network Connection                                           │
│  ────────────────────────                                                 │
│  Client ◀───Negotiate Schema───▶ Server                                   │
│           (on connection setup)                                           │
│                                                                           │
│  Use case: Avro RPC protocol                                              │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Schema versioning approaches:**

- **Incrementing integer**: Simple, e.g., v1, v2, v3, ...
- **Hash of schema**: Content-addressed, deterministic

#### Dynamically Generated Schemas

Avro's lack of field tags makes it ideal for dynamically generated schemas:

**Use case: Database dump to Avro**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DYNAMIC SCHEMA GENERATION                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Relational Database Schema:                                              │
│  ┌─────────────────────────────────────────────────────────┐             │
│  │ CREATE TABLE users (                                    │             │
│  │   id BIGINT PRIMARY KEY,                                │             │
│  │   name VARCHAR(255),                                    │             │
│  │   email VARCHAR(255),                                   │             │
│  │   created_at TIMESTAMP                                  │             │
│  │ );                                                      │             │
│  └─────────────────────────────────────────────────────────┘             │
│                     ↓                                                     │
│               Auto-generate                                               │
│                     ↓                                                     │
│  Avro Schema (JSON):                                                      │
│  ┌─────────────────────────────────────────────────────────┐             │
│  │ {                                                       │             │
│  │   "type": "record",                                     │             │
│  │   "name": "users",                                      │             │
│  │   "fields": [                                           │             │
│  │     {"name": "id", "type": "long"},                     │             │
│  │     {"name": "name", "type": "string"},                 │             │
│  │     {"name": "email", "type": "string"},                │             │
│  │     {"name": "created_at", "type": "long"}              │             │
│  │   ]                                                     │             │
│  │ }                                                       │             │
│  └─────────────────────────────────────────────────────────┘             │
│                                                                           │
│  Database Schema Changes:                                                 │
│  ALTER TABLE users ADD COLUMN phone VARCHAR(20);                          │
│                     ↓                                                     │
│  Avro Schema Regenerated Automatically:                                   │
│  (New field "phone" added)                                                │
│                                                                           │
│  No manual tag assignment needed!                                         │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Comparison with Protocol Buffers:**

| Aspect | Protocol Buffers | Avro |
|--------|------------------|------|
| **Field tags** | Manual assignment required | Not needed |
| **Dynamic schemas** | Administrator assigns tags | Automatic generation |
| **Database schema changes** | Manual mapping updates | Regenerate and export |
| **Design goal** | Static, carefully designed schemas | Dynamic, generated schemas |

> **💡 Insight**
>
> Avro's genius is eliminating field tags. This makes it perfect for scenarios where schemas are generated programmatically from other sources, like database schemas. Protocol Buffers requires careful manual management of tag numbers, which doesn't scale when schemas change frequently.

### 2.5. The Merits of Schemas

Binary encodings based on schemas (Protocol Buffers, Avro) have significant advantages over JSON/XML:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    BENEFITS OF SCHEMA-BASED ENCODINGS                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. COMPACTNESS                                                           │
│  ──────────────                                                           │
│  Omit field names from encoded data                                       │
│  Example: 32 bytes (Avro) vs 81 bytes (JSON)                              │
│  Savings: 60% smaller                                                     │
│                                                                           │
│  2. DOCUMENTATION                                                         │
│  ─────────────────                                                        │
│  Schema is required for decoding                                          │
│  → Guaranteed to be up-to-date (unlike manual docs)                       │
│  → Single source of truth                                                 │
│                                                                           │
│  3. COMPATIBILITY CHECKING                                                │
│  ──────────────────────────                                               │
│  Database of schemas enables automated checks:                            │
│  • Is new schema backward compatible?                                     │
│  • Is new schema forward compatible?                                      │
│  • Prevent deployment of breaking changes                                 │
│                                                                           │
│  4. CODE GENERATION                                                       │
│  ──────────────────                                                       │
│  Generate classes from schema (statically typed languages)                │
│  → Compile-time type checking                                             │
│  → IDE autocomplete                                                       │
│  → Catches errors before runtime                                          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Historical context:** These ideas aren't new. ASN.1 (Abstract Syntax Notation One) was standardized in 1984 and uses similar concepts:
- Schema definition language
- Binary encoding (DER)
- Tag numbers for fields
- Used in SSL certificates (X.509)

However, ASN.1 is complex and poorly documented, so not recommended for new applications.

**Summary:** Schema evolution provides the flexibility of schemaless JSON databases while offering better guarantees and tooling.

---

## 3. Modes of Dataflow

**In plain English:** We've learned how to encode data into bytes. Now let's explore the different ways these bytes flow between processes: through databases, over network APIs, via workflow engines, and through message brokers.

**In technical terms:** Compatibility is a relationship between the process that encodes data and the process that decodes it. Understanding dataflow patterns helps us reason about which compatibility guarantees we need.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DATAFLOW PATTERNS                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. VIA DATABASES                                                         │
│     Process A ──write──▶ Database ──read──▶ Process B                     │
│     (encoder)                               (decoder)                    │
│                                                                           │
│  2. VIA SERVICE CALLS (RPC/REST)                                          │
│     Client ──request──▶ Server ──response──▶ Client                       │
│     (encoder)         (decoder/encoder)      (decoder)                   │
│                                                                           │
│  3. VIA WORKFLOWS                                                         │
│     Task A ──output──▶ Orchestrator ──input──▶ Task B                     │
│                                                                           │
│  4. VIA ASYNCHRONOUS MESSAGES                                             │
│     Producer ──message──▶ Broker ──message──▶ Consumer                    │
│              (encoder)                        (decoder)                  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Dataflow Through Databases

**In plain English:** Writing to a database is like sending a message to your future self. You encode it now, and later (maybe seconds, maybe years later) you'll read and decode it. The reader might be a newer version of your code, so compatibility matters.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DATABASE DATAFLOW                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  SCENARIO: Rolling Upgrade                                                │
│                                                                           │
│  Time: 10:00 AM                                                           │
│  ┌──────────┐         ┌──────────┐                                       │
│  │ App v1.0 │────────▶│ Database │                                       │
│  │ (writes) │         │          │                                       │
│  └──────────┘         └──────────┘                                       │
│                                                                           │
│  Time: 10:15 AM (during deployment)                                       │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐                 │
│  │ App v1.0 │────┬───▶│ Database │◀───┬────│ App v1.1 │                 │
│  │ (writes) │    │    │          │    │    │ (writes) │                 │
│  └──────────┘    │    └──────────┘    │    └──────────┘                 │
│                  │         ▲          │                                  │
│                  └─────────┼──────────┘                                  │
│                       Both versions                                       │
│                       read/write same DB                                  │
│                                                                           │
│  Requirements:                                                            │
│  • v1.1 must read data written by v1.0 (backward compatibility)           │
│  • v1.0 must read data written by v1.1 (forward compatibility)            │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key insight: Data outlives code**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DATA OUTLIVES CODE                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Application Deployment:                                                  │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ Code v1.0  →  Code v1.1  →  Code v1.2  →  Code v2.0           │      │
│  │ (5 minutes)   (5 minutes)   (5 minutes)   (5 minutes)         │      │
│  └────────────────────────────────────────────────────────────────┘      │
│  Total: ~20 minutes to replace all running code                           │
│                                                                           │
│  Database Data:                                                           │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ Data written 5 years ago    ← Still there!                     │      │
│  │ Data written 5 months ago   ← Still there!                     │      │
│  │ Data written 5 days ago     ← Still there!                     │      │
│  │ Data written 5 minutes ago  ← Still there!                     │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                                                                           │
│  Consequence: Single database contains records encoded with many          │
│               different schema versions spanning years                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Different Values Written at Different Times

**Schema migration strategies:**

| Approach | Cost | Use Case |
|----------|------|----------|
| **Lazy migration** | Low | Adding nullable columns |
| **Eager migration** | High | Restructuring data |
| **No migration** | None | Schema-on-read (e.g., JSON columns) |

**Lazy migration example:**

```sql
-- Add new column
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL;

-- Old rows: phone is NULL (not stored on disk)
-- New rows: phone may contain value
-- Application handles both cases
```

When reading an old row, the database fills in NULL for the missing column. No rewrite needed!

**Complex migrations still require rewrites:**
- Changing single-valued to multi-valued
- Moving data to separate table
- Changing data types incompatibly

> **💡 Insight**
>
> The database appears to have a single schema, but underneath it's a mix of many schema versions. Each row was written with a different version's schema. Lazy migration with default values makes this illusion work efficiently.

#### Archival Storage

When taking database snapshots for backups or data warehousing:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ARCHIVAL STORAGE                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Source Database (mixed schema versions):                                 │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ User 1: {id, name, email}           ← Schema v1 (2020)         │      │
│  │ User 2: {id, name, email, phone}    ← Schema v2 (2023)         │      │
│  │ User 3: {id, name, email, phone}    ← Schema v2 (2024)         │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                           ↓                                               │
│                    Daily ETL Export                                       │
│                           ↓                                               │
│  Avro/Parquet File (uniform schema):                                      │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │ User 1: {id, name, email, phone: null}  ← Normalized           │      │
│  │ User 2: {id, name, email, phone}        ← Latest schema        │      │
│  │ User 3: {id, name, email, phone}                               │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                                                                           │
│  Benefits:                                                                │
│  • Consistent encoding across all records                                 │
│  • Columnar format (Parquet) for analytics                                │
│  • Immutable snapshot                                                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Recommended formats for archival:**
- **Avro Object Container Files**: Row-oriented, splittable
- **Parquet**: Column-oriented, excellent compression, query performance

### 3.2. Dataflow Through Services: REST and RPC

**In plain English:** Services are like restaurants. Clients (customers) make requests over the network, servers (kitchen) process them and send back responses. The menu (API) defines what you can order and what you'll get back.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SERVICE-ORIENTED ARCHITECTURE                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  CLIENT-SERVER MODEL                                                      │
│  ────────────────────                                                     │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐    │
│  │   Browser   │───HTTP───▶│  Web Server │           │   Mobile    │    │
│  │  (client)   │◀───HTML───│  (service)  │───────────│     App     │    │
│  └─────────────┘           └─────────────┘           └─────────────┘    │
│                                   │                                      │
│                                   │ API calls                             │
│                                   │                                      │
│                    ┌──────────────┼──────────────┐                       │
│                    │              │              │                       │
│                    ▼              ▼              ▼                       │
│            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│            │   User      │ │   Payment   │ │   Billing   │              │
│            │  Service    │ │   Service   │ │   Service   │              │
│            └─────────────┘ └─────────────┘ └─────────────┘              │
│                                                                           │
│  MICROSERVICES ARCHITECTURE                                               │
│  Each service independently deployable                                    │
│  → Need compatibility across service versions                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key difference from databases:**

| Aspect | Database | Service |
|--------|----------|---------|
| **Queries** | Arbitrary (SQL) | Predetermined API |
| **Encapsulation** | Minimal | Strong (business logic) |
| **Deployment** | Coupled to applications | Independent |
| **Compatibility** | Both directions | Assume servers first, clients second |

#### Web Services

Three common scenarios for web services:

1. **Public APIs**: Mobile app → Backend service (over internet)
2. **Microservices**: Service A → Service B (same datacenter)
3. **Inter-organization**: Your system → Partner's system (e.g., payment gateway)

**REST (Representational State Transfer):**
- Build on HTTP features: URLs, cache control, authentication, content types
- Simple data formats (typically JSON)
- Uses HTTP methods: GET, POST, PUT, DELETE

**Interface Definition Languages (IDLs):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SERVICE DEFINITION EXAMPLE (OpenAPI)                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  openapi: 3.0.0                                                           │
│  info:                                                                    │
│    title: Ping, Pong                                                      │
│    version: 1.0.0                                                         │
│  servers:                                                                 │
│    - url: http://localhost:8080                                           │
│  paths:                                                                   │
│    /ping:                                                                 │
│      get:                                                                 │
│        summary: Given a ping, returns a pong message                      │
│        responses:                                                         │
│          '200':                                                           │
│            description: A pong                                            │
│            content:                                                       │
│              application/json:                                            │
│                schema:                                                    │
│                  type: object                                             │
│                  properties:                                              │
│                    message:                                               │
│                      type: string                                         │
│                      example: Pong!                                       │
│                                                                           │
│  Benefits:                                                                │
│  • Documentation (auto-generated)                                         │
│  • Client SDK generation                                                  │
│  • Compatibility checking                                                 │
│  • Testing UI (Swagger UI)                                                │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Implementation example (FastAPI):**

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Ping, Pong", version="1.0.0")

class PongResponse(BaseModel):
    message: str = "Pong!"

@app.get("/ping", response_model=PongResponse,
         summary="Given a ping, returns a pong message")
async def ping():
    return PongResponse()
```

The framework generates OpenAPI spec automatically from code!

#### The Problems with Remote Procedure Calls (RPCs)

**In plain English:** RPC tries to make a network call look like a local function call. It's like pretending talking to someone via satellite phone (with delays and static) is the same as talking to someone sitting next to you. The abstraction leaks.

**Historical RPC systems (all problematic):**
- Enterprise JavaBeans (EJB) — Java-only
- Java RMI — Java-only
- DCOM — Microsoft-only
- CORBA — Extremely complex
- SOAP — Complex, compatibility issues

**Fundamental differences between local calls and network requests:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    LOCAL CALL vs NETWORK REQUEST                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  LOCAL FUNCTION CALL              NETWORK REQUEST                         │
│  ────────────────────              ───────────────                        │
│                                                                           │
│  Predictability:                   Unpredictability:                      │
│  • Success or exception            • Success, exception, OR timeout       │
│  • Depends on your code            • Depends on network/remote machine    │
│                                                                           │
│  Failure modes:                    Failure modes:                         │
│  • Returns result                  • Returns result                       │
│  • Throws exception                • Throws exception                     │
│  • Infinite loop/crash             • Timeout (unknown outcome!)           │
│                                    • Retry → duplicate execution          │
│                                                                           │
│  Performance:                      Performance:                           │
│  • Nanoseconds                     • Milliseconds to seconds              │
│  • Consistent                      • Highly variable                      │
│  • Predictable                     • Dependent on network congestion      │
│                                                                           │
│  Data passing:                     Data passing:                          │
│  • Pointers (efficient)            • Encode to bytes (overhead)           │
│  • References work                 • Everything copied                    │
│  • Same memory space               • Network transfer                     │
│                                                                           │
│  Type system:                      Type system:                           │
│  • Same language                   • Cross-language translation needed    │
│  • Type safety guaranteed          • Type mismatches possible             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> RPC's fundamental flaw is "location transparency"—pretending remote calls are local. This abstraction is leaky and dangerous. Network calls have different failure modes, performance characteristics, and semantics. REST is better because it explicitly treats network communication as distinct from function calls.

#### Load Balancers, Service Discovery, and Service Meshes

**In plain English:** When you have multiple servers running the same service, you need a way for clients to find them and spread requests evenly. Think of it like a host at a restaurant directing customers to different available tables.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SERVICE DISCOVERY OPTIONS                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. HARDWARE LOAD BALANCER                                                │
│  ──────────────────────────                                               │
│     Clients                                                               │
│        │                                                                  │
│        ▼                                                                  │
│  ┌──────────────┐                                                         │
│  │  Hardware LB │                                                         │
│  │  (F5, etc.)  │                                                         │
│  └───────┬──────┘                                                         │
│          │                                                                │
│    ┌─────┼─────┐                                                          │
│    ▼     ▼     ▼                                                          │
│  [Srv] [Srv] [Srv]                                                        │
│                                                                           │
│  2. SOFTWARE LOAD BALANCER                                                │
│  ──────────────────────────                                               │
│     Clients                                                               │
│        │                                                                  │
│        ▼                                                                  │
│  ┌──────────────┐                                                         │
│  │ Nginx/HAProxy│                                                         │
│  └───────┬──────┘                                                         │
│          │                                                                │
│    ┌─────┼─────┐                                                          │
│    ▼     ▼     ▼                                                          │
│  [Srv] [Srv] [Srv]                                                        │
│                                                                           │
│  3. DNS-BASED                                                             │
│  ─────────────                                                            │
│  Client queries "api.example.com"                                         │
│  DNS returns: [10.0.1.5, 10.0.1.6, 10.0.1.7]                              │
│  Client picks one                                                         │
│  Problem: DNS caching delays updates                                      │
│                                                                           │
│  4. SERVICE DISCOVERY SYSTEM                                              │
│  ────────────────────────────                                             │
│  ┌──────────────┐                                                         │
│  │  Registry    │◀─── Services register themselves                        │
│  │ (Consul/etcd)│◀─── Heartbeats signal health                            │
│  └───────┬──────┘                                                         │
│          │                                                                │
│          ▼                                                                │
│  Client queries registry                                                  │
│  Gets current endpoint list                                               │
│  Connects directly                                                        │
│                                                                           │
│  5. SERVICE MESH                                                          │
│  ────────────────                                                         │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐                     │
│  │ Client  │         │ Server  │         │ Server  │                     │
│  │   App   │         │   App   │         │   App   │                     │
│  └────┬────┘         └────┬────┘         └────┬────┘                     │
│       │                   │                   │                           │
│  ┌────▼────┐         ┌────▼────┐         ┌────▼────┐                     │
│  │Sidecar  │────────▶│Sidecar  │────────▶│Sidecar  │                     │
│  │ Proxy   │         │ Proxy   │         │ Proxy   │                     │
│  └─────────┘         └─────────┘         └─────────┘                     │
│      │                                         │                          │
│      └───────────── Mesh Control Plane ───────┘                           │
│         (Istio, Linkerd, etc.)                                            │
│                                                                           │
│  Benefits: TLS, observability, traffic control                            │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Data Encoding and Evolution for RPC

**Simplifying assumption for services:** Servers are updated before clients.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    RPC COMPATIBILITY REQUIREMENTS                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Deployment Order: Servers first, then clients                            │
│                                                                           │
│  Time: 10:00 AM                                                           │
│  ┌──────────┐         ┌──────────┐                                       │
│  │Client v1 │────────▶│Server v1 │                                       │
│  └──────────┘         └──────────┘                                       │
│                                                                           │
│  Time: 10:15 AM (server upgraded)                                         │
│  ┌──────────┐         ┌──────────┐                                       │
│  │Client v1 │────────▶│Server v2 │  ← Need BACKWARD compatibility        │
│  └──────────┘         └────┬─────┘     (new server, old request)         │
│                           │                                              │
│  Time: 10:30 AM (client upgraded)                                         │
│  ┌──────────┐            │                                               │
│  │Client v2 │────────────┘                                               │
│  └──────────┘         Need FORWARD compatibility                          │
│                       (old server cache, new response)                    │
│                                                                           │
│  Compatibility by encoding:                                               │
│  • gRPC (Protocol Buffers): Follow protobuf evolution rules               │
│  • Avro RPC: Follow Avro evolution rules                                  │
│  • RESTful JSON: Optional params + new response fields                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**API versioning challenges:**

When breaking changes are necessary, service providers maintain multiple API versions:

| Versioning Approach | Example | Pros | Cons |
|---------------------|---------|------|------|
| **URL path** | `/v1/users`, `/v2/users` | Simple, explicit | Duplicate code |
| **HTTP header** | `Accept: application/vnd.api+json; version=2` | Clean URLs | Less visible |
| **API key mapping** | Server stores version per client | Flexible | Complex |

**Forward compatibility is harder:** Service provider has no control over clients (especially public APIs). Compatibility must be maintained indefinitely.

### 3.3. Durable Execution and Workflows

**In plain English:** A workflow is like a recipe with multiple steps. Some steps might fail (oven breaks, ingredient missing), so you need a way to resume where you left off without starting over. Durable execution provides exactly-once guarantees for multi-step processes.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW EXAMPLE: PAYMENT PROCESSING                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                        ┌─────────────┐                                    │
│                        │   Start     │                                    │
│                        └──────┬──────┘                                    │
│                               │                                           │
│                               ▼                                           │
│                        ┌─────────────┐                                    │
│                        │Check Fraud  │                                    │
│                        └──────┬──────┘                                    │
│                               │                                           │
│                    ┌──────────┴──────────┐                                │
│                    ▼                     ▼                                │
│            ┌─────────────┐      ┌────────────┐                            │
│            │   Fraud!    │      │  Legit     │                            │
│            │   Reject    │      │  Continue  │                            │
│            └─────────────┘      └──────┬─────┘                            │
│                                        │                                  │
│                                        ▼                                  │
│                                ┌─────────────┐                            │
│                                │Debit Credit │                            │
│                                │    Card     │                            │
│                                └──────┬──────┘                            │
│                                       │                                   │
│                                       ▼                                   │
│                                ┌─────────────┐                            │
│                                │Deposit to   │                            │
│                                │Bank Account │                            │
│                                └──────┬──────┘                            │
│                                       │                                   │
│                                       ▼                                   │
│                                ┌─────────────┐                            │
│                                │  Complete   │                            │
│                                └─────────────┘                            │
│                                                                           │
│  Challenge: What if machine crashes after debit but before deposit?       │
│  Solution: Durable execution logs each step, replays on failure           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Workflow components:**

| Component | Responsibility |
|-----------|---------------|
| **Orchestrator** | Schedules tasks, handles failures |
| **Executor** | Runs individual tasks |
| **Workflow engine** | Manages both orchestrator and executors |

**Types of workflow engines:**

- **ETL-focused**: Airflow, Dagster, Prefect (data pipelines)
- **Business processes**: Camunda, Orkes (BPMN graphical notation)
- **Durable execution**: Temporal, Restate (exactly-once semantics)

#### Durable Execution

**How it works:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DURABLE EXECUTION MECHANISM                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  NORMAL EXECUTION                                                         │
│  ────────────────                                                         │
│  Step 1: Check fraud    ────▶ Log: fraud check = OK                      │
│  Step 2: Debit card     ────▶ Log: debit = $100 charged                  │
│  Step 3: Deposit bank   ────▶ Log: deposit = $100 deposited              │
│                                                                           │
│  EXECUTION WITH FAILURE                                                   │
│  ───────────────────────                                                  │
│  Step 1: Check fraud    ────▶ Log: fraud check = OK                      │
│  Step 2: Debit card     ────▶ Log: debit = $100 charged                  │
│  Step 3: Deposit bank   ────▶ ⚠️ CRASH!                                   │
│                                                                           │
│  REPLAY AFTER FAILURE                                                     │
│  ─────────────────────                                                    │
│  Step 1: Check fraud    ────▶ Skip, return logged result (OK)            │
│  Step 2: Debit card     ────▶ Skip, return logged result ($100 charged)  │
│  Step 3: Deposit bank   ────▶ Execute (no log entry yet)                 │
│                          ────▶ Log: deposit = $100 deposited              │
│                                                                           │
│  Result: Exactly-once execution, even with failures!                      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Temporal workflow example:**

```python
@workflow.defn
class PaymentWorkflow:
    @workflow.run
    async def run(self, payment: PaymentRequest) -> PaymentResult:
        is_fraud = await workflow.execute_activity(
            check_fraud,
            payment,
            start_to_close_timeout=timedelta(seconds=15),
        )
        if is_fraud:
            return PaymentResultFraudulent
        credit_card_response = await workflow.execute_activity(
            debit_credit_card,
            payment,
            start_to_close_timeout=timedelta(seconds=15),
        )
        # ... more activities
```

**Challenges with durable execution:**

| Challenge | Mitigation |
|-----------|-----------|
| **Idempotency** | External services must provide unique IDs |
| **Ordering** | Replay expects same RPC order; code changes brittle |
| **Determinism** | Must avoid random numbers, system clocks; use framework's deterministic APIs |
| **Code changes** | Deploy new version separately, don't modify existing workflows |

> **💡 Insight**
>
> Durable execution achieves exactly-once semantics by logging every external interaction to a write-ahead log. On replay, the framework "pretends" to make calls but returns logged results. This is conceptually similar to database transactions, but operates across distributed services.

### 3.4. Event-Driven Architectures

**In plain English:** Instead of calling someone directly (RPC), you leave a message (event) on their desk (message broker). They'll process it when they're ready. You don't wait around—you continue with your work. This asynchronous pattern improves reliability and decouples systems.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MESSAGE BROKER PATTERN                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  SYNCHRONOUS RPC (for comparison):                                        │
│  ─────────────────────────────────                                        │
│  Client ─────request─────▶ Server                                         │
│         ◀────response─────                                                │
│         (blocks waiting)                                                  │
│                                                                           │
│  ASYNCHRONOUS MESSAGING:                                                  │
│  ────────────────────────                                                 │
│  Producer ───message───▶ Broker ───message───▶ Consumer                   │
│  (doesn't wait)          (stores)              (processes when ready)    │
│                                                                           │
│  ADVANTAGES:                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ 1. Reliability: Broker buffers if consumer offline               │    │
│  │ 2. Retries: Broker redelivers to crashed consumers               │    │
│  │ 3. No service discovery: Producer doesn't need consumer IP       │    │
│  │ 4. Fan-out: One message → multiple consumers                     │    │
│  │ 5. Decoupling: Producer and consumer don't know each other       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Message Brokers

**Popular message brokers:**

| Type | Examples | Key Features |
|------|----------|--------------|
| **Open source** | RabbitMQ, ActiveMQ, Kafka | Self-hosted, full control |
| **Cloud** | Amazon Kinesis, Azure Service Bus, Google Pub/Sub | Managed, scalable |

**Message distribution patterns:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MESSAGE DISTRIBUTION PATTERNS                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  PATTERN 1: QUEUE (Load Balancing)                                        │
│  ──────────────────────────────────                                       │
│  Producer ───▶ [Queue: orders] ───┬───▶ Consumer 1                        │
│                                   ├───▶ Consumer 2                        │
│                                   └───▶ Consumer 3                        │
│                                                                           │
│  Each message delivered to ONE consumer                                   │
│  Use case: Distribute work across workers                                 │
│                                                                           │
│  PATTERN 2: TOPIC (Pub/Sub)                                               │
│  ────────────────────────                                                 │
│  Producer ───▶ [Topic: user-updates] ───┬───▶ Email Service              │
│                                          ├───▶ Analytics Service          │
│                                          └───▶ Audit Log Service          │
│                                                                           │
│  Each message delivered to ALL subscribers                                │
│  Use case: Broadcast events to multiple interested services               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Message encoding:** Brokers are typically format-agnostic (just bytes). Common choices:
- Protocol Buffers
- Avro
- JSON

**Schema registries:** Used alongside brokers to store valid schemas and check compatibility (e.g., Confluent Schema Registry, Apicurio). AsyncAPI is the messaging equivalent of OpenAPI.

**Durability variations:**

| Broker Type | Durability | Use Case |
|-------------|------------|----------|
| **In-memory** | Lost on crash | Low-latency, transient events |
| **Disk-backed** | Persisted | Reliable delivery |
| **Indefinite storage** | Never deleted | Event sourcing, replay |

> **💡 Insight**
>
> Message brokers introduce eventual consistency: the producer sends a message and continues immediately, but the consumer processes it later. This trades immediate consistency for better availability and fault tolerance—a key pattern in distributed systems.

#### Distributed Actor Frameworks

**The actor model:** Instead of threads and locks, encapsulate state in actors that communicate via asynchronous messages.

**Single-process actors:**
- Each actor has local state (not shared)
- Processes one message at a time (no locking needed)
- Sends/receives messages asynchronously

**Distributed actors:** Same model, but actors can be on different nodes:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED ACTOR FRAMEWORK                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Node 1                           Node 2                                  │
│  ┌─────────────────┐              ┌─────────────────┐                    │
│  │  Actor A        │              │  Actor D        │                    │
│  │  (User session) │              │  (User session) │                    │
│  └────────┬────────┘              └────────┬────────┘                    │
│           │                                │                             │
│  ┌────────▼────────┐              ┌────────▼────────┐                    │
│  │  Actor B        │──message────▶│  Actor E        │                    │
│  │  (Cart)         │              │  (Inventory)    │                    │
│  └────────┬────────┘              └─────────────────┘                    │
│           │                                                               │
│  ┌────────▼────────┐                                                      │
│  │  Actor C        │                                                      │
│  │  (Payment)      │                                                      │
│  └─────────────────┘                                                      │
│                                                                           │
│  Messages transparently encoded/decoded when crossing nodes               │
│  Framework handles actor location, message delivery                       │
│                                                                           │
│  Frameworks: Akka, Orleans, Erlang/OTP                                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Why location transparency works better for actors:**

| Aspect | RPC | Actor Model |
|--------|-----|-------------|
| **Failure assumptions** | Optimistic (expects success) | Pessimistic (expects failures) |
| **Message delivery** | Synchronous (blocks) | Asynchronous (doesn't block) |
| **Latency mismatch** | Large (nanoseconds vs milliseconds) | Small (already async) |

**Compatibility:** Rolling upgrades still require forward/backward compatibility. Use Protocol Buffers, Avro, or JSON with careful evolution.

---

## 4. Summary

In this chapter, we explored how to encode data and maintain compatibility as applications evolve:

**Encoding formats:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ENCODING FORMAT COMPARISON                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Language-Specific (Java Serializable, pickle):                           │
│  ❌ Language lock-in                                                       │
│  ❌ Security vulnerabilities                                               │
│  ❌ Poor versioning                                                        │
│  → Use only for transient in-process caching                              │
│                                                                           │
│  Textual (JSON, XML, CSV):                                                │
│  ✅ Human-readable                                                         │
│  ✅ Widely supported                                                       │
│  ⚠️ Number ambiguity, no binary strings, verbose                          │
│  → Good for data interchange between organizations                        │
│                                                                           │
│  Binary Schema-Driven (Protocol Buffers, Avro):                           │
│  ✅ Compact (60% smaller than JSON)                                        │
│  ✅ Clear compatibility semantics                                          │
│  ✅ Schema as documentation                                                │
│  ✅ Code generation for type safety                                        │
│  ❌ Not human-readable                                                     │
│  → Best for high-volume data and APIs                                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Compatibility types:**

- **Backward compatibility**: New code reads old data (usually easy)
- **Forward compatibility**: Old code reads new data (requires preserving unknown fields)

**Dataflow modes:**

| Mode | Encoder | Decoder | Compatibility Needs |
|------|---------|---------|---------------------|
| **Database** | Writer | Reader (possibly much later) | Both directions (rolling upgrades) |
| **Services** | Client | Server (and vice versa) | Backward (requests), forward (responses) |
| **Workflows** | Task output | Next task input | Depends on orchestrator |
| **Messages** | Producer | Consumer | Both directions |

**Key patterns for evolution:**

1. **Add optional fields with defaults** (works in all systems)
2. **Never reuse field tags/names** for deleted fields
3. **Test compatibility** before deploying
4. **Version APIs** when breaking changes unavoidable
5. **Preserve unknown fields** during decode/encode cycles

> **💡 Insight**
>
> The art of schema evolution is designing for change upfront. By choosing encodings that support forward and backward compatibility, and by following evolution rules consistently, you enable continuous deployment without coordination. Your future self (and teammates) will thank you.

In the next chapters, we'll see how these encoding and compatibility concepts apply to larger distributed systems, where data flows through complex networks of databases, services, and message brokers.

---

**Previous:** [Chapter 4](chapter04-storage-retrieval.md) | **Next:** [Chapter 6](../part2/chapter06-replication.md)
