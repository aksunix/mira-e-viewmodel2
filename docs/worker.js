// Web Worker: carrega o analisador em WebAssembly e processa o demo fora da thread da pagina,
// assim a tela nao trava durante a leitura.
importScripts('wasm_exec.js?v=20261117-rc2');

const go = new Go();

async function load() {
  let result;
  try {
    result = await WebAssembly.instantiateStreaming(fetch('parser.wasm?v=20261117-rc2'), go.importObject);
  } catch (e) {
    // servidores que nao enviam o tipo application/wasm
    const resp = await fetch('parser.wasm?v=20261117-rc2');
    result = await WebAssembly.instantiate(await resp.arrayBuffer(), go.importObject);
  }
  go.run(result.instance); // o Go avisa "ready" quando estiver pronto
}

// fatal: true faz a pagina travar o envio de arquivos em vez de liberar a caixa com um analisador que nao existe
load().catch(err => postMessage({ type: 'error', fatal: true, message: 'não foi possível carregar o analisador: ' + err.message }));

onmessage = e => {
  if (typeof self.parseDemo !== 'function') {
    postMessage({ type: 'error', message: 'o analisador ainda não terminou de carregar' });
    return;
  }
  self.parseDemo(e.data.file);
};
