# Painel de mercado AgroForte · CEPEA

Site estático que mostra os indicadores do CEPEA/ESALQ, com atualização
automática diária via GitHub Actions. Hospedagem gratuita no GitHub Pages.

```
painel-agroforte/
├── index.html              # o painel (lê dados.json)
├── dados.json              # os dados (o robô reescreve isso todo dia)
├── atualizar_cepea.py      # robô que busca os indicadores no CEPEA
├── requirements.txt        # dependências do robô
└── .github/workflows/
    └── atualizar.yml       # agenda diária (GitHub Actions)
```

---

## Como subir (≈ 15 min, tudo grátis)

**1. Criar o repositório**
- Crie uma conta no GitHub (se não tiver) e um repositório **público**
  chamado, por ex., `painel-agroforte`.
- Suba todos os arquivos desta pasta (botão *Add file → Upload files*,
  arrastando inclusive a pasta `.github`).

**2. Ligar o GitHub Pages (gera o link compartilhável)**
- No repositório: **Settings → Pages**.
- Em *Source*, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
- Salve. Em ~1 min o site fica no ar em:
  `https://SEU-USUARIO.github.io/painel-agroforte/`
- **Esse é o link que você manda pras pessoas.** É público — qualquer um
  com o link acessa, sem login.

**3. Ligar a atualização automática**
- Aba **Actions** → habilite os workflows (botão verde, se aparecer).
- O robô roda sozinho **de seg a sex, 9h30 (horário de Brasília)**.
- Pra testar agora: **Actions → "Atualizar painel CEPEA" → Run workflow**.
  Ele busca os indicadores, reescreve `dados.json` e faz commit. O Pages
  republica em seguida.

Pronto. A partir daí é automático.

---

## Antes de confiar no automático: rode o robô uma vez

O CEPEA **não tem API** — o robô lê as páginas e extrai o valor. Se eles
mexerem no HTML, o seletor pode precisar de um ajuste. Rode local antes:

```bash
pip install -r requirements.txt
python atualizar_cepea.py
```

Abra o `dados.json` e confira se os valores de **boi / milho / soja**
vieram certos. Se algum vier vazio, ajuste a função
`pegar_valor_indicador` no `atualizar_cepea.py` (tem comentário marcando onde).

> Pra abrir o `index.html` no seu PC durante os testes, use um servidor local
> (`python -m http.server`) e acesse `http://localhost:8000`. Aberto direto
> com 2 cliques (`file://`) o navegador bloqueia o `dados.json` — nesse caso
> o painel cai num dado embutido de exemplo.

---

## Sobre leite e aves de corte (atualização manual)

Dois blocos não entram no robô diário, de propósito:

- **Leite** é indicador **mensal** — o CEPEA publica o preço por estado uma vez
  por mês. Valores atuais: última série por estado verificada (**fev/26**,
  Média Brasil R$ 2,1464). A Média já subiu desde então (mar +10,5%, 4ª alta
  em abril); atualize o detalhe por UF pela divulgação oficial mais recente.
- **Aves de corte (frango)** tem dois indicadores no atacado SP (congelado e
  resfriado). Ficam semeados com a última divulgação verificada (congelado
  **R$ 7,48/kg**, mai/26 parcial; resfriado **R$ 7,18/kg**, abr/26). Deixei
  fora do robô automático porque a página do CEPEA traz vários valores juntos
  e um parse errado sobrescreveria dado bom — mais seguro atualizar à mão.

Pra atualizar qualquer um, edite o bloco correspondente (`"leite"` ou
`"frango"`) no `dados.json` e suba o arquivo. O robô continua cuidando sozinho
de **boi / milho / soja** (diários).

---

## Alternativa sem manutenção: widget oficial do CEPEA

Se você não quiser manter o robô, o CEPEA tem um **widget oficial** pra
embutir cotações que se atualizam sozinhas no lado deles, sem raspagem e
sem zona cinzenta de licença:
`https://www.cepea.esalq.usp.br/br/widget.aspx`
Gere o snippet lá e cole como um card no `index.html`. Bom pros indicadores
diários (boi/milho/soja). O leite por estado continua manual.

---

## Licença e uso

Dados: **CEPEA/ESALQ — CC BY-NC 4.0**. Cite a fonte (já está no rodapé do
painel). A licença é **não-comercial**: uso interno numa empresa com fins
lucrativos (caso da AgroForte) normalmente é considerado comercial. Antes de
publicar isso oficialmente, vale falar com o CEPEA sobre o serviço de
licenciamento/consulta de dados deles. Pra estudo/protótipo, sem problema.
