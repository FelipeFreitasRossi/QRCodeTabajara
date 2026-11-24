"""Clube Tabajara: regras públicas, estimativa de pontos e área do cliente."""

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_customer
from app.models import Customer, LoyaltyTransaction
from app.schemas.club import (
    BirthdayOut,
    ClubEstimateIn,
    ClubEstimateOut,
    ClubPublicOut,
    ClubSummaryOut,
    RewardOut,
    TransactionOut,
)
from app.services import loyalty_service, reward_service

public_router = APIRouter(prefix="/public/club", tags=["Clube · Público"])
router = APIRouter(prefix="/club", tags=["Clube · Área do cliente"])


@public_router.get("", response_model=ClubPublicOut)
async def club_rules() -> ClubPublicOut:
    settings = await loyalty_service.get_settings()
    return ClubPublicOut(
        enabled=settings.enabled,
        points_per_real=settings.points_per_real,
        min_order_cents=settings.min_order_cents,
    )


@public_router.post("/estimate", response_model=ClubEstimateOut)
async def estimate(data: ClubEstimateIn) -> ClubEstimateOut:
    """Quantos pontos o carrinho vale (preços e regras do servidor)."""
    quantities: dict[str, int] = {}
    for item in data.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity
    return ClubEstimateOut(points=await loyalty_service.estimate_points(quantities))


@public_router.get("/rewards", response_model=list[RewardOut])
async def rewards_catalog() -> list[RewardOut]:
    """Catálogo de recompensas (visível para todos; resgatar exige login)."""
    return await reward_service.public_catalog()


@router.get("/me/birthday", response_model=BirthdayOut)
async def my_birthday(customer: Customer = Depends(get_current_customer)) -> BirthdayOut:
    return await reward_service.birthday_status(customer)


@router.get("/me", response_model=ClubSummaryOut)
async def my_summary(customer: Customer = Depends(get_current_customer)) -> ClubSummaryOut:
    account = await loyalty_service.get_account(customer.id)
    pending, pending_orders = await loyalty_service.pending_points(customer.id)
    settings = await loyalty_service.get_settings()
    return ClubSummaryOut(
        balance=account.balance,
        lifetime_earned=account.lifetime_earned,
        pending_points=pending,
        pending_orders=pending_orders,
        points_per_real=settings.points_per_real,
    )


@router.get("/me/transactions", response_model=list[TransactionOut])
async def my_transactions(
    customer: Customer = Depends(get_current_customer),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[TransactionOut]:
    items = (
        await LoyaltyTransaction.find({"customer_id": customer.id}).sort("-created_at").limit(limit).to_list()
    )
    return [
        TransactionOut(
            id=str(t.id),
            type=t.type,
            points=t.points,
            reason=t.reason,
            order_code=t.order_code,
            balance_after=t.balance_after,
            created_at=t.created_at,
        )
        for t in items
    ]
