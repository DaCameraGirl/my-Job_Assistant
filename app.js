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
const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const stageDirRegex = /(\[[^\]]*(hour later|at the|scene|later|enters|exit|stage)[^\]]*\])/i;
const offensiveWords = ['fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'bastard'];

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
  if (/\b\w*([a-z])\1\1\w*\b/i.test(text)) reasons.add('Spelling Mistake');

  const msgs = parsed.map(p => p.msg.toLowerCase());
  const freq = {};
  for (const m of msgs) freq[m] = (freq[m] || 0) + 1;
  if (Object.values(freq).some(v => v >= 3)) reasons.add('Incoherent / Not Human');

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
    el.textContent = '✓ No issues detected so far';
  } else {
    el.className = 'live-check fail';
    el.textContent = '⚠ Issues detected: ' + reasons.join(' · ');
  }
});

function evaluateTranscript() {
  const t = document.getElementById('transcript').value.trim();
  const reasons = detectRejectReasons(t);
  const pass = reasons.length === 0;
  const out = document.getElementById('textResultOutput');
  let html = badge(pass ? 'good' : 'bad', pass ? 'PASS' : 'REJECT');
  html += pre(pass
    ? 'No reject reasons found. Transcript is clean.'
    : 'Reject Reasons:\n  • ' + reasons.join('\n  • ')
  );
  out.innerHTML = html;
  return { pass };
}

function scoreResponse(transcript, response) {
  if (!response.trim()) return { score: -999, why: ['Empty response'] };
  let score = 100;
  const why = [];
  if (emojiRegex.test(response))                                         { score -= 70; why.push('Contains emoji'); }
  if (offensiveWords.some(w => response.toLowerCase().includes(w)))      { score -= 50; why.push('Offensive language'); }
  if (/\b\w*([a-z])\1\1\w*\b/i.test(response))                          { score -= 25; why.push('Likely spelling error'); }
  const lastLine = linesOf(transcript).slice(-1)[0] || '';
  const overlap = normalizeWords(lastLine).filter(w => normalizeWords(response).includes(w)).length;
  if (overlap === 0)                                                       { score -= 25; why.push('Weak context match'); }
  return { score, why };
}

function pickResponse() {
  const res = evaluateTranscript();
  const out = document.getElementById('textResultOutput');
  if (!res.pass) {
    out.innerHTML += pre('\nResponse Selection Skipped: transcript was rejected.');
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
  out.innerHTML += pre(`\nBest Response: #${best.index}\n"${best.response || '(empty)'}"\nScore: ${best.score}${best.why.length ? '\nDeductions: ' + best.why.join(', ') : ''}`);
}

function suggestMcq() {
  const t = document.getElementById('transcript').value;
  const opts = ['A','B','C','D'].map((l, i) =>
    ({ letter: l, text: document.getElementById('mcq' + l).value })
  );
  const tWords = normalizeWords(t);
  const ranked = opts
    .map(o => ({ ...o, overlap: normalizeWords(o.text).filter(w => tWords.includes(w)).length }))
    .sort((a, b) => b.overlap - a.overlap);
  const best = ranked[0];
  const out = document.getElementById('textResultOutput');
  out.innerHTML += pre(`\nMCQ Suggestion: Choice ${best.letter} — "${best.text}"`);
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
    el.textContent = `TAG: Flag as “${flags.join(', ')}” then submit. Do NOT assign a satisfaction rating.`;
  } else {
    el.className = 'flag-warning try';
    el.textContent = `TryRating: Flag as “${flags.join(', ')}”, then continue to rate as Not Satisfying.`;
  }
}

