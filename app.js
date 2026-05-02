const resultEl = document.getElementById('resultText');
const moduleSelect = document.getElementById('moduleSelect');
const moduleHint = document.getElementById('moduleHint');
const textModule = document.getElementById('textModule');
const triageModule = document.getElementById('triageModule');
const releaseModule = document.getElementById('releaseModule');

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const stageDirRegex = /(\[[^\]]*(hour later|at the|scene|later|enters|exit|stage)[^\]]*\])|(\.{3}|…)/i;
const offensiveWords = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "bastard"];

function linesOf(text) { return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean); }
function normalizeWords(s) { return (s.toLowerCase().match(/[a-z']+/g) || []); }
function parseSpeaker(line) {
  const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
  if (!m) return { speaker: null, msg: line };
  return { speaker: m[1].trim(), msg: m[2].trim() };
}

function setModule(value) {
  textModule.classList.toggle('hidden', value !== 'text_eval');
  triageModule.classList.toggle('hidden', value !== 'task_triage');
  releaseModule.classList.toggle('hidden', value !== 'release_gate');
  const names = {
    text_eval: 'Text Evaluator',
    task_triage: 'Task Triage',
    release_gate: 'Release Gate',
  };
  moduleHint.textContent = `Active module: ${names[value]}.`;
  resultEl.textContent = `Ready: ${names[value]}`;
}

function summaryFromTranscript(text) {
  const words = normalizeWords(text).slice(0, 30);
  return words.length ? words.join(' ') : 'No transcript content provided.';
}

function detectRejectReasons(text) {
  const reasons = new Set();
  const rawLines = linesOf(text);
  const parsed = rawLines.map(parseSpeaker);
  if (emojiRegex.test(text)) reasons.add('Contains Emojis');
  if (stageDirRegex.test(text)) reasons.add('Conversation Could Not Happen Over Text');

  const participants = [...new Set(parsed.map((p) => p.speaker).filter(Boolean))];
  for (const p of parsed) {
    if (!p.speaker) continue;
    for (const other of participants) {
      const esc = other.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (other !== p.speaker && new RegExp(`\\b${esc}\\b`, 'i').test(p.msg)) reasons.add('Includes Name of Participant');
    }
  }

  for (const line of rawLines) {
    const words = normalizeWords(line);
    for (let i = 1; i < words.length; i++) if (words[i] === words[i - 1] && !['that', 'it'].includes(words[i])) reasons.add('Unnecessary Repetition');
  }

  const lower = text.toLowerCase();
  if (offensiveWords.some((w) => lower.includes(w))) reasons.add('Offensive Language');
  if (/\b\w*([a-z])\1\1\w*\b/i.test(text)) reasons.add('Spelling Mistake');

  const messages = parsed.map((p) => p.msg.toLowerCase());
  const freq = {};
  for (const m of messages) freq[m] = (freq[m] || 0) + 1;
  if (Object.values(freq).some((v) => v >= 3)) reasons.add('Incoherent/Not Human');

  return [...reasons];
}

function evaluateTranscript() {
  const t = document.getElementById('transcript').value.trim();
  const summary = summaryFromTranscript(t);
  const reasons = detectRejectReasons(t);
  const pass = reasons.length === 0;
  resultEl.textContent = `Summary (<=30 words): ${summary}\nDecision: ${pass ? 'PASS' : 'REJECT'}\n${pass ? 'Reject Reasons: none' : `Reject Reasons: ${reasons.join(', ')}`}`;
  return { pass };
}

function scoreResponse(transcript, response) {
  let score = 100;
  const why = [];
  if (!response.trim()) return { score: -999, why: ['Empty response'] };
  if (emojiRegex.test(response)) { score -= 70; why.push('Contains emoji'); }
  if (stageDirRegex.test(response)) { score -= 40; why.push('Not text-like'); }
  if (offensiveWords.some((w) => response.toLowerCase().includes(w))) { score -= 50; why.push('Offensive language'); }
  if (/\b\w*([a-z])\1\1\w*\b/i.test(response)) { score -= 25; why.push('Likely spelling error'); }

  const lastLine = linesOf(transcript).slice(-1)[0] || '';
  const overlap = normalizeWords(lastLine).filter((w) => normalizeWords(response).includes(w)).length;
  if (overlap === 0) { score -= 25; why.push('Weak context match'); }
  return { score, why };
}

function pickResponse() {
  const tEval = evaluateTranscript();
  if (!tEval.pass) {
    resultEl.textContent += '\n\nResponse Selection Skipped: transcript rejected.';
    return;
  }
  const transcript = document.getElementById('transcript').value.trim();
  const candidates = [resp1.value, resp2.value, resp3.value, resp4.value];
  const scored = candidates
    .map((r, i) => ({ index: i + 1, response: r, ...scoreResponse(transcript, r) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  resultEl.textContent += `\n\nBest Response: #${best.index}\nSelected Text: ${best.response || '(empty)'}\nScore: ${best.score}`;
}

function suggestMcq() {
  const options = [mcqA.value, mcqB.value, mcqC.value, mcqD.value];
  const transcriptWords = normalizeWords(transcript.value);
  const ranked = options
    .map((o, i) => ({ i: i + 1, o, overlap: normalizeWords(o).filter((w) => transcriptWords.includes(w)).length }))
    .sort((a, b) => b.overlap - a.overlap);
  const best = ranked[0];
  resultEl.textContent += `\n\nMCQ Suggestion: Choice ${String.fromCharCode(64 + best.i)} - ${best.o}`;
}

function triageTask() {
  const title = taskTitle.value.trim() || 'Untitled Task';
  const urgency = Math.min(5, Math.max(1, Number(document.getElementById('urgency').value) || 3));
  const impact = Math.min(5, Math.max(1, Number(document.getElementById('impact').value) || 3));
  const effort = Math.min(5, Math.max(1, Number(document.getElementById('effort').value) || 3));

  const priorityScore = urgency * 2 + impact * 2 - effort;
  let bucket = 'Backlog';
  if (priorityScore >= 14) bucket = 'Do Now';
  else if (priorityScore >= 10) bucket = 'Schedule This Week';
  else if (priorityScore >= 7) bucket = 'Schedule Later';

  resultEl.textContent = `Task: ${title}\nPriority Score: ${priorityScore}\nBucket: ${bucket}\n\nSuggested Next Action: ${bucket === 'Do Now' ? 'Start immediately and break into subtasks.' : bucket === 'Schedule This Week' ? 'Time-box and assign owner.' : bucket === 'Schedule Later' ? 'Add dependency notes and revisit.' : 'Keep parked until urgency/impact changes.'}`;
}

function evaluateRelease() {
  const name = releaseName.value.trim() || 'Unnamed Release';
  const checks = [
    { label: 'Tests passing', ok: testsPass.checked },
    { label: 'No blocker bugs', ok: noBlockers.checked },
    { label: 'Docs updated', ok: docsReady.checked },
    { label: 'Rollback plan ready', ok: rollbackReady.checked },
    { label: 'Monitoring/alerts ready', ok: monitoringReady.checked },
  ];

  const failed = checks.filter((c) => !c.ok).map((c) => c.label);
  const decision = failed.length === 0 ? 'GO' : failed.length <= 2 ? 'GO WITH RISKS' : 'NO-GO';

  resultEl.textContent = `Release: ${name}\nDecision: ${decision}\n${failed.length ? `Missing Gates: ${failed.join(', ')}` : 'All gates passed.'}`;
}

moduleSelect.addEventListener('change', (e) => setModule(e.target.value));

evalBtn.addEventListener('click', evaluateTranscript);
pickBtn.addEventListener('click', pickResponse);
mcqBtn.addEventListener('click', suggestMcq);
triageBtn.addEventListener('click', triageTask);
releaseBtn.addEventListener('click', evaluateRelease);

setModule(moduleSelect.value);
