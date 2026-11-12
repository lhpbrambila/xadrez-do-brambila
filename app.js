/* ==========================================================
   CONFIGURAÇÃO — edite aqui se quiser personalizar
   ========================================================== */
const CONFIG = {
  BOT_NAME: "Brambila",
  BOT_AVATAR: "avatar.jpg", // <-- troque a foto do bot: substitua este arquivo ou mude o nome aqui
  STOCKFISH_URL: "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
};

/* ==========================================================
   FRASES DO BOT — edite/adicione à vontade
   ========================================================== */
const PHRASES = {
  start: [
    "Wow. Muito xadrez. Vamos jogar! 🐶",
    "Boa sorte! Você vai precisar. 😎",
    "Au au! Tabuleiro pronto, cérebro pronto?",
    "Que vença o melhor. (Spoiler: sou eu.)",
  ],
  blunder: [
    "Hmm… você tem certeza disso? 😏",
    "Essa foi de graça, obrigado!",
    "Au… essa doeu até em mim.",
    "Isso foi um presente pra mim, né?",
    "Vish, errou feio. Muito erro. Wow.",
  ],
  mistake: [
    "Hm, não foi a melhor. Eu agradeço. 😋",
    "Interessante… pra mim!",
    "Eu estava torcendo por esse lance.",
  ],
  praise: [
    "Boa jogada! Estou impressionado. 👏",
    "Ora, ora… você sabe jogar!",
    "Lance preciso. Muito bem!",
    "Essa foi boa. Fiquei com medo agora.",
    "Hmm, essa eu não queria que você fizesse.",
  ],
  capGain: ["Obrigado pela peça! 😋", "Nhac! Mais uma pra coleção.", "Material é material, né?"],
  capLoss: ["Ai! Essa peça era importante…", "Tá bom, essa foi sua. Por enquanto.", "Au! Doeu."],
  check: ["Xeque? Ousado…", "Opa, calma aí! Tô vendo o seu xeque."],
  botCheck: ["Xeque! O rei que se cuide. ♟️", "Xeque! Muito ataque. Wow."],
  botMate: ["Xeque-mate! Fácil demais. 😎🐶", "Fim de jogo! Muito mate. Wow!"],
  playerMate: ["Impossível… você me derrotou! Parabéns! 🏆", "Xeque-mate?! Mereceu. Revanche?"],
  resign: ["Desistiu? Tudo bem, acontece. Quer revanche?", "Sem problemas, a derrota também ensina. Revanche?"],
  botFlag: ["O tempo acabou! Venci no relógio. ⏱️"],
  playerFlag: ["Ih, meu tempo acabou! Você venceu no relógio. ⏱️"],
  draw: ["Empate! Respeito você. 🤝", "Ninguém ganhou… mas eu quase ganhei."],
  hint: ["Pedindo dica pra mim? Tá bom, eu ajudo. 🐾", "Colando, hein? Tudo bem, só dessa vez."],
  undo: ["Voltando no tempo? Sem problemas. ⏪"],
};

