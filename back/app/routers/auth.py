from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.engine import get_db
from app.db.models import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.security import (
    clear_auth_cookie,
    clear_csrf_cookie,
    create_random_csrf_token,
    create_random_session_id,
    delete_session,
    get_current_user,
    hash_password,
    save_session,
    set_auth_cookie,
    set_csrf_cookie,
    validate_csrf,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    existing_user = await db.execute(select(User).where(User.email == payload.email))
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    user = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        name=payload.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    session_id = create_random_session_id()
    csrf_token = create_random_csrf_token()
    await save_session(db, session_id, user.id, csrf_token)
    set_auth_cookie(response, session_id)
    set_csrf_cookie(response, csrf_token)
    return AuthResponse(
        message="Registered successfully",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    session_id = create_random_session_id()
    csrf_token = create_random_csrf_token()
    await save_session(db, session_id, user.id, csrf_token)
    set_auth_cookie(response, session_id)
    set_csrf_cookie(response, csrf_token)
    return AuthResponse(
        message="Logged in successfully",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(validate_csrf),
) -> dict[str, str]:
    session_id = request.cookies.get(settings.auth_cookie_name)
    if session_id:
        await delete_session(db, session_id)
    clear_auth_cookie(response)
    clear_csrf_cookie(response)
    return {"message": "Logged out successfully"}
