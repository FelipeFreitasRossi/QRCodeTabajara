import io

from fastapi import APIRouter, HTTPException, Response, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_or_404
from app.models import DiningTable
from app.schemas.catalog import TableIn, TableOut
from app.services.catalog_service import new_qr_token, table_out, table_qr_url

router = APIRouter(prefix="/tables", tags=["Admin · Mesas"])

DUPLICATE = "Já existe uma mesa com esse número."


async def ensure_qr_token(table: DiningTable) -> DiningTable:
    """Mesas antigas ganham o código do QR na primeira vez que forem usadas (sem apagar nada)."""
    if not table.qr_token:
        table.qr_token = new_qr_token()
        await table.save()
    return table


@router.get("", response_model=list[TableOut])
async def list_tables() -> list[TableOut]:
    tables = await DiningTable.find_all().sort("+number").to_list()
    return [table_out(await ensure_qr_token(t)) for t in tables]


@router.post("", response_model=TableOut, status_code=status.HTTP_201_CREATED)
async def create_table(data: TableIn) -> TableOut:
    if await DiningTable.find_one({"number": data.number}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE)
    table = DiningTable(
        number=data.number,
        slug=DiningTable.slug_for(data.number),
        label=data.label or None,
        active=data.active,
        seats=data.seats,
        qr_token=new_qr_token(),
    )
    try:
        await table.insert()
    except DuplicateKeyError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE) from None
    return table_out(table)


@router.put("/{table_id}", response_model=TableOut)
async def update_table(table_id: str, data: TableIn) -> TableOut:
    table = await get_or_404(DiningTable, table_id, "Mesa não encontrada.")
    other = await DiningTable.find_one({"number": data.number})
    if other and other.id != table.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE)
    table.number = data.number
    table.slug = DiningTable.slug_for(data.number)
    table.label = data.label or None
    table.active = data.active
    table.seats = data.seats
    await table.save()
    return table_out(await ensure_qr_token(table))


@router.post("/{table_id}/qrcode/regenerate", response_model=TableOut)
async def regenerate_qr(table_id: str) -> TableOut:
    """Gera um QR novo (o impresso antigo deixa de funcionar). Útil se o adesivo vazar ou for copiado."""
    table = await get_or_404(DiningTable, table_id, "Mesa não encontrada.")
    table.qr_token = new_qr_token()
    await table.save()
    return table_out(table)


@router.get("/{table_id}/qrcode.png")
async def table_qrcode(table_id: str) -> Response:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_M

    table = await ensure_qr_token(await get_or_404(DiningTable, table_id, "Mesa não encontrada."))
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=16, border=2)
    qr.add_data(table_qr_url(table))
    qr.make(fit=True)
    image = qr.make_image(fill_color="#0d0d0f", back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    filename = f"qrcode-mesa-{table.number:02d}.png"
    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"},
    )


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(table_id: str) -> Response:
    table = await get_or_404(DiningTable, table_id, "Mesa não encontrada.")
    await table.delete()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
