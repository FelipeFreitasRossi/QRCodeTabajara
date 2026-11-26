"""Rotas do painel administrativo. Todas exigem login (token JWT).

Gerente e garçom: pedidos, chamados, conta da mesa e lista de mesas.
Só o gerente: painel de faturamento, cardápio, categorias, Clube, alterar mesas e equipe.
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_admin, require_admin
from app.api.routes.admin import calls, categories, club, dashboard, orders, products, staff, tables

ADMIN_ONLY = [Depends(require_admin)]

router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_admin)])
router.include_router(dashboard.router, dependencies=ADMIN_ONLY)
router.include_router(categories.router, dependencies=ADMIN_ONLY)
router.include_router(products.router, dependencies=ADMIN_ONLY)
router.include_router(club.router, dependencies=ADMIN_ONLY)
router.include_router(staff.router, dependencies=ADMIN_ONLY)
router.include_router(orders.router)
router.include_router(tables.router)  # escrita protegida rota a rota (o garçom só lista)
router.include_router(calls.router)
