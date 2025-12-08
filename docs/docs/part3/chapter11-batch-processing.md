---
sidebar_position: 1
title: "Chapter 11. Batch Processing"
description: "Learn about batch processing systems, MapReduce, distributed filesystems, and how to process massive datasets efficiently"
---

# Chapter 11. Batch Processing

> A system cannot be successful if it is too strongly influenced by a single person. Once the initial design is complete and fairly robust, the real test begins as people with many different viewpoints undertake their own experiments.
>
> _Donald Knuth_

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1. [Online vs. Batch vs. Stream](#11-online-vs-batch-vs-stream)
   - 1.2. [Why Batch Processing Matters](#12-why-batch-processing-matters)
2. [Batch Processing with Unix Tools](#2-batch-processing-with-unix-tools)
   - 2.1. [Simple Log Analysis](#21-simple-log-analysis)
   - 2.2. [Chain of Commands vs. Custom Program](#22-chain-of-commands-vs-custom-program)
   - 2.3. [Sorting vs. In-Memory Aggregation](#23-sorting-vs-in-memory-aggregation)
3. [Batch Processing in Distributed Systems](#3-batch-processing-in-distributed-systems)
   - 3.1. [Distributed Filesystems](#31-distributed-filesystems)
   - 3.2. [Object Stores](#32-object-stores)
   - 3.3. [Distributed Job Orchestration](#33-distributed-job-orchestration)
   - 3.4. [Resource Allocation](#34-resource-allocation)
   - 3.5. [Scheduling Workflows](#35-scheduling-workflows)
   - 3.6. [Handling Faults](#36-handling-faults)
4. [Batch Processing Models](#4-batch-processing-models)
   - 4.1. [MapReduce](#41-mapreduce)
   - 4.2. [Dataflow Engines](#42-dataflow-engines)
   - 4.3. [Shuffling Data](#43-shuffling-data)
   - 4.4. [JOIN and GROUP BY](#44-join-and-group-by)
5. [Query Languages and DataFrames](#5-query-languages-and-dataframes)
   - 5.1. [SQL for Batch Processing](#51-sql-for-batch-processing)
   - 5.2. [DataFrames](#52-dataframes)
   - 5.3. [Batch Processing and Data Warehouses Converge](#53-batch-processing-and-data-warehouses-converge)
6. [Batch Use Cases](#6-batch-use-cases)
   - 6.1. [Extract-Transform-Load (ETL)](#61-extract-transform-load-etl)
   - 6.2. [Analytics](#62-analytics)
   - 6.3. [Machine Learning](#63-machine-learning)
   - 6.4. [Bulk Data Imports](#64-bulk-data-imports)
7. [Summary](#7-summary)

---

## 1. Introduction

**In plain English:** Think of batch processing like doing laundry. Instead of washing each shirt individually as it gets dirty (that would be exhausting!), you wait until you have a full load, then process everything at once. Batch processing works the same way with data—you collect a bunch of it, then process it all together.

**In technical terms:** Batch processing takes a set of input data (which is read-only), and produces output data (which is generated from scratch every time the job runs). Unlike online transactions, batch jobs don't mutate data—they derive new outputs from existing inputs.

**Why it matters:** If you introduce a bug and the output is wrong, you can simply roll back to a previous version of the code and rerun the job. This "human fault tolerance" enables faster feature development because mistakes aren't irreversible.

### 1.1. Online vs. Batch vs. Stream

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THREE STYLES OF DATA PROCESSING                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ONLINE SYSTEMS              BATCH SYSTEMS              STREAM SYSTEMS   │
│  ───────────────             ─────────────              ──────────────   │
│                                                                          │
│  Request → Response          Input → Output             Event → Action   │
│       ↓                           ↓                          ↓           │
│  User clicks               Job processes               Message arrives  │
│  "Buy Now"                 yesterday's logs            in queue         │
│       ↓                           ↓                          ↓           │
│  Response in               Results in                  Processed in     │
│  milliseconds              minutes/hours               seconds          │
│                                                                          │
│  ┌─────────┐               ┌─────────────┐             ┌───────────┐    │
│  │ Primary │               │  Primary    │             │  Primary  │    │
│  │ Metric: │               │  Metric:    │             │  Metric:  │    │
│  │ Latency │               │  Throughput │             │  Freshness│    │
│  └─────────┘               └─────────────┘             └───────────┘    │
│                                                                          │
│  Examples:                  Examples:                   Examples:        │
│  - Web servers              - Log analysis              - Fraud detection│
│  - Databases                - ML training               - Live dashboards│
│  - APIs                     - ETL pipelines             - CDC replication│
└─────────────────────────────────────────────────────────────────────────┘
```

| System Type | Response Time | Input | Examples |
|-------------|---------------|-------|----------|
| **Online** | Milliseconds | Individual requests | Web servers, APIs, databases |
| **Batch** | Minutes to days | Bounded datasets | ETL, ML training, analytics |
| **Stream** | Seconds | Unbounded events | Real-time dashboards, CDC |

### 1.2. Why Batch Processing Matters

Batch processing offers unique advantages that make it a fundamental building block for reliable systems:

> **💡 Insight**
>
> The key property of batch processing is **immutability**: inputs are never modified. This seemingly simple constraint has profound implications. If something goes wrong, you can always rerun the job to produce correct output. The same input files can be used by multiple jobs for different purposes. And you can compare outputs across job runs to detect anomalies.

**Benefits of batch processing:**

1. **Human fault tolerance** — If you deploy buggy code that produces wrong output, just roll back and rerun. Compare this to a database where bad writes corrupt data permanently.

2. **Reproducibility** — The same input always produces the same output, making debugging straightforward.

3. **Parallel processing** — Different parts of the input can be processed independently, enabling horizontal scaling.

4. **Cost efficiency** — Jobs can run during off-peak hours, use spot instances, and process massive amounts of data economically.

---

## 2. Batch Processing with Unix Tools

Before diving into distributed systems, let's understand batch processing fundamentals using tools you already have: Unix commands.

### 2.1. Simple Log Analysis

Say you have a web server log file and want to find the five most popular pages:

```
216.58.210.78 - - [27/Jun/2025:17:55:11 +0000] "GET /css/typography.css HTTP/1.1"
200 3377 "https://martin.kleppmann.com/" "Mozilla/5.0 ..."
```

You can analyze it with a chain of Unix commands:

```bash
cat /var/log/nginx/access.log |   # 1. Read the log file
  awk '{print $7}' |               # 2. Extract the URL (7th field)
  sort             |               # 3. Sort URLs alphabetically
  uniq -c          |               # 4. Count consecutive duplicates
  sort -r -n       |               # 5. Sort by count (descending)
  head -n 5                        # 6. Take top 5
```

**Output:**
```
4189 /favicon.ico
3631 /2016/02/08/how-to-do-distributed-locking.html
2124 /2020/11/18/distributed-systems-and-elliptic-curves.html
1369 /
 915 /css/typography.css
```

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    UNIX PIPELINE DATA FLOW                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  access.log                                                               │
│      │                                                                    │
│      ▼                                                                    │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐     │
│  │  cat   │───▶│  awk   │───▶│  sort  │───▶│ uniq-c │───▶│  sort  │──┐  │
│  └────────┘    └────────┘    └────────┘    └────────┘    └────────┘  │  │
│                                                                       │  │
│  Full lines    URLs only     Sorted        Counted       By count    │  │
│  from file     extracted     A-Z           per URL       descending  │  │
│                                                                       │  │
│                                                    ┌────────┐         │  │
│                                                    │  head  │◀────────┘  │
│                                                    └────────┘            │
│                                                         │                │
│                                                         ▼                │
│                                                    Top 5 URLs            │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> This pipeline processes gigabytes in seconds because each tool does one thing well and data flows between them efficiently. The key pattern is **sort → group → aggregate**, which is exactly what distributed batch systems like MapReduce use at massive scale.

### 2.2. Chain of Commands vs. Custom Program

The same analysis in Python:

```python
from collections import defaultdict

counts = defaultdict(int)  # Counter for each URL

with open('/var/log/nginx/access.log', 'r') as file:
    for line in file:
        url = line.split()[6]  # Extract URL (7th field, 0-indexed)
        counts[url] += 1       # Increment counter

# Sort by count descending, take top 5
top5 = sorted(((count, url) for url, count in counts.items()),
              reverse=True)[:5]

for count, url in top5:
    print(f"{count} {url}")
```

Both approaches work, but the execution models differ fundamentally:

| Aspect | Unix Pipeline | Python Script |
|--------|---------------|---------------|
| **Aggregation** | Sort then count adjacent | Hash table in memory |
| **Memory** | Streaming (minimal) | Proportional to unique URLs |
| **Large data** | Spills to disk automatically | May run out of memory |

### 2.3. Sorting vs. In-Memory Aggregation

**In plain English:** Imagine counting votes. You could either keep a tally sheet (hash table) where you update counts as you go, or you could sort all the ballots by candidate name first, then just count how many are in each pile.

**When to use which:**

- **Hash table (in-memory)**: Fast when all unique keys fit in memory. If you have 1 million log entries but only 10,000 unique URLs, a hash table works great.

- **Sorting**: Better when data exceeds memory. The `sort` utility automatically spills to disk and parallelizes across CPU cores. Mergesort has sequential access patterns that perform well on disk.

> **💡 Insight**
>
> The Unix `sort` command is deceptively powerful—it automatically handles larger-than-memory datasets by spilling to disk and parallelizes across CPU cores. This is the same principle that distributed batch systems use: sort, merge, and scan.

**Limitation:** Unix tools run on a single machine. When datasets exceed local disk capacity, we need distributed batch processing frameworks.

---

## 3. Batch Processing in Distributed Systems

A distributed batch processing framework is essentially a **distributed operating system**. Just as your laptop has storage, a scheduler, and programs connected by pipes, distributed frameworks have:

```
┌─────────────────────────────────────────────────────────────────────────┐
│              SINGLE MACHINE vs. DISTRIBUTED BATCH SYSTEM                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│     SINGLE MACHINE                      DISTRIBUTED SYSTEM               │
│     ──────────────                      ──────────────────               │
│                                                                          │
│   ┌──────────────┐                    ┌──────────────────┐              │
│   │  Local Disk  │      ───────▶      │ Distributed FS   │              │
│   │  (ext4, XFS) │                    │ (HDFS, S3)       │              │
│   └──────────────┘                    └──────────────────┘              │
│                                                                          │
│   ┌──────────────┐                    ┌──────────────────┐              │
│   │  OS Scheduler│      ───────▶      │ Job Orchestrator │              │
│   │              │                    │ (YARN, K8s)      │              │
│   └──────────────┘                    └──────────────────┘              │
│                                                                          │
│   ┌──────────────┐                    ┌──────────────────┐              │
│   │  Unix Pipes  │      ───────▶      │ Shuffle/Network  │              │
│   │              │                    │ (data transfer)  │              │
│   └──────────────┘                    └──────────────────┘              │
│                                                                          │
│   ┌──────────────┐                    ┌──────────────────┐              │
│   │  Processes   │      ───────▶      │ Tasks            │              │
│   │  (awk, sort) │                    │ (mappers,reducers)│              │
│   └──────────────┘                    └──────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Distributed Filesystems

**In plain English:** Think of a distributed filesystem like a library system with multiple branches. Books (data blocks) are stored across different branches (machines), and there's a central catalog (metadata service) that knows where everything is. If one branch burns down, copies exist at other branches.

**Key components:**

| Component | Local Filesystem | Distributed Filesystem |
|-----------|------------------|------------------------|
| **Block size** | 4 KB (ext4) | 128 MB (HDFS) or 4 MB (S3) |
| **Data nodes** | Single disk | Many machines |
| **Metadata** | Inodes on disk | NameNode / metadata service |
| **Redundancy** | RAID | Replication or erasure coding |
| **Access** | VFS API | DFS protocol (HDFS, S3 API) |

**How it works:**

1. Files are split into large blocks (128 MB in HDFS)
2. Each block is replicated across multiple machines (typically 3)
3. A metadata service tracks which machines store which blocks
4. Clients read blocks from any replica; writes go to all replicas

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED FILESYSTEM ARCHITECTURE                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                        ┌─────────────────┐                                │
│                        │   NameNode /    │                                │
│                        │  Metadata Svc   │                                │
│                        │  (file→blocks)  │                                │
│                        └────────┬────────┘                                │
│                                 │                                         │
│              ┌──────────────────┼──────────────────┐                      │
│              │                  │                  │                      │
│              ▼                  ▼                  ▼                      │
│       ┌──────────┐       ┌──────────┐       ┌──────────┐                 │
│       │ DataNode │       │ DataNode │       │ DataNode │                 │
│       │    1     │       │    2     │       │    3     │                 │
│       ├──────────┤       ├──────────┤       ├──────────┤                 │
│       │ Block A  │       │ Block A  │       │ Block B  │                 │
│       │ Block B  │       │ Block C  │       │ Block C  │                 │
│       │ Block D  │       │ Block D  │       │ Block A  │                 │
│       └──────────┘       └──────────┘       └──────────┘                 │
│                                                                           │
│       File "logs.parquet" = [Block A, Block B, Block C, Block D]         │
│       Each block replicated 3x across different nodes                     │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> DFS blocks are much larger than local filesystem blocks (128 MB vs 4 KB) because the overhead of tracking each block scales with the number of blocks. At petabyte scale, millions of 4 KB blocks would overwhelm the metadata service. Large blocks also amortize network overhead—it's more efficient to stream 128 MB than to make 32,000 separate 4 KB requests.

### 3.2. Object Stores

Object stores (S3, GCS, Azure Blob) have become the dominant storage layer for batch processing, replacing HDFS in many deployments.

**Key differences from distributed filesystems:**

| Feature | Distributed FS (HDFS) | Object Store (S3) |
|---------|----------------------|-------------------|
| **Operations** | Open, seek, read, write, close | GET, PUT (whole object) |
| **Mutability** | Files can be appended | Objects are immutable |
| **Directories** | True directories | Key prefixes (simulated) |
| **Renames** | Atomic | Copy + delete (non-atomic) |
| **Compute locality** | Tasks run on data nodes | Storage/compute separated |
| **Cost model** | Capacity-based | Request + capacity |

**Object URL structure:**
```
s3://my-data-bucket/2025/06/27/events.parquet
     └── bucket ──┘ └─────── key ─────────┘
```

The slashes in the key are just conventions—there are no real directories. Listing objects with prefix `2025/06/` returns all matching keys.

### 3.3. Distributed Job Orchestration

**In plain English:** An orchestrator is like a construction site foreman. When you want to build something (run a job), the foreman figures out which workers are available, assigns tasks, monitors progress, and handles problems when workers get sick or equipment breaks.

**Components of job orchestration:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    JOB ORCHESTRATION COMPONENTS                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         SCHEDULER                                    │ │
│  │  • Receives job requests                                            │ │
│  │  • Decides which tasks run on which nodes                           │ │
│  │  • Balances fairness vs. efficiency                                 │ │
│  └───────────────────────────┬─────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      RESOURCE MANAGER                                │ │
│  │  • Tracks all nodes and their resources (CPU, GPU, memory)          │ │
│  │  • Maintains global cluster state in ZooKeeper/etcd                 │ │
│  │  • Knows what's running where                                       │ │
│  └───────────────────────────┬─────────────────────────────────────────┘ │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                      │
│         │                    │                    │                      │
│         ▼                    ▼                    ▼                      │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐              │
│  │  Executor   │      │  Executor   │      │  Executor   │              │
│  │  (Node 1)   │      │  (Node 2)   │      │  (Node 3)   │              │
│  │ ─────────── │      │ ─────────── │      │ ─────────── │              │
│  │ Task A      │      │ Task B      │      │ Task C      │              │
│  │ Task D      │      │ Task E      │      │ Task F      │              │
│  └─────────────┘      └─────────────┘      └─────────────┘              │
│                                                                           │
│  Executors: Run tasks, send heartbeats, report status                    │
│  Use cgroups for resource isolation between tasks                        │
└──────────────────────────────────────────────────────────────────────────┘
```

**Job request metadata includes:**
- Number of tasks to execute
- Resources per task (CPU, memory, disk, GPU)
- Job identifier and access credentials
- Input/output data locations
- Executable code location

### 3.4. Resource Allocation

Scheduling is **NP-hard**—finding an optimal allocation is computationally infeasible. Consider this scenario:

> A cluster has 160 CPU cores. Two jobs arrive, each requesting 100 cores. What should the scheduler do?

**Options and trade-offs:**

| Strategy | Behavior | Trade-off |
|----------|----------|-----------|
| **Fair share** | Run 80 tasks from each job | Neither finishes as fast as possible |
| **Gang scheduling** | Wait for all 100 cores, run one job | Nodes sit idle while waiting |
| **FIFO** | First job gets everything | Second job may starve |
| **Preemption** | Kill some tasks to make room | Wasted work from killed tasks |

Real schedulers use heuristics: FIFO, Dominant Resource Fairness (DRF), priority queues, capacity-based scheduling, and bin-packing algorithms.

### 3.5. Scheduling Workflows

Batch jobs often form **workflows** or **DAGs** (Directed Acyclic Graphs) where output of one job feeds into another:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW / DAG EXAMPLE                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                    ┌─────────────┐                                       │
│                    │ Raw Events  │                                       │
│                    │   (Input)   │                                       │
│                    └──────┬──────┘                                       │
│                           │                                              │
│                           ▼                                              │
│                    ┌─────────────┐                                       │
│                    │   Clean &   │                                       │
│                    │   Parse     │                                       │
│                    └──────┬──────┘                                       │
│                           │                                              │
│              ┌────────────┼────────────┐                                 │
│              │            │            │                                 │
│              ▼            ▼            ▼                                 │
│       ┌───────────┐ ┌───────────┐ ┌───────────┐                         │
│       │ Aggregate │ │ Join User │ │  Feature  │                         │
│       │ by Region │ │  Profiles │ │ Engineer  │                         │
│       └─────┬─────┘ └─────┬─────┘ └─────┬─────┘                         │
│             │             │             │                                │
│             ▼             ▼             ▼                                │
│       ┌───────────┐ ┌───────────┐ ┌───────────┐                         │
│       │ Regional  │ │  Joined   │ │  Training │                         │
│       │  Report   │ │   Data    │ │   Data    │                         │
│       └───────────┘ └───────────┘ └───────────┘                         │
│                                                                           │
│  Workflow schedulers: Airflow, Dagster, Prefect                          │
│  Wait for all inputs before running dependent jobs                        │
└──────────────────────────────────────────────────────────────────────────┘
```

> **💡 Insight**
>
> There's an important distinction between **job orchestrators** (YARN, Kubernetes) that schedule individual jobs and **workflow orchestrators** (Airflow, Dagster) that manage dependencies between jobs. A workflow with 50-100 interconnected jobs is common in data pipelines.

### 3.6. Handling Faults

Batch jobs run for long periods—minutes to days. With many parallel tasks, failures are inevitable:

- Hardware faults (especially on commodity hardware)
- Network interruptions
- **Preemption** by higher-priority jobs
- Spot instance terminations (to save cost)

**Fault tolerance strategies:**

| System | Intermediate Data | Recovery Method |
|--------|-------------------|-----------------|
| **MapReduce** | Written to DFS | Reread from DFS |
| **Spark** | Kept in memory | Recompute from lineage |
| **Flink** | Periodic checkpoints | Restore from checkpoint |

> **💡 Insight**
>
> Because batch jobs regenerate output from scratch, fault recovery is simpler than in online systems: just delete partial output and rerun the failed task. This wouldn't work if the job had side effects (like sending emails), which is why batch processing emphasizes immutable inputs and pure transformations.

---

## 4. Batch Processing Models

### 4.1. MapReduce

MapReduce mirrors our Unix log analysis example:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MAPREDUCE PIPELINE                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Unix:  cat | awk  | sort | uniq -c | sort -rn | head                   │
│           │     │      │       │          │         │                     │
│           ▼     ▼      ▼       ▼          ▼         ▼                     │
│   MapReduce:                                                              │
│         Read  Map   Shuffle   Reduce    (Second MapReduce job)           │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   STEP 1: READ                                                            │
│   Break input files into records                                          │
│   Input: Parquet/Avro files on HDFS or S3                                │
│                                                                           │
│   STEP 2: MAP                                                             │
│   Extract key-value pairs from each record                               │
│   Example: (URL, 1) for each log line                                    │
│                                                                           │
│   STEP 3: SHUFFLE (implicit)                                              │
│   Sort by key, group values with same key                                │
│   All values for "page.html" go to same reducer                          │
│                                                                           │
│   STEP 4: REDUCE                                                          │
│   Process grouped values, produce output                                 │
│   Example: sum up the 1s → ("page.html", 42)                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Mapper and Reducer:**

```python
# Mapper: called for each input record
def mapper(record):
    url = record['request_url']
    yield (url, 1)  # Emit key-value pair

# Reducer: called for each unique key with all its values
def reducer(key, values):
    count = sum(values)  # values is iterator over all 1s
    yield (key, count)
```

> **💡 Insight**
>
> MapReduce's programming model comes from **functional programming**—specifically Lisp's `map` and `reduce` (fold) higher-order functions. The key properties: map is embarrassingly parallel (each input processed independently), and reduce processes each key independently. This makes parallelization trivial.

**Why MapReduce is mostly obsolete:**

- Requires writing map/reduce in a general-purpose language
- No job pipelining (must wait for upstream job to finish completely)
- Always sorts between map and reduce (even when unnecessary)
- Replaced by Spark, Flink, and SQL-based systems

### 4.2. Dataflow Engines

Modern engines like **Spark** and **Flink** improve on MapReduce:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MAPREDUCE vs. DATAFLOW ENGINES                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   MapReduce:                                                              │
│   ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐        │
│   │ Map │───▶│Sort │───▶│Reduce│───▶│ Map │───▶│Sort │───▶│Reduce│       │
│   └─────┘    └─────┘    └─────┘    └─────┘    └─────┘    └─────┘        │
│      │                     │          │                     │            │
│      └─────── DFS ────────┘          └─────── DFS ────────┘             │
│        (always write)                   (always write)                   │
│                                                                           │
│   Dataflow Engine (Spark/Flink):                                         │
│   ┌─────┐    ┌──────┐    ┌─────┐    ┌───────┐    ┌────────┐             │
│   │Read │───▶│Filter│───▶│ Map │───▶│Shuffle│───▶│Aggregate│            │
│   └─────┘    └──────┘    └─────┘    └───────┘    └────────┘             │
│                  │            │                       │                  │
│                  └────── In memory ──────────────────┘                   │
│                     (only shuffle to disk if needed)                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Advantages of dataflow engines:**

| Feature | MapReduce | Dataflow Engines |
|---------|-----------|------------------|
| **Sorting** | Always between stages | Only when needed |
| **Intermediate data** | Written to DFS | In-memory or local disk |
| **Operator fusion** | Each stage separate | Adjacent ops combined |
| **Pipelining** | Wait for stage completion | Stream between stages |
| **Process reuse** | New JVM per task | Reuse processes |

### 4.3. Shuffling Data

**In plain English:** Shuffling is like sorting mail at a post office. Letters arrive from many mailboxes (mappers), and need to be organized so all letters for the same zip code (key) end up in the same bin (reducer).

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SHUFFLE IN MAPREDUCE                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Input Shards                           Output Shards                    │
│   ────────────                           ────────────                     │
│                                                                           │
│   ┌─────────┐                            ┌─────────┐                     │
│   │Shard m1 │─────┐                ┌────▶│Shard r1 │                     │
│   └─────────┘     │                │     └─────────┘                     │
│        │          │                │                                      │
│   ┌────▼────┐     │    Shuffle     │     ┌─────────┐                     │
│   │Mapper 1 │─────┼───────────────┼────▶│Shard r2 │                     │
│   └─────────┘     │    (sort by   │     └─────────┘                     │
│                   │     key hash)  │                                      │
│   ┌─────────┐     │                │     ┌─────────┐                     │
│   │Shard m2 │─────┤                └────▶│Shard r3 │                     │
│   └─────────┘     │                      └─────────┘                     │
│        │          │                           ▲                           │
│   ┌────▼────┐     │                           │                           │
│   │Mapper 2 │─────┤                           │                           │
│   └─────────┘     │         ┌─────────────────┘                          │
│                   │         │                                             │
│   ┌─────────┐     │         │                                             │
│   │Shard m3 │─────┘         │                                             │
│   └─────────┘               │                                             │
│        │                    │                                             │
│   ┌────▼────┐               │                                             │
│   │Mapper 3 │───────────────┘                                             │
│   └─────────┘                                                             │
│                                                                           │
│   Each mapper creates sorted files for each reducer                       │
│   hash(key) determines which reducer gets the key-value pair             │
│   Reducers merge sorted files from all mappers                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Shuffle process:**

1. Each mapper creates a separate output file for each reducer
2. Key hash determines destination: `hash(key) % num_reducers`
3. Mapper sorts key-value pairs within each file
4. Reducers fetch their files from all mappers
5. Reducers merge-sort the files together
6. Same keys are now adjacent → reducer iterates over values

> **💡 Insight**
>
> Despite the name, shuffle produces **sorted** order, not random order. The term comes from shuffling a deck of cards to redistribute them, not to randomize. Modern systems like BigQuery keep shuffle data in memory and use external shuffle services for resilience.

### 4.4. JOIN and GROUP BY

Shuffling enables distributed joins:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SORT-MERGE JOIN                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ACTIVITY EVENTS                        USER PROFILES                    │
│   ┌────────────────────┐                ┌───────────────────┐            │
│   │ user_id: 123       │                │ user_id: 123      │            │
│   │ page: /products    │                │ birth_date: 1990  │            │
│   │ timestamp: 10:30   │                │ name: Alice       │            │
│   ├────────────────────┤                └───────────────────┘            │
│   │ user_id: 123       │                                                  │
│   │ page: /checkout    │                                                  │
│   │ timestamp: 10:35   │                                                  │
│   ├────────────────────┤                                                  │
│   │ user_id: 456       │                                                  │
│   │ page: /home        │                                                  │
│   └────────────────────┘                                                  │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                           SHUFFLE BY user_id                              │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   REDUCER FOR user_id=123:                                               │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ 1. User profile: {birth_date: 1990, name: Alice}   ← arrives first │  │
│   │ 2. Event: {page: /products, timestamp: 10:30}                     │   │
│   │ 3. Event: {page: /checkout, timestamp: 10:35}                     │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   OUTPUT:                                                                 │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │ {page: /products, viewer_birth_year: 1990}                        │   │
│   │ {page: /checkout, viewer_birth_year: 1990}                        │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**How it works:**

1. Two mappers: one for events (emit `user_id → event`), one for users (emit `user_id → profile`)
2. Shuffle brings all records with same `user_id` to same reducer
3. **Secondary sort** ensures user profile arrives first
4. Reducer stores profile in variable, then iterates over events
5. Minimal memory: only one user's data in memory at a time

---

## 5. Query Languages and DataFrames

### 5.1. SQL for Batch Processing

As batch systems matured, SQL became the lingua franca:

```sql
-- Find top pages by age group
SELECT
    page,
    FLOOR((2025 - birth_year) / 10) * 10 AS age_decade,
    COUNT(*) AS views
FROM events e
JOIN users u ON e.user_id = u.user_id
GROUP BY page, age_decade
ORDER BY views DESC
LIMIT 100;
```

**Why SQL won:**

- Analysts and developers already know it
- Integrates with existing BI tools (Tableau, Looker)
- Query optimizers can choose efficient execution plans
- More concise than handwritten MapReduce

**SQL-based batch engines:**
- **Hive**: SQL on Hadoop/Spark
- **Trino (Presto)**: Federated SQL across data sources
- **Spark SQL**: SQL on Spark
- **BigQuery, Snowflake**: Cloud data warehouses

### 5.2. DataFrames

Data scientists preferred the DataFrame model from R and Pandas:

```python
# Pandas-style DataFrame API (runs distributed on Spark)
events_df = spark.read.parquet("s3://data/events/")
users_df = spark.read.parquet("s3://data/users/")

result = (events_df
    .join(users_df, "user_id")
    .withColumn("age", 2025 - users_df.birth_year)
    .groupBy("page")
    .agg(
        count("*").alias("views"),
        avg("age").alias("avg_viewer_age")
    )
    .orderBy(desc("views"))
    .limit(100))

result.write.parquet("s3://output/page-demographics/")
```

| Aspect | SQL | DataFrame API |
|--------|-----|---------------|
| **Style** | Declarative (what) | Step-by-step (how) |
| **Optimization** | Query planner | Query planner (Spark) or immediate (Pandas) |
| **Familiarity** | DBAs, analysts | Data scientists |
| **Flexibility** | Standard operators | Custom functions easier |

> **💡 Insight**
>
> Spark's DataFrame API is deceptively clever: unlike Pandas which executes immediately, Spark builds a **query plan** from your DataFrame operations, then optimizes it before execution. This means `df.filter(x).filter(y)` becomes a single optimized filter, not two passes over the data.

### 5.3. Batch Processing and Data Warehouses Converge

Historically separate, batch processing and data warehouses are merging:

```
┌──────────────────────────────────────────────────────────────────────────┐
│              CONVERGENCE OF BATCH AND WAREHOUSES                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   TRADITIONAL SEPARATION:                                                 │
│                                                                           │
│   Batch Processing              Data Warehouse                            │
│   ─────────────────             ──────────────                            │
│   • MapReduce, Spark            • Teradata, Oracle                        │
│   • Flexible code               • SQL only                                │
│   • Commodity hardware          • Specialized appliances                  │
│   • Horizontal scaling          • Vertical scaling                        │
│                                                                           │
│   ════════════════════════════════════════════════════════════════════   │
│                                                                           │
│   MODERN CONVERGENCE:                                                     │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │  Cloud Data Platforms (BigQuery, Snowflake, Databricks)         │    │
│   ├─────────────────────────────────────────────────────────────────┤    │
│   │  • SQL + DataFrame APIs                                         │    │
│   │  • Columnar storage (Parquet)                                   │    │
│   │  • Distributed shuffle                                          │    │
│   │  • Object storage (S3) as foundation                            │    │
│   │  • Same engines for ETL and analytics                           │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**When to use which:**

| Workload | Better fit |
|----------|------------|
| SQL analytics | Cloud warehouse (BigQuery, Snowflake) |
| Complex ML pipelines | Batch framework (Spark, Ray) |
| Row-by-row processing | Batch framework |
| Cost-sensitive large jobs | Batch framework |
| Iterative graph algorithms | Batch framework |

---

## 6. Batch Use Cases

### 6.1. Extract-Transform-Load (ETL)

**In plain English:** ETL is like a factory assembly line for data. Raw materials (source data) come in, get processed and quality-checked (transformed), and are packaged for shipping (loaded to destination).

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ETL PIPELINE EXAMPLE                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   EXTRACT                    TRANSFORM                    LOAD            │
│   ───────                    ─────────                    ────            │
│                                                                           │
│   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐   │
│   │ Production   │          │ • Clean data │          │ Data         │   │
│   │ Database     │────────▶ │ • Join tables│────────▶ │ Warehouse    │   │
│   │ (PostgreSQL) │          │ • Aggregate  │          │ (Snowflake)  │   │
│   └──────────────┘          │ • Validate   │          └──────────────┘   │
│                             └──────────────┘                              │
│   ┌──────────────┐                                     ┌──────────────┐   │
│   │ Application  │          ┌──────────────┐          │ ML Feature   │   │
│   │ Logs (S3)    │────────▶ │ • Parse JSON │────────▶ │ Store        │   │
│   └──────────────┘          │ • Filter     │          └──────────────┘   │
│                             │ • Enrich     │                              │
│   ┌──────────────┐          └──────────────┘          ┌──────────────┐   │
│   │ Third-party  │                                    │ Search       │   │
│   │ API Exports  │─────────────────────────────────▶ │ Index        │   │
│   └──────────────┘                                    └──────────────┘   │
│                                                                           │
│   Workflow scheduler (Airflow) orchestrates the pipeline                 │
│   Runs daily/hourly, handles retries, alerts on failure                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Why batch for ETL:**

- **Parallelizable**: Filtering, projecting, and joining are embarrassingly parallel
- **Debuggable**: Inspect failed files, fix code, rerun
- **Retryable**: Transient failures handled by scheduler
- **Orchestrated**: Airflow, Dagster provide operators for many systems

### 6.2. Analytics

Batch systems support two analytics patterns:

**1. Pre-aggregation (scheduled)**
```sql
-- Runs daily via Airflow
CREATE TABLE daily_sales_cube AS
SELECT
    date,
    region,
    product_category,
    SUM(revenue) as total_revenue,
    COUNT(*) as transactions
FROM transactions
WHERE date = CURRENT_DATE - 1
GROUP BY date, region, product_category;
```

**2. Ad hoc queries (interactive)**
```sql
-- Analyst runs this to investigate spike
SELECT
    hour,
    COUNT(*) as errors,
    error_type
FROM logs
WHERE date = '2025-06-27' AND status >= 500
GROUP BY hour, error_type
ORDER BY errors DESC;
```

### 6.3. Machine Learning

Batch processing is central to ML workflows:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ML BATCH PROCESSING WORKFLOW                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   1. FEATURE ENGINEERING                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │ Raw Data → Clean → Transform → Feature Vectors                  │    │
│   │ (text, images) → (validated) → (normalized) → (numeric arrays) │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│   2. MODEL TRAINING                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │ Training Data → Batch Job → Model Weights                       │    │
│   │ (features + labels) → (gradient descent) → (checkpoint files)  │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│   3. BATCH INFERENCE                                                      │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │ New Data + Model → Batch Job → Predictions                      │    │
│   │ (millions of rows) → (apply model) → (recommendation scores)   │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│   Frameworks: Spark MLlib, Ray, Kubeflow, Flyte                          │
│   OpenAI uses Ray for ChatGPT training                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**LLM data preparation** is a prime batch workload:
- Extract plain text from HTML
- Detect and remove duplicates
- Filter low-quality content
- Tokenize text into embeddings

### 6.4. Bulk Data Imports

Batch outputs often need to reach production databases. **Don't write directly** from batch jobs:

| Problem | Why |
|---------|-----|
| **Slow** | Network request per record |
| **Overwhelming** | Thousands of tasks writing simultaneously |
| **Inconsistent** | Partial results visible if job fails |

**Better patterns:**

**1. Stream through Kafka**
```
┌─────────┐      ┌───────┐      ┌──────────────┐
│ Batch   │─────▶│ Kafka │─────▶│ Elasticsearch│
│ Output  │      │ Topic │      │ (throttled)  │
└─────────┘      └───────┘      └──────────────┘
```
- Buffer between batch and production
- Consumers control their read rate
- Multiple downstream systems can consume

**2. Bulk file import**
```
┌─────────┐      ┌───────────┐      ┌─────────────┐
│ Batch   │─────▶│ SST Files │─────▶│ RocksDB     │
│ Job     │      │ on S3     │      │ (bulk load) │
└─────────┘      └───────────┘      └─────────────┘
```
- Build database files in batch job
- Bulk load atomically
- Venice, Pinot, Druid support this pattern

---

## 7. Summary

In this chapter, we explored batch processing from Unix pipes to petabyte-scale distributed systems:

**Core concepts:**
- Batch processing transforms **immutable inputs** into **derived outputs**
- Same patterns from Unix (`sort | uniq -c`) scale to distributed systems
- Key operation is **shuffle**: redistribute data so same keys meet at same node

**System components:**
- **Distributed filesystems** (HDFS) and **object stores** (S3) provide storage
- **Orchestrators** (YARN, K8s) schedule tasks across machines
- **Workflow schedulers** (Airflow) manage job dependencies

**Processing models:**
- **MapReduce**: map → shuffle → reduce (largely obsolete)
- **Dataflow engines** (Spark, Flink): flexible operators, in-memory intermediate data
- **SQL** and **DataFrame APIs**: high-level, optimizable interfaces

**Use cases:**
- **ETL**: move and transform data between systems
- **Analytics**: pre-aggregation and ad hoc queries
- **Machine learning**: feature engineering, training, batch inference
- **Bulk imports**: populate production systems from batch outputs

> **💡 Insight**
>
> The key insight of batch processing is treating computation as **pure functions**: given the same input, produce the same output, with no side effects. This makes jobs reproducible, retriable, and parallelizable. When something goes wrong, you can always rerun—and that property is worth its weight in gold for building reliable systems.

In Chapter 12, we'll turn to **stream processing**, where inputs are unbounded and jobs never complete. We'll see how stream processing builds on batch concepts while introducing new challenges around time, ordering, and state.

---

**Previous:** [Chapter 10](../part2/chapter10-consistency-consensus.md) | **Next:** [Chapter 12](chapter12-stream-processing.md)
