"""Testes das regras puras do Clube (não precisam de banco).  Rode com:  python -m pytest"""

from types import SimpleNamespace

import pytest

from app.utils.cpf import cpf_tail, is_valid_cpf, only_digits


@pytest.mark.parametrize("cpf", ["529.982.247-25", "52998224725", "111.444.777-35"])
def test_cpf_valido(cpf):
    assert is_valid_cpf(only_digits(cpf))


@pytest.mark.parametrize("cpf", ["111.111.111-11", "529.982.247-26", "123", "", "00000000000"])
def test_cpf_invalido(cpf):
    assert not is_valid_cpf(only_digits(cpf))


def test_cpf_mascarado_nao_expoe_o_documento():
    tail = cpf_tail("52998224725")
    assert tail.endswith("247-25")
    assert "529" not in tail and "982" not in tail


def _settings(**kw):
    base = dict(enabled=True, points_per_real=1.0, min_order_cents=0)
    base.update(kw)
    return SimpleNamespace(**base)


def test_pontos_por_real_arredonda_para_baixo():
    from app.services.loyalty_service import points_for

    assert points_for(8990, _settings()) == 89
    assert points_for(10000, _settings(points_per_real=1.5)) == 150
    assert points_for(99, _settings()) == 0


def test_pontos_respeitam_pedido_minimo_e_clube_desligado():
    from app.services.loyalty_service import points_for

    assert points_for(4000, _settings(min_order_cents=5000)) == 0
    assert points_for(5000, _settings(min_order_cents=5000)) == 50
    assert points_for(50000, _settings(enabled=False)) == 0


def _register_payload(**kw):
    base = dict(
        name="Marina",
        cpf="529.982.247-25",
        phone="16999998888",
        pin="4826",
        accept_privacy=True,
        birth_day=14,
        birth_month=3,
    )
    base.update(kw)
    return base


def test_cadastro_exige_aniversario():
    from pydantic import ValidationError

    from app.schemas.customer import CustomerRegisterIn

    assert CustomerRegisterIn(**_register_payload()).birth_month == 3
    for missing in ("birth_day", "birth_month"):
        data = _register_payload()
        data.pop(missing)
        with pytest.raises(ValidationError):
            CustomerRegisterIn(**data)
    with pytest.raises(ValidationError):
        CustomerRegisterIn(**_register_payload(birth_day=31, birth_month=4))
    # 29/02 sem ano é aceito (quem nasceu em ano bissexto)
    assert CustomerRegisterIn(**_register_payload(birth_day=29, birth_month=2)).birth_day == 29
