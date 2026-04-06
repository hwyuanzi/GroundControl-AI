"""
Application configuration using Pydantic Settings for type-safe environment variable loading.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql://groundcontrol:groundcontrol_secret@localhost:5432/groundcontrol"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://groundcontrol-ai.vercel.app",
    ]

    # Mapbox (injected via env var)
    MAPBOX_ACCESS_TOKEN: str = ""

    # OpenSky Network (optional - for live data)
    OPENSKY_USERNAME: str = ""
    OPENSKY_PASSWORD: str = ""


settings = Settings()
