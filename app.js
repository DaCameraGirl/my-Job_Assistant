// ============================================================
// TAB NAVIGATION
// ============================================================
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ============================================================
// UTILITIES
// ============================================================
// FIX #5: Expanded emoji regex — added flags (U+1F1E6–U+1F1FF) and keycap sequences
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]{2}|[\d#]\u{FE0F}?\u{20E3}/u;
// FIX #4: Added ellipses scene-jump pattern (e.g. "See you there … Good morning")
const stageDirRegex = /(\[[^\]]*(hour later|at the|scene|later|enters|exit|stage)[^\]]*\])|(\.{3,}\s+[A-Z])/i;
const offensiveWords = ['fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'bastard'];

// FIX #2: Simple rhyme detection — checks last 2–3 characters of last words
function lastWord(s) {
  const words = s.trim().match(/[a-z']+/gi);
  return words ? words[words.length - 1] : '';
}
function rhymesWith(a, b) {
  if (!a || !b) return false;
  a = a.toLowerCase().replace(/[^a-z]/g, '');
  b = b.toLowerCase().replace(/[^a-z]/g, '');
  if (a.length < 3 || b.length < 3) return false;
  if (a === b) return false;
  // Check last 3 chars
  if (a.slice(-3) === b.slice(-3)) return true;
  // Check last 2 chars against common rhyme endings
  const commonEndings = new Set(['ay','ai','ea','ee','oo','ll','ff','ss','tt','ck','ng','ow','ie','oa','ui','ou','oy','oi','aw','ew','ey','ight','ite','ind','old','ell','ill','all','ain','eat','eep','uck','ock','ack','ike','ine','ame','ope','and','end','ent','ant']);
  const s2a = a.slice(-2);
  const s2b = b.slice(-2);
  if (s2a === s2b && commonEndings.has(s2a)) return true;
  return false;
}

// FIX #3: Expanded spelling detection — common misspellings and homophone misuse
function detectSpellingIssues(text) {
  const issues = [];
  if (/\b\w*([a-z])\1\1\w*\b/i.test(text)) issues.push('Spelling Mistake');

  const commonMisspellings = [
    /\bthier\b/i, /\brecieve\b/i, /\bseperate\b/i, /\bdefin(?:at|it)e(?:ly|)\b/i,
    /\baccidentaly\b/i, /\baccomodate\b/i, /\boccured\b/i, /\bcalender\b/i,
    /\bconcious\b/i, /\bembarass\b/i, /\bocurrence\b/i, /\bparalel\b/i,
    /\bpriviledge\b/i, /\bpublicaly\b/i, /\bwich\b/i, /\bwritting\b/i,
    /\balot\b/i, /\bbeatiful\b/i, /\bbegining\b/i, /\bcarreer\b/i,
    /\bcomming\b/i, /\bexellent\b/i, /\bforiegn\b/i, /\bgoverment\b/i,
    /\bneccessary\b/i, /\brecomend\b/i, /\bstright\b/i, /\btommorow\b/i,
    /\bunfortunatly\b/i, /\bwierd\b/i, /\bacheive\b/i, /\bapparant\b/i,
    /\bbattry\b/i, /\bbeleive\b/i, /\barguement\b/i, /\bchangable\b/i,
    /\bconsiderd\b/i, /\bdecaffinate\b/i, /\bdiferent\b/i, /\benviroment\b/i,
    /\bFebuary\b/i, /\bforcast\b/i, /\bforword\b/i, /\bfreind\b/i,
    /\blistenning\b/i, /\bmaintainance\b/i, /\bminiture\b/i, /\bmischevious\b/i,
    /\bnoticable\b/i, /\boppertunity\b/i, /\bperfer\b/i, /\bpersonel\b/i,
    /\bposession\b/i, /\bprefered\b/i, /\bpronounciation\b/i, /\bpublically\b/i,
    /\breleived\b/i, /\brember\b/i, /\broomate\b/i, /\bsargeant\b/i,
    /\bsence\b/i, /\bsupercede\b/i, /\btendancy\b/i, /\bunforseen\b/i,
    /\bunecessary\b/i, /\bvetaran\b/i, /\bwithold\b/i,
  ];

  for (const pat of commonMisspellings) {
    if (pat.test(text)) { issues.push('Spelling Mistake'); break; }
  }

  // Homophone misuse: "your" before a verb (your going, your coming)
  if (/\byour\s+(going|coming|leaving|saying|doing|making|taking|giving|telling|asking|running|walking|eating|drinking|buying|selling)\b/i.test(text)) {
    if (!issues.includes('Spelling Mistake')) issues.push('Spelling Mistake');
  }

  return issues;
}

function linesOf(text) { return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
function normalizeWords(s) { return (s.toLowerCase().match(/[a-z']+/g) || []); }
function parseSpeaker(line) {
  const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
  return m ? { speaker: m[1].trim(), msg: m[2].trim() } : { speaker: null, msg: line };
}
function badge(cls, label) {
  return `<div class="result-badge ${cls}">${label}</div>`;
}
function pre(text) {
  return `<pre class="result-body">${text}</pre>`;
}

function cleanClipboardText(event) {
  const data = event.clipboardData;
  if (!data) return null;

  const html = data.getData('text/html');
  let text = '';

  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, [hidden], [aria-hidden="true"]').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      const style = (el.getAttribute('style') || '').toLowerCase();
      const classes = (el.getAttribute('class') || '').toLowerCase();
      const hiddenStyle =
        /display\s*:\s*none/.test(style) ||
        /visibility\s*:\s*hidden/.test(style) ||
        /opacity\s*:\s*0(?:\.0+)?\b/.test(style) ||
        /color\s*:\s*transparent/.test(style) ||
        /font-size\s*:\s*0/.test(style) ||
        /height\s*:\s*0/.test(style) ||
        /width\s*:\s*0/.test(style) ||
        /position\s*:\s*absolute/.test(style) && /left\s*:\s*-\d/.test(style);
      if (hiddenStyle || classes.includes('hidden') || classes.includes('sr-only')) el.remove();
    });
    text = doc.body.innerText || doc.body.textContent || '';
  }

  if (!text) text = data.getData('text/plain') || '';
  return text
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================
// OUTPUT BOX COPY HELPER
// ============================================================
function copyOut(id, btn) {
  const el = document.getElementById(id);
  if (!el || !el.value.trim()) return;
  const text = el.value;
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
    .catch(() => { try { el.select(); document.execCommand('copy'); } catch(e){} return Promise.resolve(); })
    .then(() => {
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1600);
    });
}

function installPasteCleaner() {
  document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(el => {
    el.addEventListener('paste', event => {
      const cleaned = cleanClipboardText(event);
      if (!cleaned) return;
      event.preventDefault();
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, start) + cleaned + el.value.slice(end);
      const pos = start + cleaned.length;
      if (el.setSelectionRange) el.setSelectionRange(pos, pos);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// ============================================================
// TEXT EVALUATION
// ============================================================
function detectRejectReasons(text) {
  const reasons = new Set();
  const rawLines = linesOf(text);
  const parsed = rawLines.map(parseSpeaker);

  if (emojiRegex.test(text)) reasons.add('Contains Emojis');
  if (stageDirRegex.test(text)) reasons.add('Conversation Could Not Happen Over Text');

  const participants = [...new Set(parsed.map(p => p.speaker).filter(Boolean))];
  for (const p of parsed) {
    if (!p.speaker) continue;
    for (const other of participants) {
      const esc = other.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (other !== p.speaker && new RegExp(`\\b${esc}\\b`, 'i').test(p.msg))
        reasons.add('Includes Name of Participant');
    }
  }

  for (const line of rawLines) {
    const words = normalizeWords(line);
    for (let i = 1; i < words.length; i++)
      if (words[i] === words[i-1] && !['that','it'].includes(words[i]))
        reasons.add('Unnecessary Repetition');
  }

  if (offensiveWords.some(w => text.toLowerCase().includes(w))) reasons.add('Offensive Language');

  // FIX #3: Use expanded spelling detection
  const spellIssues = detectSpellingIssues(text);
  if (spellIssues.length) reasons.add('Spelling Mistake');

  // FIX #2: Rhyme detection — last word of one message rhymes with last word of next
  for (let i = 0; i < parsed.length - 1; i++) {
    const lastA = lastWord(parsed[i].msg);
    const lastB = lastWord(parsed[i + 1].msg);
    if (lastA && lastB && rhymesWith(lastA, lastB)) {
      reasons.add('Messages Rhyme');
      break;
    }
  }

  // FIX #6: Expanded incoherent detection
  const msgs = parsed.map(p => p.msg.toLowerCase());
  const freq = {};
  for (const m of msgs) freq[m] = (freq[m] || 0) + 1;
  if (Object.values(freq).some(v => v >= 3)) reasons.add('Incoherent / Not Human');

  // Address/URL dumps — lines with 3+ URLs
  const urlDumpLines = rawLines.filter(l => (l.match(/https?:\/\/\S+/g) || []).length >= 3);
  if (urlDumpLines.length >= 2) reasons.add('Incoherent / Not Human');

  // Abrupt topic pivots — consecutive messages with zero word overlap
  for (let i = 1; i < parsed.length; i++) {
    const prev = normalizeWords(parsed[i - 1].msg);
    const curr = normalizeWords(parsed[i].msg);
    if (prev.length >= 3 && curr.length >= 3) {
      const overlap = curr.filter(w => prev.includes(w)).length;
      if (overlap === 0) { reasons.add('Incoherent / Not Human'); break; }
    }
  }

  return [...reasons];
}

// Live feedback as user types
document.getElementById('transcript').addEventListener('input', function () {
  const t = this.value.trim();
  const el = document.getElementById('transcriptCheck');
  if (!t) { el.className = 'live-check'; el.textContent = ''; return; }
  const reasons = detectRejectReasons(t);
  if (reasons.length === 0) {
    el.className = 'live-check pass';
    el.textContent = '\u2713 No issues detected so far';
  } else {
    el.className = 'live-check fail';
    el.textContent = '\u26A0 Issues detected: ' + reasons.join(' \u00B7 ');
  }
});

function evaluateTranscript() {
  const t = document.getElementById('transcript').value.trim();
  const reasons = detectRejectReasons(t);
  const pass = reasons.length === 0;
  const box = document.getElementById('txtOut1');
  if (box) {
    box.value = pass
      ? 'PASS'
      : 'REJECT\n\u2022 ' + reasons.join('\n\u2022 ');
    box.classList.add('filled');
  }
  return { pass };
}

function scoreResponse(transcript, response) {
  if (!response.trim()) return { score: -999, why: ['Empty response'] };
  let score = 100;
  const why = [];
  if (emojiRegex.test(response))                                         { score -= 70; why.push('Contains emoji'); }
  if (offensiveWords.some(w => response.toLowerCase().includes(w)))      { score -= 50; why.push('Offensive language'); }
  const spellIssues = detectSpellingIssues(response);
  if (spellIssues.length || /\b\w*([a-z])\1\1\w*\b/i.test(response))    { score -= 25; why.push('Likely spelling error'); }
  if (rhymesWith(lastWord(transcript), lastWord(response)))              { score -= 10; why.push('Rhymes with transcript'); }
  const lastLine = linesOf(transcript).slice(-1)[0] || '';
  const overlap = normalizeWords(lastLine).filter(w => normalizeWords(response).includes(w)).length;
  if (overlap === 0)                                                       { score -= 25; why.push('Weak context match'); }
  return { score, why };
}

function pickResponse() {
  const res = evaluateTranscript();
  const box2 = document.getElementById('txtOut2');
  if (!res.pass) {
    if (box2) { box2.value = 'N/A — transcript rejected. Fix transcript first.'; box2.classList.add('filled'); }
    return;
  }
  const transcript = document.getElementById('transcript').value.trim();
  const candidates = [
    document.getElementById('resp1').value,
    document.getElementById('resp2').value,
    document.getElementById('resp3').value,
    document.getElementById('resp4').value,
  ];
  const scored = candidates
    .map((r, i) => ({ index: i + 1, response: r, ...scoreResponse(transcript, r) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (box2) {
    if (best.score <= -999) {
      box2.value = 'No valid responses entered.';
    } else {
      box2.value = `Response ${best.index}` +
        (best.why.length ? `\nScore: ${best.score} | Deductions: ${best.why.join(', ')}` : `\nScore: ${best.score} — clean`) +
        (best.response ? `\n\n"${best.response}"` : '');
    }
    box2.classList.add('filled');
  }
}

function suggestMcq() {
  const t = document.getElementById('transcript').value;
  const opts = ['A','B','C','D'].map(l =>
    ({ letter: l, text: document.getElementById('mcq' + l).value })
  );
  const tWords = normalizeWords(t);
  const ranked = opts
    .map(o => ({ ...o, overlap: normalizeWords(o.text).filter(w => tWords.includes(w)).length }))
    .sort((a, b) => b.overlap - a.overlap);
  const best = ranked[0];
  const box3 = document.getElementById('txtOut3');
  if (box3) {
    box3.value = best.text
      ? `Choice ${best.letter}\n"${best.text}"`
      : `Choice ${best.letter} (no text entered for this option)`;
    box3.classList.add('filled');
  }
}

document.getElementById('evalBtn').addEventListener('click', evaluateTranscript);
document.getElementById('pickBtn').addEventListener('click', pickResponse);
document.getElementById('mcqBtn').addEventListener('click', suggestMcq);

// ============================================================
// SEARCH SATISFACTION
// ============================================================
let srDegrees = 0;

document.querySelectorAll('.deg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.deg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    srDegrees = parseInt(btn.dataset.deg, 10);
    updateLiveGrade();
  });
});

// Live flag warning
function updateFlagWarning() {
  const platform = document.getElementById('srPlatform').value;
  const wl = document.getElementById('srWrongLang').checked;
  const cu = document.getElementById('srContentUnavailable').checked;
  const inap = document.getElementById('srInappropriate').checked;
  const el = document.getElementById('flagWarning');
  const flags = [];
  if (wl)   flags.push('Wrong Language');
  if (cu)   flags.push('Content Unavailable');
  if (inap) flags.push('Inappropriate');

  if (flags.length === 0) { el.className = 'flag-warning hidden'; return; }

  if (platform === 'tag') {
    el.className = 'flag-warning tag';
    el.textContent = `TAG: Flag as \u201c${flags.join(', ')}\u201d then submit. Do NOT assign a satisfaction rating.`;
  } else {
    el.className = 'flag-warning try';
    el.textContent = `TryRating: Flag as \u201c${flags.join(', ')}\u201d, then continue to rate as Not Satisfying.`;
  }
}

// Result-type-specific hints
function updateResultTypeHint() {
  const rt = document.getElementById('srResultType').value;
  const el = document.getElementById('resultTypeHint');
  const hints = {
    news:       'NEWS: Check the article date against the query date. If the news article is more than 3 months newer than the query date \u2192 flag as Content Unavailable.',
    maps:       'MAPS: Required info = address + distance from user. If distance is missing \u2192 flag as Content Unavailable. Grade only on the card info shown \u2014 do not click.',
    weather:    'WEATHER: Grade on the card only (temperature, conditions). Missing location info = Content Unavailable.',
    sports:     'SPORTS: Grade on the card only (scores, dates). Do not click.',
    stocks:     'STOCKS: Card must show ticker, company name, and stock price. Missing any = Content Unavailable.',
    knowledge:  'KNOWLEDGE / ANSWER CARD: Verify the answer is factually correct. A wrong answer = Not Satisfying even from a trusted source.',
    app:        'APPS: There may be many valid apps for a query \u2014 result doesn\'t need to be the #1 app, just a high-quality one that meets the need. Highly Satisfying requires an official or top-tier app.',
    images:     'WEB IMAGES: If at least one image in the group is not visible \u2192 flag as Content Unavailable. Grade on whether images match query subject.',
    movie:      'MOVIES / TV / MUSIC: Grade on the card shown. These cards are not clickable \u2014 evaluate what is visible on screen only.',
    dictionary: 'DICTIONARY: Verify the definition is correct and matches the query word. Wrong definition = Not Satisfying.',
  };
  const msg = hints[rt];
  if (msg) {
    el.className = 'flag-warning try';
    el.textContent = msg;
  } else {
    el.className = 'flag-warning hidden';
  }
}

function downgradeOne(grade) {
  const ladder = ['HS', 'S', 'SS', 'NS'];
  const idx = ladder.indexOf(grade);
  return idx < ladder.length - 1 ? ladder[idx + 1] : 'NS';
}

// Compute grade from current inputs (shared by live preview and final rate)
function computeGrade() {
  const wl   = document.getElementById('srWrongLang').checked;
  const cu   = document.getElementById('srContentUnavailable').checked;
  const inap = document.getElementById('srInappropriate').checked;
  const platform = document.getElementById('srPlatform').value;
  const direct   = document.getElementById('srDirectAnswer').checked;
  const advice   = document.getElementById('srAdviceQuery').checked;
  const meaningMismatch   = document.getElementById('srMeaningMismatch').checked;
  const ambiguousWeak     = document.getElementById('srAmbiguousWeak').checked;
  const noDominantInterp  = document.getElementById('srNoDominantInterp').checked;
  const localeSensitivity = document.getElementById('srLocaleSensitivity').value;
  const src    = document.getElementById('srSourceQuality').value;
  const effort = document.getElementById('srUserEffort').value;
  const deg    = srDegrees;

  const flags = [];
  if (wl)   flags.push('Wrong Language');
  if (cu)   flags.push('Content Unavailable');
  if (inap) flags.push('Inappropriate');

  // TryRating with flags => NS
  if (platform === 'tryrating' && flags.length > 0) return { grade: 'NS', flags, reasons: ['TryRating: flagged result must be rated Not Satisfying'] };
  // TAG with flags => stop (no grade)
  if (platform === 'tag' && flags.length > 0) return { grade: 'FLAG', flags, reasons: [] };

  // Explicit or implicit locale mismatch => NS immediately
  if (localeSensitivity === 'explicit' || localeSensitivity === 'implicit') {
    return { grade: 'NS', flags, reasons: [`${localeSensitivity === 'explicit' ? 'Explicit' : 'Implicit'} locale mismatch \u2192 Not Satisfying`] };
  }

  let grade = 'HS';
  const reasons = [];

  if (meaningMismatch) {
    return { grade: 'NS', flags, reasons: ['Result matches query words but does not satisfy the actual user intent'] };
  }

  if (advice) {
    if (grade === 'HS') { grade = 'S'; reasons.push('Advice/recommendation query \u2192 cannot be Highly Satisfying'); }
  }
  // No dominant interpretation: HS → S cap
  if (noDominantInterp && grade === 'HS') {
    grade = 'S';
    reasons.push('No dominant interpretation among multiple equally popular ones \u2192 HS capped at Satisfying');
  }
  if (ambiguousWeak && (grade === 'HS' || grade === 'S')) {
    grade = 'SS';
    reasons.push('Result serves only a weaker secondary interpretation \u2192 Somewhat Satisfying');
  }
  if (!direct && grade === 'HS') {
    grade = 'S';
    reasons.push('No direct on-screen answer \u2192 user must click or scroll');
  }
  if (effort === 'medium' && (grade === 'HS' || grade === 'S')) {
    grade = 'SS';
    reasons.push('Medium user effort required to find or use the answer');
  }
  if (effort === 'high') {
    grade = 'NS';
    reasons.push('High user effort required; result does not clearly satisfy the need');
  }
  if (src === 'medium' && grade === 'HS') {
    grade = 'S';
    reasons.push('Medium source quality \u2192 capped at Satisfying');
  }
  if (src === 'low') {
    if (grade === 'HS' || grade === 'S') { grade = 'SS'; reasons.push('Low source quality \u2192 downgraded to Somewhat Satisfying'); }
    else if (grade === 'SS')             { grade = 'NS'; reasons.push('Low source quality on already-low result \u2192 Not Satisfying'); }
  }
  if (deg === 1 && grade === 'HS') { grade = 'S';  reasons.push('1 degree of separation \u2192 Satisfying'); }
  if (deg === 2) {
    if (grade === 'HS' || grade === 'S') { grade = 'SS'; reasons.push('2 degrees of separation \u2192 Somewhat Satisfying'); }
  }
  if (deg >= 3) { grade = 'NS'; reasons.push('3+ degrees of separation \u2192 Not Satisfying'); }

  // Mild locale sensitivity: downgrade one level after all other factors
  if (localeSensitivity === 'mild' && grade !== 'NS') {
    grade = downgradeOne(grade);
    reasons.push('Mildly locale-sensitive result \u2192 downgraded one level');
  }

  return { grade, flags, reasons };
}

// Live grade preview
function updateLiveGrade() {
  const { grade } = computeGrade();
  const el = document.getElementById('liveGradePreview');
  const labels = { HS: 'Highly Satisfying', S: 'Satisfying', SS: 'Somewhat Satisfying', NS: 'Not Satisfying', FLAG: 'Flag & Submit (TAG)' };
  const cls    = { HS: 'hs', S: 's', SS: 'ss', NS: 'ns', FLAG: '' };
  el.textContent = labels[grade] || '';
  el.className = 'grade-preview-badge ' + (cls[grade] || '');
}

// OPR live preview
function computeOPR(left, right) {
  const rank = { empty: 0, ns: 1, ss: 2, s: 3, hs: 4 };
  const l = rank[left], r = rank[right];

  if (left === 'empty' && right === 'empty')
    return 'About the Same \u2014 both sides returned no results.';

  if (left === 'empty') {
    if (r >= 3) return 'Right is Better \u2014 left is empty; right has at least one S or HS result. Per guidelines: prefer the side with S/HS when the other is empty. Never choose About the Same in this case.';
    return 'About the Same \u2014 left is empty but right has no S or HS results, so right is not meaningfully better.';
  }
  if (right === 'empty') {
    if (l >= 3) return 'Left is Better \u2014 right is empty; left has at least one S or HS result.';
    return 'About the Same \u2014 right is empty but left has no S or HS results.';
  }

  const diff = r - l;
  if (diff === 0)  return 'About the Same \u2014 both sides have results of similar quality.';
  if (diff === 1)  return 'Right is Slightly Better \u2014 right has marginally better results.';
  if (diff >= 2)   return 'Right is Better (or Much Better) \u2014 right has notably better results.';
  if (diff === -1) return 'Left is Slightly Better \u2014 left has marginally better results.';
  return 'Left is Better (or Much Better) \u2014 left has notably better results.';
}

function updateOprPreview() {
  const left  = document.getElementById('oprLeft').value;
  const right = document.getElementById('oprRight').value;
  document.getElementById('oprPreview').textContent = computeOPR(left, right);
}

// Wire up live updates
['srDirectAnswer','srAdviceQuery','srMeaningMismatch','srAmbiguousWeak','srUserEffort','srSourceQuality','srWrongLang','srContentUnavailable','srInappropriate'].forEach(id => {
  document.getElementById(id).addEventListener('change', updateLiveGrade);
});

// Final rate button
document.getElementById('satisfactionBtn').addEventListener('click', () => {
  const query    = document.getElementById('srQuery').value.trim();
  const intent   = document.getElementById('srIntent').value.trim();
  const platform = document.getElementById('srPlatform').value;
  const rType    = document.getElementById('srResultType').options[document.getElementById('srResultType').selectedIndex].text;
  const { grade, flags, reasons } = computeGrade();
  const oprText  = computeOPR(document.getElementById('oprLeft').value, document.getElementById('oprRight').value);
  const guardCount = [...document.querySelectorAll('.srGuard')].filter(cb => cb.checked).length;

  const gradeLabels      = { HS: 'Highly Satisfying', S: 'Satisfying', SS: 'Somewhat Satisfying', NS: 'Not Satisfying' };
  const gradeLabelsUpper = { HS: 'HIGHLY SATISFYING', S: 'SATISFYING', SS: 'SOMEWHAT SATISFYING', NS: 'NOT SATISFYING' };
  const out1 = document.getElementById('srOut1');
  const out2 = document.getElementById('srOut2');
  const out3 = document.getElementById('srOut3');
  const out4 = document.getElementById('srOut4');

  if (grade === 'FLAG') {
    out.innerHTML = badge('flag', 'FLAG & SUBMIT (TAG)')
      + pre(`Platform: TAG\nFlags: ${flags.join(', ')}\n\nAction: Flag the result as indicated above, then submit.\nDo NOT assign a satisfaction rating \u2014 TAG stops at the flag step.`);
    return;
  }

  // Box 1 — grade
  let gradeOut = gradeLabelsUpper[grade];
  if (flags.length) gradeOut += '\n\nFlags: ' + flags.join(', ');
  if (guardCount < 4) gradeOut += '\n\n⚠ Only ' + guardCount + '/4 guardrails checked — finish those before submitting.';
  if (out1) { out1.value = gradeOut; out1.classList.add('filled'); }

  // Box 2 — OPR decision
  const oprDecision = oprText.split('—')[0].trim();
  if (out2) { out2.value = oprDecision; out2.classList.add('filled'); }

  // Box 3 — OPR comment (ready to paste)
  const commentParts = [];
  if (!query) {
    commentParts.push('The query intent should be considered when evaluating whether the result satisfies the user’s need.');
  } else {
    commentParts.push('The user query “' + query + '” ' + (reasons.length ? 'was evaluated with the following factors applied: ' + reasons[0] + '.' : 'was evaluated against the result.'));
  }
  const comment = commentParts.join(' ') + ' The suggested grade is ' + gradeLabels[grade] + '. ' + oprText;
  if (out3) { out3.value = comment; out3.classList.add('filled'); }

  // Box 4 — factors + task context (reference)
  const factorsText = reasons.length
    ? 'Factors applied:\n• ' + reasons.join('\n• ')
    : 'No downgrade factors — base grade is Highly Satisfying.';
  const context = '\n\nPlatform: ' + platform.toUpperCase() + ' | Result Type: ' + rType +
    '\nQuery: ' + (query || '(not entered)') +
    '\nUser Need: ' + (intent || '(not entered)') +
    '\nGuardrails: ' + guardCount + '/4';
  if (out4) { out4.value = factorsText + context; out4.classList.add('filled'); }
});

// Initialize live previews
installPasteCleaner();
updateLiveGrade();
updateOprPreview();

// ============================================================
// BROAD MATCH
// ============================================================
// FIX #7: Expanded auto-detect with abbreviations, translations, former names, competitors
const knownAbbrevs = {
  'fb': 'facebook', 'ig': 'instagram', 'yt': 'youtube', 'tw': 'twitter',
  'li': 'linkedin', 'wa': 'whatsapp', 'wp': 'wordpress', 'tk': 'tiktok',
  'pin': 'pinterest', 'sc': 'snapchat', 'gm': 'gmail', 'gg': 'google',
  'amz': 'amazon', 'eb': 'ebay', 'ps': 'playstation', 'xb': 'xbox',
  'github': 'gh', 'gh': 'github',
};
const knownFormerNames = [
  ['twitter', 'x'], ['google plus', 'gplus'], ['gplus', 'google plus'],
  ['facebook', 'meta'], ['meta', 'facebook'], ['skype', 'microsoft teams'],
];
const knownCompetitorPairs = [
  ['linkedin', 'indeed'], ['disney', 'hulu'], ['hulu', 'netflix'],
  ['netflix', 'disney'], ['disney', 'netflix'], ['amazon', 'walmart'],
  ['walmart', 'amazon'], ['doordash', 'uber eats'], ['uber eats', 'doordash'],
  ['doordash', 'grubhub'], ['notion', 'microsoft word'], ['notion', 'google docs'],
  ['microsoft word', 'google docs'], ['google docs', 'microsoft word'],
  ['instagram', 'photo edit'], ['amazon', 'shein'], ['shein', 'amazon'],
];

function bmAutoDetect() {
  const kw  = document.getElementById('bmKeyword').value.trim().toLowerCase();
  const exp = document.getElementById('bmExpansion').value.trim().toLowerCase();
  const el  = document.getElementById('bmAutoCheck');

  if (!kw || !exp) { el.className = 'live-check'; el.textContent = ''; return; }

  const hints = [];

  if (kw === exp) {
    hints.push('Identical pair \u2014 double check this is correct');
  }
  // Space difference
  if (kw.replace(/\s/g,'') === exp.replace(/\s/g,'') && kw !== exp) {
    hints.push('\u2713 Spacing difference only \u2192 likely GOOD');
  }
  // Reorder
  const kwSorted  = kw.split(/\s+/).sort().join(' ');
  const expSorted = exp.split(/\s+/).sort().join(' ');
  if (kwSorted === expSorted && kw !== exp) {
    hints.push('\u2713 Same words, different order \u2192 likely GOOD (Reordering)');
  }
  // Plural/singular
  if ((kw + 's') === exp || (exp + 's') === kw) {
    hints.push('\u2713 Singular/Plural variant \u2192 likely GOOD');
  }
  // Short edit distance
  if (levenshtein(kw, exp) <= 2 && kw !== exp && kw.replace(/\s/g,'') !== exp.replace(/\s/g,'')) {
    hints.push('\u2713 Very close spelling \u2192 possible spell correction \u2192 likely GOOD');
  }
  // One is prefix of other (word addition)
  const kwWords  = kw.split(/\s+/);
  const expWords = exp.split(/\s+/);
  if (kwWords.every(w => expWords.includes(w)) || expWords.every(w => kwWords.includes(w))) {
    if (kw !== exp && kwSorted !== expSorted) hints.push('\u2713 One includes all words of the other \u2192 possible word addition \u2192 check intent');
  }

  // FIX #7: Abbreviation detection
  if (knownAbbrevs[kw] === exp || knownAbbrevs[exp] === kw) {
    hints.push('\u2713 Known abbreviation pair \u2192 likely GOOD');
  }
  // FIX #7: Former name detection
  for (const [a, b] of knownFormerNames) {
    if ((kw === a && exp === b) || (kw === b && exp === a)) {
      hints.push('\u2713 Former/current name pair \u2192 check intent');
      break;
    }
  }
  // FIX #7: Competitor detection
  for (const [a, b] of knownCompetitorPairs) {
    if ((kw === a && exp === b) || (kw === b && exp === a)) {
      hints.push('\u25CB Known competitor pair \u2192 likely ACCEPTABLE');
      break;
    }
  }
  // FIX #7: Translation hint (language boundary detection using common non-English words)
  // Check if one contains common English words and the other doesn't
  const engPattern = /\b(the|a|an|is|are|was|were|have|has|had|do|does|did|will|would|can|could|may|might|shall|should|of|in|on|at|to|for|with|by|from|this|that|these|those)\b/i;
  const kwHasEng = engPattern.test(kw);
  const expHasEng = engPattern.test(exp);
  if (kwHasEng !== expHasEng && kw.length > 3 && exp.length > 3) {
    hints.push('\u25CB One side appears in English, the other may not be \u2192 possible translation \u2192 check intent');
  }

  if (hints.length) {
    el.className = 'live-check pass';
    el.textContent = hints.join(' \u00B7 ');
  } else {
    el.className = 'live-check neutral';
    el.textContent = 'Pair entered \u2014 use checklist below to rate.';
  }
}

// ---- EXPANSION PICKER ----
// FIX #8: More conservative overlap threshold — require 80%+ and meaningful shared words (not just short/stop words)
const bmStopWords = new Set(['a','an','the','in','on','at','to','for','of','with','by','from','and','or','is','are','was','were','it','its','this','that','these','those','my','your','his','her','our','their','be','been','being','have','has','had','do','does','did','will','would','can','could','may','might','shall','should','about','into','through','during','before','after','above','below','between','out','off','over','under','again','then','once','here','there','when','where','why','how','all','each','every','both','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','just','also','if','then','else','what','which','who','whom']);

function scoreExpansion(kw, exp) {
  if (!exp.trim()) return null;
  const k = kw.toLowerCase().trim();
  const e = exp.toLowerCase().trim();

  // Highly — essentially the same query
  if (k === e) return { level: 'hi', label: 'Highly \u2014 identical' };
  if (k.replace(/\s/g,'') === e.replace(/\s/g,'')) return { level: 'hi', label: 'Highly \u2014 spacing only' };
  if (levenshtein(k, e) <= 2) return { level: 'hi', label: 'Highly \u2014 spell correction' };
  const kSort = k.split(/\s+/).sort().join(' ');
  const eSort = e.split(/\s+/).sort().join(' ');
  if (kSort === eSort) return { level: 'hi', label: 'Highly \u2014 reordering' };
  if ((k + 's') === e || (e + 's') === k) return { level: 'hi', label: 'Highly \u2014 singular/plural' };
  const kWords = k.split(/\s+/);
  const eWords = e.split(/\s+/);
  if (kWords.every(w => eWords.includes(w)) || eWords.every(w => kWords.includes(w))) {
    return { level: 'hi', label: 'Highly \u2014 word addition/removal' };
  }
  // Known abbreviation or former name
  if (knownAbbrevs[k] === e || knownAbbrevs[e] === k) return { level: 'hi', label: 'Highly \u2014 known abbreviation' };

  // FIX #8: More conservative overlap — exclude stop words, require 80%+
  const meaningfulK = kWords.filter(w => !bmStopWords.has(w) && w.length > 2);
  const meaningfulE = eWords.filter(w => !bmStopWords.has(w) && w.length > 2);
  const overlap = meaningfulK.filter(w => meaningfulE.includes(w)).length;
  const maxLen = Math.max(meaningfulK.length, meaningfulE.length);
  const overlapRatio = maxLen > 0 ? overlap / maxLen : 0;

  if (overlapRatio >= 0.8) return { level: 'good', label: 'Good \u2014 strong term overlap' };
  if (overlapRatio >= 0.4) return { level: 'some', label: 'Somewhat \u2014 partial term overlap' };
  if (overlap > 0) return { level: 'some', label: 'Somewhat \u2014 weak overlap' };

  // Competitor check
  const kwStr = k;
  const expStr = e;
  for (const [a, b] of knownCompetitorPairs) {
    if ((kwStr === a && expStr === b) || (kwStr === b && expStr === a)) {
      return { level: 'some', label: 'Somewhat \u2014 known competitor pair' };
    }
  }

  // Not Interesting — no connection detected
  return { level: 'none', label: 'Not Interesting \u2014 no clear connection' };
}

const rankOrder = { hi: 4, good: 3, some: 2, none: 1 };

function rateExpansions() {
  const kw = document.getElementById('bmKeyword').value.trim();
  const slots = [
    { id: 'expA', ratingId: 'expRatingA', letter: 'A' },
    { id: 'expB', ratingId: 'expRatingB', letter: 'B' },
    { id: 'expC', ratingId: 'expRatingC', letter: 'C' },
    { id: 'expD', ratingId: 'expRatingD', letter: 'D' },
  ];

  if (!kw) {
    slots.forEach(s => {
      const el = document.getElementById(s.ratingId);
      el.className = 'exp-rating';
      el.textContent = '';
    });
    document.getElementById('bestExpansionBox').classList.add('hidden');
    return;
  }

  let best = null;
  const scored = [];

  slots.forEach(s => {
    const val = document.getElementById(s.id).value.trim();
    const ratingEl = document.getElementById(s.ratingId);
    if (!val) {
      ratingEl.className = 'exp-rating';
      ratingEl.textContent = '';
      return;
    }
    const result = scoreExpansion(kw, val);
    ratingEl.className = 'exp-rating ' + result.level;
    ratingEl.textContent = result.label;
    scored.push({ letter: s.letter, val, result });
    if (!best || rankOrder[result.level] > rankOrder[best.result.level]) best = { letter: s.letter, val, result };
  });

  const box = document.getElementById('bestExpansionBox');
  const res = document.getElementById('bestExpansionResult');

  if (!best || scored.length === 0) {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');
  const cls = best.result.level;
  res.innerHTML = `<div class="result-badge ${cls === 'hi' ? 'good' : cls === 'good' ? 's' : cls === 'some' ? 'acceptable' : 'ns'}">${best.result.label}</div>`
    + `<pre class="result-body" style="margin-top:6px">Option ${best.letter}: "${best.val}"\n\nThis is the strongest match for keyword: "${kw}"\nUse this as your expansion in the checklist below.</pre>`;

  // Auto-fill the main expansion field with the winner
  document.getElementById('bmExpansion').value = best.val;
  bmAutoDetect();
}

// Live checklist feedback
document.querySelectorAll('.bm-check').forEach(cb => {
  cb.addEventListener('change', () => {
    const badAny    = [...document.querySelectorAll('.bm-row[data-rating="bad"] .bm-check:checked')].length > 0;
    const goodAny   = [...document.querySelectorAll('.bm-row[data-rating="good"] .bm-check:checked')].length > 0;
    const acceptAny = [...document.querySelectorAll('.bm-row[data-rating="acceptable"] .bm-check:checked')].length > 0;
    const el = document.getElementById('bmCheckFeedback');

    if (badAny) {
      el.className = 'live-check fail';
      el.textContent = '\u26A0 BAD indicator checked \u2014 confirm with research before deciding. Bad overrides everything only when truly confirmed \u2014 do not mark Bad just because the pair looks different at first glance.';
    } else if (goodAny) {
      el.className = 'live-check pass';
      el.textContent = '\u2713 GOOD indicator(s) checked';
    } else if (acceptAny) {
      el.className = 'live-check warn';
      el.textContent = '\u25CB ACCEPTABLE indicator(s) checked';
    } else {
      el.className = 'live-check';
      el.textContent = '';
    }
  });
});

document.getElementById('bmRateBtn').addEventListener('click', () => {
  const kw  = document.getElementById('bmKeyword').value.trim();
  const exp = document.getElementById('bmExpansion').value.trim();
  const out1 = document.getElementById('bmOut1');
  const out2 = document.getElementById('bmOut2');

  if (!kw || !exp) {
    if (out1) { out1.value = '⚠ Please enter both a Keyword and an Expansion before rating.'; out1.classList.add('filled'); }
    return;
  }

  const badChecks    = [...document.querySelectorAll('.bm-row[data-rating="bad"] .bm-check:checked')];
  const goodChecks   = [...document.querySelectorAll('.bm-row[data-rating="good"] .bm-check:checked')];
  const acceptChecks = [...document.querySelectorAll('.bm-row[data-rating="acceptable"] .bm-check:checked')];

  const getLabel = cb => cb.closest('label').querySelector('span').textContent.trim();

  let rating, explanation;

  if (badChecks.length > 0) {
    rating = 'BAD';
    explanation = 'BAD match.\n\nKeyword:   ' + kw + '\nExpansion: ' + exp + '\n\nBAD indicators checked:\n  • ' + badChecks.map(getLabel).join('\n  • ') + '\n\nA BAD pair means the keyword and expansion do not share the same user intent or meaning. The ad expansion would not serve the same need as the original keyword.';
  } else if (goodChecks.length > 0) {
    rating = 'GOOD';
    explanation = 'GOOD match.\n\nKeyword:   ' + kw + '\nExpansion: ' + exp + '\n\nGOOD indicators:\n  • ' + goodChecks.map(getLabel).join('\n  • ') + '\n\nA GOOD pair means the keyword and expansion are essentially the same query — a spelling variant, spacing fix, reordering, abbreviation, singular/plural, app name variant, or translation.';
  } else if (acceptChecks.length > 0) {
    rating = 'ACCEPTABLE';
    explanation = 'ACCEPTABLE match.\n\nKeyword:   ' + kw + '\nExpansion: ' + exp + '\n\nACCEPTABLE indicators:\n  • ' + acceptChecks.map(getLabel).join('\n  • ') + '\n\nACCEPTABLE means the pair are related — direct competitors, a brand and non-brand with the same functionality, or non-brand terms in the same category — but they are not the same query.';
  } else {
    if (out1) { out1.value = '⚠ No checklist items selected. Use the checklist to indicate which criteria apply, then click Rate again.'; out1.classList.add('filled'); }
    if (out2) { out2.value = ''; out2.classList.remove('filled'); }
    return;
  }

  if (out1) { out1.value = rating; out1.classList.add('filled'); }
  if (out2) { out2.value = explanation; out2.classList.add('filled'); }
});

// ============================================================
// TASK TRIAGE
// ============================================================
document.getElementById('triageBtn').addEventListener('click', () => {
  const title    = document.getElementById('taskTitle').value.trim() || 'Untitled Task';
  const urgency  = Math.min(5, Math.max(1, Number(document.getElementById('urgency').value) || 3));
  const impact   = Math.min(5, Math.max(1, Number(document.getElementById('impact').value) || 3));
  const effort   = Math.min(5, Math.max(1, Number(document.getElementById('effort').value) || 3));
  const score    = urgency * 2 + impact * 2 - effort;

  let bucket = 'Backlog';
  if (score >= 14)     bucket = 'Do Now';
  else if (score >= 10) bucket = 'Schedule This Week';
  else if (score >= 7)  bucket = 'Schedule Later';

  const cls = score >= 10 ? 'good' : score >= 7 ? 'acceptable' : 'ns';
  document.getElementById('triageOutput').innerHTML =
    badge(cls, bucket) +
    pre(`Task: ${title}\nPriority Score: ${score}\nUrgency: ${urgency} \u00B7 Impact: ${impact} \u00B7 Effort: ${effort}`);
});

// ============================================================
// RELEASE GATE — TryRating task release rules
// ============================================================
document.getElementById('releaseBtn').addEventListener('click', () => {
  const name = document.getElementById('releaseName').value.trim() || 'Unnamed Task';
  const comment = document.getElementById('releaseComment').value.trim();

  const doNotRelease = [
    { label: 'Taking a break', id: 'releaseBreak' },
    { label: 'Need time to review guidelines', id: 'releaseReviewGuidelines' },
    { label: 'Task feels difficult / do not feel like rating', id: 'releaseTooHard' },
    { label: 'OPR wrong-side error; re-check missing-side rules', id: 'releaseOprError' },
    { label: 'Map zoom works, but not as much as preferred', id: 'releaseMapZoom' },
  ];

  const validRelease = [
    { label: 'Technical issue with the task', id: 'releaseTechnical' },
    { label: 'No visible query to rate', id: 'releaseNoQuery' },
    { label: 'No inline or attached guidelines available', id: 'releaseNoGuidelines' },
    { label: 'Map is not loading', id: 'releaseMapNotLoading' },
    { label: 'Interface issue prevents rating', id: 'releaseInterface' },
    { label: 'ERT is too short to rate the task', id: 'releaseErtShort' },
    { label: 'Adult content discomfort', id: 'releaseAdult' },
    { label: 'POI international access restriction', id: 'releasePoiAccess' },
  ];

  const blocked = doNotRelease.filter(g => document.getElementById(g.id).checked).map(g => g.label);
  const valid = validRelease.filter(g => document.getElementById(g.id).checked).map(g => g.label);

  let decision, cls, action;
  if (blocked.length > 0) {
    decision = 'DO NOT RELEASE';
    cls = 'bad';
    action = 'Continue rating if possible, or close/log out/navigate away if you are taking a break.';
  } else if (valid.length > 0) {
    decision = comment ? 'RELEASE ALLOWED' : 'COMMENT REQUIRED';
    cls = comment ? 'good' : 'acceptable';
    action = comment
      ? 'Release the task with the comment shown below. Contact the team if the guideline says to report the issue.'
      : 'Add a clear release comment before releasing.';
  } else {
    decision = 'DO NOT RELEASE YET';
    cls = 'acceptable';
    action = 'Select a valid release reason only if one truly applies.';
  }

  document.getElementById('releaseOutput').innerHTML =
    badge(cls, decision) +
    pre(`Task: ${name}\n\nDo-not-release reasons checked:\n  ${blocked.length ? '\u2022 ' + blocked.join('\n  \u2022 ') : '(none)'}\n\nValid release reasons checked:\n  ${valid.length ? '\u2022 ' + valid.join('\n  \u2022 ') : '(none)'}\n\nComment:\n  ${comment || '(missing)'}\n\nAction:\n  ${action}`);
});
