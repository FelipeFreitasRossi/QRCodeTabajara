"""Ponto de entrada da API. Rode com:  uvicorn app.main:app --reload"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.mongodb import connect_to_mongo

logger = logging.getLogger("tabajara")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo = await connect_to_mongo()
    yield
    await app.state.mongo.close()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API do cardápio digital do restaurante Tabajara.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


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
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
