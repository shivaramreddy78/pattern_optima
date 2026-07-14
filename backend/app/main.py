import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.endpoints import auth, nesting, jobs, uploads
from app.db.session import engine, Base
import mimetypes
mimetypes.init()
mimetypes.add_type('application/pdf', '.pdf')
mimetypes.add_type('image/svg+xml', '.svg')

# Create tables in SQLite on application boot (for local standalone deployment)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Powered Smart 2D Fabric Nesting Platform - Core API Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    for error in exc.errors():
        # Check if the validation error is related to an email field
        if 'email' in error.get('loc', []) or 'email' in str(error.get('type', '')):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Please enter a valid email address."}
            )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# Mount static uploads directory for preview images/PDFs
os.makedirs("uploads", exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(nesting.router, prefix=f"{settings.API_V1_STR}/nesting", tags=["Nesting Engine"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["Dashboard Jobs"])
app.include_router(uploads.router, prefix=f"{settings.API_V1_STR}/uploads", tags=["Pattern Uploads"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app_name": settings.PROJECT_NAME,
        "api_v1_docs": "/docs",
        "nesting_engine_status": "ready"
    }
