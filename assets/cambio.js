// Lê dados/cambio.json e desenha os cards de câmbio (USD/BRL e EUR/BRL).
// Estilo embutido — não depende do CSS do painel. Carregue com:
//   <script src="assets/cambio.js" defer></script>
(function () {
  // ---- estilo (injetado uma única vez) ----
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

  async function render() {
    const alvo = document.querySelector("#cambio-cards");
    if (!alvo) return; // sem o contêiner no HTML, não faz nada

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

      alvo.replaceChildren(grid, fonte);
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
