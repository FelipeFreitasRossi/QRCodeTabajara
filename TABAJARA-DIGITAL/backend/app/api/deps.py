"""Dependências compartilhadas pelas rotas: autenticação do painel e busca por id."""

from typing import TypeVar

from beanie import Document, PydanticObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token, decode_customer_token, issued_before
from app.models import AdminUser, Customer

bearer = HTTPBearer(auto_error=False)

DocT = TypeVar("DocT", bound=Document)

UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sessão expirada ou inválida. Faça login novamente.",
    headers={"WWW-Authenticate": "Bearer"},
)


def parse_object_id(value: str, not_found_message: str = "Registro não encontrado.") -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_message) from None


async def get_or_404(model: type[DocT], value: str, not_found_message: str = "Registro não encontrado.") -> DocT:
    document = await model.get(parse_object_id(value, not_found_message))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_message)
    return document


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> AdminUser:
    """Protege as rotas do painel: exige um token válido de um administrador ativo."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UNAUTHORIZED
    data = decode_access_token(credentials.credentials)
    if data is None:
        raise UNAUTHORIZED
    try:
        admin = await AdminUser.get(PydanticObjectId(data.subject))
    except (InvalidId, ValueError):
        raise UNAUTHORIZED from None
    if admin is None or not admin.active or issued_before(data, admin.tokens_valid_after):
        raise UNAUTHORIZED
    return admin


# Perfis do painel. O garçom usa o celular dele: vê chamados, pedidos e contas,
# mas não mexe em preços, cardápio, Clube, mesas nem na equipe.
ROLE_ADMIN = "admin"
ROLE_WAITER = "garcom"
STAFF_ROLES = (ROLE_ADMIN, ROLE_WAITER)

FORBIDDEN_ROLE = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Só o gerente pode fazer isso. Peça a ele para entrar com a conta de gerente.",
)


async def require_admin(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
    """Rotas só do gerente. O perfil vem do banco a cada pedido (nunca do navegador)."""
    if admin.role != ROLE_ADMIN:
        raise FORBIDDEN_ROLE
    return admin


CUSTOMER_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Sua sessão do Clube expirou. Entre novamente com CPF e PIN.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def _customer_from(credentials: HTTPAuthorizationCredentials | None) -> Customer | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    data = decode_customer_token(credentials.credentials)
    if data is None:
        return None
    try:
        customer = await Customer.get(PydanticObjectId(data.subject))
    except (InvalidId, ValueError):
        return None
    if customer is None or not customer.active or issued_before(data, customer.tokens_valid_after):
        return None
    return customer


async def get_current_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Customer:
    """Rotas do Clube que exigem cliente logado."""
    customer = await _customer_from(credentials)
    if customer is None:
        raise CUSTOMER_UNAUTHORIZED
    return customer


async def get_optional_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Customer | None:
    """Rotas públicas que funcionam com ou sem cliente logado (ex.: enviar pedido).

    Sem token: segue como visitante. Com token vencido/inválido: 401, para o cliente
    entrar de novo e não perder os pontos sem perceber.
    """
    if credentials is None:
        return None
    customer = await _customer_from(credentials)
    if customer is None:
        raise CUSTOMER_UNAUTHORIZED
    return customer
