from fastapi import APIRouter, Request

router = APIRouter(tags=["Sistema"])


@router.get("/health")
async def health(request: Request) -> dict[str, str]:
    await request.app.state.mongo.admin.command("ping")
    return {"status": "ok", "database": "conectado"}
