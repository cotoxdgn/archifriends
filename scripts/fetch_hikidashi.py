"""空間ひきだし帖：自分用スプシ（Apps Script の hikiPublic）から、公開日を過ぎたカードと賞の締切を読み、
data/hikidashi.json と 賞の締切カレンダー data/awards.ics を書き出す（GitHub Actions から毎日実行）。
読み先のURLはリポジトリのシークレット HIKI_GAS_URL（公開しない）。無ければ何もしない。
hikiPublic は合言葉なし・読むだけで、出してよい項目だけを返す（ストック・工夫点・案件名は返さない）。
"""
import hashlib
import json
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "data" / "hikidashi.json"
OUT_ICS = ROOT / "data" / "awards.ics"
URL = os.environ.get("HIKI_GAS_URL", "").strip()


def fetch(url):
    body = json.dumps({"action": "hikiPublic"}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "text/plain;charset=utf-8", "User-Agent": "coto-site-hikidashi/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:   # Apps Script は 302 で返す。urllib が GET でたどる
        return json.loads(r.read().decode("utf-8"))


def esc_ics(s):
    return str(s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    # 75バイトごとに折り返す（RFC 5545）
    out, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(cur) + len(b) > 73:
            out.append(cur.decode("utf-8"))
            cur = b" " + b
        else:
            cur += b
    out.append(cur.decode("utf-8"))
    return "\r\n".join(out)


def ics(awards, name):
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//archifriends.net//awards//JA", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             "X-WR-CALNAME:" + esc_ics("設計者向け 賞の締切（" + name + "）"), "X-WR-TIMEZONE:Asia/Tokyo", "REFRESH-INTERVAL;VALUE=DURATION:PT12H", "X-PUBLISHED-TTL:PT12H"]
    for a in awards:
        d = date.fromisoformat(a["date"])
        uid = hashlib.sha1(a["name"].encode("utf-8")).hexdigest()[:16] + "@archifriends.net"
        desc = (a.get("memo") or "")
        if a.get("tentative"):
            desc = ("【仮】去年と同じ日付で仮に入れています。公式ページで確かめてください。\n" + desc).strip()
        if a.get("url"):
            desc = (desc + "\n" + a["url"]).strip()
        lines += ["BEGIN:VEVENT", "UID:" + uid, "DTSTAMP:" + now,
                  "DTSTART;VALUE=DATE:" + d.strftime("%Y%m%d"), "DTEND;VALUE=DATE:" + (d + timedelta(days=1)).strftime("%Y%m%d"),
                  "SUMMARY:" + esc_ics("締切：" + a["name"] + ("（仮）" if a.get("tentative") else "")),
                  "DESCRIPTION:" + esc_ics(desc)]
        if a.get("url"):
            lines.append("URL:" + a["url"])
        lines += ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc_ics("1週間後に締切：" + a["name"]), "TRIGGER:-P7D", "END:VALARM", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return "\r\n".join(fold(l) for l in lines) + "\r\n"


def main():
    if not URL:
        print("HIKI_GAS_URL が無いので何もしません")
        return 0
    res = fetch(URL)
    if not res.get("ok"):
        print("読めませんでした：", res.get("error"))
        return 1
    keep = ["no", "type", "date", "from", "to", "phrase", "article", "checked", "link", "note", "illust", "photo", "work"]
    cards = [{k: c.get(k, "") for k in keep} for c in res.get("cards", [])]
    awards = [{k: a.get(k, "") for k in ["name", "url", "date", "tentative", "memo"]} for a in res.get("awards", [])]
    name = res.get("name") or "coto"
    data = {"name": name, "updated": res.get("updated", ""), "cards": cards, "awards": awards}
    old = json.loads(OUT_JSON.read_text(encoding="utf-8")) if OUT_JSON.exists() else {}
    if old != data:
        OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print("hikidashi.json を更新：カード", len(cards), "枚・賞", len(awards), "件")
    new_ics = ics(awards, name)
    strip = lambda s: "\n".join(l for l in s.splitlines() if not l.startswith("DTSTAMP:"))
    if not OUT_ICS.exists() or strip(OUT_ICS.read_text(encoding="utf-8")) != strip(new_ics):
        OUT_ICS.write_text(new_ics, encoding="utf-8", newline="")
        print("awards.ics を更新")
    return 0


if __name__ == "__main__":
    sys.exit(main())
