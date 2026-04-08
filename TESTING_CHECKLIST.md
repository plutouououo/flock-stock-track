# Flock Stock Track - Comprehensive Testing Checklist

## Overview
This checklist covers all functionalities of the Flock Stock Track system, a poultry sales management system with role-based access (Owner and Cashier).

---

## 1. AUTHENTICATION & AUTHORIZATION

### 1.1 Login Functionality
- [v] User can access login page without authentication
- [v] Valid credentials allow user to log in successfully
- [v] Invalid email shows appropriate error message
- [v] Invalid password shows appropriate error message
- [v] Login persists user session in browser
- [v] User stays logged in after page refresh
- [v] Session expires appropriately after timeout

### 1.2 User Roles & Access Control
- [v] Owner can access all pages (Dashboard, Products, Record Sale, Reports, Shopping List, Customers, Expenses)
- [v] Cashier can only access Products and Record Sale pages
- [v] Cashier is redirected when attempting to access owner-only pages
- [v] Non-authenticated users are redirected to login for protected routes
- [v] User profile displays correct role
- [v] Logout clears session and redirects to login

### 1.3 Logout Functionality
- [v] Logout button appears for all authenticated users
- [v] Clicking logout clears session
- [v] User is redirected to login page after logout
- [v] Subsequent access to protected routes requires login

---

## 2. DASHBOARD (OWNER-ONLY)

### 2.1 Dashboard Overview
- [v] Dashboard loads successfully for owner
- [v] Dashboard displays total products count
- [v] Dashboard displays total sales count
- [v] Dashboard displays total revenue (sum of all sales)
- [v] Dashboard displays total customers count
- [v] Dashboard displays low stock alert count (products below threshold)

### 2.2 Key Metrics & KPIs
- [v] Revenue metric updates when new sales are recorded 
- [v] Sales count increases when transactions are completed
- [v] Low stock warnings appear for products at/below threshold
- [v] Stock warning icons are visible and distinguishable

### 2.3 Navigation
- [v] All navigation links are functional
- [v] Quick links redirect to correct pages

---

## 3. PRODUCTS MANAGEMENT

### 3.1 View Products
- [v] Products list loads successfully
- [v] All products display with: name, SKU, price, threshold, stock level, and image
- [v] Search functionality filters products by name or SKU correctly
- [v] Category filter works and displays only selected category products
- [v] Product images display correctly (or show placeholder if not available)
- [v] Stock levels are calculated correctly from batches

### 3.2 Add Products (Owner Only)
- [v] Owner can click "Add Product" button
- [v] Product form dialog opens with all required fields:
  - [v] Product name (required)
  - [v] SKU (required, must be unique)
  - [v] Category dropdown
  - [v] Price (required, numeric)
  - [v] Threshold (numeric)
  - [v] Image upload
- [v] Validation prevents empty required fields
- [v] SKU uniqueness is validated (duplicate generates error)
- [v] Product is added to database and appears in list
- [v] Success toast message displays after addition
- [v] Form clears after successful submission

### 3.3 Edit Products (Owner Only)
- [v] Owner can click edit button on any product
- [ ] Edit form pre-populates with current product data
- [ ] Product can be edited without changing SKU
- [ ] Changes are saved to database
- [ ] Product list updates with new values
- [ ] Success toast message displays after editing

### 3.4 Delete Products (Owner Only)
- [ ] Owner can click delete button on any product
- [ ] Confirmation dialog appears before deletion
- [ ] Confirming deletion removes product from list
- [ ] Deleting product also removes associated batches
- [ ] Success toast message displays after deletion
- [ ] Canceling deletion keeps product intact

### 3.5 Import Products (Owner Only)
- [ ] Owner can upload XLS/XLSX files with product data
- [ ] File parser correctly extracts product information
- [ ] Batch operations update correctly during import
- [ ] Duplicate handling prevents duplicate SKUs
- [ ] Import displays success/error messages appropriately

### 3.6 Stock Management
- [ ] Stock is calculated from product batches
- [ ] Low stock indicators appear for products below threshold
- [ ] Stock levels update in real-time after each sale

