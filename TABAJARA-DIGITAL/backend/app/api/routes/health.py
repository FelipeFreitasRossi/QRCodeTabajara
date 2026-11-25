from fastapi import APIRouter, Request

router = APIRouter(tags=["Sistema"])


@router.api_route("/health", methods=["GET", "HEAD"])  # HEAD: monitores como o UptimeRobot
async def health(request: Request) -> dict[str, str]:
    await request.app.state.mongo.admin.command("ping")
    return {"status": "ok", "database": "conectado"}
