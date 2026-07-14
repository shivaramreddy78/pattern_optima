import time
import io
import os
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from jose import jwt, JWTError
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.models import User, NestingJob, Upload
from app.schemas.schemas import (
    NestingRequest, 
    NestingResponse, 
    NestingJobResponse, 
    NestingUploadRequest,
    ShapeInput
)
from app.services import nesting_engine
from app.services.geometry_extractor import extract_pattern_polygons
from app.services.report_generator import (
    generate_svg_layout,
    generate_png_preview,
    generate_pdf_report,
    generate_csv_statistics,
    generate_dxf_layout
)
from app.core.config import settings
from app.api.endpoints.auth import get_current_user

router = APIRouter()

# Optional user auth dependency
def get_optional_user(
    authorization: Optional[str] = Header(None), 
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email:
            return db.query(User).filter(User.email == email).first()
    except (JWTError, IndexError):
        return None
    return None

@router.post("/optimize", response_model=NestingResponse)
def optimize_patterns(
    request: NestingRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Fallback Sandbox endpoint (runs standard sandbox shapes optimization)."""
    start_time = time.time()
    try:
        result = nesting_engine.run_nesting(
            fabric_width=request.fabric_width,
            fabric_height=request.fabric_height,
            shapes_input=request.shapes,
            algorithm=request.algorithm,
            margin=request.margin
        )
        duration = time.time() - start_time
        result["processing_time"] = duration
        
        req_shapes_json = [shape.model_dump() for shape in request.shapes]

        job = NestingJob(
            user_id=current_user.id if current_user else None,
            name=f"Nesting Sandbox ({request.algorithm})",
            fabric_width=request.fabric_width,
            fabric_height=result["fabric_height"],
            original_shapes=req_shapes_json,
            optimized_layout=result["optimized_layout"],
            status="completed",
            utilization_percentage=result["utilization_percentage"],
            waste_percentage=result["waste_percentage"],
            saved_area=result["saved_area"],
            saved_money=result["saved_money"],
            algorithm_used=result["algorithm_used"],
            processing_time=duration
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        result["job_id"] = job.id
        return result
    except Exception as e:
        if current_user:
            req_shapes_json = [shape.model_dump() for shape in request.shapes]
            job = NestingJob(
                user_id=current_user.id,
                name=f"Nesting Sandbox ({request.algorithm}) - Failed",
                fabric_width=request.fabric_width,
                original_shapes=req_shapes_json,
                status="failed",
                algorithm_used=request.algorithm,
                processing_time=0.0
            )
            db.add(job)
            db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Optimization failed: {str(e)}"
        )

@router.post("/optimize-uploads", response_model=NestingResponse)
def optimize_uploads(
    request: NestingUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Processes uploaded SVGs/DXFs/PDFs, normalizes geometry, and runs AI Nesting."""
    start_time = time.time()
    
    shapes_input: List[ShapeInput] = []
    
    for upload_id in request.upload_ids:
        # Fetch file metadata from DB
        upload = db.query(Upload).filter(
            Upload.id == upload_id,
            Upload.user_id == current_user.id
        ).first()
        
        if not upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pattern upload Ref #{upload_id} not found."
            )
            
        filepath = os.path.join("./uploads", upload.filename)
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {upload.original_filename} is missing from disk storage."
            )
            
        # Extract polygon contours
        polygons = extract_pattern_polygons(filepath, upload.file_type)
        
        # Determine quantity
        qty = request.quantities.get(upload_id, 1)
        
        # Add polygons to nested shapes inputs list
        for poly_idx, poly_points in enumerate(polygons):
            shapes_input.append(
                ShapeInput(
                    id=f"{upload.original_filename.split('.')[0]}_{poly_idx}",
                    points=poly_points,
                    quantity=qty,
                    allow_rotation=True
                )
            )

    if not shapes_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid shapes or coordinate structures could be extracted."
        )

    try:
        # Run compaction nesting solver
        result = nesting_engine.run_nesting(
            fabric_width=request.fabric_width,
            fabric_height=request.fabric_height,
            shapes_input=shapes_input,
            algorithm=request.algorithm,
            margin=request.margin
        )
        
        duration = time.time() - start_time
        result["processing_time"] = duration

        # Serialize request shapes for logs
        req_shapes_json = [shape.model_dump() for shape in shapes_input]

        job = NestingJob(
            user_id=current_user.id,
            name=f"Batch Nesting ({request.algorithm})",
            fabric_width=request.fabric_width,
            fabric_height=result["fabric_height"],
            original_shapes=req_shapes_json,
            optimized_layout=result["optimized_layout"],
            status="completed",
            utilization_percentage=result["utilization_percentage"],
            waste_percentage=result["waste_percentage"],
            saved_area=result["saved_area"],
            saved_money=result["saved_money"],
            algorithm_used=result["algorithm_used"],
            processing_time=duration
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        result["job_id"] = job.id
        return result
    except Exception as e:
        req_shapes_json = [shape.model_dump() for shape in shapes_input]
        job = NestingJob(
            user_id=current_user.id,
            name=f"Batch Nesting ({request.algorithm}) - Failed",
            fabric_width=request.fabric_width,
            original_shapes=req_shapes_json,
            status="failed",
            algorithm_used=request.algorithm,
            processing_time=0.0
        )
        db.add(job)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Nesting compaction crashed: {str(e)}"
        )

