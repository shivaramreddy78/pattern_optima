from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    accent_color = Column(String, default="blue")
    theme = Column(String, default="dark")
    language = Column(String, default="en")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    jobs = relationship("NestingJob", back_populates="user", cascade="all, delete-orphan")
    uploads = relationship("Upload", back_populates="user", cascade="all, delete-orphan")

class NestingJob(Base):
    __tablename__ = "nesting_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, default="Fabric Nesting Project")
    
    # Input Sheet Specifications
    fabric_width = Column(Float, nullable=False)
    fabric_height = Column(Float, nullable=True) # If continuous sheet, height is variable
    
    # Input Shapes and Output Layout
    original_shapes = Column(JSON, nullable=False) # JSON list of shape polygons e.g. [{"id": "shirt", "points": [[x1, y1], ...]}]
    optimized_layout = Column(JSON, nullable=True) # JSON list of placed shapes e.g. [{"id": "shirt", "x": x, "y": y, "rotation": r, "points": [...]}]
    
    # Results Metrics
    status = Column(String, default="pending") # pending, completed, failed
    utilization_percentage = Column(Float, nullable=True)
    waste_percentage = Column(Float, nullable=True)
    saved_area = Column(Float, default=0.0)
    saved_money = Column(Float, default=0.0)
    algorithm_used = Column(String, default="Skyline Pack")
    processing_time = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="jobs")

class Upload(Base):
    __tablename__ = "uploads"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    upload_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="completed")
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="uploads")
