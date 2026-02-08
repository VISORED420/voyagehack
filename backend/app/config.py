"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "TBO GroupBook API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/groupbooking"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_ENABLED: bool = True
    CACHE_DEFAULT_TTL: int = 300  # 5 minutes default cache TTL
    CACHE_DASHBOARD_TTL: int = 60  # 1 minute for dashboard (frequently updated)
    CACHE_STATS_TTL: int = 30  # 30 seconds for stats

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # TBO API - REST API endpoint
    TBO_API_URL: str = "https://affiliate.tektravels.com/HotelAPI/V1/Rest"
    TBO_USERNAME: Optional[str] = None
    TBO_PASSWORD: Optional[str] = None

    # CORS - Allow all origins for production, or set specific ones via env
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://hackathon-orcin-xi.vercel.app",
        "https://*.vercel.app",
        "*"  # Allow all origins in production
    ]

    @property
    def redis_url(self) -> str:
        """Construct Redis URL from settings"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    class Config:
        env_file = ".env"


settings = Settings()
