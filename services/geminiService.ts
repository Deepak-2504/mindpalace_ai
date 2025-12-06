import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MindMapNode, Room, PalaceObject } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

// Helper to ensure clean JSON string
function cleanJson(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  // Remove markdown code blocks if present (case insensitive)
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  return cleaned;
}

// Helper to add WAV header to raw PCM data
function addWavHeader(samples: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length, true);

  // Write samples
  const samplesData = new Uint8Array(buffer, 44);
  samplesData.set(samples);

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// --- Mind Map Generation ---

const mindMapSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    root: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        label: { type: Type.STRING },
        description: { type: Type.STRING },
        children: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              children: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const generateMindMapFromText = async (topic: string): Promise<MindMapNode> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `You are an expert educator and memory champion.
      
      Task: Create a comprehensive, hierarchical mind map for the topic: "${topic}".
      
      Instructions:
      1. Use your internal knowledge to break down this topic into its most important constituent parts.
      2. The "root" should be the main topic itself.
      3. First-level children should be the major categories or pillars of this topic. **Limit to maximum 5 major categories.**
      4. Second-level children should be specific details, facts, or concepts. **Limit to maximum 5 details per category.**
      5. Limit structure to strictly 3 levels of depth (Root -> Categories -> Details).
      6. Provide brief, clear descriptions for each node.
      
      Return the result as a structured JSON object according to the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: mindMapSchema,
        systemInstruction: "You are an expert educator creating structured learning diagrams.",
        maxOutputTokens: 4000,
      }
    });

    const cleanText = cleanJson(response.text || "{}");
    const data = JSON.parse(cleanText);
    return data.root;
  } catch (error) {
    console.error("Mind Map Generation Error:", error);
    throw new Error("Failed to generate mind map.");
  }
};

// --- Room Generation ---

const roomSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    theme: { type: Type.STRING, description: "Visual theme of the room" },
    description: { type: Type.STRING, description: "A concise, sensory description of the room layout (30-50 words)." },
    objects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          conceptDefinition: { type: Type.STRING, description: "A concise educational definition (1 sentence)." },
          description: { type: Type.STRING, description: "A unique, vivid visual mnemonic object (1 sentence)." }
        }
      }
    }
  }
};

export const generateRoomDetails = async (node: MindMapNode): Promise<Partial<Room>> => {
  try {
    // Safety: Limit the number of subtopics sent to the prompt to prevent massive outputs
    const children = node.children || [];
    // Reduced from 8 to 5 to prevent token overflow and loops
    const limitedChildren = children.slice(0, 5); 
    const subtopics = limitedChildren.map(c => c.label).join(", ") || "General Concept";
    
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Create a Memory Palace Room for the topic: "${node.label}".
      Subtopics to be placed as objects in the room: ${subtopics}.
      
      Requirements:
      1. Define a coherent visual theme.
      2. Provide a concise description of the room.
      3. For each subtopic, provide:
         a) "conceptDefinition": Educational meaning.
         b) "description": A vivid visual object cue.
      
      Keep descriptions brief and effective. Do not write paragraphs.
      
      Example:
      Object Name: "Chloroplast"
      Concept Definition: "Organelle where photosynthesis occurs."
      Visual Description: "A glowing green solar-panel factory."
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: roomSchema,
        maxOutputTokens: 2000, // Enforce stricter limit to prevent loops
      }
    });

    const cleanText = cleanJson(response.text || "{}");
    const data = JSON.parse(cleanText);
    
    // Transform to our app's Object shape
    const objects: PalaceObject[] = (data.objects || []).map((obj: any, index: number) => ({
      id: `obj-${Date.now()}-${index}`,
      name: obj.name,
      conceptDefinition: obj.conceptDefinition,
      description: obj.description,
      position: { x: 20 + (index * 15) % 60, y: 30 + (index * 10) % 50 } // Basic automatic layout
    }));

    return {
      title: data.title || node.label,
      theme: data.theme || "Memory Space",
      description: data.description || "A space dedicated to remembering this topic.",
      objects: objects,
      videoPlaceholderUrl: `https://picsum.photos/seed/${node.id}/800/450`
    };

  } catch (error) {
    console.error("Room Generation Error:", error);
    // Fallback instead of failing
    return {
      title: node.label,
      theme: "Constructed Space",
      description: "A mental space being formed for this concept.",
      objects: [],
      videoPlaceholderUrl: "https://picsum.photos/800/450"
    };
  }
};

// --- Audio/Video Explanation Generation ---

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: `Explain this vividly and engagingly: ${text}`,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    // The audio bytes are in base64 in the inlineData
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      // Decode Base64 to binary
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Add WAV header (required for browser playback of raw PCM)
      // Gemini 2.5 Flash TTS typically outputs 24kHz mono PCM 16-bit
      const wavBuffer = addWavHeader(bytes, 24000, 1);
      
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
    
    return null;
  } catch (error) {
    console.error("Speech Generation Error:", error);
    return null;
  }
};
