# 8. Transactions

> "Some authors have claimed that general two-phase commit is too expensive to support, because of the performance or availability problems that it brings. We believe it is better to have application programmers deal with performance problems due to overuse of transactions as bottlenecks arise, rather than always coding around the lack of transactions."
>
> — James Corbett et al., Spanner: Google's Globally-Distributed Database (2012)

## Table of Contents

1. [Introduction to Transactions](#81-introduction-to-transactions)
2. [What Exactly Is a Transaction?](#82-what-exactly-is-a-transaction)
3. [The Meaning of ACID](#83-the-meaning-of-acid)
4. [Single-Object and Multi-Object Operations](#84-single-object-and-multi-object-operations)
5. [Weak Isolation Levels](#85-weak-isolation-levels)
6. [Preventing Lost Updates](#86-preventing-lost-updates)
7. [Write Skew and Phantoms](#87-write-skew-and-phantoms)
8. [Serializability](#88-serializability)
9. [Distributed Transactions](#89-distributed-transactions)
10. [Summary](#810-summary)

---

**Navigation**: [← Chapter 7: Sharding](07-sharding.md) | [Chapter 9: The Trouble with Distributed Systems →](09-distributed-systems.md)

---

## 8.1 Introduction to Transactions

`★ Insight ─────────────────────────────────────`
Think of a transaction like a contract: either all parties fulfill their obligations completely, or the entire agreement is void. In databases, this means either all operations in a transaction succeed together, or they all fail together - preventing the messy situations where your system is left half-updated.
`─────────────────────────────────────────────────`

In the harsh reality of data systems, many things can go wrong:

- Database software or hardware may fail mid-write
- Applications may crash during operations
- Network interruptions cut connections
- Multiple clients overwrite each other's changes
- Partial reads return inconsistent data
- Race conditions cause surprising bugs

**Transactions** provide a powerful abstraction to handle these challenges by grouping reads and writes into logical units that succeed or fail atomically.

---

## 8.2 What Exactly Is a Transaction?

Almost all relational databases support transactions based on IBM System R's 1975 design. The core concept has remained stable for 50 years.

---

## 8.3 The Meaning of ACID

### 8.3.1 Atomicity

**Atomicity = All-or-Nothing**: Either the entire transaction succeeds, or it fails completely with no partial effects.

### 8.3.2 Consistency

The most overloaded term in databases! In ACID context, it means application-defined invariants must be preserved.

### 8.3.3 Isolation

Prevents concurrent transactions from interfering with each other.

### 8.3.4 Durability

Once committed, data survives crashes and power failures.

---

## 8.4 Single-Object and Multi-Object Operations

Both single-object and multi-object operations need careful handling in concurrent environments.

---

## 8.5 Weak Isolation Levels

### 8.5.1 Read Committed

The most basic isolation level:
1. **No dirty reads**: Only see committed data
2. **No dirty writes**: Only overwrite committed data

### 8.5.2 Snapshot Isolation (Repeatable Read)

Provides consistent snapshots using Multi-Version Concurrency Control (MVCC).

---

## 8.6 Preventing Lost Updates

When two transactions read-modify-write the same object, one update can be lost.

### 8.6.1 The Lost Update Problem

```python
# Classic lost update scenario
def increment_counter_unsafe():
    """Two concurrent calls can lose updates"""
    current_value = db.query("SELECT value FROM counters WHERE key = 'page_views'")
    new_value = current_value + 1
    db.execute("UPDATE counters SET value = ? WHERE key = 'page_views'", new_value)

    # If two threads run this concurrently:
    # Thread 1 reads 42, Thread 2 reads 42
    # Thread 1 writes 43, Thread 2 writes 43
    # Result: 43 (should be 44) - one increment lost!
```

### 8.6.2 Solutions

**Atomic Operations**:
```sql
-- Database-level atomic increment (preferred)
UPDATE counters SET value = value + 1 WHERE key = 'page_views';
```

**Explicit Locking**:
```python
def increment_with_lock():
    with db.transaction():
        # Lock the row for update
        current = db.query(
            "SELECT value FROM counters WHERE key = 'page_views' FOR UPDATE")

        new_value = current + 1
        db.execute("UPDATE counters SET value = ? WHERE key = 'page_views'",
                  new_value)
```

**Compare-and-Set**:
```python
def increment_with_cas():
    """Compare-and-set for conflict detection"""
    while True:
        current = db.query("SELECT value FROM counters WHERE key = 'page_views'")

        rows_affected = db.execute(
            "UPDATE counters SET value = ? WHERE key = 'page_views' AND value = ?",
            (current + 1, current))

        if rows_affected > 0:
            break  # Success
        # Retry if value changed
```

---

## 8.7 Write Skew and Phantoms

More subtle race conditions that occur when transactions read some data, make decisions, then write based on potentially outdated premises.

### 8.7.1 Write Skew Example: Hospital On-Call System

```python
class HospitalSystem:
    def doctor_shift_example(self):
        """Write skew: Both doctors go off-call simultaneously"""

        def doctor_aaliyah_goes_off_call():
            with db.transaction():
                # Check: Are there at least 2 doctors on call?
                on_call_count = db.query(
                    "SELECT COUNT(*) FROM doctors WHERE on_call = true AND shift_id = 1234")

                if on_call_count >= 2:  # Safe to go off call
                    db.execute(
                        "UPDATE doctors SET on_call = false WHERE name = 'Aaliyah'")

        def doctor_bryce_goes_off_call():
            with db.transaction():
                # Same check - also sees 2 doctors on call
                on_call_count = db.query(
                    "SELECT COUNT(*) FROM doctors WHERE on_call = true AND shift_id = 1234")

                if on_call_count >= 2:  # Also thinks it's safe
                    db.execute(
                        "UPDATE doctors SET on_call = false WHERE name = 'Bryce'")

        # If both run concurrently:
        # - Both see count = 2 (initially true)
        # - Both decide it's safe to go off call
        # - Both update their own records
        # - Result: 0 doctors on call! (Violated business rule)
```

**Characterizing Write Skew**:
1. Read some objects
2. Make decision based on read
3. Write to database (different objects than read)
4. Decision premise becomes false due to other transaction's writes

### 8.7.2 Phantom Reads

**Phantom**: A write changes the result of a previous search query.

```python
def phantom_example():
    """Phantoms occur when searching for absence of rows"""

    # Transaction 1: Check for booking conflicts
    with db.transaction():
        conflicts = db.query(
            "SELECT * FROM bookings WHERE room_id = 123 AND time_overlap(...)")

        if len(conflicts) == 0:
            # No conflicts found

            # Transaction 2 inserts conflicting booking here (phantom!)

            db.execute("INSERT INTO bookings (...)")  # Creates conflict

    # Transaction 1's premise (no conflicts) was invalidated
    # by Transaction 2's insert (the phantom)
```

### 8.7.3 Solutions for Write Skew

**Serializable Isolation**: Only complete solution

**Explicit Locking**: Lock rows that decision depends on
```sql
-- Doctor example with locking
BEGIN TRANSACTION;

SELECT * FROM doctors
WHERE on_call = true AND shift_id = 1234
FOR UPDATE;  -- Locks all on-call doctors

UPDATE doctors SET on_call = false WHERE name = 'Aaliyah';

COMMIT;
```

---

## 8.8 Serializability

The strongest isolation level - guarantees transactions behave as if executed serially.

### 8.8.1 Three Approaches to Serializability

```
┌─────────────────────────────────────────────────┐
│            Serializability Approaches          │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Serial Execution                            │
│     ┌─────────────────┐                         │
│     │ Single Thread   │ → Simple but limited    │
│     │ All Txns        │    throughput            │
│     └─────────────────┘                         │
│                                                 │
│  2. Two-Phase Locking (2PL)                    │
│     ┌─────────────────┐                         │
│     │ Shared/         │ → Traditional but       │
│     │ Exclusive Locks │    poor performance     │
│     └─────────────────┘                         │
│                                                 │
│  3. Serializable Snapshot Isolation (SSI)      │
│     ┌─────────────────┐                         │
│     │ Optimistic      │ → Modern, good          │
│     │ Conflict Detect │    performance          │
│     └─────────────────┘                         │
└─────────────────────────────────────────────────┘
```

### 8.8.2 Serial Execution

Execute transactions one at a time on a single thread.

```python
class SerialExecutionSystem:
    def __init__(self):
        self.transaction_queue = Queue()

    def execute_serially(self):
        """Single-threaded transaction processing"""
        while True:
            transaction = self.transaction_queue.get()

            # Execute entire transaction atomically
            try:
                result = self.execute_stored_procedure(transaction)
                self.commit(transaction, result)
            except Exception:
                self.abort(transaction)

    def constraints_for_serial_execution(self):
        """Requirements for serial execution to work"""
        return {
            "fast_transactions": "Each transaction must be very fast",
            "in_memory_data": "Active dataset should fit in memory",
            "low_write_throughput": "Limited by single CPU core",
            "stored_procedures": "No interactive transactions"
        }
```

### 8.8.3 Two-Phase Locking (2PL)

For 30 years, the standard approach to serializability. Uses shared and exclusive locks with strict two-phase protocol.

```python
class TwoPhaseLockingSystem:
    def __init__(self):
        self.locks = {}  # object_id -> {'mode': 'shared'/'exclusive', 'holders': set()}

    def two_phase_protocol(self):
        """Key insight: Transaction has two phases"""
        phases = {
            "growing_phase": "Acquire locks as needed, never release",
            "shrinking_phase": "Release all locks at commit/abort"
        }
        # Once you start releasing locks, you cannot acquire new ones
        # This prevents cascading aborts and ensures serializability

    def deadlock_detection_example(self):
        """2PL is prone to deadlocks"""
        # Transaction A holds lock on X, wants lock on Y
        # Transaction B holds lock on Y, wants lock on X
        # → Deadlock! Database must abort one transaction
        pass

# Performance characteristics
def twopl_performance_issues():
    """Why 2PL has poor performance"""
    problems = [
        "Lock contention reduces parallelism",
        "Long-running reads block all writers",
        "Frequent deadlocks require retries",
        "Unpredictable latency spikes"
    ]
    return problems
```

### 8.8.4 Serializable Snapshot Isolation (SSI)

Modern optimistic approach that detects conflicts after they occur.

```python
class SerializableSnapshotIsolation:
    def __init__(self):
        self.transaction_snapshots = {}
        self.read_tracking = {}  # Track what each transaction read
        self.write_tracking = {}  # Track writes that might affect reads

    def ssi_algorithm_overview(self):
        """SSI detects two types of conflicts"""
        return {
            "stale_mvcc_reads": "Transaction read data that another committed transaction modified",
            "writes_affecting_prior_reads": "Transaction writes to data that another transaction read"
        }

    def detect_stale_read(self, reader_txn, writer_txn):
        """Case 1: Reading stale MVCC version"""
        # Reader transaction ignored writer's changes due to MVCC rules
        # When reader wants to commit, check if writer has committed
        # If yes, reader must abort (read stale data)

        reader_start = self.transaction_snapshots[reader_txn]['start_time']
        writer_commit = self.transaction_snapshots[writer_txn]['commit_time']

        if writer_commit and writer_commit < reader_start:
            # Reader should have seen writer's changes but didn't
            self.abort_transaction(reader_txn, "Stale read detected")

    def detect_write_affecting_read(self, writer_txn, affected_data):
        """Case 2: Write invalidates another transaction's reads"""
        # When transaction writes, check if other transactions read that data
        # Mark those readers as potentially conflicting

        for reader_txn in self.read_tracking:
            if affected_data in self.read_tracking[reader_txn]:
                # Reader's decision might be based on outdated premise
                self.mark_conflict(reader_txn, writer_txn)

    def commit_with_conflict_check(self, txn_id):
        """Only allow commit if no conflicts detected"""
        conflicts = self.check_all_conflicts(txn_id)

        if conflicts:
            self.abort_transaction(txn_id, f"Conflicts: {conflicts}")
        else:
            self.commit_transaction(txn_id)
```

**SSI Advantages**:
- Readers never block writers, writers never block readers
- Better performance than 2PL
- Scales across multiple machines
- Automatic conflict detection

---

## 8.9 Distributed Transactions

When transactions span multiple nodes, achieving atomicity becomes much more complex.

### 8.9.1 The Distributed Atomicity Problem

```python
class DistributedTransactionExample:
    def problematic_distributed_commit(self):
        """What goes wrong without coordination"""

        # Transaction updates data on 3 nodes
        try:
            node1.execute("UPDATE inventory SET stock = stock - 1 WHERE id = 123")
            node2.execute("INSERT INTO orders VALUES (...)")
            node3.execute("UPDATE user_stats SET order_count = order_count + 1 WHERE id = 456)")

            # Simple approach: commit on all nodes
            node1.commit()  # ✓ Success
            node2.commit()  # ✗ Fails - constraint violation
            node3.commit()  # ✓ Success

            # Result: Inconsistent state!
            # - Inventory decremented (node1)
            # - No order created (node2)
            # - User stats updated (node3)
            # Customer charged but no order exists!

        except Exception as e:
            # How do we rollback changes that already committed?
            # node1 and node3 changes are permanent
            pass
```

### 8.9.2 Two-Phase Commit (2PC)

Classic algorithm for atomic distributed commit.

```python
class TwoPhaseCommitProtocol:
    def __init__(self):
        self.coordinator = TransactionCoordinator()
        self.participants = [Node1(), Node2(), Node3()]

    def execute_2pc(self, transaction):
        """Two-phase commit protocol"""

        # Phase 1: Prepare (Voting Phase)
        prepare_responses = []

        for participant in self.participants:
            # Coordinator asks: "Can you commit this transaction?"
            response = participant.prepare(transaction)
            prepare_responses.append(response)

            if response == "NO":
                # Any participant can veto the transaction
                self.abort_all_participants()
                return "ABORTED"

        # Phase 2: Commit (Decision Phase)
        if all(r == "YES" for r in prepare_responses):
            # All participants voted YES - coordinator decides to commit
            self.coordinator.log_decision("COMMIT", transaction.id)

            for participant in self.participants:
                participant.commit(transaction)  # Must succeed!

            return "COMMITTED"
        else:
            self.abort_all_participants()
            return "ABORTED"

    def participant_prepare_logic(self, transaction):
        """What happens when participant receives prepare request"""
        try:
            # 1. Execute transaction fully (but don't commit)
            self.execute_transaction_operations(transaction)

            # 2. Write all changes to disk (crash recovery)
            self.flush_to_disk()

            # 3. Check constraints, conflicts, etc.
            if self.can_definitely_commit():
                # Promise: "I will commit if you tell me to"
                self.log_vote("YES", transaction.id)
                return "YES"
            else:
                self.log_vote("NO", transaction.id)
                return "NO"

        except Exception:
            return "NO"
```

**2PC Protocol Visualization**:

```
┌─────────────────────────────────────────────────┐
│              Two-Phase Commit                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Coordinator          Participants               │
│     │                    │    │    │            │
│     │                    │    │    │            │
│ ┌───▼────┐           ┌───▼┐ ┌─▼─┐ ┌▼─┐         │
│ │ Begin  │           │ N1 │ │N2 │ │N3│         │
│ │ 2PC    │           └────┘ └───┘ └──┘         │
│ └───┬────┘               │    │    │            │
│     │                    │    │    │            │
│  PHASE 1: PREPARE         │    │    │            │
│     │ ─── prepare ────────┼────┼────┤            │
│     │                    │    │    │            │
│     │ ──────── YES ──────┤    │    │            │
│     │ ──────── YES ───────────┤    │            │
│     │ ──────── YES ────────────────┤            │
│     │                    │    │    │            │
│ ┌───▼────┐               │    │    │            │
│ │ Log:   │               │    │    │            │
│ │COMMIT  │               │    │    │            │
│ └───┬────┘               │    │    │            │
│     │                    │    │    │            │
│  PHASE 2: COMMIT          │    │    │            │
│     │ ─── commit ─────────┼────┼────┤            │
│     │                    │    │    │            │
│     │ ──────── ACK ──────┤    │    │            │
│     │ ──────── ACK ───────────┤    │            │
│     │ ──────── ACK ────────────────┤            │
│     │                    │    │    │            │
│ ┌───▼────┐               │    │    │            │
│ │ Success│               │    │    │            │
│ └────────┘               │    │    │            │
└─────────────────────────────────────────────────┘
```

### 8.9.3 Problems with 2PC

```python
class TwoPCProblems:
    def coordinator_failure_issue(self):
        """Coordinator crash leaves participants in doubt"""

        # Scenario: Coordinator crashes after participants vote YES
        # but before sending commit decision

        participants_state = {
            "node1": "prepared (voted YES) - STUCK waiting",
            "node2": "prepared (voted YES) - STUCK waiting",
            "node3": "prepared (voted YES) - STUCK waiting"
        }

        # Participants hold locks indefinitely!
        # Cannot unilaterally abort (promised to commit)
        # Cannot unilaterally commit (don't know coordinator decision)
        # System is blocked until coordinator recovers

    def xa_transaction_problems(self):
        """Issues with XA (heterogeneous) transactions"""
        problems = [
            "Single point of failure (coordinator)",
            "Application server becomes critical component",
            "No direct communication between participants",
            "Lowest common denominator limitations",
            "Difficult recovery from coordinator failures"
        ]
        return problems

    def modern_solutions(self):
        """How modern systems solve these problems"""
        return {
            "replicated_coordinator": "Use consensus (Raft/PBFT) for coordinator",
            "direct_communication": "Participants can communicate directly",
            "automatic_failover": "No manual intervention for recovery",
            "integrated_concurrency_control": "Deadlock detection across nodes"
        }
```

### 8.9.4 Database-Internal Distributed Transactions

Modern distributed databases (CockroachDB, TiDB, Spanner) solve 2PC problems:

```python
class ModernDistributedDB:
    def internal_distributed_transaction(self):
        """How NewSQL databases handle distributed transactions"""

        improvements = {
            "replicated_coordinator": "Raft consensus for coordinator high availability",
            "integrated_design": "Custom protocols optimized for the specific system",
            "automatic_recovery": "No manual intervention needed",
            "cross_shard_isolation": "SSI or other isolation across multiple shards"
        }

        # Example: CockroachDB transaction across shards
        with cockroach_db.transaction():
            # Transaction can touch multiple shards
            shard1.update_inventory(product_id, -1)
            shard2.create_order(user_id, product_id)
            shard3.update_user_stats(user_id)

            # Database handles distributed commit automatically
            # Uses consensus for coordinator, efficient conflict detection
```

### 8.9.5 Exactly-Once Message Processing

Important pattern: ensure operations happen exactly once, even with retries.

```python
class ExactlyOnceProcessing:
    def without_distributed_transactions(self):
        """Idempotent processing with deduplication"""
        message = message_broker.receive()

        with database.transaction():
            # Check if already processed
            if database.exists("processed_messages", message.id):
                # Already processed - safe to acknowledge
                message_broker.acknowledge(message)
                return

            # Process message
            result = self.process_message(message)

            # Store result AND mark as processed
            database.save(result)
            database.insert("processed_messages", message.id)

        # Now safe to acknowledge
        message_broker.acknowledge(message)

        # Key insight: Only need single-database transactions,
        # not distributed transactions across message broker + database
```

---

## 8.10 Summary

`★ Insight ─────────────────────────────────────`
Transactions represent one of the most successful abstractions in computer science - they've remained fundamentally unchanged for 50 years while adapting to new challenges like distributed systems. The key insight is understanding the trade-offs: stronger isolation guarantees provide simpler programming models but at the cost of performance and scalability.
`─────────────────────────────────────────────────`

This chapter explored how transactions simplify application development by providing ACID guarantees:

### Key Concepts Covered

**ACID Properties**:
- **Atomicity**: All-or-nothing execution
- **Consistency**: Application-defined invariants preserved
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data survives failures

**Isolation Levels** (weakest to strongest):
- **Read Uncommitted**: Minimal protection
- **Read Committed**: Prevents dirty reads/writes
- **Snapshot Isolation**: Consistent snapshots via MVCC
- **Serializable**: Complete isolation

**Race Conditions**:
- **Dirty reads/writes**: Seeing or overwriting uncommitted data
- **Read skew**: Inconsistent snapshots
- **Lost updates**: Concurrent read-modify-write cycles
- **Write skew**: Decisions based on outdated premises
- **Phantoms**: Writes affecting prior search queries

**Serializability Approaches**:
- **Serial execution**: Single-threaded, fast transactions
- **Two-phase locking**: Traditional pessimistic approach
- **Serializable snapshot isolation**: Modern optimistic approach

**Distributed Transactions**:
- **Two-phase commit**: Classic atomic commitment protocol
- **Modern solutions**: Consensus-based coordinators, automatic recovery

### Practical Guidelines

1. **Use transactions when you need them**: Complex multi-object operations benefit greatly
2. **Understand isolation levels**: Most applications work fine with read committed or snapshot isolation
3. **Consider serializability carefully**: Only use when you genuinely need it and can accept the performance cost
4. **Prefer database-internal distributed transactions**: Much more reliable than XA transactions
5. **Design for idempotence**: Often eliminates need for complex distributed transaction coordination

### The Evolution Continues

Modern distributed databases prove that transactions and scalability aren't mutually exclusive. Systems like CockroachDB and Spanner provide ACID guarantees at global scale, showing that the fundamental insights of 1970s database research remain relevant in today's distributed world.

---

**Navigation**: [← Chapter 7: Sharding](07-sharding.md) | [Chapter 9: The Trouble with Distributed Systems →](09-distributed-systems.md)

---

**References and Further Reading**

- [ACID: Properties of Database Transactions](https://en.wikipedia.org/wiki/ACID) - Comprehensive overview of ACID properties
- [Spanner: Google's Globally-Distributed Database](https://research.google/pubs/pub39966/) - Modern approach to distributed transactions
- [A Critique of ANSI SQL Isolation Levels](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-95-51.pdf) - Classic paper on isolation level definitions
- [Serializable Snapshot Isolation in PostgreSQL](https://drkp.net/papers/ssi-vldb12.pdf) - Practical implementation of SSI