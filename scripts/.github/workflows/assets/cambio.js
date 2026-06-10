// Lê dados/cambio.json e preenche o bloco de câmbio do painel.
// Vanilla JS, sem dependências. Carrega com <script src="assets/cambio.js" defer>.
(async function () {
  const fmtBRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

  const fmtPct = (n) =>
    n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2).replace(".", ",")}%`;

  const moedas = [
    { chave: "USDBRL", rotulo: "Dólar · USD/BRL" },
    { chave: "EURBRL", rotulo: "Euro · EUR/BRL" },
  ];

  try {
    const r = await fetch("dados/cambio.json", { cache: "no-store" });
    if (!r.ok) throw new Error("cambio.json indisponível");
    const dados = await r.json();

    const alvo = document.querySelector("#cambio-cards");
    if (alvo) {
      alvo.innerHTML = moedas
        .map(({ chave, rotulo }) => {
          const m = dados.moedas[chave];
          if (!m) return "";
          const dir =
            m.variacaoPct == null ? "" : m.variacaoPct >= 0 ? "alta" : "baixa";
          return `
            <div class="cambio-card ${dir}">
              <span class="cambio-rotulo">${rotulo}</span>
              <span class="cambio-valor">${fmtBRL.format(m.venda)}</span>
              <span class="cambio-var">${fmtPct(m.variacaoPct)}</span>
            </div>`;
        })
        .join("");
    }

    const carimbo = document.querySelector("#cambio-atualizado");
    if (carimbo) {
      const d = new Date(dados.atualizadoEm);
      carimbo.textContent = `${dados.fonte} · atualizado em ${d.toLocaleString(
        "pt-BR"
      )}`;
    }
  } catch (e) {
    console.error("Falha ao carregar câmbio:", e);
    const carimbo = document.querySelector("#cambio-atualizado");
    if (carimbo) carimbo.textContent = "Câmbio indisponível no momento.";
  }
})();
