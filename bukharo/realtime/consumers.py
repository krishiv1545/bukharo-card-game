"""One socket per player per room. The client sends actions, never decisions.
After any change every socket in the room re-reads the DB and sends *its own* view,
so private hands never travel through the channel layer."""
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rooms import services


class RoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.code = self.scope["url_route"]["kwargs"]["code"]
        if not self.user.is_authenticated:
            return await self.close(code=4401)
        view = await database_sync_to_async(services.view_for)(self.user, self.code)
        if view is None:
            return await self.close(code=4403)
        self.group = f"room_{self.code}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        await self.send_json({"type": "STATE", **view})   # reconnect = same path as first connect
        await self.channel_layer.group_send(self.group, {"type": "room.refresh"})  # presence/members

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict):
            return await self.send_json({"type": "ERROR", "message": "malformed"})
        try:
            await database_sync_to_async(services.handle)(self.user, self.code, content)
        except services.ActionError as e:
            return await self.send_json({"type": "ERROR", "message": str(e)})
        await self.channel_layer.group_send(self.group, {"type": "room.refresh"})

    async def room_refresh(self, event):
        view = await database_sync_to_async(services.view_for)(self.user, self.code)
        if view is not None:
            await self.send_json({"type": "STATE", **view})