### 3.7 Cashier Product View
- [ ] Cashier can view all products
- [ ] Cashier cannot add/edit/delete products
- [ ] Cashier can see current stock levels
- [ ] Product page displays read-only for cashiers

---

## 4. RECORD SALES

### 4.1 Owner Sale Recording (Different UI)
- [ ] Owner can access Record Sale page
- [ ] Owner sees "Owner Flow" interface
- [ ] Owner can select products and quantities
- [ ] Owner can add multiple items per transaction

### 4.2 Cashier Sale Recording
- [ ] Cashier can access Record Sale page
- [ ] Cashier sees "Cashier Flow" interface (different from owner)
- [ ] Cashier can select products and enter quantities
- [ ] Quantity validation prevents zero/negative quantities
- [ ] Quantity validation prevents exceeding available stock
- [ ] Product suggestions appear as user types
- [ ] Selected products display in cart/transaction area

### 4.3 Sale Details
- [ ] Customer type dropdown shows all options: Walk-in, Online, Pre-order, Shopee, Tokopedia
- [ ] Payment method dropdown shows all options: Cash, Transfer, E-wallet
- [ ] Payment nominal can be entered (for partial/different payments)
- [ ] Total amount calculates correctly (sum of all items)
- [ ] Unit price is pulled from product database

### 4.4 Sale Transaction
- [ ] Sale can be completed with valid data
- [ ] Sale reduces product stock from batches
- [ ] Multiple batches are depleted in FIFO order (oldest first by expiry date)
- [ ] Sale is recorded with timestamp
- [ ] Cashier ID is recorded with sale
- [ ] Receipt is generated and can be viewed
- [ ] Success message displays after sale completion

### 4.5 Sale Validation
- [ ] Sale cannot be completed with empty items
- [ ] Sale cannot be completed without customer type
- [ ] Sale cannot be completed without payment method
- [ ] Sale cannot be completed without payment nominal
- [ ] Sale cannot exceed available stock
- [ ] Validation messages are clear and helpful

### 4.6 Stock Deduction
- [ ] Stock decreases correctly after sale
- [ ] Correct batches are selected (FIFO with expiry dates)
- [ ] Partial batch deduction works correctly
- [ ] Multiple batches are depleted if needed

---

## 5. CUSTOMERS MANAGEMENT (OWNER-ONLY)

### 5.1 View Customers
- [ ] All customers display in table format
- [ ] Customer information shows: name, phone, address, total spent, purchase count
- [ ] Search functionality filters customers by name
- [ ] Customers sort by various fields (name, spending, purchases)
- [ ] Customer analytics calculate correctly:
  - [ ] Total spent (sum of all sales)
  - [ ] Purchase count (number of transactions)
  - [ ] Last purchase date
  - [ ] Favorite products (most purchased)

### 5.2 Add Customers
- [ ] Owner can open "Add Customer" dialog
- [ ] Form has fields: name (required), phone, address
- [ ] Form validation prevents empty name
- [ ] Customer is added to database and appears in list
- [ ] Success message displays after addition
- [ ] Customer can be selected during sale recording

### 5.3 Edit Customers
- [ ] Owner can click edit button on customer
- [ ] Edit form pre-populates with customer data
- [ ] Customer details can be updated
- [ ] Changes are saved to database
- [ ] Success message displays after editing

### 5.4 Delete Customers
- [ ] Owner can delete customers
- [ ] Confirmation dialog appears before deletion
- [ ] Deletion removes customer from list
- [ ] Associated sales are handled appropriately (not deleted, just de-linked)
- [ ] Success message displays after deletion

### 5.5 Customer Analytics
- [ ] Customer analytics page shows:
  - [ ] Customer segmentation by spending
  - [ ] Purchase frequency
  - [ ] Customer lifetime value
  - [ ] Top customers by revenue
- [ ] Customer transaction history is displayed
- [ ] Customer contact information is accessible

---

## 6. EXPENSES MANAGEMENT (OWNER-ONLY)

### 6.1 View Expenses
- [ ] Expenses list loads successfully
- [ ] All expenses display with: type, date, description, amount
- [ ] Expenses can be filtered by date range
- [ ] Expenses can be filtered by type
- [ ] Total expenses are calculated and displayed
- [ ] Expenses sort by date (newest first)

