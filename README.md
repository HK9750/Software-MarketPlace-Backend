# Software Marketplace Backend

This is the backend for the Software Marketplace platform, built with Node.js, Express, TypeScript, Prisma, and PostgreSQL. It supports user authentication, product management, subscriptions, analytics, notifications, orders, payment and more.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Seeding Admin User](#seeding-admin-user)
- [Running the Server](#running-the-server)
- [Available Scripts](#available-scripts)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Features

- User authentication (JWT, social login)
- Product and subscription management
- Order and payment processing
- Wishlist and cart functionality
- Reviews and ratings
- Notifications (with Bull queue)
- Analytics and dashboard endpoints
- Email activation and password reset
- Admin and seller roles

---

## Requirements

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) (v13+ recommended)
- [Redis](https://redis.io/) (for caching and Bull queue)
- [Cloudinary](https://cloudinary.com/) (for image uploads)
- SMTP credentials (for sending emails)

---

## Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
NODE_ENV=development
PORT=8000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL_UNPOOLED=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

ACTIVATION_EXPIRY=300
ACTIVATION_SECRET=your_activation_secret

JWT_REFRESH_SECRET_EXPIRY=1728000
JWT_REFRESH_SECRET=your_refresh_secret

JWT_ACCESS_SECRET_EXPIRY=86400
JWT_ACCESS_SECRET=your_access_secret

RESET_SECRET_EXPIRY=300
RESET_SECRET=your_reset_secret

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_SECRET_KEY=your_cloudinary_secret_key

SMTP_HOST=smtp.gmail.com
SMTP_SERVICE=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
SMTP_PORT=465

CLIENT_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

> **Note:** Replace all placeholder values with your actual credentials.

---

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/Software-MarketPlace-Backend.git
   cd Software-MarketPlace-Backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

---

## Database Setup

1. **Start PostgreSQL** and create a database for the project.

2. **Run Prisma migrations:**

   ```bash
   npx prisma migrate deploy
   # or for development
   npx prisma migrate dev
   ```

3. **Generate Prisma client:**

   ```bash
   npx prisma generate
   ```

---

## Redis Setup

- Make sure [Redis](https://redis.io/) is running locally or update `REDIS_URL` in your `.env` file to point to your Redis instance.

---

## Cloudinary Setup

- Create a [Cloudinary](https://cloudinary.com/) account and add your credentials to the `.env` file.

---

## Seeding Admin User

To create a default super admin user, run:

```bash
npm run seed
# or
yarn seed
```

This will create a user with:
- **Email:** `admin@gmail.com`
- **Username:** `superadmin`
- **Password:** `Abc!23`

---

## Running the Server

### Development

```bash
npm run dev
# or
yarn dev
```

### Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

The server will start on the port specified in your `.env` file (default: `8000`).

---

## Available Scripts

- `npm run dev` — Start server with hot-reloading (nodemon)
- `npm run build` — Compile TypeScript to JavaScript
- `npm start` — Start compiled server
- `npm run seed` — Seed the database with a super admin user
- `npx prisma studio` — Open Prisma Studio to browse your database

---

## API Endpoints

All routes are prefixed with `/api/v1/`.

- **Auth:** `/auth`
- **Profile:** `/profile`
- **Products:** `/products`
- **Categories:** `/categories`
- **Reviews:** `/reviews`
- **Wishlist:** `/wishlist`
- **Cart:** `/cart`
- **Orders:** `/orders`
- **Notifications:** `/notifications`
- **Subscriptions:** `/subscriptions`
- **Price History:** `/price-history`
- **Analytics:** `/analytics`
- **Dashboard:** `/dashboard`
- **Payments:** `/payments`
- **Licenses:** `/licenses`

> See the codebase for detailed route definitions and required authentication.

---

## Troubleshooting

- **Database connection errors:** Check your `DATABASE_URL` and ensure PostgreSQL is running.
- **Redis errors:** Ensure Redis is running and `REDIS_URL` is correct.
- **Cloudinary upload issues:** Verify your Cloudinary credentials.
- **Email sending issues:** Check SMTP credentials and allow less secure apps if using Gmail.
- **Port conflicts:** Change the `PORT` in your `.env` file.

---

## License

MIT

---

## Contact

For support, contact [support@codevault.com](mailto:support@codevault.com).