function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('readagora-narration-settings') || '{}');
    return {
      rate: [0.75, 1, 1.25, 1.5, 2].includes(Number(saved.rate)) ? Number(saved.rate) : 1,
      voiceURI: typeof saved.voiceURI === 'string' ? saved.voiceURI : '',
    };
  } catch {
    return { rate: 1, voiceURI: '' };
  }
}

function savePreferences(rate, voiceURI) {
  try { localStorage.setItem('readagora-narration-settings', JSON.stringify({ rate, voiceURI })); } catch {}
}

export function segmentSpeechText(text) {
  const paragraphs = String(text || '').split(/\n+/).map(part => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const segments = [];
  for (const paragraph of paragraphs) {
    let remaining = paragraph;
    while (remaining.length > 1600) {
      const sentenceEnd = Math.max(...['. ', '! ', '? '].map(mark => remaining.lastIndexOf(mark, 1599)));
      let boundary = sentenceEnd >= 800 ? sentenceEnd + 1 : remaining.lastIndexOf(' ', 1600);
      if (boundary < 800) boundary = 1600;
      // Keep UTF-16 surrogate pairs together when a single word needs splitting.
      if (/[\uD800-\uDBFF]/.test(remaining[boundary - 1])) boundary--;
      segments.push(remaining.slice(0, boundary).trim());
      remaining = remaining.slice(boundary).trimStart();
    }
    if (remaining) segments.push(remaining);
  }
  return segments;
}

export function createBrowserSpeechPlayer(onChange = () => {}, onComplete = () => {}) {
  const preferences = readPreferences();
  let rate = preferences.rate;
  let voiceURI = preferences.voiceURI;
  let segments = [];
  let index = 0;
  let utterance = null;
  let active = false;
  let paused = false;
  let error = '';
  let generation = 0;

  const voices = () => 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
  const snapshot = () => ({ rate, voiceURI, index, total: segments.length, active, paused, error });
  const notify = () => onChange(snapshot());

  function speakAt(nextIndex) {
    if (!segments.length || !('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
      error = segments.length ? 'Narration is not supported by this browser.' : 'This chapter has no readable text.';
      active = false; paused = false; notify(); return;
    }
    index = Math.max(0, Math.min(segments.length - 1, nextIndex));
    const token = ++generation;
    window.speechSynthesis.cancel();
    const next = new SpeechSynthesisUtterance(segments[index]);
    next.rate = rate;
    next.voice = voices().find(item => item.voiceURI === voiceURI) || null;
    next.onstart = () => { if (token !== generation) return; active = true; error = ''; notify(); };
    next.onend = () => {
      if (token !== generation) return;
      if (index + 1 < segments.length) speakAt(index + 1);
      else { generation++; active = false; paused = false; utterance = null; notify(); onComplete(); }
    };
    next.onerror = event => {
      if (token !== generation || event.error === 'canceled' || event.error === 'interrupted') return;
      generation++;
      active = false; paused = false; utterance = null; error = 'Narration stopped. Try again.'; notify();
    };
    utterance = next; active = true; paused = false; error = ''; notify();
    window.speechSynthesis.speak(next);
  }

  function setSegments(nextSegments) { segments = nextSegments || []; index = Math.min(index, Math.max(segments.length - 1, 0)); }
  function play(nextSegments) { if (nextSegments) setSegments(nextSegments); if (paused) return resume(); speakAt(0); }
  function pause() { if (!active || !('speechSynthesis' in window)) return; window.speechSynthesis.pause(); paused = true; notify(); }
  function resume() {
    if (!paused || !('speechSynthesis' in window)) return;
    if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); active = true; paused = false; notify(); }
    else speakAt(index);
  }
  function stop() {
    generation++;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    utterance = null; active = false; paused = false; error = ''; notify();
  }
  function toggle(nextSegments) {
    if (active && !paused) pause();
    else if (paused) resume();
    else play(nextSegments);
  }
  function previous() { if (segments.length) speakAt(index - 1); }
  function next() { if (segments.length) speakAt(index + 1); }
  function restartCurrent() {
    const shouldPause = paused;
    speakAt(index);
    if (shouldPause) { window.speechSynthesis.pause(); active = true; paused = true; notify(); }
  }
  function setRate(value) {
    if (![0.75, 1, 1.25, 1.5, 2].includes(Number(value))) return;
    rate = Number(value); savePreferences(rate, voiceURI);
    if (active || paused) restartCurrent(); else notify();
  }
  function setVoice(value) {
    voiceURI = value || ''; savePreferences(rate, voiceURI);
    if (active || paused) restartCurrent(); else notify();
  }
  function getVoices() { return voices(); }

  notify();
  return { get rate() { return rate; }, get voiceURI() { return voiceURI; }, get voices() { return voices(); }, get snapshot() { return snapshot(); }, getVoices, setSegments, play, pause, resume, stop, toggle, previous, next, setRate, setVoice };
}
