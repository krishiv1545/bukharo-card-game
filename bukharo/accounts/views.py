import json
import re
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

NAME = re.compile(r"^[\w.-]{2,30}$")


def _body(request) -> dict:
    try:
        d = json.loads(request.body or b"{}")
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


@ensure_csrf_cookie
def me(request):
    return JsonResponse({"username": request.user.username if request.user.is_authenticated else None})


@require_POST
def signup(request):
    d = _body(request)
    name, pw = str(d.get("username", "")).strip(), str(d.get("password", ""))
    if not NAME.match(name):
        return JsonResponse({"error": "username: 2-30 letters, digits, _ . -"}, status=400)
    if len(pw) < 6:
        return JsonResponse({"error": "password must be at least 6 characters"}, status=400)
    if User.objects.filter(username__iexact=name).exists():
        return JsonResponse({"error": "username taken"}, status=400)
    login(request, User.objects.create_user(name, password=pw))
    return JsonResponse({"username": name}, status=201)


@require_POST
def login_view(request):
    d = _body(request)
    user = authenticate(request, username=str(d.get("username", "")), password=str(d.get("password", "")))
    if user is None:
        return JsonResponse({"error": "wrong username or password"}, status=400)
    login(request, user)
    return JsonResponse({"username": user.username})


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"username": None})