### 6.2 Add Expenses
- [ ] Owner can click "Add Expense" button
- [ ] Expense form has fields: type (required), date (required), description, amount (required)
- [ ] Form validation prevents empty required fields
- [ ] Amount validation ensures positive numbers only
- [ ] Expense is added to database and appears in list
- [ ] Success message displays after addition

### 6.3 Edit Expenses
- [ ] Owner can click edit button on expense
- [ ] Edit form pre-populates with expense data
- [ ] Expense details can be updated
- [ ] Changes are saved to database
- [ ] Success message displays after editing

### 6.4 Delete Expenses
- [ ] Owner can delete expenses
- [ ] Confirmation dialog appears before deletion
- [ ] Deletion removes expense from list
- [ ] Success message displays after deletion

### 6.5 Expense Types
- [ ] Various expense types can be recorded (utilities, rent, supplies, etc.)
- [ ] Custom expense types can be added

---

## 7. REPORTS & ANALYTICS (OWNER-ONLY)

### 7.1 Sales Reports
- [ ] Sales report loads successfully
- [ ] Report displays total sales revenue
- [ ] Report displays total number of transactions
- [ ] Report displays average transaction value
- [ ] Sales can be filtered by date range:
  - [ ] Last 7 days
  - [ ] Last 30 days
  - [ ] Last year
  - [ ] Custom range
- [ ] Sales can be filtered by payment method
- [ ] Sales can be filtered by customer type

### 7.2 Sales Data Visualization
- [ ] Sales chart displays by time period (daily/weekly/monthly)
- [ ] Revenue trend visualization is accurate
- [ ] Customer type distribution pie chart shows correctly
- [ ] Payment method distribution shows all methods

### 7.3 Product Reports
- [ ] Top selling products by quantity
- [ ] Top revenue generators by product
- [ ] Product category breakdown
- [ ] Product performance comparison

### 7.4 Sales Edit/Delete (from Reports)
- [ ] Owner can view sale details
- [ ] Owner can edit sale details (payment method, payment nominal, customer type)
- [ ] Owner can delete sales from report view
- [ ] Deleting sale reverses stock deductions
- [ ] Stock is restored to appropriate batch after deletion
- [ ] Confirmation dialog appears before deletion

### 7.5 Export Functionality
- [ ] Sales data can be exported to Excel/CSV
- [ ] Exported file includes all necessary columns
- [ ] Export filename includes timestamp
- [ ] Export downloads successfully
- [ ] Date filters are applied to exports

### 7.6 Financial Summary
- [ ] Net profit/loss calculation (Revenue - Expenses)
- [ ] Gross revenue display
- [ ] Total expenses display
- [ ] Period-based comparisons

---

## 8. SHOPPING LIST (OWNER-ONLY)

### 8.1 View Shopping List
- [ ] Shopping list page loads successfully
- [ ] All shopping list items display with: product name, SKU, quantity needed, order status
- [ ] Low stock products can be added to shopping list
- [ ] Default quantity is based on product threshold

### 8.2 Manage Shopping List
- [ ] Owner can add products to shopping list
- [ ] Owner can set quantity needed for each item
- [ ] Owner can edit quantities
- [ ] Owner can mark items as "ordered"
- [ ] Owner can remove items from shopping list
- [ ] Shopping list persists after page refresh
- [ ] Ordered items show visual distinction

### 8.3 Shopping List Integration
- [ ] Shopping list suggests products below threshold
- [ ] Shopping list can be exported
- [ ] Shopping list can be printed

---

## 9. SALES PERSISTENCE & DATABASE

### 9.1 Data Persistence
- [ ] All sales transactions are saved to database
- [ ] All products are persisted
- [ ] All customers are persisted
- [ ] All expenses are persisted
- [ ] All shopping list items are persisted
- [ ] Data survives page refreshes
- [ ] Data is maintained across sessions

### 9.2 Stock Tracking
- [ ] Product batches with expiry dates are stored
- [ ] Stock calculations use FIFO method with expiry dates
- [ ] Expired stock can be identified/marked
- [ ] Stock history is maintained for auditing

