"""Rotas do painel administrativo. Todas exigem login (token JWT)."""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_admin
from app.api.routes.admin import calls, categories, club, dashboard, orders, products, tables

router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_admin)])
router.include_router(dashboard.router)
router.include_router(categories.router)
router.include_router(products.router)
router.include_router(orders.router)
router.include_router(tables.router)
router.include_router(club.router)
router.include_router(calls.router)
