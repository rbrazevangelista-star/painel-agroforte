// Lê dados/cambio.json e desenha os cards de câmbio (USD/BRL e EUR/BRL)
// + a leitura de impacto nas culturas. Estilo embutido; o bloco de impacto
// usa a classe .context do painel (mesma caixinha verde dos "Impactos").
//   <script src="assets/cambio.js" defer></script>
(function () {
  // ---- estilo dos cards (injetado uma única vez) ----
  const css = `
    .af-cambio-grid{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}
    .af-cambio-card{flex:1 1 170px;border:1px solid rgba(0,0,0,.10);
      border-radius:14px;padding:14px 16px;background:#fff;
      box-shadow:0 1px 3px rgba(0,0,0,.05)}
    .af-cambio-rotulo{display:block;font-size:.78rem;letter-spacing:.02em;
      text-transform:uppercase;color:#6b7280;margin-bottom:6px}
    .af-cambio-valor{display:block;font-size:1.55rem;font-weight:700;
      color:#111827;font-variant-numeric:tabular-nums;line-height:1.1}
    .af-cambio-var{display:inline-block;margin-top:8px;font-size:.85rem;
      font-weight:600;font-variant-numeric:tabular-nums}
    .af-cambio-var.alta{color:#15803d}
    .af-cambio-var.baixa{color:#b91c1c}
    .af-cambio-var.neutro{color:#6b7280}
    .af-cambio-fonte{font-size:.74rem;color:#6b7280;margin-top:10px}
  `;
  if (!document.getElementById("af-cambio-style")) {
    const s = document.createElement("style");
    s.id = "af-cambio-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  const fmtBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
    minimumFractionDigits: 4, maximumFractionDigits: 4,
  });
  const fmtPct = (n) =>
    n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2).replace(".", ",")}%`;

  const moedas = [
    { chave: "USDBRL", rotulo: "Dólar · USD/BRL" },
    { chave: "EURBRL", rotulo: "Euro · EUR/BRL" },
  ];

  // ---- bloco de impacto nas culturas (reativo à direção do dólar) ----
  function impactoBlock(dados) {
    const usd = dados.moedas && dados.moedas.USDBRL;
    const p = usd ? usd.variacaoPct : null;
    // limiar de 0,25% para não dramatizar oscilação pequena
    let titulo = "Como o câmbio lê nas culturas";
    if (p != null && p >= 0.25) {
      titulo = "Dólar em alta — vento a favor na receita de exportação, pressão no custo de insumos";
    } else if (p != null && p <= -0.25) {
      titulo = "Dólar em baixa — alívio no custo de insumos, menor prêmio de exportação";
    }

    const box = document.createElement("div");
    box.className = "context";
    box.innerHTML = `
      <h3>${titulo}</h3>
      <p>O dólar puxa dois lados opostos da carteira. Na <b>receita</b>:
      boi gordo, aves e suíno são fortemente exportados, e soja e milho seguem a
      paridade de exportação — dólar mais alto melhora o preço em reais e a
      capacidade de pagamento desses produtores. No <b>custo</b>: fertilizantes e
      defensivos são majoritariamente dolarizados, e a ração (milho e farelo de
      soja) encarece quando o dólar sobe, pressionando justamente as operações
      intensivas que compram insumo — aves, suíno, leite e ovos. O euro pesa nas
      vendas destinadas à União Europeia (carne bovina e de frango), na mesma direção.</p>
      <p class="small">Leitura de crédito: exportadores de proteína e vendedores de
      grão ganham pelo lado da receita; quem compra ração e insumo sente primeiro
      pelo custo. Em ciclos de dólar em alta, vale revisar margem e o timing de
      compra de insumos das operações confinadas/intensivas da carteira.</p>`;
    return box;
  }

  async function render() {
    const alvo = document.querySelector("#cambio-cards");
    if (!alvo) return;

    try {
      const r = await fetch("dados/cambio.json", { cache: "no-store" });
      if (!r.ok) throw new Error("cambio.json indisponível");
      const dados = await r.json();

      const grid = document.createElement("div");
      grid.className = "af-cambio-grid";
      grid.innerHTML = moedas
        .map(({ chave, rotulo }) => {
          const m = dados.moedas && dados.moedas[chave];
          if (!m) return "";
          let dir = "neutro", seta = "";
          if (m.variacaoPct != null) {
            dir = m.variacaoPct >= 0 ? "alta" : "baixa";
            seta = m.variacaoPct >= 0 ? "▲ " : "▼ ";
          }
          return `
            <div class="af-cambio-card">
              <span class="af-cambio-rotulo">${rotulo}</span>
              <span class="af-cambio-valor">${fmtBRL.format(m.venda)}</span>
              <span class="af-cambio-var ${dir}">${seta}${fmtPct(m.variacaoPct)}</span>
            </div>`;
        })
        .join("");

      const fonte = document.createElement("p");
      fonte.className = "af-cambio-fonte";
      const d = new Date(dados.atualizadoEm);
      fonte.textContent = `${dados.fonte} · atualizado em ${d.toLocaleString("pt-BR")}`;

      alvo.replaceChildren(grid, fonte, impactoBlock(dados));
    } catch (e) {
      console.error("Falha ao carregar câmbio:", e);
      alvo.textContent = "Câmbio indisponível no momento.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
