import { GoogleGenAI, Type } from "@google/genai";
import { ChordDiagramData } from '../types';

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

type SearchSuccess = { status: 'SUCCESS'; pageTitle: string; htmlContent: string; sourceUrl: string; };
type SearchNotFound = { status: 'NOT_FOUND' };
type SearchResult = SearchSuccess | SearchNotFound;


export const searchSongOnPreferredSites = async (query: string, selectedSite: string): Promise<SearchResult> => {

    const prompt = `
You are an expert musical assistant scraping a specific guitar chord website. Your task is to act like a machine, not a helpful assistant.

- The user wants the chords for the song: "${query}".
- You ABSOLUTELY MUST search for the song ONLY on this website: "${selectedSite}". Do not search any other websites.
- If you find a suitable chords/tabs page for the song on "${selectedSite}":
    1. Analyze its HTML. Locate the main song content, which is usually in a <pre> tag.
    2. Build a minimal HTML code by copying the <pre> section into its <body> element, and writing the computed CSS definitions referred to in the <pre> element and its children into the <head> element.
    3. Return a JSON object with the following structure:
       {
         "status": "SUCCESS",
         "pageTitle": "The title of the HTML page",
         "htmlContent": "The self-contained HTML you built",
         "sourceUrl": "The exact URL of the page you used"
       }
- If you CANNOT find the song on "${selectedSite}", or if the page doesn't contain a usable <pre> tag with chords:
    1. Return a JSON object with the following structure:
       {
         "status": "NOT_FOUND"
       }

Your output MUST BE ONLY the JSON object.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
        },
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }

    return JSON.parse(jsonText);
};


export const extractSongFromHtml = async (pageTitle: string, htmlContent: string, sourceUrl: string): Promise<{ title: string; content: string; }> => {

    const extractionSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Formatted title: 'Artist - Song Title'" },
            content: { type: Type.STRING, description: "The plain text content of the song." },
        },
        required: ["title", "content"],
    };
    
    const prompt = `
You are a content extraction agent. You will receive a page title and some HTML content. Your tasks are:
1.  Consider the page title "${pageTitle}" for URL "${sourceUrl}". Knowing that the page had the chords for a song, identify the artist and song name in the page title. Format it as "Artist - Song Title". If you're able to identify two separate names but can't determine which one is the name of the artist and which one is the name of the song, simply provide them with the same " - " separator.
2.  Analyze the provided HTML content. Convert it into a single block of plain text.
3.  CRITICAL: Whitespace, spacing, and line breaks are extremely important for formatting chords over lyrics. You MUST preserve the original visual layout of the text content from the HTML exactly as it is. Do not add, remove, or collapse any whitespace or newlines.

Here is the HTML content:
\`\`\`html
${htmlContent}
\`\`\`
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: extractionSchema,
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
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

export const parseSongFromFile = async (file: File): Promise<{title: string, content: string}> => {
    let promptText: string;
    const parts: any[] = [];

    if (file.type.startsWith('image/')) {
        const imagePart = await fileToGenerativePart(file);
        promptText = "Extract the song title, lyrics, and chords from this image.";
        parts.push(imagePart, { text: promptText });
    } else if (file.type === 'application/pdf' || file.type === 'text/plain') {
        const text = await file.text();
        promptText = `Here is song content. Extract the song title and the chord sheet (lyrics and chords).\n\n${text}`;
        parts.push({ text: promptText });
    } else {
        throw new Error("Unsupported file type.");
    }

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
};