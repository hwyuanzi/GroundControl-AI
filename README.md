# GroundControl AI: Aviation Safety & Optimization Platform

> "Safety is not an accident. It is a result of structural analysis, proactive intelligence, and uncompromising vigilance."

GroundControl AI is an advanced research and analytics platform designed to visualize, analyze, and mitigate risks in airport ground operations. Born from a passion for aviation and data science, this project leverages machine learning and real-time simulation to address the growing complexities of runway incursions and taxiway congestion.

---

## The Mission & Context

### The Spark: Air Canada Express Flight 8646 (LGA)
On **March 22, 2026**, Air Canada Express Flight 8646 collided with an airport firefighting truck (ARFF) while landing at LaGuardia Airport (LGA). This tragic event, occurring during low-visibility conditions, highlighted a critical gap in ground surface situational awareness and communication.

As a software engineer and data analyst with a lifelong passion for the aviation industry, this incident served as a wake-up call. I envisioned a platform that could:
- **Democratize Safety Data**: Make complex NTSB and FAA ASIAS records accessible and navigable.
- **Predict Risk**: Use AI to identify "Hotspots" and calculate safety confidence scores for carriers and airports.
- **Optimize Ground Flow**: Reduce taxi-out times to minimize fuel waste, carbon emissions, and pilot fatigue.

GroundControl AI is my contribution toward a future where "zero incursions" isn't just a goal, but a structural reality.

---

## Getting Started

Follow these steps to launch the GroundControl AI environment on your local machine.

### Prerequisites
- **Python 3.10+** & **pipenv**
- **Node.js 18+** & **npm**
- **Docker** & **Docker Compose**

### 1. Database Initialization
GroundControl AI uses PostgreSQL with PostGIS for spatial analytics. Use Docker to spin up the database:
```bash
docker-compose up -d db
```

### 2. Backend Setup (FastAPI)
Navigate to the backend directory and install dependencies:
```bash
cd backend
pipenv install
```
Generate the required data and seed the database:
```bash
# Initialize schema and seed airport/airline/incursion data
pipenv run python main.py
```
Start the API server:
```bash
pipenv run uvicorn app.main:app --reload
```

### 3. Frontend Setup (Next.js)
In a new terminal window, navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## Features

- **Incursion Explorer**: Searchable database of thousands of safety records with AI-extracted root causes.
- **Airport & Airline Analytics**: Deep-dive safety profiles featuring Recharts visualizations and ML safety scores.
- **JFK AI Routing Sandbox**: A high-fidelity 2D simulation of John F. Kennedy International Airport (JFK) demonstrating AI vs. Rule-based taxi routing.
- **Global Hotspots**: Interactive map visualizing historic runway incursions globally.

---

## License

Distributed under the **Apache License 2.0**. See `LICENSE` for more information. This project is ideal for both research and commercial adaptation.

---

## Developed By

**Hollan (Haowen) Yuan**
*Software Engineer | Data Scientist | Aviation Enthusiast*

*"Aiming for safer skies, one node at a time."*
