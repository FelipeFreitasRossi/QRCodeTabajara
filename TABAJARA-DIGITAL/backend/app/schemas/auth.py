from pydantic import BaseModel, Field

from app.schemas.common import StrictModel


class LoginIn(StrictModel):
    # str simples (e não EmailStr) para aceitar qualquer e-mail cadastrado pelo create_admin.
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=200)


class AdminOut(BaseModel):
    id: str
    name: str
    email: str
    role: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin: AdminOut
