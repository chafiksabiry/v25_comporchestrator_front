/**
 * Génère un document HTML autonome (CSS + JS inline) type « artefact Claude » :
 * slides, points de progression, quiz avec validation, palette navy / teal.
 * Le contenu texte est échappé pour limiter les injections.
 */

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownishToPlain(md: string): string {
  return String(md || '')
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();
}

export type RepDeckSlide =
  | { kind: 'module_intro'; title: string; subtitle: string; moduleNum: number; totalModules: number }
  | { kind: 'section'; moduleTitle: string; sectionTitle: string; body: string }
  | {
      kind: 'quiz';
      quizTitle: string;
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };

export function buildRepDeckSlidesFromJourney(journey: any): RepDeckSlide[] {
  const modules = Array.isArray(journey?.modules) ? journey.modules : [];
  const totalModules = modules.length;
  const slides: RepDeckSlide[] = [];

  modules.forEach((mod: any, mi: number) => {
    const modTitle = String(mod?.title || `Module ${mi + 1}`).trim();
    const sectionCount = Array.isArray(mod?.sections) ? mod.sections.length : 0;
    const subtitle =
      sectionCount > 0
        ? 'Le détail suit dans les prochaines slides (sections puis quiz).'
        : markdownishToPlain(String(mod?.description || '')).slice(0, 280) +
          (String(mod?.description || '').length > 280 ? '…' : '');

    slides.push({
      kind: 'module_intro',
      title: modTitle,
      subtitle,
      moduleNum: mi + 1,
      totalModules,
    });

    const sections = Array.isArray(mod?.sections) ? mod.sections : [];
    sections.forEach((sec: any) => {
      const body = markdownishToPlain(String(sec?.content || ''));
      slides.push({
        kind: 'section',
        moduleTitle: modTitle,
        sectionTitle: String(sec?.title || 'Section').trim(),
        body: body || '(Contenu vide)',
      });
    });

    const quizzes = Array.isArray(mod?.quizzes) ? mod.quizzes : [];
    quizzes.forEach((qz: any) => {
      const quizTitle = String(qz?.title || 'Quiz').trim();
      const questions = Array.isArray(qz?.questions) ? qz.questions : [];
      questions.forEach((q: any) => {
        const opts = Array.isArray(q?.options) ? q.options.map((o: any) => String(o || '').trim()).filter(Boolean) : [];
        if (opts.length === 0) return;
        const correct = typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0;
        slides.push({
          kind: 'quiz',
          quizTitle,
          question: String(q?.question || '').trim(),
          options: opts,
          correctIndex: Math.min(Math.max(0, correct), opts.length - 1),
          explanation: String(q?.explanation || '').trim(),
        });
      });
    });
  });

  return slides;
}

