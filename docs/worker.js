// Web Worker: carrega o analisador em WebAssembly e processa o demo fora da thread da pagina,
// assim a tela nao trava durante a leitura.
importScripts('wasm_exec.js');

const go = new Go();

async function load() {
  let result;
  try {
    result = await WebAssembly.instantiateStreaming(fetch('parser.wasm'), go.importObject);
  } catch (e) {
    // servidores que nao enviam o tipo application/wasm
    const resp = await fetch('parser.wasm');
    result = await WebAssembly.instantiate(await resp.arrayBuffer(), go.importObject);
  }
  go.run(result.instance); // o Go avisa "ready" quando estiver pronto
}

load().catch(err => postMessage({ type: 'error', message: 'não foi possível carregar o analisador: ' + err.message }));

onmessage = e => {
  if (typeof self.parseDemo !== 'function') {
    postMessage({ type: 'error', message: 'o analisador ainda não terminou de carregar' });
    return;
  }
  self.parseDemo(e.data.file);
};
