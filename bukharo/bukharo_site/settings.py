import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*" if DEBUG else "localhost").split(",")

INSTALLED_APPS = ["daphne", "django.contrib.auth", "django.contrib.contenttypes",
                  "django.contrib.sessions", "accounts", "rooms", "realtime"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware",
              "django.contrib.sessions.middleware.SessionMiddleware",
              "django.middleware.common.CommonMiddleware",
              "django.middleware.csrf.CsrfViewMiddleware",
              "django.contrib.auth.middleware.AuthenticationMiddleware"]
ROOT_URLCONF = "bukharo_site.urls"
ASGI_APPLICATION = "bukharo_site.asgi.application"

if os.environ.get("POSTGRES_DB"):
    DATABASES = {"default": {"ENGINE": "django.db.backends.postgresql",
                             "NAME": os.environ["POSTGRES_DB"],
                             "USER": os.environ.get("POSTGRES_USER", "postgres"),
                             "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
                             "HOST": os.environ.get("POSTGRES_HOST", "localhost")}}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

if os.environ.get("REDIS_URL"):   # production: shared across processes
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels_redis.core.RedisChannelLayer",
                                  "CONFIG": {"hosts": [os.environ["REDIS_URL"]]}}}
else:                             # dev/tests: single process only
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
