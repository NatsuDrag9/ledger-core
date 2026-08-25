```text
LEDGER CORE — PROJECT SUMMARY

PURPOSE
-------
Ledger Core is a small full-stack personal finance application built primarily as a System Design + Backend Engineering practice project.

The goal is NOT to build a feature-heavy finance application. The goal is to use a simple domain (income, expenses, and balance) to practice real-world backend/system-design concepts:

- Concurrency
- Database transactions
- Idempotency
- Data consistency
- REST API design
- PostgreSQL row-level locking
- Horizontal scaling
- Failure and retry scenarios
- Database vs application-level concurrency control
- Architectural trade-offs

The project should also be polished enough to showcase in a portfolio.


TECHNOLOGY STACK
----------------
Frontend:
- React
- TypeScript
- Vite

Backend:
- Java
- Spring Boot
- Spring Data JPA
- REST APIs

Database:
- PostgreSQL

Infrastructure:
- Docker / Docker Compose (if useful)

Keep the infrastructure simple. Do not introduce Kafka, Redis, Kubernetes, microservices, etc. unless a concrete requirement eventually justifies them.


FUNCTIONAL REQUIREMENTS
-----------------------
1. Create income
2. Create expense
3. View transactions
4. View balance / user profile
5. Create temporary user


API ENDPOINTS
-------------
GET  /api/v1/ledger/users
POST /api/v1/ledger/users

GET  /api/v1/ledger/users/{userId}
GET  /api/v1/ledger/users/{userId}/transactions
POST /api/v1/ledger/users/{userId}/transactions
     Query Param: disableLocking=true (optional, to bypass locking and trigger race conditions)


NON-FUNCTIONAL REQUIREMENTS
----------------------------
1. No duplicate transactions
2. No negative balance
3. Balance and transaction data must remain consistent
4. Reliable
5. Highly available
6. Capable of scaling horizontally

We are deliberately NOT over-engineering the initial version.


CURRENT HIGH-LEVEL ARCHITECTURE
-------------------------------
Client
   |
   v
Load Balancer
   |
   v
Spring Boot API
   |
   v
PostgreSQL


CURRENT DATA MODEL
------------------

USER
(
    id,
    full_name,
    password,
    created_at,
    expires_at
)

TRANSACTION
(
    id PRIMARY KEY,
    user_id FOREIGN KEY,
    created_at,
    idempotency_key,
    type,              -- credit / debit
    amount,
    balance_after
)

Important constraint:

UNIQUE(user_id, idempotency_key)


BALANCE_AFTER
------------
balance_after represents the user's balance immediately after that transaction was committed.

Example:

Transaction    Amount    Balance After
---------------------------------------
T1             +100          100
T2              -30           70
T3              -20           50

This gives us an audit-friendly transaction history.

We removed the current balance from the User table in the revised design.


IDEMPOTENCY
-----------
A client generates an idempotency key for each logical operation.

Example:

User wants to add a ₹500 expense.

Idempotency-Key: abc-123

If the request succeeds but the response is lost:

Client
   |
   v
Server
   |
   v
DB COMMIT
   |
   X
Response lost

The client may retry the same logical operation using:

Idempotency-Key: abc-123

The server/database must ensure that the retry does not create another transaction.

Therefore:

UNIQUE(user_id, idempotency_key)

is an important database constraint.

Important concept:

Idempotency is NOT about detecting whether the first request failed.

It makes an uncertain outcome safe to retry.

The client may not know whether the original request was:
- never received
- still processing
- successfully committed but the response was lost
- successfully committed but the response was delayed


CONCURRENCY PROBLEM
-------------------
Suppose the balance is ₹100.

Two requests arrive simultaneously:

Request A -> debit ₹80
Request B -> debit ₹80

Without concurrency control:

A reads ₹100
B reads ₹100

A -> ₹100 >= ₹80 -> YES
B -> ₹100 >= ₹80 -> YES

A -> balance becomes ₹20
B -> balance becomes -₹60

This violates the "no negative balance" requirement.

We therefore need to serialize conflicting operations.


AUTHOR'S VAULTEX APPROACH
--------------------------
The original Vaultex project uses an application-level per-user mutex.

Conceptually:

Request
   |
   v
Spring Boot
   |
   v
Acquire user mutex
   |
   v
Check balance
   |
   v
Perform transaction
   |
   v
Release mutex

This works well for a single Spring Boot instance.

However, with multiple Spring Boot instances:

Spring Boot A              Spring Boot B
      |                          |
    Mutex A                    Mutex B
      |                          |
      +-------- PostgreSQL ------+

The two instances do not share the same in-memory mutex.

Therefore, application-level locking becomes a distributed locking problem.

The author discusses moving the locking mechanism to something like Redis for multi-instance deployment.


OUR ALTERNATIVE DESIGN
----------------------
Instead of using a Spring Boot mutex, we decided to investigate letting PostgreSQL handle the concurrency.

Conceptually:

Request
   |
   v
Load Balancer
   |
   v
Spring Boot
   |
   v
BEGIN DATABASE TRANSACTION
   |
   v
SELECT user/account ... FOR UPDATE
   |
   v
Row is locked
   |
   v
Check balance
   |
   v
Insert transaction
   |
   v
Update relevant state
   |
   v
COMMIT
   |
   v
Row lock released


POSTGRESQL ROW LOCKING
----------------------
The important property of:

SELECT ... FOR UPDATE

is that the selected row is locked for the duration of the database transaction.

Example:

Initial balance = ₹100

Request A: debit ₹80
Request B: debit ₹80

Request A:
BEGIN
SELECT user FOR UPDATE
-> reads ₹100
-> acquires lock

Request B:
BEGIN
SELECT user FOR UPDATE
-> waits for Request A

Request A:
check ₹100 >= ₹80
insert transaction
update balance/state
COMMIT

Request B:
lock becomes available
reads updated state
₹20 >= ₹80 -> FALSE
ROLLBACK / reject

Result:
A succeeds
B fails
Balance never becomes negative.


WHY THIS DESIGN IS INTERESTING
------------------------------
The PostgreSQL approach has an important advantage for horizontal scaling.

Multiple Spring Boot instances can share the same database lock:

Spring Boot A ----\
Spring Boot B -----+----> PostgreSQL row lock
Spring Boot C ----/

The lock is not tied to a particular JVM.

Therefore, we don't automatically need a distributed application-level mutex just because we have multiple Spring Boot instances.


IMPORTANT SCALING PRINCIPLE
---------------------------
Millions of users/transactions do NOT automatically make PostgreSQL row locking a bad solution.

The important issue is contention.

Different users can be processed concurrently:

User A -> locked
User B -> locked
User C -> locked
User D -> locked

Only operations competing for the same user's/account's state need to serialize.

The critical section should also be kept short:

BEGIN
  -> acquire lock
  -> validate
  -> write transaction/state
  -> COMMIT

Do NOT hold the database lock while making external API calls or doing slow work.


IMPORTANT DESIGN TRADE-OFF
---------------------------
The author chose an application-level mutex.

Our alternative is:

Spring Boot
    |
    v
PostgreSQL transaction
    |
    +-- row-level locking
    +-- unique idempotency constraint
    +-- atomic writes
    |
    v
COMMIT

Neither approach should be treated as universally "correct".

The system-design lesson is:

We need to serialize conflicting operations and maintain invariants.

Possible mechanisms include:
- Application-level mutex
- Distributed lock
- Database row locking
- Atomic conditional database updates
- Database uniqueness constraints

The appropriate choice depends on the requirements and deployment architecture.


POTENTIAL TRANSACTION FLOW
--------------------------
For POST /transactions:

### FLAWED POTENTIAL TRANSACTION FLOW (INCORRECT)
In this flow, the idempotency check is performed *before* acquiring the row-level lock. Concurrent identical requests will both bypass the check, and the second request will crash on write (DB Unique Constraint violation) instead of returning a replayed response:

Request
   |
   v
Spring Boot
   |
   v
BEGIN
   |
   v
Check idempotency / existing operation
   |
   +---- already processed
   |          |
   |          v
   |      return existing result
   |
   +---- new operation
              |
              v
       Lock relevant DB row
              |
              v
        Check balance
              |
       +------+------+
       |             |
    sufficient    insufficient
       |             |
       v             v
Insert transaction  ROLLBACK
       |
       v
Update state
       |
       v
COMMIT
       |
       v
Return response


### CORRECTED TRANSACTION FLOW (LOCK-THEN-CHECK)
To fix this, the idempotency check is performed *inside* the transaction boundary *after* the user's row lock is acquired:

Request
   |
   v
Spring Boot
   |
   v
BEGIN
   |
   v
Lock relevant DB row (SELECT FOR UPDATE)
   |
   v
Check idempotency / existing operation
   |
   +---- already processed
   |          |
   |          v
   |      COMMIT/ROLLBACK and return existing result
   |
   +---- new operation
              |
              v
        Check balance
              |
       +------+------+
       |             |
    sufficient    insufficient
       |             |
       v             v
Insert transaction  ROLLBACK
       |
       v
Update state
       |
       v
COMMIT
       |
       v
Return response


IMPORTANT IDEMPOTENCY DETAIL
----------------------------
The initial idempotency check cannot simply be run before locking:

if key exists:
    return existing result

else:
    continue

because two concurrent requests could both observe that the key does not exist.

Therefore:
1. The database must ultimately enforce: UNIQUE(user_id, idempotency_key)
2. Crucially, the idempotency check must occur inside the transaction block *after* acquiring the row-level lock. If performed before locking, the second request will bypass the check, block on lock acquisition, and then fail with a Unique Constraint Violation on insert instead of returning the replayed response.

The idempotency information and the actual transaction should be persisted atomically where possible, so a crash cannot leave the transaction committed without the system remembering that the operation was processed.


PROJECT INTENT
--------------
This is NOT intended to be a production-scale fintech system.

It is a deliberately small project that allows us to explore serious backend/system-design problems without unnecessary infrastructure.

The learning progression should be:

1. Design the basic REST API
2. Implement the Spring Boot backend
3. Model PostgreSQL data
4. Implement basic transactions
5. Introduce the balance invariant
6. Demonstrate the concurrency race condition
7. Solve concurrency using PostgreSQL
8. Add idempotency
9. Handle retries safely
10. Build the React frontend
11. Add tests for concurrency/idempotency
12. Document architectural decisions
13. Polish the project for the portfolio


PORTFOLIO GOAL
--------------
Ledger Core should demonstrate:

- Java/Spring Boot backend development
- PostgreSQL
- REST API design
- React/TypeScript full-stack development
- Database transactions
- Concurrency control
- Idempotency
- Data consistency
- Reasoned system-design decisions

The frontend should be polished but relatively simple.

The backend/system-design aspects are the main showcase.


RECOMMENDED REPOSITORY
---------------------
Repository name:

ledger-core

Suggested description:

"Full-stack personal finance application demonstrating Spring Boot, PostgreSQL transactions, concurrency control, idempotency, and consistency guarantees."


CORE PHILOSOPHY
---------------
Do not add infrastructure just because it is commonly mentioned in system-design interviews.

Start with:

React
  ->
Spring Boot
  ->
PostgreSQL

Only introduce additional components when a concrete requirement or bottleneck justifies them.

The goal is to understand WHY each architectural decision exists, rather than memorize a particular architecture.
```
