# 3. Data Models and Query Languages

_The limits of my language mean the limits of my world._

— Ludwig Wittgenstein, Tractus Logico-Philosophicus (1922)

---

**Previous:** [Chapter 2: Defining Nonfunctional Requirements](02-nonfunctional-requirements.md) | **Next:** [Chapter 4: Storage and Retrieval](04-storage-retrieval.md)

---

## Table of Contents

1. [The Importance of Data Models](#1-the-importance-of-data-models)
2. [Layered Data Models](#2-layered-data-models)
3. [Relational versus Document Models](#3-relational-versus-document-models)
   - 3.1. [The Object-Relational Mismatch](#31-the-object-relational-mismatch)
   - 3.2. [Document Models for One-to-Many](#32-document-models-for-one-to-many)
   - 3.3. [Normalization versus Denormalization](#33-normalization-versus-denormalization)
   - 3.4. [Many-to-One and Many-to-Many Relationships](#34-many-to-one-and-many-to-many-relationships)
4. [Schema Flexibility](#4-schema-flexibility)
   - 4.1. [Schema-on-Read versus Schema-on-Write](#41-schema-on-read-versus-schema-on-write)
   - 4.2. [Data Locality](#42-data-locality)
5. [Graph-Like Data Models](#5-graph-like-data-models)
   - 5.1. [Property Graphs](#51-property-graphs)
   - 5.2. [Query Languages for Graphs](#52-query-languages-for-graphs)
   - 5.3. [Triple Stores and RDF](#53-triple-stores-and-rdf)
6. [Query Languages Comparison](#6-query-languages-comparison)
7. [When to Use Which Model](#7-when-to-use-which-model)
8. [Summary](#8-summary)

---

## 1. The Importance of Data Models

**In plain English:** Data models are the most important part of developing software because they shape not just how you write code, but how you think about problems. Different data models make different things easy or hard.

**In technical terms:** Data models define how data is represented, stored, queried, and manipulated, fundamentally influencing application architecture, performance characteristics, and development patterns.

**Why it matters:** The data model you choose early in a project affects every subsequent technical decision. Wrong data model choices can make simple operations complex and limit your system's evolution.

```
Data Model Impact Hierarchy
───────────────────────────────────────

Problem Domain
      ↓
┌─────────────────────────────────────┐
│ Real World Entities & Relationships │
│ (People, Organizations, Events)     │
└─────────────────────────────────────┘
      ↓
Application Data Model
      ↓
┌─────────────────────────────────────┐
│ Objects, Structs, Classes, APIs     │
│ (User, Order, Payment classes)      │
└─────────────────────────────────────┘
      ↓
Storage Data Model
      ↓
┌─────────────────────────────────────┐
│ Tables, Documents, Vertices, Edges  │
│ (SQL tables, JSON docs, Graph DB)  │
└─────────────────────────────────────┘
      ↓
Physical Representation
      ↓
┌─────────────────────────────────────┐
│ Bytes in memory, disk, network      │
│ (B-trees, LSM-trees, Hash indexes) │
└─────────────────────────────────────┘
```

> **💡 Insight**
>
> Each layer abstracts the complexity of the layer below it, allowing different groups of people to work together effectively. Database engineers optimize storage while application developers focus on business logic.

---

## 2. Layered Data Models

**In plain English:** Think of data models as layers in a building—each floor hides the complexity of what's below while providing a clean, usable surface for what's above.

**In technical terms:** Data models form abstraction layers where each level provides a clean interface while hiding implementation details from higher levels, enabling separation of concerns and independent evolution.

**Why it matters:** Understanding these layers helps you choose the right tool for each layer and understand how changes at one layer affect others.

### 2.1. The Four-Layer Architecture

```
Data Model Abstraction Layers
───────────────────────────────────────

Layer 4: Application Logic
┌─────────────────────────────────────┐
│ Business Objects & Domain Models    │
│ • User profiles, shopping carts     │
│ • Order processing, recommendations │
│ • Application-specific workflows    │
└─────────────────────────────────────┘
              ↕ APIs
Layer 3: Data Storage Model
┌─────────────────────────────────────┐
│ General-purpose data structures     │
│ • Relational tables (SQL)          │
│ • JSON documents (NoSQL)           │
│ • Graph vertices/edges              │
│ • Key-value pairs                   │
└─────────────────────────────────────┘
              ↕ Storage Engine APIs
Layer 2: Physical Storage
┌─────────────────────────────────────┐
│ Storage engine implementations      │
│ • B-trees, LSM-trees               │
│ • Hash indexes, Bloom filters       │
│ • Memory management, disk I/O       │
└─────────────────────────────────────┘
              ↕ Hardware Interface
Layer 1: Hardware
┌─────────────────────────────────────┐
│ Physical representation            │
│ • Electrical currents, magnetic    │
│ • fields, pulses of light          │
│ • SSD flash memory, disk platters  │
└─────────────────────────────────────┘
```

### 2.2. Declarative Query Languages

**In plain English:** Declarative languages let you specify what you want without explaining how to get it—like ordering from a menu versus giving the chef step-by-step cooking instructions.

**In technical terms:** Declarative query languages (SQL, Cypher, SPARQL, Datalog) specify result patterns and constraints while query optimizers determine execution strategies, enabling performance improvements without query changes.

**Why it matters:** Declarative queries are more concise, hide implementation complexity, and can be automatically optimized and parallelized by the database system.

```
Imperative vs Declarative Approaches
───────────────────────────────────────

Imperative (How):                 Declarative (What):
Algorithm Step-by-Step           Pattern & Constraints
         ↓                             ↓
┌─────────────────────┐      ┌─────────────────────┐
│ 1. Open file        │      │ SELECT name, age    │
│ 2. Read each line   │      │ FROM users          │
│ 3. Parse fields     │      │ WHERE age > 25      │
│ 4. Check age > 25   │      │ ORDER BY age DESC   │
│ 5. Sort by age      │      └─────────────────────┘
│ 6. Format output    │              ↓
└─────────────────────┘      Query optimizer decides:
         ↓                   • Which indexes to use
   Fixed implementation      • Join algorithms
   Hard to parallelize      • Execution order
   Manual optimization      • Parallel execution
```

---

## 3. Relational versus Document Models

**In plain English:** Relational databases organize data like spreadsheets with strict rows and columns, while document databases store data like flexible JSON objects that can have different structures.

**In technical terms:** The relational model normalizes data into tables with fixed schemas and relationships via foreign keys, while document models store denormalized, semi-structured data with flexible schemas.

**Why it matters:** Each model excels at different types of applications and relationships. Understanding their trade-offs helps you choose the right tool for your specific use case.

### 3.1. The Object-Relational Mismatch

**In plain English:** Most applications are written in object-oriented languages, but relational databases store data in tables. This creates an awkward translation layer—like trying to stuff a complex 3D object into flat 2D boxes.

**In technical terms:** The impedance mismatch between object-oriented application code and relational table structures requires translation layers (ORMs) that introduce complexity and performance concerns.

**Why it matters:** This mismatch affects development velocity, query performance, and architectural decisions. Understanding it helps you evaluate when ORMs help versus when they hinder.

```
Object-Relational Impedance Mismatch
───────────────────────────────────────

Application Code (Objects):
┌─────────────────────────────────────┐
│ class User {                        │
│   String name;                      │
│   List<Position> positions;         │
│   List<Education> education;        │
│   ContactInfo contact;              │
│ }                                   │
└─────────────────────────────────────┘
           ↕ Translation Required
Database Schema (Tables):
┌─────────────────────────────────────┐
│ users         positions            │
│ ┌─────────┐   ┌─────────────────┐   │
│ │id  name │   │id user_id title │   │
│ │1   Bob  │   │1  1       CEO   │   │
│ └─────────┘   │2  1       CTO   │   │
│               └─────────────────┘   │
│                                     │
│ education     contact_info          │
│ ┌───────────┐ ┌─────────────────┐   │
│ │id  school │ │id  website email│   │
│ │1   MIT    │ │1   bob.com  ... │   │
│ └───────────┘ └─────────────────┘   │
└─────────────────────────────────────┘

Problems:
• Multiple queries required to load one object
• Complex joins across tables
• ORM complexity and N+1 query problems
• Schema changes require migrations
```

#### ORM Trade-offs

```
ORM Benefits vs Drawbacks
───────────────────────────────────────

Benefits:                    Drawbacks:
✓ Reduced boilerplate       ❌ Can't hide model differences
✓ Object-oriented interface ❌ Complex abstraction
✓ Query result caching      ❌ N+1 query problems
✓ Schema migration tools    ❌ Inefficient SQL generation
✓ Database portability      ❌ Limited to OLTP systems

Example N+1 Problem:
// Innocent-looking ORM code:
users = User.all()                    // 1 query
for user in users:
    print(user.comments.count())      // N queries!

// Result: 1 + N queries instead of 1 join query
// Performance degrades with user count
```

### 3.2. Document Models for One-to-Many

**In plain English:** For data that naturally forms a tree structure (like a resume with multiple jobs and education entries), document models can store everything together in one place, like keeping a complete file folder rather than spreading it across multiple filing cabinets.

**In technical terms:** Document models excel at representing one-to-many relationships through nested structures, providing better locality and eliminating joins for tree-structured data access patterns.

**Why it matters:** When your data naturally forms hierarchical relationships and you typically access complete object graphs, document models can simplify both code and performance.

#### JSON Document Example

```json
{
  "user_id": 251,
  "first_name": "Barack",
  "last_name": "Obama",
  "headline": "Former President of the United States",
  "region_id": "us:91",
  "positions": [
    {"job_title": "President", "organization": "United States of America"},
    {"job_title": "US Senator (D-IL)", "organization": "United States Senate"}
  ],
  "education": [
    {"school_name": "Harvard University", "start": 1988, "end": 1991},
    {"school_name": "Columbia University", "start": 1981, "end": 1983}
  ],
  "contact_info": {
    "website": "https://barackobama.com",
    "twitter": "https://twitter.com/barackobama"
  }
}
```

```
Document vs Relational Access Patterns
───────────────────────────────────────

Document Model:
┌─────────────────────────────────────┐
│ Single query:                       │
│ db.users.findOne({_id: 251})        │
│                                     │
│ Result: Complete profile in one     │
│ network roundtrip with all          │
│ positions, education, contacts      │
└─────────────────────────────────────┘

Relational Model:
┌─────────────────────────────────────┐
│ Multiple queries:                   │
│ 1. SELECT * FROM users WHERE id=251 │
│ 2. SELECT * FROM positions WHERE... │
│ 3. SELECT * FROM education WHERE... │
│ 4. SELECT * FROM contact_info...    │
│                                     │
│ OR complex joins with multiple      │
│ table relationships                 │
└─────────────────────────────────────┘
```

### 3.3. Normalization versus Denormalization

**In plain English:** Normalization is like having one authoritative contact list that everyone refers to—changes are easy but you need to look things up. Denormalization is like everyone keeping their own copy—faster access but updating is harder.

**In technical terms:** Normalization stores data in canonical form with references (faster writes, consistent updates), while denormalization duplicates data for access optimization (faster reads, more storage and update complexity).

**Why it matters:** This trade-off between read performance and write complexity affects every aspect of your system design, from schema structure to operational procedures.

#### Normalization Example

```
Normalized Data Structure
───────────────────────────────────────

users table:
┌─────────────────────────────────────┐
│ id  name    region_id               │
│ 1   Alice   25                      │
│ 2   Bob     25                      │
│ 3   Carol   30                      │
└─────────────────────────────────────┘

regions table:
┌─────────────────────────────────────┐
│ id  region_name                     │
│ 25  Washington, DC                  │
│ 30  New York, NY                    │
└─────────────────────────────────────┘

Benefits:
✓ Single source of truth for region names
✓ Easy to update region names globally
✓ No duplicate data
✓ Referential integrity

Query requirement:
SELECT users.name, regions.region_name
FROM users JOIN regions ON users.region_id = regions.id
```

#### Denormalization Example

```
Denormalized Data Structure
───────────────────────────────────────

users table:
┌─────────────────────────────────────┐
│ id  name    region_name             │
│ 1   Alice   Washington, DC          │
│ 2   Bob     Washington, DC          │
│ 3   Carol   New York, NY            │
└─────────────────────────────────────┘

Benefits:
✓ No joins required for queries
✓ Better query performance
✓ Simpler application code
✓ Better caching locality

Drawbacks:
❌ Duplicate data storage
❌ Update multiple rows for region name changes
❌ Risk of inconsistent data
❌ More complex write operations

Simple query:
SELECT name, region_name FROM users WHERE id = 1
```

#### Trade-off Analysis

```
Normalization vs Denormalization Trade-offs
───────────────────────────────────────

                 Normalized    Denormalized
                     ↓             ↓
Write Performance   Fast          Slow
Read Performance    Slow          Fast
Storage Space       Low           High
Data Consistency    High          Risk
Schema Changes      Easy          Hard
Query Complexity    High          Low

Use Cases:
Normalized:          Denormalized:
• OLTP systems      • Analytics systems
• Frequent updates  • Read-heavy workloads
• Data consistency  • Data warehouses
• Small-scale       • Large-scale reads
```

> **💡 Insight**
>
> The choice between normalization and denormalization isn't binary—most real systems use both approaches in different areas. Social media platforms denormalize timelines for read performance but normalize user profiles for consistency.

### 3.4. Many-to-One and Many-to-Many Relationships

**In plain English:** Many-to-one is like multiple people living in the same city. Many-to-many is like multiple people working for multiple companies throughout their careers—these complex relationships are where different data models really show their strengths and weaknesses.

**In technical terms:** Many-to-many relationships require junction tables in relational models and reference arrays in document models, with each approach having different performance and consistency characteristics.

**Why it matters:** Complex relationships are where your data model choice has the biggest impact on query complexity, performance, and system evolution capabilities.

```
Relationship Types in Data Models
───────────────────────────────────────

One-to-Many (Easy in documents):
User → Multiple Positions
┌─────────────┐    ┌─────────────┐
│    User     │──→ │  Position 1 │
│             │──→ │  Position 2 │
│             │──→ │  Position 3 │
└─────────────┘    └─────────────┘

Many-to-Many (Complex in documents):
Users ↔ Organizations
┌─────────────┐    ┌─────────────┐
│   Alice     │←──→│  Google     │
│             │    │             │
│   Bob       │←──→│  Microsoft  │
│             │    │             │
│   Carol     │    │             │
└─────────────┘    └─────────────┘
```

#### Relational Many-to-Many

```sql
-- Junction table approach
CREATE TABLE user_organizations (
    user_id INTEGER REFERENCES users(id),
    org_id INTEGER REFERENCES organizations(id),
    start_date DATE,
    end_date DATE,
    position VARCHAR(100),
    PRIMARY KEY (user_id, org_id, start_date)
);

-- Query both directions efficiently
-- Find all organizations for a user:
SELECT o.name FROM organizations o
JOIN user_organizations uo ON o.id = uo.org_id
WHERE uo.user_id = 251;

-- Find all users for an organization:
SELECT u.name FROM users u
JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.org_id = 15;
```

#### Document Many-to-Many

```javascript
// Option 1: Embed references (denormalized)
{
  "user_id": 251,
  "name": "Alice",
  "organizations": [
    {"org_id": 15, "name": "Google", "position": "Engineer"},
    {"org_id": 23, "name": "Microsoft", "position": "Senior Engineer"}
  ]
}

// Problem: Organization name changes require updating all user documents

// Option 2: Reference only (normalized)
{
  "user_id": 251,
  "name": "Alice",
  "organization_ids": [15, 23]
}

// Requires application-level joins or $lookup operations
db.users.aggregate([
  { $match: { _id: 251 } },
  { $lookup: {
      from: "organizations",
      localField: "organization_ids",
      foreignField: "_id",
      as: "organizations"
  }}
]);
```

---

## 4. Schema Flexibility

**In plain English:** Schema flexibility is about whether you define the structure of your data upfront (like designing a form before people fill it out) or figure it out as you go (like letting people write free-form responses you organize later).

**In technical terms:** Schema flexibility contrasts schema-on-write (enforce structure at write time) with schema-on-read (interpret structure at read time), each with different implications for data evolution and application complexity.

**Why it matters:** Your approach to schema flexibility affects how easily you can evolve your application over time and how you handle heterogeneous data from different sources.

### 4.1. Schema-on-Read versus Schema-on-Write

```
Schema Enforcement Approaches
───────────────────────────────────────

Schema-on-Write (Traditional SQL):
┌─────────────────────────────────────┐
│ Database enforces schema            │
│                                     │
│ Write Time:                         │
│ ┌─────────────┐  ┌─────────────┐    │
│ │ Application │─→│  Database   │    │
│ │    Data     │  │ ✓ Validates │    │
│ │             │  │ ✓ Enforces  │    │
│ │             │  │ ❌ Rejects   │    │
│ └─────────────┘  └─────────────┘    │
│                                     │
│ Read Time: Structure guaranteed     │
└─────────────────────────────────────┘

Schema-on-Read (Document DBs):
┌─────────────────────────────────────┐
│ Application handles schema          │
│                                     │
│ Write Time:                         │
│ ┌─────────────┐  ┌─────────────┐    │
│ │ Application │─→│  Database   │    │
│ │    Data     │  │ ✓ Stores    │    │
│ │             │  │   anything  │    │
│ └─────────────┘  └─────────────┘    │
│                                     │
│ Read Time: Application validates    │
│ and handles missing fields          │
└─────────────────────────────────────┘
```

#### Schema Evolution Example

**Schema-on-Write Evolution:**
```sql
-- Traditional migration approach
ALTER TABLE users ADD COLUMN first_name VARCHAR(50);
UPDATE users SET first_name = split_part(name, ' ', 1);
-- All existing data must be updated
```

**Schema-on-Read Evolution:**
```javascript
// Gradual migration in application code
if (user && user.name && !user.first_name) {
  // Handle old format
  user.first_name = user.name.split(" ")[0];
}
// New documents automatically use new schema
```

### 4.2. Data Locality

**In plain English:** Data locality is about keeping related information physically close together on disk, like keeping all chapters of a book in one file rather than scattering them across different folders.

**In technical terms:** Document models provide storage locality by keeping related data in contiguous disk blocks, reducing I/O operations for accessing complete object graphs, but at the cost of requiring full document reads for partial updates.

**Why it matters:** Data locality can significantly improve performance for workloads that typically access entire objects, but can hurt performance when you frequently need only small parts of large documents.

```
Data Locality Comparison
───────────────────────────────────────

Document Model (Good Locality):
┌─────────────────────────────────────┐
│ Disk Block 1                        │
│ ┌─────────────────────────────────┐ │
│ │ User: {                         │ │
│ │   name: "Alice",                │ │
│ │   positions: [...],             │ │
│ │   education: [...],             │ │
│ │   contact: {...}                │ │
│ │ }                               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
Single disk read → Complete object

Relational Model (Poor Locality):
┌─────────────────────────────────────┐
│ Disk Block 1: users table          │
│ Disk Block 5: positions table      │
│ Disk Block 12: education table     │
│ Disk Block 18: contact_info table  │
└─────────────────────────────────────┘
Multiple disk reads → Complete object

Trade-offs:
✓ Good for: Complete object access
❌ Bad for: Partial updates, large documents
❌ Bad for: Frequent small field updates
```

---

## 5. Graph-Like Data Models

**In plain English:** Graph databases are perfect for data that's naturally interconnected, like social networks, recommendation systems, or knowledge bases. Instead of forcing relationships into tables or documents, graphs make relationships first-class citizens.

**In technical terms:** Graph models represent data as vertices (entities) and edges (relationships) with properties on both, optimized for traversing complex relationship patterns and multi-hop queries.

**Why it matters:** When your application is fundamentally about relationships and connections, graph models can turn complex multi-table joins into simple, intuitive traversals.

### 5.1. Property Graphs

```
Graph Model Structure
───────────────────────────────────────

Vertices (Nodes):                 Edges (Relationships):
┌─────────────────────────┐       ┌─────────────────────────┐
│ • Unique ID             │       │ • Unique ID             │
│ • Label (type)          │       │ • Start vertex          │
│ • Properties (key-val)  │       │ • End vertex            │
│ • Incoming edges        │       │ • Label (type)          │
│ • Outgoing edges        │       │ • Properties (key-val)  │
└─────────────────────────┘       └─────────────────────────┘

Example Graph:
     (Alice:Person)
         │ :BORN_IN
         ↓
    (Idaho:State)────:WITHIN───→(USA:Country)
         ↑                           ↑
         │ :LIVES_IN                 │
         │                    :WITHIN
    (London:City)                    │
         ↑                           │
         │ :LIVES_IN             (Europe:Continent)
         │
    (Bob:Person)
```

#### Property Graph as Relations

```sql
-- Representing graphs in relational form
CREATE TABLE vertices (
    vertex_id   INTEGER PRIMARY KEY,
    label       TEXT,
    properties  JSONB
);

CREATE TABLE edges (
    edge_id     INTEGER PRIMARY KEY,
    tail_vertex INTEGER REFERENCES vertices (vertex_id),
    head_vertex INTEGER REFERENCES vertices (vertex_id),
    label       TEXT,
    properties  JSONB
);

-- Indexes for graph traversal
CREATE INDEX edges_tails ON edges (tail_vertex);
CREATE INDEX edges_heads ON edges (head_vertex);
```

### 5.2. Query Languages for Graphs

#### Learn by Doing: Graph Query Design

I've set up a social network graph database with people, locations, and relationships. The system needs to implement a feature that finds potential mutual connections between users to suggest new friendships.

● **Learn by Doing**

**Context:** We have a property graph with Person and Location vertices connected by :KNOWS, :LIVES_IN, :BORN_IN, and :WITHIN relationships. Users want to discover people they might know through mutual connections or shared locations.

**Your Task:** In the `graph_queries.cypher` file, implement a query that finds potential connections for a given user. Look for TODO(human). The query should find people who share mutual friends or have lived in the same locations.

**Guidance:** Consider using Cypher's pattern matching to find paths like: (person1)-[:KNOWS]-(mutualFriend)-[:KNOWS]-(person2) or location-based connections through shared places. Think about how to rank suggestions by connection strength and avoid suggesting existing connections.

```cypher
// TODO(human): Implement friend suggestion query
MATCH (user:Person {name: 'Alice'})
// Find potential connections through mutual friends and shared locations
// Return ranked suggestions with connection reasons
```

#### Cypher Query Examples

```cypher
-- Find people who emigrated from US to Europe
MATCH
  (person) -[:BORN_IN]->  () -[:WITHIN*0..]-> (:Location {name:'United States'}),
  (person) -[:LIVES_IN]-> () -[:WITHIN*0..]-> (:Location {name:'Europe'})
RETURN person.name;

-- Variable-length relationships with *0..
-- means "follow WITHIN edges zero or more times"
```

#### Equivalent SQL (Complex!)

```sql
-- Same query in SQL using recursive CTEs
WITH RECURSIVE
  in_usa(vertex_id) AS (
    SELECT vertex_id FROM vertices
    WHERE label = 'Location' AND properties->>'name' = 'United States'
    UNION
    SELECT edges.tail_vertex FROM edges
    JOIN in_usa ON edges.head_vertex = in_usa.vertex_id
    WHERE edges.label = 'within'
  ),
  -- ... many more CTEs needed ...
SELECT vertices.properties->>'name'
FROM vertices
JOIN born_in_usa ON vertices.vertex_id = born_in_usa.vertex_id
JOIN lives_in_europe ON vertices.vertex_id = lives_in_europe.vertex_id;
```

> **💡 Insight**
>
> Graph databases excel at queries involving variable-length paths and complex relationship patterns. What requires dozens of lines of recursive SQL can often be expressed in a few lines of Cypher.

### 5.3. Triple Stores and RDF

**In plain English:** Triple stores organize information as simple three-part facts: "Alice knows Bob", "Bob lives-in London", "London located-in England". It's like building knowledge from atomic facts that can be combined.

**In technical terms:** The RDF (Resource Description Framework) model represents data as subject-predicate-object triples, designed for semantic web applications and knowledge graphs with standardized vocabularies.

**Why it matters:** Triple stores excel at integrating heterogeneous data sources and enabling semantic queries across different domains using standardized ontologies.

```
Triple Store Structure
───────────────────────────────────────

Fact: "Alice knows Bob"
┌─────────────────────────────────────┐
│ Subject    Predicate    Object      │
│ Alice      knows        Bob         │
│                                     │
│ More examples:                      │
│ Alice      born-in      Idaho       │
│ Idaho      within       USA         │
│ Bob        lives-in     London      │
│ London     within       England     │
└─────────────────────────────────────┘

RDF/Turtle Syntax:
@prefix : <http://example.org/> .
:alice :knows :bob .
:alice :bornIn :idaho .
:idaho :within :usa .
```

---

## 6. Query Languages Comparison

**In plain English:** Different data models have different query languages, each optimized for their strengths. It's like having different tools for different jobs—you wouldn't use a hammer for everything.

**In technical terms:** Query language design reflects the underlying data model's strengths: SQL for relational operations, MongoDB aggregation for document processing, Cypher for graph traversal, and SPARQL for semantic queries.

**Why it matters:** Understanding query language capabilities helps you evaluate data models beyond just storage—the query interface often determines application complexity and performance.

```
Query Language Comparison
───────────────────────────────────────

SQL (Relational):
• Strong: Joins, aggregations, ACID transactions
• Weak: Hierarchical data, variable-length paths
• Syntax: English-like declarative statements

MongoDB Aggregation (Document):
• Strong: Document processing, nested data
• Weak: Cross-document joins, graph queries
• Syntax: JSON pipeline stages

Cypher (Graph):
• Strong: Pattern matching, path traversal
• Weak: Aggregations, large result sets
• Syntax: ASCII art patterns

SPARQL (RDF/Triple):
• Strong: Semantic queries, data integration
• Weak: Performance at scale, complex analytics
• Syntax: Similar to SQL but for triples

GraphQL (API Query):
• Strong: Client-specified data shapes
• Weak: Complex queries, server-side operations
• Syntax: JSON-like field selection
```

#### Example: Same Data, Different Languages

Finding user profiles with contact information:

```sql
-- SQL
SELECT u.name, u.email, p.phone
FROM users u
LEFT JOIN phone_numbers p ON u.id = p.user_id
WHERE u.active = true;
```

```javascript
// MongoDB
db.users.find(
  { active: true },
  { name: 1, email: 1, "contact.phone": 1 }
)
```

```cypher
// Cypher
MATCH (u:User {active: true})
OPTIONAL MATCH (u)-[:HAS_CONTACT]->(c:Contact)
RETURN u.name, u.email, c.phone
```

---

## 7. When to Use Which Model

**In plain English:** Choose your data model based on your data's natural structure and access patterns. Don't force square pegs into round holes—each model has sweet spots where it excels.

**In technical terms:** Data model selection should optimize for your application's relationship patterns, consistency requirements, scalability needs, and query characteristics while considering operational complexity.

**Why it matters:** The wrong data model choice can turn simple operations into complex ones and limit your system's ability to scale and evolve. Early decisions have long-term consequences.

### 7.1. Decision Framework

```
Data Model Selection Matrix
───────────────────────────────────────

Relational Model:
✓ ACID transactions required
✓ Complex queries with joins
✓ Well-understood relationships
✓ Mature tooling ecosystem
✓ Strong consistency needs
❌ Rigid schema evolution
❌ Object-relational impedance
❌ Scaling limitations

Document Model:
✓ Schema flexibility needed
✓ Tree-structured data
✓ Rapid development cycles
✓ Horizontal scaling
✓ Data locality benefits
❌ Limited join support
❌ Consistency challenges
❌ Query complexity for relations

Graph Model:
✓ Relationship-heavy data
✓ Recommendation systems
✓ Network analysis
✓ Variable-length paths
✓ Data integration needs
❌ Not optimized for aggregations
❌ Learning curve for teams
❌ Limited analytics capabilities
```

### 7.2. Hybrid Approaches

**In plain English:** You don't have to pick just one model. Many successful systems use different models for different parts of their data—like using the best tool for each specific job.

**In technical terms:** Polyglot persistence involves using multiple data models within the same application, with each optimized for specific access patterns, consistency requirements, and performance characteristics.

**Why it matters:** Real applications rarely fit perfectly into a single data model. Understanding how to combine models effectively can give you the benefits of each without their limitations.

```
Polyglot Persistence Example: E-commerce
───────────────────────────────────────

User Profiles & Orders → Relational Database
┌─────────────────────────────────────┐
│ • ACID transactions for payments    │
│ • Consistent inventory tracking     │
│ • Complex reporting queries         │
│ • Mature tooling and operations     │
└─────────────────────────────────────┘

Product Catalog → Document Database
┌─────────────────────────────────────┐
│ • Flexible product attributes       │
│ • Rich product descriptions         │
│ • Fast read performance             │
│ • Easy schema evolution             │
└─────────────────────────────────────┘

Recommendations → Graph Database
┌─────────────────────────────────────┐
│ • User behavior networks            │
│ • Product similarity graphs         │
│ • "Customers who bought X..." queries│
│ • Social recommendation features    │
└─────────────────────────────────────┘

Session Data → Key-Value Store
┌─────────────────────────────────────┐
│ • Shopping cart contents            │
│ • User preferences and settings     │
│ • High-performance caching          │
│ • Temporary data with TTL           │
└─────────────────────────────────────┘
```

---

## 8. Summary

This chapter explored the fundamental data models that shape how we think about and work with data. Key insights:

### 8.1. Data Model Principles

**Layered Abstractions:**
- Each data model layer hides complexity from the layer above
- Application, storage, physical, and hardware layers have different concerns
- Declarative query languages enable optimization and evolution

**Model Characteristics:**
- **Relational**: Structured, consistent, strong joins, ACID properties
- **Document**: Flexible, hierarchical, good locality, schema-on-read
- **Graph**: Relationship-focused, flexible structure, complex traversals

### 8.2. Key Trade-offs

**Schema Flexibility vs Consistency:**
- Schema-on-write: Structure enforced, consistent but rigid
- Schema-on-read: Flexible but application complexity

**Normalization vs Denormalization:**
- Normalized: Consistent, space-efficient, complex queries
- Denormalized: Fast reads, data duplication, update complexity

**Data Locality vs Update Efficiency:**
- Documents: Great locality, full document updates required
- Relations: Efficient updates, multiple I/O for object reconstruction

### 8.3. Selection Guidelines

**Choose Relational When:**
- ACID transactions are critical
- Complex analytical queries needed
- Well-defined, stable relationships
- Strong consistency requirements

**Choose Document When:**
- Schema needs to evolve frequently
- Data naturally tree-structured
- Application development speed priority
- Read-heavy workloads with locality

**Choose Graph When:**
- Relationships are first-class citizens
- Variable-length path queries common
- Network effects and recommendations
- Data integration across domains

> **💡 Insight**
>
> The most successful systems often use multiple data models strategically—relational for transactions, documents for content, graphs for recommendations, and key-value stores for caching. The key is matching each data model to its optimal use case.

### 8.4. Evolution and Convergence

Modern databases increasingly support multiple models:
- **Relational databases** add JSON support and graph queries
- **Document databases** add joins and schema validation
- **Graph databases** add analytical capabilities
- **Multi-model databases** provide unified interfaces

This convergence gives developers more flexibility while preserving the core strengths of each approach.

---

**Previous:** [Chapter 2: Defining Nonfunctional Requirements](02-nonfunctional-requirements.md) | **Next:** [Chapter 4: Storage and Retrieval](04-storage-retrieval.md)

---

_The data model you choose shapes not just your code, but how you think about problems_