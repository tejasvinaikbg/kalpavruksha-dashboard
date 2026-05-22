# Kalpavruksha Dashboard

Mobile-friendly dashboard and inventory application for tracking day-to-day tender coconut cart sales, cart stock, employee handling, locations, reports, and inventory movement.

## Tech Stack

### Frontend

- Next.js
- TypeScript
- TailwindCSS
- Apollo Client for GraphQL API communication

### Backend

- Node.js
- Express
- TypeScript
- GraphQL
- MongoDB with Mongoose

## Project Structure

```text
kalpavruksha-dashboard/
  web/                 # Next.js frontend
  api/                 # Express GraphQL backend
  .github/workflows/   # CI workflows
```

The frontend and backend are intentionally separate so they can be deployed independently later.

## Planned Phases

### Phase 0: Foundation

- Create separate `web` and `api` applications.
- Configure TypeScript for both applications.
- Configure TailwindCSS for the frontend.
- Configure Express, GraphQL, CORS, environment variables, and MongoDB connection for the backend.
- Add a frontend Apollo provider and health check that calls the backend GraphQL API.
- Add initial GitHub Actions CI for build and type checks.

### Phase 1: Cart Management POC

- Admin login.
- Seed or manage 8 vending carts.
- Manage employees and locations.
- Create and edit daily cart entries.
- Enforce one entry per cart per day.
- Calculate stock, sales, cash, online, discounts, and total amount.

Implemented in the current POC:

- Environment-based admin login with JWT.
- Protected GraphQL queries and mutations.
- Mongoose models for users, carts, employees, locations, and cart day entries.
- Automatic initial seed for 8 carts, sample employees, and sample locations when MongoDB connects.
- Unique cart/day rule through a compound MongoDB index.
- Backend calculations for available stock, total sold, expected closing, cash amount, online amount, total amount, and mismatch warning.
- Frontend login, cart list, and cart day entry form using Apollo GraphQL.
- Closing stock is auto-calculated as `opening stock + restock - sales - damaged stock`.
- Desktop admin navigation uses a side menu; mobile navigation uses a hamburger menu.
- Cart management supports create, update, and soft delete.
- Location management supports create, update, and soft delete.
- Employee management supports create, update, soft delete, and date-wise attendance.
- Cart day entry save auto-marks the selected employee as present for that date.

### Phase 2: Excel Reports

- Daily reports.
- Monthly reports.
- Filters by cart, employee, location, and date range.
- Excel export matching the operating report format.

### Phase 3: Inventory

- Track daily inventory purchases.
- Deduct cart restocks automatically.
- Adjust inventory by difference when cart entries are edited.
- Maintain an inventory ledger for auditability.

### Phase 4: Employee Attendance

- Add employee attendance management.
- Auto-mark attendance when an employee handles a cart entry for the day.

### Phase 5: Dashboard Metrics

- Daily and monthly sales.
- Cash vs online collection.
- Cart-wise performance.
- Employee-wise performance.
- Damaged stock.
- Inventory balance.

### Phase 6: CI/CD and Deployment

- Expand GitHub Actions.
- Deploy frontend and backend separately.
- Support EC2 or another free/low-cost host.

## Local Development

### Prerequisites

- Node.js 20 or newer
- npm
- Local MongoDB, or a MongoDB Atlas connection string

### Backend Setup

```bash
cd api
cp .env.example .env
npm install
npm run dev
```

The API runs on:

```text
http://localhost:4000/graphql
```

Try this GraphQL query:

```graphql
query {
  health
}
```

Admin login mutation:

```graphql
mutation {
  login(username: "admin", password: "admin123") {
    token
    user {
      username
      role
    }
  }
}
```

After login, use the returned token as a bearer token for protected queries and mutations.

### MongoDB Atlas Setup

Create a free Atlas database, create a database user, add your current IP address to the Atlas IP access list, and copy the Node.js driver connection string.

Set `api/.env`:

```env
MONGODB_URI=mongodb+srv://<db-user>:<db-password>@<cluster-host>/kalpavruksha-dashboard?retryWrites=true&w=majority&appName=kalpavruksha-dashboard
```

Then verify the connection and seed data:

```bash
cd api
npm run db:check
```

Expected result:

```text
MongoDB connection successful
Carts: 8
Employees: 3
Locations: 3
```

Cart entry routes in the frontend:

```text
/login
/dashboard
/carts
/carts/[cartId]
/locations
/employees
```

### Frontend Setup

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

The dashboard page calls the backend health query and shows the API connection status.

Frontend data access should go through GraphQL using Apollo Client. REST endpoints should be limited to infrastructure-style checks only, such as the backend `/health` endpoint.

## Useful Commands

From `web/`:

```bash
npm run dev
npm run typecheck
npm run build
```

From `api/`:

```bash
npm run dev
npm run typecheck
npm run build
```

## Current Status

Phase 0 foundation is in place. The next milestone is Phase 1: Cart Management POC.
