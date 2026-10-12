#!/usr/bin/env python3
"""Coleta a mira atual de cada jogador profissional em procrosshairs.com e grava data/crosshairs.json.

- Le a pagina inicial do site (e as paginas seguintes, se houver paginacao) e, para cada jogador,
  pega o nome, o SteamID64 (da URL /player/<steamid>/<nick>) e o codigo da mira (texto alternativo da imagem).
- O procrosshairs NAO informa a data da mira. A data gravada ("since") e o dia em que ESTE projeto
  viu aquele codigo pela primeira vez; se o codigo mudar, a data passa a ser a da mudanca.
- Educado: poucas requisicoes (uma por pagina), pausa entre elas, para ao receber 403/429.
- Rodar a cada 2 dias pelo GitHub Actions (.github/workflows/update-crosshairs.yml).
"""
import argparse, datetime as dt, json, os, re, sys, time
import requests
from bs4 import BeautifulSoup

BASE = "https://procrosshairs.com"
UA = "cs2-extract-crosshairs-sync/1.0 (projeto pessoal; poucas requisicoes a cada 2 dias)"
ALPHA = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789"
CODE = re.compile(r"\b(CS[" + ALPHA + r"]{44})\b")
ALT = re.compile(r"^(.*?)\s*Crosshair:\s*(CS[" + ALPHA + r"]{44})\s*$", re.S)
PLAYER = re.compile(r"/player/(\d{17})/([^/?#\"']+)")


def norm(name):
    return re.sub(r"\s+", "", name).lower()


def code_from(container, handle):
    """Procura, dentro do container, o <img> cujo alt e '<nome> Crosshair: <codigo>'."""
    found = []
    for img in container.find_all("img"):
        m = ALT.match((img.get("alt") or "").strip())
        if m:
            found.append((m.group(1).strip(), m.group(2)))
    if not found:
        return None
    for n, c in found:
        if norm(n) == norm(handle):
            return c
    return found[0][1] if len(found) == 1 else None


def parse(html):
    """Devolve lista de dicts {steamid, handle, name, code, url}."""
    soup = BeautifulSoup(html, "html.parser")
    out, seen = [], set()
    for a in soup.find_all("a", href=PLAYER):
        m = PLAYER.search(a["href"])
        sid, handle = m.group(1), m.group(2)
        if sid in seen:
            continue
        box, code = a, None
        for _ in range(4):  # sobe poucos niveis ate achar o card com a imagem da mira
            # nunca sobe para um bloco que contenha outros jogadores (evita pegar a mira do vizinho)
            ids = {PLAYER.search(x["href"]).group(1) for x in box.find_all("a", href=PLAYER)}
            if box is not a and len(ids | {sid}) > 1:
                break
            code = code_from(box, handle)
            if code or box.parent is None:
                break
            box = box.parent
        if not code:
            continue
        seen.add(sid)
        out.append({"steamid": sid, "handle": handle, "code": code,
                    "url": f"{BASE}/player/{sid}/{handle}"})
    return out


def next_pages(html):
    """Links de paginacao (?page=N ou /page/N), se existirem."""
    soup = BeautifulSoup(html, "html.parser")
    urls = []
    for a in soup.find_all("a", href=True):
        if re.search(r"([?&]page=\d+|/page/\d+)", a["href"]):
            u = a["href"] if a["href"].startswith("http") else BASE + (a["href"] if a["href"].startswith("/") else "/" + a["href"])
            if u.startswith(BASE) and u not in urls:
                urls.append(u)
    return urls


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/crosshairs.json")
    ap.add_argument("--delay", type=float, default=3.0)
    ap.add_argument("--max-pages", type=int, default=30)
    a = ap.parse_args()

    data = {"players": {}, "updated": None}
    if os.path.exists(a.out):
        with open(a.out, encoding="utf-8") as f:
            data.update(json.load(f))
    today = dt.date.today().isoformat()

    s = requests.Session()
    s.headers["User-Agent"] = UA
    queue, done, entries = [BASE + "/"], set(), []
    while queue and len(done) < a.max_pages:
        url = queue.pop(0)
        if url in done:
            continue
        done.add(url)
        if len(done) > 1:
            time.sleep(a.delay)
        try:
            r = s.get(url, timeout=30)
        except requests.RequestException as e:
            print("erro:", url, e)
            continue
        if r.status_code in (403, 429):
            print(f"Bloqueado ({r.status_code}) em {url}; parando.")
            break
        if not r.ok:
            print("HTTP", r.status_code, url)
            continue
        got = parse(r.text)
        print(f"{url}: {len(got)} jogadores")
        entries += got
        for u in next_pages(r.text):
            if u not in done and u not in queue:
                queue.append(u)

    changed = new = 0
    for e in entries:
        key_id, key_name = "id:" + e["steamid"], norm(e["handle"])
        old = data["players"].get(key_id)
        if old and old.get("code") == e["code"]:
            since = old.get("since", today)
        else:
            since = today
            changed += 1 if old else 0
            new += 0 if old else 1
        rec = {"name": e["handle"], "steamid": e["steamid"], "code": e["code"], "since": since, "url": e["url"]}
        data["players"][key_id] = rec
        data["players"][key_name] = rec
    if entries:
        data["updated"] = today
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"jogadores lidos: {len(entries)} | novos: {new} | mira trocada: {changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
