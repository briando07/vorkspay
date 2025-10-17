
Vorkspay - Simulated full gateway (for testing only)
This package includes:
- Frontend: React (Vite) with pages: login, register, dashboard, marketplace, product checkout, create product, withdraw, admin panels (withdraw & users).
- Backend: Express with endpoints for auth, products, checkout (Mercado Pago sandbox), withdrawals, admin management.

Important: This is a simulation. No real automated payouts are executed. Use only in testing.

Local run:
1. docker-compose up --build
2. Visit http://localhost:3333 (API) and frontend served at same port.
3. Call GET /migrate to create DB tables.
4. Create a user via register, then approve that user via Admin -> Usuários (use admin account defined by ADMIN_EMAIL in .env.example).

Notes:
- Admin account: email set in backend/.env.example (ADMIN_EMAIL). You'll need to manually create that user and promote/approve it or change DB directly.
- Fee defaults to 5.99% + R$2 (configurable per merchant in admin).
