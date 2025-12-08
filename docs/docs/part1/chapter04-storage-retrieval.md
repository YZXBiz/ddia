---
sidebar_position: 4
title: "Chapter 4. Storage and Retrieval"
description: "How databases store data and retrieve it efficiently using indexes and storage engines"
---

# Chapter 4. Storage and Retrieval

> One of the miseries of life is that everybody names things a little bit wrong. And so it makes everything a little harder to understand in the world than it would be if it were named differently. A computer does not primarily compute in the sense of doing arithmetic. […] They primarily are filing systems.
>
> _Richard Feynman, Idiosyncratic Thinking seminar (1985)_

## Table of Contents

1. [Introduction](#1-introduction)
2. [Storage and Indexing for OLTP](#2-storage-and-indexing-for-oltp)
   - 2.1. [The World's Simplest Database](#21-the-worlds-simplest-database)
   - 2.2. [Indexes and the Read-Write Trade-off](#22-indexes-and-the-read-write-trade-off)
3. [Log-Structured Storage](#3-log-structured-storage)
   - 3.1. [Hash Index in Memory](#31-hash-index-in-memory)
   - 3.2. [SSTables (Sorted String Tables)](#32-sstables-sorted-string-tables)
   - 3.3. [Constructing and Merging SSTables](#33-constructing-and-merging-sstables)
   - 3.4. [Bloom Filters](#34-bloom-filters)
   - 3.5. [Compaction Strategies](#35-compaction-strategies)
   - 3.6. [Embedded Storage Engines](#36-embedded-storage-engines)
4. [B-Trees](#4-b-trees)
   - 4.1. [B-Tree Structure](#41-b-tree-structure)
   - 4.2. [Making B-Trees Reliable](#42-making-b-trees-reliable)
   - 4.3. [B-Tree Variants](#43-b-tree-variants)
5. [Comparing B-Trees and LSM-Trees](#5-comparing-b-trees-and-lsm-trees)
   - 5.1. [Read Performance](#51-read-performance)
   - 5.2. [Sequential vs. Random Writes](#52-sequential-vs-random-writes)
   - 5.3. [Write Amplification](#53-write-amplification)
   - 5.4. [Disk Space Usage](#54-disk-space-usage)
6. [Multi-Column and Secondary Indexes](#6-multi-column-and-secondary-indexes)
   - 6.1. [Storing Values Within the Index](#61-storing-values-within-the-index)
   - 6.2. [Keeping Everything in Memory](#62-keeping-everything-in-memory)
7. [Data Storage for Analytics](#7-data-storage-for-analytics)
   - 7.1. [Cloud Data Warehouses](#71-cloud-data-warehouses)
   - 7.2. [Column-Oriented Storage](#72-column-oriented-storage)
   - 7.3. [Column Compression](#73-column-compression)
   - 7.4. [Sort Order in Column Storage](#74-sort-order-in-column-storage)
   - 7.5. [Writing to Column-Oriented Storage](#75-writing-to-column-oriented-storage)
   - 7.6. [Query Execution: Compilation and Vectorization](#76-query-execution-compilation-and-vectorization)
   - 7.7. [Materialized Views and Data Cubes](#77-materialized-views-and-data-cubes)
8. [Multidimensional and Full-Text Indexes](#8-multidimensional-and-full-text-indexes)
   - 8.1. [Multidimensional Indexes](#81-multidimensional-indexes)
   - 8.2. [Full-Text Search](#82-full-text-search)
   - 8.3. [Vector Embeddings](#83-vector-embeddings)
9. [Summary](#9-summary)

---

## 1. Introduction

In Chapter 3 we discussed data models and query languages—i.e., the format in which you give the database your data, and the interface through which you can ask for it again later. In this chapter we discuss the same from the database's point of view: how the database can store the data that you give it, and how it can find the data again when you ask for it.

**In plain English:** Think of a database like a massive filing cabinet. You can stuff papers into drawers (writing data), but if you just throw them in randomly, you'll spend hours searching when you need something specific. Storage engines are the organizational systems—some use file folders (B-trees), others use chronological notebooks (log-structured storage).

**In technical terms:** A storage engine is the component of a database that handles how data is stored on disk and retrieved when queried. Different engines make different trade-offs between read performance, write performance, and space efficiency.

**Why it matters:** Selecting the right storage engine is critical for application performance. A poor choice can make your database 10x slower or consume 10x more resources. Understanding storage internals helps you tune databases effectively and diagnose performance issues.

> **💡 Insight**
>
> There is a fundamental tension in storage systems: **optimizing for reads versus writes**. Structures that make writes fast (append-only logs) make reads slow. Structures that make reads fast (sorted indexes) make writes slow. Every storage engine is a carefully chosen compromise along this spectrum.

In particular, there is a big difference between storage engines that are optimized for **transactional workloads (OLTP)** and those that are optimized for **analytics (OLAP)**:

- **OLTP systems** handle many small reads and writes (user requests)
- **OLAP systems** scan massive datasets to answer analytical queries

This chapter examines two families of OLTP storage engines:
1. **Log-structured storage** (LSM-trees, SSTables) - immutable files that are merged
2. **Update-in-place storage** (B-trees) - fixed pages that are overwritten

Later, we'll explore **column-oriented storage** optimized for analytics, and specialized indexes for geospatial and full-text search.

---

## 2. Storage and Indexing for OLTP

### 2.1. The World's Simplest Database

Consider the world's simplest database, implemented as two Bash functions:

```bash
#!/bin/bash

db_set () {
    echo "$1,$2" >> database
}

db_get () {
    grep "^$1," database | sed -e "s/^$1,//" | tail -n 1
}
```

These two functions implement a key-value store. You can call `db_set key value`, which will store key and value in the database. You can then call `db_get key`, which looks up the most recent value associated with that particular key and returns it.

**Example usage:**

```bash
$ db_set 12 '{"name":"London","attractions":["Big Ben","London Eye"]}'

$ db_set 42 '{"name":"San Francisco","attractions":["Golden Gate Bridge"]}'

$ db_get 42
{"name":"San Francisco","attractions":["Golden Gate Bridge"]}
```

The storage format is very simple: a text file where each line contains a key-value pair, separated by a comma. Every call to `db_set` appends to the end of the file. If you update a key several times, old versions are not overwritten—you need to look at the last occurrence:

```bash
$ db_set 42 '{"name":"San Francisco","attractions":["Exploratorium"]}'

$ db_get 42
{"name":"San Francisco","attractions":["Exploratorium"]}

$ cat database
12,{"name":"London","attractions":["Big Ben","London Eye"]}
42,{"name":"San Francisco","attractions":["Golden Gate Bridge"]}
42,{"name":"San Francisco","attractions":["Exploratorium"]}
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    APPEND-ONLY LOG STORAGE                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   WRITE: Fast (O(1))                   READ: Slow (O(n))                  │
│   ──────────────────                   ────────────────                   │
│                                                                           │
│   db_set 12 "London"                   db_get 42                          │
│         │                                    │                            │
│         ▼                                    ▼                            │
│   Append to end                        Scan entire file                   │
│   (always fast)                        (slow if many records)             │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────┐        │
│   │ File: database                                              │        │
│   ├─────────────────────────────────────────────────────────────┤        │
│   │ 12,London                                                   │        │
│   │ 42,San Francisco                                            │        │
│   │ 42,San Francisco (updated)   ← Latest value wins            │        │
│   │ 99,Tokyo                                                    │        │
│   │ ...                                                         │        │
│   │ (grow forever)                                              │        │
│   └─────────────────────────────────────────────────────────────┘        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

The `db_set` function has pretty good performance because appending to a file is generally very efficient. Similarly to what `db_set` does, many databases internally use a **log**, which is an append-only data file. Real databases have more issues to deal with (concurrent writes, reclaiming disk space, crash recovery), but the basic principle is the same.

> **Note**
>
> The word **log** is often used to refer to application logs (human-readable text). In this book, **log** means an append-only sequence of records on disk. It doesn't have to be human-readable; it might be binary and intended only for internal use.

On the other hand, the `db_get` function has **terrible performance** if you have many records. Every lookup scans the entire database file from beginning to end. In algorithmic terms, the cost is **O(n)**: if you double the number of records, a lookup takes twice as long.

### 2.2. Indexes and the Read-Write Trade-off

In order to efficiently find the value for a particular key, we need a different data structure: an **index**.

**In plain English:** An index is like the index at the back of a textbook. Instead of flipping through every page to find "B-tree", you look it up in the index, which tells you exactly which pages to read. The trade-off is that maintaining the index requires effort every time the book is updated.

**In technical terms:** An index is an additional data structure derived from the primary data. It doesn't affect the contents of the database; it only affects query performance. Maintaining indexes incurs overhead, especially on writes.

**Why it matters:** Well-chosen indexes can speed up read queries by orders of magnitude, but every index consumes disk space and slows down writes. You must balance these trade-offs based on your workload.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    THE INDEX TRADE-OFF                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   WITHOUT INDEX                         WITH INDEX                        │
│   ──────────────                        ──────────                        │
│                                                                           │
│   Write: Fast ✓                         Write: Slower                     │
│   Append to log                         Update log + update index         │
│                                                                           │
│   Read: Slow ✗                          Read: Fast ✓                      │
│   Scan entire file                      Jump to exact location            │
│                                                                           │
│   Space: Minimal                        Space: More                       │
│   Only data                             Data + index structure            │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Key principle: Well-chosen indexes speed up reads but slow writes      │
│   Databases don't index everything by default—you choose based on        │
│   your application's query patterns                                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> For writes, it's hard to beat the performance of simply appending to a file, because that's the simplest possible write operation. Any kind of index usually slows down writes, because the index also needs to be updated every time data is written. This is an **important trade-off in storage systems**: well-chosen indexes speed up reads, but introduce overhead on writes.

---

## 3. Log-Structured Storage

### 3.1. Hash Index in Memory

Let's continue with the append-only log, but add an index to speed up reads. The simplest approach: keep a **hash map in memory**, where every key is mapped to the byte offset in the file where the most recent value can be found.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    HASH INDEX FOR LOG-STRUCTURED STORAGE                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   IN-MEMORY HASH MAP                     ON-DISK LOG FILE                 │
│   ───────────────────                    ───────────────                  │
│                                                                           │
│   ┌──────────────────┐                   ┌─────────────────────────┐     │
│   │ Key  │  Offset   │                   │ Byte 0:  12,London      │     │
│   ├──────┼───────────┤                   │ Byte 20: 42,SF          │     │
│   │  12  │    0      │─────────────────▶ │ Byte 40: 42,SF (new)    │     │
│   │  42  │   40      │─────────────────▶ │ Byte 60: 99,Tokyo       │     │
│   │  99  │   60      │─────────────────▶ │ ...                     │     │
│   └──────┴───────────┘                   └─────────────────────────┘     │
│                                                                           │
│   Write:                                  Read:                           │
│   1. Append to file                       1. Look up key in hash map     │
│   2. Update hash map with new offset      2. Seek to offset in file      │
│                                           3. Read value                   │
│                                                                           │
│   Fast O(1) writes and reads!                                            │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

Whenever you append a new key-value pair to the file, you also update the hash map to reflect the offset of the data you just wrote. When you want to look up a value, you use the hash map to find the offset in the log file, seek to that location, and read the value.

**This approach is much faster**, but it still suffers from several problems:

1. **Disk space grows forever** — You never free up space occupied by old values that have been overwritten; eventually you run out of disk space.

2. **Hash map must fit in memory** — If you have billions of keys, the hash map becomes impractically large. On-disk hash maps are difficult to make performant due to random I/O.

3. **No crash recovery** — The hash map is not persisted, so you have to rebuild it when you restart by scanning the whole log file (slow).

4. **Range queries are inefficient** — You cannot easily scan keys between 10000 and 19999; you'd have to look up each key individually.

### 3.2. SSTables (Sorted String Tables)

Instead of an append-only log with arbitrary key order, we can do better by keeping the data **sorted by key**. This format is called a **Sorted String Table**, or **SSTable**.

**In plain English:** Imagine organizing a filing cabinet. Instead of putting documents in the order they arrive (append-only), you keep them alphabetically sorted. Now, to find a document, you don't need to check every drawer—you can jump to the right section and scan a small range.

**In technical terms:** An SSTable stores key-value pairs sorted by key. Each key appears only once per SSTable. This enables efficient lookups using a sparse index.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SSTABLE WITH SPARSE INDEX                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   SPARSE INDEX (in memory)              SSTABLE FILE (on disk)            │
│   ──────────────────────                ───────────────────               │
│                                                                           │
│   ┌──────────────────┐                  ┌────────────────────┐           │
│   │ Key  │  Offset   │                  │ Block 1 (4 KB)     │           │
│   ├──────┼───────────┤                  │ ────────────       │           │
│   │handbag│   0 KB   │─────────────────▶│ handbag: ...       │           │
│   │       │          │                  │ handcuff: ...      │           │
│   │handsome│  4 KB   │─────────┐        │ handkerchief: ...  │           │
│   │       │          │         │        └────────────────────┘           │
│   │hazard │  8 KB   │─────────┼───┐    ┌────────────────────┐           │
│   └──────┴───────────┘         │   │    │ Block 2 (4 KB)     │           │
│                                └───┼───▶│ ────────────       │           │
│   Looking up "handiwork":          │    │ handsome: ...      │           │
│   1. Search sparse index           │    │ handy: ...         │           │
│   2. Find handbag < handiwork      │    │ handyman: ...      │           │
│      < handsome                    │    └────────────────────┘           │
│   3. Read Block 1                  │    ┌────────────────────┐           │
│   4. Scan for handiwork            └───▶│ Block 3 (4 KB)     │           │
│                                         │ ────────────       │           │
│   Only need to scan one small block!    │ hazard: ...        │           │
│                                         │ hazelnut: ...      │           │
│                                         └────────────────────┘           │
│                                                                           │
│   Blocks are compressed (saves space, reduces I/O)                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Advantages of SSTables:**

1. **Sparse index** — You don't need to keep all keys in memory; just store the first key of each block (e.g., every 4 KB). This dramatically reduces memory requirements.

2. **Efficient range queries** — Because keys are sorted, scanning a range is fast: jump to the start key and read sequentially.

3. **Compression** — Blocks can be compressed, saving disk space and I/O bandwidth at the cost of a bit more CPU time.

### 3.3. Constructing and Merging SSTables

SSTables are better for reading than an append-only log, but they make writes more difficult—you can't just append at the end because the file must remain sorted.

The solution is a **log-structured approach** that combines an append-only log with sorted files:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    LSM-TREE (LOG-STRUCTURED MERGE-TREE)                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   STEP 1: WRITE                                                           │
│   ───────────────                                                         │
│   New writes go to in-memory sorted tree (memtable)                      │
│                                                                           │
│   ┌─────────────────┐                                                    │
│   │   MEMTABLE      │   ← Red-black tree or skip list                    │
│   │  (in memory)    │     (sorted, mutable)                              │
│   ├─────────────────┤                                                    │
│   │ apple:  1       │                                                    │
│   │ banana: 2       │                                                    │
│   │ cherry: 3       │                                                    │
│   └─────────────────┘                                                    │
│          │                                                                │
│          │ When memtable reaches threshold (e.g., 4 MB)                  │
│          ▼                                                                │
│   Write to disk as SSTable (already sorted!)                             │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   STEP 2: READ                                                            │
│   ──────────────                                                          │
│   Search from newest to oldest:                                           │
│                                                                           │
│   1. Check memtable (in memory)                                          │
│   2. Check most recent SSTable on disk                                   │
│   3. Check next-older SSTable                                            │
│   4. Continue until found or exhausted                                   │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   STEP 3: COMPACTION (background process)                                │
│   ────────────────────────────────────────                               │
│   Merge multiple SSTables to remove duplicates and deleted keys          │
│                                                                           │
│   SSTable 1:  apple:1, cherry:3, date:4                                  │
│   SSTable 2:  banana:2, cherry:5, elderberry:6                           │
│                 │            │                                            │
│                 └────────────┼────────── Merge (like mergesort)          │
│                              ▼                                            │
│   Merged:  apple:1, banana:2, cherry:5, date:4, elderberry:6             │
│                               └─── Keep newer value                      │
│                                                                           │
│   Result: Fewer, larger files with one value per key                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**How it works:**

1. **Write path:**
   - Add new writes to an in-memory sorted tree (memtable) — red-black tree or skip list
   - When memtable reaches a threshold (e.g., 4 MB), write it to disk as a new SSTable
   - Continue writing to a new memtable instance

2. **Read path:**
   - First try to find the key in the memtable
   - If not found, check the most recent SSTable on disk
   - Continue searching older SSTables until the key is found or all segments are exhausted

3. **Background compaction:**
   - Periodically merge multiple SSTables together
   - Use mergesort algorithm: read files side-by-side, copy lowest key to output
   - When the same key appears in multiple files, keep only the most recent value
   - Result: fewer, larger SSTables with one value per key

**Crash recovery:** To ensure the memtable isn't lost on crash, keep a separate append-only log on disk. Every write is immediately appended to this log. When the memtable is written to an SSTable, the corresponding log can be discarded.

**Deletions:** To delete a key, append a special **tombstone** marker. During compaction, the tombstone tells the merge process to discard previous values for the deleted key.

> **💡 Insight**
>
> This algorithm is essentially what is used in **RocksDB, Cassandra, Scylla, and HBase**, all inspired by Google's Bigtable. It was originally published in 1996 as the **Log-Structured Merge-Tree (LSM-Tree)**. The key insight: immutable SSTable files are written once and never modified. Merging and compaction happen in the background while serving reads from old segments.

### 3.4. Bloom Filters

With LSM storage, reading a key that doesn't exist can be slow—the storage engine must check several SSTables before concluding the key is absent. **Bloom filters** solve this problem.

**In plain English:** A Bloom filter is like a bouncer at a club who has a near-perfect memory. If you ask "Is Alice inside?", the bouncer can definitively say "No" or "Probably yes, check inside." Bloom filters never give false negatives (if it says no, the key is definitely absent), but can give false positives (it might say yes when the key is absent).

**In technical terms:** A Bloom filter is a probabilistic data structure that provides a fast, space-efficient way to test whether an element is in a set. It uses a bit array and multiple hash functions.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    BLOOM FILTER EXAMPLE                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Bit Array: 16 bits (in practice, thousands of bits)                    │
│                                                                           │
│   ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐    │
│   │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │13 │14 │15 │    │
│   ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤    │
│   │ 0 │ 0 │ 1 │ 0 │ 1 │ 0 │ 0 │ 0 │ 0 │ 1 │ 0 │ 0 │ 0 │ 0 │ 0 │ 0 │    │
│   └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘    │
│                                                                           │
│   ADDING "handbag":                                                       │
│   hash1(handbag) = 2  → set bit 2 to 1                                   │
│   hash2(handbag) = 9  → set bit 9 to 1                                   │
│   hash3(handbag) = 4  → set bit 4 to 1                                   │
│                                                                           │
│   CHECKING "handheld":                                                    │
│   hash1(handheld) = 6  → bit 6 is 0  ✗                                   │
│   hash2(handheld) = 11 → bit 11 is 0 ✗                                   │
│   hash3(handheld) = 2  → bit 2 is 1  ✓                                   │
│                                                                           │
│   At least one bit is 0 → "handheld" is DEFINITELY NOT in the set        │
│                                                                           │
│   CHECKING "handbag":                                                     │
│   hash1(handbag) = 2  → bit 2 is 1  ✓                                    │
│   hash2(handbag) = 9  → bit 9 is 1  ✓                                    │
│   hash3(handbag) = 4  → bit 4 is 1  ✓                                    │
│                                                                           │
│   All bits are 1 → "handbag" is PROBABLY in the set                      │
│   (could be false positive if other keys set those bits)                 │
│                                                                           │
│   Rule of thumb: 10 bits per key → 1% false positive rate                │
│   Every 5 additional bits → 10x reduction in false positives             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**How Bloom filters help LSM-trees:**

- If the Bloom filter says a key is **not present**, safely skip that SSTable (100% certain)
- If the Bloom filter says the key is **present**, check the SSTable (might be false positive)
- False positives waste a bit of I/O, but true negatives avoid it entirely

### 3.5. Compaction Strategies

An important detail is **when to perform compaction** and **which SSTables to merge**. Common strategies:

**Size-tiered compaction:**
- Newer, smaller SSTables are merged into older, larger SSTables
- SSTables containing older data can get very large
- Advantage: Can handle very high write throughput
- Disadvantage: Requires a lot of temporary disk space during compaction

**Leveled compaction:**
- Key range is split into smaller SSTables organized into "levels"
- Older data is moved into separate levels
- Compaction proceeds more incrementally and uses less disk space
- Advantage: More efficient for reads (fewer SSTables to check)
- Disadvantage: More overhead on writes

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    COMPACTION STRATEGIES                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   SIZE-TIERED                          LEVELED                            │
│   ────────────                         ───────                            │
│                                                                           │
│   Level 0: [1MB] [1MB] [1MB]           Level 0: [1MB] [1MB] [1MB]        │
│              └─────┴─────┘                                                │
│                    │                   Level 1: [10MB][10MB][10MB]       │
│   Level 1:     [10MB]                                                     │
│                    │                   Level 2: [100MB][100MB]...         │
│   Level 2:     [100MB]                                                    │
│                                        Keys partitioned by range          │
│   Files grow exponentially             Each level 10x larger than above  │
│                                                                           │
│   Good for: Write-heavy workloads      Good for: Read-heavy workloads    │
│   Bad for: Lots of temp disk space     Bad for: More write amplification │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Rule of thumb:**
- Size-tiered compaction: better for mostly writes and few reads
- Leveled compaction: better for read-dominated workloads

### 3.6. Embedded Storage Engines

Many databases run as network services, but **embedded databases** are libraries that run in the same process as your application. Examples: **RocksDB, SQLite, LMDB, DuckDB, KùzuDB**.

**Use cases for embedded storage engines:**

1. **Mobile apps** — Store local user data
2. **Single-machine backends** — When data fits on one machine with few concurrent transactions
3. **Multitenant systems** — Separate embedded database instance per tenant (if tenants are small and isolated)

> **💡 Insight**
>
> The storage techniques we discuss (LSM-trees, B-trees, column storage) are used in both embedded and client-server databases. The principles are the same; only the deployment model differs.

---

## 4. B-Trees

### 4.1. B-Tree Structure

The log-structured approach is popular, but the most widely used structure for reading and writing database records by key is the **B-tree**.

**In plain English:** A B-tree is like a well-organized library with a card catalog. The catalog directs you to the right section, then the right shelf, then the right book. Each level narrows down the search, so you never have to scan the entire library.

**In technical terms:** B-trees break the database into fixed-size **pages** (typically 4-16 KB) organized into a tree structure. Each page contains keys and pointers to child pages, enabling logarithmic-time lookups.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    B-TREE STRUCTURE                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Looking up key 251:                                                     │
│                                                                           │
│                        ┌────────────────────┐                             │
│                        │   ROOT PAGE        │                             │
│                        │  [100][200][300]   │                             │
│                        └──┬─────┬──────┬───┘                             │
│                           │     │      │                                  │
│          0-100 ───────────┘     │      └─────────── 300+                 │
│                     200-300 ────┘                                         │
│                                 │                                         │
│                                 ▼                                         │
│                        ┌────────────────────┐                             │
│                        │   INTERNAL PAGE    │                             │
│                        │ [200][250][270]    │                             │
│                        └──┬─────┬──────┬───┘                             │
│                           │     │      │                                  │
│         200-250 ──────────┘     │      └────────── 270-300               │
│                      250-270 ───┘                                         │
│                                 │                                         │
│                                 ▼                                         │
│                        ┌────────────────────┐                             │
│                        │    LEAF PAGE       │                             │
│                        │  250: value_250    │                             │
│                        │  251: value_251 ←  │  Found it!                 │
│                        │  252: value_252    │                             │
│                        │  ...               │                             │
│                        └────────────────────┘                             │
│                                                                           │
│   Properties:                                                             │
│   • Fixed-size pages (4 KB, 8 KB, or 16 KB)                              │
│   • Branching factor: typically several hundred                          │
│   • Balanced tree: all leaves at same depth                              │
│   • Depth: O(log n) — 4-level tree can store 250 TB!                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key properties:**

- **Sorted by key** — Like SSTables, B-trees keep key-value pairs sorted, enabling efficient lookups and range queries
- **Fixed-size pages** — Unlike LSM-trees (variable-size segments), B-trees use fixed pages that can be overwritten in place
- **Balanced tree** — All leaf pages are at the same depth, ensuring predictable performance
- **Logarithmic depth** — A four-level tree with 4 KB pages and branching factor of 500 can store up to 250 TB

**Operations:**

**Lookup:** Start at root, follow pointers down until you reach a leaf page containing the key.

**Update:** Search for the leaf page, overwrite it with the new value.

**Insert:** Find the appropriate leaf page. If there's room, add the key. If the page is full, split it into two half-full pages and update the parent.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    B-TREE PAGE SPLIT                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   BEFORE: Inserting key 334 into a full page                             │
│                                                                           │
│                        ┌────────────────────┐                             │
│                        │   PARENT           │                             │
│                        │ [100][200][300]    │                             │
│                        └──────────┬─────────┘                             │
│                                   │                                       │
│                                   ▼                                       │
│                        ┌────────────────────┐                             │
│                        │   LEAF (full)      │                             │
│                        │ 333, 335, 336,     │                             │
│                        │ 337, 340, 344, 345 │                             │
│                        └────────────────────┘                             │
│                                   │                                       │
│                    Want to insert 334 but no room!                        │
│                                   │                                       │
│                                   ▼                                       │
│                              SPLIT PAGE                                   │
│                                                                           │
│   AFTER: Split into two pages, update parent                             │
│                                                                           │
│                        ┌────────────────────┐                             │
│                        │   PARENT           │                             │
│                        │ [100][200][300]    │                             │
│                        │           [337]    │  ← New boundary            │
│                        └──────┬──────┬──────┘                             │
│                               │      │                                    │
│                               ▼      ▼                                    │
│                    ┌─────────────┐ ┌─────────────┐                        │
│                    │ LEAF 1      │ │ LEAF 2      │                        │
│                    │ 333, 334,   │ │ 337, 340,   │                        │
│                    │ 335, 336    │ │ 344, 345    │                        │
│                    └─────────────┘ └─────────────┘                        │
│                                                                           │
│   If parent is full, it splits too (splits propagate up to root)         │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

This algorithm ensures the tree remains **balanced**: a B-tree with n keys always has a depth of O(log n). Most databases can fit into a B-tree that is three or four levels deep.

### 4.2. Making B-Trees Reliable

The basic write operation of a B-tree is to **overwrite a page on disk** with new data. This is fundamentally different from LSM-trees, which only append to files and never modify them in place.

**In plain English:** Imagine editing a page in a bound book versus adding pages to a loose-leaf binder. Editing in place (B-trees) is riskier—if you spill coffee mid-edit, the page is corrupted. Adding new pages (LSM-trees) is safer—if something goes wrong, the old pages are still intact.

**Challenges:**

1. **Torn pages** — If the database crashes while writing a page, you may end up with a partially written page (corrupted data).

2. **Multi-page updates** — A page split requires writing multiple pages. If the crash happens after some pages are written but not others, the tree becomes corrupted (orphan pages, broken pointers).

**Solution: Write-Ahead Log (WAL)**

B-tree implementations include a **write-ahead log** (WAL), an append-only file to which every modification must be written before it's applied to the tree pages.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WRITE-AHEAD LOG (WAL)                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   WRITE SEQUENCE:                                                         │
│                                                                           │
│   1. Append operation to WAL     ┌─────────────────────┐                 │
│      (on disk, sequential write) │ WAL (append-only)   │                 │
│                                  ├─────────────────────┤                 │
│                                  │ Insert key=251, ...  │                 │
│                                  │ Update key=100, ...  │                 │
│                                  │ Split page 42, ...   │                 │
│                                  └─────────────────────┘                 │
│                                           │                               │
│   2. Call fsync() to ensure     ─────────┘                               │
│      WAL is on disk                                                       │
│                                                                           │
│   3. Modify B-tree pages         ┌─────────────────────┐                 │
│      (can be buffered in memory) │ B-tree pages        │                 │
│                                  │ (may be in memory)  │                 │
│                                  └─────────────────────┘                 │
│                                                                           │
│   CRASH RECOVERY:                                                         │
│                                                                           │
│   • Replay WAL to restore B-tree to consistent state                     │
│   • Discard incomplete entries (detected via checksums)                  │
│   • Continue operation                                                    │
│                                                                           │
│   Equivalent to journaling in filesystems (ext4, XFS)                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Performance optimization:** B-tree implementations typically don't immediately write every modified page to disk. They buffer pages in memory for a while. The WAL ensures that data isn't lost if the system crashes—as long as the WAL entry has been flushed to disk (using `fsync()`), the database can recover.

### 4.3. B-Tree Variants

B-trees have been around since 1970, and many variants have been developed:

1. **Copy-on-write B-trees** — Instead of overwriting pages and maintaining a WAL, write modified pages to a new location and create new parent pages pointing to the new location. Used by LMDB. Also useful for snapshot isolation.

2. **Key abbreviation** — Store abbreviated keys in interior nodes (they only need enough information to act as boundaries). This increases branching factor and reduces tree depth.

3. **Sequential leaf layout** — Try to lay out leaf pages in sequential order on disk to speed up range scans. Difficult to maintain as the tree grows.

4. **Sibling pointers** — Each leaf page has pointers to its left and right siblings, allowing scanning keys in order without jumping back to parent pages.

---

## 5. Comparing B-Trees and LSM-Trees

### 5.1. Read Performance

**B-trees:**
- Looking up a key involves reading one page at each level (typically 3-4 levels)
- Predictable performance with low response times
- Range queries are simple and fast using the sorted tree structure

**LSM-trees:**
- Must check memtable and potentially several SSTables at different compaction stages
- Bloom filters reduce disk I/O by eliminating SSTables that don't contain the key
- Range queries must scan all segments in parallel and merge results

> **💡 Insight**
>
> Both approaches can perform well for reads—which is faster depends on the workload and implementation details. Benchmarks are often sensitive to specifics, so you must test with your particular workload to make a valid comparison.

**Read throughput:** Modern SSDs (especially NVMe) can perform many independent read requests in parallel. Both LSM-trees and B-trees can achieve high read throughput, but storage engines must be carefully designed to exploit this parallelism.

### 5.2. Sequential vs. Random Writes

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WRITE PATTERNS                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   B-TREE (UPDATE-IN-PLACE)         LSM-TREE (LOG-STRUCTURED)              │
│   ──────────────────────           ─────────────────────                  │
│                                                                           │
│   Scattered random writes          Sequential writes                      │
│                                                                           │
│   ┌────────────────────┐           ┌────────────────────┐                │
│   │ Page 42 (4 KB)     │           │ Segment file       │                │
│   │ ... (updated)      │           │ (several MB)       │                │
│   ├────────────────────┤           │                    │                │
│   │ Page 137 (4 KB)    │           │ Write entire file  │                │
│   │ ... (updated)      │           │ sequentially       │                │
│   ├────────────────────┤           │                    │                │
│   │ Page 89 (4 KB)     │           └────────────────────┘                │
│   │ ... (updated)      │                                                  │
│   └────────────────────┘           Higher throughput on same hardware     │
│                                                                           │
│   Pages scattered across disk      Fewer, larger writes                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**B-trees:** When the application writes keys scattered across the key space, the resulting disk operations are also scattered randomly. Each page to update could be anywhere on disk.

**LSM-trees:** Write entire segment files at a time (memtable flush or compaction), which are much larger than B-tree pages.

**Sequential vs. Random Write Performance:**

- **On spinning-disk HDDs:** Sequential writes are **much faster** than random writes (no mechanical head movement). LSM-trees have a big advantage.
- **On SSDs:** Sequential writes are still faster than random writes due to garbage collection (GC) overhead, but the difference is smaller than on HDDs.

> **💡 Insight**
>
> Even on SSDs, sequential writes outperform random writes. Flash memory is written page-by-page (4 KB) but erased block-by-block (512 KB). Random writes scatter pages across blocks, forcing the SSD controller to perform more garbage collection before erasing blocks. Sequential writes fill entire blocks, which can be erased without GC overhead.

### 5.3. Write Amplification

**In plain English:** Write amplification is like making photocopies. If you need to make one copy of a document, but the copier forces you to copy the entire binder it's in, that's write amplification. The database writes more bytes to disk than the application requested.

**In technical terms:** Write amplification is the ratio of bytes written to disk divided by bytes written by the application. Higher write amplification reduces throughput and wears out SSDs faster.

**LSM-trees:**
- A value is written to the log (durability)
- Written again when memtable is flushed
- Written again every time it's part of a compaction
- Mitigated by storing values separately from keys (if values are large)

**B-trees:**
- Write to WAL (durability)
- Write to tree page (may need to write entire page even if only a few bytes changed)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WRITE AMPLIFICATION COMPARISON                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Application writes 1 MB of data                                        │
│                                                                           │
│   LSM-TREE:                          B-TREE:                              │
│   1 MB → log                         1 MB → WAL                           │
│   1 MB → SSTable                     4 MB → tree pages (partial writes)  │
│   2 MB → compaction L0→L1                                                │
│   2 MB → compaction L1→L2            Total: ~5 MB written                 │
│   ...                                                                     │
│   Total: ~6-10 MB written            Write amplification: 5x              │
│   Write amplification: 6-10x                                              │
│                                                                           │
│   LSM-trees tend to have lower write amplification because:              │
│   • They can compress chunks of SSTables                                 │
│   • They don't write entire pages for small updates                      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

For typical workloads, **LSM-trees tend to have lower write amplification** because they compress data and don't write entire pages for small updates. This makes LSM storage engines well suited for write-heavy workloads.

**Impact of write amplification:**
1. **Throughput** — Higher amplification means fewer effective writes per second within available disk bandwidth
2. **SSD wear** — SSDs have limited write cycles; lower amplification extends SSD lifespan

### 5.4. Disk Space Usage

**B-trees:**
- Can become **fragmented** over time (deleted keys leave empty pages)
- Free pages can be reused, but can't easily be returned to the OS (they're in the middle of the file)
- Databases need background processes to defragment (e.g., PostgreSQL's `VACUUM`)

**LSM-trees:**
- Compaction periodically rewrites data files, eliminating fragmentation
- SSTables don't have unused space within pages
- Better compression due to larger blocks
- Deleted keys (tombstones) continue to consume space until compacted out

**Snapshots:** LSM-trees make snapshots easy—just record which segment files existed at a point in time (no need to copy them, since they're immutable). B-trees with in-place updates need more complex snapshot mechanisms.

---

## 6. Multi-Column and Secondary Indexes

### 6.1. Storing Values Within the Index

So far we've discussed **primary key indexes**. In relational databases, you can also create **secondary indexes** on other columns using `CREATE INDEX`.

**In plain English:** A primary key is like your home address—it uniquely identifies you. Secondary indexes are like phone books sorted by last name or by street name—different ways to look up the same information.

**In technical terms:** A secondary index maps non-unique values to rows. This can be implemented as:
1. A list of matching row IDs (like a postings list)
2. Unique entries by appending a row ID to each key

**Where to store the actual row data:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    INDEX STORAGE OPTIONS                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   CLUSTERED INDEX                                                         │
│   ────────────────                                                        │
│   Store actual row data within the index structure                        │
│                                                                           │
│   ┌─────────────────────────────────────┐                                │
│   │ Primary Key Index                   │                                │
│   ├────────┬────────────────────────────┤                                │
│   │ Key 12 │ {name: "Alice", age: 30}   │  ← Full row data               │
│   │ Key 42 │ {name: "Bob", age: 25}     │                                │
│   └────────┴────────────────────────────┘                                │
│                                                                           │
│   Advantage: Fast reads (one lookup)                                     │
│   Disadvantage: Duplicates data, slower writes                           │
│   Example: MySQL InnoDB primary key                                      │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   HEAP FILE WITH REFERENCE                                                │
│   ──────────────────────                                                  │
│   Index stores reference to heap file location                            │
│                                                                           │
│   ┌─────────────────────┐         ┌──────────────────────────┐           │
│   │ Index               │         │ Heap File (unordered)    │           │
│   ├────────┬────────────┤         ├──────────────────────────┤           │
│   │ Key 12 │ → offset 0 │────────▶│ 0: {name: "Alice", ...}  │           │
│   │ Key 42 │ → offset 1 │───┐     │ 1: {name: "Bob", ...}    │           │
│   └────────┴────────────┘   └────▶│ ...                      │           │
│                                   └──────────────────────────┘           │
│                                                                           │
│   Advantage: Avoids duplication, flexible storage                        │
│   Disadvantage: Two lookups (index + heap)                               │
│   Example: PostgreSQL                                                    │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   COVERING INDEX                                                          │
│   ───────────────                                                         │
│   Store some columns in index, rest in heap/clustered index             │
│                                                                           │
│   ┌─────────────────────────────────────┐                                │
│   │ Secondary Index (email)             │                                │
│   ├───────────────────┬─────────────────┤                                │
│   │ alice@example.com │ name: "Alice"   │  ← Some columns included       │
│   │ bob@example.com   │ name: "Bob"     │                                │
│   └───────────────────┴─────────────────┘                                │
│                                                                           │
│   Advantage: Some queries answered by index alone (no heap lookup)       │
│   Disadvantage: More disk space, slower writes                           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2. Keeping Everything in Memory

The data structures we've discussed (LSM-trees, B-trees) are designed around disk limitations. As RAM becomes cheaper, **in-memory databases** store everything in memory.

**In plain English:** It's like the difference between storing files on your desk (RAM) versus in a filing cabinet (disk). Accessing your desk is instant; the filing cabinet requires walking over and searching through drawers.

**Common misconception:** In-memory databases are fast because they avoid disk reads.

**Reality:** Even disk-based databases use the OS page cache, so frequently accessed data is already in memory. The real advantage is **avoiding the overhead of encoding data for disk storage**.

**In-memory database durability:**

While the dataset lives in memory, durability can be achieved through:
1. Battery-powered RAM
2. Append-only log written to disk
3. Periodic snapshots written to disk
4. Replicating state to other machines

**Examples:**
- **VoltDB, SingleStore, Oracle TimesTen** — In-memory relational databases
- **RAMCloud** — In-memory key-value store with durability
- **Redis, Couchbase** — Weak durability (asynchronous disk writes)

> **💡 Insight**
>
> In-memory databases can also provide data models that are difficult with disk-based indexes. For example, **Redis** offers priority queues, sets, and other data structures with a simple implementation because everything is in memory.

---

## 7. Data Storage for Analytics

The data model of a data warehouse is typically relational, and SQL is a good fit for analytic queries. However, the **internals differ drastically** from OLTP databases because they're optimized for different query patterns.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    OLTP vs. OLAP STORAGE                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   OLTP (Transaction Processing)    OLAP (Analytics)                      │
│   ───────────────────────────      ────────────────                      │
│                                                                           │
│   Query pattern:                   Query pattern:                        │
│   • Small number of records        • Aggregate over millions of rows     │
│   • Fetched by key                 • Scan few columns, many rows         │
│   • Random reads/writes            • Sequential scans                    │
│                                                                           │
│   Storage:                         Storage:                              │
│   • Row-oriented                   • Column-oriented                     │
│   • B-trees or LSM-trees           • Columnar formats (Parquet)          │
│   • Indexes on many columns        • Compression, vectorization          │
│                                                                           │
│   Examples:                        Examples:                             │
│   • MySQL, PostgreSQL              • Snowflake, BigQuery                 │
│   • MongoDB, Cassandra             • Redshift, DuckDB                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.1. Cloud Data Warehouses

Modern cloud data warehouses separate storage and compute:

**Traditional data warehouses:** Teradata, Vertica, SAP HANA — tightly coupled storage and compute, often on specialized hardware

**Cloud data warehouses:** BigQuery, Snowflake, Redshift — leverage cloud infrastructure (object storage, serverless compute)

**Advantages of cloud data warehouses:**
- **Elasticity** — Scale storage and compute independently
- **Integration** — Easy integration with cloud services (automatic log ingestion, data processing frameworks)
- **Cost** — Pay for what you use

**Open source evolution:**

Components that were previously integrated (e.g., Apache Hive) are now separate:

1. **Query engine** — Trino, Apache DataFusion, Presto (parse SQL, optimize, execute)
2. **Storage format** — Parquet, ORC, Lance, Nimble (how rows are encoded as bytes)
3. **Table format** — Apache Iceberg, Delta Lake (manage files, support inserts/deletes, time travel)
4. **Data catalog** — Polaris, Unity Catalog (which tables comprise a database, metadata management)

### 7.2. Column-Oriented Storage

Data warehouses often use a **star schema** with a massive fact table (trillions of rows, 100+ columns) and smaller dimension tables. A typical query accesses only 4-5 columns but many rows.

**Problem with row-oriented storage:**

```sql
SELECT
  dim_date.weekday, dim_product.category,
  SUM(fact_sales.quantity) AS quantity_sold
FROM fact_sales
  JOIN dim_date ON fact_sales.date_key = dim_date.date_key
  JOIN dim_product ON fact_sales.product_sk = dim_product.product_sk
WHERE
  dim_date.year = 2024 AND
  dim_product.category IN ('Fresh fruit', 'Candy')
GROUP BY
  dim_date.weekday, dim_product.category;
```

This query needs only 3 columns (`date_key`, `product_sk`, `quantity`) but row-oriented storage forces you to load all 100+ columns for each row.

**Solution: Column-oriented storage**

**In plain English:** Instead of storing all information about one person together (row-oriented), store all names together, all ages together, all addresses together (column-oriented). When you need just names and ages, you read only those two lists.

**In technical terms:** Store all values from each column together. A query only reads and parses the columns it needs.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ROW-ORIENTED vs. COLUMN-ORIENTED                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ROW-ORIENTED (OLTP)                                                     │
│   ────────────────────                                                    │
│                                                                           │
│   ┌────────────────────────────────────────────────────────┐             │
│   │ Row 1: date_key=1, product_sk=31, quantity=5, ...     │             │
│   │ Row 2: date_key=1, product_sk=68, quantity=2, ...     │             │
│   │ Row 3: date_key=2, product_sk=31, quantity=1, ...     │             │
│   │ ...                                                    │             │
│   └────────────────────────────────────────────────────────┘             │
│                                                                           │
│   To read quantity, must load ALL columns for each row                   │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   COLUMN-ORIENTED (OLAP)                                                  │
│   ────────────────────────                                                │
│                                                                           │
│   date_key:    1, 1, 2, 2, 3, 3, ...                                     │
│   product_sk:  31, 68, 31, 69, 30, 31, ...                               │
│   quantity:    5, 2, 1, 3, 4, 1, ...                                     │
│   store_sk:    3, 3, 3, 4, 3, 3, ...                                     │
│   ...                                                                     │
│                                                                           │
│   To read quantity, load ONLY quantity column                            │
│   Rows reconstructed by taking nth value from each column                │
│                                                                           │
│   Used in: Snowflake, BigQuery, DuckDB, Parquet, Apache Arrow           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**How it works:**

- Each column is stored separately
- Columns store rows in the same order (23rd entry in each column belongs to the 23rd row)
- Queries only load the columns they need
- In practice, columns are broken into blocks (thousands/millions of rows per block)

### 7.3. Column Compression

Column-oriented storage enables excellent compression because:
- Values in a column are often repetitive (e.g., a retailer has billions of transactions but only 100,000 products)
- Compression reduces disk throughput and network bandwidth requirements

**Bitmap encoding:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    BITMAP ENCODING + COMPRESSION                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Original product_sk column (1 billion rows):                           │
│   31, 68, 69, 31, 31, 68, 30, 31, 69, 31, ...                            │
│                                                                           │
│   Convert to bitmaps (one per distinct value):                           │
│                                                                           │
│   product_sk = 30:  0, 0, 0, 0, 0, 0, 1, 0, 0, 0, ...                    │
│   product_sk = 31:  1, 0, 0, 1, 1, 0, 0, 1, 0, 1, ...                    │
│   product_sk = 68:  0, 1, 0, 0, 0, 1, 0, 0, 0, 0, ...                    │
│   product_sk = 69:  0, 0, 1, 0, 0, 0, 0, 0, 1, 0, ...                    │
│                                                                           │
│   Run-length encode (compress long runs of 0s and 1s):                   │
│                                                                           │
│   product_sk = 31:  1, 2 zeros, 2 ones, 1 zero, 1 one, 1 zero, 1 one ... │
│                                                                           │
│   Query: WHERE product_sk IN (31, 68, 69)                                │
│   → Bitwise OR of three bitmaps (very fast!)                             │
│                                                                           │
│   Query: WHERE product_sk = 30 AND store_sk = 3                          │
│   → Bitwise AND of two bitmaps                                           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Bitmap indexes work well for analytics because:**
- IN clauses → Bitwise OR
- AND clauses → Bitwise AND
- CPUs have fast bitwise operations
- Run-length encoding + roaring bitmaps make storage extremely compact

### 7.4. Sort Order in Column Storage

Although columns are stored separately, we can impose a sort order on rows (similar to SSTables).

**In plain English:** Think of organizing a filing cabinet. You might sort files by date as the primary key, then by customer name as the secondary key. All files for the same date are grouped together, and within each date, they're sorted by customer.

**Example:** Sort by `date_key` first, then `product_sk`:
- Queries targeting date ranges (e.g., last month) can scan only the relevant rows
- Sales for the same product on the same day are grouped together in storage

**Compression benefit:** Sorting improves compression. If the primary sort column has long runs of the same value, run-length encoding compresses it dramatically (even billions of rows down to kilobytes).

### 7.5. Writing to Column-Oriented Storage

Column-oriented storage, compression, and sorting make **reads fast**, but writes are more complex.

**Challenge:** Inserting a single row in the middle of a sorted columnar table would require rewriting all compressed columns from the insertion point onwards.

**Solution: LSM-tree approach**

1. All writes go to an in-memory **row-oriented** sorted store
2. When enough writes accumulate, merge with column-encoded files on disk and write new files in bulk
3. Queries examine both the in-memory writes and column data on disk, hiding the distinction from users

**Systems using this approach:** Snowflake, Vertica, Apache Pinot, Apache Druid, DuckDB

### 7.6. Query Execution: Compilation and Vectorization

For analytics queries scanning millions of rows, CPU efficiency matters as much as I/O.

Two approaches have emerged:

**Query compilation:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│                    QUERY COMPILATION                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   SQL query → Generate code → Compile to machine code → Execute          │
│                                                                           │
│   Example generated code (pseudo-C):                                      │
│                                                                           │
│   for (int i = 0; i < num_rows; i++) {                                   │
│     if (product_sk[i] == 30 && store_sk[i] == 3) {                       │
│       output[output_count++] = quantity[i];                              │
│     }                                                                     │
│   }                                                                       │
│                                                                           │
│   Compiled using LLVM or similar (like JIT compilation in JVM)           │
│   Tight loop, no function calls, predictable branches                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Vectorized processing:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│                    VECTORIZED PROCESSING                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Process many values in a batch instead of one row at a time            │
│                                                                           │
│   product_sk column:  [31, 68, 69, 30, 31, 68, ...]                      │
│         │                                                                 │
│         ▼                                                                 │
│   Equality operator (product_sk == 30)                                   │
│         │                                                                 │
│         ▼                                                                 │
│   Bitmap result:      [0, 0, 0, 1, 0, 0, ...]                            │
│                                                                           │
│   store_sk column:    [3, 3, 4, 3, 3, 4, ...]                            │
│         │                                                                 │
│         ▼                                                                 │
│   Equality operator (store_sk == 3)                                      │
│         │                                                                 │
│         ▼                                                                 │
│   Bitmap result:      [1, 1, 0, 1, 1, 0, ...]                            │
│                                                                           │
│   Bitwise AND:        [0, 0, 0, 1, 0, 0, ...]                            │
│                                                                           │
│   Use bitmap to filter quantity column                                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

Both approaches achieve good performance by:
- Preferring sequential memory access (reduce cache misses)
- Tight inner loops (keep CPU pipeline busy, avoid branch mispredictions)
- Parallelism (multiple threads, SIMD instructions)
- Operating directly on compressed data (saves memory allocation and copying)

### 7.7. Materialized Views and Data Cubes

**Materialized view:** A table-like object whose contents are the results of a query, written to disk.

**In plain English:** Instead of computing a complex report every time someone asks for it, compute it once, save the result, and update it when the underlying data changes. It's like pre-cooking meals instead of cooking from scratch every time.

**Data cube (OLAP cube):** A special type of materialized view that creates a grid of aggregates grouped by different dimensions.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DATA CUBE EXAMPLE                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Two dimensions: date and product                                        │
│                                                                           │
│              Products →                                                   │
│   Dates    ┌──────────┬──────────┬──────────┬────────────┐              │
│     ↓      │  Apples  │ Bananas  │ Cherries │   Total    │              │
│   ┌────────┼──────────┼──────────┼──────────┼────────────┤              │
│   │ Jan 1  │   $120   │   $80    │   $50    │   $250     │              │
│   ├────────┼──────────┼──────────┼──────────┼────────────┤              │
│   │ Jan 2  │   $100   │   $90    │   $60    │   $250     │              │
│   ├────────┼──────────┼──────────┼──────────┼────────────┤              │
│   │ Jan 3  │   $130   │   $70    │   $40    │   $240     │              │
│   ├────────┼──────────┼──────────┼──────────┼────────────┤              │
│   │ Total  │   $350   │   $240   │   $150   │   $740     │              │
│   └────────┴──────────┴──────────┴──────────┴────────────┘              │
│                                                                           │
│   Each cell: SUM(sales) for that date-product combination                │
│   Marginal totals: Aggregates reduced by one dimension                   │
│                                                                           │
│   In reality, facts have 5+ dimensions (date, product, store,            │
│   promotion, customer) → 5-dimensional hypercube                         │
│                                                                           │
│   Advantage: Certain queries become very fast (pre-computed)             │
│   Disadvantage: No flexibility (can't answer questions not               │
│                 aligned with cube dimensions)                            │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Trade-off:**
- **Advantage:** Certain queries become very fast (effectively pre-computed)
- **Disadvantage:** No flexibility—can't answer ad-hoc questions that don't align with cube dimensions

Most data warehouses keep raw data and use cubes only as a performance boost for specific queries.

---

## 8. Multidimensional and Full-Text Indexes

### 8.1. Multidimensional Indexes

B-trees and LSM-trees allow range queries over a **single attribute**. But sometimes you need to query **multiple columns simultaneously**.

**Example: Geospatial queries**

A restaurant-search website needs to find all restaurants within a rectangular map area:

```sql
SELECT * FROM restaurants
WHERE latitude  > 51.4946 AND latitude  < 51.5079
  AND longitude > -0.1162 AND longitude < -0.1004;
```

A **concatenated index** over `(latitude, longitude)` can't answer this efficiently—it can give you either all restaurants in a range of latitudes (at any longitude), or all in a range of longitudes (at any latitude), but not both.

**Solutions:**

1. **Space-filling curves** — Translate 2D location into a single number using a curve, then use a regular B-tree
2. **R-trees** — Divide space so nearby points tend to be grouped in the same subtree
3. **Grid-based approaches** — Use regularly spaced grids (triangles, squares, hexagons)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    R-TREE FOR GEOSPATIAL QUERIES                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Space divided into bounding boxes at multiple levels                   │
│                                                                           │
│   ┌──────────────────────────────────────────────────┐                   │
│   │                  Root Box                         │                   │
│   │  ┌──────────────┐      ┌─────────────────────┐  │                   │
│   │  │   Box A      │      │      Box B          │  │                   │
│   │  │  ┌─────┐     │      │  ┌─────┐  ┌──────┐ │  │                   │
│   │  │  │ R1  │ R2  │      │  │ R5  │  │  R6  │ │  │                   │
│   │  │  └─────┘     │      │  └─────┘  └──────┘ │  │                   │
│   │  │    R3  R4    │      │     R7              │  │                   │
│   │  └──────────────┘      └─────────────────────┘  │                   │
│   └──────────────────────────────────────────────────┘                   │
│                                                                           │
│   Query: Find restaurants in shaded area                                 │
│   1. Check if query box intersects Root Box → Yes                        │
│   2. Check if query box intersects Box A → Yes                           │
│   3. Check if query box intersects Box B → No (skip)                     │
│   4. Check restaurants R1, R2, R3, R4 individually                        │
│                                                                           │
│   Nearby points tend to be in same subtree → efficient pruning           │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Other uses:** Not just for geography—can be used for any multi-dimensional data:
- Colors: 3D index on (red, green, blue) to search for products in a color range
- Weather data: 2D index on (date, temperature) to find observations in a time-temperature range

### 8.2. Full-Text Search

Full-text search allows searching text documents by keywords appearing anywhere in the text. This is a specialized domain with language-specific processing (tokenization, stemming, typos, synonyms).

**Core idea:** Think of full-text search as a multidimensional query where each possible word (term) is a dimension.

**Inverted index:** The primary data structure for full-text search.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    INVERTED INDEX                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Documents:                                                              │
│   Doc 1: "red apples are delicious"                                      │
│   Doc 2: "green apples are healthy"                                      │
│   Doc 3: "red roses are beautiful"                                       │
│                                                                           │
│   Inverted Index (term → document IDs):                                  │
│   ┌────────────┬─────────────────────┐                                   │
│   │ Term       │ Postings List       │                                   │
│   ├────────────┼─────────────────────┤                                   │
│   │ red        │ [1, 3]              │                                   │
│   │ green      │ [2]                 │                                   │
│   │ apples     │ [1, 2]              │                                   │
│   │ roses      │ [3]                 │                                   │
│   │ delicious  │ [1]                 │                                   │
│   │ healthy    │ [2]                 │                                   │
│   │ beautiful  │ [3]                 │                                   │
│   └────────────┴─────────────────────┘                                   │
│                                                                           │
│   Query: "red apples"                                                     │
│   1. Load postings list for "red": [1, 3]                                │
│   2. Load postings list for "apples": [1, 2]                             │
│   3. Bitwise AND: [1]                                                     │
│   4. Return Doc 1                                                         │
│                                                                           │
│   Postings lists stored as sparse bitmaps or run-length encoded          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Implementation:** Lucene (used by Elasticsearch and Solr) stores term-to-postings-list mappings in SSTable-like sorted files, merged in the background using LSM-tree approach. PostgreSQL's GIN index also uses postings lists.

**Advanced features:**

- **N-grams** — Break text into substrings of length n (e.g., trigrams of "hello": "hel", "ell", "llo"). Enables substring search and regular expressions.
- **Fuzzy search** — Levenshtein automaton allows searching for words within a given edit distance (typos).

### 8.3. Vector Embeddings

**Semantic search** goes beyond keyword matching to understand document concepts and user intent.

**In plain English:** Traditional search looks for exact words. If your help page says "cancelling your subscription" but the user searches for "close my account," traditional search fails. Semantic search understands they mean the same thing.

**In technical terms:** Embedding models translate documents into **vector embeddings**—lists of floating-point numbers representing a point in multi-dimensional space. Semantically similar documents have vectors that are close together.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    VECTOR EMBEDDINGS                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Simplified 3D example (real embeddings have 100-1000+ dimensions):     │
│                                                                           │
│   Document: "Agriculture"     → Vector: [0.1, 0.22, 0.11]                │
│   Document: "Vegetables"      → Vector: [0.13, 0.19, 0.24]               │
│   Document: "Star schemas"    → Vector: [0.82, 0.39, -0.74]              │
│                                                                           │
│   Distance (Agriculture, Vegetables):   ~0.1   (close!)                  │
│   Distance (Agriculture, Star schemas): ~0.9   (far)                     │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   VECTOR INDEX TYPES:                                                     │
│                                                                           │
│   FLAT INDEX                                                              │
│   ──────────                                                              │
│   • Store all vectors as-is                                              │
│   • Query: Compare with every vector                                     │
│   • Accurate but slow (O(n))                                             │
│                                                                           │
│   IVF (INVERTED FILE) INDEX                                               │
│   ───────────────────────────                                            │
│   • Cluster vectors into partitions (centroids)                          │
│   • Query: Check only nearest partitions                                 │
│   • Fast but approximate (may miss vectors in other partitions)          │
│                                                                           │
│   HNSW (HIERARCHICAL NAVIGABLE SMALL WORLD)                               │
│   ──────────────────────────────────────────────                         │
│   • Multiple layers of graphs                                            │
│   • Top layer: sparse, few nodes                                         │
│   • Bottom layer: dense, all vectors                                     │
│   • Query: Start at top, navigate down following nearest neighbors       │
│   • Fast and accurate (approximate)                                      │
│                                                                           │
│   Used in: pgvector, Faiss, Pinecone, Weaviate, Milvus                  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**How semantic search works:**

1. **Indexing:** Generate vector embeddings for all documents using an embedding model (Word2Vec, BERT, GPT, multimodal models)
2. **Querying:** User enters query → embedding model generates query vector
3. **Retrieval:** Vector index returns documents with closest vectors (using cosine similarity or Euclidean distance)

**Vector indexes:**

- **Flat indexes** — Accurate but slow (compare with every vector)
- **IVF indexes** — Partition space into clusters; only check nearest partitions (approximate)
- **HNSW indexes** — Multi-layer graphs; navigate from coarse to fine (approximate)

> **💡 Insight**
>
> R-trees work poorly for high-dimensional vectors (100-1000 dimensions) due to the "curse of dimensionality." Specialized indexes like IVF and HNSW are designed for high-dimensional spaces and accept approximate results for speed.

---

## 9. Summary

In this chapter we tried to get to the bottom of how databases perform storage and retrieval. What happens when you store data in a database, and what does the database do when you query for the data again later?

We saw that storage engines optimized for **OLTP** look very different from those optimized for **analytics (OLAP)**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    STORAGE ENGINE LANDSCAPE                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   OLTP STORAGE ENGINES                                                    │
│   ──────────────────────                                                  │
│                                                                           │
│   Log-Structured Approach:                                                │
│   • Append-only files, immutable SSTables                                │
│   • LSM-trees, RocksDB, Cassandra, HBase, Scylla, Lucene                 │
│   • High write throughput                                                 │
│   • Good for write-heavy workloads                                       │
│                                                                           │
│   Update-in-Place Approach:                                               │
│   • Fixed-size pages overwritten in place                                │
│   • B-trees (all major relational databases)                             │
│   • Fast reads, predictable performance                                  │
│   • Good for read-heavy workloads                                        │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   OLAP STORAGE ENGINES                                                    │
│   ──────────────────────                                                  │
│                                                                           │
│   Column-Oriented Storage:                                                │
│   • Store values from each column together                               │
│   • Snowflake, BigQuery, Redshift, DuckDB, Parquet                       │
│   • Compression (bitmap encoding, run-length)                            │
│   • Vectorized execution or query compilation                            │
│   • Scan millions of rows efficiently                                    │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   SPECIALIZED INDEXES                                                     │
│   ──────────────────                                                      │
│                                                                           │
│   Multidimensional: R-trees for geospatial queries                       │
│   Full-text: Inverted indexes for keyword search                         │
│   Semantic: Vector indexes (IVF, HNSW) for similarity search             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key takeaways:**

1. **OLTP systems** are optimized for high-volume small reads/writes accessed via primary or secondary indexes (ordered mappings from key to record).

2. **Data warehouses and analytics systems** are optimized for complex queries scanning millions of records using column-oriented storage with compression, minimizing disk I/O and CPU time.

3. **Log-structured storage** (LSM-trees) appends to files and never updates in place. Provides high write throughput. Examples: RocksDB, Cassandra, HBase.

4. **Update-in-place storage** (B-trees) treats disk as fixed-size pages that can be overwritten. Faster for reads with predictable performance. Used in all major relational databases.

5. **The fundamental trade-off:** Structures that make writes fast (append-only logs) make reads slow. Structures that make reads fast (sorted indexes) make writes slow. Every storage engine is a carefully chosen compromise.

6. **Indexes speed up reads but slow down writes.** You must choose indexes based on your application's query patterns, balancing read performance against write overhead.

7. **Column-oriented storage** excels at analytics by reading only the columns needed for a query. Combined with compression (bitmap encoding), sorting, and vectorization, it enables scanning billions of rows in seconds.

8. **Specialized indexes** exist for specific use cases: R-trees for geospatial queries, inverted indexes for full-text search, and vector indexes (IVF, HNSW) for semantic search.

> **💡 Insight**
>
> As an application developer, understanding storage engine internals helps you choose the right database for your workload, tune configuration parameters effectively, and diagnose performance issues. While you won't become an expert in any single engine from this chapter, you now have the vocabulary and mental models to make sense of database documentation and make informed decisions.

In Chapter 5, we'll turn to **encoding and evolution**—how data formats change over time while maintaining backward and forward compatibility.

---

**Previous:** [Chapter 3](chapter03-data-models.md) | **Next:** [Chapter 5](chapter05-encoding-evolution.md)
