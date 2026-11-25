/* Pastille d'activité (bas à droite) + panneau de détail qui s'ouvre tout seul
   pendant 30 min quand quelque chose vient de se passer (ou quand tu dis « montre-moi »).
   Lit activity.json (même dossier). Format :
   { "show_until": "2026-11-25T12:30:00Z",        // « montre-moi » : panneau ouvert jusque-là
     "items": [ { "id":"…", "ts":"ISO", "titre":"…", "resume":"…", "pdf":"devoirs/maths.pdf", "lien":"https://…" } ] } */
(function(){
  const FEN = 30 * 60 * 1000, POLL = 30000, DAY = 86400000;
  const css = document.createElement("style");
  css.textContent = `
#act-badge{position:fixed;right:18px;bottom:18px;z-index:9998;min-width:38px;height:38px;padding:0 11px;border-radius:19px;display:flex;align-items:center;justify-content:center;
  font:600 14px -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;letter-spacing:-.02em;color:#fff;cursor:pointer;
  background:rgba(255,255,255,.075);-webkit-backdrop-filter:blur(30px) saturate(190%);backdrop-filter:blur(30px) saturate(190%);
  border:1px solid rgba(255,255,255,.13);box-shadow:inset 0 1px 0 rgba(255,255,255,.34),0 8px 28px rgba(0,0,0,.35);transition:transform .25s cubic-bezier(.32,.72,0,1)}
#act-badge:active{transform:scale(.94)}
#act-badge.new{background:rgba(255,159,10,.32);border-color:rgba(255,159,10,.55)}
#act-badge.vide{display:none}
#act-panel{position:fixed;inset:5vh 5vw;z-index:9999;display:none;flex-direction:column;border-radius:30px;overflow:hidden;color:#fff;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;letter-spacing:-.022em;
  background:rgba(28,28,34,.72);-webkit-backdrop-filter:blur(40px) saturate(190%);backdrop-filter:blur(40px) saturate(190%);
  border:1px solid rgba(255,255,255,.13);box-shadow:inset 0 1px 0 rgba(255,255,255,.34),0 24px 70px rgba(0,0,0,.6)}
#act-panel.open{display:flex;animation:actIn .5s cubic-bezier(.32,.72,0,1) both}
@keyframes actIn{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
#act-panel header{display:flex;justify-content:space-between;align-items:center;padding:18px 24px 12px}
#act-panel header b{font-size:22px;font-weight:600;letter-spacing:-.03em}
#act-panel header span{color:rgba(255,255,255,.42);font-size:14px;margin-left:12px}
#act-panel header button{width:34px;height:34px;border-radius:17px;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:20px;line-height:1;cursor:pointer}
#act-body{flex:1;overflow:auto;padding:6px 24px 24px;scrollbar-width:none}#act-body::-webkit-scrollbar{display:none}
.act-it{background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:14px 16px;margin-bottom:12px}
.act-it h3{font-size:17px;font-weight:600;letter-spacing:-.02em}.act-it p{font-size:14px;color:rgba(255,255,255,.68);margin-top:4px}
.act-it small{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.42);margin-top:6px}
.act-it iframe{width:100%;height:55vh;border:0;border-radius:14px;background:#fff;margin-top:10px}
.act-it a{color:#0a84ff;font-weight:600;text-decoration:none}`;
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
    if (window.ACT_DEMO) return;
    try {
      const d = await (await fetch("activity.json?t=" + Date.now(), { cache: "no-store" })).json();
      items = (d.items || []).filter(i => Date.now() - ts(i.ts) < DAY).sort((a, b) => ts(b.ts) - ts(a.ts));
      const now = Date.now();
      let fin = ts(d.show_until);                                   // « montre-moi »
      const recent = items.find(i => ts(i.ts) > vuJusqua && now - ts(i.ts) < FEN); // changement tout frais
      if (recent) fin = Math.max(fin, ts(recent.ts) + FEN);
      if (fin > now) { if (!panel.classList.contains("open") || fin !== fermeJusqua) ouvrir(fin); }
      else if (panel.classList.contains("open") && fermeJusqua && now > fermeJusqua) fermer();
      maj(); if (panel.classList.contains("open")) render();
    } catch(_){}
  }
  window.activite = { pousser(i){ items.unshift(Object.assign({ ts: new Date().toISOString() }, i)); maj(); ouvrir(Date.now() + FEN); },
    montrer(min){ ouvrir(Date.now() + (min || 30) * 60000); }, vider(){ items = []; fermer(); maj(); } };
  charger(); setInterval(charger, POLL);
  setInterval(() => { if (fermeJusqua && Date.now() > fermeJusqua) fermer(); }, 15000);
})();
