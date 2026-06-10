#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
atualizar_cepea.py
------------------
Atualiza dados.json com os indicadores DIÁRIOS do CEPEA (boi, milho, soja),
lendo a tabela de cotações da página de cada indicador. Roda todo dia via
GitHub Actions.

Leite, frango, suíno e ovos NÃO entram aqui de propósito: são séries por
praça/estado (ou mensais) e ficam semeadas no dados.json, atualizadas à mão.

Licença dos dados: CEPEA CC BY-NC 4.0. Cite a fonte. Uso comercial pode
exigir licenciamento junto ao CEPEA.
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Indicadores diários de valor nacional único (1ª tabela da página).
PAGINAS = {
    "boi":   "https://cepea.org.br/br/indicador/boi-gordo.aspx",
    "milho": "https://cepea.org.br/br/indicador/milho.aspx",
    "soja":  "https://cepea.org.br/br/indicador/soja.aspx",
}


def to_float(txt):
    """'353,80' -> 353.80 ; '1.705,25' -> 1705.25"""
    s = re.sub(r"[^\d,.-]", "", txt)
    return float(s.replace(".", "").replace(",", "."))


def to_pct(txt):
    """'0,08%' -> 0.08 ; '-1,34%' -> -1.34 ; '' -> None"""
    s = txt.strip().replace("%", "")
    if not re.search(r"\d", s):
        return None
    return float(s.replace(".", "").replace(",", "."))


def pegar_valor_indicador(html):
    """
    Lê a 1ª linha de cotação da 1ª tabela do tipo
    [ data | Valor R$ | Var./Dia | Var./Mês | Valor US$ ].
    Retorna (valor, var_dia, data) ou (None, None, None).
    """
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            cells = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) >= 3 and re.match(r"^\d{2}/\d{2}/\d{4}$", cells[0]):
                try:
                    valor = to_float(cells[1])
                    var = to_pct(cells[2])      # Var./Dia
                    return valor, var, cells[0]
                except ValueError:
                    continue
    return None, None, None


def fmt_brl(v):
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def atualizar():
    dados = json.loads(ARQ.read_text(encoding="utf-8"))
    falhas = []

    for chave, url in PAGINAS.items():
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            valor, var, data = pegar_valor_indicador(r.text)
            if valor is None:
                falhas.append(chave)
                print(f"[falha] {chave}: não achei a tabela de cotação", file=sys.stderr)
                continue

            bloco = dados[chave]
            nome = bloco.get("titulo", "Indicador")
            tend = "up" if (var or 0) > 0 else "down" if (var or 0) < 0 else "flat"
            bloco["estados"] = [{
                "uf": nome, "regiao": "Nacional",
                "preco": valor, "varMes": var, "tend": tend
            }]
            bloco["media"] = None
            bloco["kpis"] = [{
                "label": f"Indicador · {data}",
                "val": f"{fmt_brl(valor)}",
                "sub": (f"{'+' if (var or 0) >= 0 else ''}{var}% no dia"
                        if var is not None else "fechamento do dia"),
                "subClass": "pos" if (var or 0) >= 0 else "neg"
            }]
            bloco["referencia"] = f"Indicador diário CEPEA · fechamento {data}"
            print(f"[ok] {chave}: {fmt_brl(valor)} ({var}%) em {data}")
        except Exception as e:
            print(f"[erro] {chave}: {e}", file=sys.stderr)
            falhas.append(chave)

    dados["meta"]["atualizado_em"] = datetime.now(TZ_BR).isoformat(timespec="seconds")
    ARQ.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")

    if falhas:
        print(f"[aviso] sem valor para: {', '.join(falhas)}", file=sys.stderr)
    print("dados.json atualizado.")


if __name__ == "__main__":
    atualizar()
