from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "SolBot API"
    environment: str = "development"
    log_level: str = "INFO"

    database_url: str


settings = Settings()
