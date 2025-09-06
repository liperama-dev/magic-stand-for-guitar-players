import { GoogleGenAI, Type } from "@google/genai";
// FIX: 'TextItem' is not an exported member of 'pdfjs-dist'. It has been removed from this import.
// A compatible interface is defined below within the PDF parsing logic.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { ChordDiagramData } from '../types';

// Configure pdf.js worker to load from CDN
GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.mjs';

if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set. Please ensure it is configured.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const chordDiagramSchema = {
  type: Type.OBJECT,
  properties: {
    frets: {
      type: Type.ARRAY,
      description: "Array of 6 items for strings EADGBe. Use a string: 'x' for mute, 'o' for open, or a number for the fret.",
      items: { type: Type.STRING }
    },
    fingers: {
      type: Type.ARRAY,
      description: "Array of 6 fingerings for EADGBe. Use a string: 'x' for mute, 'o' for open, or a number for the finger (1-4).",
      items: { type: Type.STRING }
    },
    baseFret: {
      type: Type.INTEGER,
      description: "The lowest fret number on the diagram, usually 1."
    }
  },
  required: ["frets", "fingers", "baseFret"]
};

export const fetchChordDiagram = async (chordName: string): Promise<ChordDiagramData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a common guitar chord diagram for the chord "${chordName}". Stick to a standard, easy-to-play voicing.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: chordDiagramSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    const frets = parsed.frets.map((f: string) => {
        const num = parseInt(f, 10);
        return isNaN(num) ? f : num;
    });
    const fingers = parsed.fingers.map((f: string) => {
        const num = parseInt(f, 10);
        return isNaN(num) ? f : num;
    });

    return { ...parsed, frets, fingers };
  } catch (error) {
    console.error(`Error fetching chord diagram for ${chordName}:`, error);
    throw new Error(`Could not generate chord diagram for ${chordName}.`);
  }
};

