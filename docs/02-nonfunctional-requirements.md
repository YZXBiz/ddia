# 2. Defining Nonfunctional Requirements

_The Internet was done so well that most people think of it as a natural resource like the Pacific Ocean, rather than something that was man-made. When was the last time a technology with a scale like that was so error-free?_

— Alan Kay, in interview with Dr Dobb's Journal (2012)

---

**Previous:** [Chapter 1: Trade-offs in Data Systems Architecture](01-trade-offs-architecture.md) | **Next:** [Chapter 3: Data Models and Query Languages](03-data-models-query-languages.md)

---

## Table of Contents

- [2. Defining Nonfunctional Requirements](#2-defining-nonfunctional-requirements)
  - [Table of Contents](#table-of-contents)
  - [1. Understanding Nonfunctional Requirements](#1-understanding-nonfunctional-requirements)
  - [2. Case Study: Social Network Home Timelines](#2-case-study-social-network-home-timelines)
    - [2.1. Basic Timeline Query Approach](#21-basic-timeline-query-approach)
      - [Database Schema](#database-schema)
      - [Timeline Query](#timeline-query)
      - [Scalability Analysis](#scalability-analysis)
    - [2.2. Materialized Timeline Approach](#22-materialized-timeline-approach)
      - [Fan-out on Write](#fan-out-on-write)
      - [Performance Comparison](#performance-comparison)
      - [Implementation Strategy](#implementation-strategy)
    - [2.3. Handling Edge Cases](#23-handling-edge-cases)
      - [Celebrity Problem](#celebrity-problem)
      - [Hybrid Solution](#hybrid-solution)
  - [3. Describing Performance](#3-describing-performance)
    - [3.1. Response Time vs Throughput](#31-response-time-vs-throughput)
      - [Throughput vs Response Time Curve](#throughput-vs-response-time-curve)
    - [3.2. Latency and Response Time](#32-latency-and-response-time)
      - [Response Time Components](#response-time-components)
      - [Queueing Theory Impact](#queueing-theory-impact)
    - [3.3. Percentiles and Tail Latency](#33-percentiles-and-tail-latency)
      - [Percentile Explanation](#percentile-explanation)
      - [Tail Latency Amplification](#tail-latency-amplification)
    - [3.4. Measuring Performance](#34-measuring-performance)
      - [Learn by Doing: Performance Monitoring](#learn-by-doing-performance-monitoring)
      - [SLA/SLO Integration](#slaslo-integration)
  - [4. Reliability and Fault Tolerance](#4-reliability-and-fault-tolerance)
    - [4.1. Faults vs Failures](#41-faults-vs-failures)
      - [Single Points of Failure (SPOF)](#single-points-of-failure-spof)
    - [4.2. Hardware Faults](#42-hardware-faults)
      - [Hardware Failure Rates](#hardware-failure-rates)
      - [Fault Tolerance Strategies](#fault-tolerance-strategies)
    - [4.3. Software Faults](#43-software-faults)
      - [Software Fault Patterns](#software-fault-patterns)
      - [Defensive Programming](#defensive-programming)
    - [4.4. Human Reliability](#44-human-reliability)
      - [Human Error Sources](#human-error-sources)
      - [Human-Centered Design](#human-centered-design)
      - [Blameless Postmortems](#blameless-postmortems)
  - [5. Scalability](#5-scalability)
    - [5.1. Describing Load](#51-describing-load)
      - [Load Parameters](#load-parameters)
      - [Load Patterns](#load-patterns)
    - [5.2. Scaling Approaches](#52-scaling-approaches)
      - [Vertical vs Horizontal Scaling](#vertical-vs-horizontal-scaling)
      - [Shared-Nothing Architecture](#shared-nothing-architecture)
    - [5.3. Principles for Scalability](#53-principles-for-scalability)
      - [Scalability Design Principles](#scalability-design-principles)
      - [Avoiding Over-Engineering](#avoiding-over-engineering)
  - [6. Maintainability](#6-maintainability)
    - [6.1. Operability](#61-operability)
      - [Operational Requirements](#operational-requirements)
      - [Observability vs Monitoring](#observability-vs-monitoring)
    - [6.2. Simplicity](#62-simplicity)
      - [Managing Complexity](#managing-complexity)
      - [Abstraction Design](#abstraction-design)
    - [6.3. Evolvability](#63-evolvability)
      - [Change-Friendly Design](#change-friendly-design)
      - [Reversibility](#reversibility)
  - [7. Summary](#7-summary)
    - [7.1. Performance Insights](#71-performance-insights)
    - [7.2. Reliability Principles](#72-reliability-principles)
    - [7.3. Scalability Patterns](#73-scalability-patterns)
    - [7.4. Maintainability Goals](#74-maintainability-goals)

---

## 1. Understanding Nonfunctional Requirements

**In plain English:** While functional requirements describe what your app does (login, checkout, search), nonfunctional requirements describe how well it does it (fast, reliable, secure, maintainable).

**In technical terms:** Nonfunctional requirements specify quality attributes and constraints that determine system behavior under various conditions, including performance, reliability, scalability, and maintainability characteristics.

**Why it matters:** A functionally perfect app that's slow, unreliable, or impossible to maintain might as well not exist. Nonfunctional requirements often determine a system's success more than features.

When building an application, you start with **functional requirements**—what the app must do: screens, buttons, operations. But equally important are **nonfunctional requirements**: the app should be fast, reliable, secure, and maintainable.

```
Requirements Hierarchy
────────────────────────────────────

Functional Requirements (WHAT)
      ↓
┌─────────────────────────────┐
│ User Registration           │
│ Product Search              │
│ Shopping Cart               │
│ Payment Processing          │
│ Order Tracking              │
└─────────────────────────────┘
      ↓
Nonfunctional Requirements (HOW WELL)
      ↓
┌─────────────────────────────┐
│ Performance: < 200ms        │
│ Reliability: 99.9% uptime   │
│ Security: Encrypted data    │
│ Scalability: 10x growth     │
│ Maintainability: Easy to    │
│ modify and debug            │
└─────────────────────────────┘
```

This chapter focuses on four critical nonfunctional requirements:

1. **Performance** - How fast the system responds
2. **Reliability** - How well it works when things go wrong
3. **Scalability** - How it handles growing load
4. **Maintainability** - How easy it is to operate and evolve

> **💡 Insight**
>
> Nonfunctional requirements are often implicit and assumed to be "obvious," but they're frequently the root cause of system failures. Making them explicit and measurable is crucial for architectural decisions.

---

## 2. Case Study: Social Network Home Timelines

**In plain English:** To understand performance and scalability challenges, let's explore how you might build a Twitter-like timeline feature. This seemingly simple feature reveals complex trade-offs at scale.

**In technical terms:** We'll examine two approaches to implementing social media timelines: pull-based (query on read) vs push-based (precompute on write), demonstrating how different strategies handle scale challenges.

**Why it matters:** Timeline systems showcase fundamental patterns that apply across many data systems: caching vs computation trade-offs, fan-out patterns, and handling extreme cases.

Let's implement a social network where users can post messages and follow others. We'll use these simplified assumptions:

**Scale Assumptions:**
- 500 million posts per day (5,700 posts/second average)
- Peak spikes: 150,000 posts/second
- Average user: follows 200 people, has 200 followers
- Edge case: celebrities with 100+ million followers

### 2.1. Basic Timeline Query Approach

**In plain English:** The simplest approach is like asking "show me recent posts from everyone I follow" every time someone opens the app. This works for small systems but becomes expensive at scale.

**In technical terms:** A pull-based approach uses joins at read time to aggregate posts from followed users, resulting in expensive queries that don't scale linearly with user growth.

**Why it matters:** Understanding why the obvious solution doesn't scale teaches you to recognize similar patterns in other systems where naive approaches hit scalability walls.

#### Database Schema

```sql
-- Simple relational schema
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(50)
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  sender_id BIGINT REFERENCES users(id),
  content TEXT,
  timestamp TIMESTAMP
);

CREATE TABLE follows (
  follower_id BIGINT REFERENCES users(id),
  followee_id BIGINT REFERENCES users(id),
  PRIMARY KEY (follower_id, followee_id)
);
```

#### Timeline Query

```sql
-- Get home timeline for current user
SELECT posts.*, users.*
FROM posts
  JOIN follows ON posts.sender_id = follows.followee_id
  JOIN users ON posts.sender_id = users.id
WHERE follows.follower_id = current_user
ORDER BY posts.timestamp DESC
LIMIT 1000;
```

#### Scalability Analysis

```
Timeline Query Scaling Problem
─────────────────────────────────────────

Load Assumptions:
• 10 million concurrent users
• Poll every 5 seconds
• Each user follows 200 people

Query Load Calculation:
• 10M users ÷ 5 seconds = 2M queries/second
• 2M queries × 200 follows = 400M post lookups/second

Problem: Query cost grows linearly with:
• Number of concurrent users
• Number of people each user follows
• Polling frequency
```

> **💡 Insight**
>
> The timeline query joins three tables and processes hundreds of posts per user. At 2 million queries per second, this becomes prohibitively expensive, demonstrating why simple solutions don't always scale.

### 2.2. Materialized Timeline Approach

**In plain English:** Instead of calculating timelines when users ask for them, pre-calculate and store each user's timeline. When someone posts, deliver that post to all their followers' pre-built timelines.

**In technical terms:** A push-based approach using materialized views and fan-out on write, trading write complexity for read performance by precomputing query results.

**Why it matters:** This pattern—trading write cost for read performance—appears throughout data systems: indexes, caches, data warehouses, and stream processing all use similar principles.

#### Fan-out on Write

```
Timeline Materialization Process
───────────────────────────────────────────

Step 1: User Posts
   Alice posts: "Hello World!"
       ↓
Step 2: Look up Followers
   Alice has 200 followers
       ↓
Step 3: Fan-out to Timelines
   Insert post into 200
   follower timelines
       ↓
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │    Bob's    │  │  Carol's    │  │    Dave's   │
   │  Timeline   │  │  Timeline   │  │  Timeline   │
   │ Cache       │  │ Cache       │  │ Cache       │
   │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │
   │ │Alice:   │ │  │ │Alice:   │ │  │ │Alice:   │ │
   │ │"Hello…" │ │  │ │"Hello…" │ │  │ │"Hello…" │ │
   │ │[older]  │ │  │ │[older]  │ │  │ │[older]  │ │
   │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │
   └─────────────┘  └─────────────┘  └─────────────┘
```

#### Performance Comparison

```
Query-Time vs Precomputed Approach
─────────────────────────────────────────

Query-Time (Pull):                Precomputed (Push):
• 2M timeline queries/sec         • 5.7K posts/sec
• 400M post lookups/sec           • 1.1M timeline writes/sec
• Complex 3-table joins           • Simple cache reads
• High CPU usage                  • High write volume
• Poor cache locality             • Excellent read performance

Trade-off:
400M reads/sec → 1.1M writes/sec
(~360x reduction in read operations)
```

#### Implementation Strategy

```
Materialized Timeline Architecture
─────────────────────────────────────────

Write Path (New Post):
User Post → Fan-out Service → Timeline Caches
    ↓           ↓                 ↓
  Store in   Look up        Update follower
  Posts DB   Followers      timelines

Read Path (View Timeline):
User Request → Timeline Cache → Response
      ↓           ↓              ↓
   Simple      Pre-built      Fast
   Lookup      Timeline       Response

Benefits:
✓ Fast reads (cache hits)
✓ Simple read queries
✓ Predictable read performance

Costs:
✗ Complex write path
✗ Higher write volume
✗ Eventual consistency
```

### 2.3. Handling Edge Cases

**In plain English:** The fan-out approach works great for normal users, but breaks down with celebrities who have millions of followers. We need hybrid approaches for extreme cases.

**In technical terms:** Systems must handle both the average case (normal users) and edge cases (high-follower accounts) with different strategies, often requiring multiple architectures within the same system.

**Why it matters:** Real systems are defined by how they handle edge cases. The 80/20 rule applies: 20% of users (celebrities) might generate 80% of the system load.

#### Celebrity Problem

```
Celebrity Fan-out Challenge
─────────────────────────────────────────

Normal User (200 followers):
   Post → 200 timeline writes → ✓ Manageable

Celebrity (100M followers):
   Post → 100M timeline writes → ✗ System overload
         ↓
   Timeline services overwhelmed
   Other users' posts delayed
   Potential system failure
```

#### Hybrid Solution

```
Hybrid Timeline Architecture
─────────────────────────────────────────

For Normal Users:
   Posts → Fan-out to follower timelines
           (Precomputed approach)

For Celebrities:
   Posts → Stored separately
           Merged at read time
           (Query-time approach)

Timeline Read:
   ┌─────────────────┐
   │ User Timeline   │
   │ ┌─────────────┐ │
   │ │Precomputed  │ │ ← Normal users' posts
   │ │Posts        │ │
   │ └─────────────┘ │
   │       +         │
   │ ┌─────────────┐ │
   │ │Celebrity    │ │ ← Queried in real-time
   │ │Posts        │ │
   │ └─────────────┘ │
   └─────────────────┘
```

> **💡 Insight**
>
> The most elegant solution for the average case often fails for edge cases. Robust systems frequently use hybrid approaches, applying different strategies based on user characteristics or data patterns.

---

## 3. Describing Performance

**In plain English:** Performance has two main aspects: how fast individual requests complete (response time) and how many requests the system can handle (throughput). Both matter, but in different ways.

**In technical terms:** Performance measurement involves response time distribution analysis (using percentiles rather than averages) and throughput capacity planning, with careful attention to tail latencies and queueing effects.

**Why it matters:** Poor performance measurement leads to wrong optimization decisions. Understanding percentiles, tail latencies, and the relationship between throughput and response time is crucial for system design.

### 3.1. Response Time vs Throughput

```
Performance Metrics Comparison
─────────────────────────────────────────

Response Time                    Throughput
     ↓                              ↓
┌─────────────────┐          ┌─────────────────┐
│ What users see  │          │ System capacity │
│ "How long did   │          │ "How many       │
│ my request      │          │ requests per    │
│ take?"          │          │ second?"        │
│                 │          │                 │
│ Units:          │          │ Units:          │
│ milliseconds    │          │ requests/sec    │
│ seconds         │          │ MB/sec          │
└─────────────────┘          └─────────────────┘
     ↓                              ↓
User Experience                Cost Planning
```

**Key Relationships:**
- **Response time** affects user satisfaction
- **Throughput** determines hardware requirements and costs
- **Inverse relationship**: Higher load → Higher response time

#### Throughput vs Response Time Curve

```
Performance Relationship
─────────────────────────────────────────

Response Time ↑
              │     Danger Zone
              │        │
              │        │  ⟋
              │        ⟋
              │      ⟋
              │    ⟋
              │  ⟋
              │⟋ Sweet Spot
              └────────────────→ Throughput
              0%              100% Capacity

Key Points:
• Low load: Fast response times
• Medium load: Slight increase due to queueing
• High load: Dramatic increase (overload)
• Beyond capacity: System thrashing
```

### 3.2. Latency and Response Time

**In plain English:** Response time is what the user experiences end-to-end, while latency is the time spent waiting (network delays, queueing). Understanding the breakdown helps identify optimization opportunities.

**In technical terms:** Response time encompasses service time (actual processing) plus all latency components (network, queueing, serialization), with queueing delays often dominating variability.

**Why it matters:** You can't optimize what you can't measure. Breaking down response time into components reveals where to focus optimization efforts.

#### Response Time Components

```
Request Lifecycle Breakdown
─────────────────────────────────────────

Client                Server               Database
  │                     │                    │
  │────── Request ─────→│                    │
  │    Network          │                    │
  │    Latency          │────── Query ──────→│
  │                     │    Service Time    │
  │                     │←───── Result ──────│
  │←───── Response ─────│                    │
  │    Network          │                    │
  │    Latency          │                    │
  │                     │                    │
  └─── Total Response Time ──────────────────┘

Components:
• Network Latency: Time in transit
• Queueing Delay: Waiting for resources
• Service Time: Actual processing
• Serialization: Data marshalling
```

#### Queueing Theory Impact

```
Queueing Effects on Response Time
─────────────────────────────────────────

Light Load:              Heavy Load:
┌──────────────┐         ┌──────────────┐
│ CPU: 20%     │         │ CPU: 95%     │
│ Queue: Empty │         │ Queue: Full  │
│              │         │              │
│ Request A ───→ Process │ Request A ──┐│
│ Request B ───→ Process │ Request B ──││ Wait
│ Request C ───→ Process │ Request C ──││ Wait
│              │         │ Request D ──┘│ Wait
│ Response:Fast│         │ Response:Slow│
└──────────────┘         └──────────────┘

Result: Head-of-line blocking
One slow request delays all subsequent requests
```

> **💡 Insight**
>
> Queueing delays often account for most response time variability. A few slow requests can create cascading delays, which is why monitoring tail latencies (95th, 99th percentiles) is more important than monitoring averages.

### 3.3. Percentiles and Tail Latency

**In plain English:** Instead of asking "what's the average response time," ask "what's the worst response time that 95% of users experience?" Percentiles reveal the user experience distribution.

**In technical terms:** Percentile-based SLOs provide meaningful guarantees about user experience, with high percentiles (p95, p99, p999) capturing tail latencies that affect the most valuable users disproportionately.

**Why it matters:** Averages hide outliers, but outliers often represent your most valuable users (those with the most data). Amazon optimizes for p99.9 because slow requests often come from customers with the most purchase history.

#### Percentile Explanation

```
Response Time Distribution Example
─────────────────────────────────────────

100 Requests, Sorted by Response Time:
┌────────────────────────────────────────────┐
│  ■■■■■■■■■■                                │ 10 Fast (50-100ms)
│  ████████████████████                      │ 20 Good (100-200ms)
│  ████████████████████████████████████████  │ 40 OK (200-400ms)
│  ████████████████████                      │ 20 Slow (400-800ms)
│  ████████                                  │ 8 Very Slow (800-1500ms)
│  ██                                        │ 2 Extremely Slow (1500ms+)
└────────────────────────────────────────────┘
  0    25   50   75   90   95   99  99.9  100

Percentiles:
• P50 (Median): 50% faster than 300ms
• P95: 95% faster than 800ms
• P99: 99% faster than 1200ms
• P99.9: 99.9% faster than 1500ms

Why P99 Matters:
High-value customers often have more data,
leading to slower queries but higher revenue impact.
```

#### Tail Latency Amplification

```
Microservices Tail Latency Problem
─────────────────────────────────────────

Single Service (P99 = 100ms):
User Request → Service A → Response
99% of requests complete in <100ms

Multiple Services (P99 = 100ms each):
User Request → Service A ──┐
            → Service B ──┤→ Response
            → Service C ──┘

Combined P99 ≈ 270ms!
Even with parallel calls, slowest determines total time.

Rule: More dependencies = Higher tail latency
If N services each have P99 = X:
Combined tail latency > X
```

### 3.4. Measuring Performance

**In plain English:** To track performance accurately, you need efficient ways to calculate percentiles continuously without storing every response time. Special algorithms help approximate percentiles with minimal memory.

**In technical terms:** Streaming percentile estimation using algorithms like HdrHistogram, t-digest, or DDSketch enables real-time monitoring with bounded memory usage and merge-able results.

**Why it matters:** Naive percentile calculation (storing and sorting all values) doesn't scale to production systems. Understanding approximation trade-offs helps you choose appropriate monitoring strategies.

#### Learn by Doing: Performance Monitoring

I've set up a basic performance monitoring framework that tracks response times and calculates percentiles. The monitoring system needs to implement efficient percentile calculation for high-throughput services.

● **Learn by Doing**

**Context:** We have a web service that handles thousands of requests per second, and we need to monitor response time percentiles (P50, P95, P99) in real-time without storing every individual response time measurement.

**Your Task:** In the `performance_monitor.py` file, implement the `update_percentiles()` method. Look for TODO(human). This method should efficiently update running percentiles as new response time measurements arrive.

**Guidance:** Consider using a histogram-based approach where you bucket response times into ranges and maintain counts. You could implement a simple approximation algorithm, or explore how libraries like HdrHistogram work. The key is balancing accuracy with memory efficiency for a high-throughput system.

```python
# TODO(human): Implement efficient percentile calculation
def update_percentiles(self, response_time_ms):
    """
    Update running percentiles with new response time measurement.
    Should support P50, P95, P99 calculation with minimal memory usage.
    """
    pass
```

#### SLA/SLO Integration

```
Service Level Objectives (SLOs)
─────────────────────────────────────────

Example SLO for Web Service:
┌─────────────────────────────────────────┐
│ Performance Targets:                    │
│ • P50 response time < 200ms             │
│ • P95 response time < 500ms             │
│ • P99 response time < 1000ms            │
│ • Availability > 99.9%                  │
│ • Error rate < 0.1%                     │
└─────────────────────────────────────────┘

SLA (Service Level Agreement):
If SLO not met → Customer compensation
• 99.9% becomes 99.8% → 10% monthly credit
• 99.8% becomes 99.0% → 25% monthly credit

Monitoring Alerts:
• P95 > 400ms for 5 minutes → Warning
• P95 > 600ms for 2 minutes → Critical
• Error rate > 0.2% → Immediate alert
```

---

## 4. Reliability and Fault Tolerance

**In plain English:** Reliable systems keep working correctly even when individual components fail. It's not about preventing failures—it's about designing systems that can handle failures gracefully.

**In technical terms:** Reliability engineering focuses on fault tolerance through redundancy, isolation, and graceful degradation, distinguishing between component faults and system failures while planning for various failure modes.

**Why it matters:** In distributed systems, failures are not edge cases—they're normal operating conditions. Systems that don't plan for failures will experience catastrophic outages rather than graceful degradation.

### 4.1. Faults vs Failures

**In plain English:** A fault is when one part breaks (like a hard drive dying), while a failure is when the whole system stops working for users. Good design turns faults into non-events.

**In technical terms:** Fault tolerance designs systems where component faults don't escalate to service failures, using redundancy, error recovery, and isolation to maintain service availability.

**Why it matters:** Understanding this distinction helps you design systems that can lose individual components without losing overall functionality—the foundation of high availability.

```
Fault vs Failure Hierarchy
─────────────────────────────────────────

System Level:
┌─────────────────────────────────────────┐
│               Web Service               │
│  ┌───────────┐  ┌───────────┐         │
│  │ Server A  │  │ Server B  │         │
│  │ ┌───────┐ │  │ ┌───────┐ │         │
│  │ │Disk 1 │ │  │ │Disk 1 │ │         │
│  │ │Disk 2 │ │  │ │Disk 2 │ │ ← Fault │
│  │ │ ❌   │ │  │ │ ✓     │ │         │
│  │ └───────┘ │  │ └───────┘ │         │
│  └───────────┘  └───────────┘         │
│  ✓ Still works  ✓ Still works         │
└─────────────────────────────────────────┘
✓ System operational = No failure

Fault Tolerance Design:
• Disk fault → RAID redundancy → Server continues
• Server fault → Load balancer → Service continues
• Datacenter fault → Multi-region → Global service continues
```

#### Single Points of Failure (SPOF)

```
SPOF Analysis Example
─────────────────────────────────────────

Bad Architecture (Multiple SPOFs):
Internet → Single Load Balancer → Single Database
           ❌ SPOF                 ❌ SPOF

If either fails → Complete service outage

Good Architecture (Eliminated SPOFs):
Internet → Load Balancer Pair → Database Cluster
           ✓ Redundant           ✓ Redundant

Any single component can fail without service impact
```

### 4.2. Hardware Faults

**In plain English:** Hardware breaks regularly at scale. If you have 10,000 hard drives, expect one to fail every day. The solution isn't better hardware—it's designing for failure.

**In technical terms:** Hardware fault tolerance uses redundancy (RAID, replication), geographic distribution (availability zones), and automated recovery to mask individual component failures from higher-level systems.

**Why it matters:** Hardware reliability hasn't improved as fast as system scale has grown. What worked for small systems (replace broken parts) doesn't work when failures happen daily.

#### Hardware Failure Rates

```
Real-World Hardware Reliability
─────────────────────────────────────────

Hard Drives:
• 2-5% fail per year
• 10,000 drive cluster → ~1 failure/day
• SSDs: 0.5-1% fail per year + bit errors

Memory:
• 1% of machines encounter uncorrectable errors/year
• Even with ECC: cosmic rays, manufacturing defects
• Certain access patterns can flip bits reliably

CPUs:
• 1 in 1,000 occasionally computes wrong results
• Manufacturing defects in cores
• May crash or return incorrect values

Servers:
• Power supplies, RAID controllers, network cards
• Entire racks can fail (power, network, cooling)
• Entire datacenters can fail (disasters, outages)
```

#### Fault Tolerance Strategies

```
Hardware Fault Tolerance Patterns
─────────────────────────────────────────

Component Level:
• RAID → Disk failure tolerance
• Dual power supplies → Power failure tolerance
• ECC memory → Memory error correction
• Hot-swappable components → Maintenance without downtime

Machine Level:
• Replication → Multiple copies on different machines
• Checksums → Detect data corruption
• Automated failover → Quick recovery from failures

Datacenter Level:
• Geographic distribution → Regional disaster tolerance
• Availability zones → Correlated failure isolation
• Network redundancy → Multiple ISPs, paths
```

> **💡 Insight**
>
> Hardware redundancy is most effective when failures are independent. However, reality shows significant correlation—whole racks fail together, firmware bugs affect identical hardware, and maintenance windows create cascading failures.

### 4.3. Software Faults

**In plain English:** Software bugs are often worse than hardware failures because the same bug affects many machines simultaneously. A single software error can bring down an entire service.

**In technical terms:** Software faults exhibit high correlation across nodes running identical code, making them more dangerous than independent hardware failures. Defense requires diverse approaches: testing, isolation, monitoring, and chaos engineering.

**Why it matters:** While hardware faults are largely random, software faults are systematic and can cause correlated failures across multiple systems simultaneously, leading to large-scale outages.

#### Software Fault Patterns

```
Common Software Fault Categories
─────────────────────────────────────────

Systematic Bugs:
┌─────────────────────────────────────────┐
│ • Leap second bugs (Java applications)  │
│ • Resource exhaustion (memory, threads) │
│ • Edge case handling (division by zero) │
│ • State corruption (race conditions)    │
│ • Configuration errors                  │
└─────────────────────────────────────────┘
        ↓
Correlated Impact:
All nodes running same code → Simultaneous failure

Environmental Dependencies:
┌─────────────────────────────────────────┐
│ • External service degradation          │
│ • Network partitions                    │
│ • Clock skew                           │
│ • DNS failures                         │
└─────────────────────────────────────────┘
        ↓
Cascading Failures:
One slow service → Client timeout → Retry storm
```

#### Defensive Programming

```
Software Fault Tolerance Techniques
─────────────────────────────────────────

Process Isolation:
• Separate processes for different functions
• Bulkhead pattern: isolate failure domains
• Circuit breakers: prevent cascading failures

Monitoring & Alerting:
• Resource usage tracking
• Error rate monitoring
• Dependency health checks
• Automated recovery triggers

Testing Strategies:
• Unit tests for logic correctness
• Integration tests for component interaction
• Chaos engineering for failure scenarios
• Load testing for resource exhaustion

Example Circuit Breaker:
if error_rate > 50% for 30 seconds:
    stop_calling_service()
    return_cached_response()
    retry_after_cooldown()
```

### 4.4. Human Reliability

**In plain English:** Humans make mistakes, but blaming people doesn't fix systems. Instead of focusing on "human error," design systems that make the right thing easy and the wrong thing hard.

**In technical terms:** Human reliability engineering focuses on system design that reduces error probability and impact through automation, clear interfaces, blameless postmortems, and organizational learning.

**Why it matters:** Studies show human-initiated changes cause more outages than hardware failures. The solution isn't more rules—it's better systems that support human operators.

#### Human Error Sources

```
Human Reliability Challenges
─────────────────────────────────────────

Common Human Errors:
┌─────────────────────────────────────────┐
│ • Configuration mistakes                │
│ • Deployment errors                     │
│ • Misunderstanding system behavior      │
│ • Copy-paste errors in commands         │
│ • Working in wrong environment          │
│ • Forgetting to check dependencies      │
└─────────────────────────────────────────┘

Contributing Factors:
• Time pressure
• Complex procedures
• Unclear documentation
• Poor tool interfaces
• Lack of feedback
• Organizational culture
```

#### Human-Centered Design

```
Designing for Human Reliability
─────────────────────────────────────────

Prevention:
┌─────────────────────────────────────────┐
│ • Clear, tested procedures              │
│ • Automation for routine tasks          │
│ • Staging environments that mirror prod │
│ • Code review for configuration changes │
│ • Gradual rollouts with automatic       │
│   rollback                             │
└─────────────────────────────────────────┘

Detection:
┌─────────────────────────────────────────┐
│ • Monitoring and alerting               │
│ • Automated testing in production       │
│ • Canary deployments                    │
│ • User-facing health checks             │
└─────────────────────────────────────────┘

Recovery:
┌─────────────────────────────────────────┐
│ • Quick rollback mechanisms             │
│ • Incident response procedures          │
│ • Blameless postmortems                 │
│ • Organizational learning               │
└─────────────────────────────────────────┘
```

#### Blameless Postmortems

**In plain English:** When things go wrong, focus on learning how to prevent similar problems rather than punishing the person who made the mistake. The goal is systemic improvement, not individual blame.

**In technical terms:** Blameless postmortem culture encourages sharing complete incident details without fear of punishment, enabling organizational learning and systemic improvements to prevent recurrence.

**Why it matters:** Blame culture leads to information hiding and repeat incidents. Blameless culture reveals systemic issues and leads to better system design.

```
Blameless Postmortem Process
─────────────────────────────────────────

Incident Response:
1. Restore service (immediate)
2. Gather timeline data (factual)
3. Identify contributing factors (systemic)
4. Plan improvements (preventive)

Questions to Ask:
✓ What sequence of events led to the incident?
✓ What systems/processes could have prevented it?
✓ How can we detect similar issues faster?
✓ What monitoring/alerting gaps exist?

Questions to Avoid:
❌ Who made the mistake?
❌ Why didn't they follow procedure?
❌ How do we prevent them from doing it again?

Outcome: System improvements, not individual blame
```

---

## 5. Scalability

**In plain English:** Scalability isn't about being able to handle infinite load—it's about having clear options for handling growth and knowing when you'll hit limits.

**In technical terms:** Scalability describes a system's ability to maintain performance as load increases, typically through horizontal scaling (more machines) or vertical scaling (more powerful machines).

**Why it matters:** Scalability problems often appear suddenly and can't be solved quickly. Planning scalability approaches before you need them prevents crisis-driven architecture decisions.

### 5.1. Describing Load

**In plain English:** Before you can plan for growth, you need to measure your current load in ways that reveal bottlenecks and guide scaling decisions.

**In technical terms:** Load characterization requires identifying key metrics (throughput, concurrency, data volume) and understanding load patterns (peak vs average, read vs write ratios, data distribution).

**Why it matters:** Different types of load require different scaling approaches. A read-heavy system scales differently than a write-heavy system, which scales differently than a compute-intensive system.

#### Load Parameters

```
Load Characterization Dimensions
─────────────────────────────────────────

Throughput Metrics:
• Requests per second
• Data processed per hour
• Transactions per minute
• Messages per second

Concurrency Metrics:
• Simultaneous active users
• Peak concurrent connections
• Active worker threads
• Open database connections

Data Characteristics:
• Total data size
• Growth rate (GB/day)
• Read/write ratio
• Cache hit rates
• Query selectivity
```

#### Load Patterns

```
Understanding Load Distribution
─────────────────────────────────────────

Traffic Patterns:
Daily Cycle:    ╭──╮     ╭──╮
               ╱    ╲   ╱    ╲
              ╱      ╲ ╱      ╲
             ╱        ╲╱        ╲
            ╱                    ╲
           0   6   12  18  24   6  (hours)

Seasonal:      ╱╲
              ╱  ╲
             ╱    ╲   ╱╲
            ╱      ╲ ╱  ╲
           ╱        ╲╱    ╲
          Jan  Apr  Jul Oct Jan

Viral Events:     ╱╲
                 ╱  ╲
                ╱    ╲
               ╱      ╲
          ────╱        ╲────
                Normal
                  ↑
            Sudden spike
```

### 5.2. Scaling Approaches

**In plain English:** You can scale "up" (bigger machines) or "out" (more machines). Each approach has trade-offs in cost, complexity, and limits.

**In technical terms:** Vertical scaling increases resources on existing machines while horizontal scaling distributes load across multiple machines, with different architectural implications and cost curves.

**Why it matters:** Choosing the wrong scaling approach can lead to exponentially increasing costs or hitting hard architectural limits that require system rewrites.

#### Vertical vs Horizontal Scaling

```
Scaling Approach Comparison
─────────────────────────────────────────

Vertical Scaling (Scale Up):
┌─────────────────────────────────────────┐
│              Single Machine             │
│  ┌─────────────────────────────────────┐ │
│  │ 2 CPU → 4 CPU → 8 CPU → 16 CPU     │ │
│  │ 8 GB → 16 GB → 32 GB → 64 GB       │ │
│  │ 1 TB → 2 TB → 4 TB → 8 TB          │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

✓ Simple architecture
✓ No network overhead
✓ ACID transactions
❌ Expensive (non-linear cost)
❌ Hard limits
❌ Single point of failure

Horizontal Scaling (Scale Out):
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Machine 1  │ │  Machine 2  │ │  Machine 3  │
│  4 CPU      │ │  4 CPU      │ │  4 CPU      │
│  16 GB      │ │  16 GB      │ │  16 GB      │
│  2 TB       │ │  2 TB       │ │  2 TB       │
└─────────────┘ └─────────────┘ └─────────────┘
       ↑              ↑              ↑
    Network      Network       Network

✓ Linear scaling potential
✓ Fault tolerance
✓ Cost-effective hardware
❌ Complex coordination
❌ Network overhead
❌ Consistency challenges
```

#### Shared-Nothing Architecture

```
Shared-Nothing Scaling Model
─────────────────────────────────────────

Traditional Shared Resources:
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Node 1    │ │   Node 2    │ │   Node 3    │
│   CPU/RAM   │ │   CPU/RAM   │ │   CPU/RAM   │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
              ┌─────────┴─────────┐
              │   Shared Storage  │ ← Bottleneck
              └───────────────────┘

Shared-Nothing Model:
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Node 1    │ │   Node 2    │ │   Node 3    │
│ CPU/RAM     │ │ CPU/RAM     │ │ CPU/RAM     │
│ Local Disk  │ │ Local Disk  │ │ Local Disk  │
│ Data Slice A│ │ Data Slice B│ │ Data Slice C│
└─────────────┘ └─────────────┘ └─────────────┘
       ↕              ↕              ↕
    Network      Network       Network
  Coordination  Coordination Coordination

Benefits:
• Linear scaling potential
• No shared bottlenecks
• Independent failures
• Cost-effective growth
```

### 5.3. Principles for Scalability

**In plain English:** Good scalability comes from breaking big problems into smaller, independent pieces that can be solved separately. The challenge is knowing where to draw the boundaries.

**In technical terms:** Scalable architectures emphasize loose coupling, statelessness, and functional decomposition while carefully managing the complexity of distributed coordination.

**Why it matters:** These principles guide architectural decisions at all levels, from database sharding strategies to microservices boundaries to caching layers.

#### Scalability Design Principles

```
Core Scalability Patterns
─────────────────────────────────────────

1. Stateless Services:
   ┌─────────────────────────────────────────┐
   │ Request → [Process] → Response          │
   │ No stored state between requests        │
   │ Can route to any instance               │
   └─────────────────────────────────────────┘

2. Functional Decomposition:
   ┌─────────────────────────────────────────┐
   │ Monolith → User Service                 │
   │         → Order Service                 │
   │         → Payment Service               │
   │         → Inventory Service             │
   └─────────────────────────────────────────┘

3. Data Partitioning:
   ┌─────────────────────────────────────────┐
   │ Large Database → Shard by User ID       │
   │                → Shard by Geography     │
   │                → Shard by Time          │
   └─────────────────────────────────────────┘

4. Caching Layers:
   ┌─────────────────────────────────────────┐
   │ Browser Cache → CDN → App Cache         │
   │              → Database Cache           │
   └─────────────────────────────────────────┘
```

#### Avoiding Over-Engineering

> **💡 Insight**
>
> Premature scaling optimization often creates more problems than it solves. It's better to design for one order of magnitude growth than to try to anticipate infinite scale. Most successful systems have been rewritten multiple times as they grew.

```
Pragmatic Scaling Approach
─────────────────────────────────────────

Start Simple:
• Single database
• Monolithic application
• Basic monitoring
• Standard deployment

Scale When Needed:
• Measure actual bottlenecks
• Scale the constraining resource
• Add complexity incrementally
• Monitor impact of changes

Avoid Early:
• Complex sharding schemes
• Excessive microservices
• Premature optimization
• Over-engineered solutions

Rule: Design for 10x growth, not 1000x
```

---

## 6. Maintainability

**In plain English:** The real cost of software isn't building it—it's maintaining it over many years. Maintainable systems are designed to be operated, understood, and evolved by different people over time.

**In technical terms:** Maintainability encompasses operability (ease of keeping systems running), simplicity (ease of understanding), and evolvability (ease of making changes), requiring conscious design decisions that support long-term sustainability.

**Why it matters:** Every system that survives becomes legacy. Design decisions made today will constrain future developers for years. Maintainability is an investment in your future self and your team.

### 6.1. Operability

**In plain English:** Operational systems should make routine tasks easy so operations teams can focus on high-value work rather than fighting fires constantly.

**In technical terms:** Good operability provides monitoring, observability, predictable behavior, documentation, and automation that enables efficient day-to-day operations and rapid incident response.

**Why it matters:** Operations complexity grows superlinearly with system complexity. Systems that are hard to operate create operational overhead that limits an organization's ability to build new features.

#### Operational Requirements

```
Operability Design Checklist
─────────────────────────────────────────

Monitoring & Observability:
┌─────────────────────────────────────────┐
│ ✓ Key metrics exposed                   │
│ ✓ Structured logging                    │
│ ✓ Distributed tracing                   │
│ ✓ Health check endpoints                │
│ ✓ Performance dashboards                │
└─────────────────────────────────────────┘

Predictable Behavior:
┌─────────────────────────────────────────┐
│ ✓ Consistent resource usage             │
│ ✓ Graceful degradation                  │
│ ✓ Clear error messages                  │
│ ✓ Documented failure modes              │
│ ✓ Stable APIs                           │
└─────────────────────────────────────────┘

Automation Support:
┌─────────────────────────────────────────┐
│ ✓ Deployment automation                 │
│ ✓ Configuration management              │
│ ✓ Automated recovery                    │
│ ✓ Capacity planning tools               │
│ ✓ Backup/restore procedures             │
└─────────────────────────────────────────┘
```

#### Observability vs Monitoring

```
Monitoring vs Observability
─────────────────────────────────────────

Traditional Monitoring:        Observability:
"Known unknowns"               "Unknown unknowns"
     ↓                              ↓
┌─────────────────┐          ┌─────────────────┐
│ Predefined      │          │ Rich telemetry  │
│ Metrics         │          │ data that       │
│ • CPU usage     │          │ supports        │
│ • Memory usage  │          │ arbitrary       │
│ • Error rates   │          │ investigation   │
│ • Response time │          │                 │
│                 │          │ • Traces        │
│ Dashboard shows │          │ • Structured    │
│ expected        │          │   logs          │
│ problems        │          │ • High-cardin.  │
│                 │          │   metrics       │
└─────────────────┘          │ • Custom        │
                             │   queries       │
                             └─────────────────┘
```

### 6.2. Simplicity

**In plain English:** Simple systems are easier to understand, debug, and modify. Complexity is the enemy of maintainability, so we should fight unnecessary complexity while accepting essential complexity.

**In technical terms:** Simplicity requires careful abstraction design that hides implementation complexity behind clean interfaces while avoiding accidental complexity that doesn't serve the problem domain.

**Why it matters:** Complexity compounds over time. Systems that start complex become unmaintainable. Every abstraction and pattern should earn its place by genuinely reducing overall system complexity.

#### Managing Complexity

```
Types of Complexity
─────────────────────────────────────────

Essential Complexity:
┌─────────────────────────────────────────┐
│ Inherent to the problem domain:         │
│ • Business rules and logic              │
│ • Data relationships                    │
│ • User workflow requirements            │
│ • Regulatory compliance                 │
└─────────────────────────────────────────┘
    ↓
Cannot be eliminated, only managed

Accidental Complexity:
┌─────────────────────────────────────────┐
│ Introduced by tools/implementation:     │
│ • Overly complex architectures          │
│ • Poor abstractions                     │
│ • Premature optimization                │
│ • Technology mismatches                 │
└─────────────────────────────────────────┘
    ↓
Can and should be eliminated
```

#### Abstraction Design

```
Good vs Bad Abstractions
─────────────────────────────────────────

Bad Abstraction:
┌─────────────────────────────────────────┐
│ interface DatabaseThing {               │
│   doStuff(params: any[]): any           │
│   configure(config: object): void       │
│   execute(sql: string, ...): any        │
│ }                                       │
└─────────────────────────────────────────┘
Problems: Vague, leaky, low-level

Good Abstraction:
┌─────────────────────────────────────────┐
│ interface UserRepository {              │
│   findById(id: string): User            │
│   save(user: User): void                │
│   findByEmail(email: string): User      │
│ }                                       │
└─────────────────────────────────────────┘
Benefits: Clear purpose, domain-focused, testable
```

### 6.3. Evolvability

**In plain English:** Systems need to change constantly—new features, bug fixes, changing requirements, new platforms. Evolvable systems make change easy rather than risky and expensive.

**In technical terms:** Evolvability is enabled by loose coupling, good abstractions, comprehensive testing, and architectural patterns that support modification without cascading changes.

**Why it matters:** The only constant in software is change. Systems that resist change become legacy systems that organizations can't modify, limiting business agility and innovation.

#### Change-Friendly Design

```
Designing for Evolution
─────────────────────────────────────────

Loose Coupling:
┌─────────────────────────────────────────┐
│ Service A ←→ API ←→ Service B            │
│                                         │
│ Changes to Service A internal logic     │
│ don't require Service B changes         │
└─────────────────────────────────────────┘

Versioned APIs:
┌─────────────────────────────────────────┐
│ /api/v1/users (maintained for legacy)   │
│ /api/v2/users (new features)           │
│                                         │
│ Gradual migration possible              │
└─────────────────────────────────────────┘

Configuration-Driven:
┌─────────────────────────────────────────┐
│ Feature flags, configuration files,     │
│ environment variables enable behavior   │
│ changes without code deployment         │
└─────────────────────────────────────────┘

Test Coverage:
┌─────────────────────────────────────────┐
│ Comprehensive tests provide safety net  │
│ for changes, enabling confident         │
│ refactoring and feature additions       │
└─────────────────────────────────────────┘
```

#### Reversibility

**In plain English:** The scariest changes are irreversible ones. Design systems where you can undo changes, roll back deployments, and experiment safely.

**In technical terms:** Reversible architectures support blue-green deployments, feature flags, database migrations with rollback, and stateless designs that enable safe experimentation.

**Why it matters:** When changes can be undone quickly, teams are willing to make changes more frequently, leading to faster iteration and learning cycles.

```
Reversibility Patterns
─────────────────────────────────────────

Database Changes:
• Forward migration: Add column
• Backward migration: Remove column
• Compatible changes: Default values, nullable

Deployments:
• Blue-green: Keep old version running
• Canary: Gradual rollout with monitoring
• Feature flags: Toggle new functionality

Data Formats:
• Backward compatible: Old clients work
• Forward compatible: New fields ignored
• Schema evolution: Versioned formats
```

---

## 7. Summary

This chapter explored four critical nonfunctional requirements that shape system architecture. Key takeaways:

### 7.1. Performance Insights

**Response Time Distribution:**
- Use percentiles (P95, P99) rather than averages
- Tail latencies affect your most valuable users
- Queueing effects dominate response time variability

**Performance Trade-offs:**
- Response time vs throughput have inverse relationships
- Read optimization (caching) vs write complexity trade-offs
- Fan-out patterns: push vs pull strategies

### 7.2. Reliability Principles

**Fault Tolerance Design:**
- Distinguish between faults (component failures) and failures (system outages)
- Hardware faults are largely independent; software faults are correlated
- Human reliability requires system design, not just better processes

**Failure Modes:**
- Plan for normal operation under fault conditions
- Eliminate single points of failure through redundancy
- Use blameless postmortems for organizational learning

### 7.3. Scalability Patterns

**Scaling Strategies:**
- Vertical scaling: simple but expensive with hard limits
- Horizontal scaling: complex but linear cost and growth potential
- Shared-nothing architectures avoid bottlenecks

**Design Principles:**
- Break large problems into independent smaller problems
- Avoid premature optimization—design for 10x growth, not 1000x
- Stateless services enable easier scaling

### 7.4. Maintainability Goals

**Three Pillars:**
- **Operability**: Make routine tasks easy, provide good observability
- **Simplicity**: Manage essential complexity, eliminate accidental complexity
- **Evolvability**: Enable change through loose coupling and reversibility

> **💡 Insight**
>
> Nonfunctional requirements often conflict with each other—reliability vs performance, simplicity vs scalability, consistency vs availability. Good architecture is about making conscious trade-offs rather than trying to optimize everything simultaneously.

The concepts and terminology from this chapter will be essential as we dive into specific implementation techniques in the following chapters. Understanding these fundamentals helps you make informed decisions about which tools and patterns to apply in different situations.

---

**Previous:** [Chapter 1: Trade-offs in Data Systems Architecture](01-trade-offs-architecture.md) | **Next:** [Chapter 3: Data Models and Query Languages](03-data-models-query-languages.md)

---

_Systems that work well under normal conditions but fail under stress haven't truly been tested_