/* Comentários sobre aberturas (sequência de lances em SAN) */
const OPENINGS = {
  "e4": "Peão do rei: o clássico dos clássicos.",
  "d4": "Peão da dama! Gosto de jogo posicional.",
  "Nf3": "Cavalo do rei logo de cara… elegante.",
  "c4": "Abertura Inglesa. Chique!",
  "e4 e5": "Jogo aberto. Vai ter tática!",
  "e4 c5": "Defesa Siciliana! Agressiva, hein?",
  "e4 e6": "Defesa Francesa: sólida e teimosa.",
  "e4 c6": "Caro-Kann. Paciência de monge.",
  "e4 d5": "Defesa Escandinava. Mexendo cedo com a dama!",
  "d4 d5": "Peão da dama contra peão da dama. Tradição!",
  "d4 Nf6": "Defesa Indiana. Cheia de truques.",
  "e4 e5 f4": "Gambito do Rei! Que audácia!",
  "e4 e5 Nf3 Nf6": "Defesa Russa (Petrov). Bem sólida.",
  "e4 e5 Nf3 Nc6 Bb5": "Ruy Lopez! A abertura espanhola, uma obra de arte.",
  "e4 e5 Nf3 Nc6 Bc4": "Jogo Italiano. Quem nunca?",
  "d4 d5 c4": "Gambito da Dama! Aceita ou recusa?",
};

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const FILES = "abcdefgh";
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const STORE_KEY = "brambila-placar-v1";
  const MATE = 10000;

  /* ==========================================================
     PEÇAS EM SVG
     ========================================================== */
  const BASE = '<rect x="11" y="34.5" width="23" height="4.5" rx="2"/>';
  const SHAPES = {
    p:
      '<circle cx="22.5" cy="13" r="5.5"/>' +
      '<path d="M17.5 19.5h10l2 6.5c2.5 2.5 4 5.5 4 8.5h-22c0-3 1.5-6 4-8.5z"/>' + BASE,
    r:
      '<path d="M14.5 34.5l1.5-14.5h13l1.5 14.5z"/>' +
      '<path d="M12 20V11h4.5v3h4v-3h4v3h4v-3H33v9z"/>' + BASE,
    n:
      '<path d="M12 34.5c0-6 2-9 6-11.5l-7.5.5c-1.5-2.5 1.5-5.5 4.5-9.5l2-6.5 3.5 3 4-5c8.5 2.5 11 11 10 29z"/>' + BASE,
    b:
      '<circle cx="22.5" cy="7.5" r="2.5"/>' +
      '<path d="M22.5 10c-4.5 3.5-7 7-7 11 0 3 1.5 5 3.5 6.5h7c2-1.5 3.5-3.5 3.5-6.5 0-4-2.5-7.5-7-11z"/>' +
      '<path d="M19 27.5h7c1.5 3 5.5 4 5.5 7h-18c0-3 4-4 5.5-7z"/>' + BASE,
    q:
      '<path d="M10.5 34.5L8.5 14 15.5 25 17 11 21.5 24 22.5 9 23.5 24 28 11 29.5 25 36.5 14 34.5 34.5z"/>' +
      '<circle cx="8.5" cy="13.5" r="2"/><circle cx="17" cy="10" r="2"/><circle cx="22.5" cy="8" r="2"/>' +
      '<circle cx="28" cy="10" r="2"/><circle cx="36.5" cy="13.5" r="2"/>' +
      '<rect x="10" y="34.5" width="25" height="4.5" rx="2"/>',
    k:
      '<path d="M11 34.5c-1.5-9 1-15 11.5-17 10.5 2 13 8 11.5 17z"/>' +
      '<path d="M21 3.5h3v4h4v3h-4v7h-3v-7h-4v-3h4z"/>' + BASE,
  };
  const DETAILS = {
    n: '<path d="M22 13c3 1 6 4 7 9"/>',
    b: '<path d="M20.5 20.5l4-6"/>',
    k: '<path d="M16 27c4 2 9 2 13 0"/>',
    q: '<path d="M14 30h17"/>',
    r: '<path d="M16 25h13"/>',
  };

  function pieceSVG(type, color, cls) {
    const w = color === "w";
    const fill = w ? "#f6f6f6" : "#2b2b2b";
    const stroke = w ? "#1a1a1a" : "#000";
    const detail = w ? "#2a2a2a" : "#d6d6d6";
    const eye = type === "n" ? '<circle cx="17.5" cy="15.5" r="1.3" fill="' + detail + '"/>' : "";
    return (
      '<svg class="' + cls + '" viewBox="0 0 45 45" aria-hidden="true">' +
      '<g fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">' +
      SHAPES[type] + "</g>" +
      '<g fill="none" stroke="' + detail + '" stroke-width="1.2" stroke-linecap="round">' + (DETAILS[type] || "") + "</g>" +
      eye + "</svg>"
    );
  }

  /* ==========================================================
     ESTADO
     ========================================================== */
  let game = new Chess();
  let playerColor = "w";
  let elo = 1200;
  let selected = null;
  let legalFromSel = [];
  let lastMove = null;
  let thinking = false;
  let over = false;
  let started = false;
  let token = 0;
  let pendingPromo = null;
  let gameWinner = null; // "player" | "bot" | "draw"

  let evalScore = null; // centipeões, ponto de vista das brancas
  let preEval = null, preEvalFen = null;
  let hintMove = null, hintFen = null, hintShown = null, hintWanted = false;
  let lastBotMat = 0;

  const clock = { on: false, w: 0, b: 0, inc: 0, last: 0, timer: null };

  /* ==========================================================
     MOTOR (Stockfish) — uma busca por vez, com fila
     ========================================================== */
  let engine = null;
  let engineReady = false;
  let current = null; // busca em andamento
  let nextJob = null; // busca que substituirá a atual

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
            else if (line === "readyok") {
              engine.onmessage = onEngineLine;
              resolve();
            }
          };
          engine.postMessage("uci");
        });
      });
  }

  function onEngineLine(e) {
    const line = String(e.data);
    if (line.startsWith("info") && current) {
      const m = line.match(/score (cp|mate) (-?\d+)/);
      if (m && !/bound/.test(line)) {
        const n = parseInt(m[2], 10);
        let v = m[1] === "cp" ? n : (n > 0 ? 1 : -1) * (MATE - Math.abs(n) * 10);
        if (current.stm === "b") v = -v; // sempre do ponto de vista das brancas
        current.score = v;
      }
    } else if (line.startsWith("bestmove")) {
      const c = current;
      current = null;
      if (!c) return;
      const best = line.split(" ")[1];
      if (nextJob) {
        const j = nextJob;
        nextJob = null;
        c.job.resolve(null);
        startJob(j);
      } else {
        c.job.resolve({ best: best && best !== "(none)" ? best : null, score: c.score });
      }
    }
  }

  function startJob(job) {
    current = { job, score: null, stm: job.fen.split(" ")[1] };
    engine.postMessage("setoption name Skill Level value " + job.opts.skill);
    engine.postMessage("position fen " + job.fen);
    engine.postMessage("go depth " + job.opts.depth + " movetime " + job.opts.time);
  }

  /* Retorna {best, score} ou null se a busca foi substituída/cancelada */
  function search(fen, opts) {
    if (!engineReady) return Promise.resolve(null);
    return new Promise((resolve) => {
      const job = { fen, opts, resolve };
      if (current) {
        if (nextJob) nextJob.resolve(null);
        nextJob = job;
        engine.postMessage("stop");
      } else startJob(job);
    });
  }

  const analyze = (fen) => search(fen, { skill: 20, depth: 12, time: 450 });

  function cancelEngine() {
    token++;
    thinking = false;
    $("thinking").hidden = true;
    if (nextJob) {
      nextJob.resolve(null);
      nextJob = null;
    }
    if (current && engine) engine.postMessage("stop");
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

  /* ==========================================================
     PERSONALIDADE DO BOT
     ========================================================== */
  let bubbleTimer = null;
  let avatarTimer = null;
  const lastSaid = {};

  function showBubble(text) {
    const b = $("bubble");
    b.textContent = text;
    b.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => b.classList.remove("show"), 7000);
  }

  function say(cat, prob = 1) {
    if (Math.random() > prob) return false;
    const arr = PHRASES[cat];
    if (!arr || !arr.length) return false;
    let t = arr[Math.floor(Math.random() * arr.length)];
    if (arr.length > 1 && t === lastSaid[cat]) t = arr[(arr.indexOf(t) + 1) % arr.length];
    lastSaid[cat] = t;
    showBubble(t);
    return true;
  }

  function reactAvatar(kind, persist) {
    const w = $("avatarWrap");
    w.classList.remove("happy", "sad", "win", "lose");
    void w.offsetWidth;
    if (!kind) return;
    w.classList.add(kind);
    clearTimeout(avatarTimer);
    if (!persist) avatarTimer = setTimeout(() => w.classList.remove(kind), 1600);
  }

  function commentOpening() {
    const h = game.history();
    if (h.length > 8) return false;
    const txt = OPENINGS[h.join(" ")];
    if (!txt) return false;
    showBubble(txt);
    return true;
  }

  function botMaterial() {
    const botColor = playerColor === "w" ? "b" : "w";
    let s = 0;
    game.board().forEach((row) =>
      row.forEach((p) => {
        if (p) s += (p.color === botColor ? 1 : -1) * VAL[p.type];
      })
    );
    return s;
  }

  /* ==========================================================
     AVALIAÇÃO (barra) E DICA
     ========================================================== */
  function fmtScore(s) {
    if (s == null) return "0.0";
    if (Math.abs(s) >= MATE - 500) {
      const n = Math.round((MATE - Math.abs(s)) / 10);
      return (s > 0 ? "M" : "-M") + n;
    }
    const v = (s / 100).toFixed(1);
    return (s > 0 ? "+" : "") + v;
  }

  function setEval(score) {
    evalScore = score;
    updateEvalBar();
  }

  function updateEvalBar() {
    const s = evalScore == null ? 0 : evalScore;
    let pct;
    if (Math.abs(s) >= MATE - 500) pct = s > 0 ? 100 : 0;
    else pct = 100 / (1 + Math.exp(-s / 350));
    const fill = $("evalFill");
    const flipped = playerColor === "b"; // brancas ficam em cima quando o tabuleiro está invertido
    fill.style.height = pct + "%";
    fill.style.top = flipped ? "0" : "auto";
    fill.style.bottom = flipped ? "auto" : "0";

    const text = $("evalText");
    text.textContent = fmtScore(evalScore);
    const whiteWinning = s >= 0;
    const whiteAtBottom = !flipped;
    const atBottom = whiteWinning === whiteAtBottom;
    text.style.top = atBottom ? "auto" : "4px";
    text.style.bottom = atBottom ? "4px" : "auto";
    text.style.color = whiteWinning ? "#1b1b1b" : "#f2f2f2";
  }

  async function analysisForPlayer() {
    const my = token;
    const fen = game.fen();
    const res = await analyze(fen);
    if (!res || my !== token || fen !== game.fen()) return;
    if (res.score != null) {
      setEval(res.score);
      preEval = res.score;
      preEvalFen = fen;
    }
    hintMove = res.best;
    hintFen = fen;
    if (hintWanted) showHint();
  }

  function sanFor(uci) {
    try {
      const t = new Chess(game.fen());
      const m = t.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
      return m ? m.san : uci;
    } catch (e) {
      return uci;
    }
  }

  function onHint() {
    if (!started || over || thinking || !engineReady || game.turn() !== playerColor) return;
    say("hint", 0.7);
    if (hintFen === game.fen() && hintMove) showHint();
    else {
      hintWanted = true;
      $("statusText").textContent = "Calculando a dica…";
    }
  }

  function showHint() {
    hintWanted = false;
    if (!hintMove || hintFen !== game.fen()) return;
    hintShown = { from: hintMove.slice(0, 2), to: hintMove.slice(2, 4) };
    selected = null;
    legalFromSel = [];
    render();
    $("statusText").textContent = "Dica: " + sanFor(hintMove);
  }

  /* ==========================================================
     RELÓGIO
     ========================================================== */
  function setupClock(spec) {
    stopClock();
    if (spec === "none") {
      clock.on = false;
    } else {
      const [m, i] = spec.split("|").map(Number);
      clock.on = true;
      clock.w = clock.b = m * 60000;
      clock.inc = i * 1000;
    }
    updateClockUI();
  }

  function startClock() {
    stopClock();
    if (!clock.on || over) return;
    clock.last = performance.now();
    clock.timer = setInterval(tick, 200);
  }

  function stopClock() {
    clearInterval(clock.timer);
    clock.timer = null;
  }

  function tick() {
    if (over || !started) return stopClock();
    const now = performance.now();
    const elapsed = now - clock.last;
    clock.last = now;
    const side = game.turn();
    clock[side] -= elapsed;
    if (clock[side] <= 0) {
      clock[side] = 0;
      updateClockUI();
      finishGame(side === playerColor ? "bot" : "player", "time");
      return;
    }
    updateClockUI();
  }

  function fmtClock(ms) {
    if (ms < 10000) return (Math.max(0, ms) / 1000).toFixed(1);
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function updateClockUI() {
    const top = $("clockTop"), bottom = $("clockBottom");
    top.hidden = bottom.hidden = !clock.on;
    if (!clock.on) return;
    const botColor = playerColor === "w" ? "b" : "w";
    top.textContent = fmtClock(clock[botColor]);
    bottom.textContent = fmtClock(clock[playerColor]);
    const turn = game.turn();
    const run = started && !over;
    top.classList.toggle("active", run && turn === botColor);
    bottom.classList.toggle("active", run && turn === playerColor);
    top.classList.toggle("low", clock[botColor] < 10000);
    bottom.classList.toggle("low", clock[playerColor] < 10000);
  }

  /* ==========================================================
     PLACAR
     ========================================================== */
  function loadScore() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && typeof s.w === "number") return s;
    } catch (e) {}
    return { w: 0, d: 0, l: 0 };
  }
  function saveScore(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function renderScore() {
    const s = loadScore();
    $("scoreW").textContent = s.w;
    $("scoreD").textContent = s.d;
    $("scoreL").textContent = s.l;
  }
  function recordResult(winner) {
    const s = loadScore();
    if (winner === "player") s.w++;
    else if (winner === "bot") s.l++;
    else s.d++;
    saveScore(s);
    renderScore();
  }

  /* ==========================================================
     FLUXO DO JOGO
     ========================================================== */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function startGame() {
    cancelEngine();
    if (engine) engine.postMessage("ucinewgame");
    game = new Chess();
    selected = null;
    legalFromSel = [];
    lastMove = null;
    over = false;
    started = true;
    gameWinner = null;
    hintShown = null;
    hintMove = hintFen = null;
    hintWanted = false;
    preEval = preEvalFen = null;
    reactAvatar(null);

    const choice = document.querySelector('input[name="color"]:checked').value;
    playerColor = choice === "r" ? (Math.random() < 0.5 ? "w" : "b") : choice;
    elo = parseInt($("eloRange").value, 10);

    setupClock($("clockSelect").value);
    $("botElo").textContent = "ELO " + elo;
    $("playerLabel").textContent = "Você (" + (playerColor === "w" ? "brancas" : "pretas") + ")";
    $("setupModal").hidden = true;
    $("btnCancel").hidden = false;
    $("btnUndo").disabled = clock.on;

    lastBotMat = botMaterial();
    setEval(0);
    render();
    updateClockUI();
    startClock();
    say("start");

    if (game.turn() !== playerColor) botTurn(++token);
    else {
      updateStatus();
      analysisForPlayer();
    }
  }

  function playerMove(from, to, promotion) {
    const fenBefore = game.fen();
    const pre = preEvalFen === fenBefore ? preEval : null;
    const preBest = hintFen === fenBefore ? hintMove : null;

    const r = game.move({ from, to, promotion });
    if (!r) return;
    const uci = from + to + (promotion || "");
    lastMove = { from, to };
    hintShown = null;
    hintWanted = false;
    selected = null;
    legalFromSel = [];
    if (clock.on) clock[playerColor] += clock.inc;
    render();
    updateClockUI();

    if (game.game_over()) return endByBoard();

    const delta = botMaterial() - lastBotMat;
    lastBotMat = botMaterial();
    if (delta <= -1) reactAvatar("sad");
    updateStatus();
    playerFollowUp({ pre, best: preBest, uci }, delta, ++token);
  }

  /* Avalia o lance do jogador, comenta e só então chama o bot */
  async function playerFollowUp(info, delta, my) {
    thinking = true;
    $("thinking").hidden = false;
    updateStatus();
    const fen = game.fen();
    const res = await analyze(fen);
    if (my !== token) return;

    let said = false;
    if (res && res.score != null) {
      setEval(res.score);
      said = classifyMove(info, res.score);
    }
    if (!said && delta <= -3) said = say("capLoss", 0.8);
    if (!said && delta <= -1) said = say("capLoss", 0.3);
    if (!said && game.in_check()) said = say("check", 0.6);
    if (!said) commentOpening();

    botTurn(my);
  }

  function classifyMove(info, newScore) {
    if (info.pre == null) return false;
    const sign = playerColor === "w" ? 1 : -1;
    const before = info.pre * sign;
    const after = newScore * sign;
    const loss = before - after;
    if ((before < -700 && after < -700) || (before > 700 && after > 700)) return false; // posição já decidida
    if (loss >= 300) return say("blunder");
    if (loss >= 130) return say("mistake", 0.7);
    if (info.best && info.uci === info.best) return say("praise", 0.4);
    if (loss <= 15) return say("praise", 0.12);
    return false;
  }

  async function botTurn(my) {
    if (over || !engineReady || game.game_over()) return;
    thinking = true;
    $("thinking").hidden = false;
    updateStatus();

    const level = levelFor(elo);
    const moves = game.moves({ verbose: true });
    const started = Date.now();
    let uci = null;

    if (Math.random() < level.blunder) {
      const m = moves[Math.floor(Math.random() * moves.length)];
      uci = m.from + m.to + (m.promotion || "");
      await sleep(500);
    } else {
      const botColor = playerColor === "w" ? "b" : "w";
      const t = clock.on ? Math.min(level.time, Math.max(120, Math.floor(clock[botColor] / 30))) : level.time;
      const res = await search(game.fen(), { skill: level.skill, depth: level.depth, time: t });
      uci = res && res.best;
      const wait = 450 - (Date.now() - started);
      if (wait > 0) await sleep(wait);
    }

    if (my !== token || over) return;
    thinking = false;
    $("thinking").hidden = true;

    let result = null;
    if (uci) {
      result = game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4, 5) || undefined,
      });
    }
    if (!result) {
      const m = moves[0];
      result = game.move({ from: m.from, to: m.to, promotion: m.promotion });
    }
    lastMove = result ? { from: result.from, to: result.to } : null;
    selected = null;
    legalFromSel = [];
    const botColor = playerColor === "w" ? "b" : "w";
    if (clock.on) clock[botColor] += clock.inc;
    render();
    updateClockUI();

    if (game.game_over()) return endByBoard();

    const delta = botMaterial() - lastBotMat;
    lastBotMat = botMaterial();
    let said = false;
    if (delta >= 1) reactAvatar("happy");
    if (delta >= 2) said = say("capGain", 0.6);
    if (!said && game.in_check()) said = say("botCheck", 0.5);
    if (!said) commentOpening();

    updateStatus();
    analysisForPlayer();
  }

  function drawReason() {
    if (game.in_stalemate()) return "stalemate";
    if (game.insufficient_material()) return "insufficient";
    if (game.in_threefold_repetition()) return "repetition";
    return "draw";
  }

  function endByBoard() {
    if (game.in_checkmate()) finishGame(game.turn() === playerColor ? "bot" : "player", "checkmate");
    else finishGame("draw", drawReason());
  }

  function finishGame(winner, reason) {
    if (over) return;
    over = true;
    gameWinner = winner;
    stopClock();
    cancelEngine();
    hintShown = null;
    hintWanted = false;
    selected = null;
    legalFromSel = [];

    const bot = CONFIG.BOT_NAME;
    const texts = {
      "player:checkmate": "Xeque-mate — você venceu! 🎉",
      "player:time": "Tempo do " + bot + " esgotado — você venceu! 🎉",
      "bot:checkmate": "Xeque-mate — o " + bot + " venceu.",
      "bot:resign": "Você desistiu. O " + bot + " venceu.",
      "bot:time": "Seu tempo acabou. O " + bot + " venceu.",
      "draw:stalemate": "Empate por afogamento.",
      "draw:insufficient": "Empate por material insuficiente.",
      "draw:repetition": "Empate por repetição.",
      "draw:draw": "Empate.",
    };
    $("statusText").textContent = texts[winner + ":" + reason] || "Fim de jogo.";

    recordResult(winner);

    if (winner === "player") {
      reactAvatar("lose", true);
      say(reason === "time" ? "playerFlag" : "playerMate");
    } else if (winner === "bot") {
      reactAvatar("win", true);
      say(reason === "resign" ? "resign" : reason === "time" ? "botFlag" : "botMate");
    } else {
      reactAvatar(null);
      say("draw");
    }
    render();
    updateClockUI();
  }

  function updateStatus() {
    if (over) return;
    const el = $("statusText");
    if (thinking) el.textContent = CONFIG.BOT_NAME + " está pensando…";
    else el.textContent = (game.in_check() ? "Xeque! " : "") + "Sua vez.";
  }

  /* ==========================================================
     INTERAÇÃO
     ========================================================== */
  function onSquareClick(sq) {
    if (!started || over || thinking || !engineReady || game.turn() !== playerColor) return;

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

  function askPromotion(from, to) {
    pendingPromo = { from, to };
    const box = $("promoChoices");
    box.innerHTML = "";
    ["q", "r", "b", "n"].forEach((p) => {
      const b = document.createElement("button");
      b.innerHTML = pieceSVG(p, playerColor, "promo-piece");
      b.onclick = () => {
        $("promoModal").hidden = true;
        const pp = pendingPromo;
        pendingPromo = null;
        playerMove(pp.from, pp.to, p);
      };
      box.appendChild(b);
    });
    $("promoModal").hidden = false;
  }

  function undo() {
    if (!started || over || clock.on || !game.history().length) return;
    cancelEngine();
    game.undo();
    if (game.turn() !== playerColor && game.history().length) game.undo();
    selected = null;
    legalFromSel = [];
    hintShown = null;
    hintMove = hintFen = null;
    hintWanted = false;
    const h = game.history({ verbose: true });
    lastMove = h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
    lastBotMat = botMaterial();
    say("undo", 0.5);
    render();
    if (game.turn() !== playerColor) botTurn(++token);
    else {
      updateStatus();
      analysisForPlayer();
    }
  }

  function resign() {
    if (!started || over) return;
    finishGame("bot", "resign");
  }

  /* ==========================================================
     PGN
     ========================================================== */
  function buildPgn() {
    const pad = (n) => String(n).padStart(2, "0");
    const d = new Date();
    const date = d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
    const botName = CONFIG.BOT_NAME + " (ELO " + elo + ")";
    const white = playerColor === "w" ? "Jogador" : botName;
    const black = playerColor === "w" ? botName : "Jogador";
    let res = "*";
    if (gameWinner === "draw") res = "1/2-1/2";
    else if (gameWinner === "player") res = playerColor === "w" ? "1-0" : "0-1";
    else if (gameWinner === "bot") res = playerColor === "w" ? "0-1" : "1-0";
    const headers = [
      ["Event", "Partida contra " + CONFIG.BOT_NAME],
      ["Site", "GitHub Pages"],
      ["Date", date],
      ["Round", "-"],
      ["White", white],
      ["Black", black],
      ["Result", res],
    ]
      .map(([k, v]) => "[" + k + ' "' + v + '"]')
      .join("\n");
    const moves = game.pgn({ max_width: 80, newline_char: "\n" });
    return headers + "\n\n" + (moves ? moves + " " : "") + res + "\n";
  }

  function openPgn() {
    $("pgnText").value = buildPgn();
    $("pgnMsg").textContent = game.history().length ? "" : "Ainda não há lances nesta partida.";
    $("pgnModal").hidden = false;
  }

  async function copyPgn() {
    const ta = $("pgnText");
    try {
      await navigator.clipboard.writeText(ta.value);
      $("pgnMsg").textContent = "PGN copiado! Cole no Lichess ou no Chess.com.";
    } catch (e) {
      ta.focus();
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) {}
      $("pgnMsg").textContent = ok ? "PGN copiado!" : "Selecione o texto e copie manualmente.";
    }
  }

  function downloadPgn() {
    const blob = new Blob([$("pgnText").value], { type: "application/x-chess-pgn" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "partida-" + CONFIG.BOT_NAME.toLowerCase() + ".pgn";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ==========================================================
     RENDERIZAÇÃO
     ========================================================== */
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
        if (hintShown && (hintShown.from === sq || hintShown.to === sq)) el.classList.add("hint");

        if (c === 0) el.insertAdjacentHTML("beforeend", '<span class="coord rank">' + rank + "</span>");
        if (r === 7) el.insertAdjacentHTML("beforeend", '<span class="coord file">' + FILES[file] + "</span>");

        const p = game.get(sq);
        if (p) el.insertAdjacentHTML("beforeend", pieceSVG(p.type, p.color, "piece"));
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
    renderCaptured();
    updateEvalBar();
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

  function capHTML(list, color) {
    // list: tipos capturados; color: cor das peças capturadas
    const order = ["q", "r", "b", "n", "p"];
    let html = "";
    order.forEach((t) => {
      const n = list.filter((x) => x === t).length;
      if (!n) return;
      html += '<span class="cap-group">' + pieceSVG(t, color, "cap-piece").repeat(n) + "</span>";
    });
    return html;
  }

  function renderCaptured() {
    const byW = [], byB = []; // peças capturadas por brancas / por pretas
    game.history({ verbose: true }).forEach((m) => {
      if (m.captured) (m.color === "w" ? byW : byB).push(m.captured);
    });
    let diff = 0; // material brancas - pretas
    game.board().forEach((row) =>
      row.forEach((p) => {
        if (p) diff += (p.color === "w" ? 1 : -1) * VAL[p.type];
      })
    );
    const botColor = playerColor === "w" ? "b" : "w";
    const mine = playerColor === "w" ? byW : byB; // o que EU capturei (peças de cor oposta)
    const theirs = playerColor === "w" ? byB : byW; // o que o bot capturou (minhas peças)
    const myAdv = playerColor === "w" ? diff : -diff;

    $("capBottom").innerHTML = capHTML(mine, botColor) + (myAdv > 0 ? '<span class="cap-adv">+' + myAdv + "</span>" : "");
    $("capTop").innerHTML = capHTML(theirs, playerColor) + (myAdv < 0 ? '<span class="cap-adv">+' + -myAdv + "</span>" : "");
  }

  /* ==========================================================
     INICIALIZAÇÃO
     ========================================================== */
  function setupBot() {
    document.title = "Xadrez contra o " + CONFIG.BOT_NAME;
    $("botName").textContent = CONFIG.BOT_NAME;
    document.querySelectorAll(".bot-name-inline").forEach((e) => (e.textContent = CONFIG.BOT_NAME));
    const img = $("botAvatar");
    // Se a foto não carregar, mostra apenas um círculo neutro (sem emoji nem texto)
    img.onerror = () => $("avatarWrap").classList.add("no-photo");
    img.src = CONFIG.BOT_AVATAR;
  }

  function openSetup() {
    stopClock();
    $("setupModal").hidden = false;
  }

  function init() {
    setupBot();
    renderScore();
    render();

    const range = $("eloRange");
    const sync = () => {
      $("eloValue").textContent = range.value;
      $("eloLabel").textContent = eloDescription(parseInt(range.value, 10));
    };
    range.addEventListener("input", sync);
    sync();

    $("btnStart").addEventListener("click", startGame);
    $("btnNew").addEventListener("click", openSetup);
    $("btnCancel").addEventListener("click", () => {
      $("setupModal").hidden = true;
      startClock();
    });
    $("btnUndo").addEventListener("click", undo);
    $("btnHint").addEventListener("click", onHint);
    $("btnResign").addEventListener("click", resign);
    $("btnPgn").addEventListener("click", openPgn);
    $("pgnClose").addEventListener("click", () => ($("pgnModal").hidden = true));
    $("pgnCopy").addEventListener("click", copyPgn);
    $("pgnDownload").addEventListener("click", downloadPgn);
    $("btnResetScore").addEventListener("click", () => {
      if (confirm("Zerar o placar?")) {
        saveScore({ w: 0, d: 0, l: 0 });
        renderScore();
      }
    });

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