### 9.3 Audit Trail
- [ ] Sales include timestamp and cashier information
- [ ] Expenses include timestamp
- [ ] All transactions can be audited by date

---

## 10. RECEIPT GENERATION & PRINTING

### 10.1 Receipt Display
- [ ] Receipt displays after sale completion
- [ ] Receipt shows all sale items with quantity and price
- [ ] Receipt shows total amount
- [ ] Receipt shows payment method and nominal
- [ ] Receipt shows transaction date/time
- [ ] Receipt shows customer type

### 10.2 Receipt Export
- [ ] Receipt can be downloaded as image
- [ ] Receipt can be printed to physical printer
- [ ] Receipt formatting is readable and professional
- [ ] Receipt includes business name/information

---

## 11. ERROR HANDLING & VALIDATION

### 11.1 Input Validation
- [ ] Empty required fields are rejected
- [ ] Invalid numeric inputs are rejected
- [ ] Invalid email format is rejected
- [ ] Duplicate SKU creation is prevented
- [ ] Negative numbers are rejected where inappropriate
- [ ] Error messages are clear and actionable

### 11.2 Error Messages
- [ ] Validation errors display clearly
- [ ] Error messages suggest solutions
- [ ] Success messages confirm actions
- [ ] Warning toasts appear for important info
- [ ] Error toasts appear for failures

### 11.3 Network Error Handling
- [ ] Offline state is detected
- [ ] Retry functionality appears for failed requests
- [ ] Stale data is handled gracefully
- [ ] Loading states appear during async operations

---

## 12. PERFORMANCE & RESPONSIVENESS

### 12.1 Load Times
- [ ] Dashboard loads within acceptable time
- [ ] Product list loads quickly (with many products)
- [ ] Reports load within acceptable time
- [ ] Search/filter operations are responsive
- [ ] Sale recording is responsive

### 12.2 Responsiveness
- [ ] App is responsive on desktop screens
- [ ] App is usable on tablet screens
- [ ] Mobile experience is functional (if supported)
- [ ] Tables scroll horizontally on small screens
- [ ] Dialogs are readable on small screens
- [ ] Buttons are clickable on touch devices

### 12.3 Browser Compatibility
- [ ] Chrome works correctly
- [ ] Firefox works correctly
- [ ] Safari works correctly
- [ ] Edge works correctly

---

## 13. STATE MANAGEMENT & CACHING

### 13.1 React Query Integration
- [ ] Data queries use React Query
- [ ] Queries are cached appropriately
- [ ] Mutations trigger cache invalidation
- [ ] Stale data is refetched correctly
- [ ] Loading states work as expected
- [ ] Error states work as expected

### 13.2 Local Storage
- [ ] Product stock is cached in local storage
- [ ] Stock caches are invalidated on sales
- [ ] Stock caches survive page refreshes
- [ ] Local storage doesn't cause stale data issues

---

## 14. SECURITY

### 14.1 Authentication Security
- [ ] Passwords are not displayed in UI
- [ ] Sessions expire after inactivity
- [ ] Authentication tokens are secure
- [ ] User cannot bypass login
- [ ] User cannot access protected routes without auth

### 14.2 Role-Based Access Control
- [ ] Cashier cannot perform admin actions
- [ ] Cashier cannot access restricted pages
- [ ] Owner can perform all actions
- [ ] Database policies enforce access control on backend

### 14.3 Data Protection
- [ ] Sensitive data is not logged to console
- [ ] API calls use HTTPS (in production)
- [ ] Database credentials are not exposed
- [ ] User data is not displayed to other users

---

## 15. UI/UX & USABILITY

### 15.1 Navigation
- [ ] Navigation menu is clear and intuitive
- [ ] All navigation links are functional
- [ ] Breadcrumbs display correctly (if implemented)
- [ ] Back buttons work appropriately
- [ ] URL changes reflect page navigation

### 15.2 Form Experience
- [ ] Form fields have proper labels
- [ ] Form fields show placeholders (if applicable)
- [ ] Form validation is real-time where appropriate
- [ ] Form submission is clear (distinct button)
- [ ] Form cancellation works
- [ ] Required fields are marked

