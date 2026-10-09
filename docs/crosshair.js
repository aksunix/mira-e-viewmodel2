// Decodifica o crosshair code do CS2 ("CS" + 44 caracteres) e calcula as formas para desenhar a mira.
// Formato conforme a biblioteca de codigo aberto csxhair (SyberiaK/csxhair).
(function (root) {
  const ALPHABET = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
  const CODE_RE = /^CS[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{44}$/;

  function decodeCrosshair(code) {
    code = String(code || '').trim();
    if (!CODE_RE.test(code)) return null;

    let num = 0n;
    const chars = code.slice(2);
    for (let i = chars.length - 1; i >= 0; i--) {
      num = num * 57n + BigInt(ALPHABET.indexOf(chars[i]));
    }
    const hex = num.toString(16).padStart(64, '0');
    if (hex.length !== 64) return null;
    const b = [];
    for (let i = 0; i < 64; i += 2) b.push(parseInt(hex.slice(i, i + 2), 16));

    let sum = 0;
    for (let i = 1; i < b.length; i++) sum += b[i];
    if (b[0] !== sum % 256) return null;

    const gapRaw = b[14] | (b[15] << 8);
    const dyn = (b[18] | (b[19] << 8) | (b[20] << 16) | (b[21] << 24)) >>> 0;
    return {
      style: b[4] & 31,
      recoil: !!(b[4] & 32),
      dot: !!(b[4] & 64),
      t: !!(b[4] & 128),
      color: [b[5], b[6], b[7], b[8]],
      outlineColor: [b[9], b[10], b[11], b[12]],
      thickness: b[13] & 31,
      drawOutline: (b[13] >> 6) & 3,
      gap: gapRaw >= 0x8000 ? gapRaw - 0x10000 : gapRaw,
      length: b[16],
      spreadLimit: b[17],
      splitDist: b[18] & 127,
      splitAlphaInner: Math.round(((dyn >>> 7) & 127)) / 100,
      splitAlphaOuter: Math.round(((dyn >>> 14) & 127)) / 100 + 0.3,
      splitRatio: Math.round(((dyn >>> 21) & 127)) / 100,
      ironsightUseColor: !!(b[21] & 16),
      ironsightDotScale: 0.1 + b[22] / 100,
      screenHeight: b[2] | (b[3] << 8),
    };
  }

  // Formas em "unidades do jogo", com o centro da mira em (0, 0).
  // E uma aproximacao estatica (sem o espalhamento ao atirar/andar).
  function crosshairShapes(xh) {
    const t = Math.max(xh.thickness, 0.5), L = xh.length, g = xh.gap;
    const rects = [];
    let ring = null;
    const isCircle = xh.style === 1 || xh.style === 3;
    const dotOnly = xh.style === 6;

    if (isCircle) {
      ring = { r: Math.max(g + L, 2), w: t };
    } else if (!dotOnly) {
      rects.push({ x: g, y: -t / 2, w: L, h: t });            // direita
      rects.push({ x: -(g + L), y: -t / 2, w: L, h: t });     // esquerda
      rects.push({ x: -t / 2, y: g, w: t, h: L });            // baixo
      if (!xh.t) rects.push({ x: -t / 2, y: -(g + L), w: t, h: L }); // cima (o estilo T nao tem)
    }
    if (xh.dot || dotOnly) rects.push({ x: -t / 2, y: -t / 2, w: t, h: t });

    let extent = 2;
    for (const r of rects) {
      extent = Math.max(extent, Math.abs(r.x), Math.abs(r.y), Math.abs(r.x + r.w), Math.abs(r.y + r.h));
    }
    if (ring) extent = Math.max(extent, ring.r + ring.w);
    if (xh.drawOutline) extent += 1;
    return { rects, ring, extent, outline: xh.drawOutline ? 1 : 0 };
  }

  const api = { decodeCrosshair, crosshairShapes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof self !== 'undefined' ? self : this);
