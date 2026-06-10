#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
atualizar_cepea.py
------------------
Atualiza dados.json com os indicadores DIÁRIOS do CEPEA (boi, milho, soja).
Roda todo dia via GitHub Actions. O leite é MENSAL e fica como atualização
manual (ou rode a função de leite no fechamento do mês).

IMPORTANTE
- O CEPEA não tem API pública. Este script lê as páginas de indicador e
  extrai o valor. A estrutura do HTML do CEPEA pode mudar — se o valor vier
  vazio, ajuste o seletor/regex na função `pegar_valor_indicador`.
- Rode UMA VEZ localmente antes de confiar no automático:
      pip install -r requirements.txt
      python atualizar_cepea.py
  e confira o dados.json gerado.
- Licença dos dados: CEPEA CC BY-NC 4.0. Cite a fonte. Uso comercial
  (ex.: produção interna numa fintech) pode exigir licenciamento junto ao CEPEA.
"""

import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ARQ = Path(__file__).parent / "dados.json"
TZ_BR = timezone(timedelta(hours=-3))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (painel-agroforte; contato: SEU_EMAIL) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# Páginas oficiais de indicador (valores diários).
PAGINAS = {
    "boi":   "https://www.cepea.esalq.usp.br/br/indicador/boi-gordo.aspx",
    "milho": "https://www.cepea.esalq.usp.br/br/indicador/milho.aspx",
    "soja":  "https://www.cepea.esalq.usp.br/br/indicador/soja.aspx",
}


def pegar_valor_indicador(html: str):
    """
    Extrai (valor_float, variacao_pct_float|None) da página do indicador.
    Estratégia em camadas — ajuste aqui se o layout mudar.
    """
    soup = BeautifulSoup(html, "html.parser")

    # 1) Tenta a tabela de cotação do indicador (classes comuns no CEPEA).
    valor = None
    for sel in ["span.maior", ".imagenet-indicador-cotacao", "td.valor", ".valor-indicador"]:
        el = soup.select_one(sel)
        if el and re.search(r"\d", el.get_text()):
            valor = el.get_text(strip=True)
            break

    # 2) Fallback: primeiro número no formato brasileiro de moeda no texto.
    texto = soup.get_text(" ", strip=True)
    if valor is None:
        m = re.search(r"R\$\s*([\d\.]+,\d{2,4})", texto)
        if m:
            valor = m.group(1)

    # 3) Variação diária (%), se exposta na página.
    var = None
    mv = re.search(r"(-?\d{1,3},\d{1,2})\s*%", texto)
    if mv:
        var = float(mv.group(1).replace(".", "").replace(",", "."))

    if valor is None:
        return None, None
    valor_f = float(re.sub(r"[^\d,]", "", valor).replace(".", "").replace(",", "."))
    return valor_f, var


def atualizar():
    dados = json.loads(ARQ.read_text(encoding="utf-8"))
    falhas = []

    for chave, url in PAGINAS.items():
        try:
            r = requests.get(url, headers=HEADERS, timeout=25)
            r.raise_for_status()
            valor, var = pegar_valor_indicador(r.text)
            if valor is None:
                falhas.append(chave)
                continue

            bloco = dados[chave]
            tend = "up" if (var or 0) > 0 else "down" if (var or 0) < 0 else "flat"
            # Indicador nacional único entra como uma "linha Brasil".
            bloco["estados"] = [{
                "uf": "BR", "regiao": "Nacional",
                "preco": valor, "varMes": var, "tend": tend
            }]
            bloco["media"] = None
            bloco["kpis"] = [{
                "label": "Indicador CEPEA",
                "val": f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
                "sub": (f"{'+' if (var or 0) >= 0 else ''}{var}% no dia" if var is not None else "no dia"),
                "subClass": "pos" if (var or 0) >= 0 else "neg"
            }]
            print(f"[ok] {chave}: R$ {valor} ({var}% )")
        except Exception as e:
            print(f"[erro] {chave}: {e}", file=sys.stderr)
            falhas.append(chave)

    dados["meta"]["atualizado_em"] = datetime.now(TZ_BR).isoformat(timespec="seconds")
    ARQ.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")

    if falhas:
        print(f"[aviso] sem valor para: {', '.join(falhas)} — verifique o seletor.",
              file=sys.stderr)
    print("dados.json atualizado.")


if __name__ == "__main__":
    atualizar()
