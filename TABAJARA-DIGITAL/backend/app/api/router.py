"""Junta todas as rotas da API sob o prefixo /api."""

from fastapi import APIRouter

from app.api.routes import admin, auth, club, customers, health, public

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(public.router)
api_router.include_router(club.public_router)
api_router.include_router(customers.router)
api_router.include_router(club.router)
api_router.include_router(auth.router)
api_router.include_router(admin.router)
