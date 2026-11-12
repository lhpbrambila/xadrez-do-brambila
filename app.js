/* ==========================================================
   CONFIGURAÇÃO — edite aqui se quiser personalizar
   ========================================================== */
const CONFIG = {
  BOT_NAME: "Brambila",
  BOT_AVATAR: "avatar.jpg", // <-- troque a foto do bot: substitua este arquivo ou mude o nome aqui
  STOCKFISH_URL: "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
};

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const GLYPH = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };
  const TEXT = "\uFE0E"; // força glifo de texto (evita emoji no celular)
  const FILES = "abcdefgh";

  let game = new Chess();
  let playerColor = "w";
  let elo = 1200;
  let selected = null;
  let legalFromSel = [];
  let lastMove = null;
  let thinking = false;
  let over = false;
  let token = 0;
  let engine = null;
  let engineReady = false;
  let resolver = null;
  let ignoreBest = 0;
  let pendingPromo = null;

  /* ---------------- Identidade do bot ---------------- */
  function setupBot() {
    document.title = "Xadrez contra o " + CONFIG.BOT_NAME;
    $("botName").textContent = CONFIG.BOT_NAME;
    document.querySelectorAll(".bot-name-inline").forEach((e) => (e.textContent = CONFIG.BOT_NAME));
    const img = $("botAvatar");
    img.onerror = () => {
      img.hidden = true;
      $("botAvatarFallback").hidden = false;
    };
    img.src = CONFIG.BOT_AVATAR;
  }

  /* ---------------- Motor (Stockfish) ---------------- */
  function initEngine() {
    return fetch(CONFIG.STOCKFISH_URL)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then((code) => {
        const blob = new Blob([code], { type: "application/javascript" });
        engine = new Worker(URL.createObjectURL(blob));
        return new Promise((resolve) => {
          engine.onmessage = (e) => {
            const line = String(e.data);
            if (line === "uciok") engine.postMessage("isready");
            else if (line === "readyok") resolve();
            else if (line.startsWith("bestmove")) {
              if (ignoreBest > 0) { ignoreBest--; return; }
              if (resolver) {
                const r = resolver;
                resolver = null;
                r(line.split(" ")[1]);
              }
            }
          };
          engine.postMessage("uci");
        });
      });
  }

  function engineBestMove(fen, level) {
    return new Promise((resolve) => {
      resolver = resolve;
      engine.postMessage("setoption name Skill Level value " + level.skill);
      engine.postMessage("position fen " + fen);
      engine.postMessage("go depth " + level.depth + " movetime " + level.time);
    });
  }

  function cancelEngine() {
    if (resolver) {
      resolver = null;
      ignoreBest++;
      engine.postMessage("stop");
    }
    token++;
    thinking = false;
    $("thinking").hidden = true;
  }

  /* Converte ELO (800–2800) em parâmetros do motor */
  function levelFor(e) {
    const t = (e - 800) / 2000;
    let blunder = 0;
    if (e < 1000) blunder = 0.35;
    else if (e < 1200) blunder = 0.25;
    else if (e < 1400) blunder = 0.15;
    else if (e < 1600) blunder = 0.08;
    else if (e < 1800) blunder = 0.03;
    return {
      skill: Math.round(t * 20),
      depth: Math.max(1, Math.round(1 + t * 13)),
      time: Math.round(200 + t * 2300),
      blunder,
    };
  }

  function eloDescription(e) {
    if (e <= 900) return "Iniciante — comete muitos erros.";
    if (e <= 1300) return "Amador — pune erros grosseiros.";
    if (e <= 1700) return "Intermediário — joga com bom senso.";
    if (e <= 2100) return "Avançado — exige atenção total.";
    if (e <= 2500) return "Mestre — poucos erros.";
    return "Máximo — jogo de nível de super grande mestre.";
  }

  /* ---------------- Jogada do bot ---------------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function botMove() {
    if (over || !engineReady || game.game_over()) return;
    thinking = true;
    const my = ++token;
    $("thinking").hidden = false;
    updateStatus();

    const level = levelFor(elo);
    const moves = game.moves({ verbose: true });
    let uci;
    const started = Date.now();

    if (Math.random() < level.blunder) {
      const m = moves[Math.floor(Math.random() * moves.length)];
      uci = m.from + m.to + (m.promotion || "");
      await sleep(500);
    } else {
      uci = await engineBestMove(game.fen(), level);
      const wait = 450 - (Date.now() - started);
      if (wait > 0) await sleep(wait);
    }

    if (my !== token) return; // partida mudou enquanto pensava
    thinking = false;
    $("thinking").hidden = true;

    let result = game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4, 5) || undefined,
    });
    if (!result) {
      const m = moves[0];
      result = game.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    lastMove = result ? { from: result.from, to: result.to } : null;
    afterMove();
  }

  /* ---------------- Fluxo do jogo ---------------- */
  function startGame() {
    cancelEngine();
    game = new Chess();
    selected = null;
    legalFromSel = [];
    lastMove = null;
    over = false;

    const choice = document.querySelector('input[name="color"]:checked').value;
    playerColor = choice === "r" ? (Math.random() < 0.5 ? "w" : "b") : choice;
    elo = parseInt($("eloRange").value, 10);

    $("botElo").textContent = "ELO " + elo;
    $("playerLabel").textContent = "Você (" + (playerColor === "w" ? "brancas" : "pretas") + ")";
    $("setupModal").hidden = true;
    render();
    if (game.turn() !== playerColor) botMove();
    else updateStatus();
  }

  function afterMove() {
    selected = null;
    legalFromSel = [];
    render();
    if (game.game_over()) {
      over = true;
      updateStatus();
    } else {
      updateStatus();
      if (game.turn() !== playerColor) botMove();
    }
  }

  function updateStatus() {
    const el = $("statusText");
    if (over && !game.game_over()) return; // desistência define o texto por conta própria
    if (game.in_checkmate()) {
      el.textContent = game.turn() === playerColor ? "Xeque-mate — o " + CONFIG.BOT_NAME + " venceu." : "Xeque-mate — você venceu! 🎉";
    } else if (game.in_stalemate()) el.textContent = "Empate por afogamento.";
    else if (game.insufficient_material()) el.textContent = "Empate por material insuficiente.";
    else if (game.in_threefold_repetition()) el.textContent = "Empate por repetição.";
    else if (game.in_draw()) el.textContent = "Empate.";
    else if (thinking) el.textContent = CONFIG.BOT_NAME + " está pensando…";
    else el.textContent = (game.in_check() ? "Xeque! " : "") + "Sua vez.";
  }

  /* ---------------- Interação ---------------- */
  function onSquareClick(sq) {
    if (over || thinking || !engineReady || game.turn() !== playerColor) return;

    if (selected) {
      const target = legalFromSel.find((m) => m.to === sq);
      if (target) {
        if (target.promotion) return askPromotion(selected, sq);
        return playerMove(selected, sq);
      }
    }
    const piece = game.get(sq);
    if (piece && piece.color === playerColor) {
      selected = selected === sq ? null : sq;
      legalFromSel = selected ? game.moves({ square: sq, verbose: true }) : [];
    } else {
      selected = null;
      legalFromSel = [];
    }
    render();
  }

  function playerMove(from, to, promotion) {
    const r = game.move({ from, to, promotion });
    if (!r) return;
    lastMove = { from, to };
    afterMove();
  }

  function askPromotion(from, to) {
    pendingPromo = { from, to };
    const box = $("promoChoices");
    box.innerHTML = "";
    ["q", "r", "b", "n"].forEach((p) => {
      const b = document.createElement("button");
      b.className = playerColor;
      b.textContent = GLYPH[p] + TEXT;
      b.onclick = () => {
        $("promoModal").hidden = true;
        const { from, to } = pendingPromo;
        pendingPromo = null;
        playerMove(from, to, p);
      };
      box.appendChild(b);
    });
    $("promoModal").hidden = false;
  }

  function undo() {
    if (!game.history().length) return;
    cancelEngine();
    over = false;
    game.undo();
    if (game.turn() !== playerColor && game.history().length) game.undo();
    selected = null;
    legalFromSel = [];
    const h = game.history({ verbose: true });
    lastMove = h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
    render();
    if (game.turn() !== playerColor) botMove();
    else updateStatus();
  }

  function resign() {
    if (over) return;
    cancelEngine();
    over = true;
    $("statusText").textContent = "Você desistiu. O " + CONFIG.BOT_NAME + " venceu.";
  }

  /* ---------------- Renderização ---------------- */
  function kingSquareInCheck() {
    if (!game.in_check()) return null;
    const b = game.board();
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === "k" && p.color === game.turn()) return FILES[c] + (8 - r);
      }
    return null;
  }

  function render() {
    const flipped = playerColor === "b";
    const boardEl = $("board");
    boardEl.innerHTML = "";
    const checkSq = kingSquareInCheck();
    const targets = new Set(legalFromSel.map((m) => m.to));

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const file = flipped ? 7 - c : c;
        const rank = flipped ? r + 1 : 8 - r;
        const sq = FILES[file] + rank;
        const el = document.createElement("div");
        el.className = "sq " + ((file + rank) % 2 === 1 ? "light" : "dark");
        el.dataset.sq = sq;
        if (lastMove && (lastMove.from === sq || lastMove.to === sq)) el.classList.add("last");
        if (selected === sq) el.classList.add("sel");
        if (checkSq === sq) el.classList.add("check");

        if (c === 0) el.insertAdjacentHTML("beforeend", '<span class="coord rank">' + rank + "</span>");
        if (r === 7) el.insertAdjacentHTML("beforeend", '<span class="coord file">' + FILES[file] + "</span>");

        const p = game.get(sq);
        if (p) {
          const s = document.createElement("span");
          s.className = "piece " + p.color;
          s.textContent = GLYPH[p.type] + TEXT;
          el.appendChild(s);
        }
        if (targets.has(sq)) {
          const d = document.createElement("span");
          d.className = p ? "ring" : "dot";
          el.appendChild(d);
        }
        el.addEventListener("click", () => onSquareClick(sq));
        boardEl.appendChild(el);
      }
    }
    renderMoves();
  }

  function renderMoves() {
    const list = $("moves");
    list.innerHTML = "";
    const h = game.history();
    for (let i = 0; i < h.length; i += 2) {
      const li = document.createElement("li");
      li.style.display = "contents";
      li.innerHTML =
        '<span class="n">' + (i / 2 + 1) + ".</span><span>" + h[i] + "</span><span>" + (h[i + 1] || "") + "</span>";
      list.appendChild(li);
    }
    list.scrollTop = list.scrollHeight;
  }

  /* ---------------- Inicialização ---------------- */
  function init() {
    setupBot();
    render();

    const range = $("eloRange");
    const sync = () => {
      $("eloValue").textContent = range.value;
      $("eloLabel").textContent = eloDescription(parseInt(range.value, 10));
    };
    range.addEventListener("input", sync);
    sync();

    $("btnStart").addEventListener("click", startGame);
    $("btnNew").addEventListener("click", () => ($("setupModal").hidden = false));
    $("btnUndo").addEventListener("click", undo);
    $("btnResign").addEventListener("click", resign);

    $("setupModal").hidden = false;

    initEngine()
      .then(() => {
        engineReady = true;
        $("btnStart").disabled = false;
        $("btnStart").textContent = "Jogar";
        $("statusText").textContent = "Escolha as opções e comece!";
      })
      .catch((err) => {
        console.error(err);
        $("btnStart").textContent = "Erro ao carregar o motor";
        $("statusText").textContent = "Não foi possível carregar o Stockfish. Verifique sua conexão e recarregue.";
      });
  }

  init();
})();
