export interface Song {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface Set {
  id: string;
  title: string;
  songIds: string[];
}

export interface ChordDiagramData {
  frets: (number | 'x' | 'o')[]; // 'x' for mute, 'o' for open, number for fret
  fingers: (number | 'x' | 'o')[]; // fingerings
  baseFret: number;
}
