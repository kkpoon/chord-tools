const chordInput = document.getElementById('chord');
const paper = document.getElementById('paper');

function renderChord() {
  const chordSymbol = chordInput.value;
  if (!chordSymbol) {
    paper.innerHTML = '';
    return;
  }

  try {
    const chordInfo = Tonal.Chord.get(chordSymbol);
    const notes = chordInfo && chordInfo.notes ? chordInfo.notes : [];

    // Convert Tonal notes (e.g., C4, C#, Eb) to ABC-safe tokens
    function toAbcToken(note) {
      if (!note) return '';
      // strip octave numbers
      let n = note.replace(/\d+/g, '');
      // match letter followed by accidentals (common Tonal format: E b)
      let m = n.match(/^([A-Ga-g])([#b]{0,2})$/);
      if (m) {
        const letter = m[1].toUpperCase();
        const accidental = m[2] || '';
        const acc = accidental.replace(/##/g, '^^').replace(/bb/g, '__').replace(/#/g, '^').replace(/b/g, '_');
        return acc + letter;
      }
      // fallback: match accidentals before the letter (e.g., ^C or _D)
      m = n.match(/^([#b]{0,2})([A-Ga-g])$/);
      if (m) {
        const accidental = m[1] || '';
        const letter = m[2].toUpperCase();
        const acc = accidental.replace(/##/g, '^^').replace(/bb/g, '__').replace(/#/g, '^').replace(/b/g, '_');
        return acc + letter;
      }
      // final fallback: strip unknown chars and uppercase letters
      return n.replace(/[^A-Ga-g\^_=]/g, '').toUpperCase();
    }

    // Build ABC tokens while preserving input order by assigning octaves
    // Compute a MIDI value for each note (default octave 4), then bump
    // by octaves (12 semitones) so the sequence is strictly increasing.
    let prevMidi = -Infinity;
    const notesAbc = notes.map(raw => {
      const base = (raw || '').replace(/\d+/g, '');
      let midi = Tonal.Note.midi(base + '4');
      if (!Number.isFinite(midi)) return '';
      while (!(prevMidi === -Infinity) && midi <= prevMidi) midi += 12;
      prevMidi = midi;
      const noteWithOct = Tonal.Note.fromMidi(midi); // e.g. C#5
      const m = noteWithOct.match(/^([A-G])([#b]{0,2})(\d+)$/);
      if (!m) return '';
      const letter = m[1];
      const accidental = m[2] || '';
      const octave = parseInt(m[3], 10);
      const acc = accidental.replace(/##/g, '^^').replace(/bb/g, '__').replace(/#/g, '^').replace(/b/g, '_');
      let abcLetter;
      if (octave > 4) {
        abcLetter = letter.toLowerCase() + "'".repeat(octave - 5);
      } else if (octave === 4) {
        abcLetter = letter;
      } else {
        abcLetter = letter + ','.repeat(4 - octave);
      }
      return acc + abcLetter;
    }).filter(Boolean);

    const abcString = 'X:1\nK:C\n[' + notesAbc.join('') + ']';

    if (notesAbc.length > 0) {
      ABCJS.renderAbc("paper", abcString);
    } else {
      paper.innerHTML = '<p>Invalid chord symbol</p>';
    }
  } catch (error) {
    console.error('Error parsing chord:', error);
    paper.innerHTML = '<p>Invalid chord symbol</p>';
  }
}

chordInput.addEventListener('input', renderChord);
renderChord(); // Initial render

// --- Notes list input: plot all notes and detect possible chords ---
function renderNotesList() {
  const input = document.getElementById('note-list').value;
  const notesPaper = document.getElementById('notes-paper');
  const results = document.getElementById('chord-results');
  if (!input) {
    notesPaper.innerHTML = '';
    results.innerHTML = '';
    return;
  }

  const rawNotes = input.trim().split(/\s+/).filter(Boolean);

  // Build ABC tokens preserving input order by assigning octaves
  let prevMidi = -Infinity;
  const notesAbc = rawNotes.map(raw => {
    const base = (raw || '').replace(/\d+/g, '');
    let midi = Tonal.Note.midi(base + '4');
    if (!Number.isFinite(midi)) return '';
    while (!(prevMidi === -Infinity) && midi <= prevMidi) midi += 12;
    prevMidi = midi;
    const noteWithOct = Tonal.Note.fromMidi(midi); // e.g. C#5
    const m = noteWithOct.match(/^([A-G])([#b]{0,2})(\d+)$/);
    if (!m) return '';
    const letter = m[1];
    const accidental = m[2] || '';
    const octave = parseInt(m[3], 10);
    const acc = accidental.replace(/##/g, '^^').replace(/bb/g, '__').replace(/#/g, '^').replace(/b/g, '_');
    let abcLetter;
    if (octave > 4) {
      abcLetter = letter.toLowerCase() + "'".repeat(octave - 5);
    } else if (octave === 4) {
      abcLetter = letter;
    } else {
      abcLetter = letter + ','.repeat(4 - octave);
    }
    return acc + abcLetter;
  }).filter(Boolean);

  const abcString = 'X:1\nK:C\n[' + notesAbc.join('') + ']';
  notesPaper.innerHTML = '';
  ABCJS.renderAbc('notes-paper', abcString);

  // detect possible chords from pitch classes
  const pcs = rawNotes.map(n => {
    // Prefer Tonal.Note.get(n).pc when available
    if (Tonal && Tonal.Note && typeof Tonal.Note.get === 'function') {
      const g = Tonal.Note.get(n);
      if (g && g.pc) return g.pc;
    }
    // fallback to helper functions if present
    if (Tonal && Tonal.Note && typeof Tonal.Note.pitchClass === 'function') {
      return Tonal.Note.pitchClass(n);
    }
    if (Tonal && Tonal.Note && typeof Tonal.Note.pc === 'function') {
      return Tonal.Note.pc(n);
    }
    // final fallback: normalize to Letter + accidental (keep accidental chars)
    const s = (n || '').replace(/\d+/g, '');
    const letter = s.charAt(0) ? s.charAt(0).toUpperCase() : '';
    const rest = (s.slice(1) || '').replace(/[^#b]/gi, '');
    return letter + rest;
  });
  const detected = Tonal.Chord.detect(pcs || []);

  // Detect rootless voicings: check common chord templates and see
  // if input pitch classes equal the chord's pitch classes minus one tone.
  const roots = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const types = ['maj7','m7','7','mMaj7','m6','6','m7b5','dim','sus4','add9','9','maj9','m9'];
  const uniquePcs = Array.from(new Set((pcs || []).map(p => (p||'').toUpperCase())));
  const otherChords = [];
  for (const r of roots) {
    for (const t of types) {
      const sym = r + t;
      const info = Tonal.Chord.get(sym);
      if (!info || !info.notes || !info.notes.length) continue;
      const chordPcs = Array.from(new Set(info.notes.map(n => {
        const g = Tonal.Note.get(n);
        return g && g.pc ? g.pc.toUpperCase() : (n || '').replace(/\d+/g,'').toUpperCase();
      })));
      // check if uniquePcs is subset of chordPcs
      const missing = chordPcs.filter(p => !uniquePcs.includes(p));
      const presentCount = chordPcs.length - missing.length;
      if (presentCount === uniquePcs.length && missing.length === 1) {
        // one missing tone -> candidate rootless
        const missingTone = missing[0];
        const rootPc = (Tonal.Note.get(r) && Tonal.Note.get(r).pc) ? Tonal.Note.get(r).pc.toUpperCase() : r.toUpperCase();
        const isRootMissing = missingTone === rootPc;
        const label = sym + (isRootMissing ? ' (rootless)' : ' (missing ' + missingTone + ')');
        otherChords.push(label);
      }
    }
  }

  let html = '<p>Chords: ' + (detected && detected.length ? detected.join(', ') : 'None') + '</p>';
  if (otherChords.length) {
    html += '<p>Other Possible Chords: ' + otherChords.join(', ') + '</p>';
  }
  results.innerHTML = html;

  // helper to extract base symbol (strip parenthetical suffixes)
  function baseSymbol(label) {
    if (!label) return label;
    const m = label.match(/^([A-Za-z0-9#b\+\-mMajdim7]+)\b/);
    if (m) return m[0];
    // fallback: take text before first space or '('
    const i = label.indexOf('(');
    if (i >= 0) return label.slice(0, i).trim();
    return label.split(/\s+/)[0];
  }

  // helper to render chords to a grid
  function renderChordsToGrid(gridId, chordList) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    const seen = new Set();
    let cellIndex = 0;
    
    chordList.forEach((cand) => {
      const sym = baseSymbol(cand);
      if (!sym) return;
      if (seen.has(sym)) return; // dedupe
      seen.add(sym);
      const info = Tonal.Chord.get(sym);
      if (!info || !info.notes || !info.notes.length) return;
      const notes = info.notes.map(n => (n || '').replace(/\d+/g, ''));

      // convert to ABC tokens (simple single-voicing stack)
      // assign octaves to keep notes in visually reasonable range
      let prevMidi = -Infinity;
      const notesAbc = notes.map(base => {
        let midi = Tonal.Note.midi(base + '4');
        if (!Number.isFinite(midi)) return '';
        while (!(prevMidi === -Infinity) && midi <= prevMidi) midi += 12;
        prevMidi = midi;
        const noteWithOct = Tonal.Note.fromMidi(midi);
        const m = noteWithOct.match(/^([A-G])([#b]{0,2})(\d+)$/);
        if (!m) return '';
        const letter = m[1];
        const accidental = m[2] || '';
        const octave = parseInt(m[3], 10);
        const acc = accidental.replace(/##/g, '^^').replace(/bb/g, '__').replace(/#/g, '^').replace(/b/g, '_');
        let abcLetter;
        if (octave > 4) {
          abcLetter = letter.toLowerCase() + "'".repeat(octave - 5);
        } else if (octave === 4) {
          abcLetter = letter;
        } else {
          abcLetter = letter + ','.repeat(4 - octave);
        }
        return acc + abcLetter;
      }).filter(Boolean);

      if (!notesAbc.length) return;

      const cell = document.createElement('div');
      cell.style.border = '1px solid #eee';
      cell.style.padding = '6px';
      cell.style.background = '#fff';
      cell.style.width = '200px';
      cell.style.boxSizing = 'border-box';
      cell.style.overflow = 'visible';
      cell.style.display = 'flex';
      cell.style.flexDirection = 'column';
      cell.style.alignItems = 'center';
      const title = document.createElement('div');
      title.textContent = sym;
      title.style.fontSize = '13px';
      title.style.fontWeight = '600';
      title.style.marginBottom = '6px';
      title.style.textAlign = 'center';
      cell.appendChild(title);
      const mount = document.createElement('div');
      const mountId = gridId + '-' + cellIndex++;
      mount.id = mountId;
      mount.style.width = '100%';
      mount.style.boxSizing = 'border-box';
      mount.style.display = 'flex';
      mount.style.justifyContent = 'center';
      mount.style.textAlign = 'center';
      cell.appendChild(mount);
      grid.appendChild(cell);

      const abcString = 'X:1\nK:C\n[' + notesAbc.join('') + ']';
      try {
        ABCJS.renderAbc(mountId, abcString, {}, { staffwidth: 180 });
      } catch (e) {
        mount.innerText = abcString;
      }
    });
  }

  // Render detected chords and otherChords to separate grids
  if (detected && detected.length) {
    renderChordsToGrid('detected-chords', detected);
  } else {
    document.getElementById('detected-chords').innerHTML = '';
  }
  if (otherChords && otherChords.length) {
    renderChordsToGrid('other-chords', otherChords);
  } else {
    document.getElementById('other-chords').innerHTML = '';
  }
}

document.getElementById('note-list').addEventListener('input', renderNotesList);
renderNotesList();
