# Auth API

A production-ready, robust Authentication and User Management RESTful API built with **NestJS**, **Prisma ORM**, **PostgreSQL**, **Passport.js**, and **JWT**.

This project implements modern security best practices, including short-lived JWT access tokens, long-lived refresh tokens with SHA-256 database hashing, atomic single-use token rotation, concurrency protection, and strict payload validation.

---

## 🌟 Key Features

- **🔐 Dual-Token Authentication**: Issues short-lived access tokens (15m) alongside long-lived refresh tokens (7d).
- **🛡️ Refresh Token Rotation & Invalidation**: Single-use refresh tokens rotated atomically inside database transactions, with protection against token reuse and race conditions.
- **🔒 Hashed Token Storage**: Refresh tokens are stored as SHA-256 hashes in PostgreSQL to prevent exposure in case of database leaks.
- **👤 User Management**: User registration with email uniqueness validation, strong password requirements, and 12-round `bcrypt` password hashing.
- **🛡️ Guarded Routes**: Passport JWT Bearer token strategy protecting authenticated endpoints (e.g., `GET /users/me`).
- **⚙️ Strict Input Validation**: Global NestJS validation pipes configured with `whitelist: true`, `forbidNonWhitelisted: true`, and automatic type transformation.
- **🗄️ Modern Database Architecture**: Powered by Prisma ORM 7 with `@prisma/adapter-pg` driver adapter.
- **🐳 Dockerized Database**: Pre-configured Docker Compose setup for PostgreSQL 17 Alpine.
- **🧪 Comprehensive Test Suite**: 100% automated End-to-End (E2E) test coverage for authentication flows, edge cases, timing attacks, and token rotation.

