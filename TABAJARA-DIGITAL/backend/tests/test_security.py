"""Testes das regras de segurança (sem banco).  Rode com:  python -m pytest"""

from datetime import datetime, timedelta, timezone

import pytest

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


def test_robo_liga_so_na_hospedagem():
    base = dict(mongodb_url="mongodb://x", jwt_secret="y" * 40, _env_file=None)
    assert Settings(**base).keep_alive_target is None  # no computador: desligado
    on_render = Settings(**base, render_external_url="https://tabajara-api.onrender.com/")
    assert on_render.keep_alive_target == "https://tabajara-api.onrender.com/api/health"
    assert Settings(**base, render_external_url="https://a.onrender.com", keep_alive_url="off").keep_alive_target is None


def test_caminho_de_foto_nao_sai_da_pasta_uploads():
    from app.services.media_service import safe_relative

    assert safe_relative("produtos/picanha-1a2b.webp") == "produtos/picanha-1a2b.webp"
    for bad in ["../.env", "/etc/passwd", "produtos/../../x", ".gitkeep", "a\\b", "produtos/.tmp-1", ""]:
        assert safe_relative(bad) is None


def test_chamado_so_aceita_motivos_conhecidos():
    from pydantic import ValidationError

    from app.schemas.waiter_call import CallCreateIn

    assert CallCreateIn().reason.value == "atendente"
    assert CallCreateIn(reason="conta").reason.value == "conta"
    for bad in ({"reason": "pizza"}, {"reason": "conta", "table_number": 5}):
        with pytest.raises(ValidationError):
            CallCreateIn(**bad)


def test_pedir_a_conta_prevalece_sobre_chamado_simples():
    from app.models.waiter_call import CallReason
    from app.services.waiter_call_service import REASON_WEIGHT

    assert REASON_WEIGHT[CallReason.CONTA] > REASON_WEIGHT[CallReason.ATENDENTE] > REASON_WEIGHT[CallReason.AJUDA]


def test_qr_de_chamar_aponta_para_o_site_separado():
    base = dict(mongodb_url="mongodb://x", jwt_secret="y" * 40, _env_file=None)
    assert Settings(**base).call_site_url == ""
    s = Settings(**base, environment="production", public_site_url="https://a.com", call_site_url="http://b.com")
    assert any("CALL_SITE_URL" in p for p in s.security_problems())


def test_chamar_pelo_numero_so_em_desenvolvimento():
    base = dict(mongodb_url="mongodb://x", jwt_secret="y" * 40, _env_file=None)
    assert Settings(**base).allow_call_by_number is True
    assert Settings(**base, environment="production").allow_call_by_number is False
    assert Settings(**base, environment="production", call_by_number=True).allow_call_by_number is True


def test_cadastro_da_equipe_valida_os_dados():
    import pytest
    from pydantic import ValidationError

    from app.schemas.staff import StaffCreateIn

    ok = StaffCreateIn(name="  João   Silva ", email=" Joao@X.com ", password="1234567890")
    assert (ok.name, ok.email, ok.role) == ("João Silva", "joao@x.com", "garcom")
    for bad in (
        {"name": "Jo", "email": "a@b.co", "password": "curta"},
        {"name": "Jo", "email": "sem-arroba", "password": "1234567890"},
        {"name": "Jo", "email": "a@b.co", "password": "1234567890", "role": "dono"},
        {"name": "Jo", "email": "a@b.co", "password": "1234567890", "active": True},
    ):
        with pytest.raises(ValidationError):
            StaffCreateIn(**bad)


def test_garcom_nao_entra_nas_rotas_do_gerente():
    import asyncio

    import pytest
    from fastapi import HTTPException

    from app.api.deps import require_admin

    class User:
        role = "garcom"

    with pytest.raises(HTTPException) as erro:
        asyncio.run(require_admin(User()))  # type: ignore[arg-type]
    assert erro.value.status_code == 403
