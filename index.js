function normalizeNoteToken(note) {
  return (note || '').replace(/\d+/g, '');
}

function accidentalToAbc(accidental) {
  return (accidental || '')
    .replace(/##/g, '^^')
    .replace(/bb/g, '__')
    .replace(/#/g, '^')
    .replace(/b/g, '_');
}

function toAscendingAbcTokens(rawNotes, tonal) {
  let prevMidi = -Infinity;

  return (rawNotes || [])
    .map((raw) => {
      const base = normalizeNoteToken(raw);
      let midi = tonal.Note.midi(base + '4');
      if (!Number.isFinite(midi)) return '';

      while (prevMidi !== -Infinity && midi <= prevMidi) midi += 12;
      prevMidi = midi;

      const noteWithOct = tonal.Note.fromMidi(midi);
      const match = noteWithOct.match(/^([A-G])([#b]{0,2})(\d+)$/);
      if (!match) return '';

      const letter = match[1];
      const accidental = match[2] || '';
      const octave = parseInt(match[3], 10);
      const acc = accidentalToAbc(accidental);

      if (octave > 4) {
        return acc + letter.toLowerCase() + "'".repeat(octave - 5);
      }

      if (octave === 4) {
        return acc + letter;
      }

      return acc + letter + ','.repeat(4 - octave);
    })
    .filter(Boolean);
}

function buildAbcChord(notesAbc) {
  return 'X:1\nK:C\n[' + (notesAbc || []).join('') + ']';
}

function getPitchClass(note, tonal) {
  if (tonal && tonal.Note && typeof tonal.Note.get === 'function') {
    const info = tonal.Note.get(note);
    if (info && info.pc) return info.pc;
  }

  if (tonal && tonal.Note && typeof tonal.Note.pitchClass === 'function') {
    return tonal.Note.pitchClass(note);
  }

  if (tonal && tonal.Note && typeof tonal.Note.pc === 'function') {
    return tonal.Note.pc(note);
  }

  const normalized = normalizeNoteToken(note);
  const letter = normalized.charAt(0) ? normalized.charAt(0).toUpperCase() : '';
  const rest = (normalized.slice(1) || '').replace(/[^#b]/gi, '');
  return letter + rest;
}

function baseSymbol(label) {
  if (!label) return label;

  const match = label.match(/^([A-Za-z0-9#b\+\-mMajdim7]+)\b/);
  if (match) return match[0];

  const parenIndex = label.indexOf('(');
  if (parenIndex >= 0) return label.slice(0, parenIndex).trim();

  return label.split(/\s+/)[0];
}

function computeChordInputState(chordSymbol, tonal) {
  if (!chordSymbol) {
    return { abcString: '', errorMessage: '', shouldRender: false };
  }

  try {
    const chordInfo = tonal.Chord.get(chordSymbol);
    const notes = chordInfo && chordInfo.notes ? chordInfo.notes : [];
    const notesAbc = toAscendingAbcTokens(notes, tonal);

    if (!notesAbc.length) {
      return { abcString: '', errorMessage: 'Invalid chord symbol', shouldRender: false };
    }

    return {
      abcString: buildAbcChord(notesAbc),
      errorMessage: '',
      shouldRender: true,
    };
  } catch (error) {
    console.error('Error parsing chord:', error);
    return { abcString: '', errorMessage: 'Invalid chord symbol', shouldRender: false };
  }
}

function findOtherPossibleChords(pcs, tonal) {
  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const types = ['maj7', 'm7', '7', 'mMaj7', 'm6', '6', 'm7b5', 'dim', 'sus4', 'add9', '9', 'maj9', 'm9'];
  const uniquePcs = Array.from(new Set((pcs || []).map((pc) => (pc || '').toUpperCase())));
  const candidates = [];

  roots.forEach((root) => {
    types.forEach((type) => {
      const symbol = root + type;
      const info = tonal.Chord.get(symbol);
      if (!info || !info.notes || !info.notes.length) return;

      const chordPcs = Array.from(
        new Set(
          info.notes.map((note) => {
            const notePc = getPitchClass(note, tonal);
            return (notePc || '').toUpperCase();
          }),
        ),
      );

      const missing = chordPcs.filter((pc) => !uniquePcs.includes(pc));
      const presentCount = chordPcs.length - missing.length;
      if (presentCount !== uniquePcs.length || missing.length !== 1) return;

      const rootPc = (getPitchClass(root, tonal) || root).toUpperCase();
      const missingTone = missing[0];
      const suffix = missingTone === rootPc ? ' (rootless)' : ' (missing ' + missingTone + ')';
      candidates.push(symbol + suffix);
    });
  });

  return candidates;
}

function getChordCardModels(chordLabels, tonal) {
  const seen = new Set();

  return (chordLabels || [])
    .map((label) => baseSymbol(label))
    .filter((symbol) => {
      if (!symbol || seen.has(symbol)) return false;
      seen.add(symbol);
      return true;
    })
    .map((symbol) => {
      const info = tonal.Chord.get(symbol);
      if (!info || !info.notes || !info.notes.length) return null;
      const notesAbc = toAscendingAbcTokens(info.notes.map((n) => normalizeNoteToken(n)), tonal);
      if (!notesAbc.length) return null;

      return {
        symbol,
        abcString: buildAbcChord(notesAbc),
      };
    })
    .filter(Boolean);
}

function computeNotesInputState(input, tonal) {
  if (!input) {
    return {
      notesAbcString: '',
      resultsHtml: '',
      detectedChordCards: [],
      otherChordCards: [],
      shouldRenderNotes: false,
    };
  }

  const rawNotes = input.trim().split(/\s+/).filter(Boolean);
  const notesAbc = toAscendingAbcTokens(rawNotes, tonal);
  const notesAbcString = buildAbcChord(notesAbc);

  const pcs = rawNotes.map((note) => getPitchClass(note, tonal));
  const detected = tonal.Chord.detect(pcs || []);
  const otherChords = findOtherPossibleChords(pcs, tonal);

  let resultsHtml = '<p>Chords: ' + (detected && detected.length ? detected.join(', ') : 'None') + '</p>';
  if (otherChords.length) {
    resultsHtml += '<p>Other Possible Chords: ' + otherChords.join(', ') + '</p>';
  }

  return {
    notesAbcString,
    resultsHtml,
    detectedChordCards: getChordCardModels(detected, tonal),
    otherChordCards: getChordCardModels(otherChords, tonal),
    shouldRenderNotes: notesAbc.length > 0,
  };
}

function renderChordState(state, dom, renderAbc) {
  if (!state.shouldRender) {
    dom.paper.innerHTML = state.errorMessage ? '<p>' + state.errorMessage + '</p>' : '';
    return;
  }

  dom.paper.innerHTML = '';
  renderAbc('paper', state.abcString);
}

function createChordCell(doc, symbol, mountId) {
  const cell = doc.createElement('div');
  cell.style.border = '1px solid #eee';
  cell.style.padding = '6px';
  cell.style.background = '#fff';
  cell.style.width = '200px';
  cell.style.boxSizing = 'border-box';
  cell.style.overflow = 'visible';
  cell.style.display = 'flex';
  cell.style.flexDirection = 'column';
  cell.style.alignItems = 'center';

  const title = doc.createElement('div');
  title.textContent = symbol;
  title.style.fontSize = '13px';
  title.style.fontWeight = '600';
  title.style.marginBottom = '6px';
  title.style.textAlign = 'center';
  cell.appendChild(title);

  const mount = doc.createElement('div');
  mount.id = mountId;
  mount.style.width = '100%';
  mount.style.boxSizing = 'border-box';
  mount.style.display = 'flex';
  mount.style.justifyContent = 'center';
  mount.style.textAlign = 'center';
  cell.appendChild(mount);

  return cell;
}

function renderChordGrid(gridElement, cards, renderAbc, doc, gridId) {
  gridElement.innerHTML = '';

  (cards || []).forEach((card, index) => {
    const mountId = gridId + '-' + index;
    const cell = createChordCell(doc, card.symbol, mountId);
    gridElement.appendChild(cell);

    try {
      renderAbc(mountId, card.abcString, {}, { staffwidth: 180 });
    } catch (error) {
      doc.getElementById(mountId).innerText = card.abcString;
    }
  });
}

function renderNotesState(state, dom, renderAbc, doc) {
  dom.notesPaper.innerHTML = '';

  if (!state.shouldRenderNotes) {
    dom.results.innerHTML = state.resultsHtml || '';
    dom.detectedChords.innerHTML = '';
    dom.otherChords.innerHTML = '';
    return;
  }

  renderAbc('notes-paper', state.notesAbcString);
  dom.results.innerHTML = state.resultsHtml;

  renderChordGrid(dom.detectedChords, state.detectedChordCards, renderAbc, doc, 'detected-chords');
  renderChordGrid(dom.otherChords, state.otherChordCards, renderAbc, doc, 'other-chords');
}

function initChordTools(deps) {
  const {
    doc,
    tonal,
    renderAbc,
    chordInput,
    paper,
    noteListInput,
    notesPaper,
    results,
    detectedChords,
    otherChords,
  } = deps;

  const chordDom = { paper };
  const notesDom = { notesPaper, results, detectedChords, otherChords };

  const onChordInput = () => {
    const state = computeChordInputState(chordInput.value, tonal);
    renderChordState(state, chordDom, renderAbc);
  };

  const onNotesInput = () => {
    const state = computeNotesInputState(noteListInput.value, tonal);
    renderNotesState(state, notesDom, renderAbc, doc);
  };

  chordInput.addEventListener('input', onChordInput);
  noteListInput.addEventListener('input', onNotesInput);

  onChordInput();
  onNotesInput();
}

initChordTools({
  doc: document,
  tonal: Tonal,
  renderAbc: ABCJS.renderAbc,
  chordInput: document.getElementById('chord'),
  paper: document.getElementById('paper'),
  noteListInput: document.getElementById('note-list'),
  notesPaper: document.getElementById('notes-paper'),
  results: document.getElementById('chord-results'),
  detectedChords: document.getElementById('detected-chords'),
  otherChords: document.getElementById('other-chords'),
});
