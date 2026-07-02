"""
ws_manager.py
------------------------------------------------------------
সব কানেক্টেড WebSocket ক্লায়েন্ট (Next.js frontend ট্যাব) ট্র্যাক করে,
আর নতুন ECG ডেটা এলে সবাইকে broadcast করে।

এই ম্যানেজারের single instance (`manager`) পুরো অ্যাপ জুড়ে শেয়ার হবে —
ingest.py থেকে broadcast কল হবে, readings.py এর /ws/ecg endpoint
থেকে connect/disconnect হ্যান্ডেল হবে।
"""

import json
from typing import List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        """সব কানেক্টেড ক্লায়েন্টকে JSON ডেটা পাঠায়। ডিসকানেক্ট হওয়া
        ক্লায়েন্ট থাকলে সেগুলো লিস্ট থেকে সরিয়ে দেয়।"""
        message = json.dumps(data)
        dead_connections = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


# পুরো অ্যাপ জুড়ে একটাই instance ব্যবহার হবে
manager = ConnectionManager()