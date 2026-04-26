import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, Response, status
from passlib.context import CryptContext
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.engine import get_db
from app.db.models import User, UserSession

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_random_session_id() -> str:
    return secrets.token_urlsafe(32)


def create_random_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def create_session_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(
        minutes=settings.access_token_expire_minutes
    )


def set_auth_cookie(response: Response, session_id: str) -> None:
    max_age = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=session_id,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    max_age = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        max_age=max_age,
        expires=max_age,
        httponly=False,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


async def save_session(
    db: AsyncSession,
    session_id: str,
    user_id: str,
    csrf_token: str,
) -> UserSession:
    session = UserSession(
        session_id=session_id,
        user_id=user_id,
        csrf_token=csrf_token,
        expires_at=create_session_expiry(),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


def clear_csrf_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.csrf_cookie_name,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


async def delete_session(db: AsyncSession, session_id: str) -> None:
    await db.execute(delete(UserSession).where(UserSession.session_id == session_id))
    await db.commit()


async def delete_expired_sessions(db: AsyncSession) -> int:
    result = await db.execute(
        delete(UserSession)
        .where(UserSession.expires_at <= datetime.now(UTC))
        .returning(UserSession.session_id)
    )
    await db.commit()
    return len(result.fetchall())


async def get_current_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserSession:
    session_id = request.cookies.get(settings.auth_cookie_name)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    result = await db.execute(
        select(UserSession).where(UserSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    if session.expires_at <= datetime.now(UTC):
        await delete_session(db, session.session_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    return session


async def validate_csrf(
    request: Request,
    current_session: UserSession = Depends(get_current_session),
) -> None:
    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
    csrf_header = request.headers.get("X-CSRF-Token")

    if not csrf_cookie or not csrf_header:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token is required",
        )

    if csrf_cookie != current_session.csrf_token or csrf_header != current_session.csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )


async def get_current_user(
    current_session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == current_session.user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user