@router.get("/jobs", response_model=List[NestingJobResponse])
def get_jobs_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve historical optimization jobs logs."""
    return db.query(NestingJob).filter(
        NestingJob.user_id == current_user.id
    ).order_by(NestingJob.created_at.desc()).all()

@router.get("/jobs/{job_id}", response_model=NestingJobResponse)
def get_job_detail(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve a single optimization job detail."""
    job = db.query(NestingJob).filter(
        NestingJob.id == job_id,
        NestingJob.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job record not found.")
    return job

@router.delete("/jobs/{job_id}", status_code=status.HTTP_200_OK)
def delete_job_history(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a nesting optimization log."""
    job = db.query(NestingJob).filter(
        NestingJob.id == job_id,
        NestingJob.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job record not found.")
    db.delete(job)
    db.commit()
    return {"detail": "Job history log deleted successfully."}

@router.get("/jobs/{job_id}/download/{file_format}")
def download_nesting_report(
    job_id: int,
    file_format: str,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generates and streams nesting output layouts as PDF, SVG, PNG, or CSV downloads."""
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required.")
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    job = db.query(NestingJob).filter(
        NestingJob.id == job_id,
        NestingJob.user_id == user.id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job record not found.")
        
    file_format = file_format.lower().strip()
    
    if file_format == 'svg':
        svg_content = generate_svg_layout(job.fabric_width, job.fabric_height, job.optimized_layout or [])
        return StreamingResponse(
            io.BytesIO(svg_content.encode("utf-8")),
            media_type="image/svg+xml",
            headers={"Content-Disposition": f"attachment; filename=nesting_layout_{job_id}.svg"}
        )
        
    elif file_format == 'png':
        png_bytes = generate_png_preview(job.fabric_width, job.fabric_height, job.optimized_layout or [])
        return StreamingResponse(
            io.BytesIO(png_bytes),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename=nesting_layout_{job_id}.png"}
        )
        
    elif file_format == 'csv':
        csv_content = generate_csv_statistics(job)
        return StreamingResponse(
            io.BytesIO(csv_content.encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=nesting_metrics_{job_id}.csv"}
        )
        
    elif file_format == 'pdf':
        pdf_bytes = generate_pdf_report(job)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=nesting_report_{job_id}.pdf"}
        )
        
    elif file_format == 'dxf':
        dxf_content = generate_dxf_layout(job.fabric_width, job.fabric_height, job.optimized_layout or [])
        return StreamingResponse(
            io.BytesIO(dxf_content.encode("utf-8")),
            media_type="application/dxf",
            headers={"Content-Disposition": f"attachment; filename=nesting_layout_{job_id}.dxf"}
        )
        
    else:
        raise HTTPException(status_code=400, detail="Invalid download format. Supported: pdf, svg, dxf, png, csv")

@router.get("/presets", response_model=List[Dict[str, Any]])
def get_presets():
    """Return standard demo pattern pieces (sleeves, collar, body panels)."""
    return nesting_engine.get_demo_patterns()
