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
KEYBOARD_PARSER_VERSION = "6"
UA = "cs2-demo-analyzer-prosettings-sync/1.0 (projeto pessoal; 1 req a cada poucos segundos)"
FIELDS = {"sensitivity": "sensitivity", "dpi": "dpi", "edpi": "edpi",
          "zoom sensitivity": "zoom_sensitivity", "hz": "hz"}
S = requests.Session()
S.headers["User-Agent"] = UA


def norm(name):
    return re.sub(r"\s+", "", name).lower()


def url_slug(url):
    m = re.search(r"/players/([^/#?]+)", url or "")
    return m.group(1).lower() if m else ""


def name_key(names, name, url):
    """Chave de data["names"] para o jogador. Normalmente e o nick normalizado, mas dois jogadores
    podem ter o mesmo nick (ex.: NiKo e niko-danish). Quem tem o slug igual ao nick fica com a chave
    do nick; o outro vai para a chave do proprio slug e ganha um sufixo no nome exibido."""
    k, slug = norm(name), url_slug(url)
    cur = names.get(k)
    if not cur or cur.get("url") == url:
        if slug and slug != k and not cur and slug.startswith(k + "-"):
            pass  # primeiro a chegar, mas nao e o dono "natural" do nick: segue para o slug abaixo
        else:
            return k, name
    if slug == k and cur:
        # o dono natural chegou depois: realoca o antigo para a chave do slug dele
        old_slug = url_slug(cur.get("url"))
        if old_slug and old_slug != k:
            names[old_slug] = {**cur, "name": f"{cur.get('name', name)} ({old_slug[len(k):].strip('-') or old_slug})"}
        names.pop(k, None)
        return k, name
    suffix = slug[len(k):].strip("-") if slug.startswith(k) else slug
    return slug or k, f"{name} ({suffix})" if suffix else name


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



def _comment_date(node):
    time_node = node.select_one("time[datetime]")
    if time_node:
        raw = (time_node.get("datetime") or "").strip()
        try:
            parsed = dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed.date().isoformat(), time_node.get_text(" ", strip=True) or raw[:10]
        except ValueError:
            pass
    date_node = node.select_one(".comment-metadata, .comment-date, .wpd-comment-date, .comment__date, time")
    display = date_node.get_text(" ", strip=True) if date_node else ""
    m = re.search(r"(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago", display, re.I)
    if m:
        n = int(m.group(1))
        unit = m.group(2).lower()
        days = {"minute": 0, "hour": 0, "day": 1, "week": 7, "month": 30, "year": 365}[unit] * n
        return (dt.date.today() - dt.timedelta(days=days)).isoformat(), display
    return "", display


def _comment_id(node):
    for attr in ("id", "data-comment-id", "data-id"):
        value = str(node.get(attr) or "").strip()
        if value.isdigit():
            return value
        m = re.search(r"(?:div-)?comment-(\d+)|wpd-(?:comm|comment)-(\d+)", value, re.I)
        if m:
            return next(group for group in m.groups() if group)
    return ""


def _setting_number(text, patterns):
    for pattern in patterns:
        m = re.search(pattern, text, re.I)
        if m:
            return m.group(1).replace(",", ".")
    return ""


