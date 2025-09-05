// This regex is designed to capture a wide range of chord notations.
// It looks for a root note (A-G), followed by optional accidentals (#, b, sharp, flat).
// Then, it accounts for various chord qualities (m, maj, min, dim, aug, sus, 7, 9, 11, 13, etc.)
// and alterations (e.g., b5, #9) and bass notes (e.g., /G).
const CHORD_REGEX = /\b([A-G])(##|#|b|bb)?(maj|m|min|aug|dim|sus|add|m7b5|ø)?[0-9]*(sus[0-9])?(\(?(b|#)[0-9]+\)?)?(\/[A-G](##|#|b|bb)?)?\b/g;

export const parseChordsInLine = (line: string): string[] => {
  if (!line || typeof line !== 'string') return [];
  // A simple heuristic: if a line contains characters other than those typically in chords,
  // assume it's a lyric line. This is imperfect but effective for most cases.
  if (/[h-zH-Z]/.test(line.replace(/min|maj|aug|dim|sus|add|flat/ig, ''))) {
    return [];
  }
  const matches = line.match(CHORD_REGEX);
  return matches ? [...new Set(matches)] : [];
};

export const getAllChordsInSong = (content: string): string[] => {
  const allChords = new Set<string>();
  content.split('\n').forEach(line => {
    const chords = parseChordsInLine(line);
    chords.forEach(chord => allChords.add(chord));
  });
  return Array.from(allChords);
};

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const frequencyToNoteName = (frequency: number): string | null => {
  if (frequency <= 0) return null;
  const midiNum = 69 + 12 * Math.log2(frequency / 440);
  const noteIndex = Math.round(midiNum) % 12;
  return NOTE_NAMES[noteIndex];
};

export const getRootNote = (chord: string): string | null => {
    if (!chord) return null;
    let root = chord.charAt(0).toUpperCase();
    if (chord.length > 1) {
        if (chord.charAt(1) === '#' || chord.charAt(1) === 'b') {
            root += chord.charAt(1);
        }
    }
    // Normalize flats to sharps for easier comparison
    switch (root) {
        case 'Db': return 'C#';
        case 'Eb': return 'D#';
        case 'Gb': return 'F#';
        case 'Ab': return 'G#';
        case 'Bb': return 'A#';
        default: return root;
    }
};