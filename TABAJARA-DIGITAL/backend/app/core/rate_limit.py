"""Limite simples de tentativas por IP (em memória).

Protege o login contra tentativas de adivinhar senha e evita envio de pedidos
em massa. Suficiente para um único servidor; em produção com vários servidores,
trocar por Redis.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int, message: str) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self.message = message
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _cleanup(self, now: float) -> None:
        """Remove IPs sem tentativas recentes (evita a memória crescer sem limite)."""
        if len(self._hits) < 5000:
            return
        for key in [k for k, hits in self._hits.items() if not hits or now - hits[-1] > self.window]:
            del self._hits[key]

    def check(self, request: Request) -> None:
        # Atrás de proxy (Nginx, Render, Railway…), rode o uvicorn com --proxy-headers
        # --forwarded-allow-ips="<ip do proxy>" para este IP ser o do cliente, e não o do proxy.
        key = request.client.host if request.client else "desconhecido"
        now = time.monotonic()
        self._cleanup(now)
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if len(hits) >= self.max_requests:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=self.message)
        hits.append(now)


login_limiter = RateLimiter(
    max_requests=8,
    window_seconds=300,
    message="Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
)

# Atenção: no Wi-Fi do restaurante todos os clientes saem pelo MESMO IP.
# Por isso os limites por IP são folgados; contra adivinhar PIN/senha vale o bloqueio por conta.
order_limiter = RateLimiter(
    max_requests=40,
    window_seconds=300,
    message="Muitos pedidos enviados em pouco tempo. Aguarde um instante ou chame um atendente.",
)

customer_login_limiter = RateLimiter(
    max_requests=40,
    window_seconds=300,
    message="Muitas tentativas de entrar no Clube. Aguarde alguns minutos.",
)

customer_register_limiter = RateLimiter(
    max_requests=20,
    window_seconds=600,
    message="Muitos cadastros em pouco tempo. Aguarde alguns minutos ou peça ajuda à equipe.",
)
