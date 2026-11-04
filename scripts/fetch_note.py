"""noteのRSSから新着記事を取得し、data/posts.json に書き出す（GitHub Actionsから実行）"""
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

RSS_URL = "https://note.com/roomin_kurashi/rss"
OUT = Path(__file__).resolve().parent.parent / "data" / "posts.json"
EXCLUDE = ["自己紹介"]  # タイトルにこの語を含む記事はHPに出さない
MAX_POSTS = 20

req = urllib.request.Request(RSS_URL, headers={"User-Agent": "coo-site-feed/1.0"})
with urllib.request.urlopen(req, timeout=30) as r:
    root = ET.fromstring(r.read())

ns = {"media": "http://search.yahoo.com/mrss/"}
posts = []
for item in root.iter("item"):
    title = (item.findtext("title") or "").strip()
    if not title or any(w in title for w in EXCLUDE):
        continue
    date = ""
    pub = item.findtext("pubDate")
    if pub:
        try:
            date = parsedate_to_datetime(pub).strftime("%Y.%m.%d")
        except (TypeError, ValueError):
            pass
    thumb = item.findtext("media:thumbnail", default="", namespaces=ns).strip()
    posts.append({"title": title, "link": (item.findtext("link") or "").strip(), "date": date, "thumb": thumb})
    if len(posts) >= MAX_POSTS:
        break

old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
if old.get("posts") == posts:
    print("変更なし")
else:
    OUT.write_text(json.dumps({"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"), "posts": posts},
                              ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(posts)}件を書き出しました")