export const transposeSong = async (songContent: string, direction: 'up' | 'down'): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Transpose the following song ${direction} by one semitone. Keep the original formatting with chords above lyrics.\n\n${songContent}`,
        config: {
            temperature: 0,
        }
    });
    return response.text.trim();
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const songSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The title of the song." },
        content: { type: Type.STRING, description: "The lyrics and chords of the song, formatted with chords above the lyrics." }
    },
    required: ["title", "content"]
};

// --- START OF PDF PARSING LOGIC ---

// FIX: Define the TextItem interface as it is not exported from the root of 'pdfjs-dist'.
interface TextItem {
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[];
    fontName: string;
    hasEOL: boolean;
}

type PdfTextItem = TextItem & { transform: number[], width: number, height: number };
type LineType = 'CHORD' | 'LYRIC' | 'UNKNOWN';

interface ClassifiedLine {
  y: number;
  items: PdfTextItem[];
  type: LineType;
}

const isChordToken = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 15) return false;
    const chordRegex = /^[A-G](##|#|b|bb)?(maj|M|m|min|-|aug|\+|dim|°|sus|add|m7b5|ø)?[0-9]*(sus[0-9])?(\(?(b|#)[0-9]+\)?)?(\/[A-G](##|#|b|bb)?)?$/;
    return chordRegex.test(trimmed);
};

const mergeAdjacentTextItems = (items: PdfTextItem[]): PdfTextItem[] => {
    if (items.length < 2) return items;
    const sortedItems = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
    const merged: PdfTextItem[] = [];
    if (sortedItems.length === 0) return [];

    let currentItem = { ...sortedItems[0] };

    for (let i = 1; i < sortedItems.length; i++) {
        const nextItem = sortedItems[i];
        const currentItemEndX = currentItem.transform[4] + currentItem.width;
        const nextItemStartX = nextItem.transform[4];
        const gap = nextItemStartX - currentItemEndX;
        
        // Merge if items are very close (e.g. F, 7, +) but not if they are clearly separate chords (e.g. Em G7)
        const MERGE_THRESHOLD = (currentItem.width / (currentItem.str.length || 1)) * 0.5;
        if (gap >= -2 && gap < MERGE_THRESHOLD) {
            currentItem.str += nextItem.str;
            currentItem.width = (nextItem.transform[4] + nextItem.width) - currentItem.transform[4];
        } else {
            merged.push(currentItem);
            currentItem = { ...nextItem };
        }
    }
    merged.push(currentItem);
    return merged;
};

const classifyLine = (lineItems: PdfTextItem[]): LineType => {
    if (lineItems.length === 0) return 'UNKNOWN';
    const tokens = lineItems.map(item => item.str.trim()).filter(Boolean);
    if (tokens.length === 0) return 'UNKNOWN';

    const chordTokens = tokens.filter(isChordToken);
    const chordRatio = chordTokens.length / tokens.length;

    if (chordRatio > 0.7) return 'CHORD';
    
    // Check if there are non-chord-like words, indicating lyrics
    const hasLyrics = tokens.some(token => /[h-zH-Z]/.test(token.replace(/min|maj|aug|dim|sus|add|flat/ig, '')));
    if (hasLyrics) return 'LYRIC';

    // If it's not clearly lyrics and has some chords, it's likely a chord line.
    if (chordRatio > 0.2) return 'CHORD';
    
    // Treat section headers like [Intro] as unknown, to be printed as-is
    if (tokens.join('').trim().match(/^\[.*\]$/)) return 'UNKNOWN';

    return 'LYRIC'; // Default to lyric if unsure
};

const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const rawItems = textContent.items as PdfTextItem[];
        if (rawItems.length === 0) continue;

        const allItems = mergeAdjacentTextItems(rawItems);
        if (allItems.length === 0) continue;
        
        // Group items into lines based on Y-coordinate
        const rawLines = new Map<number, PdfTextItem[]>();
        const Y_TOLERANCE = 5;
        for (const item of allItems) {
            let foundLine = false;
            for (const y of rawLines.keys()) {
                if (Math.abs(y - item.transform[5]) < Y_TOLERANCE) {
                    rawLines.get(y)!.push(item);
                    foundLine = true;
                    break;
                }
            }
            if (!foundLine) rawLines.set(item.transform[5], [item]);
        }

        const classifiedLines: ClassifiedLine[] = Array.from(rawLines.entries())
            .sort((a, b) => b[0] - a[0])
            .map(([y, items]) => {
                items.sort((a, b) => a.transform[4] - b.transform[4]);
                return { y, items, type: classifyLine(items) };
            });
        
        // Process lines page by page
        let pageText = '';
        const processedIndices = new Set<number>();

        for (let i = 0; i < classifiedLines.length; i++) {
            if (processedIndices.has(i)) continue;

            const currentLine = classifiedLines[i];
            const nextLine = classifiedLines[i + 1];

            const isPair = currentLine.type === 'CHORD' && nextLine?.type === 'LYRIC' && Math.abs(currentLine.y - nextLine.y) < 30;

            if (isPair) {
                // --- USER'S 2-PASS ALGORITHM IMPLEMENTATION ---

                // PASS 1: Extract coordinates
                const pass1_chords = currentLine.items.map(item => ({ text: item.str, x: item.transform[4] }));
                const pass1_lyricItems = nextLine.items;
                
                // PASS 2: Reconstruct
                let lyricString = '';
                const indexToXMap: number[] = [];
                let lastItemEndX = -Infinity;

                for (const item of pass1_lyricItems) {
                    const itemStartX = item.transform[4];
                    const avgCharWidthInItem = item.width / (item.str.length || 1);

                    // Add a space between words
                    if (lastItemEndX !== -Infinity && (itemStartX - lastItemEndX > avgCharWidthInItem * 0.4)) {
                        lyricString += ' ';
                        indexToXMap.push(lastItemEndX + (itemStartX - lastItemEndX) / 2);
                    }

                    for (let c = 0; c < item.str.length; c++) {
                        lyricString += item.str[c];
                        indexToXMap.push(itemStartX + c * avgCharWidthInItem);
                    }
                    lastItemEndX = itemStartX + item.width;
                }

                let chordLineChars = new Array(lyricString.length).fill(' ');
                
                let lyricStringCursor = 0;
                for (const chord of pass1_chords) {
                    while (indexToXMap[lyricStringCursor] < chord.x) {
                      lyricStringCursor++;
                      if (lyricStringCursor == indexToXMap.length) {
                        throw new Error(`Couldn't find placement for "${chord.text}"`);
                      }
                    }
                    
                    for (let j = 0; j < chord.text.length; j++) {
                        const targetIdx = closestCharIndex + j;
                        chordLineChars[targetIdx] = chord.text[j];
                    }
                }
                
                const chordLineString = chordLineChars.join('').trimEnd();
                pageText += chordLineString + '\n';
                pageText += lyricString + '\n';

                processedIndices.add(i);
                processedIndices.add(i + 1);

            } else {
                // Handle non-paired lines simply
                let lineText = '';
                let lastX = -Infinity;
                for (const item of currentLine.items) {
                     if(lastX !== -Infinity && (item.transform[4] - lastX > (item.width / (item.str.length || 1)))) {
                        lineText += ' ';
                    }
                    lineText += item.str;
                    lastX = item.transform[4] + item.width;
                }
                pageText += lineText + '\n';
                processedIndices.add(i);
            }
        }
        fullText += pageText + '\n';
    }
    return fullText.replace(/ \n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

// --- END OF PDF PARSING LOGIC ---

export const parseSongFromFile = async (file: File): Promise<{title: string, content: string}> => {
    let promptText: string;
    const parts: any[] = [];

    try {
        if (file.type.startsWith('image/')) {
            const imagePart = await fileToGenerativePart(file);
            promptText = "Extract the song title, lyrics, and chords from this image.";
            parts.push(imagePart, { text: promptText });
        } else if (file.type === 'application/pdf') {
            const text = await extractTextFromPdf(file);
            if (!text.trim()) {
                throw new Error("Could not extract any text from the PDF. It might be an image-only PDF.");
            }
            promptText = `Here is song content extracted from a PDF. Extract the song title and the chord sheet (lyrics and chords). Preserve the exact formatting and spacing of the chord sheet.\n\n${text}`;
            parts.push({ text: promptText });
        } else if (file.type.startsWith('text/')) {
            const text = await file.text();
            promptText = `Here is song content. Extract the song title and the chord sheet (lyrics and chords).\n\n${text}`;
            parts.push({ text: promptText });
        } else {
            throw new Error("Unsupported file type.");
        }
    } catch (e) {
        if (e instanceof Error) {
            console.error("Error during file processing:", e.message);
            throw new Error(`Could not read the file. Reason: ${e.message}`);
        }
        throw e;
    }


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: songSchema
            }
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error calling Gemini API:", e);
        throw new Error("AI could not process the song content. Please check the file format.");
    }
};