// Compute grade from current inputs (shared by live preview and final rate)
function computeGrade() {
  const wl   = document.getElementById('srWrongLang').checked;
  const cu   = document.getElementById('srContentUnavailable').checked;
  const inap = document.getElementById('srInappropriate').checked;
  const platform = document.getElementById('srPlatform').value;
  const direct   = document.getElementById('srDirectAnswer').checked;
  const advice   = document.getElementById('srAdviceQuery').checked;
  const src      = document.getElementById('srSourceQuality').value;
  const deg      = srDegrees;

  const flags = [];
  if (wl)   flags.push('Wrong Language');
  if (cu)   flags.push('Content Unavailable');
  if (inap) flags.push('Inappropriate');

  // TryRating with flags => NS
  if (platform === 'tryrating' && flags.length > 0) return { grade: 'NS', flags, reasons: ['TryRating: flagged result must be rated Not Satisfying'] };
  // TAG with flags => stop (no grade)
  if (platform === 'tag' && flags.length > 0) return { grade: 'FLAG', flags, reasons: [] };

  let grade = 'HS';
  const reasons = [];

  if (advice) {
    if (grade === 'HS') { grade = 'S'; reasons.push('Advice/recommendation query → cannot be Highly Satisfying'); }
  }
  if (!direct && grade === 'HS') {
    grade = 'S';
    reasons.push('No direct on-screen answer → user must click or scroll');
  }
  if (src === 'medium' && grade === 'HS') {
    grade = 'S';
    reasons.push('Medium source quality → capped at Satisfying');
  }
  if (src === 'low') {
    if (grade === 'HS' || grade === 'S') { grade = 'SS'; reasons.push('Low source quality → downgraded to Somewhat Satisfying'); }
    else if (grade === 'SS')             { grade = 'NS'; reasons.push('Low source quality on already-low result → Not Satisfying'); }
  }
  if (deg === 1 && grade === 'HS') { grade = 'S';  reasons.push('1 degree of separation → Satisfying'); }
  if (deg === 2) {
    if (grade === 'HS' || grade === 'S') { grade = 'SS'; reasons.push('2 degrees of separation → Somewhat Satisfying'); }
  }
  if (deg >= 3) { grade = 'NS'; reasons.push('3+ degrees of separation → Not Satisfying'); }

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
    return 'About the Same — both sides returned no results.';

  if (left === 'empty') {
    if (r >= 3) return 'Right is Better — left is empty; right has at least one S or HS result. Per guidelines: prefer the side with S/HS when the other is empty. Never choose About the Same in this case.';
    return 'About the Same — left is empty but right has no S or HS results, so right is not meaningfully better.';
  }
  if (right === 'empty') {
    if (l >= 3) return 'Left is Better — right is empty; left has at least one S or HS result.';
    return 'About the Same — right is empty but left has no S or HS results.';
  }

  const diff = r - l;
  if (diff === 0)  return 'About the Same — both sides have results of similar quality.';
  if (diff === 1)  return 'Right is Slightly Better — right has marginally better results.';
  if (diff >= 2)   return 'Right is Better (or Much Better) — right has notably better results.';
  if (diff === -1) return 'Left is Slightly Better — left has marginally better results.';
  return 'Left is Better (or Much Better) — left has notably better results.';
}

function updateOprPreview() {
  const left  = document.getElementById('oprLeft').value;
  const right = document.getElementById('oprRight').value;
  document.getElementById('oprPreview').textContent = computeOPR(left, right);
}

// Wire up live updates
['srDirectAnswer','srAdviceQuery','srWrongLang','srContentUnavailable','srInappropriate'].forEach(id => {
  document.getElementById(id).addEventListener('change', updateLiveGrade);
});

// Final rate button
document.getElementById('satisfactionBtn').addEventListener('click', () => {
  const query    = document.getElementById('srQuery').value.trim();
  const platform = document.getElementById('srPlatform').value;
  const rType    = document.getElementById('srResultType').options[document.getElementById('srResultType').selectedIndex].text;
  const { grade, flags, reasons } = computeGrade();
  const oprText  = computeOPR(document.getElementById('oprLeft').value, document.getElementById('oprRight').value);

  const gradeLabels = { HS: 'HIGHLY SATISFYING', S: 'SATISFYING', SS: 'SOMEWHAT SATISFYING', NS: 'NOT SATISFYING' };
  const gradeCls    = { HS: 'hs', S: 's', SS: 'ss', NS: 'ns' };
  const out = document.getElementById('satisfactionResultOutput');

  if (grade === 'FLAG') {
    out.innerHTML = badge('flag', 'FLAG & SUBMIT (TAG)')
      + pre(`Platform: TAG\nFlags: ${flags.join(', ')}\n\nAction: Flag the result as indicated above, then submit.\nDo NOT assign a satisfaction rating — TAG stops at the flag step.`);
    return;
  }

  let body = `Query: ${query || '(not entered)'}\nPlatform: ${platform.toUpperCase()}\nResult Type: ${rType}\nFlags: ${flags.length ? flags.join(', ') : 'None'}\n\nSuggested Grade: ${gradeLabels[grade]}`;
  if (reasons.length) body += `\n\nFactors applied:\n  • ${reasons.join('\n  • ')}`;
  body += `\n\nOPR Suggestion: ${oprText}`;

  // Sample written comment for OPR
  const commentParts = [];
  if (!query) {
    commentParts.push('The query intent should be considered when evaluating whether the result satisfies the user’s need.');
  } else {
    commentParts.push(`The user query “${query}” ${reasons.length ? 'was evaluated with the following factors applied: ' + reasons[0] + '.' : 'was evaluated against the result.'}`);
  }
  body += `\n\nSample OPR Comment (≥20 words):\n"${commentParts.join(' ')} The suggested grade is ${gradeLabels[grade]}. ${oprText}"`;

  out.innerHTML = badge(gradeCls[grade], gradeLabels[grade]) + pre(body);
});

