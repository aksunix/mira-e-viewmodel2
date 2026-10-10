// Cloudflare Worker: busca a partida mais recente de um jogador na FACEIT e na HLTV.
// Existe porque a HLTV não tem API/CORS e a chave da FACEIT não pode ficar exposta no site.
// Secret necessário: FACEIT_API_KEY (wrangler secret put FACEIT_API_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (url.pathname !== '/api/player') return json({ error: 'not_found' }, 404);
    const name = (url.searchParams.get('name') || '').trim().slice(0, 40);
    if (!name) return json({ error: 'Informe o nome do jogador.' }, 400);

    const [faceit, hltv] = await Promise.all([
      safe(() => faceitLatest(name, env)),
      safe(() => hltvLatest(name)),
    ]);
    return json({ query: name, faceit, hltv }, 200, { 'Cache-Control': 'public, max-age=120' });
  },
};

// Nunca derruba a resposta inteira: cada fonte devolve { ok:true, ... } ou { ok:false, error }.
async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : 'Erro inesperado.' };
  }
}

/* ---------------- FACEIT (Data API v4) ---------------- */

async function faceitGet(path, env) {
  if (!env.FACEIT_API_KEY) throw new Error('Chave da FACEIT não configurada no Worker.');
  const r = await fetch('https://open.faceit.com/data/v4' + path, {
    headers: { Authorization: 'Bearer ' + env.FACEIT_API_KEY, Accept: 'application/json' },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('FACEIT respondeu ' + r.status + '.');
  return r.json();
}

async function faceitLatest(name, env) {
  const found = await faceitGet('/search/players?nickname=' + encodeURIComponent(name) + '&game=cs2&limit=10', env);
  const items = (found && found.items) || [];
  if (!items.length) return { ok: false, error: 'Jogador não encontrado na FACEIT.' };
  const player = items.find(p => p.nickname.toLowerCase() === name.toLowerCase()) || items[0];

  const hist = await faceitGet('/players/' + player.player_id + '/history?game=cs2&offset=0&limit=1', env);
  const m = hist && hist.items && hist.items[0];
  const profile = 'https://www.faceit.com/en/players/' + encodeURIComponent(player.nickname);
  if (!m) return { ok: false, error: 'Sem partidas de CS2 na FACEIT.', player: player.nickname, profile };

  const f1 = m.teams.faction1, f2 = m.teams.faction2;
  const mine = f1.players.some(p => p.player_id === player.player_id) ? 'faction1' : 'faction2';
  const theirs = mine === 'faction1' ? 'faction2' : 'faction1';
  const score = m.results && m.results.score;
  const out = {
    ok: true,
    player: player.nickname,
    country: player.country || '',
    profile,
    match_url: 'https://www.faceit.com/en/cs2/room/' + m.match_id,
    finished_at: m.finished_at ? m.finished_at * 1000 : null,
    team: m.teams[mine].nickname,
    opponent: m.teams[theirs].nickname,
    score: score ? { team: score[mine], opponent: score[theirs] } : null,
    won: m.results ? m.results.winner === mine : null,
  };

  // Estatísticas do jogador na partida (mapa, K/D...). Falha aqui não invalida o resto.
  try {
    const st = await faceitGet('/matches/' + m.match_id + '/stats', env);
    const round = st && st.rounds && st.rounds[0];
    if (round) {
      out.map = round.round_stats && round.round_stats.Map;
      for (const t of round.teams || []) {
        const p = (t.players || []).find(x => x.player_id === player.player_id);
        if (p) {
          const s = p.player_stats || {};
          out.kills = num(s.Kills); out.deaths = num(s.Deaths); out.assists = num(s.Assists);
          out.kd = s['K/D Ratio']; out.adr = s.ADR; out.hs = s['Headshots %'];
        }
      }
    }
  } catch (_) { /* ignora */ }
  return out;
}

const num = v => (v === undefined || v === null || v === '' ? null : Number(v));

/* ---------------- HLTV (scraping; pode ser bloqueado pelo Cloudflare deles) ---------------- */

async function hltvGet(path) {
  const r = await fetch('https://www.hltv.org' + path, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html' },
    redirect: 'follow',
  });
  if (r.status === 403 || r.status === 429 || r.status === 503) throw new Error('A HLTV bloqueou a consulta automática (' + r.status + ').');
  if (!r.ok) throw new Error('HLTV respondeu ' + r.status + '.');
  return r.text();
}

const strip = h => h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

async function hltvLatest(name) {
  const search = await hltvGet('/search?query=' + encodeURIComponent(name));
  // Links de jogadores nos resultados: /player/<id>/<slug>
  const re = /href="\/player\/(\d+)\/([^"]+)"/g;
  const seen = new Map();
  let mm;
  while ((mm = re.exec(search))) if (!seen.has(mm[1])) seen.set(mm[1], mm[2]);
  if (!seen.size) return { ok: false, error: 'Jogador não encontrado na HLTV.' };
  let id, slug;
  for (const [i, s] of seen) if (s.toLowerCase() === name.toLowerCase()) { id = i; slug = s; break; }
  if (!id) [id, slug] = [...seen][0];

  const profile = 'https://www.hltv.org/player/' + id + '/' + slug;
  const html = await hltvGet('/stats/players/matches/' + id + '/' + slug);
  const body = html.split(/<tbody/i)[1] || '';
  const row = (body.match(/<tr[\s\S]*?<\/tr>/i) || [])[0];
  if (!row) return { ok: false, error: 'Não consegui ler as partidas na HLTV.', player: slug, profile };

  const cells = [...row.matchAll(/<td[\s\S]*?<\/td>/gi)].map(c => strip(c[0]));
  const link = (row.match(/href="(\/stats\/matches\/mapstatsid\/[^"]+)"/) || [])[1];
  // Colunas: Data | Time | Adversário | Mapa | K-D | +/- | Rating
  const kd = (cells[4] || '').match(/(\d+)\s*-\s*(\d+)/);
  return {
    ok: true,
    player: slug,
    profile,
    match_url: link ? 'https://www.hltv.org' + link : profile,
    date: cells[0] || '',
    team: cells[1] || '',
    opponent: cells[2] || '',
    map: cells[3] || '',
    kills: kd ? +kd[1] : null,
    deaths: kd ? +kd[2] : null,
    rating: cells[6] || '',
  };
}
