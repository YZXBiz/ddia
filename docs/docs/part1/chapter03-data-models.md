---
sidebar_position: 3
title: "Chapter 3. Data Models and Query Languages"
description: "Exploring different data models including relational, document, graph, and their trade-offs"
---

# Chapter 3. Data Models and Query Languages

> The limits of my language mean the limits of my world.
>
> _Ludwig Wittgenstein, Tractatus Logico-Philosophicus (1922)_

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1. [Layers of Data Models](#11-layers-of-data-models)
   - 1.2. [Declarative vs. Imperative Query Languages](#12-declarative-vs-imperative-query-languages)
2. [Relational Model vs. Document Model](#2-relational-model-vs-document-model)
   - 2.1. [The Relational Model](#21-the-relational-model)
   - 2.2. [The NoSQL Movement](#22-the-nosql-movement)
   - 2.3. [The Object-Relational Mismatch](#23-the-object-relational-mismatch)
   - 2.4. [Document Model for One-to-Many Relationships](#24-document-model-for-one-to-many-relationships)
   - 2.5. [Normalization, Denormalization, and Joins](#25-normalization-denormalization-and-joins)
   - 2.6. [Many-to-One and Many-to-Many Relationships](#26-many-to-one-and-many-to-many-relationships)
   - 2.7. [When to Use Which Model](#27-when-to-use-which-model)
3. [Query Languages for Data](#3-query-languages-for-data)
   - 3.1. [Query Languages for Documents](#31-query-languages-for-documents)
   - 3.2. [Convergence of Document and Relational Databases](#32-convergence-of-document-and-relational-databases)
4. [Graph-Like Data Models](#4-graph-like-data-models)
   - 4.1. [Property Graphs](#41-property-graphs)
   - 4.2. [The Cypher Query Language](#42-the-cypher-query-language)
   - 4.3. [Graph Queries in SQL](#43-graph-queries-in-sql)
   - 4.4. [Triple-Stores and SPARQL](#44-triple-stores-and-sparql)
   - 4.5. [Datalog: Recursive Relational Queries](#45-datalog-recursive-relational-queries)
   - 4.6. [GraphQL](#46-graphql)
5. [Specialized Data Models](#5-specialized-data-models)
   - 5.1. [Event Sourcing and CQRS](#51-event-sourcing-and-cqrs)
   - 5.2. [DataFrames, Matrices, and Arrays](#52-dataframes-matrices-and-arrays)
   - 5.3. [Stars and Snowflakes: Schemas for Analytics](#53-stars-and-snowflakes-schemas-for-analytics)
6. [Summary](#6-summary)

---

## 1. Introduction

**In plain English:** Think of data models like different languages for describing the same reality. Just as you can describe your house in English, Spanish, or blueprints, you can represent your application's data using tables, JSON documents, or graphs. The model you choose shapes how you think about and solve problems.

**In technical terms:** Data models are fundamental abstractions that determine how you store, query, and reason about information. Each model offers different trade-offs in expressiveness, performance, and complexity.

**Why it matters:** Choosing the right data model is perhaps the most important architectural decision you'll make. It affects not just how the software is written, but how developers think about the problem domain. A poor fit between your data model and your use case can create years of friction.

### 1.1. Layers of Data Models

Most applications are built by layering one data model on top of another:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA MODEL ABSTRACTION LAYERS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   LAYER 1: Application Domain                                           │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │ Real world: people, organizations, goods, actions, sensors     │    │
│   │ Modeled as: Objects, data structures, APIs                     │    │
│   └──────────────────────────┬─────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│   LAYER 2: General-Purpose Data Model                                   │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │ Expressed as: JSON/XML documents, relational tables,           │    │
│   │              graph vertices/edges                              │    │
│   └──────────────────────────┬─────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│   LAYER 3: Storage Representation                                       │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │ Represented as: Bytes in memory, on disk, over network         │    │
│   │ Enables: Querying, searching, manipulation                     │    │
│   └──────────────────────────┬─────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│   LAYER 4: Hardware Representation                                      │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │ Represented as: Electrical currents, magnetic fields,          │    │
│   │                pulses of light                                 │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   Each layer hides complexity below by providing a clean abstraction    │
└─────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> These abstraction layers allow different groups of people to work together effectively. Database engineers don't need to understand your business domain, and you don't need to understand magnetic field physics. The interface between layers is the data model itself.

### 1.2. Declarative vs. Imperative Query Languages

Many query languages in this chapter (SQL, Cypher, SPARQL, Datalog) are **declarative**:

**In plain English:** Declarative languages let you describe **what** you want, not **how** to get it. It's like ordering at a restaurant: you specify "I want the salmon" (what), not "walk to the kitchen, turn on the stove, heat the pan..." (how).

**How declarative differs from imperative:**

| Aspect | Declarative (SQL) | Imperative (Python loop) |
|--------|------------------|-------------------------|
| **You specify** | Pattern of desired results | Step-by-step algorithm |
| **Optimizer decides** | Indexes, join order, parallelism | You control everything |
| **Conciseness** | Typically more compact | Often more verbose |
| **Performance** | Can improve without code changes | Requires manual optimization |
| **Parallelism** | Automatic across cores/machines | You implement yourself |

**Example comparison:**

```sql
-- Declarative: What you want
SELECT * FROM users WHERE country = 'USA' AND age >= 18;
```

```python
# Imperative: How to get it
results = []
for user in users:
    if user.country == 'USA' and user.age >= 18:
        results.append(user)
```

The declarative version hides implementation details, allowing the database to choose the fastest execution plan (e.g., use an index, parallelize across cores) without changing your code.

---

## 2. Relational Model vs. Document Model

### 2.1. The Relational Model

**In plain English:** The relational model organizes data like a spreadsheet: rows and columns in tables. It was proposed by Edgar Codd in 1970 and has dominated data storage for over 50 years.

**In technical terms:** Data is organized into **relations** (called tables in SQL), where each relation is an unordered collection of **tuples** (rows in SQL). Each row has the same set of columns, creating a rigid but powerful structure.

**Why it matters:** Despite being over half a century old, the relational model remains dominant for business analytics, transactions, and any workload requiring complex queries across multiple entities. Its success comes from mathematical foundations (relational algebra) and powerful optimization techniques.

The relational model was originally theoretical, and many doubted it could be implemented efficiently. By the mid-1980s, however, relational database management systems (RDBMS) and SQL became the tools of choice for structured data.

### 2.2. The NoSQL Movement

**In plain English:** NoSQL doesn't mean "no SQL"—it means "not only SQL." It's a collection of ideas around new data models, flexible schemas, and horizontal scalability.

**The evolution of database buzzwords:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EVOLUTION OF DATA MODELS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1970s-1980s                 1980s-1990s              2010s             │
│   ─────────────               ────────────             ─────             │
│                                                                          │
│   Network Model               Object DBs               NoSQL             │
│   Hierarchical Model          XML DBs                  NewSQL            │
│        ↓                           ↓                       ↓             │
│   Dominated by                Niche adoption           Document DBs      │
│   Relational Model            SQL absorbs ideas        (MongoDB)         │
│   (SQL wins)                  (JSON, XML support)      Graph DBs         │
│                                                         (Neo4j)          │
│                                                                          │
│   Each competitor generated hype, but SQL adapted and survived           │
│   SQL today: Relational core + JSON + XML + Graph support               │
└─────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> The lasting effect of NoSQL is the **document model** (JSON), which addresses real pain points like schema flexibility and object-relational impedance mismatch. Most relational databases now support JSON columns, showing convergence between models.

### 2.3. The Object-Relational Mismatch

**In plain English:** Applications use objects with nested data, but relational databases use flat tables. Converting between these two requires awkward translation—like trying to fit a round peg in a square hole.

**In technical terms:** The disconnect between object-oriented programming and relational tables is called **impedance mismatch**. You can't directly save a `User` object with nested `addresses` array to a relational table without breaking it apart.

**Object-Relational Mapping (ORM) frameworks** like ActiveRecord and Hibernate help, but they have trade-offs:

**ORM Downsides:**

| Problem | Description |
|---------|-------------|
| **Leaky abstraction** | Can't completely hide differences between objects and tables |
| **Schema still matters** | Data engineers need the relational schema for analytics |
| **Limited support** | Often only work with relational OLTP, not diverse systems |
| **Awkward auto-generation** | Auto-generated schemas may be inefficient |
| **N+1 query problem** | Easy to accidentally make N+1 database queries instead of 1 join |

**Example N+1 problem:**

```python
# ORM may generate inefficient queries
comments = Comment.objects.all()  # 1 query
for comment in comments:
    print(comment.author.name)     # N additional queries!

# Better: tell ORM to fetch authors too
comments = Comment.objects.select_related('author').all()  # 1 query with join
```

**ORM Upsides:**

- Reduces boilerplate for simple CRUD operations
- Can help with query result caching
- Assists with schema migrations and administrative tasks

### 2.4. Document Model for One-to-Many Relationships

**In plain English:** Some data naturally nests inside other data—like a resume with multiple jobs and education entries. JSON documents excel at representing these tree-like structures.

Let's compare how a LinkedIn profile looks in relational vs. document models:

**Relational approach:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    RELATIONAL SCHEMA FOR RESUME                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   users                          positions                                │
│   ┌─────────────────┐           ┌──────────────────────────┐            │
│   │ user_id         │───────┐   │ position_id              │            │
│   │ first_name      │       │   │ user_id (FK)             │            │
│   │ last_name       │       └──▶│ job_title                │            │
│   │ headline        │           │ organization             │            │
│   │ region_id (FK)  │           └──────────────────────────┘            │
│   │ photo_url       │                                                    │
│   └─────────────────┘           education                                │
│                                  ┌──────────────────────────┐            │
│   regions                   ┌───│ education_id             │            │
│   ┌─────────────────┐       │   │ user_id (FK)             │            │
│   │ region_id       │       │   │ school_name              │            │
│   │ region_name     │       │   │ start_year               │            │
│   └─────────────────┘       │   │ end_year                 │            │
│                             │   └──────────────────────────┘            │
│                             │                                            │
│   contact_info              │                                            │
│   ┌─────────────────┐       │                                            │
│   │ user_id (FK)    │───────┘                                            │
│   │ website         │                                                    │
│   │ twitter         │                                                    │
│   └─────────────────┘                                                    │
│                                                                           │
│   To fetch a profile: Multiple queries or messy multi-way join           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Document approach (JSON):**

```json
{
  "user_id":     251,
  "first_name":  "Barack",
  "last_name":   "Obama",
  "headline":    "Former President of the United States of America",
  "region_id":   "us:91",
  "photo_url":   "/p/7/000/253/05b/308dd6e.jpg",
  "positions": [
    {"job_title": "President", "organization": "United States of America"},
    {"job_title": "US Senator (D-IL)", "organization": "United States Senate"}
  ],
  "education": [
    {"school_name": "Harvard University",  "start": 1988, "end": 1991},
    {"school_name": "Columbia University", "start": 1981, "end": 1983}
  ],
  "contact_info": {
    "website": "https://barackobama.com",
    "twitter": "https://twitter.com/barackobama"
  }
}
```

**Tree structure visualization:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                ONE-TO-MANY AS TREE STRUCTURE                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                          User: Barack Obama                               │
│                                  │                                        │
│                    ┌─────────────┼─────────────┐                         │
│                    │             │             │                         │
│                    ▼             ▼             ▼                         │
│              positions      education    contact_info                    │
│                  │               │             │                         │
│            ┌─────┴─────┐    ┌───┴───┐    ┌────┴────┐                    │
│            ▼           ▼    ▼       ▼    ▼         ▼                    │
│        President   Senator Harvard Columbia website twitter              │
│                                                                           │
│   JSON makes tree structure explicit; relational "shreds" it into tables │
└──────────────────────────────────────────────────────────────────────────┘
```

**Advantages of JSON representation:**

1. **Better locality** — All related information in one place; fetch with single query
2. **No joins needed** — Everything already assembled
3. **Matches application code** — Natural mapping to objects
4. **Simpler queries** — One fetch vs. multiple queries or complex joins

> **💡 Insight**
>
> This is sometimes called **one-to-few** rather than one-to-many when there are only a small number of related items. If there could be thousands of related items (like comments on a celebrity's post), embedding them all becomes unwieldy, and the relational approach works better.

### 2.5. Normalization, Denormalization, and Joins

**In plain English:** Should you store "Washington, DC" as text or as an ID that points to a regions table? This is the normalization question: store human-readable info once (normalized) or duplicate it everywhere it's used (denormalized).

**Why use IDs (normalization)?**

In the resume example, `region_id` is an ID, not plain text. Benefits include:

| Benefit | Description |
|---------|-------------|
| **Consistent style** | All profiles spell "Washington, DC" the same way |
| **No ambiguity** | Distinguishes Washington DC from Washington state |
| **Easy updates** | Name stored once; change propagates everywhere |
| **Localization** | Can translate region names per user's language |
| **Better search** | Can encode "Washington is on East Coast" for queries |

**Normalized representation:**

```sql
SELECT users.*, regions.region_name
FROM users
JOIN regions ON users.region_id = regions.id
WHERE users.id = 251;
```

**Document databases** can store both normalized and denormalized data, but are often associated with denormalization because:
- JSON makes it easy to embed duplicate fields
- Many document databases have weak join support

**MongoDB join example:**

```javascript
db.users.aggregate([
  { $match: { _id: 251 } },
  { $lookup: {
      from: "regions",
      localField: "region_id",
      foreignField: "_id",
      as: "region"
  } }
])
```

**Trade-offs of normalization:**

| Approach | Write Performance | Read Performance | Consistency | Storage |
|----------|------------------|------------------|-------------|---------|
| **Normalized** | Faster (one copy) | Slower (requires joins) | Easier | Less space |
| **Denormalized** | Slower (many copies) | Faster (no joins) | Harder | More space |

> **💡 Insight**
>
> Denormalization is a form of **derived data**—you're caching the result of a join. Like any cache, you need a process to keep copies consistent. Normalization works well for OLTP (frequent updates); denormalization works well for analytics (bulk updates, read-heavy).

#### 2.5.1. Case Study: Social Network Timelines

In the social network example from Chapter 2, X (Twitter) precomputes timelines but stores only post IDs, not full post content:

```sql
-- Precomputed timeline stores IDs
SELECT posts.id, posts.sender_id FROM posts
  JOIN follows ON posts.sender_id = follows.followee_id
  WHERE follows.follower_id = current_user
  ORDER BY posts.timestamp DESC
  LIMIT 1000
```

When reading the timeline, X **hydrates** the IDs by looking up:
1. Post content, like count, reply count
2. Sender profile, username, profile picture

**Why not denormalize everything?**

- Like counts change multiple times per second
- Users change profile pictures frequently
- Storage cost would be massive

This shows that **denormalization isn't all-or-nothing**—you denormalize some things (which queries to run) and normalize others (fast-changing data).

### 2.6. Many-to-One and Many-to-Many Relationships

**In plain English:** One-to-many is simple (one resume has many jobs). Many-to-many is trickier: one person works for many companies, and one company employs many people. How do you model that?

**Relational model:**

Use an **associative table** (join table):

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MANY-TO-MANY IN RELATIONAL MODEL                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   users                      positions                   organizations    │
│   ┌──────────┐              ┌──────────┐                ┌──────────┐     │
│   │ user_id  │              │ user_id  │                │  org_id  │     │
│   │ name     │──────────┐   │ org_id   │   ┌───────────│  name    │     │
│   └──────────┘          │   │ title    │   │           │  logo    │     │
│                         └──▶│ start    │◀──┘           └──────────┘     │
│                             │ end      │                                 │
│                             └──────────┘                                 │
│                                                                           │
│   The positions table connects users to organizations                    │
│   Each row represents one person's employment at one company             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Document model:**

```json
{
  "user_id":    251,
  "first_name": "Barack",
  "last_name":  "Obama",
  "positions": [
    {"start": 2009, "end": 2017, "job_title": "President",         "org_id": 513},
    {"start": 2005, "end": 2008, "job_title": "US Senator (D-IL)", "org_id": 514}
  ]
}
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│                MANY-TO-MANY IN DOCUMENT MODEL                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────────────────────────────────────────────┐                │
│   │  User Document (Barack Obama)                       │                │
│   │  ─────────────────────────────────                  │                │
│   │  • positions: [org_id: 513, org_id: 514]            │                │
│   └──────────────────────┬──────────────────────────────┘                │
│                          │                                                │
│                          │ references                                     │
│                          │                                                │
│                          ▼                                                │
│   ┌─────────────────────────────────────────────────────┐                │
│   │  Organization Documents                             │                │
│   │  ──────────────────────                             │                │
│   │  513: {name: "United States of America"}            │                │
│   │  514: {name: "United States Senate"}                │                │
│   └─────────────────────────────────────────────────────┘                │
│                                                                           │
│   Data within dotted boxes = one document                                │
│   Links to organizations = references to other documents                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Querying in both directions:**

Many-to-many relationships need bidirectional queries:
- Find all organizations where a person worked
- Find all people who worked at an organization

**Solutions:**

| Approach | How It Works |
|----------|--------------|
| **Denormalized** | Store IDs on both sides (user → orgs, org → users) |
| **Secondary indexes** | Index both user_id and org_id in join table |
| **Document indexes** | Index org_id field inside positions array |

Most databases (relational and document) support indexing values inside nested structures.

### 2.7. When to Use Which Model

**In plain English:** Use documents for tree-like data that's loaded together. Use relational for data with complex relationships and many joins.

**Document model is good when:**

- Data has document-like structure (tree of one-to-many)
- Entire tree is typically loaded at once
- Schema flexibility is important
- Few relationships between documents

**Example:** Product catalog where each product is self-contained

**Relational model is better when:**

- Many-to-many relationships are common
- Complex queries across multiple entities
- Need to reference nested items directly by ID
- Strong schema enforcement desired

**Example:** E-commerce order system with customers, products, orders, inventory

#### 2.7.1. Schema Flexibility

**In plain English:** "Schemaless" databases still have a schema—it's just implicit (assumed by application) rather than explicit (enforced by database).

| Approach | When Schema Defined | Type Checking Analogy |
|----------|---------------------|----------------------|
| **Schema-on-write** | Before writing data | Static type checking (compile-time) |
| **Schema-on-read** | When reading data | Dynamic type checking (runtime) |

**Example schema evolution:**

Change from full name to first/last name:

**Document database:**

```javascript
if (user && user.name && !user.first_name) {
    // Documents written before Dec 8, 2023 don't have first_name
    user.first_name = user.name.split(" ")[0];
}
```

**Relational database:**

```sql
ALTER TABLE users ADD COLUMN first_name text DEFAULT NULL;
UPDATE users SET first_name = split_part(name, ' ', 1);      -- PostgreSQL
```

**Trade-offs:**

| Aspect | Schema-on-write | Schema-on-read |
|--------|----------------|----------------|
| **Migration** | Slow UPDATE on large tables | Handle old formats in app code |
| **Code complexity** | Simpler reads | Every read needs format handling |
| **Documentation** | Schema is self-documenting | Schema exists only in code |
| **Validation** | Database rejects invalid data | App must validate |

> **💡 Insight**
>
> Schema-on-read is advantageous for **heterogeneous data**—when objects don't all have the same structure because they represent different types, are determined by external systems, or change frequently. But when all records have the same structure, explicit schemas document and enforce that structure.

#### 2.7.2. Data Locality

**In plain English:** Documents store related data together physically, which is faster to load but wastes work if you only need part of it.

**How locality works:**

- Document stored as single continuous string (JSON, XML, BSON)
- Loading entire document = one disk read
- Updating document = rewrite entire document

**When locality helps:**

✅ Application needs large parts of document at once (render profile page)

❌ Only need small part of large document (just the email address)

❌ Frequent small updates to document

**Locality beyond documents:**

Other databases offer locality too:

| Database | Feature | How It Works |
|----------|---------|--------------|
| **Google Spanner** | Interleaved tables | Nest child table rows inside parent |
| **Oracle** | Multi-table index clusters | Store related rows together |
| **Bigtable/HBase** | Column families | Group columns for locality |

---

## 3. Query Languages for Data

### 3.1. Query Languages for Documents

**In plain English:** Relational databases use SQL, but document databases vary widely—from simple key-value lookups to rich query languages rivaling SQL.

**Range of query capabilities:**

```
Simple                                                             Complex
│──────────────────────────────────────────────────────────────────────│
│                                                                      │
Key-value only         Secondary indexes       Rich query languages   │
(Primary key)          (Query by fields)       (Joins, aggregations)  │
                                                                       │
Example:               Example:                 Example:               │
DynamoDB               MongoDB (basic)          MongoDB (aggregation)  │
                                                SQL (PostgreSQL JSON)  │
```

**XML databases:** XQuery, XPath for complex queries and joins

**JSON databases:** MongoDB aggregation pipeline, PostgreSQL JSON operators

**Example query: Count sharks by month**

**PostgreSQL (SQL):**

```sql
SELECT date_trunc('month', observation_timestamp) AS observation_month,
       sum(num_animals) AS total_animals
FROM observations
WHERE family = 'Sharks'
GROUP BY observation_month;
```

**MongoDB (Aggregation Pipeline):**

```javascript
db.observations.aggregate([
    { $match: { family: "Sharks" } },
    { $group: {
        _id: {
            year:  { $year:  "$observationTimestamp" },
            month: { $month: "$observationTimestamp" }
        },
        totalAnimals: { $sum: "$numAnimals" }
    } }
]);
```

**Comparison:**

| Aspect | SQL | MongoDB Pipeline |
|--------|-----|------------------|
| **Syntax** | English-like | JSON-based |
| **Expressiveness** | Very powerful | Subset of SQL power |
| **Familiarity** | Widely known | Newer, less familiar |
| **Style** | Declarative | Declarative |

### 3.2. Convergence of Document and Relational Databases

**In plain English:** Document and relational databases started as opposites but are growing more similar. Most relational databases now support JSON; most document databases now support joins.

**Evolution of both models:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONVERGENCE OF DATA MODELS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   2000s: SEPARATED                                                       │
│   ───────────────────                                                    │
│                                                                          │
│   Relational DB              Document DB                                 │
│   ────────────               ───────────                                 │
│   • Rigid schemas            • Flexible schemas                          │
│   • SQL only                 • No joins                                  │
│   • Tables                   • JSON documents                            │
│                                                                          │
│   ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│   2020s: CONVERGED                                                       │
│   ──────────────                                                         │
│                                                                          │
│   Modern Databases                                                       │
│   ─────────────────                                                      │
│   • PostgreSQL: JSON columns, JSON queries, JSON indexes                │
│   • MongoDB: $lookup (joins), secondary indexes, aggregation            │
│   • MySQL: JSON datatype, JSON functions                                │
│   • RethinkDB: ReQL with joins                                          │
│                                                                          │
│   Best of both worlds: Schema where needed, flexibility where needed    │
└─────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> This convergence benefits developers because real applications often need both paradigms. A relational schema might have a JSON column for flexible metadata. A document database might use references and joins for normalized entities. Hybrid models are increasingly common.

**Historical note:** Codd's original relational model (1970) actually allowed "nonsimple domains"—nested structures like JSON—but this feature wasn't widely implemented until 30+ years later when JSON support was added to SQL.

---

## 4. Graph-Like Data Models

**In plain English:** If your data is full of many-to-many relationships—where everything connects to everything—a graph model is the most natural fit. Think social networks, road maps, or knowledge graphs.

**When to use graphs:**

- One-to-many → Document model
- Many simple many-to-many → Relational model
- Complex, highly connected many-to-many → Graph model

**What is a graph?**

A graph has two types of objects:
- **Vertices** (nodes, entities): The things
- **Edges** (relationships, arcs): The connections

**Common graph examples:**

| Type | Vertices | Edges | Use Case |
|------|----------|-------|----------|
| **Social graph** | People | Friendships | Facebook, LinkedIn |
| **Web graph** | Pages | Hyperlinks | PageRank, search engines |
| **Road network** | Junctions | Roads/rails | Navigation apps |
| **Knowledge graph** | Entities | Facts | Google Search, Wikidata |

**Example graph:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    EXAMPLE GRAPH STRUCTURE                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Person: Lucy                    Person: Alain                           │
│   ┌─────────────┐                ┌─────────────┐                         │
│   │ name: Lucy  │                │ name: Alain │                         │
│   │ born: Idaho │                │ born: France│                         │
│   └──────┬──────┘                └──────┬──────┘                         │
│          │                              │                                │
│          │ BORN_IN        MARRIED_TO    │ BORN_IN                        │
│          │              ┌───────────────┤                                │
│          ▼              │               ▼                                │
│   ┌─────────────┐       │        ┌─────────────┐                         │
│   │Idaho (state)│       │        │Normandy     │                         │
│   └──────┬──────┘       │        └──────┬──────┘                         │
│          │              │               │                                │
│          │ WITHIN       │               │ WITHIN                         │
│          ▼              │               ▼                                │
│   ┌─────────────┐       │        ┌─────────────┐                         │
│   │United States│       │        │France       │                         │
│   └──────┬──────┘       │        └──────┬──────┘                         │
│          │              │               │                                │
│          │ WITHIN       │               │ WITHIN                         │
│          ▼              │               ▼                                │
│   ┌─────────────┐       │        ┌─────────────┐                         │
│   │North America│       │        │Europe       │                         │
│   └─────────────┘       │        └─────────────┘                         │
│                         │                                                │
│                         │ LIVES_IN                                       │
│                         ▼                                                │
│                  ┌─────────────┐                                         │
│                  │London (city)│                                         │
│                  └──────┬──────┘                                         │
│                         │                                                │
│                         │ WITHIN                                         │
│                         ▼                                                │
│                  ┌─────────────┐                                         │
│                  │United Kingdom│                                        │
│                  └──────┬──────┘                                         │
│                         │                                                │
│                         │ WITHIN                                         │
│                         ▼                                                │
│                  ┌─────────────┐                                         │
│                  │Europe       │                                         │
│                  └─────────────┘                                         │
│                                                                           │
│   This graph shows:                                                      │
│   • Different types of vertices (people, cities, countries)              │
│   • Different types of edges (BORN_IN, LIVES_IN, WITHIN, MARRIED_TO)    │
│   • Hierarchical location data (varying granularity)                     │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> Graphs excel at representing heterogeneous, interconnected data. This example mixes people, cities, states, regions, and countries—all with different properties. A relational schema would need many tables; a document schema would struggle with the many-to-many relationships. Graphs handle both naturally.

### 4.1. Property Graphs

**In plain English:** A property graph stores properties (key-value pairs) on both vertices and edges. Each vertex and edge has a label describing its type, plus arbitrary properties.

**In technical terms:** The property graph model (used by Neo4j, Memgraph, KùzuDB, Amazon Neptune) consists of:

**Vertex components:**

1. Unique identifier
2. Label (type of object)
3. Set of outgoing edges
4. Set of incoming edges
5. Collection of properties (key-value pairs)

**Edge components:**

1. Unique identifier
2. Tail vertex (where edge starts)
3. Head vertex (where edge ends)
4. Label (relationship type)
5. Collection of properties (key-value pairs)

**Relational representation:**

You can represent a property graph using two relational tables:

```sql
CREATE TABLE vertices (
    vertex_id   integer PRIMARY KEY,
    label       text,
    properties  jsonb
);

CREATE TABLE edges (
    edge_id     integer PRIMARY KEY,
    tail_vertex integer REFERENCES vertices (vertex_id),
    head_vertex integer REFERENCES vertices (vertex_id),
    label       text,
    properties  jsonb
);

CREATE INDEX edges_tails ON edges (tail_vertex);
CREATE INDEX edges_heads ON edges (head_vertex);
```

**Key properties of this model:**

| Property | Benefit |
|----------|---------|
| **Any-to-any connections** | No schema restricts which things can be associated |
| **Efficient traversal** | Indexes on both tail and head enable forward/backward traversal |
| **Multiple relationship types** | Different labels distinguish relationship meanings |
| **Flexible evolution** | Easy to add new vertex/edge types without migration |

> **💡 Insight**
>
> A graph edge can only connect two vertices, whereas a relational join table can represent three-way or higher relationships by having multiple foreign keys. To represent such relationships in a graph, create an additional vertex for the join table row, with edges to/from that vertex.

### 4.2. The Cypher Query Language

**In plain English:** Cypher is like SQL for graphs. Instead of SELECT-FROM-WHERE, you use ASCII art to draw the graph pattern you're looking for: `(person)-[:BORN_IN]->(place)`.

**In technical terms:** Cypher is a declarative query language for property graphs, created for Neo4j and standardized as openCypher. Supported by Neo4j, Memgraph, KùzuDB, Amazon Neptune, Apache AGE (PostgreSQL).

**Creating data:**

```cypher
CREATE
  (namerica :Location {name:'North America',  type:'continent'}),
  (usa      :Location {name:'United States',  type:'country'  }),
  (idaho    :Location {name:'Idaho',          type:'state'    }),
  (lucy     :Person   {name:'Lucy' }),
  (idaho) -[:WITHIN ]-> (usa)  -[:WITHIN]-> (namerica),
  (lucy)  -[:BORN_IN]-> (idaho)
```

**Syntax explanation:**

- `(namerica :Location {...})` — Create vertex with label `Location` and properties
- `(idaho) -[:WITHIN]-> (usa)` — Create edge labeled `WITHIN` from idaho to usa
- Variable names like `namerica` are local to the query

**Querying: Find people who emigrated from US to Europe**

```cypher
MATCH
  (person) -[:BORN_IN]->  () -[:WITHIN*0..]-> (:Location {name:'United States'}),
  (person) -[:LIVES_IN]-> () -[:WITHIN*0..]-> (:Location {name:'Europe'})
RETURN person.name
```

**Pattern explanation:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CYPHER PATTERN MATCHING                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Pattern: (person) -[:BORN_IN]-> () -[:WITHIN*0..]-> (:Location {...})  │
│                                                                           │
│   (person)              Variable binding to person vertex                 │
│   -[:BORN_IN]->         Follow outgoing edge labeled BORN_IN            │
│   ()                    Anonymous vertex (don't care about details)      │
│   -[:WITHIN*0..]->      Follow 0 or more WITHIN edges                   │
│   (:Location {...})     Must end at Location with name="United States"   │
│                                                                           │
│   Execution:                                                              │
│   1. Find person vertex                                                  │
│   2. Follow BORN_IN edge to birthplace                                   │
│   3. Follow chain of WITHIN edges up hierarchy                           │
│   4. Check if chain reaches "United States"                              │
│   5. Repeat for LIVES_IN edge checking if it reaches "Europe"            │
│   6. Return person.name if both conditions met                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Variable-length paths:**

The `*0..` syntax means "zero or more hops"—like `*` in regular expressions. This handles different location granularities:

- Lucy lives in London (city) → UK (country) → Europe (continent)
- Someone else lives directly in Europe
- Both match because path length is variable

### 4.3. Graph Queries in SQL

**In plain English:** You can store graph data in relational tables, but querying it in SQL becomes painful—especially for variable-length paths. A 4-line Cypher query becomes 31 lines of SQL.

**The challenge:** In graphs, you traverse a variable number of edges. In SQL, you know join count in advance. How do you JOIN "zero or more times"?

**Answer:** Recursive common table expressions (WITH RECURSIVE), available since SQL:1999.

**Same query in SQL:**

```sql
WITH RECURSIVE

  -- in_usa is the set of vertex IDs of all locations within the United States
  in_usa(vertex_id) AS (
      SELECT vertex_id FROM vertices
        WHERE label = 'Location' AND properties->>'name' = 'United States'
    UNION
      SELECT edges.tail_vertex FROM edges
        JOIN in_usa ON edges.head_vertex = in_usa.vertex_id
        WHERE edges.label = 'within'
  ),

  -- in_europe is the set of vertex IDs of all locations within Europe
  in_europe(vertex_id) AS (
      SELECT vertex_id FROM vertices
        WHERE label = 'location' AND properties->>'name' = 'Europe'
    UNION
      SELECT edges.tail_vertex FROM edges
        JOIN in_europe ON edges.head_vertex = in_europe.vertex_id
        WHERE edges.label = 'within'
  ),

  -- born_in_usa is the set of vertex IDs of all people born in the US
  born_in_usa(vertex_id) AS (
    SELECT edges.tail_vertex FROM edges
      JOIN in_usa ON edges.head_vertex = in_usa.vertex_id
      WHERE edges.label = 'born_in'
  ),

  -- lives_in_europe is the set of vertex IDs of all people living in Europe
  lives_in_europe(vertex_id) AS (
    SELECT edges.tail_vertex FROM edges
      JOIN in_europe ON edges.head_vertex = in_europe.vertex_id
      WHERE edges.label = 'lives_in'
  )

SELECT vertices.properties->>'name'
FROM vertices
-- join to find those people who were both born in the US *and* live in Europe
JOIN born_in_usa     ON vertices.vertex_id = born_in_usa.vertex_id
JOIN lives_in_europe ON vertices.vertex_id = lives_in_europe.vertex_id;
```

**What this does:**

1. Find vertex "United States" → seed `in_usa` set
2. Recursively follow incoming `within` edges → expand `in_usa` set
3. Do same for Europe → build `in_europe` set
4. Find people with `born_in` edges to `in_usa` vertices
5. Find people with `lives_in` edges to `in_europe` vertices
6. Intersect the two sets → people who match both conditions

> **💡 Insight**
>
> The 4-line Cypher query vs. 31-line SQL query shows how the right data model and query language make a massive difference. SQL wasn't designed for variable-length path traversals, while Cypher was. There are plans to add a graph query language called GQL to the SQL standard, inspired by Cypher.

### 4.4. Triple-Stores and SPARQL

**In plain English:** Triple-stores break everything into three-part statements: (subject, predicate, object). It's like saying "Jim likes bananas" where Jim is the subject, likes is the predicate (verb), and bananas is the object.

**In technical terms:** The triple-store model represents all information as **(subject, predicate, object)** tuples. Used by Datomic, AllegroGraph, Blazegraph, Apache Jena, Amazon Neptune.

**How triples work:**

The object can be either:

1. **Primitive value** — The predicate and object are like a property key-value
   - Example: `(lucy, birthYear, 1989)` → lucy has property birthYear=1989

2. **Another vertex** — The predicate is an edge between two vertices
   - Example: `(lucy, marriedTo, alain)` → edge from lucy to alain

**Example in Turtle format:**

```turtle
@prefix : <urn:example:>.
_:lucy     a :Person;   :name "Lucy";          :bornIn _:idaho.
_:idaho    a :Location; :name "Idaho";         :type "state";   :within _:usa.
_:usa      a :Location; :name "United States"; :type "country"; :within _:namerica.
_:namerica a :Location; :name "North America"; :type "continent".
```

**Syntax notes:**

- `_:lucy` — Blank node (local identifier)
- `a :Person` — "a" means "is a" (type declaration)
- `;` — Semicolons let you list multiple predicates for same subject
- `:name "Lucy"` — Property with string value

**The Semantic Web legacy:**

Triple-stores were motivated by the Semantic Web vision (early 2000s) of internet-wide data exchange. While the grand vision didn't materialize, the technology found other uses:

- Linked data standards (JSON-LD)
- Biomedical ontologies
- Facebook Open Graph (link unfurling)
- Knowledge graphs (Wikidata, Google)
- Schema.org vocabularies

**RDF (Resource Description Framework):**

Turtle is one encoding of RDF. Others include RDF/XML (more verbose), N-Triples, JSON-LD. Tools like Apache Jena convert between formats.

**RDF uses URIs for namespacing:**

```
<http://my-company.com/namespace#within>
<http://my-company.com/namespace#lives_in>
```

This prevents naming conflicts when combining data from different sources. The URL doesn't need to resolve—it's just a unique identifier.

#### 4.4.1. SPARQL Query Language

**In plain English:** SPARQL is to triple-stores what SQL is to relational databases. It uses pattern matching like Cypher, but with slightly different syntax.

**In technical terms:** SPARQL (SPARQL Protocol and RDF Query Language, pronounced "sparkle") is the standard query language for RDF triple-stores.

**Same query in SPARQL:**

```sparql
PREFIX : <urn:example:>

SELECT ?personName WHERE {
  ?person :name ?personName.
  ?person :bornIn  / :within* / :name "United States".
  ?person :livesIn / :within* / :name "Europe".
}
```

**Syntax comparison:**

```
# Cypher
(person) -[:BORN_IN]-> () -[:WITHIN*0..]-> (location)

# SPARQL
?person :bornIn / :within* ?location.
```

Both express: "Follow bornIn edge, then zero or more within edges"

**Key differences:**

| Aspect | Cypher | SPARQL |
|--------|--------|--------|
| **Variables** | `person` | `?person` (question mark prefix) |
| **Properties** | `{name: 'United States'}` | `:name "United States".` |
| **Path syntax** | `-[:WITHIN*0..]->` | `/ :within* /` |
| **Unification** | Separate property and edge syntax | Same syntax for both |

Since RDF doesn't distinguish between properties and edges (both use predicates), SPARQL uses the same syntax for matching both.

### 4.5. Datalog: Recursive Relational Queries

**In plain English:** Datalog is an old but powerful language (1980s) that builds complex queries by defining rules that build on each other—like defining functions that call each other.

**In technical terms:** Datalog is based on relational algebra but excels at recursive queries on graphs. Used by Datomic, LogicBlox, CozoDB, LinkedIn's LIquid. It's a subset of Prolog.

**Data representation:**

Facts look like relational table rows:

```prolog
location(1, "North America", "continent").
location(2, "United States", "country").
location(3, "Idaho", "state").

within(2, 1).    /* US is in North America */
within(3, 2).    /* Idaho is in the US     */

person(100, "Lucy").
born_in(100, 3). /* Lucy was born in Idaho */
```

**Query with rules:**

```prolog
within_recursive(LocID, PlaceName) :- location(LocID, PlaceName, _). /* Rule 1 */

within_recursive(LocID, PlaceName) :- within(LocID, ViaID),          /* Rule 2 */
                                      within_recursive(ViaID, PlaceName).

migrated(PName, BornIn, LivingIn)  :- person(PersonID, PName),       /* Rule 3 */
                                      born_in(PersonID, BornID),
                                      within_recursive(BornID, BornIn),
                                      lives_in(PersonID, LivingID),
                                      within_recursive(LivingID, LivingIn).

us_to_europe(Person) :- migrated(Person, "United States", "Europe"). /* Rule 4 */
/* us_to_europe contains the row "Lucy". */
```

**How rules work:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DATALOG RULE EVALUATION                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Rule structure:                                                         │
│   head(Output) :- body(Conditions).                                      │
│   "head is true if body conditions are true"                             │
│                                                                           │
│   Rule 1: within_recursive(LocID, PlaceName) :- location(LocID, ...)    │
│   ────────────────────────────────────────────────────────────           │
│   If there's a location with ID and Name,                                │
│   then that location is within_recursive itself                          │
│                                                                           │
│   Rule 2: within_recursive(LocID, PlaceName) :-                          │
│              within(LocID, ViaID),                                       │
│              within_recursive(ViaID, PlaceName).                         │
│   ────────────────────────────────────────────────────────────           │
│   If LocID is within ViaID,                                              │
│   and ViaID is within_recursive PlaceName,                               │
│   then LocID is within_recursive PlaceName (transitivity!)               │
│                                                                           │
│   Example execution:                                                      │
│   1. location(3, "Idaho", "state") → within_recursive(3, "Idaho")       │
│   2. within(3, 2) + within_recursive(2, "US") → within_recursive(3, "US")│
│   3. within(2, 1) + within_recursive(1, "NA") → within_recursive(3, "NA")│
│                                                                           │
│   Idaho is now known to be within Idaho, US, and North America!          │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> Datalog requires different thinking than SQL. You build complex queries by combining simple rules, like breaking code into functions. Rules can be recursive (call themselves), enabling powerful graph traversals. This compositional style makes complex queries more maintainable.

### 4.6. GraphQL

**In plain English:** GraphQL lets client apps (mobile, web) request exactly the data they need in exactly the structure they need it—nothing more, nothing less. The server returns JSON matching the query shape.

**In technical terms:** GraphQL is a query language designed for client-server communication. Unlike Cypher/SPARQL/Datalog, it's **restrictive by design** to prevent expensive queries that could DoS the server.

**Example: Chat application**

```graphql
query ChatApp {
  channels {
    name
    recentMessages(latest: 50) {
      timestamp
      content
      sender {
        fullName
        imageUrl
      }
      replyTo {
        content
        sender {
          fullName
        }
      }
    }
  }
}
```

**Response structure:**

```json
{
  "data": {
    "channels": [
      {
        "name": "#general",
        "recentMessages": [
          {
            "timestamp": 1693143014,
            "content": "Hey! How are y'all doing?",
            "sender": {"fullName": "Aaliyah", "imageUrl": "https://..."},
            "replyTo": null
          },
          {
            "timestamp": 1693143024,
            "content": "Great! And you?",
            "sender": {"fullName": "Caleb", "imageUrl": "https://..."},
            "replyTo": {
              "content": "Hey! How are y'all doing?",
              "sender": {"fullName": "Aaliyah"}
            }
          }
        ]
      }
    ]
  }
}
```

**Key design choices:**

| Aspect | Design | Reason |
|--------|--------|--------|
| **Response shape** | Mirrors query | Client gets exactly what it asked for |
| **Denormalization** | Data is duplicated | Simpler to render UI (no additional fetches) |
| **No recursion** | Not allowed | Prevents expensive unbounded queries |
| **Limited filtering** | Only what server exposes | Prevents arbitrary expensive searches |
| **Schema-driven** | Server defines schema | Client can only request what's offered |

**Example denormalization:**

In the response, Aaliyah's name appears twice—once as the sender of message 1, and again in the `replyTo` of message 2. This duplication is intentional: it avoids requiring the client to make additional fetches or manually join data.

**What GraphQL is NOT:**

- Not a graph database (despite the name)
- Not for recursive queries
- Not for arbitrary search conditions
- Works on top of any database (relational, document, graph)

**What GraphQL IS good for:**

- Client apps specifying exactly what data they need
- Rapidly changing frontend requirements
- Avoiding over-fetching (getting too much data)
- Avoiding under-fetching (multiple round-trips)

> **💡 Insight**
>
> GraphQL trades server-side flexibility for client-side convenience and security. The restrictive design prevents users from performing expensive queries, but this also means you need separate tools to convert GraphQL queries into efficient internal service calls. Authorization, rate limiting, and performance optimization are additional challenges.

---

## 5. Specialized Data Models

### 5.1. Event Sourcing and CQRS

**In plain English:** Instead of storing current state, store a log of all events that happened. Current state is derived from the event log. Like a bank ledger: you don't just store your balance, you store every deposit and withdrawal.

**In technical terms:** **Event sourcing** represents data as an append-only log of immutable events. **CQRS** (Command Query Responsibility Segregation) maintains separate write-optimized and read-optimized representations, deriving read models from the event log.

**Example: Conference management system**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    EVENT SOURCING ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   EVENT LOG (Source of Truth)                                            │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │ 1. RegistrationOpened(capacity: 500)                           │     │
│   │ 2. SeatReserved(attendee: "Alice", count: 1)                   │     │
│   │ 3. SeatReserved(attendee: "Bob", count: 2)                     │     │
│   │ 4. PaymentReceived(attendee: "Alice", amount: 100)             │     │
│   │ 5. ReservationCancelled(attendee: "Bob")                       │     │
│   │ 6. SeatReserved(attendee: "Charlie", count: 1)                 │     │
│   │ ...                                                             │     │
│   └──────────────────────┬─────────────────────────────────────────┘     │
│                          │                                                │
│                          │ Events flow to                                 │
│                          │ multiple views                                 │
│                          │                                                │
│           ┌──────────────┼──────────────┐                                 │
│           │              │              │                                 │
│           ▼              ▼              ▼                                 │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                        │
│   │ Booking     │ │ Dashboard   │ │ Badge       │                        │
│   │ Status View │ │ Charts View │ │ Printer View│                        │
│   │ ─────────── │ │ ─────────── │ │ ─────────── │                        │
│   │ Alice: Paid │ │ Revenue: $$ │ │ Alice ✓     │                        │
│   │ Bob: Cancel │ │ Seats: 498  │ │ Charlie ✓   │                        │
│   │ Charlie: OK │ │ Trend: ↗    │ │             │                        │
│   └─────────────┘ └─────────────┘ └─────────────┘                        │
│                                                                           │
│   Materialized views = Read models = Projections                         │
│   Can be deleted and rebuilt from event log                              │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key concepts:**

| Term | Meaning |
|------|---------|
| **Event** | Immutable fact about something that happened (past tense) |
| **Command** | Request from user (needs validation) |
| **Materialized view** | Read-optimized representation derived from events |
| **Projection** | Same as materialized view |
| **Read model** | Same as materialized view |

**Event naming:** Use past tense ("SeatsWereBooked") because events are historical facts, not current state.

**Advantages:**

1. **Better intent** — "ReservationCancelled" is clearer than "active=false in bookings table"

2. **Reproducibility** — Same events in same order always produce same output

3. **Debugging** — Can replay events to find bugs

4. **Bug fixes** — Delete materialized view, fix code, rebuild from events

5. **Multiple views** — Different read models optimized for different queries

6. **Evolution** — Add new event types or new properties without changing old events

7. **New features** — Build new views from existing events (e.g., offer cancelled seat to waitlist)

8. **Reversibility** — Can delete erroneous events and rebuild

9. **Audit log** — Complete history of everything that happened

**Disadvantages:**

1. **External data** — Need deterministic handling (e.g., include exchange rates in events, not fetch them)

2. **Personal data** — GDPR deletion requests are problematic with immutable events (crypto-shredding can help)

3. **Side effects** — Reprocessing events must avoid resending emails, etc.

**Technologies:**

- EventStoreDB
- MartenDB (PostgreSQL-based)
- Axon Framework
- Apache Kafka (event log)
- Stream processors (update views)

> **💡 Insight**
>
> Event sourcing and star schema fact tables (from analytics) are similar—both are collections of events. But fact tables have fixed columns and unordered rows, while event sourcing has heterogeneous event types and order matters. Event sourcing is like version control for your data: you have complete history and can check out any previous state.

### 5.2. DataFrames, Matrices, and Arrays

**In plain English:** DataFrames are like spreadsheets for data scientists. They start relational (rows and columns) but can transform into matrices (numerical arrays) that machine learning algorithms need.

**In technical terms:** DataFrames are a data model supported by R, Pandas (Python), Apache Spark, Dask, and others. They provide relational-like operations (filter, group, join) plus transformations to multidimensional arrays for ML.

**DataFrame operations:**

```python
# Pandas-style API
import pandas as pd

df = pd.read_csv('movie_ratings.csv')
result = (df
    .groupby('user_id')
    .agg({'rating': 'mean', 'movie_id': 'count'})
    .sort_values('rating', ascending=False)
    .head(10))
```

**Relational to matrix transformation:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    RELATIONAL TO MATRIX TRANSFORMATION                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   RELATIONAL TABLE                                                        │
│   ┌─────────┬──────────┬────────┐                                        │
│   │ user_id │ movie_id │ rating │                                        │
│   ├─────────┼──────────┼────────┤                                        │
│   │   1     │   101    │   5    │                                        │
│   │   1     │   102    │   3    │                                        │
│   │   2     │   101    │   4    │                                        │
│   │   2     │   103    │   5    │                                        │
│   │   3     │   102    │   2    │                                        │
│   └─────────┴──────────┴────────┘                                        │
│                                                                           │
│                         ▼ Transform (pivot)                               │
│                                                                           │
│   MATRIX (Sparse)                                                         │
│              Movie 101   Movie 102   Movie 103                            │
│            ┌──────────┬──────────┬──────────┐                            │
│   User 1   │    5     │    3     │    -     │                            │
│   User 2   │    4     │    -     │    5     │                            │
│   User 3   │    -     │    2     │    -     │                            │
│            └──────────┴──────────┴──────────┘                            │
│                                                                           │
│   Sparse matrix: Many empty cells (user hasn't rated movie)              │
│   Libraries like NumPy, SciPy handle sparse arrays efficiently           │
│   ML algorithms (matrix factorization) operate on this form              │
└──────────────────────────────────────────────────────────────────────────┘
```

**Transforming non-numerical data:**

| Data Type | Transformation Method |
|-----------|----------------------|
| **Dates** | Scale to floating-point in range [0, 1] |
| **Categories** | One-hot encoding: binary column per category |
| **Text** | Word embeddings, TF-IDF vectors |
| **Images** | Pixel arrays, CNN features |

**One-hot encoding example:**

```
Genre: Comedy → [1, 0, 0]
Genre: Drama  → [0, 1, 0]
Genre: Horror → [0, 0, 1]
```

**Use cases:**

| Domain | Example |
|--------|---------|
| **Machine learning** | Feature engineering, model training |
| **Data exploration** | Statistical analysis, visualization |
| **Scientific computing** | Geospatial data, medical imaging, telescopes |
| **Finance** | Time series data, asset prices |

**Array databases:** TileDB specializes in large multidimensional arrays for scientific datasets.

> **💡 Insight**
>
> DataFrames bridge the gap between databases (relational tables) and machine learning (numerical arrays). Data scientists use them to "wrangle" data into the right form. Unlike relational databases which enforce a schema, DataFrames give data scientists control over the representation most suitable for their analysis.

### 5.3. Stars and Snowflakes: Schemas for Analytics

**In plain English:** Data warehouses organize tables into a star shape: a central "fact table" recording events (sales, clicks) surrounded by "dimension tables" describing who/what/where/when/why.

**In technical terms:** **Star schema** and **snowflake schema** are widely-used conventions for structuring data warehouse tables, optimized for business intelligence and analytics queries.

**Star schema example:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    STAR SCHEMA FOR RETAIL ANALYTICS                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                         dim_date                                          │
│                    ┌─────────────────┐                                    │
│                    │ date_key        │                                    │
│                    │ date            │                                    │
│                    │ day_of_week     │                                    │
│                    │ is_holiday      │                                    │
│                    └────────┬────────┘                                    │
│                             │                                             │
│       dim_product           │           dim_store                         │
│    ┌──────────────┐         │        ┌──────────────┐                    │
│    │ product_key  │         │        │ store_key    │                    │
│    │ SKU          │         │        │ store_name   │                    │
│    │ description  │         │        │ city         │                    │
│    │ brand        │         │        │ square_feet  │                    │
│    │ category     │         │        │ has_bakery   │                    │
│    └──────┬───────┘         │        └──────┬───────┘                    │
│           │                 │               │                            │
│           │                 ▼               │                            │
│           │          ┌─────────────────┐    │                            │
│           └─────────▶│  fact_sales     │◀───┘                            │
│                      │  ─────────────  │                                 │
│                      │  date_key (FK)  │                                 │
│                      │  product_key(FK)│                                 │
│                      │  store_key (FK) │                                 │
│                      │  quantity       │                                 │
│                      │  revenue        │                                 │
│                      │  cost           │                                 │
│                      └─────────────────┘                                 │
│                                                                           │
│   Fact table = center (millions/billions of rows)                        │
│   Dimension tables = rays (relatively small)                             │
│   Queries join fact table to multiple dimensions                         │
└──────────────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Description |
|-----------|-------------|
| **Fact table** | Central table recording events (each row = one event) |
| **Dimension tables** | Describe the who/what/where/when/why of events |
| **Foreign keys** | Fact table references dimensions |
| **Attributes** | Fact table has measures (revenue, cost); dimensions have descriptive fields |

**Fact table characteristics:**

- Can be enormous (petabytes)
- Each row represents one event (one sale, one click)
- Immutable log of history (append-only)
- Wide tables (often 100+ columns)

**Dimension table characteristics:**

- Smaller than fact tables
- Provide context for analysis
- Often wide (many metadata fields)
- Examples: date, product, customer, store, employee

**Snowflake schema:**

Dimensions are further normalized:

```
dim_product → dim_brand (FK)
            → dim_category (FK)
```

Star schemas are simpler; snowflake schemas are more normalized. Star schemas often preferred for analyst simplicity.

**One Big Table (OBT):**

Take denormalization further: fold all dimensions into the fact table. Requires more storage but can speed up queries.

```
fact_sales_denormalized:
┌────────────────────────────────────────┐
│ date, day_of_week, is_holiday,         │
│ product_SKU, product_brand, category,  │
│ store_name, store_city, square_feet,   │
│ quantity, revenue, cost                │
└────────────────────────────────────────┘
```

**When denormalization is OK:**

In analytics, data is historical and immutable. The consistency and write overhead issues that plague OLTP denormalization don't apply—the data won't change.

> **💡 Insight**
>
> Star and snowflake schemas are optimized for OLAP (Online Analytical Processing) not OLTP (Online Transaction Processing). Fact tables are many-to-one relationships materialized: many sales for one product, one store, one date. Queries aggregate across millions of events to answer business questions like "What were our top-selling products last quarter?"

---

## 6. Summary

In this chapter, we explored the landscape of data models and query languages:

**Core insight:** Data models are the most important abstraction in software. They shape how you think about problems and determine what's easy or hard to express.

**Major data models:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA MODEL SELECTION GUIDE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   RELATIONAL MODEL                                                       │
│   ─────────────────                                                      │
│   ✓ Business data, analytics, transactions                              │
│   ✓ Complex queries, joins, ACID guarantees                             │
│   ✓ Star/snowflake schemas for warehouses                               │
│   ✗ Rigid schemas, object-relational mismatch                           │
│                                                                          │
│   DOCUMENT MODEL                                                         │
│   ──────────────                                                         │
│   ✓ Self-contained JSON documents, tree structures                      │
│   ✓ Schema flexibility, one-to-many relationships                       │
│   ✓ Data locality for reads                                             │
│   ✗ Weak join support, many-to-many awkward                             │
│                                                                          │
│   GRAPH MODEL                                                            │
│   ────────────                                                           │
│   ✓ Highly connected data, many-to-many everywhere                      │
│   ✓ Recursive queries, path traversals                                  │
│   ✓ Heterogeneous types, evolving schemas                               │
│   ✗ Overkill for simple relationships                                   │
│                                                                          │
│   EVENT SOURCING                                                         │
│   ──────────────                                                         │
│   ✓ Audit trails, temporal queries, debugging                           │
│   ✓ Multiple read models from one source                                │
│   ✓ Reversibility, evolution                                            │
│   ✗ Complexity, external data handling, GDPR challenges                 │
│                                                                          │
│   DATAFRAMES                                                             │
│   ──────────                                                             │
│   ✓ Data science, ML, statistical analysis                              │
│   ✓ Transform relational → matrix                                       │
│   ✓ Scientific computing, time series                                   │
│   ✗ Not for OLTP, schema-less wrangling                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Query languages:**

| Language | Model | Style | Use Case |
|----------|-------|-------|----------|
| **SQL** | Relational | Declarative | Business queries, analytics |
| **MongoDB aggregation** | Document | Declarative (JSON) | Document queries, ETL |
| **Cypher** | Property graph | Declarative (patterns) | Social networks, recommendations |
| **SPARQL** | Triple-store | Declarative (patterns) | Knowledge graphs, linked data |
| **Datalog** | Relational/graph | Rule-based | Complex recursive queries |
| **GraphQL** | Any | Declarative (restricted) | Client-server API |

**Convergence trends:**

- Relational databases added JSON support
- Document databases added joins and indexes
- Graph query language (GQL) coming to SQL standard
- Hybrid models increasingly common

**Schema approaches:**

- **Schema-on-write** (relational): Enforce structure when data is written
- **Schema-on-read** (document): Interpret structure when data is read
- Both have valid use cases

> **💡 Insight**
>
> One model can emulate another (graph data in relational DB), but the result can be awkward (31-line SQL vs 4-line Cypher). Specialized databases optimize for their data model, but there's also a trend for databases to expand into neighboring niches. The future is likely hybrid models that support multiple paradigms.

**What we didn't cover:**

- **Genome databases** (sequence-similarity searches)
- **Ledgers** (double-entry accounting, blockchains)
- **Full-text search** (information retrieval, vector search)
- **Time-series databases** (optimized for temporal data)
- **Spatial databases** (GIS, location queries)

In the next chapter, we'll discuss the trade-offs in implementing these data models at the storage engine level.

---

**Previous:** [Chapter 2](chapter02-nonfunctional-requirements.md) | **Next:** [Chapter 4](chapter04-storage-retrieval.md)
