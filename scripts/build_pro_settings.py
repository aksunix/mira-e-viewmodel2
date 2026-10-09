#!/usr/bin/env python3
"""Coleta Sensitivity, DPI, Zoom Sensitivity e Hz de jogadores do ProSettings e grava um JSON
indexado por SteamID64 (o site le esse JSON e mostra o botao "Mouse" nos cards).

- Educado: 1 requisicao a cada --delay segundos, para ao receber 403/429.
- Incremental: guarda o que ja foi visto em "seen" e so refaz paginas mais antigas que --refresh-days.
- Cada execucao busca no maximo --max paginas; rode de novo (ou deixe o agendamento) para completar.
"""
import argparse, datetime as dt, json, os, re, sys, time
import requests
from bs4 import BeautifulSoup

BASE = "https://prosettings.net"
UA = "cs2-demo-analyzer-prosettings-sync/1.0 (projeto pessoal; 1 req a cada poucos segundos)"
FIELDS = {"sensitivity": "sensitivity", "dpi": "dpi", "edpi": "edpi",
          "zoom sensitivity": "zoom_sensitivity", "hz": "hz"}
S = requests.Session()
S.headers["User-Agent"] = UA


def norm(name):
    return re.sub(r"\s+", "", name).lower()


class Blocked(Exception):
    pass


class SteamBlocked(Exception):
    pass


def get(url, delay):
    time.sleep(delay)
    r = S.get(url, timeout=30)
    if r.status_code in (403, 429):
        raise Blocked(f"{r.status_code} em {url}")
    r.raise_for_status()
    return r.text


def player_urls(delay):
    index = get(BASE + "/sitemap_index.xml", delay)
    maps = [u for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", index) if "player" in u.lower()]
    urls = []
    for m in maps:
        for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", get(m, delay)):
            if re.search(r"/players/[^/]+/?$", u):
                urls.append(u.rstrip("/") + "/")
    return sorted(set(urls))


def parse_player(html):
    """Devolve (nome, steam_link, mouse_dict). mouse_dict vazio se nao houver tabela Mouse."""
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    name = h1.get_text(" ", strip=True) if h1 else ""
    steam = None
    for a in soup.find_all("a", href=True):
        if "steamcommunity.com" in a["href"]:
            steam = a["href"]
            break
    mouse = {}
    for h in soup.find_all(re.compile(r"^h[1-6]$")):
        if h.get_text(" ", strip=True).lower() == "mouse":
            table = h.find_next("table")
            if table:
                for tr in table.find_all("tr"):
                    cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
                    if len(cells) >= 2 and cells[0].lower() in FIELDS and cells[1]:
                        mouse[FIELDS[cells[0].lower()]] = cells[1]
            if mouse:
                break
    return name, steam, mouse


def steam_id64(link, delay):
    m = re.search(r"/profiles/(\d{17})", link)
    if m:
        return m.group(1)
    m = re.search(r"/id/([^/?#]+)", link)
    if not m:
        return None
    try:
        xml = get(f"https://steamcommunity.com/id/{m.group(1)}/?xml=1", delay)
    except Blocked as e:
        raise SteamBlocked(str(e))
    m = re.search(r"<steamID64>(\d{17})</steamID64>", xml)
    return m.group(1) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/pro-settings.json")
    ap.add_argument("--max", type=int, default=400)
    ap.add_argument("--priority", default="data/priority-players.txt")
    ap.add_argument("--delay", type=float, default=2.0)
    ap.add_argument("--refresh-days", type=int, default=60)
    a = ap.parse_args()

    data = {"players": {}, "names": {}, "seen": {}, "pending": {}}
    if os.path.exists(a.out):
        with open(a.out, encoding="utf-8") as f:
            data.update(json.load(f))
    today = dt.date.today()

    def stale(url):
        d = data["seen"].get(url)
        return d is None or (today - dt.date.fromisoformat(d)).days >= a.refresh_days

    # jogadores prioritarios (data/priority-players.txt, um slug por linha) sao buscados primeiro
    prio = []
    if os.path.exists(a.priority):
        with open(a.priority, encoding="utf-8") as f:
            prio = [f"{BASE}/players/{l.strip().lower()}/" for l in f if l.strip() and not l.startswith("#")]
    have = {v.get("url") for v in list(data["players"].values()) + list(data["names"].values())}
    prio_todo = [u for u in prio if u not in have or stale(u)]

    urls = []
    try:
        urls = player_urls(a.delay)
    except (Blocked, requests.RequestException) as e:
        print("aviso: nao consegui ler o sitemap:", e)
    rest = sorted((u for u in urls if stale(u) and u not in prio_todo), key=lambda u: data["seen"].get(u, ""))
    todo = (prio_todo + rest)[: a.max]
    print(f"{len(urls)} jogadores no sitemap; {len(prio_todo)} prioritarios; {len(todo)} para buscar agora")
    no_mouse_logged = 0
    steam_ok = True

    # tenta resolver SteamIDs que ficaram pendentes por limite do Steam em execucoes anteriores
    for url, info in list(data["pending"].items())[:150]:
        try:
            sid = steam_id64(info["steam"], 3.0)
        except SteamBlocked as e:
            print("Steam limitou as consultas; pendentes ficam para a proxima execucao:", e)
            steam_ok = False
            break
        except requests.RequestException:
            continue
        entry = data["names"].get(info["name"])
        if sid and entry:
            data["players"][sid] = entry
        data["pending"].pop(url)

    try:
        for i, url in enumerate(todo, 1):
            try:
                html = get(url, a.delay)
                name, steam, mouse = parse_player(html)
                if url in prio_todo:
                    print(f"[prioridade] {url} nome={name!r} steam={'sim' if steam else 'nao'} campos={sorted(mouse)}")
                if mouse:
                    entry = {"name": name, "url": url, **mouse}
                    if name:
                        data["names"][norm(name)] = entry
                    sid = None
                    if steam and steam_ok:
                        try:
                            sid = steam_id64(steam, 3.0)
                        except SteamBlocked as e:
                            print("Steam limitou as consultas; seguindo so com o nome:", e)
                            steam_ok = False
                    if sid:
                        data["players"][sid] = entry
                    elif steam and name:
                        data["pending"][url] = {"steam": steam, "name": norm(name)}
                elif no_mouse_logged < 5:
                    no_mouse_logged += 1
                    heads = [h.get_text(" ", strip=True) for h in BeautifulSoup(html, "html.parser").find_all(re.compile(r"^h[1-6]$"))][:15]
                    print(f"sem tabela Mouse em {url}; titulos encontrados: {heads}")
                data["seen"][url] = today.isoformat()
            except requests.RequestException as e:
                print("erro (pulando):", url, e)
            if i % 50 == 0:
                print(i, "paginas")
    except Blocked as e:
        print("Bloqueado, parando por hoje:", e)

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    print("com SteamID:", len(data["players"]), "| por nome:", len(data["names"]), "| SteamID pendente:", len(data["pending"]))


if __name__ == "__main__":
    sys.exit(main())