// Initialize live previews
updateLiveGrade();
updateOprPreview();

// ============================================================
// BROAD MATCH
// ============================================================
function bmAutoDetect() {
  const kw  = document.getElementById('bmKeyword').value.trim().toLowerCase();
  const exp = document.getElementById('bmExpansion').value.trim().toLowerCase();
  const el  = document.getElementById('bmAutoCheck');

  if (!kw || !exp) { el.className = 'live-check'; el.textContent = ''; return; }

  const hints = [];

  if (kw === exp) {
    hints.push('Identical pair — double check this is correct');
  }
  // Space difference
  if (kw.replace(/\s/g,'') === exp.replace(/\s/g,'') && kw !== exp) {
    hints.push('✓ Spacing difference only → likely GOOD');
  }
  // Reorder
  const kwSorted  = kw.split(/\s+/).sort().join(' ');
  const expSorted = exp.split(/\s+/).sort().join(' ');
  if (kwSorted === expSorted && kw !== exp) {
    hints.push('✓ Same words, different order → likely GOOD (Reordering)');
  }
  // Plural/singular
  if ((kw + 's') === exp || (exp + 's') === kw) {
    hints.push('✓ Singular/Plural variant → likely GOOD');
  }
  // Short edit distance
  if (levenshtein(kw, exp) <= 2 && kw !== exp && kw.replace(/\s/g,'') !== exp.replace(/\s/g,'')) {
    hints.push('✓ Very close spelling → possible spell correction → likely GOOD');
  }
  // One is prefix of other (word addition)
  const kwWords  = kw.split(/\s+/);
  const expWords = exp.split(/\s+/);
  if (kwWords.every(w => expWords.includes(w)) || expWords.every(w => kwWords.includes(w))) {
    if (kw !== exp && kwSorted !== expSorted) hints.push('✓ One includes all words of the other → possible word addition → check intent');
  }

  if (hints.length) {
    el.className = 'live-check pass';
    el.textContent = hints.join(' · ');
  } else {
    el.className = 'live-check neutral';
    el.textContent = 'Pair entered — use checklist below to rate.';
  }
}

// ---- EXPANSION PICKER ----
function scoreExpansion(kw, exp) {
  if (!exp.trim()) return null;
  const k = kw.toLowerCase().trim();
  const e = exp.toLowerCase().trim();

  // Highly — essentially the same query
  if (k === e) return { level: 'hi', label: 'Highly — identical' };
  if (k.replace(/\s/g,'') === e.replace(/\s/g,'')) return { level: 'hi', label: 'Highly — spacing only' };
  if (levenshtein(k, e) <= 2) return { level: 'hi', label: 'Highly — spell correction' };
  const kSort = k.split(/\s+/).sort().join(' ');
  const eSort = e.split(/\s+/).sort().join(' ');
  if (kSort === eSort) return { level: 'hi', label: 'Highly — reordering' };
  if ((k + 's') === e || (e + 's') === k) return { level: 'hi', label: 'Highly — singular/plural' };
  const kWords = k.split(/\s+/);
  const eWords = e.split(/\s+/);
  if (kWords.every(w => eWords.includes(w)) || eWords.every(w => kWords.includes(w))) {
    return { level: 'hi', label: 'Highly — word addition/removal' };
  }

  // Good — related, same category (overlap score)
  const overlap = kWords.filter(w => eWords.includes(w) && w.length > 2).length;
  const overlapRatio = overlap / Math.max(kWords.length, eWords.length);
  if (overlapRatio >= 0.5) return { level: 'good', label: 'Good — shared terms' };

  // Somewhat — some connection
  if (overlapRatio > 0) return { level: 'some', label: 'Somewhat — partial overlap' };

  // Not Interesting — no connection detected
  return { level: 'none', label: 'Not Interesting — no clear connection' };
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
      el.textContent = '⚠ BAD indicator checked — this pair is BAD. Bad overrides all Good and Acceptable checks.';
    } else if (goodAny) {
      el.className = 'live-check pass';
      el.textContent = '✓ GOOD indicator(s) checked';
    } else if (acceptAny) {
      el.className = 'live-check warn';
      el.textContent = '○ ACCEPTABLE indicator(s) checked';
    } else {
      el.className = 'live-check';
      el.textContent = '';
    }
  });
});

