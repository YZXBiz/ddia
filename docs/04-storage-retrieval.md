# 4. Storage and Retrieval

_One of the miseries of life is that everybody names things a little bit wrong. And so it makes everything a little harder to understand in the world than it would be if it were named differently. A computer does not primarily compute in the sense of doing arithmetic. […] They primarily are filing systems._

— Richard Feynman, Idiosyncratic Thinking seminar (1985)

---

**Previous:** [Chapter 3: Data Models and Query Languages](03-data-models-query-languages.md) | **Next:** [Chapter 5: Encoding and Evolution](05-encoding-evolution.md)

---

## Table of Contents

1. [Fundamentals of Storage and Retrieval](#1-fundamentals-of-storage-and-retrieval)
2. [The World's Simplest Database](#2-the-worlds-simplest-database)
3. [Log-Structured Storage Engines](#3-log-structured-storage-engines)
   - 3.1. [Hash Indexes](#31-hash-indexes)
   - 3.2. [SSTables and LSM-Trees](#32-sstables-and-lsm-trees)
   - 3.3. [Bloom Filters](#33-bloom-filters)
   - 3.4. [Compaction Strategies](#34-compaction-strategies)
4. [B-Tree Storage Engines](#4-b-tree-storage-engines)
   - 4.1. [B-Tree Structure](#41-b-tree-structure)
   - 4.2. [Making B-Trees Reliable](#42-making-b-trees-reliable)
   - 4.3. [B-Tree Optimizations](#43-b-tree-optimizations)
5. [Comparing Storage Engines](#5-comparing-storage-engines)
   - 5.1. [LSM-Trees vs B-Trees](#51-lsm-trees-vs-b-trees)
   - 5.2. [Performance Characteristics](#52-performance-characteristics)
6. [Secondary Indexes](#6-secondary-indexes)
7. [Storage for Analytics](#7-storage-for-analytics)
   - 7.1. [Column-Oriented Storage](#71-column-oriented-storage)
   - 7.2. [Column Compression](#72-column-compression)
   - 7.3. [Query Optimization](#73-query-optimization)
8. [Modern Storage Innovations](#8-modern-storage-innovations)
   - 8.1. [Vector Embeddings](#81-vector-embeddings)
   - 8.2. [Materialized Views](#82-materialized-views)
9. [Summary](#9-summary)

---

## 1. Fundamentals of Storage and Retrieval

**In plain English:** At its core, a database does two simple things: it stores data when you give it some, and gives the data back when you ask for it later. Everything else is about making these operations fast, reliable, and scalable.

**In technical terms:** Storage engines implement data structures and algorithms that organize data on disk for efficient reads and writes, balancing trade-offs between write performance, read performance, storage space, and operational complexity.

**Why it matters:** Understanding storage internals helps you choose appropriate databases, configure them for your workload, and debug performance problems. Different storage engines optimize for different use cases.

```
Storage Engine Purpose Hierarchy
───────────────────────────────────────

Application Layer
      ↓
┌─────────────────────────────────────┐
│ "Store user profile"                │
│ "Retrieve order history"            │
│ "Update inventory count"            │
└─────────────────────────────────────┘
      ↓ Query Interface
Data Model Layer
      ↓
┌─────────────────────────────────────┐
│ Tables, Documents, Key-Value pairs  │
│ SQL, MongoDB queries, Redis commands│
└─────────────────────────────────────┘
      ↓ Storage Engine API
Storage Engine Layer
      ↓
┌─────────────────────────────────────┐
│ B-trees, LSM-trees, Hash indexes    │
│ Write-ahead logs, Compaction        │
│ Page management, Buffer pools       │
└─────────────────────────────────────┘
      ↓ File System Interface
Physical Storage
      ↓
┌─────────────────────────────────────┐
│ SSD/HDD sectors, Memory pages       │
│ Disk controllers, File systems      │
└─────────────────────────────────────┘
```

### 1.1. OLTP vs OLAP Storage Requirements

The distinction between transactional and analytical workloads drives storage engine design:

```
OLTP vs OLAP Storage Needs
───────────────────────────────────────

OLTP (Transactional):           OLAP (Analytical):
Fast point queries              Fast aggregations
High write throughput           Bulk data processing
Low latency required           High throughput preferred
Concurrent transactions        Historical analysis
Small result sets              Large result sets

Storage Implications:
↓                              ↓
Row-oriented storage           Column-oriented storage
Index-heavy                    Compression-focused
Write-optimized               Read-optimized
```

---

## 2. The World's Simplest Database

**In plain English:** Let's start by building a database with just two bash functions—one to store data and one to retrieve it. This toy example reveals fundamental concepts that apply to all databases.

**In technical terms:** An append-only log provides excellent write performance but requires full-file scans for reads, demonstrating the need for indexing structures to improve query performance.

**Why it matters:** This simple example illustrates core trade-offs: fast writes vs slow reads, and the role of indexes in bridging that gap. Real databases build on these same principles.

### 2.1. Bash Database Implementation

```bash
#!/bin/bash

# Store key-value pairs
db_set() {
    echo "$1,$2" >> database
}

# Retrieve values by key
db_get() {
    grep "^$1," database | sed -e "s/^$1,//" | tail -n 1
}
```

#### Usage Example

```bash
$ db_set 42 '{"name":"San Francisco","attractions":["Golden Gate Bridge"]}'
$ db_set 12 '{"name":"London","attractions":["Big Ben","London Eye"]}'
$ db_get 42
{"name":"San Francisco","attractions":["Golden Gate Bridge"]}

# Update existing key
$ db_set 42 '{"name":"San Francisco","attractions":["Exploratorium"]}'
$ db_get 42
{"name":"San Francisco","attractions":["Exploratorium"]}

# File contents show append-only nature
$ cat database
42,{"name":"San Francisco","attractions":["Golden Gate Bridge"]}
12,{"name":"London","attractions":["Big Ben","London Eye"]}
42,{"name":"San Francisco","attractions":["Exploratorium"]}
```

### 2.2. Performance Analysis

```
Bash Database Performance
───────────────────────────────────────

Write Performance:
✓ Excellent: O(1) append operation
✓ Sequential disk writes (fastest possible)
✓ No complex data structures to maintain

Read Performance:
❌ Terrible: O(n) full file scan
❌ Gets worse linearly with database size
❌ 1M records = 1M reads for each lookup

Storage Efficiency:
❌ Poor: Never reclaims space from old values
❌ File grows indefinitely
❌ Wasted disk space for updated records
```

> **💡 Insight**
>
> This simple database demonstrates a fundamental principle: append-only logs provide excellent write performance but terrible read performance. All sophisticated storage engines start with this trade-off and add complexity to improve reads without sacrificing write performance.

---

## 3. Log-Structured Storage Engines

**In plain English:** Log-structured storage engines keep the append-only log for fast writes but add clever indexing and compaction strategies to make reads fast too. Think of it as keeping a detailed table of contents for a massive book.

**In technical terms:** Log-structured storage engines maintain append-only data files with separate index structures, using background compaction processes to merge files and reclaim space while serving live traffic.

**Why it matters:** Understanding log-structured storage helps you appreciate systems like Cassandra, HBase, and RocksDB, and when they're the right choice for your application.

### 3.1. Hash Indexes

**In plain English:** The simplest improvement to our bash database is keeping a hash map in memory that points to where each key's latest value is stored on disk. Instead of scanning the whole file, jump directly to the right location.

**In technical terms:** An in-memory hash index maps keys to byte offsets in the log file, providing O(1) average-case read performance while maintaining O(1) write performance through log appends.

**Why it matters:** Hash indexes are simple and fast for point queries, but they have limitations that motivate more sophisticated approaches.

```
Hash Index Structure
───────────────────────────────────────

Memory (Hash Map):
┌─────────────────────────────────────┐
│ Key      → Disk Offset              │
│ "user:1" → 0                        │
│ "user:2" → 73                       │
│ "order:5"→ 156                      │
└─────────────────────────────────────┘
        ↓ Points to
Disk (Log File):
┌─────────────────────────────────────┐
│ 0:    user:1,{"name":"Alice"}       │
│ 73:   user:2,{"name":"Bob"}         │
│ 156:  order:5,{"total":29.99}      │
│ 234:  user:1,{"name":"Alice Smith"} │ ← Update
└─────────────────────────────────────┘

Read Process:
1. Lookup key in hash map → Get offset
2. Seek to offset in file → Read value
3. Return result (no file scanning needed)

Write Process:
1. Append new record to end of file
2. Update hash map with new offset
3. Old record remains but becomes unreachable
```

#### Hash Index Limitations

```
Hash Index Trade-offs
───────────────────────────────────────

Advantages:
✓ O(1) read and write performance
✓ Simple implementation
✓ Excellent for high write loads

Disadvantages:
❌ Hash map must fit in memory
❌ No range queries (can't scan key ranges)
❌ No disk space reclamation
❌ Hash map lost on restart (rebuild required)

Real-world Usage:
• Riak's Bitcask storage engine
• Redis's snapshot persistence
• Apache Kafka's log segments (with modifications)
```

### 3.2. SSTables and LSM-Trees

**In plain English:** Instead of keeping data in random order, what if we sort it by key? Sorted data enables more sophisticated indexing, compression, and merging strategies. This is the core insight behind SSTables.

**In technical terms:** Sorted String Tables (SSTables) store key-value pairs in sorted order, enabling sparse indexing, efficient merging, and range queries while maintaining good write performance through LSM-tree organization.

**Why it matters:** SSTables are the foundation of modern NoSQL databases like Cassandra, HBase, and key-value stores like RocksDB. Understanding them explains how these systems achieve high performance.

```
SSTable Structure
───────────────────────────────────────

Sorted Data File:
┌─────────────────────────────────────┐
│ Block 1: handbag → handcuff         │
│ Block 2: handmade → handsome        │
│ Block 3: handstand → happy          │
│ Block 4: hardware → heartbeat       │
└─────────────────────────────────────┘

Sparse Index (in memory):
┌─────────────────────────────────────┐
│ Key        → Block Offset           │
│ "handbag"  → 0                      │
│ "handmade" → 4096                   │
│ "handstand"→ 8192                   │
│ "hardware" → 12288                  │
└─────────────────────────────────────┘

Query: Find "handiwork"
1. Check sparse index: between "handbag" and "handmade"
2. Read Block 1 (4KB) into memory
3. Binary search within block for "handiwork"
4. Return result or "not found"
```

#### LSM-Tree Architecture

**In plain English:** LSM-trees solve the write problem for sorted data by keeping recent writes in memory (where sorting is fast) and periodically flushing sorted chunks to disk. Background processes merge these chunks to keep reads efficient.

**In technical terms:** Log-Structured Merge-trees maintain a cascade of sorted files with recent data in smaller, newer files and older data in larger, merged files, using background compaction to maintain read performance.

**Why it matters:** LSM-trees power most modern distributed databases because they handle high write loads while keeping reads reasonably fast.

```
LSM-Tree Structure
───────────────────────────────────────

Write Path:
┌─────────────────────────────────────┐
│ 1. Write → Memtable (Red-Black Tree)│
│ 2. Memtable full → Flush to SSTable │
│ 3. Continue with new Memtable       │
└─────────────────────────────────────┘

Storage Hierarchy:
┌─────────────────────────────────────┐
│ Memtable (RAM)                      │
│ ├── Recent writes, sorted in memory │
│ └── Size: ~64MB                     │
│                                     │
│ Level 0 SSTables (Disk)             │
│ ├── Newest: segment-001.sst (64MB)  │
│ ├── Older:  segment-002.sst (64MB)  │
│ └── Oldest: segment-003.sst (64MB)  │
│                                     │
│ Level 1 SSTables (Disk)             │
│ └── Merged: segment-L1-001 (640MB)  │
└─────────────────────────────────────┘

Read Path:
1. Check Memtable first (most recent)
2. Check Level 0 SSTables (newest to oldest)
3. Check Level 1 SSTables
4. Return first match found
```

#### Learn by Doing: LSM-Tree Compaction

I've set up a basic LSM-tree storage engine with multiple SSTable levels. The system needs to implement the compaction logic that decides when and how to merge SSTables to maintain good read performance.

● **Learn by Doing**

**Context:** Our LSM-tree has accumulated several SSTables at different levels, and read performance is starting to degrade because queries need to check too many files. We need to implement a compaction strategy that merges SSTables efficiently.

**Your Task:** In the `lsm_compaction.py` file, implement the `should_compact()` and `select_files_for_compaction()` methods. Look for TODO(human). These methods should decide when compaction is needed and which files to merge based on file sizes and key overlap.

**Guidance:** Consider implementing size-tiered compaction: merge files when you have too many at the same level, or when total size exceeds a threshold. Think about how to balance write amplification (how many times data gets rewritten) with read amplification (how many files need to be checked for a query).

### 3.3. Bloom Filters

**In plain English:** Bloom filters are like a quick "probably not here" check before doing expensive work. They can tell you definitively that something is NOT in a dataset, but they might sometimes say something IS there when it's not (false positives).

**In technical terms:** Bloom filters are space-efficient probabilistic data structures that test set membership using multiple hash functions and a bit array, guaranteeing no false negatives but allowing configurable false positive rates.

**Why it matters:** In LSM-trees, Bloom filters prevent expensive disk reads when searching for non-existent keys, significantly improving performance for read-heavy workloads.

```
Bloom Filter Operation
───────────────────────────────────────

Creation:
┌─────────────────────────────────────┐
│ Bit Array: [0,0,0,0,0,0,0,0,0,0]    │
│                                     │
│ Add "handbag":                      │
│   hash1("handbag") = 2              │
│   hash2("handbag") = 7              │
│   hash3("handbag") = 4              │
│                                     │
│ Result: [0,0,1,0,1,0,0,1,0,0]       │
│                                     │
│ Add "handmade":                     │
│   hash1("handmade") = 1             │
│   hash2("handmade") = 4             │
│   hash3("handmade") = 8             │
│                                     │
│ Result: [0,1,1,0,1,0,0,1,1,0]       │
└─────────────────────────────────────┘

Query "handcuff":
   hash1("handcuff") = 3
   hash2("handcuff") = 4  ✓ (set to 1)
   hash3("handcuff") = 9

   Bits 3,4,9 = [0,1,0]
   Since bit 3 = 0 → "handcuff" definitely NOT in set

Query "phantom":
   hash1("phantom") = 1   ✓ (set to 1)
   hash2("phantom") = 4   ✓ (set to 1)
   hash3("phantom") = 7   ✓ (set to 1)

   All bits = 1 → "phantom" MIGHT be in set
   (Could be false positive - need to check actual data)
```

### 3.4. Compaction Strategies

**In plain English:** As you write more data, you accumulate many SSTable files. Compaction is like periodically organizing your filing cabinet—merging related files, throwing away old versions, and keeping everything sorted for fast access.

**In technical terms:** Compaction strategies determine when and how to merge SSTables to balance write amplification, read amplification, and space amplification in LSM-trees.

**Why it matters:** Compaction strategy dramatically affects database performance characteristics. Different strategies optimize for different workload patterns.

```
Size-Tiered Compaction
───────────────────────────────────────

Trigger: When too many SSTables exist at same level
Strategy: Merge similar-sized files into larger files

Level 0:  [64MB] [64MB] [64MB] [64MB] ← 4 files
          ↓ Merge when count > 3
Level 1:  [256MB] [256MB]
          ↓ Merge when count > 3
Level 2:  [1GB]

Advantages:
✓ Handles high write throughput
✓ Simple to implement
✓ Good write amplification

Disadvantages:
❌ High temporary disk space usage
❌ Periodic write stalls during compaction
❌ Higher read amplification

Leveled Compaction
───────────────────────────────────────

Trigger: When level size exceeds threshold
Strategy: Merge overlapping key ranges incrementally

Level 0: [A-D] [B-F] [E-H]  ← Overlapping ranges
Level 1: [A-C][D-F][G-I][J-L] ← Non-overlapping
Level 2: [A-F][G-L]

Process:
1. Pick overlapping file from L0: [B-F]
2. Find overlapping files in L1: [A-C][D-F]
3. Merge into new L1 files: [A-C][B-F-merged][G-I][J-L]

Advantages:
✓ Lower read amplification
✓ Predictable disk space usage
✓ Incremental compaction

Disadvantages:
❌ Higher write amplification
❌ More complex implementation
❌ Lower peak write throughput
```

---

## 4. B-Tree Storage Engines

**In plain English:** While LSM-trees append data and merge it later, B-trees update data in place using a tree structure that stays balanced. Think of a B-tree like a well-organized filing cabinet where you can insert new documents anywhere while keeping everything alphabetically sorted.

**In technical terms:** B-trees maintain a balanced tree of sorted pages with fixed-size blocks, supporting efficient point queries, range queries, and updates through in-place modifications with logarithmic complexity.

**Why it matters:** B-trees are the most widely used database index structure, powering virtually every relational database and many NoSQL systems. Understanding them is essential for database performance optimization.

### 4.1. B-Tree Structure

```
B-Tree Architecture
───────────────────────────────────────

Root Page (Level 0):
┌─────────────────────────────────────┐
│ [100] [200] [300]                   │
│  ↓     ↓     ↓     ↓                │
└──┼─────┼─────┼─────┼────────────────┘
   │     │     │     │
   ↓     ↓     ↓     ↓
Internal Pages (Level 1):
[1-99]  [100-199]  [200-299]  [300-999]
  ↓        ↓          ↓          ↓

Leaf Pages (Level 2):
[1,5,12,45,67]  [101,134,156,198]  ...

Properties:
• All leaf pages at same depth (balanced)
• Each page has 2-500 keys (configurable)
• Keys sorted within each page
• Page size: typically 4KB-16KB
• Tree depth: usually 3-4 levels even for huge DBs
```

#### B-Tree Operations

```
B-Tree Insert Process
───────────────────────────────────────

Insert key 334:

Step 1: Navigate to leaf page
Root: [100][200][300] → Follow 300+ pointer
Leaf: [331,335,342,345] ← Page is full!

Step 2: Split full page
Old: [331,335,342,345]
New: [331,334] | [335,342,345]
     ↑ Split on median

Step 3: Update parent with new boundary
Parent: [100][200][300][335]
                    ↑ New boundary

If parent also full → Split propagates upward
Eventually may create new root (tree grows taller)
```

### 4.2. Making B-Trees Reliable

**In plain English:** B-trees update pages in place, which creates a problem: if the database crashes while updating a page, you might end up with corrupted data. Write-ahead logging solves this by writing changes to a log before updating the actual pages.

**In technical terms:** B-tree reliability requires write-ahead logging (WAL) to ensure atomicity of page modifications, with log entries written synchronously before page updates to enable crash recovery.

**Why it matters:** Understanding WAL helps you appreciate database recovery mechanisms and the performance implications of durable writes.

```
Write-Ahead Logging (WAL)
───────────────────────────────────────

Write Process:
┌─────────────────────────────────────┐
│ 1. Begin Transaction                │
│    Write: "BEGIN TXN 1001" to WAL   │
│                                     │
│ 2. Update Operation                 │
│    Write: "UPDATE page 45, offset   │
│           1024, old_val=X,          │
│           new_val=Y" to WAL         │
│    fsync() to ensure WAL on disk    │
│                                     │
│ 3. Apply to B-tree Page             │
│    Update page 45 in memory         │
│    Mark page as dirty               │
│                                     │
│ 4. Commit Transaction               │
│    Write: "COMMIT TXN 1001" to WAL  │
│    fsync() WAL again                │
└─────────────────────────────────────┘

Crash Recovery:
1. Scan WAL from last checkpoint
2. Replay all committed transactions
3. Roll back any incomplete transactions
4. Rebuild consistent B-tree state

Performance Impact:
• Extra write I/O for every modification
• fsync() calls add latency
• Group commit optimization batches WAL writes
```

### 4.3. B-Tree Optimizations

**In plain English:** Real B-tree implementations use many tricks to improve performance: copying pages instead of updating them in place, compressing keys to fit more per page, and adding sibling pointers for range scans.

**In technical terms:** B-tree optimizations include copy-on-write for concurrency, key compression for higher branching factor, sequential leaf page layout, and sibling pointers for efficient range queries.

**Why it matters:** These optimizations explain why different B-tree implementations have different performance characteristics and help you choose the right database for your workload.

```
B-Tree Optimization Techniques
───────────────────────────────────────

Copy-on-Write (LMDB approach):
┌─────────────────────────────────────┐
│ Instead of: Update page in place     │
│ Do: Copy page, modify copy, update   │
│     parent to point to new page      │
│                                     │
│ Benefits:                           │
│ • No WAL needed                     │
│ • Natural snapshot isolation        │
│ • Crash recovery simplified         │
│                                     │
│ Drawbacks:                          │
│ • Write amplification               │
│ • Fragmentation over time           │
└─────────────────────────────────────┘

Key Compression:
┌─────────────────────────────────────┐
│ Uncompressed:                       │
│ ["user:1001:profile",               │
│  "user:1002:profile",               │
│  "user:1003:profile"]               │
│                                     │
│ Compressed (prefix elimination):    │
│ Prefix: "user:"                     │
│ Keys: ["1001:profile",              │
│        "1002:profile",              │
│        "1003:profile"]              │
│                                     │
│ Result: More keys per page          │
│         Higher branching factor     │
│         Fewer levels in tree        │
└─────────────────────────────────────┘

Sibling Pointers:
┌─────────────────────────────────────┐
│ Leaf Page 1    →    Leaf Page 2     │
│ [1,5,12,45] ────→ [67,89,102,134]  │
│                                     │
│ Range Query: keys 10-100            │
│ 1. Find start: Navigate to page 1   │
│ 2. Scan forward: Use sibling        │
│    pointers to traverse leaves      │
│ 3. No need to return to root        │
└─────────────────────────────────────┘
```

---

## 5. Comparing Storage Engines

**In plain English:** LSM-trees and B-trees are the two main approaches to database storage. LSM-trees optimize for writes by appending data and merging later, while B-trees optimize for reads by keeping data sorted and updating in place.

**In technical terms:** The choice between LSM-trees and B-trees involves trade-offs between write amplification, read amplification, space amplification, and operational complexity based on workload characteristics.

**Why it matters:** Understanding these trade-offs helps you choose the right database technology for your application and configure it properly for your specific workload patterns.

### 5.1. LSM-Trees vs B-Trees

```
Storage Engine Comparison
───────────────────────────────────────

                LSM-Trees       B-Trees
                    ↓              ↓
Write Performance   Excellent      Good
Read Performance    Good           Excellent
Write Amplification Lower          Higher
Read Amplification  Higher         Lower
Space Overhead      Lower          Higher
Range Queries       Good           Excellent
Point Queries       Good           Excellent
Predictability      Variable       Consistent

Write Amplification Example:
LSM: 1 user write → ~3-4 disk writes (log, memtable flush, compaction)
B-tree: 1 user write → ~2 disk writes (WAL, page update)

Read Amplification Example:
LSM: 1 user read → check 3-5 SSTables (with Bloom filters)
B-tree: 1 user read → traverse 3-4 tree levels (predictable)
```

### 5.2. Performance Characteristics

```
Workload-Based Recommendations
───────────────────────────────────────

Choose LSM-Trees When:
✓ Write-heavy workloads (logging, time-series)
✓ Bulk data ingestion
✓ Acceptable read latency variance
✓ Storage cost is primary concern
✓ Append-mostly access patterns

Examples:
• Apache Cassandra (distributed writes)
• RocksDB (embedded high-throughput)
• InfluxDB (time-series data)
• Apache Kafka (log storage)

Choose B-Trees When:
✓ Read-heavy workloads (analytics, OLTP)
✓ Predictable query latency required
✓ Complex range queries common
✓ Strong consistency requirements
✓ Mixed read/write workloads

Examples:
• PostgreSQL, MySQL (OLTP systems)
• SQLite (embedded databases)
• MongoDB (document queries)
• Most traditional RDBMS systems
```

#### Sequential vs Random I/O Impact

```
Storage Media Performance
───────────────────────────────────────

Hard Disk Drives (HDDs):
┌─────────────────────────────────────┐
│ Sequential Read:  100-200 MB/s     │
│ Random Read:      1-5 MB/s         │
│ Sequential Write: 100-200 MB/s     │
│ Random Write:     1-5 MB/s         │
│                                     │
│ LSM Advantage: ~20-40x faster      │
│ (Sequential vs Random)              │
└─────────────────────────────────────┘

Solid State Drives (SSDs):
┌─────────────────────────────────────┐
│ Sequential Read:  500-3000 MB/s    │
│ Random Read:      300-2000 MB/s    │
│ Sequential Write: 400-2500 MB/s    │
│ Random Write:     100-1500 MB/s    │
│                                     │
│ LSM Advantage: ~2-3x faster        │
│ (Still meaningful difference)       │
└─────────────────────────────────────┘

Write Amplification on SSDs:
• Flash memory erased in blocks (~512KB)
• Random writes → more garbage collection
• LSM sequential writes → less GC overhead
• Extends SSD lifespan significantly
```

> **💡 Insight**
>
> The performance gap between LSM-trees and B-trees has narrowed with SSDs, but LSM-trees still provide advantages for write-heavy workloads due to reduced write amplification and better utilization of flash memory characteristics.

---

## 6. Secondary Indexes

**In plain English:** Primary indexes organize data by the main key (like customer ID), but you often want to search by other fields (like customer email). Secondary indexes are additional data structures that point to the same records but organized by different keys.

**In technical terms:** Secondary indexes are auxiliary data structures that maintain alternative orderings of the same dataset, enabling efficient queries on non-primary keys at the cost of additional storage and write overhead.

**Why it matters:** Secondary indexes are essential for query flexibility, but they come with trade-offs in storage space and write performance that must be carefully managed.

```
Primary vs Secondary Index Structure
───────────────────────────────────────

Primary Index (by User ID):
┌─────────────────────────────────────┐
│ user_id → Record Location           │
│ 1001    → page 5, offset 100        │
│ 1002    → page 5, offset 200        │
│ 1003    → page 7, offset 50         │
└─────────────────────────────────────┘

Secondary Index (by Email):
┌─────────────────────────────────────┐
│ email           → Primary Key        │
│ alice@email.com → 1001              │
│ bob@email.com   → 1002              │
│ carol@email.com → 1003              │
└─────────────────────────────────────┘
        ↓ Indirection
Query "Find user with email alice@email.com":
1. Look up "alice@email.com" in secondary index → get user_id 1001
2. Look up user_id 1001 in primary index → get record location
3. Read actual record from page 5, offset 100

Alternative: Store full record in secondary index
• Faster reads (no indirection)
• More storage space required
• Higher write overhead (update multiple copies)
```

### 6.1. Multi-Column and Composite Indexes

```
Composite Index Design
───────────────────────────────────────

Single Column Indexes:
┌─────────────────────────────────────┐
│ Index on (last_name):               │
│ "Adams"  → [user_ids: 101, 205, 891]│
│ "Brown"  → [user_ids: 102, 334]     │
│ "Clark"  → [user_ids: 103]          │
│                                     │
│ Index on (age):                     │
│ 25 → [user_ids: 102, 334, 567]     │
│ 30 → [user_ids: 101, 203]          │
│ 35 → [user_ids: 103, 891]          │
└─────────────────────────────────────┘

Composite Index on (last_name, age):
┌─────────────────────────────────────┐
│ ("Adams", 25) → [user_id: 891]      │
│ ("Adams", 30) → [user_id: 101]      │
│ ("Adams", 35) → [user_id: 205]      │
│ ("Brown", 25) → [user_id: 102, 334] │
│ ("Clark", 35) → [user_id: 103]      │
└─────────────────────────────────────┘

Query Optimization:
✓ WHERE last_name='Adams' AND age=30  (Perfect match)
✓ WHERE last_name='Adams'             (Prefix match)
❌ WHERE age=30                       (No prefix match)

Index Column Order Matters:
• Put most selective columns first
• Consider query patterns in design
• May need multiple indexes for different queries
```

---

## 7. Storage for Analytics

**In plain English:** Analytical queries are fundamentally different from transactional queries. Instead of looking up individual records, they aggregate millions of rows. This requires completely different storage strategies optimized for scanning large amounts of data quickly.

**In technical terms:** Analytical storage uses column-oriented layouts, compression, and vectorized processing to optimize for aggregate queries over large datasets rather than individual record lookups.

**Why it matters:** Understanding analytical storage explains why data warehouses exist, how they achieve good performance on large datasets, and when to use specialized analytical databases.

### 7.1. Column-Oriented Storage

**In plain English:** Instead of storing complete records together (row-oriented), analytical databases store all values for each column together (column-oriented). This is like organizing a library by putting all books of the same genre together rather than keeping an author's complete works together.

**In technical terms:** Column-oriented storage layouts group values from the same column across all rows, enabling better compression ratios, reduced I/O for queries that access few columns, and vectorized processing optimizations.

**Why it matters:** Column storage is crucial for analytical performance because most analytical queries only need a few columns from tables with hundreds of columns.

```
Row vs Column Storage Layout
───────────────────────────────────────

Row-Oriented (Traditional OLTP):
┌─────────────────────────────────────┐
│ Page 1:                             │
│ [1,"Alice",25,"Engineer",50000]     │
│ [2,"Bob",30,"Manager",65000]        │
│ [3,"Carol",28,"Designer",55000]     │
│                                     │
│ Page 2:                             │
│ [4,"David",35,"Director",80000]     │
│ [5,"Eve",27,"Engineer",52000]       │
└─────────────────────────────────────┘

Column-Oriented (Analytical):
┌─────────────────────────────────────┐
│ ID column:     [1,2,3,4,5]          │
│ Name column:   ["Alice","Bob"...]   │
│ Age column:    [25,30,28,35,27]     │
│ Title column:  ["Engineer"...]      │
│ Salary column: [50000,65000...]     │
└─────────────────────────────────────┘

Query: "SELECT AVG(salary) WHERE title='Engineer'"
Row-oriented: Read all pages, extract salary+title
Column-oriented: Read only salary + title columns
                 (~80% less I/O for wide tables)
```

### 7.2. Column Compression

**In plain English:** Column storage enables excellent compression because similar values are stored together. Techniques like run-length encoding (storing "100 occurrences of 'Engineer'" instead of repeating "Engineer" 100 times) dramatically reduce storage space and improve query speed.

**In technical terms:** Column-oriented data exhibits high locality of similar values, enabling compression techniques like run-length encoding, dictionary coding, and bit-packing that achieve much better compression ratios than row-oriented storage.

**Why it matters:** Compression reduces storage costs and improves query performance by reducing I/O bandwidth requirements, often by an order of magnitude.

```
Column Compression Techniques
───────────────────────────────────────

Run-Length Encoding (RLE):
Original:   [M,M,M,M,F,F,M,M,M,M,M]
Compressed: [(M,4),(F,2),(M,5)]
Savings:    11 values → 6 values

Dictionary Encoding:
Original:   ["Engineer","Manager","Engineer",
            "Engineer","Designer","Engineer"]
Dictionary: {0:"Engineer", 1:"Manager", 2:"Designer"}
Encoded:    [0,1,0,0,2,0]
Savings:    ~70% size reduction

Bit Packing:
Original ages: [25,30,28,35,27] (4 bytes each = 20 bytes)
Analysis: Max value 35 needs 6 bits
Packed: Store as 6-bit values = 30 bits total (4 bytes)
Savings: 80% reduction

Frame of Reference:
Original:  [50000,52000,51500,53000,50500]
Base:      50000
Deltas:    [0,2000,1500,3000,500]
Storage:   Store base + small deltas (2 bytes each)
```

### 7.3. Query Optimization

**In plain English:** Analytical databases use specialized techniques to make queries fast: they compile queries to machine code for speed, process data in batches rather than row-by-row, and pre-compute common aggregations.

**In technical terms:** Query optimization for analytics involves vectorized processing, just-in-time compilation, materialized views, and data cubes to minimize CPU cycles per processed row.

**Why it matters:** These optimizations can make analytical queries orders of magnitude faster than naive implementations, enabling real-time analysis of large datasets.

```
Vectorized Processing
───────────────────────────────────────

Traditional Row-by-Row:
for each row in table:
    if row.age > 25:
        sum += row.salary
        count += 1

Problems:
• Function call overhead per row
• Poor CPU cache utilization
• Branch prediction misses
• No SIMD optimization

Vectorized Processing:
ages = load_column_chunk(age_column)      # 1024 values
salaries = load_column_chunk(salary_col)  # 1024 values
mask = vector_greater_than(ages, 25)      # SIMD operation
filtered_salaries = vector_filter(salaries, mask)
sum += vector_sum(filtered_salaries)      # SIMD operation

Benefits:
• Amortize function call costs
• Better CPU cache utilization
• SIMD instructions process multiple values
• Predictable memory access patterns
• 5-10x performance improvement typical
```

#### Materialized Views and Data Cubes

```
Pre-Computed Aggregations
───────────────────────────────────────

Raw Fact Table (1B rows):
┌─────────────────────────────────────┐
│ date, product_id, store_id, sales   │
│ 2024-01-01, P1, S1, 100            │
│ 2024-01-01, P2, S1, 150            │
│ ... (1 billion more rows)           │
└─────────────────────────────────────┘

Data Cube (Pre-aggregated):
┌─────────────────────────────────────┐
│ Dimension Combinations              │
│ • By date: daily_sales              │
│ • By product: product_sales         │
│ • By store: store_sales             │
│ • By date+product: daily_product    │
│ • By date+store: daily_store        │
│ • By product+store: product_store   │
│ • By date+product+store: full_cube  │
└─────────────────────────────────────┘

Query Optimization:
Original: "Sales by product for last month"
→ Scans 1B rows, filters, aggregates (slow)

With Cube: Look up product_sales table
→ Returns pre-computed results (fast)

Trade-off:
• Storage: 2^N combinations for N dimensions
• Freshness: Need to rebuild when base data changes
• Query Speed: Orders of magnitude faster
```

---

## 8. Modern Storage Innovations

**In plain English:** Storage technology continues evolving with new approaches for specialized use cases: vector embeddings for AI/ML applications, in-memory databases for ultra-fast access, and cloud-native architectures that separate storage and compute.

**In technical terms:** Modern storage innovations include high-dimensional vector indexing for embedding search, distributed cloud-native architectures, and specialized data structures for emerging workloads like graph analytics and time-series data.

**Why it matters:** Understanding emerging storage technologies helps you evaluate new database options and choose the right tools for modern application requirements.

### 8.1. Vector Embeddings

**In plain English:** Vector embeddings represent complex data (text, images, audio) as lists of numbers that capture semantic meaning. Vector databases are optimized for finding similar vectors quickly—like finding documents with similar meanings even if they use different words.

**In technical terms:** Vector databases store high-dimensional floating-point vectors and support efficient approximate nearest neighbor (ANN) search using specialized indexing techniques like LSH, IVF, or HNSW.

**Why it matters:** Vector search powers modern AI applications: recommendation systems, semantic search, image similarity, and RAG (Retrieval-Augmented Generation) systems for large language models.

```
Vector Search Architecture
───────────────────────────────────────

Document → Embedding Model → Vector
"Cancel subscription" → [0.1, 0.8, -0.3, 0.5, ...]
"Close account" → [0.2, 0.7, -0.2, 0.4, ...]
"Terminate contract" → [0.15, 0.75, -0.25, 0.45, ...]

Index Structure (HNSW example):
┌─────────────────────────────────────┐
│ Layer 2: [Doc1] ←→ [Doc5]          │
│          sparse connections         │
│                                     │
│ Layer 1: [Doc1] ←→ [Doc2] ←→ [Doc5] │
│          medium density             │
│                                     │
│ Layer 0: [Doc1]←→[Doc2]←→[Doc3]     │
│          ←→[Doc4]←→[Doc5]←→[Doc6]    │
│          all vectors connected      │
└─────────────────────────────────────┘

Query Process:
1. Convert query to vector: "how to close my account"
2. Start search at top layer
3. Navigate to closest vectors at each layer
4. Return K most similar vectors from layer 0
5. Retrieve original documents for results

Performance:
• Exact search: O(n) - check every vector
• Approximate search: O(log n) - traverse index
• Trade-off: Speed vs accuracy (99%+ typical)
```

### 8.2. Materialized Views

**In plain English:** Materialized views are like cached query results—they store the actual results of expensive queries so you don't have to recompute them every time. They're especially useful for complex analytical queries that join multiple tables.

**In technical terms:** Materialized views physically store query results and maintain consistency with base tables through incremental refresh mechanisms or event-driven updates.

**Why it matters:** Materialized views can turn hour-long analytical queries into millisecond lookups, but they require careful management of refresh strategies and storage overhead.

```
Materialized View Usage Pattern
───────────────────────────────────────

Base Tables (Updated Frequently):
┌─────────────────────────────────────┐
│ orders (1M rows, constant inserts)  │
│ products (10K rows)                 │
│ customers (100K rows)               │
└─────────────────────────────────────┘

Expensive Query (5 minutes to run):
SELECT
  p.category,
  DATE_TRUNC('month', o.order_date) as month,
  SUM(o.amount) as revenue,
  COUNT(DISTINCT o.customer_id) as customers
FROM orders o
JOIN products p ON o.product_id = p.id
GROUP BY p.category, month
ORDER BY month DESC;

Materialized View:
┌─────────────────────────────────────┐
│ monthly_revenue_by_category         │
│ category | month   | revenue | ... │
│ Books    | 2024-01 | 50000   | ... │
│ Electronics| 2024-01| 120000  | ... │
│ ... (pre-computed results)          │
└─────────────────────────────────────┘

Refresh Strategies:
• Full refresh: Rebuild entire view (slow, consistent)
• Incremental refresh: Update only changed rows (fast)
• Real-time: Update on every base table change
• Scheduled: Refresh on time intervals (daily, hourly)

Query Performance:
Original query: 5 minutes
Materialized view lookup: 50 milliseconds
Trade-off: Storage space + refresh overhead
```

---

## 9. Summary

This chapter explored the fundamental mechanisms databases use to store and retrieve data efficiently. Key takeaways:

### 9.1. Storage Engine Principles

**Fundamental Trade-offs:**
- Write performance vs read performance
- Storage space vs query speed
- Consistency vs performance
- Simplicity vs optimization

**Core Approaches:**
- **Log-structured**: Optimize writes, compact later (LSM-trees)
- **Update-in-place**: Optimize reads, manage fragmentation (B-trees)
- **Column-oriented**: Optimize analytics, sacrifice OLTP performance

### 9.2. When to Use Each Approach

**LSM-Trees (Cassandra, RocksDB, HBase):**
- Write-heavy workloads
- Time-series data
- Log aggregation
- High-throughput ingestion

**B-Trees (PostgreSQL, MySQL, SQLite):**
- Read-heavy workloads
- Interactive applications
- Complex queries with joins
- Predictable performance requirements

**Column Storage (Redshift, BigQuery, Snowflake):**
- Analytical workloads
- Data warehousing
- Aggregation-heavy queries
- Wide tables with many columns

### 9.3. Modern Considerations

**Cloud-Native Storage:**
- Separation of storage and compute
- Object storage backends
- Elastic scaling
- Serverless architectures

**Specialized Workloads:**
- Vector databases for AI/ML
- Time-series optimizations
- Graph database storage
- Streaming data architectures

> **💡 Insight**
>
> There's no universally best storage engine—only engines optimized for specific trade-offs. The key is understanding your workload characteristics and choosing the engine that aligns with your performance, consistency, and operational requirements.

### 9.4. Performance Optimization Guidelines

**For Write-Heavy Workloads:**
- Consider LSM-based storage engines
- Optimize for sequential I/O patterns
- Use appropriate compaction strategies
- Monitor write amplification

**For Read-Heavy Workloads:**
- B-trees often provide better performance
- Design indexes for query patterns
- Consider read replicas for scaling
- Use caching strategically

**For Analytical Workloads:**
- Column-oriented storage essential
- Implement aggressive compression
- Pre-compute common aggregations
- Partition data appropriately

The storage layer is where databases earn their performance characteristics. Understanding these fundamentals helps you make informed decisions about database selection, configuration, and optimization strategies.

---

**Previous:** [Chapter 3: Data Models and Query Languages](03-data-models-query-languages.md) | **Next:** [Chapter 5: Encoding and Evolution](05-encoding-evolution.md)

---

_Storage engines are where the rubber meets the road in database performance_