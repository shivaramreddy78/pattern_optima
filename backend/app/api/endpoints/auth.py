import uuid
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import jwt, JWTError

from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserResponse, Token, UserBase, ForgotPasswordRequest, ResetPasswordRequest, UserLogin
from app.core import security
from app.core.config import settings

router = APIRouter()

# In-memory mapping of password reset tokens to user emails
PASSWORD_RESET_TOKENS: dict[str, str] = {}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login-form")

# Helper to verify token and fetch user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists."
        )
    
    hashed_pw = security.get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pw,
        full_name=user_in.full_name,
        company_name=user_in.company_name,
        mobile_number=user_in.mobile_number
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    """Standard API JSON login."""
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

from fastapi.security import OAuth2PasswordRequestForm
@router.post("/login-form", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password flow form login (for Swagger UI testing)."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No user registered with this email address."
        )
    
    # Generate unique reset token
    token = str(uuid.uuid4())
    PASSWORD_RESET_TOKENS[token] = request.email
    
    # Return mock token link for testing
    return {
        "detail": "Password reset link generated successfully.",
        "reset_token": token,
        "reset_url": f"http://localhost:3000/auth/reset-password?token={token}"
      }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    token = request.token
    if token not in PASSWORD_RESET_TOKENS:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired password reset token."
        )
    
    email = PASSWORD_RESET_TOKENS[token]
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User associated with this token not found."
        )
    
    # Update password
    hashed_pw = security.get_password_hash(request.new_password)
    user.hashed_password = hashed_pw
    db.commit()
    
    # Clean up token
    del PASSWORD_RESET_TOKENS[token]
    
    return {"detail": "Password has been successfully updated."}

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_in: UserBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if email is changing and if it is already taken
    if user_in.email != current_user.email:
        existing = db.query(User).filter(User.email == user_in.email).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="A user with this email address already exists."
            )
        current_user.email = user_in.email
        
    current_user.full_name = user_in.full_name
    current_user.company_name = user_in.company_name
    current_user.mobile_number = user_in.mobile_number
    if hasattr(user_in, 'accent_color'):
        current_user.accent_color = user_in.accent_color
    db.commit()
    db.refresh(current_user)
    return current_user

PROFILE_IMAGES_DIR = "./uploads/profile-images"
os.makedirs(PROFILE_IMAGES_DIR, exist_ok=True)

@router.post("/profile-image", response_model=UserResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploads a user profile image, validates parameters, and returns updated user profile."""
    # 1. Format/Extension Validation
    filename = file.filename or "avatar.png"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported profile image format. Supported formats: JPG, JPEG, PNG, WEBP"
        )
        
    # 2. File Size Validation (max 5 MB)
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Profile picture size exceeds 5MB limit."
        )
        
    # 3. Save File to disk
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex}.{ext}"
    dest_path = os.path.join(PROFILE_IMAGES_DIR, unique_filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write file to disk: {str(e)}"
        )
        
    # 4. Delete old file if present
    if current_user.profile_image:
        old_filename = current_user.profile_image.split("/")[-1]
        old_path = os.path.join(PROFILE_IMAGES_DIR, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass
                
    # 5. Update user database record
    current_user.profile_image = f"/static/uploads/profile-images/{unique_filename}"
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/profile-image", response_model=UserResponse)
def remove_profile_image(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes the active profile image and restores the default avatar."""
    if current_user.profile_image:
        filename = current_user.profile_image.split("/")[-1]
        file_path = os.path.join(PROFILE_IMAGES_DIR, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        current_user.profile_image = None
        db.commit()
        db.refresh(current_user)
        
    return current_user