document.getElementById('bmRateBtn').addEventListener('click', () => {
  const kw  = document.getElementById('bmKeyword').value.trim();
  const exp = document.getElementById('bmExpansion').value.trim();
  const out = document.getElementById('bmResultOutput');

  if (!kw || !exp) {
    out.innerHTML = `<p class="hint fail">Please enter both a Keyword and an Expansion before rating.</p>`;
    return;
  }

  const badChecks    = [...document.querySelectorAll('.bm-row[data-rating="bad"] .bm-check:checked')];
  const goodChecks   = [...document.querySelectorAll('.bm-row[data-rating="good"] .bm-check:checked')];
  const acceptChecks = [...document.querySelectorAll('.bm-row[data-rating="acceptable"] .bm-check:checked')];

  const getLabel = cb => cb.closest('label').querySelector('span').textContent.trim();

  let rating, cls, explanation;

  if (badChecks.length > 0) {
    rating = 'BAD';
    cls = 'bad';
    explanation = `BAD match.\n\nBAD indicators checked:\n  • ${badChecks.map(getLabel).join('\n  • ')}\n\nA BAD pair means the keyword and expansion do not share the same user intent or meaning. The ad expansion would not serve the same need as the original keyword.`;
  } else if (goodChecks.length > 0) {
    rating = 'GOOD';
    cls = 'good';
    explanation = `GOOD match.\n\nGOOD indicators:\n  • ${goodChecks.map(getLabel).join('\n  • ')}\n\nA GOOD pair means the keyword and expansion are essentially the same query — a spelling variant, spacing fix, reordering, abbreviation, singular/plural, app name variant, or translation.`;
  } else if (acceptChecks.length > 0) {
    rating = 'ACCEPTABLE';
    cls = 'acceptable';
    explanation = `ACCEPTABLE match.\n\nACCEPTABLE indicators:\n  • ${acceptChecks.map(getLabel).join('\n  • ')}\n\nACCEPTABLE means the pair are related — direct competitors, a brand and non-brand with the same functionality, or non-brand terms in the same category — but they are not the same query.`;
  } else {
    out.innerHTML = `<p class="hint warn">⚠ No checklist items were selected. Use the checklist to indicate which criteria apply, then click Rate again.</p>`;
    return;
  }

  out.innerHTML = badge(cls, rating) + pre(`Keyword:   ${kw}\nExpansion: ${exp}\n\n${explanation}`);
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
    pre(`Task: ${title}\nPriority Score: ${score}\nUrgency: ${urgency} · Impact: ${impact} · Effort: ${effort}`);
});

// ============================================================
// RELEASE GATE
// ============================================================
document.getElementById('releaseBtn').addEventListener('click', () => {
  const name = document.getElementById('releaseName').value.trim() || 'Unnamed Release';
  const gates = [
    { label: 'Tests passing',        id: 'testsPass' },
    { label: 'No blocker bugs',      id: 'noBlockers' },
    { label: 'Documentation updated',id: 'docsReady' },
    { label: 'Rollback plan ready',  id: 'rollbackReady' },
    { label: 'Monitoring & alerts',  id: 'monitoringReady' },
  ];
  const failed  = gates.filter(g => !document.getElementById(g.id).checked).map(g => g.label);
  const passed  = gates.filter(g =>  document.getElementById(g.id).checked).map(g => g.label);
  const decision = failed.length === 0 ? 'GO' : failed.length <= 2 ? 'GO WITH RISKS' : 'NO-GO';
  const cls      = failed.length === 0 ? 'good' : failed.length <= 2 ? 'acceptable' : 'bad';

  document.getElementById('releaseOutput').innerHTML =
    badge(cls, decision) +
    pre(`Release: ${name}\n\nPassed gates (${passed.length}/5):\n  ✓ ${passed.length ? passed.join('\n  ✓ ') : '(none)'}\n\nMissing gates (${failed.length}):\n  ✗ ${failed.length ? failed.join('\n  ✗ ') : '(none — all gates passed!)'}`);
});
