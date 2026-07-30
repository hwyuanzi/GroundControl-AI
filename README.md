# GroundControl AI

GroundControl AI is a research/demo application for exploring airport, airline,
runway-incursion, taxi-routing, and surface-congestion data. It combines a
FastAPI API, PostgreSQL/PostGIS, and a Next.js frontend.

## Current functionality

- Search and filter airport, airline, and incursion records stored in PostgreSQL.
- View aggregate dashboard statistics and geolocated incident data.
- Run a client-side JFK taxi simulation.
- Query a simplified JFK taxiway graph and A*-based route optimizer.
- Generate a congestion estimate from a model trained on synthetic patterns.
- Optionally request live JFK-area aircraft positions from OpenSky.

This is an educational prototype, not an operational aviation-safety system.

## Prerequisites

- Python 3.12 and Pipenv
- Node.js 20.9 or newer and npm
- Docker with Docker Compose

## Local setup

Start PostgreSQL:

```bash
docker compose up -d db
```

Install and configure the backend:

```bash
cd backend
cp .env.example .env
PIPENV_VENV_IN_PROJECT=1 pipenv install --dev
```

Create the schema and load demo data. The first command downloads public airport
and airline datasets; the later commands generate synthetic taxi statistics and
incursion records.

```bash
pipenv run python -m app.data_pipeline.seed_airports
pipenv run python -m app.data_pipeline.seed_stats
pipenv run python -m app.data_pipeline.seed_incursions
```

Start the API from `backend/`:

```bash
pipenv run uvicorn main:app --reload
```

The API is available at `http://localhost:8000`; Swagger UI is at
`http://localhost:8000/api/docs`.

In another terminal, install and start the frontend:

```bash
cd frontend
npm ci
npm run dev
```

The application is available at `http://localhost:3000`.

## Environment variables

Backend variables are documented in `backend/.env.example`:

- `DATABASE_URL`: PostgreSQL connection URL.
- `ALLOWED_ORIGINS`: JSON array of allowed browser origins.
- `OPENSKY_USERNAME` and `OPENSKY_PASSWORD`: optional OpenSky credentials.

Frontend/server variables:

- `NEXT_PUBLIC_API_URL`: browser-visible API URL; defaults to
  `http://localhost:8000` and must be set when building for another host.
- `API_URL`: optional server-side API URL, useful when the frontend and API run
  on the same private container network.

## Tests and build

```bash
cd backend
PIPENV_VENV_IN_PROJECT=1 pipenv install --dev
pipenv run pytest -q

cd ../frontend
npm ci
npm run lint
npm run build
```

## Docker deployment

Build and start all services:

```bash
docker compose up --build -d
docker compose exec backend python -m app.data_pipeline.seed_airports
docker compose exec backend python -m app.data_pipeline.seed_stats
docker compose exec backend python -m app.data_pipeline.seed_incursions
```

For non-local deployment, set strong PostgreSQL credentials, set
`NEXT_PUBLIC_API_URL` before building the frontend image, set appropriate CORS
origins, and use managed schema migrations/backups rather than the demo seed
workflow.

## Known limitations

- Incursion and taxi-time seed data are synthetic demo data.
- Congestion predictions use synthetic training patterns and are not validated
  operational forecasts.
- Live aircraft data and taxi routing are currently limited to JFK; OpenSky
  availability and rate limits can cause empty results.
- The project does not yet include authentication, Alembic migrations, or a
  production deployment pipeline.

## License

Apache License 2.0. See `LICENSE`.
