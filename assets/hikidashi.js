// 空間ひきだし帖・賞の締切カレンダー・おすすめ（data/hikidashi.json は GitHub Actions が毎日0時すぎに自動更新）
(function () {
  const K = {
    item: { label: "商品", lead: "これが嫌やったら", suffix: "もいけますよ" },
    detail: { label: "納まり", lead: "これが嫌やったら", suffix: "もいけますよ" },
    law: { label: "法規", lead: "よくある疑問", suffix: "" },
    rec: { label: "おすすめ", lead: "設計者のみんなへ", suffix: "" }
  };
  const ORDER = ["item", "detail", "law", "rec"];
  const ICS = "archifriends.net/data/awards.ics";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const okUrl = u => /^https:\/\/[^\s"'<>]+$/.test(String(u || ""));
  const ymd = s => { const p = String(s || "").split("-"); return p.length === 3 ? `${+p[0]}.${+p[1]}.${+p[2]}` : ""; };
  const no3 = n => "#" + String(n || 0).padStart(3, "0");

  function card(c) {
    const k = K[c.type] || K.item;
    const imgs = (okUrl(c.illust) ? `<img class="il" src="${esc(c.illust)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "") + (okUrl(c.photo) ? `<img src="${esc(c.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "");
    const foot = [];
    if (c.type === "law" && c.article) foot.push(`根拠：${esc(c.article)}${c.checked ? ` ／ 最終確認 ${esc(ymd(c.checked))}` : ""}`);
    if (c.type === "rec" && okUrl(c.link)) foot.push(`<a href="${esc(c.link)}" target="_blank" rel="noopener">公式ページ・出典</a>`);
    if (c.work) foot.push(esc(c.work));
    if (okUrl(c.note)) foot.push(`<a href="${esc(c.note)}" target="_blank" rel="noopener">noteでくわしく</a>`);
    foot.push(`${esc(ymd(c.date))} 公開`);
    return `<article class="hk-card k-${esc(c.type)}"><div class="top"><span class="kind">${k.label}</span><span class="no">${no3(c.no)}</span></div>${imgs}
      <div class="q">${c.type === "rec" ? "" : esc(k.lead) + "："}${esc(c.from)}</div><div class="a">${k.suffix ? "→ " : ""}${esc(c.to)}${esc(k.suffix)}</div>
      ${c.phrase ? `<p class="b">${esc(c.phrase)}</p>` : ""}<div class="foot">${foot.map(f => `<span>${f}</span>`).join("")}</div></article>`;
  }
  function notes(d) {
    return `内容に間違いがあれば教えてください（<a href="contact.html">お問い合わせ</a>）。掲載内容による損害の責任は負いかねます。法規の最新情報は必ず<a href="https://elaws.e-gov.go.jp/" target="_blank" rel="noopener">e-Gov法令検索</a>の原文で確認してください。最終更新：${esc(ymd(d.updated) || "—")}`;
  }

  // 空間ひきだし帖：4種類で絞り込み・検索
  function cho(d) {
    const box = document.getElementById("hk-cards"); if (!box) return;
    let f = "all", q = "";
    const cards = d.cards || [];
    document.getElementById("hk-count").innerHTML = ORDER.map(t => `<span class="k-${t}">${K[t].label}<b>${cards.filter(c => c.type === t).length}</b></span>`).join("");
    const tools = document.getElementById("hk-filter");
    const draw = () => {
      tools.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
      const s = q.trim().toLowerCase();
      const list = cards.filter(c => (f === "all" || c.type === f) && (!s || [c.from, c.to, c.phrase, c.article].join(" ").toLowerCase().includes(s)));
      box.innerHTML = list.length ? list.map(card).join("") : `<p class="hk-empty">${cards.length ? "見つかりませんでした。ことばを変えてみてください。" : "最初のカードは近日公開です。"}</p>`;
    };
    tools.innerHTML = `<button type="button" data-f="all">すべて</button>` + ORDER.map(t => `<button type="button" class="k-${t}" data-f="${t}">${K[t].label}</button>`).join("") +
      `<label>探す<input type="search" id="hk-q" placeholder="例：フローリング"></label>`;
    tools.addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { f = b.dataset.f; draw(); } });
    document.getElementById("hk-q").addEventListener("input", e => { q = e.target.value; draw(); });
    draw();
  }
  // 賞の締切カレンダー
  function awards(d) {
    const box = document.getElementById("hk-awards"); if (!box) return;
    const list = d.awards || [];
    box.innerHTML = list.length ? list.map(a => `<div class="hk-award"><div class="d">${esc(ymd(a.date))}${a.tentative ? "<small>仮（去年の日付）</small>" : ""}</div>
      <div class="n">${okUrl(a.url) ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>` : esc(a.name)}${a.memo ? `<div class="m">${esc(a.memo)}</div>` : ""}</div></div>`).join("")
      : `<p class="hk-empty">準備中です。</p>`;
  }
  // おすすめ：おすすめのカード
  function recs(d) {
    const box = document.getElementById("hk-recs"); if (!box) return;
    const list = (d.cards || []).filter(c => c.type === "rec");
    box.innerHTML = list.length ? list.map(card).join("") : `<p class="hk-empty">近日公開です。</p>`;
  }
  document.querySelectorAll("[data-ics]").forEach(a => {
    const kind = a.dataset.ics;
    if (kind === "apple") a.href = "webcal://" + ICS;
    else if (kind === "google") a.href = "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent("webcal://" + ICS);
    else a.href = "https://" + ICS;
  });
  fetch("data/hikidashi.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
    cho(d); awards(d); recs(d);
    document.querySelectorAll(".hk-notes").forEach(n => { n.innerHTML = notes(d); });
  }).catch(() => {
    document.querySelectorAll("#hk-cards,#hk-awards,#hk-recs").forEach(b => { b.innerHTML = '<p class="hk-empty">読み込めませんでした。時間をおいて開き直してください。</p>'; });
  });
})();
