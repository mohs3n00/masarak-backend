# Masarak Backend Application

## Description

The NestJS backend application for the Masarak platform.

## Core Technologies
- **Framework**: NestJS (v11)
- **Database**: PostgreSQL via Prisma ORM (hosted on Supabase)
- **Infrastructure Integrations**:
  - **Storage**: Cloudinary & Supabase
  - **Email**: Nodemailer (SMTP)
  - **SMS**: Twilio, Unifonic, Infobip (Abstraction Layer)
  - **Notifications**: Firebase Admin (FCM)
  - **Queueing**: BullMQ (Redis)
  - **Caching**: cache-manager (Redis)

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
