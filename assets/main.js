// お問い合わせフォームのURL（Googleフォーム作成後にここへ貼る）
const FORM_URL = "";

const formLink = document.getElementById("form-link");
if (formLink) {
  if (FORM_URL) formLink.href = FORM_URL;
  else { formLink.removeAttribute("href"); formLink.textContent = "フォーム準備中"; }
}

// noteの新着記事（data/posts.json は GitHub Actions が毎日自動更新）
const boxes = document.querySelectorAll(".posts");
if (boxes.length) {
  fetch("data/posts.json", { cache: "no-cache" })
    .then(r => r.json())
    .then(d => boxes.forEach(box => render(box, d.posts || [])))
    .catch(() => boxes.forEach(box => {
      box.innerHTML = '<p class="meta">記事を読み込めませんでした。noteで直接ご覧ください。</p>';
    }));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render(box, posts) {
  const limit = Number(box.dataset.limit || 3);
  const list = posts.slice(0, limit);
  if (!list.length) { box.innerHTML = '<p class="meta">記事はまだありません。</p>'; return; }
  box.innerHTML = list.map(p => {
    const date = p.date ? `${esc(p.date)} ・ ` : "";
    return `<a class="post" href="${esc(p.link)}" target="_blank" rel="noopener"><h3>${esc(p.title)}</h3><span class="meta">${date}note</span></a>`;
  }).join("");
}
