# CS2 Demo Analyzer (CS2 Extract)

Extrai a mira (crosshair code) e os comandos de viewmodel de cada jogador de um demo do CS2, e permite
pesquisar o perfil de jogadores profissionais (mira, mouse, vídeo e CFG).
A análise do demo roda no navegador (Go compilado para WebAssembly): o `.dem` não é enviado para nenhum servidor.

## Como funciona

- **Início:** arraste um `.dem`; cada jogador vira um card com a mira e o viewmodel. O rodapé do card tem
  Mouse, Vídeo (o card vira) e CFG (abre a configuração no CyberShoke).
- **Pesquisa:** busca um jogador profissional e mostra mira, mouse, vídeo, FACEIT e HLTV.
- **Histórico:** análises anteriores, salvas só no navegador (localStorage).

## Arquivos

- `wasm/main.go`: analisador (Go -> WebAssembly), usa `demoinfocs-golang`
- `docs/`: site (`index.html`, `crosshair.js` que desenha a mira, `worker.js`, `fonts/` hospedadas localmente)
- `data/`: dados coletados automaticamente (`pro-settings.json`, `crosshairs.json`, `cybershoke-links.json`, `cybershoke-extra.txt`)
- `scripts/`: coletores de dados em Python
  - `build_pro_settings.py`: mouse e resolução (prosettings.net), 400 páginas por execução
  - `build_crosshairs.py`: miras dos profissionais (procrosshairs.com)
  - `build_cybershoke_links.py`: perfis FACEIT/HLTV via CyberShoke
  - `build_hltv_photos.py`: fotos de perfil da HLTV

## Publicação (GitHub Actions)

- `pages.yml`: compila o `.wasm`, copia os dados para `docs/` e publica no GitHub Pages a cada push na `main`.
- `update-pro-settings.yml`: todo dia às 6h (UTC); também coleta FACEIT/HLTV e fotos.
- `update-crosshairs.yml`: a cada 2 dias.
- Para priorizar jogadores no ProSettings, crie `data/priority-players.txt` com um slug por linha (ex.: `m0nesy`).

## Observações

- O procrosshairs não informa a data da mira. O site só mostra "Mira trocada em ..." quando este projeto viu o código mudar.
- O botão CFG envia o SteamID do jogador ao CyberShoke; as buscas por FACEIT/HLTV abrem sites externos.
