from pydantic import BaseModel, ConfigDict


class StrictModel(BaseModel):
    """Base dos dados recebidos: remove espaços extras e recusa campos desconhecidos."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class ReorderIn(StrictModel):
    """Nova ordem de exibição: lista de ids na ordem desejada."""

    ids: list[str]
