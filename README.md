# PATTERN OPTIMA 🚀
### AI-Powered Smart 2D Fabric Nesting Platform for MSMEs

**PATTERN OPTIMA** is a modern, premium, enterprise-grade SaaS web application built to help garment manufacturers, textile industries, and tailoring businesses minimize fabric waste. By replacing manual layout arrangements with heuristic-based 2D bin packing models and local contour compactions, Pattern Optima yields a **90-95% fabric utilization rate** (reducing waste by up to 10% on average).

---

## 🌟 Core Features

- **Procedural 3D Landing Page**: Silk fabric deformation simulation using Three.js, React Three Fiber, and custom vertex math.
- **AI Nesting Simulator (Sandbox)**: Interactive control panels allowing manufacturers to adjust roll width, select packing heuristics, adjust quantities, and visualize sliding compaction in real-time.
- **Compaction Algorithm**: Blends standard rectangular bin-packing (`rectpack`) with polygonal intersection offsets (`shapely` and `pyclipper`), sliding shapes (like sleeves and collars) inside hollow contours to reduce yardage waste.
- **Enterprise Analytics Dashboard**: Analytical charts (fabric utilization trends, algorithm popularity) using Recharts, plus statistical trackers representing aggregate material/financial savings.
- **Secure Access Control**: Local JWT registration and login validation.

---

## 🛠 Tech Stack

- **Frontend**: React 19, Next.js 15 (App Router), TypeScript, TailwindCSS, Framer Motion, Three.js (React Three Fiber, Drei), Recharts, Axios, Lucide Icons.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy ORM, Uvicorn.
- **Database**: SQLite (portable local default) / PostgreSQL configured.
- **Optimization Libraries**: Rectpack (C-based 2D packing wrapper), Shapely (planar geometry & intersection models), PyClipper (polygon offset buffering).
- **Deployment**: Docker & Docker Compose.

---

## 📁 Repository Structure

```
pattern-optima/
├── docker-compose.yml       # Docker orchestrator
├── README.md                # Documentation guide
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI Entry point
│   │   ├── core/            # Configuration & JWT utilities
│   │   ├── db/              # SQLAlchemy session initialization
│   │   ├── models/          # User & NestingJob DB entities
│   │   ├── schemas/         # Pydantic validation structures
│   │   ├── api/             # Router endpoints (auth, nesting, stats)
│   │   └── services/        # Nesting compaction engine math
│   ├── tests/               # Pytest suite
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── Dockerfile
    └── src/
        ├── app/             # Page router layout, login, dashboard
        ├── components/      # UI components (Canvas3D, NestingVisualizer, Recharts)
        └── lib/             # Axios client configuration
```

---

## 🚀 Getting Started

You can run Pattern Optima either using **Docker Compose** (recommended for full stack integration) or by running **standalone services** locally.

### Method 1: Using Docker Compose (Full Stack)

Ensure you have Docker and Docker Compose installed:
```bash
# Build and run containers
docker-compose up --build
```
- Open [http://localhost:3000](http://localhost:3000) for the Next.js Frontend.
- Open [http://localhost:8000/docs](http://localhost:8000/docs) for the backend Swagger API documentation.

---

### Method 2: Running Standalone Services

#### 1. Setup the Python Backend
Ensure you have Python 3.11+ installed.
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Start local dev server
uvicorn app.main:app --reload --port 8000
```

#### 2. Run Backend Tests
Ensure the nesting math engine completes bounding overlaps and utilization reports cleanly:
```bash
# Inside backend folder with active virtual env:
pytest tests/
```

#### 3. Setup the Next.js Frontend
Ensure you have Node.js 20+ installed.
```bash
# Navigate to frontend
cd frontend

# Install package dependencies
npm install --legacy-peer-deps

# Start frontend development dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ How the Nesting Engine Works (AI Compaction)

Irregular pattern pieces (sleeves, collars, body panels) are passed to the nesting engine.
1. The engine calculates the **Axis-Aligned Bounding Box (AABB)** for each pattern piece, including rotation orientations (0° and 90°).
2. It uses `rectpack` (Skyline/Guillotine/Shelf) to arrange bounding boxes on a virtual roll of width `W` and infinite length. This solves the initial bin allocation.
3. Next, the engine sorts shapes from left to right and executes an **Iterative Slide Compaction**:
   - Each shape is converted into a `shapely.geometry.Polygon`.
   - The engine shifts the polygon leftwards and downwards in small step intervals.
   - For every shift, it checks if the shape intersects with any already-placed shapes (padded with a safe nesting margin buffer using `pyclipper`).
   - If no intersection occurs, the shape shifts further, allowing curved parts (like neck collar curves) to tightly lock together, significantly cutting fabric waste compared to manual bounding-box layouts.
4. Finally, the engine calculates the resulting fabric roll height, computes utilization percentages, and returns optimized coordinates to the UI visualizer.
