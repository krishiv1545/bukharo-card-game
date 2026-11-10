from django.conf import settings
from django.contrib.auth import views as auth_views
from django.urls import include, path
from django.views.static import serve

urlpatterns = [path("api/rooms/", include("rooms.urls")),
               path("api/auth/", include("accounts.urls")),
               path("accounts/login/", auth_views.LoginView.as_view())]

# Local single-process deployment: serve the built frontend (npm run build) from the same origin.
DIST = settings.BASE_DIR / "frontend" / "dist"
if DIST.exists():
    urlpatterns += [path("assets/<path:path>", serve, {"document_root": DIST / "assets"}),
                    path("", serve, {"path": "index.html", "document_root": DIST})]
