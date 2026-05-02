const resultEl = document.getElementById('resultText');

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const stageDirRegex = /(\[[^\]]*(hour later|at the|scene|later|enters|exit|stage)[^\]]*\])|(\.{3}|…)/i;
const offensiveWords = ["fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "bastard"];

function linesOf(text) {
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function parseSpeaker(line) {
  const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
  if (!m) return { speaker: null, msg: line };
  return { speaker: m[1].trim(), msg: m[2].trim() };
}

function normalizeWords(s) {
  return (s.toLowerCase().match(/[a-z']+/g) || []);
}

function summaryFromTranscript(text) {
  const words = normalizeWords(text).slice(0, 30);
  if (!words.length) return "No transcript content provided.";
  return words.join(' ');
}

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
      if (other !== p.speaker && new RegExp(`\\b${other.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(p.msg)) {
        reasons.add('Includes Name of Participant');
      }
    }
  }

  for (const line of rawLines) {
    const words = normalizeWords(line);
    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i - 1] && !["that", "it"].includes(words[i])) reasons.add('Unnecessary Repetition');
    }
  }

  const lower = text.toLowerCase();
  if (offensiveWords.some(w => lower.includes(w))) reasons.add('Offensive Language');

  // Heuristic for incoherent/not human: repeated same short utterance or abrupt outlier keywords.
  const messages = parsed.map(p => p.msg.toLowerCase());
  const freq = {};
  for (const m of messages) freq[m] = (freq[m] || 0) + 1;
  if (Object.values(freq).some(v => v >= 3)) reasons.add('Incoherent/Not Human');
  if (/\bbigfoot is real\b|\bprecise temporal interval\b|\bbusiness-oriented caucus\b/i.test(text)) reasons.add('Incoherent/Not Human');

  // Very lightweight spelling heuristic for obvious repeated letters.
  if (/\b\w*([a-z])\1\1\w*\b/i.test(text)) reasons.add('Spelling Mistake');

  return [...reasons];
}

function evaluateTranscript() {
  const t = document.getElementById('transcript').value.trim();
  const summary = summaryFromTranscript(t);
  const reasons = detectRejectReasons(t);
  const pass = reasons.length === 0;

  const output = [
    `Summary (<=30 words): ${summary}`,
    `Decision: ${pass ? 'PASS' : 'REJECT'}`,
    pass ? 'Reject Reasons: none' : `Reject Reasons: ${reasons.join(', ')}`,
  ];

  resultEl.textContent = output.join('\n');
  return { pass, reasons, summary };
}

function scoreResponse(transcript, response) {
  let score = 100;
  let why = [];
  if (!response.trim()) return { score: -999, why: ['Empty response'] };
  if (emojiRegex.test(response)) { score -= 70; why.push('Contains emoji'); }
  if (stageDirRegex.test(response)) { score -= 40; why.push('Not text-like'); }
  if (offensiveWords.some(w => response.toLowerCase().includes(w))) { score -= 50; why.push('Offensive language'); }
  if (/\b\w*([a-z])\1\1\w*\b/i.test(response)) { score -= 25; why.push('Likely spelling error'); }

  const lastLine = linesOf(transcript).slice(-1)[0] || '';
  const overlap = normalizeWords(lastLine).filter(w => normalizeWords(response).includes(w)).length;
  if (overlap === 0) { score -= 25; why.push('Weak context match'); }
  if (response.length < 3 || response.length > 180) { score -= 10; why.push('Unnatural response length'); }

  return { score, why };
}

function pickResponse() {
  const tEval = evaluateTranscript();
  if (!tEval.pass) {
    resultEl.textContent += '\n\nResponse Selection Skipped: transcript rejected.';
    return;
  }

  const transcript = document.getElementById('transcript').value.trim();
  const candidates = [
    document.getElementById('resp1').value,
    document.getElementById('resp2').value,
    document.getElementById('resp3').value,
    document.getElementById('resp4').value,
  ];

  const scored = candidates.map((r, i) => ({ index: i + 1, response: r, ...scoreResponse(transcript, r) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  resultEl.textContent += `\n\nBest Response: #${best.index}`;
  resultEl.textContent += `\nSelected Text: ${best.response || '(empty)'}`;
  resultEl.textContent += `\nScore: ${best.score}`;
  if (best.why.length) resultEl.textContent += `\nNotes: ${best.why.join('; ')}`;
}

function suggestMcq() {
  const q = document.getElementById('mcqQ').value.toLowerCase();
  const options = [
    document.getElementById('mcqA').value,
    document.getElementById('mcqB').value,
    document.getElementById('mcqC').value,
    document.getElementById('mcqD').value,
  ];
  const transcriptWords = normalizeWords(document.getElementById('transcript').value);

  const ranked = options.map((o, i) => {
    const ow = normalizeWords(o);
    const overlap = ow.filter(w => transcriptWords.includes(w)).length;
    return { i: i + 1, o, overlap };
  }).sort((a, b) => b.overlap - a.overlap);

  const best = ranked[0];
  resultEl.textContent += `\n\nMCQ Suggestion: Choice ${String.fromCharCode(64 + best.i)} - ${best.o}`;
  resultEl.textContent += `\nReason: highest lexical overlap with original transcript content.`;
}

document.getElementById('evalBtn').addEventListener('click', evaluateTranscript);
document.getElementById('pickBtn').addEventListener('click', pickResponse);
document.getElementById('mcqBtn').addEventListener('click', suggestMcq);
