# Calibrate

A calorie tracker application, because I've gotten into healthier eating, jogging, and calisthenics.

Currently building out the backend as an Express.js app with clean architecture layering to decouple business logic from particular technology choices. Will use the backend to explore/practice various backend topics.

# Setup for Running Locally

1. Install PostgreSQL if needed.
   [Official installers here](https://www.postgresql.org/download/), [instructions on how to use them here](https://www.enterprisedb.com/docs/supported-open-source/postgresql/installing/).
   If you are installing PostgreSQL for the first time with an installer, it likely will ask you
   to set a superuser password, and a port number for the PostgreSQL server to listen for incoming connections. Note them.

2. Add a `.env` file to the project root. Set the following environment variables in it as strings, to the correct values. If you just installed PostgreSQL for the first time, the `DB_NAME` and `DB_USER` are "postgres".

```
DB_NAME="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD=""
```

3. Run `npm ci` in the project root.

4. Run `npm run kysely migrate:latest`. Documentation for kysely's CLI [here](https://github.com/kysely-org/kysely-ctl), see "Project-scoped installation", as it is not installed globally.

5. Run `npm run dev`.
