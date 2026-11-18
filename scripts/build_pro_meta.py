#!/usr/bin/env python3
"""Coleta o Top 20 e o time de cada jogador na listagem de CS2 do ProSettings
(https://prosettings.net/games/cs2/ e /page/N/) e grava data/pro-meta.json:

  {"updated": "AAAA-MM-DD",
   "top":     [{"nick", "slug"}, ...]               # secao "Top CS2 Players" da pagina 1, na ordem do site
   "players": [{"nick", "slug", "team"}, ...]}      # todos os cards com time (sem Free Agent / Content Creator)

- Educado: 1 requisicao a cada --delay segundos; para ao receber 403/429.
- Se a coleta falhar ou voltar vazia, o arquivo anterior e mantido.
"""
import argparse, datetime as dt, json, os, re, sys, time
import requests
from bs4 import BeautifulSoup

BASE = "https://prosettings.net/games/cs2/"
UA = "cs2-demo-analyzer-prosettings-sync/1.0 (projeto pessoal; 1 req a cada poucos segundos)"
NOT_TEAMS = {"free agent", "content creator", "streamer", "retired", "coach", "analyst", "inactive", "none", ""}


def player_slug(href):
    m = re.search(r"/players/([^/#?]+)", href or "")
    return m.group(1).lower() if m else None


def parse_cards(html):
    """Devolve [{nick, slug, team}] (team vazio se for 'Free Agent' etc.), na ordem da pagina."""
    soup = BeautifulSoup(html, "html.parser")
    out, seen = [], set()
    for h in soup.find_all(["h3", "h4"]):
        a = h.find("a", href=re.compile(r"/players/"))
        if not a:
            continue
        slug, nick = player_slug(a["href"]), a.get_text(" ", strip=True)
        if not slug or not nick or slug in seen:
            continue
        # sobe ate o maior ancestral que ainda tem so um jogador: esse e o card
        card = h
        while card.parent is not None and card.parent.name not in ("body", "html"):
            if len({player_slug(x["href"]) for x in card.parent.find_all("a", href=re.compile(r"/players/"))}) > 1:
                break
            card = card.parent
        team = ""
        for t in card.find_all("a", href=re.compile(r"/(teams?|organi[sz]ations?)/")):
            team = t.get_text(" ", strip=True)
            if team:
                break
        if not team:  # sem link de time: procura texto curto que nao seja o nick
            for s in card.stripped_strings:
                if s.lower() != nick.lower() and 1 < len(s) <= 40 and s.lower() not in ("follow", "cs2"):
                    team = s
                    break
        if team.lower() in NOT_TEAMS:
            team = ""
        seen.add(slug)
        out.append({"nick": nick, "slug": slug, "team": team})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/pro-meta.json")
    ap.add_argument("--max-pages", type=int, default=60)
    ap.add_argument("--delay", type=float, default=3.0)
    a = ap.parse_args()
    s = requests.Session()
    s.headers["User-Agent"] = UA
    top, players, seen = [], [], set()
    for n in range(1, a.max_pages + 1):
        url = BASE if n == 1 else f"{BASE}page/{n}/"
        time.sleep(a.delay)
        r = s.get(url, timeout=30)
        if r.status_code in (403, 429):
            print("bloqueado em", url, r.status_code)
            break
        if r.status_code == 404:
            break
        r.raise_for_status()
        cards = parse_cards(r.text)
        if not cards:
            break
        if n == 1:
            top = [{"nick": c["nick"], "slug": c["slug"]} for c in cards[:20]]
        for c in cards:
            if c["slug"] not in seen:
                seen.add(c["slug"])
                if c["team"]:
                    players.append(c)
    if not top or not players:
        print("coleta vazia; mantendo o arquivo anterior")
        return 0
    data = {"updated": dt.date.today().isoformat(), "top": top, "players": players}
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"{len(top)} no top, {len(players)} jogadores com time")
    return 0


if __name__ == "__main__":
    sys.exit(main())
