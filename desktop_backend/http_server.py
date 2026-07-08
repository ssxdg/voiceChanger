from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .service import BackendService


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 6242
DESKTOP_DEV_ORIGIN = "http://127.0.0.1:5173"


class DesktopBackendServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], service: BackendService) -> None:
        super().__init__(server_address, DesktopBackendHandler)
        self.service = service


class DesktopBackendHandler(BaseHTTPRequestHandler):
    server: DesktopBackendServer

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self._write_cors_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        routes = {
            "/health": self.server.service.health,
            "/status": self.server.service.status,
            "/devices": self.server.service.devices,
        }
        handler = routes.get(self.path.split("?", 1)[0])
        if handler is None:
            self._write_json({"error": "接口不存在"}, HTTPStatus.NOT_FOUND)
            return

        self._write_json(handler(), HTTPStatus.OK)

    def log_message(self, format: str, *args: Any) -> None:
        # 桌面端会频繁轮询状态，默认访问日志会淹没真正的运行错误，因此这里关闭请求级日志。
        return

    def _write_json(self, payload: dict[str, Any], status: HTTPStatus) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._write_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _write_cors_headers(self) -> None:
        # 仅允许本地 Vite/Tauri WebView 开发源访问，避免把接口误暴露给局域网网页。
        self.send_header("Access-Control-Allow-Origin", DESKTOP_DEV_ORIGIN)


def create_server(
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
    service: BackendService | None = None,
) -> DesktopBackendServer:
    return DesktopBackendServer((host, port), service or BackendService())


def main() -> None:
    server = create_server()
    print(f"RVC desktop backend listening on http://{DEFAULT_HOST}:{DEFAULT_PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("RVC desktop backend stopped")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
