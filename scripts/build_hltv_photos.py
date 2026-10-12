#!/usr/bin/env python3
"""Pega a foto de perfil de cada jogador na pagina dele na HLTV e grava em data/cybershoke-links.json
(campo links[<nick>].hltv.photo). O site usa essa foto no card da busca.

- Le o link da HLTV que ja foi coletado pelo CyberShoke (scripts/build_cybershoke_links.py).
- Educado: 1 requisicao a cada --delay segundos; para ao receber 403/429 (a HLTV usa Cloudflare e pode bloquear).
- Incremental: so busca quem ainda nao tem foto; --max limita cada execucao.
"""
import argparse, html, json, os, re, sys, time
import requests

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0 Safari/537.36")


def find_photo(page):
    for pat in (r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']'):
        m = re.search(pat, page, re.I)
        if m:
            u = html.unescape(m.group(1))
            if re.match(r"^https://img-cdn\.hltv\.org/playerbodyshot/", u):
                return u
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default="data/cybershoke-links.json")
    ap.add_argument("--max", type=int, default=400)
    ap.add_argument("--delay", type=float, default=3.0)
    a = ap.parse_args()
    if not os.path.exists(a.file):
        print("arquivo de links nao existe:", a.file)
        return 0
    with open(a.file, encoding="utf-8") as f:
        data = json.load(f)
    links = data.get("links", {})
    todo = [k for k, e in links.items()
            if e.get("hltv", {}).get("url") and not e["hltv"].get("photo") and not e["hltv"].get("no_photo")][: a.max]
    print(f"{len(todo)} jogadores sem foto para buscar agora")
    s = requests.Session()
    s.headers["User-Agent"] = UA
    got = errors = 0
    for i, k in enumerate(todo, 1):
        time.sleep(a.delay)
        try:
            r = s.get(links[k]["hltv"]["url"], timeout=30)
        except requests.RequestException as e:
            errors += 1
            print("erro (pulando):", k, e)
            if errors >= 10:
                break
            continue
        if r.status_code in (403, 429, 503):
            print(f"Bloqueado pela HLTV ({r.status_code}), parando por hoje")
            break
        if not r.ok:
            print("HTTP", r.status_code, k)
            errors += 1
            continue
        errors = 0
        photo = find_photo(r.text)
        if photo:
            links[k]["hltv"]["photo"] = photo
            got += 1
        else:
            links[k]["hltv"]["no_photo"] = True
        if i % 50 == 0:
            print(i, "paginas")
    with open(a.file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    print("fotos novas:", got)
    return 0


if __name__ == "__main__":
    sys.exit(main())