---

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (v11)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (v5)
- **Runtime**: [Node.js](https://nodejs.org/) (v20+)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Database**: [PostgreSQL 17](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/) (v7) with `@prisma/adapter-pg`
- **Authentication & Security**:
  - `@nestjs/jwt` & `passport-jwt`
  - `bcrypt` (password hashing)
  - Node.js native `crypto` (SHA-256 refresh token hashing & UUID generation)
- **Validation**: `class-validator` & `class-transformer`
- **Testing**: [Jest](https://jestjs.io/) & [Supertest](https://github.com/ladjs/supertest)

---

## 📁 Project Structure

```text
auth-api/
├── prisma/
│   ├── migrations/            # SQL migration history
│   └── schema.prisma          # Prisma schema definition (User & RefreshToken)
├── src/
│   ├── config/                # Configuration modules
│   ├── modules/
│   │   ├── auth/              # Authentication module
│   │   │   ├── dto/           # Login & Refresh token DTOs
│   │   │   ├── guards/        # JwtAuthGuard
│   │   │   ├── strategies/    # Passport JWT Bearer strategy
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   └── auth.service.ts
│   │   └── users/             # Users module
│   │       ├── dto/           # CreateUserDto with class-validator
│   │       ├── types/         # AuthenticatedUser interface
│   │       ├── users.controller.ts
│   │       ├── users.module.ts
│   │       └── users.service.ts
│   ├── prisma/                # Prisma client service & lifecycle management
│   ├── app.module.ts          # Main root module
│   └── main.ts                # Application entrypoint & global pipes
├── test/                      # End-to-End (E2E) test suites
│   ├── auth.e2e-spec.ts       # Login, refresh token rotation, and guard tests
│   ├── users.e2e-spec.ts      # User registration & validation tests
│   └── jest-e2e.json          # E2E test runner configuration
├── docker-compose.yml         # PostgreSQL 17 Alpine service
├── prisma.config.ts           # Prisma CLI configuration
└── package.json
```

---

## 📋 Prerequisites

Before running this application, make sure you have installed:

- [Node.js](https://nodejs.org/) (v20.x or higher)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm` or `corepack enable`)
- [Docker](https://www.docker.com/) & Docker Compose (for running PostgreSQL)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/auth-api.git
cd auth-api
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Adjust the values in `.env` if necessary:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_api"
JWT_SECRET="your-super-secret-access-token-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"
```

| Variable             | Description                                                             | Default / Example                                        |
| :------------------- | :---------------------------------------------------------------------- | :------------------------------------------------------- |
| `PORT`               | Port number the HTTP server listens on                                  | `3000`                                                   |
| `DATABASE_URL`       | PostgreSQL connection string                                            | `postgresql://postgres:postgres@localhost:5432/auth_api` |
| `JWT_SECRET`         | Secret key used for signing & verifying short-lived access tokens (15m) | Random secure string                                     |
| `JWT_REFRESH_SECRET` | Secret key used for signing & verifying refresh tokens (7d)             | Random secure string                                     |

### 4. Start the Database

Run PostgreSQL in the background using Docker Compose:

```bash
docker compose up -d
```

### 5. Run Database Migrations

Apply database migrations and generate the Prisma Client:

```bash
pnpm dlx prisma migrate dev
```

### 6. Start the Application

```bash
# Development mode with hot-reload:
pnpm run start:dev

# Production mode:
pnpm run build
pnpm run start:prod
```

The API will be available at `http://localhost:3000`.

---

## 📖 API Documentation & Endpoints

### 1. Register User

Creates a new user account. Passwords must be at least 8 characters long and are hashed using `bcrypt` (12 rounds) before storage.

- **URL**: `/users`
- **Method**: `POST`
- **Auth Required**: No

#### Request Body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "strongPassword123"
}
```

#### Responses

- `201 Created`:
  ```json
  {
    "id": "b304c4f9-2b02-4ec4-9dfc-27a3c3e87d46",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "createdAt": "2026-10-19T14:00:00.000Z",
    "updatedAt": "2026-10-19T14:00:00.000Z"
  }
  ```
- `400 Bad Request`: Validation failure (short password, invalid email format, or extraneous unknown fields).
- `409 Conflict`: If the email address is already registered:
  ```json
  {
    "message": "Email already in use",
    "error": "Conflict",
    "statusCode": 409
  }
  ```

---

### 2. Login

Authenticates user credentials and returns both an access token and a refresh token.

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No

#### Request Body

```json
{
  "email": "jane@example.com",
  "password": "strongPassword123"
}
```

#### Responses

- `201 Created`:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- `401 Unauthorized`: Returned with a generic `"Invalid credentials"` message when the email does not exist or the password does not match (mitigating user enumeration attacks).

---

### 3. Refresh Access Token

Exchanges a valid refresh token for a brand new access token and a newly rotated refresh token. The used refresh token is invalidated immediately.

- **URL**: `/auth/refresh`
- **Method**: `POST`
- **Auth Required**: No (requires valid `refreshToken` in body)

#### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Responses

- `201 Created`:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- `401 Unauthorized`: Token is invalid, expired, revoked, or has already been used.

---

### 4. Get Current User Profile

Retrieves the currently authenticated user's information extracted from the JWT access token payload.

- **URL**: `/users/me`
- **Method**: `GET`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Request Headers

```http
Authorization: Bearer <accessToken>
```

#### Responses

- `200 OK`:
  ```json
  {
    "id": "b304c4f9-2b02-4ec4-9dfc-27a3c3e87d46",
    "email": "jane@example.com"
  }
  ```
- `401 Unauthorized`: Missing, expired, or malformed Bearer token.

---

## 🔒 Security Highlights

### Token Rotation & Single-Use Enforcement

When a refresh token is presented to `/auth/refresh`:

1. The token signature and expiration are verified using `JWT_REFRESH_SECRET`.
2. The incoming token is hashed with SHA-256 and matched against unexpired records in the `RefreshToken` database table.
3. The previous token is deleted and the new token is created **atomically inside a Prisma transaction** (`prisma.$transaction`).
4. If a token is reused or concurrent requests attempt to reuse the same refresh token, only one succeeds and the other receives a `401 Unauthorized`.

### Hashed Refresh Tokens

Raw refresh tokens are never stored in the database. Instead, only a SHA-256 hash (`tokenHash`) is persisted. If the database is ever compromised, the stored hashes cannot be directly used as bearer tokens.

### Strict Validation & Whitelisting

Global validation pipes enforce:

- `whitelist: true`: Automatically strips properties that do not have decorators in the DTO.
- `forbidNonWhitelisted: true`: Halts execution with `400 Bad Request` if unexpected fields are provided in the payload.
- `transform: true`: Automatically converts incoming payloads to their corresponding DTO classes.

---

## 🧪 Running Tests

The project includes unit and end-to-end tests validating business logic, security constraints, and database transactions:

```bash
# Run unit tests
pnpm run test

# Run End-to-End (E2E) tests
pnpm run test:e2e

# Run test coverage report
pnpm run test:cov
```

---

## 📜 Available NPM Scripts

| Script        | Command                                                                       | Description                             |
| :------------ | :---------------------------------------------------------------------------- | :-------------------------------------- |
| `build`       | `nest build`                                                                  | Compiles TypeScript code into `./dist`  |
| `start`       | `nest start`                                                                  | Starts the application                  |
| `start:dev`   | `nest start --watch`                                                          | Starts the application with live reload |
| `start:debug` | `nest start --debug --watch`                                                  | Starts the application in debug mode    |
| `start:prod`  | `node dist/main`                                                              | Starts compiled production server       |
| `lint`        | `eslint "{src,apps,libs,test}/**/*.ts" --fix`                                 | Runs ESLint and auto-fixes issues       |
| `format`      | `prettier --write "src/**/*.ts" "test/**/*.ts"`                               | Formats codebase using Prettier         |
| `test`        | `NODE_OPTIONS="--experimental-vm-modules" jest`                               | Executes unit tests                     |
| `test:e2e`    | `NODE_OPTIONS="--experimental-vm-modules" jest --config ./test/jest-e2e.json` | Executes E2E test suite                 |
| `test:cov`    | `NODE_OPTIONS="--experimental-vm-modules" jest --coverage`                    | Generates test coverage report          |

---

## 📄 License

This project is [UNLICENSED](LICENSE) / Private.
