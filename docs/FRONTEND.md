1. Login / User Access

Temporary login

- Generate/provide 2–3 temporary IDs
- User selects/enters an ID

Display:

- Custom-created IDs are temporary and will be deleted automatically.

Later:

- Google OAuth
- Proper logout
- Proper authentication/authorization

2. Dashboard

Header
- Ledger 
- Core title
- User icon
    - Transaction Profile
    - Logout (later)

Transaction table
- User's transactions only
- Date
- Type
- Amount
- Balance After (`balance_after`)
- Filter
- Sort
- Pagination

┌──────────────────────────────────────────────────────────┐
│ Ledger Core             [+ New Transaction]       👤     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Transactions                         [Filter] [Sort]     │
│                                                          │
│ Date       Type       Amount       Balance After         │
│ ──────────────────────────────────────────────────────── │
│ Aug 25     Expense    -₹500        ₹4,500               │
│ Aug 24     Income    +₹5,000       ₹5,000               │
│ Aug 23     Expense    -₹2,000       ₹0                  │
│                                                          │
│                    < 1 2 3 4 5 >                         │
└──────────────────────────────────────────────────────────┘

New Transaction

┌──────────────────────────────────────────────────────────┐
│                                                          │
│ New Transaction                                          │
│                                                          │
│ Type
│ ○ Income                                                 │
│ ○ Expense                                                │
│                                                          │
│ Amount
│ [____________]
│                                                          │
│ [Cancel] [Create Transaction]
└──────────────────────────────────────────────────────────┘