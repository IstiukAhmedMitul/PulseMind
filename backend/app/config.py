"""
config.py
------------------------------------------------------------
.env ফাইল থেকে সেটিংস লোড করে। কোথাও hardcoded secret/URL
রাখা হয়নি — সব এখান থেকে আসে।
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./ecg.db"
    openrouter_api_key: str = ""
    openrouter_model: str = "anthropic/claude-3.5-haiku"
    frontend_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# পুরো অ্যাপ জুড়ে এই একটা instance ব্যবহার হবে (import করে ব্যবহার করবে)
settings = Settings()
