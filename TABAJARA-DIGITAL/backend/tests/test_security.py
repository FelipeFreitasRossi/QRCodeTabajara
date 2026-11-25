"""Testes das regras de segurança (sem banco).  Rode com:  python -m pytest"""

from datetime import datetime, timedelta, timezone

from app.core.config import Settings
from app.core.security import (
    TokenData,
    create_access_token,
    create_customer_token,
    decode_access_token,
    decode_customer_token,
    issued_before,
)

STRONG = "x" * 40


def _settings(**kw):
    base = dict(mongodb_url="mongodb://x", jwt_secret=STRONG, cpf_hash_key="y" * 40)
    base.update(kw)
    return Settings(**base)


def test_configuracao_forte_nao_tem_problemas():
    assert _settings().security_problems() == []


def test_chaves_fracas_sao_apontadas():
    problems = _settings(jwt_secret="troque-esta-chave", cpf_hash_key=None).security_problems()
    assert any("JWT_SECRET" in p for p in problems)
    assert any("CPF_HASH_KEY" in p for p in problems)


def test_producao_exige_https():
    problems = _settings(
        environment="production", public_site_url="http://site", cors_origins="http://site"
    ).security_problems()
    assert any("PUBLIC_SITE_URL" in p for p in problems)
    assert any("CORS_ORIGINS" in p for p in problems)


def test_token_do_cliente_nao_abre_o_painel():
    customer_token, _ = create_customer_token("abc")
    admin_token, _ = create_access_token("abc")
    assert decode_access_token(customer_token) is None
    assert decode_customer_token(admin_token) is None
    assert decode_access_token(admin_token).subject == "abc"


def test_token_adulterado_e_recusado():
    token, _ = create_access_token("abc")
    assert decode_access_token(token[:-2] + ("A" if token[-2] != "A" else "B") + token[-1]) is None


def test_sessoes_antigas_sao_invalidadas():
    now = datetime.now(timezone.utc)
    old = TokenData("abc", now - timedelta(hours=1))
    assert issued_before(old, now)
    assert not issued_before(TokenData("abc", now + timedelta(seconds=1)), now)
    assert not issued_before(old, None)
