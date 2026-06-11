// Busca a cotação PTAX de fechamento (USD/BRL e EUR/BRL) na API Olinda do
// Banco Central e grava em dados/cambio.json.
// Sem dependências externas: usa o fetch nativo (Node 18+).

import { writeFile, mkdir } from "node:fs/promises";

const OLINDA = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";

// A PTAX só é publicada em dias úteis. Buscamos uma janela dos últimos 12 dias
// para garantir pelo menos dois fechamentos, mesmo com feriados e fim de semana.
function formataData(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`; // formato exigido pela API: MM-DD-AAAA
}

const hoje = new Date();
const inicio = new Date();
inicio.setDate(hoje.getDate() - 12);
const dataInicial = formataData(inicio);
const dataFinal = formataData(hoje);

async function busca(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ao acessar ${url}`);
  const json = await r.json();
  return json.value ?? [];
}

// Reduz a lista de boletins para um fechamento por dia (descarta abertura e
// boletins intermediários) e devolve ordenado do mais antigo ao mais recente.
function fechamentosPorDia(itens) {
  const soFechamento = itens.filter(
    (it) => !it.tipoBoletim || /Fechamento/i.test(it.tipoBoletim)
  );
  const base = soFechamento.length ? soFechamento : itens;
  const porDia = new Map();
  for (const it of base) {
    const dia = it.dataHoraCotacao.slice(0, 10); // "AAAA-MM-DD"
    porDia.set(dia, it); // o último de cada dia prevalece
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dia, it]) => ({ dia, ...it }));
}

function montaMoeda(fechamentos, nome) {
  if (!fechamentos.length) {
    throw new Error(`Nenhum fechamento encontrado para ${nome}`);
  }
  const atual = fechamentos[fechamentos.length - 1];
  const anterior = fechamentos[fechamentos.length - 2];
  const venda = Number(atual.cotacaoVenda);
  const compra = Number(atual.cotacaoCompra);

  let variacaoAbs = null;
  let variacaoPct = null;
  if (anterior) {
    const vendaAnterior = Number(anterior.cotacaoVenda);
    variacaoAbs = +(venda - vendaAnterior).toFixed(4);
    variacaoPct = +(((venda - vendaAnterior) / vendaAnterior) * 100).toFixed(2);
  }

  return {
    venda: +venda.toFixed(4),
    compra: +compra.toFixed(4),
    data: atual.dia,
    variacaoAbs,
    variacaoPct,
  };
}

async function main() {
  // USD/BRL — endpoint dedicado ao dólar.
  const usdItens = await busca(
    `${OLINDA}/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
      `?@dataInicial='${dataInicial}'&@dataFinalCotacao='${dataFinal}'&$format=json`
  );

  // EUR/BRL — endpoint genérico por moeda (cotacaoVenda já vem em BRL por euro).
  const eurItens = await busca(
    `${OLINDA}/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
      `?@moeda='EUR'&@dataInicial='${dataInicial}'&@dataFinalCotacao='${dataFinal}'&$format=json`
  );

  const saida = {
    atualizadoEm: new Date().toISOString(),
    fonte: "PTAX · Banco Central do Brasil",
    moedas: {
      USDBRL: montaMoeda(fechamentosPorDia(usdItens), "USD/BRL"),
      EURBRL: montaMoeda(fechamentosPorDia(eurItens), "EUR/BRL"),
    },
  };

  await mkdir("dados", { recursive: true });
  await writeFile("dados/cambio.json", JSON.stringify(saida, null, 2) + "\n");
  console.log("cambio.json atualizado:", JSON.stringify(saida.moedas));
}

main().catch((err) => {
  console.error("Falha ao atualizar câmbio:", err.message);
  process.exit(1);
});