def _setting_scope(text, setting):
    lower = text.lower()
    own_pattern = (
        r"\b(?:actuation(?:\s+point)?|action\s+point|act|ap)\b"
        if setting == "actuation" else
        r"\b(?:rapid(?:\s*trigger)?|rt)\b"
    )
    other_pattern = (
        r"\b(?:rapid(?:\s*trigger)?|rt)\b"
        if setting == "actuation" else
        r"\b(?:actuation(?:\s+point)?|action\s+point|act|ap)\b"
    )
    chunks = re.split(r"[|;\n]+", lower)
    chunk = next((part for part in chunks if re.search(own_pattern, part)), lower)
    match = re.search(own_pattern, chunk)
    if not match:
        return "Não informado", []

    tail = chunk[match.start():]
    other = re.search(other_pattern, tail[match.end() - match.start():])
    if other:
        tail = tail[:match.end() - match.start() + other.start()]
    prefix = chunk[max(0, match.start() - 90):match.start()]
    scope_context = prefix + " " + tail
    if setting == "rapid_trigger":
        previous_setting = list(re.finditer(other_pattern, prefix))
        if previous_setting:
            # Só herda teclas globais escritas antes da configuração de Actuation.
            before_previous_setting = prefix[:previous_setting[-1].start()]
            scope_context = before_previous_setting + " " + tail

    if re.search(r"\b(?:other|remaining|rest\s+of)\s+(?:keys|buttons)\b", scope_context):
        return "Demais teclas", []
    keys = []
    if re.search(r"\bwasd\b", scope_context):
        keys.extend(["W", "A", "S", "D"])
    scoped = re.search(
        r"(?:\bonly\b(?:\s+on)?|\b(?:on|for)\s+(?:the\s+)?|\bkeys?\s*[:=])\s*(.{1,55})",
        tail
    )
    if scoped:
        phrase = re.split(r"[.;]", scoped.group(1), maxsplit=1)[0]
        aliases = [
            (r"\bspace(?:bar)?\b", "Space"),
            (r"\bshift\b", "Shift"),
            (r"\b(?:ctrl|control)\b", "Ctrl"),
            (r"\balt\b", "Alt"),
            (r"\btab\b", "Tab"),
            (r"\bcaps(?:\s+lock)?\b", "Caps"),
            (r"\b(?:enter|return)\b", "Enter"),
            (r"\bbackspace\b", "Backspace"),
            (r"\b(?:delete|del)\b", "Del"),
            (r"\b(?:insert|ins)\b", "Ins"),
            (r"\b[a-z0-9]\b", None),
        ]
        for key_pattern, label in aliases:
            for token in re.findall(key_pattern, phrase):
                value = label or token.upper()
                if value not in keys:
                    keys.append(value)
    if keys:
        return "Teclas específicas", keys

    if re.search(r"\ball\s+(?:the\s+)?keys\b|\bevery\s+key\b|\bwhole\s+keyboard\b", scope_context):
        return "Todas as teclas", []
    return "Não informado", []


def _keyboard_values_basic(text):
    actuation = _setting_number(text, [
        r"\b(?:actuation(?:\s+point)?|action\s+point|act|ap)\s*[:=]?\s*(\d+(?:[.,]\d+)?)",
        r"\b(\d+(?:[.,]\d+)?)\s*mm?\s*(?:actuation(?:\s+point)?|action\s+point|act)\b",
        r"\b(\d+(?:[.,]\d+)?)\s*(?:actuation(?:\s+point)?|action\s+point|act)\b",
    ])
    rapid = _setting_number(text, [
        r"\b(?:rapid(?:\s*trigger)?|rt)\s*[:=]?\s*(\d+(?:[.,]\d+)?)",
        r"\b(\d+(?:[.,]\d+)?)\s*mm?\s*(?:rapid(?:\s*trigger)?|rt)\b",
        r"\b(\d+(?:[.,]\d+)?)\s*(?:rapid(?:\s*trigger)?|rt)\b",
    ])
    rapid_disabled = bool(re.search(
        r"\b(?:no|without|disabled|off|not\s+using|does\s+not\s+use|doesn't\s+use)\s+(?:rapid(?:\s*trigger)?|rt)\b"
        r"|\b(?:rapid(?:\s*trigger)?|rt)\s*(?:is|:)?\s*(?:off|disabled|not\s+used)\b",
        text, re.I
    ))
    if not actuation and not rapid and not rapid_disabled:
        return None

    act_scope, act_keys = _setting_scope(text, "actuation") if actuation else ("Não informado", [])
    rapid_scope, rapid_keys = _setting_scope(text, "rapid_trigger") if rapid or rapid_disabled else ("Não informado", [])
    activate = _setting_number(text, [
        r"\b(?:rapid(?:\s*trigger)?|rt)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?(?:activate|activation)\b",
        r"\b(?:activate|activation)\s*[:=]?\s*(\d+(?:[.,]\d+)?)",
        r"\b(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?(?:activate|activation)\b",
    ])
    deactivate = _setting_number(text, [
        r"\b(?:rapid(?:\s*trigger)?|rt)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?(?:deactivate|deactivation)\b",
        r"\b(?:deactivate|deactivation)\s*[:=]?\s*(\d+(?:[.,]\d+)?)",
        r"\b(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?(?:deactivate|deactivation)\b",
    ])
    if rapid and re.search(r"activate\s*(?:\+|and|&)\s*deactivate", text, re.I):
        activate = activate or rapid
        deactivate = deactivate or rapid
    return {
        "actuation": actuation,
        "rapid_trigger": rapid,
        "rapid_trigger_disabled": rapid_disabled,
        "rapid_trigger_activate": activate,
        "rapid_trigger_deactivate": deactivate,
        "actuation_scope": act_scope,
        "rapid_trigger_scope": rapid_scope,
        "actuation_keys": act_keys,
        "rapid_trigger_keys": rapid_keys,
    }


