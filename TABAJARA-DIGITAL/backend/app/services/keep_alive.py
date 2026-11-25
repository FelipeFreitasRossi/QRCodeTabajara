"""Robô "não durma": acessa a própria API a cada poucos minutos.

Hospedagens gratuitas como o Render desligam o servidor após 15 minutos sem receber acessos,
e o primeiro cliente depois disso espera até 1 minuto. O robô faz um acesso pelo endereço
público (passando pelo Render, então conta como visita) a cada KEEP_ALIVE_MINUTES (padrão 10).

Ligado sozinho no Render (usa RENDER_EXTERNAL_URL). No seu computador fica desligado.
"""

import asyncio
import logging
import urllib.request

from app.core.config import settings

logger = logging.getLogger("tabajara.robo")

TIMEOUT_SECONDS = 30
FIRST_DELAY_SECONDS = 60  # espera o servidor terminar de subir


def _ping(url: str) -> int:
    request = urllib.request.Request(url, headers={"User-Agent": "TabajaraKeepAlive/1.0"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310 (URL da configuração)
        return response.status


async def run_forever(url: str, minutes: int) -> None:
    interval = max(1, minutes) * 60
    logger.info("Robô ligado: acessando %s a cada %s min.", url, max(1, minutes))
    await asyncio.sleep(FIRST_DELAY_SECONDS)
    while True:
        try:
            status = await asyncio.to_thread(_ping, url)
            logger.info("Robô: %s respondeu %s.", url, status)
        except Exception as exc:  # nunca derruba a API por causa do robô
            logger.warning("Robô: falha ao acessar %s (%s). Tento de novo no próximo ciclo.", url, exc)
        await asyncio.sleep(interval)


def start() -> asyncio.Task | None:
    url = settings.keep_alive_target
    if not url:
        return None
    if not url.startswith(("https://", "http://")):
        logger.warning("Robô desligado: KEEP_ALIVE_URL inválida (%s).", url)
        return None
    return asyncio.create_task(run_forever(url, settings.keep_alive_minutes), name="keep-alive")
