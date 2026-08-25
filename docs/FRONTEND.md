# Ledger Core — Frontend Design

This document details the user interface design, layouts, and interaction flows for the **Ledger Core** client application.

---

## 1. Authentication / User Access
For sandbox learning purposes, authentication is designed to be quick and ephemeral.

### Temporary Login Screen
* **Features**:
  - Provides a list of 2–3 pre-seeded temporary test users.
  - Allows typing in a custom username to dynamically create a temporary user.
  - Displays a notice explaining that these custom IDs/users are ephemeral and will be periodically garbage collected.

```text
┌──────────────────────────────────────────────────────────┐
│                      LEDGER CORE                         │
│                                                          │
│  Select a Test User:                                     │
│  [ User 1 - Alice (Balance: ₹10,000) ]                   │
│  [ User 2 - Bob   (Balance: ₹500)    ]                   │
│                                                          │
│  Or Create Custom User:                                  │
│  [ Enter Username... ]         [ Create & Enter ]        │
│                                                          │
│  Note: Temporary test accounts automatically expire.     │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Dashboard
The main workspace containing the User Profile, Transaction History, and controls to open the simulation labs.

```text
┌──────────────────────────────────────────────────────────┐
│ Ledger Core         [Safety Labs]  [+ New Tx]     👤 Alice│
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Balance: ₹4,500                                          │
│                                                          │
│ Transactions                         [Filter] [Sort]     │
│ ──────────────────────────────────────────────────────── │
│ Date       Type       Amount       Balance After         │
│ ──────────────────────────────────────────────────────── │
│ Aug 25     Expense    -₹500        ₹4,500                │ 
│ Aug 24     Income    +₹5,000       ₹5,000                │
│                                                          │
│                    < Page 1 of 1 >                       │
└──────────────────────────────────────────────────────────┘
```

### New Transaction Modal
Allows manual recording of individual income or expense entries.
```text
┌──────────────────────────────────────────────────────────┐
│ New Transaction                                          │
│ ──────────────────────────────────────────────────────── │
│ Type: [X] Income   [ ] Expense                           │
│                                                          │
│ Amount: [ 1000.00 ]                                      │
│                                                          │
│ [ Cancel ]                                [ Submit ]     │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Concurrency Lab & Playground
A dedicated panel to configure, run, and study concurrency conditions in the backend.

### Concurrency Panel Mockup
```text
┌──────────────────────────────────────────────────────────┐
│ Concurrency Laboratory                                   │
│ ──────────────────────────────────────────────────────── │
│ 1. Concurrency Level Select                              │
│    ( ) Database Level (PostgreSQL SELECT ... FOR UPDATE) │
│    ( ) Application Level (JVM-level Mutex Locking)       │
│                                                          │
│ 2. Safety Lock Toggle                                    │
│    [ ] Disable Locking (Forces TOCTOU Race Condition)    │
│                                                          │
│ 3. Thread Settings                                       │
│    Parallel Requests Count: [ 2 ]                        │
│    Debit Amount Per Request: [ ₹80 ]                     │
│                                                          │
│    [ RUN SIMULATION ]                                    │
│                                                          │
│ 4. Execution Logs                                        │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [Thread-1] Initiated DEBIT ₹80                       │ │
│ │ [Thread-2] Initiated DEBIT ₹80                       │ │
│ │ [Thread-1] Completed successfully. Balance is ₹20    │ │
│ │ [Thread-2] Failed: 400 Bad Request                   │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Simulation Scenarios & Behavior

#### A. Database Level Locking
* **Safety Lock Enabled** (`disableLocking=false`): 
  - Hits `POST /api/v1/ledger/users/{userId}/transactions`.
  - Backend uses `SELECT ... FOR UPDATE` to lock the user row.
  - Concurrent threads block sequentially. The first thread commits, the second thread unblocks, reads the updated balance, and is rejected with `400 Bad Request` (Insufficient Balance).
* **Safety Lock Disabled** (`disableLocking=true`):
  - Hits `POST /api/v1/ledger/users/{userId}/transactions?disableLocking=true`.
  - Bypasses row-level lock and introduces a 100ms artificial delay.
  - Both threads check balance simultaneously, see sufficient funds, and proceed to record debits, leading to inconsistent double-spending (e.g. balance drops below zero or updates are lost).

#### B. Application Level Mutex
* **Safety Lock Enabled** (`disableJvmLocking=false`):
  - Hits `POST /api/v1/ledger/users/{userId}/transactions`.
  - Backend uses an in-memory lock (e.g., `ReentrantLock` map per userId) to serialize requests.
  - Threads queue and execute in order. The second request fails with `400 Bad Request`.
* **Safety Lock Disabled** (`disableJvmLocking=true`):
  - Hits `POST /api/v1/ledger/users/{userId}/transactions?disableJvmLocking=true`.
  - Bypasses the application-level lock and introduces a 100ms artificial delay.
  - Parallel threads execute validation concurrently, leading to double-debiting.

---

## 4. Idempotency Lab
Verifies request deduping using idempotency keys.

```text
┌──────────────────────────────────────────────────────────┐
│ Idempotency Laboratory                                   │
│ ──────────────────────────────────────────────────────── │
│ Idempotency Key: [ abc-123-xyz ]   [ Generate New ]      │
│ Amount: [ ₹500 ]                                         │
│                                                          │
│    [ SEND DUPLICATE REQUESTS CONCURRENTLY ]              │
│                                                          │
│ Result:                                                  │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Request A -> HTTP 201 Created (replayed = false)     │ │
│ │ Request B -> HTTP 200 OK (replayed = true)           │ │
│ │ Request C -> HTTP 200 OK (replayed = true)           │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```