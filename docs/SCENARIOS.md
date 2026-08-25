# Concurrency Scenarios & Use Cases

This document details the various concurrency architectures considered for the **Ledger Core** project, analyzes when and why each architecture is valid, and provides a guide to the Concurrency Lab Sandbox.

---

## 1. Concurrency Control Architectures

### A. Application-Level Mutex (In-Memory JVM Locks)
* **How it works**: Uses standard language synchronization mechanisms (e.g., `synchronized` blocks, Java `ReentrantLock`, or Node.js in-memory mutexes) to serialize requests for a specific user ID in the application memory tier.
* **Pros**: 
  - Extremely fast (sub-microsecond lock acquisition).
  - No database lock overhead or contention.
* **Cons**:
  - Bound to a single application instance. Does not scale horizontally.
  - If a load balancer distributes concurrent requests for the same user across different backend nodes, the local locks will not coordinate, leading to race conditions.
* **Best Use Cases**:
  - Single-instance monoliths.
  - Non-critical, low-traffic APIs.
  - Applications with sticky sessions where all traffic for a specific user is guaranteed to route to the exact same server instance.

---

### B. Distributed Locking (e.g., Redis Redlock)
* **How it works**: Application nodes coordinate lock acquisition through a shared distributed memory store like Redis.
* **Pros**:
  - Allows horizontal scaling of the application layer.
  - Keeps locks out of the primary relational database, reducing database lock contention.
* **Cons**:
  - Adds architectural complexity (requires Redis, cluster maintenance, client libraries).
  - Network overhead for lock acquisition/release.
  - Split-brain or clock drift issues can theoretically compromise safety in edge cases.
* **Best Use Cases**:
  - Multi-instance microservices.
  - Highly distributed systems where lock coordination is needed across different services.
  - High-traffic applications where database lock contention is a bottleneck but in-memory processing is required.

---

### C. Database Row-Level Locking (Pessimistic write - `SELECT ... FOR UPDATE`)
* **How it works**: The backend initiates a database transaction and requests a pessimistic write lock on the target user's row. Subsequent database queries trying to read/write the same row with a lock are blocked until the first transaction commits or rolls back.
* **Pros**:
  - Extremely robust and ACID-compliant.
  - Works natively with horizontal scaling of application instances (PostgreSQL coordinates the lock).
  - Simple implementation without external dependencies (no Redis required).
* **Cons**:
  - Database connection pool exhaustion if transactions are held open too long (e.g., during external API calls).
  - Database lock contention on high-frequency account transactions (hotspot rows).
* **Best Use Cases**:
  - Transaction-heavy systems, financial ledgers, and billing engines where correctness is paramount.
  - Mid-scale applications (up to 10k–40k TPS depending on sharding and hardware).
  - Systems already using an ACID database that want to scale horizontally without introducing Redis.

---

### D. In-Memory Actor Model / Virtual Threads
* **How it works**: Transactions for a specific account are queued and processed sequentially by a dedicated in-memory Actor (e.g., via Pekko, Akka, or Java Virtual Threads). The database is updated asynchronously via write-behind batches.
* **Pros**:
  - Scales to 100k+ TPS by removing disk and row locks from the critical execution path.
  - Verified in-memory speed.
* **Cons**:
  - Requires event sourcing and eventual consistency.
  - Complex failure recovery (if the actor crashes mid-memory, state must be reconstructed from the transaction log).
* **Best Use Cases**:
  - High-frequency trading, massive scale ledger systems (e.g., Alipay, Visa, high-scale gaming bank systems).

---

## 2. Pessimistic vs. Optimistic Locking

| Metric | Pessimistic Locking (`SELECT FOR UPDATE`) | Optimistic Locking (`@Version`) |
| :--- | :--- | :--- |
| **Strategy** | Block other readers/writers until finished. | Allow parallel reads/writes; fail the commit if the version changed. |
| **Concurrency** | Low concurrency on the same row; high safety. | High concurrency on the same row; high rollback rates. |
| **Use Case** | High contention, high conflict rate (e.g., rapid debiting). | Low contention, low conflict rate (e.g., user updating profile info). |
| **Failure Cost** | Thread waits (latency); low failure rate. | Immediate error; requires client-side retry logic. |

---

## 3. Concurrency Lab Sandbox Mechanics

The sandbox provides two toggleable simulation modes to demonstrate the importance of locking:

### A. Lock-Disabled Mode (`disableLocking=true`)
When `disableLocking` is enabled, the backend:
1. Queries the database using a standard `SELECT` (bypassing `FOR UPDATE`).
2. Introduces an **artificial 100ms delay** (`Thread.sleep(100)`) between the check (read) and write (update) phases.
3. Concurrent requests read the same initial balance, bypass the checks, and execute overlapping updates. This triggers the **TOCTOU (Time-of-Check to Time-of-Use)** race condition, causing the balance to become negative or inconsistent.

### B. Lock-Enabled Mode (`disableLocking=false`)
When `disableLocking` is disabled (default):
1. The backend queries the user row using `SELECT ... FOR UPDATE`, instantly locking it.
2. If a second request arrives, PostgreSQL blocks it on the lock acquisition query.
3. The first request completes its verification, saves the transaction, commits, and releases the lock.
4. The second request unblocks, reads the updated balance, and correctly rejects the request with a `422 Unprocessable Entity` due to insufficient balance. Data integrity remains 100% intact.
