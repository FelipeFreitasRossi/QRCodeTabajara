"""Ponto de entrada da API. Rode com:  uvicorn app.main:app --reload"""

import logging
from contextlib import asynccontextmanager

import asyncio

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.db.mongodb import connect_to_mongo
from app.services import keep_alive, media_service

logger = logging.getLogger("tabajara")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configuração insegura: em produção a API não sobe; em desenvolvimento só avisa.
    problems = settings.security_problems()
    for problem in problems:
        logger.warning("SEGURANÇA: %s", problem)
    if problems and settings.is_production:
        raise RuntimeError("Configuração insegura para produção: " + " | ".join(problems))
    app.state.mongo = await connect_to_mongo()
    robot = keep_alive.start()  # só liga na hospedagem (Render) ou com KEEP_ALIVE_URL
    yield
    if robot:
        robot.cancel()
        try:
            await robot
        except asyncio.CancelledError:
            pass
    await app.state.mongo.close()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API do cardápio digital do restaurante Tabajara.",
    lifespan=lifespan,
    # Documentação interativa só em desenvolvimento (em produção não expõe o mapa da API).
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Os tokens vão no cabeçalho Authorization (não usamos cookies), então não precisa de credenciais no CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)

MAX_BODY_BYTES = (settings.max_upload_mb + 1) * 1024 * 1024
DOCS_PATHS = ("/docs", "/openapi.json")


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Recusa corpos gigantes antes de ler (evita encher memória/disco com uploads enormes).
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Arquivo ou requisição grande demais."})

    response = await call_next(request)

    headers = response.headers
    headers.setdefault("X-Content-Type-Options", "nosniff")
    headers.setdefault("X-Frame-Options", "DENY")
    headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
    headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    if not request.url.path.startswith(DOCS_PATHS):
        # A API só devolve JSON e imagens: nada de scripts, frames ou formulários.
        headers.setdefault("Content-Security-Policy", "default-src 'none'; img-src 'self'; frame-ancestors 'none'")
        # Imagens enviadas podem ser exibidas pelo site (outra origem em produção).
        headers.setdefault("Cross-Origin-Resource-Policy", "cross-origin")
    if request.url.path.startswith("/api/"):
        headers.setdefault("Cache-Control", "no-store")  # respostas com dados pessoais não ficam em cache
    if settings.is_production:
        headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


FIELD_NAMES = {
    "customer_name": "nome",
    "table_number": "mesa",
    "notes": "observações",
    "items": "itens",
    "quantity": "quantidade",
    "name": "nome",
    "price_cents": "preço",
    "category_id": "categoria",
    "description": "descrição",
    "email": "e-mail",
    "password": "senha",
    "number": "número",
}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Mensagem amigável em português com o primeiro campo inválido; detalhes completos em "errors".
    errors = exc.errors()
    message = "Dados inválidos. Verifique os campos e tente novamente."
    if errors:
        field = next((str(p) for p in reversed(errors[0].get("loc", ())) if isinstance(p, str)), "")
        if field in FIELD_NAMES:
            message = f"Verifique o campo {FIELD_NAMES[field]}."
    return JSONResponse(
        status_code=422,
        content={
            "detail": message,
            "errors": jsonable_encoder(
                [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in errors]
            ),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Nunca devolve detalhes internos ao cliente; registra no log do servidor.
    logger.exception("Erro não tratado em %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ocorreu um erro inesperado. Tente novamente em instantes."},
    )


app.include_router(api_router)

settings.uploads_dir.mkdir(parents=True, exist_ok=True)


@app.api_route("/uploads/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def uploaded_file(path: str) -> FileResponse:
    """Fotos enviadas. Usa o disco; se o arquivo sumiu (hospedagem reiniciou), recria a partir do banco."""
    relative = media_service.safe_relative(path)
    full = await media_service.restore(relative) if relative else None
    if full is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    # O nome muda a cada envio, então o navegador pode guardar a foto por bastante tempo.
    return FileResponse(full, headers={"Cache-Control": "public, max-age=604800"})
