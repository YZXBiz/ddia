# 7. Sharding

> "Clearly, we must break away from the sequential and not limit the computers. We must state definitions and provide for priorities and descriptions of data. We must state relationships, not procedures."
>
> — Grace Murray Hopper, Management and the Computer of the Future (1962)

## Table of Contents

1. [Introduction to Sharding](#71-introduction-to-sharding)
2. [Pros and Cons of Sharding](#72-pros-and-cons-of-sharding)
3. [Sharding for Multitenancy](#73-sharding-for-multitenancy)
4. [Sharding of Key-Value Data](#74-sharding-of-key-value-data)
5. [Sharding by Key Range](#75-sharding-by-key-range)
6. [Sharding by Hash of Key](#76-sharding-by-hash-of-key)
7. [Skewed Workloads and Hot Spots](#77-skewed-workloads-and-hot-spots)
8. [Request Routing](#78-request-routing)
9. [Sharding and Secondary Indexes](#79-sharding-and-secondary-indexes)
10. [Summary](#710-summary)

---

**Navigation**: [← Chapter 6: Replication](06-replication.md) | [Chapter 8: Transactions →](08-transactions.md)

---

## 7.1 Introduction to Sharding

`★ Insight ─────────────────────────────────────`
Think of sharding like organizing a massive library: instead of putting all books on a single giant shelf (which would be impossible to manage), we create multiple smaller, specialized sections. Each section holds different books but follows a consistent organizational system.
`─────────────────────────────────────────────────`

A distributed database typically distributes data across nodes in two ways:

1. **Replication**: Having a copy of the same data on multiple nodes (Chapter 6)
2. **Sharding**: Splitting data into smaller parts and storing different parts on different nodes

**Sharding** (also called **partitioning**) divides a large dataset into smaller **shards**, where each piece of data belongs to exactly one shard. Each shard acts like a small database, though some systems support cross-shard operations.

```
┌─────────────────────────────────────────────────┐
│              Before Sharding                    │
├─────────────────────────────────────────────────┤
│  Single Node: All Data (Users 1-10000)         │
│  ┌─────────────────────────────────────────┐     │
│  │ Users 1-10000                           │     │
│  │ High Load, Single Point of Failure     │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│               After Sharding                    │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Shard 1   │  │   Shard 2   │  │   Shard 3   │ │
│  │Users 1-3333 │  │Users 3334-  │  │Users 6667-  │ │
│  │             │  │    6666     │  │   10000     │ │
│  │   Node A    │  │   Node B    │  │   Node C    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│      Load/3           Load/3           Load/3      │
└─────────────────────────────────────────────────────┘
```

### 7.1.1 Terminology Across Systems

Different systems use different names for the same concept:

| System | Term | Description |
|--------|------|-------------|
| Kafka | Partition | Data division unit |
| CockroachDB | Range | Key range segment |
| HBase, TiDB | Region | Geographic/logical division |
| Bigtable, YugabyteDB | Tablet | Data storage unit |
| Cassandra, ScyllaDB, Riak | VNode | Virtual node |
| Couchbase | VBucket | Virtual bucket |

### 7.1.2 Combining Sharding and Replication

Sharding typically combines with replication for fault tolerance:

```
┌─────────────────────────────────────────────────┐
│          Sharding + Replication                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Shard A     │    Shard B     │    Shard C      │
│  ┌─────────┐ │   ┌─────────┐  │   ┌─────────┐   │
│  │Leader A │ │   │Follower │  │   │Follower │   │
│  │Node 1   │ │   │Shard A  │  │   │Shard A  │   │
│  └─────────┘ │   │Node 2   │  │   │Node 3   │   │
│              │   └─────────┘  │   └─────────┘   │
│  ┌─────────┐ │   ┌─────────┐  │   ┌─────────┐   │
│  │Follower │ │   │Leader B │  │   │Follower │   │
│  │Shard B  │ │   │Node 2   │  │   │Shard B  │   │
│  │Node 1   │ │   └─────────┘  │   │Node 3   │   │
│  └─────────┘ │               │   └─────────┘   │
│              │               │               │
│  ┌─────────┐ │   ┌─────────┐  │   ┌─────────┐   │
│  │Follower │ │   │Follower │  │   │Leader C │   │
│  │Shard C  │ │   │Shard C  │  │   │Node 3   │   │
│  │Node 1   │ │   │Node 2   │  │   └─────────┘   │
│  └─────────┘ │   └─────────┘  │               │
└─────────────────────────────────────────────────┘
```

---

## 7.2 Pros and Cons of Sharding

### 7.2.1 Benefits of Sharding

**Horizontal Scaling**: The primary reason for sharding is achieving **scale-out architecture**:

- **Data Volume**: Distribute large datasets across multiple machines
- **Write Throughput**: Parallel processing of writes across shards
- **Query Performance**: Each shard handles a subset of queries
- **Cost Efficiency**: Use multiple smaller machines instead of one expensive large machine

```python
# Example: E-commerce order sharding
# Without sharding: Single database handles all orders
orders_single_db = {
    "capacity": "10M orders max",
    "write_throughput": "1000 writes/sec max",
    "hardware_cost": "$50,000 for powerful server"
}

# With sharding: Distribute across 10 shards
orders_sharded = {
    "capacity": "100M orders (10M per shard)",
    "write_throughput": "10,000 writes/sec (1000 per shard)",
    "hardware_cost": "$5,000 × 10 = $50,000 for commodity servers",
    "fault_tolerance": "Single shard failure doesn't affect others"
}
```

### 7.2.2 Complexity and Challenges

**Partition Key Selection**: Must choose how to divide data:

```python
# Good partition key: Even distribution
user_partition = hash(user_id) % num_shards

# Bad partition key: Creates hot spots
time_partition = timestamp_to_shard(created_at)  # All recent data in one shard
```

**Cross-Shard Operations**: Queries spanning multiple shards become expensive:

```sql
-- Easy: Single shard query
SELECT * FROM orders WHERE user_id = 12345;

-- Hard: Cross-shard aggregation
SELECT COUNT(*) FROM orders WHERE status = 'pending';  -- Must query all shards
```

### 7.2.3 Single-Machine Sharding

Some systems use sharding even on single machines:

- **CPU Parallelism**: One process per CPU core (Redis, VoltDB, FoundationDB)
- **NUMA Architecture**: Optimize memory access patterns
- **Isolation**: Prevent one process from blocking others

---

## 7.3 Sharding for Multitenancy

`★ Insight ─────────────────────────────────────`
Multitenancy sharding is like having separate office buildings for different companies - each tenant gets their own space, resources, and security, even though they're all managed by the same property management company (your SaaS platform).
`─────────────────────────────────────────────────`

In Software as a Service (SaaS) applications, each **tenant** (customer) should have isolated data. Sharding provides natural tenant isolation.

### 7.3.1 Advantages of Tenant-Based Sharding

**Resource Isolation**, **Permission Isolation**, **Cell-Based Architecture**, **GDPR Compliance**, and more.

---

## 7.4 Sharding of Key-Value Data

The goal of effective sharding is **even distribution** of both data and query load across nodes.

---

## 7.5 Sharding by Key Range

Like volumes in a print encyclopedia, assign contiguous key ranges to each shard.

### 7.5.1 Implementation Examples

```python
def get_shard_for_key_range(key, shard_ranges):
    """
    shard_ranges = [
        ("", "customer_5000", "shard_1"),
        ("customer_5001", "customer_10000", "shard_2"),
        ("customer_10001", "customer_15000", "shard_3")
    ]
    """
    for start, end, shard in shard_ranges:
        if start <= key <= end:
            return shard
    raise ValueError(f"No shard found for key {key}")
```

---

## 7.6 Sharding by Hash of Key

When you don't need range queries, hash the partition key for uniform distribution.

### 7.6.1 Hash Function Properties

```python
import hashlib

def hash_partition_key(key, num_shards):
    """Good hash function distributes keys uniformly"""
    hash_value = hashlib.md5(key.encode()).hexdigest()
    return int(hash_value, 16) % num_shards
```

### 7.6.2 Fixed Number of Shards

Create many more shards than nodes, assign multiple shards per node.

---

## 7.7 Skewed Workloads and Hot Spots

Even with good hash functions, workload patterns can create hot spots.

### 7.7.1 Celebrity Problem

```python
class SocialMediaPlatform:
    def handle_celebrity_post_sharded(self, celebrity_id, post_content):
        """
        Solution: Split hot key across multiple shards
        """
        import random

        # Add random suffix to distribute writes
        random_suffix = random.randint(0, 99)  # 100-way split
        post_key = f"post_{celebrity_id}_{timestamp}_{random_suffix}"

        shard = self.get_shard(post_key)
        return shard.create_post(post_content)
```

---

## 7.8 Request Routing

How does a client find the right node for a given key?

### 7.8.1 Three Routing Approaches

1. **Node-to-Node**: Any node forwards to correct node
2. **Routing Tier**: Dedicated shard-aware load balancer
3. **Smart Client**: Client knows shard mapping

---

## 7.9 Sharding and Secondary Indexes

Secondary indexes complicate sharding because they don't map neatly to partition keys.

### 7.9.1 Local Secondary Indexes

Each shard maintains indexes only for its local data.

### 7.9.2 Global Secondary Indexes

Index is sharded separately from primary data, covering all shards.

---

## 7.10 Summary

`★ Insight ─────────────────────────────────────`
Sharding represents the fundamental trade-off in distributed systems: we gain horizontal scalability and fault isolation, but lose the simplicity of single-machine transactions and queries. The key insight is choosing the right sharding strategy for your access patterns - range sharding for sequential access, hash sharding for uniform distribution, and careful secondary index design for complex queries.
`─────────────────────────────────────────────────`

This chapter explored how to split large datasets across multiple machines through sharding:

### Key Concepts Covered

**Sharding Approaches**:
- **Key range sharding**: Sort keys, assign ranges to shards (good for range queries)
- **Hash sharding**: Hash keys for uniform distribution (prevents hot spots)
- **Consistent hashing**: Minimize data movement when adding/removing nodes

**Trade-offs**:
- **Benefits**: Horizontal scaling, load distribution, fault isolation
- **Costs**: Query complexity, distributed transactions, operational overhead

**Request Routing**:
- Node-to-node forwarding (simple but extra hops)
- Dedicated routing tier (clean separation but bottleneck risk)
- Smart clients (best performance but complex client logic)

**Secondary Indexes**:
- **Local indexes**: Simple writes, expensive reads (scatter-gather)
- **Global indexes**: Efficient reads, complex writes (consistency challenges)

### Practical Guidelines

1. **Avoid premature sharding**: Single machines are very powerful today
2. **Choose partition keys carefully**: Consider both current and future access patterns
3. **Plan for hot spots**: Have strategies for celebrity/viral content scenarios
4. **Design for rebalancing**: Systems must adapt as data grows
5. **Consider consistency needs**: Global indexes vs local indexes trade-offs

The next challenge after sharding is ensuring consistency across distributed operations, which brings us to transactions in Chapter 8.

---

**Navigation**: [← Chapter 6: Replication](06-replication.md) | [Chapter 8: Transactions →](08-transactions.md)