### 15.3 Search & Filter
- [ ] Search boxes are prominent and easy to find
- [ ] Search results are accurate and relevant
- [ ] Filters are easy to understand
- [ ] Filter combinations work correctly
- [ ] Clear/reset filters button works

### 15.4 Visual Design
- [ ] Color scheme is consistent
- [ ] Icons are clear and intuitive
- [ ] Font sizes are readable
- [ ] Contrast meets accessibility standards
- [ ] Dark mode works (if applicable)

### 15.5 Accessibility
- [ ] Keyboard navigation works throughout app
- [ ] Tab order is logical
- [ ] Screen reader support is functional
- [ ] ARIA labels are present where needed
- [ ] Focus indicators are visible

---

## 16. EDGE CASES & BOUNDARY CONDITIONS

### 16.1 Empty States
- [ ] Empty product list shows helpful message
- [ ] Empty customer list shows helpful message
- [ ] Empty shopping list shows helpful message
- [ ] Empty sales report shows helpful message
- [ ] Add buttons appear even when no data exists

### 16.2 Large Data Sets
- [ ] Product list performs with 1000+ products
- [ ] Sales list performs with 10000+ transactions
- [ ] Customer list performs with 1000+ customers
- [ ] Search/filter remains responsive with large data

### 16.3 Concurrent Operations
- [ ] Two simultaneous sales don't cause data corruption
- [ ] Concurrent edits don't cause conflicts
- [ ] Last write wins appropriately

### 16.4 Boundary Values
- [ ] Maximum product price is handled
- [ ] Minimum product price (0) is validated
- [ ] Maximum quantity per sale is handled
- [ ] Minimum quantity (1) is validated
- [ ] Maximum stock quantity is handled

---

## 17. INTEGRATIONS & THIRD-PARTY SERVICES

### 17.1 Supabase Integration
- [ ] Database connections are stable
- [ ] Realtime features work (if implemented)
- [ ] Row level security policies are enforced
- [ ] Authentication through Supabase works

### 17.2 External APIs (if applicable)
- [ ] Payment gateway integration works (if implemented)
- [ ] SMS notifications work (if implemented)
- [ ] Email notifications work (if implemented)

---

## 18. BATCH/BULK OPERATIONS

### 18.1 Product Batch Management
- [ ] Batches with expiry dates are tracked
- [ ] FIFO depletion works correctly
- [ ] Expired batches can be identified
- [ ] Multiple batches per product work correctly

### 18.2 Stock Adjustments
- [ ] Stock can be manually adjusted (if feature exists)
- [ ] Stock adjustments are logged
- [ ] Stock adjustments don't cause negative stock

---

## 19. NOTIFICATIONS & ALERTS

### 19.1 Toast Notifications
- [ ] Success toasts appear for successful actions
- [ ] Error toasts appear for failures
- [ ] Warning toasts appear for important information
- [ ] Info toasts appear for general information
- [ ] Notifications auto-dismiss appropriately
- [ ] Notification content is readable and clear

### 19.2 Low Stock Alerts
- [ ] Low stock alerts appear on dashboard
- [ ] Low stock alerts appear in product list
- [ ] Low stock threshold is configurable per product
- [ ] Alerts trigger at correct threshold

---


## TESTING EXECUTION LOG

Use this section to log your test execution:

| Test ID | Test Name | Status | Date | Notes |
|---------|-----------|--------|------|-------|
| 1.1.1 | User can access login page | ☐ | | |
| 1.1.2 | Valid credentials login | ☐ | | |
| 1.2.1 | Owner access all pages | ☐ | | |
| 1.2.2 | Cashier limited access | ☐ | | |
| ... | ... | ... | ... | ... |

---

## NOTES & OBSERVATIONS

Use this section to record general observations, bugs found, or areas needing attention:

- 
- 
- 

---

## Sign-Off

- **Tester Name**: ___________________
- **Testing Date**: ___________________
- **Overall Status**: ☐ PASS ☐ FAIL ☐ PARTIAL
- **Critical Issues**: ___________________
- **Recommendation**: ___________________