def _keyboard_values(text):
    values = _keyboard_values_basic(text)
    if not values:
        return None

    # Comentários podem descrever grupos diferentes, por exemplo WASD e demais teclas.
    parts = re.split(
        r"(?=\b(?:other|remaining|rest\s+of)\s+(?:keys|buttons)\b)",
        text,
        flags=re.I
    )
    groups = []
    if len(parts) > 1:
        for part in parts:
            group = _keyboard_values_basic(part)
            if not group:
                continue
            if re.search(r"\bwasd\b", part, re.I):
                label = "WASD"
            elif re.search(r"\b(?:other|remaining|rest\s+of)\s+(?:keys|buttons)\b", part, re.I):
                label = "Demais teclas"
            elif re.search(r"\ball\s+(?:the\s+)?keys\b|\bevery\s+key\b", part, re.I):
                label = "Todas as teclas"
            else:
                label = "Escopo não informado"
            group["label"] = label
            groups.append(group)
    if len(groups) > 1:
        values["groups"] = groups
        values.update({k: v for k, v in groups[0].items() if k != "label"})
    return values

def _is_keyboard_evidence_url(url):
    # Links genéricos de ajuda (por exemplo, a página inicial do Wootility) não são prova do ajuste.
    return bool(re.search(
        r"(twitch\.tv|clips\.twitch|youtube\.com|youtu\.be|streamable\.com|twitter\.com|x\.com|imgur\.com|gyazo\.com|t\.me|telegram\.org|hltv\.org|cybershoke\.net|steamcommunity\.com)",
        url, re.I
    ))


