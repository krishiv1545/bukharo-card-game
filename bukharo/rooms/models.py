from django.conf import settings
from django.db import models


class GameRoom(models.Model):
    LOBBY, PLAYING, FINISHED = "lobby", "playing", "finished"
    code = models.CharField(max_length=8, unique=True)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="hosted_rooms")
    status = models.CharField(max_length=10, default=LOBBY)
    config = models.JSONField(default=dict)      # host-chosen GameConfig overrides
    created = models.DateTimeField(auto_now_add=True)


class RoomMember(models.Model):
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    ready = models.BooleanField(default=False)
    team = models.CharField(max_length=32, blank=True)   # blank = solo
    joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("room", "user")]
        ordering = ["id"]                        # join order = seating order


class Game(models.Model):
    room = models.OneToOneField(GameRoom, on_delete=models.CASCADE, related_name="game")
    state = models.JSONField()                   # engine.serialize.dump(...) - full, server-only
    round_number = models.PositiveIntegerField(default=1)
    version = models.PositiveIntegerField(default=0)
    updated = models.DateTimeField(auto_now=True)


class GameEvent(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="events")
    player = models.CharField(max_length=150, blank=True)
    type = models.CharField(max_length=40)
    data = models.JSONField(default=dict)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
