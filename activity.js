/* Pastille d'activité (bas à droite) + panneau de détail qui s'ouvre tout seul
   pendant 30 min quand quelque chose vient de se passer (ou quand tu dis « montre-moi »).
   Lit activity.json (même dossier). Format :
   { "show_until": "2026-11-25T12:30:00Z",        // « montre-moi » : panneau ouvert jusque-là
     "items": [ { "id":"…", "ts":"ISO", "titre":"…", "resume":"…", "pdf":"devoirs/maths.pdf", "lien":"https://…" } ] } */
(function(){
  const FEN = 30 * 60 * 1000, POLL = 30000, DAY = 86400000;
  const css = document.createElement("style");
  css.textContent = `
#act-badge{position:fixed;right:14px;bottom:14px;z-index:9998;width:34px;height:34px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font:600 13px -apple-system,system-ui,sans-serif;
  background:rgba(120,120,128,.35);color:#fff;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);cursor:pointer;opacity:.7}
#act-badge.new{background:#ff9f0a;opacity:1}
#act-badge.vide{display:none}
#act-panel{position:fixed;inset:4vh 4vw;z-index:9999;display:none;flex-direction:column;border-radius:20px;overflow:hidden;
  background:rgba(20,20,24,.96);color:#fff;font-family:-apple-system,system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6)}
#act-panel.open{display:flex}
#act-panel header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.12)}
#act-panel header b{font-size:17px}#act-panel header span{opacity:.6;font-size:13px;margin-left:10px}
#act-panel header button{background:none;border:0;color:#fff;font-size:22px;cursor:pointer}
#act-body{flex:1;overflow:auto;padding:16px 18px}
.act-it{margin-bottom:18px}.act-it h3{margin:0 0 4px;font-size:16px}.act-it p{margin:0 0 8px;opacity:.75;font-size:14px}
.act-it small{opacity:.5}.act-it iframe{width:100%;height:60vh;border:0;border-radius:12px;background:#fff}
.act-it a{color:#64d2ff}`;
  document.head.appendChild(css);
  const badge = Object.assign(document.createElement("div"), { id: "act-badge", className: "vide" });
  const panel = document.createElement("div"); panel.id = "act-panel";
  panel.innerHTML = '<header><div><b>Activité</b><span id="act-sub"></span></div><button aria-label="Fermer">×</button></header><div id="act-body"></div>';
  document.body.append(badge, panel);

  let items = [], fermeJusqua = 0, vuJusqua = +localStorage.getItem("act_vu") || 0, dernierRendu = "";
  const ts = x => Date.parse(x) || 0;
  function ouvrir(jusqua){ fermeJusqua = jusqua; render(); panel.classList.add("open"); }
  function fermer(){ fermeJusqua = 0; panel.classList.remove("open"); vuJusqua = Date.now(); localStorage.setItem("act_vu", vuJusqua); maj(); }
  badge.onclick = () => ouvrir(Date.now() + FEN);
  panel.querySelector("button").onclick = fermer;

  function render(){
    const html = items.map(i => `<div class="act-it"><h3>${esc(i.titre)}</h3>${i.resume ? `<p>${esc(i.resume)}</p>` : ""}
      <small>${new Date(ts(i.ts)).toLocaleString("fr-FR",{weekday:"short",hour:"2-digit",minute:"2-digit"})}</small>
      ${i.pdf ? `<iframe src="${esc(i.pdf)}"></iframe>` : ""}${i.lien ? `<p><a href="${esc(i.lien)}" target="_blank" rel="noopener">Ouvrir</a></p>` : ""}</div>`).join("");
    if (html !== dernierRendu){ document.getElementById("act-body").innerHTML = html || "<p>Rien à signaler.</p>"; dernierRendu = html; }
    document.getElementById("act-sub").textContent = fermeJusqua ? "se referme à " + new Date(fermeJusqua).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : "";
  }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function maj(){
    const nonVus = items.filter(i => ts(i.ts) > vuJusqua).length;
    badge.textContent = nonVus || items.length;
    badge.className = items.length ? (nonVus ? "new" : "") : "vide";
  }
  async function charger(){
    try {
      const d = await (await fetch("activity.json?t=" + Date.now(), { cache: "no-store" })).json();
      items = (d.items || []).filter(i => Date.now() - ts(i.ts) < DAY).sort((a, b) => ts(b.ts) - ts(a.ts));
      const now = Date.now();
      let fin = ts(d.show_until);
      const recent = items.find(i => ts(i.ts) > vuJusqua && now - ts(i.ts) < FEN);
      if (recent) fin = Math.max(fin, ts(recent.ts) + FEN);
      if (fin > now) { if (!panel.classList.contains("open") || fin !== fermeJusqua) ouvrir(fin); }
      else if (panel.classList.contains("open") && fermeJusqua && now > fermeJusqua) fermer();
      maj(); if (panel.classList.contains("open")) render();
    } catch(_){}
  }
  charger(); setInterval(charger, POLL);
  setInterval(() => { if (fermeJusqua && Date.now() > fermeJusqua) fermer(); }, 15000);
})();
