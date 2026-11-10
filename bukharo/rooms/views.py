from django.http import JsonResponse
from django.views.decorators.http import require_POST
from . import services


def _auth(view):
    def wrapped(request, *a, **kw):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "login required"}, status=401)
        return view(request, *a, **kw)
    return wrapped


@require_POST
@_auth
def create(request):
    return JsonResponse({"code": services.create_room(request.user).code}, status=201)


@require_POST
@_auth
def join(request, code):
    try:
        room = services.join_room(request.user, code)
    except services.ActionError as e:
        return JsonResponse({"error": str(e)}, status=400)
    return JsonResponse({"code": room.code})
