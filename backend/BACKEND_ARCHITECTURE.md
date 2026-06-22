# ServiceHub Backend Architecture

## Roles
- `user`: customer who books services
- `partner`: worker who handles assigned jobs
- `admin`: manages complete platform

## Route Groups
- `/api/auth`: register, login, get current user, bootstrap first admin
- `/api/bookings`: booking create/list/cancel and payment hooks
- `/api/services`: public service listing + admin CRUD
- `/api/partners`: public partner onboarding/list/status (legacy-compatible)
- `/api/partner`: authenticated partner self panel APIs
- `/api/admin`: authenticated admin panel APIs
- `/api/reviews`: review APIs

## Admin Panel API Responsibilities
- Dashboard metrics: users, partners, bookings, revenue
- Manage users: list and update roles
- Manage partners: list and approve/reject
- Manage bookings: list and status/progress overrides
- Manage services: create/update categories

## Partner Panel API Responsibilities
- Create/update own profile
- Mark availability and current location coords
- See assigned jobs
- Update progress (`on_the_way`, `arrived`, `service_started`, `completed`)

## Suggested Frontend Panels
- Admin dashboard page
- Admin bookings management page
- Admin partners verification page
- Admin users page
- Partner dashboard page
- Partner jobs page
- Partner profile/settings page

## Immediate Next Implementation
1. Add frontend pages for `/api/admin/*` and `/api/partner/*`
2. Add request validation middleware (Joi/Zod)
3. Add notification system (in-app + email/SMS)
4. Add payout and settlement models
5. Add audit logs for admin actions