def parse_keyboard_comments(soup, profile_url):
    """Extrai relatos de Actuation Point/RT dos comentários e classifica evidências e conflitos."""
    headings = [h.get_text(" ", strip=True).lower() for h in soup.find_all(re.compile(r"^h[1-6]$"))]
    page_text = soup.get_text(" ", strip=True).lower()
    if not any("cs2 settings" in h or "counter-strike 2 settings" in h for h in headings) and "counter-strike 2" not in page_text[:2500]:
        return None

    nodes = []
    seen = set()
    for selector in (
        'li[id^="comment-"]',
        'li.comment',
        'article[id^="comment-"]',
        'article.comment',
        '[id^="div-comment-"]',
        '[id*="comment-"]',
        '.comment',
        '.comment-body',
        '.comment-content',
        '.wpd-comment-wrap',
        '.wpd-comment',
        '.wpd-comment-text',
        '[id^="wpd-comm-"]',
        '[data-comment-id]',
    ):
        for node in soup.select(selector):
            cid = _comment_id(node)
            node_key = cid or str(node.get("id") or node.get("data-comment-id") or "")
            if node_key and node_key not in seen:
                nodes.append(node)
                seen.add(node_key)
    if not nodes:
        return None

    records = []
    for node in nodes:
        cid = _comment_id(node)
        content = node.select_one(".comment-content, .wpd-comment-text, .comment-text, .comment__content")
        if content is None:
            article = node.select_one(".comment-body") or node
            paragraphs = []
            for p in article.find_all("p"):
                owner = p.find_parent("li", id=re.compile(r"^(?:div-)?comment-\d+$"))
                if owner is not None and owner is not node:
                    continue
                paragraphs.append(p)
            text = " ".join(p.get_text(" ", strip=True) for p in paragraphs).strip()
            link_root = article
        else:
            text = content.get_text(" ", strip=True)
            link_root = content
        if not text:
            continue

        values = _keyboard_values(text)
        if not values:
            continue

        author_node = node.select_one(".comment-author .fn, .comment-author-name, .wpd-comment-author, .comment__author, .fn")
        author = author_node.get_text(" ", strip=True) if author_node else str(node.get("data-author") or "Usuário")
        role_text = " ".join(node.get("class", [])) + " " + (node.select_one(".comment-author").get_text(" ", strip=True) if node.select_one(".comment-author") else "")
        role = "admin" if re.search(r"\badmin\b|administrator", role_text, re.I) else "member"
        date_iso, date_display = _comment_date(node)

        urls = []
        for a in link_root.find_all("a", href=True):
            href = a["href"].strip()
            if href.startswith("https://") and "prosettings.net" not in href.lower() and href not in urls:
                urls.append(href)
        for href in re.findall(r"https://[^\s<>\])]+", text):
            href = href.rstrip(".,;")
            if "prosettings.net" not in href.lower() and href not in urls:
                urls.append(href)

        parent_id = ""
        parent = node.find_parent(id=re.compile(r"^(?:div-)?comment-\d+$|^wpd-(?:comm|comment)-\d+$", re.I))
        if parent is not None:
            parent_id = _comment_id(parent)
        for attr in ("data-parent", "data-parent-id", "data-comment-parent"):
            raw_parent = node.get(attr)
            if raw_parent:
                m = re.search(r"\d+", str(raw_parent))
                if m:
                    parent_id = m.group(0)
                    break

        node_id = str(node.get("id") or "")
        records.append({
            "id": cid or node_id or str(len(records) + 1),
            "node_id": node_id,
            "parent_id": parent_id,
            "author": author,
            "role": role,
            "text": text,
            "date": date_display,
            "date_iso": date_iso,
            "values": values,
            "urls": urls,
        })

    if not records:
        return None

    by_id = {r["id"]: r for r in records}
    children = {}
    for r in records:
        if r["parent_id"] in by_id:
            children.setdefault(r["parent_id"], []).append(r)

    def descendants(comment_id):
        found, stack, visited = [], list(children.get(comment_id, [])), set()
        while stack:
            item = stack.pop(0)
            if item["id"] in visited:
                continue
            visited.add(item["id"])
            found.append(item)
            stack.extend(children.get(item["id"], []))
        return found

    grouped = {}
    for index, record in enumerate(records):
        thread = descendants(record["id"])
        related = list(thread)
        # Alguns temas achatam as respostas no HTML; nesse caso, associa um link de prova
        # apenas quando o mesmo autor o publica logo depois do relato de configuração.
        if not any(r["urls"] for r in related):
            for followup in records[index + 1:index + 6]:
                if followup["author"].strip().lower() == record["author"].strip().lower() and followup["urls"]:
                    related.append(followup)
                    break

        evidence = []
        for item in [record] + related:
            for url in item["urls"]:
                if _is_keyboard_evidence_url(url) and url not in evidence:
                    evidence.append(url)
        clip_urls = [u for u in evidence if re.search(r"(twitch\.tv|clips\.twitch|youtube\.com|youtu\.be|streamable\.com|twitter\.com|x\.com|imgur\.com|gyazo\.com)", u, re.I)]
        admin_verified = any(
            r["role"] == "admin" and re.search(r"\b(updated|fixed|confirmed|verified|changed|sorted|corrected|added)\b", r["text"], re.I)
            for r in related
        )
        values = record["values"]
        key = (
            values["actuation"], values["rapid_trigger"], values.get("rapid_trigger_disabled", False),
            values.get("rapid_trigger_activate", ""), values.get("rapid_trigger_deactivate", ""),
            values["actuation_scope"], values["rapid_trigger_scope"],
            json.dumps(values.get("groups", []), sort_keys=True)
        )
        score = (6 if admin_verified else 0) + (5 if clip_urls else 0) + (2 if evidence else 0)
        score += 2 if values["actuation"] and (values["rapid_trigger"] or values.get("rapid_trigger_disabled")) else 0
        grouped.setdefault(key, []).append({
            **values,
            "author": record["author"],
            "date": record["date"],
            "date_iso": record["date_iso"],
            "source_url": (
                profile_url.rstrip("/") + "/#" + record["node_id"]
                if record.get("node_id") else
                (profile_url.rstrip("/") + "/#comment-" + record["id"] if record["id"].isdigit() else profile_url.rstrip("/") + "/")
            ),
            "evidence_urls": evidence,
            "evidence_url": clip_urls[0] if clip_urls else "",
            "confidence": "admin" if admin_verified else ("clip" if clip_urls else ("link" if evidence else "community")),
            "status": (
                "Administrador do ProSettings confirmou a atualização" if admin_verified else
                ("Clipe compartilhado na discussão; conteúdo ainda não verificado" if clip_urls else
                 ("Link de referência compartilhado pela comunidade" if evidence else "Relato da comunidade, sem prova anexada"))
            ),
            "raw_text": record["text"],
            "score": score,
        })

    candidates = []
    for same in grouped.values():
        same.sort(key=lambda c: (c["score"], c["date_iso"]), reverse=True)
        best = dict(same[0])
        best["support_count"] = len(same)
        all_urls = []
        for candidate in same:
            for url in candidate["evidence_urls"]:
                if url not in all_urls:
                    all_urls.append(url)
        best["evidence_urls"] = all_urls
        if not best["evidence_url"]:
            best["evidence_url"] = next((u for u in all_urls if re.search(r"(twitch\.tv|clips\.twitch|youtube\.com|youtu\.be|streamable\.com|twitter\.com|x\.com|imgur\.com|gyazo\.com)", u, re.I)), "")
        candidates.append(best)

    candidates.sort(key=lambda c: (c["score"], c["date_iso"], c["support_count"]), reverse=True)
    if not candidates:
        return None
    current = candidates[0]
    alternatives = []
    for candidate in candidates[1:4]:
        if (
            candidate["actuation"], candidate["rapid_trigger"], candidate["actuation_scope"], candidate["rapid_trigger_scope"],
            candidate.get("rapid_trigger_activate", ""), candidate.get("rapid_trigger_deactivate", ""),
            candidate.get("rapid_trigger_disabled", False), candidate.get("groups", [])
        ) != (
            current["actuation"], current["rapid_trigger"], current["actuation_scope"], current["rapid_trigger_scope"],
            current.get("rapid_trigger_activate", ""), current.get("rapid_trigger_deactivate", ""),
            current.get("rapid_trigger_disabled", False), current.get("groups", [])
        ):
            alternatives.append(candidate)
    return {
        "current": current,
        "alternatives": alternatives,
        "scanned_at": dt.date.today().isoformat(),
    }

