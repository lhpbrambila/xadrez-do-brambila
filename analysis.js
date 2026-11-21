/* ==========================================================
   ANÁLISE PÓS-JOGO
   Depende do app.js (window.Brambila) e do chess.js.
   Avalia cada posição da partida com o Stockfish (2 melhores
   linhas), classifica cada lance e mostra tudo em uma tela de revisão.
   ========================================================== */
(() => {
  "use strict";

  const B = window.Brambila;
  if (!B) return;

  const $ = (id) => document.getElementById(id);
  const FILES = "abcdefgh";
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const MATE = B.MATE;

  /* Tempo por posição (ms): padrão e profunda */
  const QUALITY = { standard: 500, deep: 1200 };

  /* ---------- Categorias de lances ---------- */
  const CATS = {
    brilliant: { sym: "!!", color: "#1baca6", fg: "#fff", label: "Brilhante", desc: "Sacrifício brilhante! O motor confirma que vale a pena." },
    great: { sym: "!", color: "#5c8bb0", fg: "#fff", label: "Ótimo", desc: "Lance muito preciso, quase o único que mantém a posição." },
    best: { sym: "★", color: "#81b64c", fg: "#fff", label: "Melhor", desc: "É o lance preferido do motor." },
    excellent: { sym: "✓", color: "#9dc459", fg: "#17240a", label: "Excelente", desc: "Praticamente tão bom quanto o melhor lance." },
    good: { sym: "•", color: "#a3a78f", fg: "#1e1e1e", label: "Bom", desc: "Um lance sólido." },
    book: { sym: "T", color: "#a88865", fg: "#fff", label: "Teoria", desc: "Lance conhecido da teoria de abertura." },
    inaccuracy: { sym: "?!", color: "#f7c631", fg: "#3a2f00", label: "Imprecisão", desc: "Imprecisão: havia uma opção melhor." },
    mistake: { sym: "?", color: "#e58f2a", fg: "#fff", label: "Erro", desc: "Erro: piora a posição de forma relevante." },
    blunder: { sym: "??", color: "#ca3431", fg: "#fff", label: "Erro grave", desc: "Erro grave: joga fora a vantagem ou a partida." },
  };
  const CAT_ORDER = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "blunder"];
  const ERROR_CATS = ["inaccuracy", "mistake", "blunder"];
  const NOTABLE = ["brilliant", "great", "inaccuracy", "mistake", "blunder"];
  const NO_BEST_HINT = ["best", "brilliant", "great", "book"];

  /* Sequências de abertura conhecidas (derivadas do OPENINGS do app.js) */
  const BOOK = (() => {
    const s = new Set();
    Object.keys(B.OPENINGS).forEach((k) => {
      const t = k.split(" ");
      for (let i = 1; i <= t.length; i++) s.add(t.slice(0, i).join(" "));
    });
    return s;
  })();

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Chance de vitória (0–100) a partir de centipeões, fórmula do Lichess */
  const wp = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

  /* ==========================================================
     MOTOR DE ANÁLISE (worker próprio, 2 linhas)
     ========================================================== */
  function makeAnalyzer(url) {
    const w = new Worker(url);
    let phase = "uci";
    let cur = null;
    let resolveReady;
    const ready = new Promise((r) => (resolveReady = r));

    w.onmessage = (e) => {
      const line = String(e.data);
      if (phase === "uci") {
        if (line === "uciok") {
          w.postMessage("setoption name Skill Level value 20");
          w.postMessage("setoption name MultiPV value 2");
          phase = "ready";
          w.postMessage("isready");
        }
      } else if (phase === "ready") {
        if (line === "readyok") {
          phase = "run";
          resolveReady();
        }
      } else if (cur) {
        if (line.startsWith("info")) {
          if (/ (lower|upper)bound/.test(line)) return;
          const m = line.match(/score (cp|mate) (-?\d+)/);
          if (!m) return;
          const mp = line.match(/multipv (\d+)/);
          const pv = line.match(/ pv (.+)$/);
          const n = parseInt(m[2], 10);
          let v = m[1] === "cp" ? n : (n > 0 ? 1 : -1) * (MATE - Math.abs(n) * 10);
          if (cur.stm === "b") v = -v; // sempre do ponto de vista das brancas
          const pvList = pv ? pv[1].trim().split(/\s+/) : [];
          cur.lines[mp ? parseInt(mp[1], 10) : 1] = { score: v, move: pvList[0] || null, pv: pvList };
        } else if (line.startsWith("bestmove")) {
          const c = cur;
          cur = null;
          const best = line.split(" ")[1];
          c.resolve({ best: best && best !== "(none)" ? best : null, lines: c.lines });
        }
      }
    };
    w.postMessage("uci");

    return {
      ready,
      evalFen(fen, ms) {
        return new Promise((resolve) => {
          cur = { stm: fen.split(" ")[1], lines: {}, resolve };
          w.postMessage("position fen " + fen);
          w.postMessage("go depth 18 movetime " + ms);
        });
      },
      destroy() {
        try { w.terminate(); } catch (e) {}
        if (cur) {
          cur.resolve(null);
          cur = null;
        }
      },
    };
  }

  /* ==========================================================
     CLASSIFICAÇÃO DOS LANCES
     ========================================================== */
  function matDiff(fen, color) {
    let s = 0;
    new Chess(fen).board().forEach((row) =>
      row.forEach((p) => {
        if (p) s += (p.color === color ? 1 : -1) * VAL[p.type];
      })
    );
    return s;
  }

  const uciMove = (u) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined });

  /* Busca de capturas (quiescência): resolve as trocas pendentes e devolve o saldo de material
     do lado que joga. score = material (lado a jogar − adversário) na posição atual. */
  function quiesce(chess, score, alpha, beta, depth, budget) {
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
    if (depth === 0 || budget.n <= 0) return score;
    const caps = chess.moves({ verbose: true }).filter((m) => m.captured);
    caps.sort((a, b) => VAL[b.captured] * 10 - VAL[b.piece] - (VAL[a.captured] * 10 - VAL[a.piece]));
    for (const m of caps) {
      budget.n--;
      const gain = VAL[m.captured] + (m.promotion ? VAL[m.promotion] - 1 : 0);
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      const v = -quiesce(chess, -(score + gain), -beta, -alpha, depth - 1, budget);
      chess.undo();
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  /* Quanto material o jogador perde DE FORMA DEFINITIVA depois do lance?
     Segue a linha do motor enquanto forem capturas e resolve as trocas restantes.
     Devolve null se o adversário não responde capturando. */
  function resolvedLoss(fenBefore, fenAfter, pv, mover) {
    const start = matDiff(fenBefore, mover);
    let cur = new Chess(fenAfter);
    let first = null;
    for (const u of pv || []) {
      const probe = new Chess(cur.fen());
      const r = probe.move(uciMove(u));
      if (!r || !r.captured) break;
      if (!first) first = r;
      cur = probe;
    }
    if (!first) return null;
    const side = cur.turn();
    const q = quiesce(cur, matDiff(cur.fen(), side), -99, 99, 8, { n: 600 });
    return { first, lost: start - (side === mover ? q : -q) };
  }

  /* Sacrifício de verdade: a peça que acabou de se mover é capturada, a troca não se
     compensa em material (≥ 2 pontos) e o lance não é roque nem promoção. */
  function sacrificeSize(fenBefore, fenAfter, pv, mover, info) {
    if (/^O-O/.test(info.san) || info.promotion || !pv || !pv.length) return 0;
    try {
      const rl = resolvedLoss(fenBefore, fenAfter, pv, mover);
      if (rl && rl.first.to === info.to && rl.lost >= 2) return rl.lost;
    } catch (e) {}
    return 0;
  }

  function sanOf(fen, uci) {
    if (!uci) return null;
    try {
      const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
      return m ? m.san : null;
    } catch (e) {
      return null;
    }
  }

  function classifyAll(fens, sans, infos, pos) {
    const out = [];
    for (let i = 0; i < infos.length; i++) {
      const info = infos[i];
      const mover = info.color;
      const sign = mover === "w" ? 1 : -1;
      const pb = pos[i];
      const pa = pos[i + 1];
      const uci = info.from + info.to + (info.promotion || "");
      const top = pb.lines[1];
      const second = pb.lines[2];
      const wpB = wp(top.score * sign);
      const isBest = uci === pb.best || (top.move && uci === top.move);

      let loss;
      if (isBest) loss = 0;
      else if (second && second.move === uci) loss = Math.max(0, wpB - wp(second.score * sign));
      else loss = Math.max(0, wpB - wp(pa.score * sign));
      // mate que existia e foi perdido
      if (!isBest && top.score * sign >= MATE - 500 && pa.score * sign < MATE - 500) loss = Math.max(loss, 12);

      const bestish = isBest || loss <= 2;

      // Brilhante: sacrifício real (peça movida perdida sem compensação em material) que o motor aprova
      let sacrificed = 0;
      if (bestish && pa.best && wpB < 85) {
        sacrificed = sacrificeSize(fens[i], fens[i + 1], pa.lines[1] && pa.lines[1].pv, mover, info);
      }
      const brilliant = sacrificed >= 2 && wpB - loss >= 45;

      // Ótimo: lance único (ou quase) que a segunda melhor opção não alcança
      let great = false;
      if (isBest && second && wpB < 97 && wpB > 8) {
        const gap = wpB - wp(second.score * sign);
        const prev = infos[i - 1];
        const recapture = prev && prev.captured && info.captured && prev.to === info.to;
        great = gap >= 18 && !recapture;
      }

      const isBook = i < 10 && BOOK.has(sans.slice(0, i + 1).join(" "));

      let cat;
      if (isBook && loss < 10) cat = "book";
      else if (brilliant) cat = "brilliant";
      else if (great) cat = "great";
      else if (isBest) cat = "best";
      else if (loss <= 2) cat = "excellent";
      else if (loss < 10) cat = "good";
      else if (loss < 20) cat = "inaccuracy";
      else if (loss < 30) cat = "mistake";
      else cat = "blunder";

      const acc = Math.min(100, Math.max(0, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));

      out.push({
        i,
        color: mover,
        san: sans[i],
        uci,
        cat,
        loss,
        acc,
        sacrificed: brilliant ? sacrificed : 0,
        bestUci: pb.best,
        bestSan: sanOf(fens[i], pb.best),
        evalBefore: pb.score,
        evalAfter: pa.score,
      });
    }
    return out;
  }

  function summarize(moves, color) {
    const counts = {};
    CAT_ORDER.forEach((c) => (counts[c] = 0));
    let sum = 0;
    let n = 0;
    moves.forEach((m) => {
      if (m.color !== color) return;
      counts[m.cat]++;
      sum += m.acc;
      n++;
    });
    return { counts, acc: n ? sum / n : null, n };
  }

  /* ==========================================================
     ESTADO E FLUXO
     ========================================================== */
  let state = null;
  let runToken = 0;
  let analyzer = null;
  const cache = {};

  function gameKey(g) {
    return g.moves.map((m) => m.from + m.to + (m.promotion || "")).join(",");
  }

  function showLoading(text, pct, cancelable) {
    $("anLoading").hidden = false;
    $("anContent").hidden = true;
    $("anLoadText").textContent = text;
    $("anProg").style.width = pct + "%";
    $("anCancel").hidden = cancelable === false;
  }

  function stopAnalyzer() {
    if (analyzer) {
      analyzer.destroy();
      analyzer = null;
    }
  }

  async function open() {
    const g = B.getLastGame();
    if (!g || !g.moves.length) return;
    B.pause();
    $("analysisModal").hidden = false;
    document.body.classList.add("no-scroll");
    $("anBox").scrollTop = 0;

    const key = gameKey(g);
    if (cache[key]) {
      state = cache[key];
      showContent();
      return;
    }
    await start(g, "standard");
  }

  function close() {
    runToken++;
    stopAnalyzer();
    $("analysisModal").hidden = true;
    document.body.classList.remove("no-scroll");
    B.resume();
  }

  async function start(g, quality) {
    const my = ++runToken;
    stopAnalyzer();
    showLoading("Preparando o motor…", 0);

    try {
      await B.whenEngineReady();
      if (my !== runToken) return;
      analyzer = makeAnalyzer(B.getEngineUrl());
      const az = analyzer;
      await az.ready;
      if (my !== runToken) return;

      // posições da partida
      const chess = new Chess();
      const fens = [chess.fen()];
      const sans = [];
      const infos = [];
      for (const m of g.moves) {
        const r = chess.move({ from: m.from, to: m.to, promotion: m.promotion || undefined });
        if (!r) throw new Error("Lance inválido na partida salva");
        sans.push(r.san);
        infos.push(r);
        fens.push(chess.fen());
      }
      const finalOver = chess.game_over();
      const finalScore = chess.in_checkmate() ? (chess.turn() === "w" ? -MATE : MATE) : 0;

      const ms = QUALITY[quality];
      const pos = [];
      for (let i = 0; i < fens.length; i++) {
        if (my !== runToken) return;
        showLoading("Analisando posição " + (i + 1) + " de " + fens.length + "…", (i / fens.length) * 100);

        if (i === fens.length - 1 && finalOver) {
          pos.push({ best: null, lines: { 1: { score: finalScore, move: null } }, score: finalScore });
          continue;
        }
        const r = await az.evalFen(fens[i], ms);
        if (my !== runToken || !r) return;
        if (!r.lines[1]) r.lines[1] = { score: pos.length ? pos[pos.length - 1].score : 0, move: r.best };
        r.score = r.lines[1].score;
        pos.push(r);
      }
      stopAnalyzer();

      const moves = classifyAll(fens, sans, infos, pos);
      state = {
        key: gameKey(g),
        game: g,
        quality,
        fens,
        infos,
        pos,
        moves,
        n: moves.length,
        idx: 0,
        flipped: g.playerColor === "b",
        playerColor: g.playerColor,
        you: summarize(moves, g.playerColor),
        bot: summarize(moves, g.playerColor === "w" ? "b" : "w"),
        wpW: pos.map((p) => wp(p.score)),
      };
      cache[state.key] = state;
      showContent();
    } catch (err) {
      console.error(err);
      if (my !== runToken) return;
      stopAnalyzer();
      showLoading("Não foi possível analisar: " + (err && err.message ? err.message : err), 0, false);
    }
  }

  /* ==========================================================
     INTERFACE
     ========================================================== */
  const DOT_SYM = (cat) => '<span class="mini" style="background:' + CATS[cat].color + ";color:" + CATS[cat].fg + '">' + CATS[cat].sym + "</span>";

  function showContent() {
    $("anLoading").hidden = true;
    $("anContent").hidden = false;
    state.idx = 0;

    const g = state.game;
    const resultTxt = g.winner === "player" ? "vitória sua" : g.winner === "bot" ? "vitória do " + B.CONFIG.BOT_NAME : "empate";
    $("anMeta").textContent =
      "Você de " + (g.playerColor === "w" ? "brancas" : "pretas") + " · " + B.CONFIG.BOT_NAME + " ELO " + g.elo + " · " + resultTxt;

    // comentário do Brambila
    const a = state.you.acc, b = state.bot.acc;
    let cat = "analysisEven";
    if (a != null && a >= 90) cat = "analysisPro";
    else if (a != null && b != null) cat = a > b + 5 ? "analysisWin" : a < b - 5 ? "analysisLose" : "analysisEven";
    const arr = B.PHRASES[cat];
    $("anSay").textContent = B.CONFIG.BOT_NAME + ": " + arr[Math.floor(Math.random() * arr.length)];

    $("anDeep").hidden = state.quality === "deep";

    renderSummary();
    renderGraph();
    renderMoveList();
    goTo(0);
  }

  function renderSummary() {
    const y = state.you, b = state.bot;
    const fmt = (v) => (v == null ? "–" : v.toFixed(1) + "%");
    const botName = esc(B.CONFIG.BOT_NAME);
    let html =
      '<div class="an-acc">' +
      '<div class="acc"><span>Você</span><strong>' + fmt(y.acc) + "</strong><small>precisão</small></div>" +
      '<div class="acc"><span>' + botName + "</span><strong>" + fmt(b.acc) + "</strong><small>precisão</small></div>" +
      "</div>" +
      '<div class="an-table"><div></div><div class="th">Você</div><div class="th">' + botName + "</div>";
    CAT_ORDER.forEach((c) => {
      const cy = y.counts[c], cb = b.counts[c];
      html +=
        '<div class="lab">' + DOT_SYM(c) + CATS[c].label + "</div>" +
        '<div class="num' + (cy ? "" : " dim") + '">' + cy + "</div>" +
        '<div class="num' + (cb ? "" : " dim") + '">' + cb + "</div>";
    });
    html += "</div>";
    $("anSummary").innerHTML = html;
  }

  function graphY(v) {
    return 100 - v;
  }

  function renderGraph() {
    const n = state.n;
    const pts = state.wpW.map((v, i) => ((i / n) * 600).toFixed(1) + "," + graphY(v).toFixed(1)).join(" ");
    const svg =
      '<svg viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="600" height="100" fill="#3a352c"/>' +
      '<polygon points="0,100 ' + pts + ' 600,100" fill="#ece7dc"/>' +
      '<line x1="0" y1="50" x2="600" y2="50" stroke="#888" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="#e0a526" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
      "</svg>";
    let dots = "";
    state.moves.forEach((m, k) => {
      if (!NOTABLE.includes(m.cat)) return;
      const left = (((k + 1) / n) * 100).toFixed(2);
      const top = graphY(state.wpW[k + 1]).toFixed(2);
      dots += '<span class="gdot" style="left:' + left + "%;top:" + top + "%;background:" + CATS[m.cat].color + '"></span>';
    });
    $("anGraph").innerHTML = svg + dots + '<span id="anCursor" class="gcursor"></span>';
  }

  function renderMoveList() {
    const list = $("anMoves");
    list.innerHTML = "";
    const cell = (k) => {
      const m = state.moves[k];
      if (!m) return "<span></span>";
      return '<button class="an-cell" data-k="' + k + '">' + DOT_SYM(m.cat) + "<span>" + esc(m.san) + "</span></button>";
    };
    let html = "";
    for (let k = 0; k < state.n; k += 2) {
      html += '<span class="n">' + (k / 2 + 1) + ".</span>" + cell(k) + cell(k + 1);
    }
    list.innerHTML = html;
  }

  /* ----- seta ----- */
  function sqCenter(sq, flipped) {
    const f = FILES.indexOf(sq[0]);
    const r = parseInt(sq[1], 10);
    return { x: (flipped ? 7 - f : f) * 10 + 5, y: (flipped ? r - 1 : 8 - r) * 10 + 5 };
  }

  function arrowSVG(from, to, color, flipped) {
    const a = sqCenter(from, flipped);
    const b = sqCenter(to, flipped);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const head = 3.8, hw = 2.7;
    const tipX = b.x - ux * 1.2, tipY = b.y - uy * 1.2;
    const baseX = tipX - ux * head, baseY = tipY - uy * head;
    const sx = a.x + ux * 2.5, sy = a.y + uy * 2.5;
    const px = -uy, py = ux;
    return (
      '<g opacity="0.85">' +
      '<line x1="' + sx.toFixed(2) + '" y1="' + sy.toFixed(2) + '" x2="' + baseX.toFixed(2) + '" y2="' + baseY.toFixed(2) +
      '" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<polygon fill="' + color + '" points="' + tipX.toFixed(2) + "," + tipY.toFixed(2) + " " +
      (baseX + px * hw).toFixed(2) + "," + (baseY + py * hw).toFixed(2) + " " +
      (baseX - px * hw).toFixed(2) + "," + (baseY - py * hw).toFixed(2) + '"/></g>'
    );
  }

  function renderBoard() {
    const flipped = state.flipped;
    const chess = new Chess(state.fens[state.idx]);
    const info = state.idx > 0 ? state.infos[state.idx - 1] : null;
    const mv = state.idx > 0 ? state.moves[state.idx - 1] : null;
    const el = $("anBoard");
    el.innerHTML = "";

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const file = flipped ? 7 - c : c;
        const rank = flipped ? r + 1 : 8 - r;
        const sq = FILES[file] + rank;
        const d = document.createElement("div");
        d.className = "sq " + ((file + rank) % 2 === 1 ? "light" : "dark");
        if (info && (info.from === sq || info.to === sq)) d.classList.add("last");

        if (c === 0) d.insertAdjacentHTML("beforeend", '<span class="coord rank">' + rank + "</span>");
        if (r === 7) d.insertAdjacentHTML("beforeend", '<span class="coord file">' + FILES[file] + "</span>");

        const p = chess.get(sq);
        if (p) d.insertAdjacentHTML("beforeend", B.pieceSVG(p.type, p.color, "piece"));
        if (mv && info.to === sq) {
          const cat = CATS[mv.cat];
          d.insertAdjacentHTML(
            "beforeend",
            '<span class="abadge' + (cat.sym.length > 1 ? " two" : "") + '" style="background:' + cat.color + ";color:" + cat.fg + '">' + cat.sym + "</span>"
          );
        }
        el.appendChild(d);
      }
    }

    // setas: lance jogado e, se diferente, o melhor lance
    let arrows = "";
    if (mv) {
      const played = CATS[mv.cat].color;
      if (mv.bestUci && mv.bestUci !== mv.uci && !NO_BEST_HINT.includes(mv.cat)) {
        arrows += arrowSVG(mv.bestUci.slice(0, 2), mv.bestUci.slice(2, 4), "#81b64c", flipped);
      }
      arrows += arrowSVG(mv.uci.slice(0, 2), mv.uci.slice(2, 4), ERROR_CATS.includes(mv.cat) ? played : "#e0a526", flipped);
    }
    $("anArrows").innerHTML = arrows;

    B.paintEvalBar($("anEvalFill"), $("anEvalText"), state.pos[state.idx].score, flipped);
  }

  function renderDetail() {
    const d = $("anDetail");
    if (state.idx === 0) {
      d.innerHTML =
        '<div class="d-title">Posição inicial</div>' +
        '<p class="muted">Use os botões, as setas do teclado, o gráfico ou a lista de lances para percorrer a partida. ' +
        "Setas verdes mostram o melhor lance quando houve algo melhor.</p>";
      return;
    }
    const k = state.idx - 1;
    const m = state.moves[k];
    const cat = CATS[m.cat];
    const num = Math.floor(k / 2) + 1 + (m.color === "w" ? "." : "...");
    const mine = m.color === state.playerColor;

    let html =
      '<div class="d-head"><span class="mini big" style="background:' + cat.color + ";color:" + cat.fg + '">' + cat.sym + "</span><div>" +
      '<div class="d-title">' + num + " " + esc(m.san) + " — " + cat.label + "</div>" +
      '<div class="d-sub">' + (mine ? "Seu lance" : "Lance do " + esc(B.CONFIG.BOT_NAME)) + " · avaliação " + "<b>" + B.fmtScore(m.evalAfter) + "</b></div>" +
      "</div></div><p>" +
      (m.cat === "brilliant" && m.sacrificed
        ? "Sacrifício brilhante! Abre mão de " + m.sacrificed + " ponto(s) de material, e o motor confirma que vale a pena."
        : cat.desc) +
      "</p>";

    if (m.cat === "book") {
      const note = B.OPENINGS[state.moves.slice(0, k + 1).map((x) => x.san).join(" ")];
      if (note) html += "<p class=\"muted\">" + esc(note) + "</p>";
    }
    if (m.bestSan && m.bestSan !== m.san && !NO_BEST_HINT.includes(m.cat)) {
      html += '<p>Melhor era <b class="bestmv">' + esc(m.bestSan) + "</b>";
      if (ERROR_CATS.includes(m.cat)) html += " · perda de " + Math.round(m.loss) + "% nas chances de vitória";
      html += ".</p>";
    }
    d.innerHTML = html;
  }

  function goTo(i) {
    state.idx = Math.max(0, Math.min(state.n, i));
    renderBoard();
    renderDetail();

    $("anCursor").style.left = ((state.idx / state.n) * 100).toFixed(2) + "%";

    let curCell = null;
    $("anMoves").querySelectorAll(".an-cell").forEach((c) => {
      const on = parseInt(c.dataset.k, 10) === state.idx - 1;
      c.classList.toggle("cur", on);
      if (on) curCell = c;
    });
    if (curCell) {
      const box = $("anMoves");
      const top = curCell.offsetTop - box.offsetTop;
      if (top < box.scrollTop) box.scrollTop = top - 6;
      else if (top + curCell.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + curCell.offsetHeight - box.clientHeight + 6;
    }

    $("anFirst").disabled = $("anPrev").disabled = state.idx === 0;
    $("anNext").disabled = $("anLast").disabled = state.idx === state.n;
  }

  /* Próximo/anterior erro do jogador (imprecisão, erro ou erro grave) */
  function jumpError(dir) {
    const mine = state.playerColor;
    const isErr = (k) => state.moves[k] && state.moves[k].color === mine && ERROR_CATS.includes(state.moves[k].cat);
    let k = state.idx - 1 + dir; // lance atual = idx-1
    if (dir > 0) {
      for (; k < state.n; k++) if (isErr(k)) return goTo(k + 1);
    } else {
      for (k = state.idx - 2; k >= 0; k--) if (isErr(k)) return goTo(k + 1);
    }
    $("anDetail").insertAdjacentHTML("afterbegin", '<p class="muted flash">Nenhum ' + (dir > 0 ? "próximo" : "anterior") + " erro seu.</p>");
  }

  /* ==========================================================
     EVENTOS
     ========================================================== */
  function init() {
    $("anClose").addEventListener("click", close);
    $("anCancel").addEventListener("click", close);
    $("anFirst").addEventListener("click", () => goTo(0));
    $("anPrev").addEventListener("click", () => goTo(state.idx - 1));
    $("anNext").addEventListener("click", () => goTo(state.idx + 1));
    $("anLast").addEventListener("click", () => goTo(state.n));
    $("anPrevErr").addEventListener("click", () => jumpError(-1));
    $("anNextErr").addEventListener("click", () => jumpError(1));
    $("anFlip").addEventListener("click", () => {
      state.flipped = !state.flipped;
      renderBoard();
    });
    $("anDeep").addEventListener("click", () => {
      const g = state.game;
      start(g, "deep");
    });
    $("anMoves").addEventListener("click", (e) => {
      const c = e.target.closest(".an-cell");
      if (c) goTo(parseInt(c.dataset.k, 10) + 1);
    });

    // gráfico clicável/arrastável
    const graph = $("anGraph");
    let dragging = false;
    const pick = (ev) => {
      if (!state) return;
      const r = graph.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
      goTo(Math.round(f * state.n));
    };
    graph.addEventListener("pointerdown", (ev) => {
      dragging = true;
      pick(ev);
    });
    graph.addEventListener("pointermove", (ev) => dragging && pick(ev));
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => graph.addEventListener(t, () => (dragging = false)));

    document.addEventListener("keydown", (e) => {
      if ($("analysisModal").hidden) return;
      if (e.key === "Escape") return close();
      if (!state || $("anContent").hidden) return;
      if (e.key === "ArrowLeft") goTo(state.idx - 1);
      else if (e.key === "ArrowRight") goTo(state.idx + 1);
      else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(state.n);
      else return;
      e.preventDefault();
    });
  }

  init();
  window.BrambilaAnalysis = { open, close };
})();
