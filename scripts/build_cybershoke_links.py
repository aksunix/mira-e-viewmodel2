#!/usr/bin/env python3
"""Coleta o perfil da FACEIT e da HLTV de cada jogador pela API do CyberShoke e grava data/cybershoke-links.json.

O navegador nao pode consultar o CyberShoke direto (CORS), entao isso roda no GitHub Actions.
- Consulta: POST https://cybershoke.net/api/user/data  {"steamid64": "<SteamID64 ou nick>"}
- Jogadores: os de data/pro-settings.json (nick e, se existir, SteamID)
  + os nicks extras de data/cybershoke-extra.txt (um por linha).
- Educado: 1 requisicao a cada --delay segundos, para ao receber 403/429; incremental (--refresh-days).
"""
import argparse, datetime as dt, json, os, re, sys, time
import requests

URL = "https://cybershoke.net/api/user/data"
UA = "cs2-demo-analyzer-links-sync/1.0 (projeto pessoal; 1 req a cada poucos segundos)"


def norm(name):
    return re.sub(r"\s+", "", name).lower()


def find_key(o, key, depth=0):
    if not isinstance(o, dict) or depth > 4:
        return None
    if isinstance(o.get(key), dict):
        return o[key]
    for v in o.values():
        r = find_key(v, key, depth + 1)
        if r:
            return r
    return None


def ok_url(u, host):
    return isinstance(u, str) and re.match(r"^https://([\w-]+\.)*" + re.escape(host) + r"/", u) is not None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pro", default="data/pro-settings.json")
    ap.add_argument("--extra", default="data/cybershoke-extra.txt")
    ap.add_argument("--out", default="data/cybershoke-links.json")
    ap.add_argument("--url", default=URL)
    ap.add_argument("--max", type=int, default=300)
    ap.add_argument("--delay", type=float, default=2.0)
    ap.add_argument("--refresh-days", type=int, default=30)
    a = ap.parse_args()

    out = {"links": {}, "checked": {}}
    if os.path.exists(a.out):
        with open(a.out, encoding="utf-8") as f:
            out.update(json.load(f))

    people = {}  # chave normalizada -> (nome, argumento da consulta)
    if os.path.exists(a.extra):
        with open(a.extra, encoding="utf-8") as f:
            for line in f:
                n = line.strip()
                if n and not n.startswith("#"):
                    people[norm(n)] = (n, [n])
    if os.path.exists(a.pro):
        with open(a.pro, encoding="utf-8") as f:
            pro = json.load(f)
        sid_by_url = {e.get("url"): sid for sid, e in pro.get("players", {}).items()}
        for k, e in pro.get("names", {}).items():
            if e.get("name"):
                sid = sid_by_url.get(e.get("url"))
                people[k] = (e["name"], [e["name"]] + ([sid] if sid else []))

    today = dt.date.today()

    def stale(k):
        d = out["checked"].get(k)
        return d is None or (today - dt.date.fromisoformat(d)).days >= a.refresh_days

    todo = sorted((k for k in people if stale(k)), key=lambda k: out["checked"].get(k, ""))[: a.max]
    print(f"{len(people)} jogadores; {len(todo)} para consultar agora")
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Content-Type": "application/json"})
    found = errors = 0
    for i, k in enumerate(todo, 1):
        name, args = people[k]
        entry = {}
        stop = False
        for arg in args:
            time.sleep(a.delay)
            try:
                r = s.post(a.url, json={"steamid64": str(arg)}, timeout=30)
            except requests.RequestException as e:
                print("erro (pulando):", name, e)
                errors += 1
                stop = errors >= 10
                break
            if r.status_code in (403, 429):
                print(f"Bloqueado ({r.status_code}), parando por hoje")
                stop = True
                break
            if not r.ok:
                print("HTTP", r.status_code, "para", name, arg)
                errors += 1
                continue
            errors = 0
            try:
                j = r.json()
            except ValueError:
                print("resposta nao e JSON para", name)
                continue
            f, h = find_key(j, "faceit"), find_key(j, "hltv")
            if f and not f.get("hide") and ok_url(f.get("url"), "faceit.com"):
                entry["faceit"] = {k2: f[k2] for k2 in ("name", "url", "skill_level", "elo") if k2 in f}
            if h and not h.get("hide") and ok_url(h.get("url"), "hltv.org"):
                entry["hltv"] = {k2: h[k2] for k2 in ("name", "url") if k2 in h}
            if entry:
                break
        if stop:
            break
        if entry:
            entry["name"] = name
            out["links"][k] = entry
            found += 1
        out["checked"][k] = today.isoformat()
        if i % 50 == 0:
            print(i, "consultas")

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1, sort_keys=True)
    print("novos nesta execucao:", found, "| total com links:", len(out["links"]))


if __name__ == "__main__":
    sys.exit(main())