def parse_player(html, profile_url=""):
    """Devolve (nome, steam_link, mouse_dict, video_dict). Dicts vazios se nao houver a tabela."""
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
    video = {}
    for tr in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
        if len(cells) >= 2 and cells[0].lower() == "resolution" and cells[1]:
            video["resolution"] = cells[1]
            break
    keyboard = parse_keyboard_comments(soup, profile_url) if profile_url else None
    return name, steam, mouse, video, keyboard


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

    data = {"players": {}, "names": {}, "seen": {}, "pending": {}, "video_done": {}, "keyboard_done": {}}
    if os.path.exists(a.out):
        with open(a.out, encoding="utf-8") as f:
            data.update(json.load(f))
    today = dt.date.today()

    def stale(url):
        d = data["seen"].get(url)
        if url not in data["video_done"] or url not in data.get("keyboard_done", {}):
            return True
        # Reprocessa páginas lidas por versões antigas do parser de comentários.
        if data.get("keyboard_parser_version", {}).get(url) != KEYBOARD_PARSER_VERSION:
            return True
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
                name, steam, mouse, video, keyboard = parse_player(html, url)
                if url in prio_todo:
                    print(f"[prioridade] {url} nome={name!r} steam={'sim' if steam else 'nao'} campos={sorted(mouse)} video={sorted(video)}")
                if name:
                    nkey, name = name_key(data["names"], name, url)
                    old_entry = data["names"].get(nkey, {})
                    if old_entry.get("url") != url:  # nunca mistura dados de outra pagina (jogadores com o mesmo nick)
                        old_entry = {}
                    entry = {**old_entry, "name": name, "url": url, **mouse, **video}
                    if keyboard:
                        entry["keyboard"] = keyboard
                    data["names"][nkey] = entry
                    sid = None
                    if steam and steam_ok:
                        try:
                            sid = steam_id64(steam, 3.0)
                        except SteamBlocked as e:
                            print("Steam limitou as consultas; seguindo so com o nome:", e)
                            steam_ok = False
                    if sid:
                        old_player = data["players"].get(sid, {})
                        data["players"][sid] = {**old_player, **entry}
                    elif steam and name:
                        data["pending"][url] = {"steam": steam, "name": nkey}
                if not (mouse or video or keyboard) and no_mouse_logged < 5:
                    no_mouse_logged += 1
                    heads = [h.get_text(" ", strip=True) for h in BeautifulSoup(html, "html.parser").find_all(re.compile(r"^h[1-6]$"))][:15]
                    print(f"sem tabela Mouse/Video/Teclado em {url}; titulos encontrados: {heads}")
                data["seen"][url] = today.isoformat()
                data["video_done"][url] = today.isoformat()
                data.setdefault("keyboard_done", {})[url] = today.isoformat()
                data.setdefault("keyboard_parser_version", {})[url] = KEYBOARD_PARSER_VERSION
            except requests.RequestException as e:
                print("erro (pulando):", url, e)
            if i % 50 == 0:
                print(i, "paginas")
    except Blocked as e:
        print("Bloqueado, parando por hoje:", e)

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    keyboard_profiles = [v.get("keyboard", {}).get("current", {}) for v in data["names"].values() if v.get("keyboard", {}).get("current")]
    print(
        "com SteamID:", len(data["players"]),
        "| por nome:", len(data["names"]),
        "| SteamID pendente:", len(data["pending"]),
        "| perfis com teclado:", len(keyboard_profiles),
        "| com grupos de teclas:", sum(1 for v in keyboard_profiles if len(v.get("groups", [])) > 1),
        "| com limites RT separados:", sum(1 for v in keyboard_profiles if v.get("rapid_trigger_activate") or v.get("rapid_trigger_deactivate")),
        "| com RT desativado:", sum(1 for v in keyboard_profiles if v.get("rapid_trigger_disabled"))
    )


if __name__ == "__main__":
    sys.exit(main())
