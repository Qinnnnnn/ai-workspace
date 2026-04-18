import json
import asyncio
from typing import AsyncIterator


class JsonRpcClient:
    def __init__(self, process: asyncio.subprocess.Process):
        self._process = process
        self._read_task: asyncio.Task | None = None
        self._pending: dict[int | str, asyncio.Future] = {}
        self._id_counter = 1
        self._notification_handlers: list[callable] = []
        self._closed = False

    def add_notification_handler(self, handler: callable) -> None:
        self._notification_handlers.append(handler)

    async def call(self, method: str, params: dict | None = None) -> dict:
        if self._closed:
            raise RuntimeError("Client is closed")

        req_id = self._id_counter
        self._id_counter += 1

        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[req_id] = future

        request = {"jsonrpc": "2.0", "id": req_id, "method": method}
        if params:
            request["params"] = params

        self._process.stdin.write(json.dumps(request) + "\n")
        await self._process.stdin.drain()

        return await future

    def _handle_response(self, response: dict) -> None:
        req_id = response.get("id")
        if req_id is None:
            return

        future = self._pending.pop(req_id, None)
        if future is None:
            return

        if "error" in response:
            future.set_exception(Exception(response["error"].get("message", "Unknown error")))
        else:
            future.set_result(response.get("result"))

    def _handle_notification(self, notification: dict) -> None:
        for handler in self._notification_handlers:
            try:
                handler(notification)
            except Exception:
                pass

    async def _read_loop(self) -> None:
        assert self._process.stdout is not None
        reader = self._process.stdout

        while not self._closed:
            try:
                line = await reader.readline()
            except Exception:
                break

            if not line:
                break

            text = line.decode("utf-8").strip()
            if not text:
                continue

            try:
                msg = json.loads(text)
            except json.JSONDecodeError:
                continue

            if "method" in msg and msg.get("method") == "stream":
                self._handle_notification(msg)
            elif "id" in msg:
                self._handle_response(msg)

    def start_reading(self) -> None:
        self._read_task = asyncio.create_task(self._read_loop())

    async def close(self) -> None:
        self._closed = True
        self._process.stdin.close()
        await self._process.wait()
        if self._read_task:
            self._read_task.cancel()