export function buildRepInteractivePresentationHtml(journey: any): string {
  const title = String(journey?.title || journey?.name || 'Formation').trim() || 'Formation';
  const slides = buildRepDeckSlidesFromJourney(journey);
  const json = JSON.stringify({ title, slides }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --navy: #0f172a;
      --navy2: #1e293b;
      --teal: #14b8a6;
      --teal2: #0d9488;
      --paper: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: linear-gradient(165deg, var(--navy) 0%, #0c4a6e 45%, var(--navy2) 100%);
      color: #e2e8f0;
    }
    .shell {
      max-width: 960px;
      margin: 0 auto;
      padding: 16px 14px 100px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      text-align: center;
      margin-bottom: 12px;
    }
    header h1 {
      margin: 0 0 6px;
      font-size: clamp(1.15rem, 3.5vw, 1.65rem);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    header p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .progress-wrap {
      height: 4px;
      background: rgba(148,163,184,0.25);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--teal), #5eead4);
      border-radius: 999px;
      transition: width 0.35s ease;
    }
    .deck {
      flex: 1;
      position: relative;
    }
    .slide {
      display: none;
      animation: fadeIn 0.35s ease;
    }
    .slide.active { display: block; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .card {
      background: var(--paper);
      color: var(--navy);
      border-radius: 16px;
      padding: 20px 18px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.35);
      min-height: 220px;
    }
    .card h2 {
      margin: 0 0 10px;
      font-size: 1.2rem;
      color: var(--navy);
    }
    .badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--teal2);
      margin-bottom: 8px;
    }
    .module-num {
      font-size: clamp(2.5rem, 8vw, 3.5rem);
      font-weight: 800;
      color: var(--teal);
      line-height: 1;
      margin-bottom: 8px;
    }
    .body-text {
      font-size: 0.95rem;
      line-height: 1.55;
      white-space: pre-wrap;
      color: #334155;
    }
    .quiz-zone {
      margin-top: 12px;
    }
    .opt {
      display: block;
      width: 100%;
      text-align: left;
      margin: 8px 0;
      padding: 12px 14px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      background: #fff;
      cursor: pointer;
      font-size: 0.9rem;
      color: var(--navy);
      transition: border-color 0.2s, background 0.2s;
    }
    .opt:hover:not(:disabled) { border-color: var(--teal); background: #f0fdfa; }
    .opt:disabled { cursor: default; opacity: 0.95; }
    .opt.pick { border-color: var(--teal); background: #ecfdf5; }
    .opt.correct { border-color: #059669; background: #d1fae5; }
    .opt.wrong { border-color: #e11d48; background: #ffe4e6; }
    .btn-row { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    button.primary {
      background: linear-gradient(135deg, var(--teal), var(--teal2));
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }
    button.primary:disabled { opacity: 0.45; cursor: not-allowed; }
    .feedback {
      margin-top: 12px;
      padding: 12px;
      border-radius: 10px;
      font-size: 0.88rem;
      background: #f1f5f9;
      color: #334155;
    }
    nav.footer {
      position: fixed;
      left: 0; right: 0; bottom: 0;
      padding: 12px 14px 16px;
      background: rgba(15,23,42,0.92);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(148,163,184,0.2);
    }
    .footer-inner {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .dots {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
      flex: 1;
      min-width: 0;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: rgba(148,163,184,0.45);
      cursor: pointer;
      border: none;
      padding: 0;
    }
    .dot.on { background: var(--teal); transform: scale(1.15); }
    .nav-btn {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(148,163,184,0.35);
      color: #e2e8f0;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .counter { font-size: 0.8rem; color: var(--muted); min-width: 4.5rem; text-align: center; }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <h1 id="doc-title"></h1>
      <p id="doc-sub">Présentation interactive · navigation slide par slide</p>
    </header>
    <div class="progress-wrap"><div class="progress-bar" id="progress-bar"></div></div>
    <div class="deck" id="deck"></div>
  </div>
  <nav class="footer">
    <div class="footer-inner">
      <button type="button" class="nav-btn" id="prev" aria-label="Précédent">‹</button>
      <div class="dots" id="dots"></div>
      <span class="counter" id="counter"></span>
      <button type="button" class="nav-btn" id="next" aria-label="Suivant">›</button>
    </div>
  </nav>
  <script type="application/json" id="deck-data">${json}</script>
  <script>
(function () {
  var raw = document.getElementById('deck-data').textContent;
  var DATA = JSON.parse(raw);
  var slides = DATA.slides || [];
  var i = 0;
  var quizPick = null;
  var quizLocked = false;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function renderSlide() {
    quizPick = null;
    quizLocked = false;
    var s = slides[i];
    var deck = document.getElementById('deck');
    if (!s) {
      deck.innerHTML = '<div class="card"><p>Aucune slide.</p></div>';
      return;
    }
    var html = '';
    if (s.kind === 'module_intro') {
      html = '<div class="card">' +
        '<div class="badge">Module ' + s.moduleNum + ' / ' + s.totalModules + '</div>' +
        '<div class="module-num">' + String(s.moduleNum).padStart(2, '0') + '</div>' +
        '<h2>' + esc(s.title) + '</h2>' +
        '<p class="body-text">' + esc(s.subtitle) + '</p></div>';
    } else if (s.kind === 'section') {
      html = '<div class="card">' +
        '<div class="badge">' + esc(s.moduleTitle) + '</div>' +
        '<h2>' + esc(s.sectionTitle) + '</h2>' +
        '<div class="body-text">' + esc(s.body) + '</div></div>';
    } else if (s.kind === 'quiz') {
      html = '<div class="card">' +
        '<div class="badge">' + esc(s.quizTitle) + '</div>' +
        '<h2>' + esc(s.question) + '</h2>' +
        '<div class="quiz-zone" id="quiz-root"></div>' +
        '<div class="btn-row"><button type="button" class="primary" id="quiz-check" disabled>Valider ma réponse</button></div>' +
        '<div id="quiz-fb" style="display:none" class="feedback"></div></div>';
    }
    deck.innerHTML = html;
    if (s.kind === 'quiz') {
      var root = document.getElementById('quiz-root');
      var opts = s.options || [];
      opts.forEach(function (opt, idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt';
        b.textContent = String(idx + 1) + '. ' + opt;
        b.onclick = function () {
          if (quizLocked) return;
          quizPick = idx;
          Array.prototype.forEach.call(root.querySelectorAll('.opt'), function (el, j) {
            el.classList.toggle('pick', j === idx);
          });
          document.getElementById('quiz-check').disabled = false;
        };
        root.appendChild(b);
      });
      document.getElementById('quiz-check').onclick = function () {
        if (quizLocked || quizPick == null) return;
        quizLocked = true;
        var correct = s.correctIndex;
        Array.prototype.forEach.call(root.querySelectorAll('.opt'), function (el, j) {
          el.disabled = true;
          el.classList.remove('pick');
          if (j === correct) el.classList.add('correct');
          else if (j === quizPick) el.classList.add('wrong');
        });
        var fb = document.getElementById('quiz-fb');
        fb.style.display = 'block';
        var ok = quizPick === correct;
        fb.innerHTML = '<strong>' + (ok ? 'Bonne réponse !' : 'Réponse incorrecte.') + '</strong>' +
          (s.explanation ? '<div style="margin-top:8px">' + esc(s.explanation) + '</div>' : '');
        document.getElementById('quiz-check').disabled = true;
      };
    }
  }

  function renderDots() {
    var dots = document.getElementById('dots');
    dots.innerHTML = '';
    for (var d = 0; d < slides.length; d++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot' + (d === i ? ' on' : '');
      b.setAttribute('aria-label', 'Slide ' + (d + 1));
      (function (idx) {
        b.onclick = function () { i = idx; sync(); };
      })(d);
      dots.appendChild(b);
    }
  }

  function sync() {
    document.getElementById('doc-title').textContent = DATA.title || 'Formation';
    var pct = slides.length ? ((i + 1) / slides.length) * 100 : 0;
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('counter').textContent = (i + 1) + ' / ' + slides.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= slides.length - 1;
    renderSlide();
    renderDots();
  }

  document.getElementById('prev').onclick = function () {
    if (i > 0) { i--; sync(); }
  };
  document.getElementById('next').onclick = function () {
    if (i < slides.length - 1) { i++; sync(); }
  };

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') document.getElementById('prev').click();
    if (e.key === 'ArrowRight') document.getElementById('next').click();
  });

  sync();
})();
  </script>
</body>
</html>`;
}

/** Taille max du JSON envoyé au chat IA (caractères). */
const DIGEST_JSON_MAX = 26000;
const SECTION_BODY_MAX = 1800;
const MAX_MODULES_AI = 20;

export type FormationDigestForAi = {
  title: string;
  modules: Array<{
    title: string;
    sections: Array<{ title: string; contentPlain: string }>;
    quizzes: Array<{
      title: string;
      questions: Array<{
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
      }>;
    }>;
  }>;
};

/**
 * Digest compact et tronqué pour le prompt IA (Claude via /api/ai/chat).
 */
export function buildFormationDigestForRepPresentation(journey: any): FormationDigestForAi {
  const title = String(journey?.title || journey?.name || 'Formation').trim() || 'Formation';
  const rawMods = Array.isArray(journey?.modules) ? journey.modules : [];
  const modules = rawMods.slice(0, MAX_MODULES_AI).map((mod: any) => {
    const sections = Array.isArray(mod?.sections) ? mod.sections : [];
    const quizzes = Array.isArray(mod?.quizzes) ? mod.quizzes : [];
    return {
      title: String(mod?.title || 'Module').trim(),
      sections: sections.map((sec: any) => ({
        title: String(sec?.title || '').trim(),
        contentPlain: markdownishToPlain(String(sec?.content || '')).slice(0, SECTION_BODY_MAX),
      })),
      quizzes: quizzes.map((qz: any) => ({
        title: String(qz?.title || 'Quiz').trim(),
        questions: (Array.isArray(qz?.questions) ? qz.questions : []).map((q: any) => {
          const opts = Array.isArray(q?.options)
            ? q.options.map((o: any) => String(o || '').trim()).filter(Boolean).slice(0, 8)
            : [];
          const correct = typeof q?.correctAnswer === 'number' ? q.correctAnswer : 0;
          return {
            question: String(q?.question || '').trim().slice(0, 800),
            options: opts,
            correctIndex: opts.length ? Math.min(Math.max(0, correct), opts.length - 1) : 0,
            explanation: String(q?.explanation || '').trim().slice(0, 1200),
          };
        }),
      })),
    };
  });

  let digest: FormationDigestForAi = { title, modules };
  let json = JSON.stringify(digest);
  while (json.length > DIGEST_JSON_MAX && digest.modules.length > 1) {
    digest = {
      ...digest,
      modules: digest.modules.slice(0, -1),
    };
    json = JSON.stringify(digest);
  }
  if (json.length > DIGEST_JSON_MAX) {
    digest = {
      title: digest.title,
      modules: digest.modules.map((m) => ({
        ...m,
        sections: m.sections.slice(0, 10).map((s) => ({
          ...s,
          contentPlain: s.contentPlain.slice(0, Math.floor(SECTION_BODY_MAX / 2)),
        })),
        quizzes: m.quizzes.map((qz) => ({
          ...qz,
          questions: qz.questions.slice(0, 6).map((q) => ({
            ...q,
            question: q.question.slice(0, 400),
            explanation: q.explanation.slice(0, 500),
          })),
        })),
      })),
    };
    json = JSON.stringify(digest);
  }
  if (json.length > DIGEST_JSON_MAX) {
    digest = {
      title: digest.title,
      modules: digest.modules.map((m) => ({
        ...m,
        sections: m.sections.map((s) => ({ ...s, contentPlain: s.contentPlain.slice(0, 400) })),
        quizzes: m.quizzes.map((qz) => ({
          ...qz,
          questions: qz.questions.slice(0, 4),
        })),
      })),
    };
  }
  return digest;
}

/**
 * Extrait un document HTML depuis la réponse du modèle (fences markdown ou brut).
 */
export function extractHtmlDocumentFromAiResponse(raw: string): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;

  const fenceHtml = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenceHtml?.[1]) {
    const inner = fenceHtml[1].trim();
    if (/<!DOCTYPE/i.test(inner) || /<html[\s>]/i.test(inner)) return inner;
  }

  const doctypeIdx = s.search(/<!DOCTYPE\s+html/i);
  if (doctypeIdx >= 0) {
    const slice = s.slice(doctypeIdx);
    const end = slice.toLowerCase().lastIndexOf('</html>');
    if (end >= 0) return slice.slice(0, end + 7).trim();
  }

  const htmlIdx = s.search(/<html[\s>]/i);
  if (htmlIdx >= 0) {
    const slice = s.slice(htmlIdx);
    const end = slice.toLowerCase().lastIndexOf('</html>');
    if (end >= 0) return slice.slice(0, end + 7).trim();
  }

  return null;
}
