# CS2 Demo Analyzer

Extrai o crosshair code e os comandos de viewmodel de cada jogador de um demo do CS2.
Tudo roda no navegador (Go compilado para WebAssembly): o .dem nao e enviado para nenhum servidor.

- `wasm/main.go`: analisador (Go -> WebAssembly)
- `docs/`: pagina do site e Web Worker
- `.github/workflows/pages.yml`: compila o `.wasm` e publica no GitHub Pages a cada push
