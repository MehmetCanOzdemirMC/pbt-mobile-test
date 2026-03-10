/**
 * Gemini AI Search Integration for React Native
 * Natural language search parsing for diamond marketplace
 * Supports Turkish, English, and 6 other languages
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

// Get API key from environment variables
// Set in .env file as EXPO_PUBLIC_GEMINI_API_KEY
const GEMINI_API_KEY =
  Constants.expoConfig?.extra?.geminiApiKey ||
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

interface GeminiFilters {
  carat?: number | null;
  caratMin?: number | null;
  caratMax?: number | null;
  quantity?: number | null;
  shape?: string | null;
  color?: string | null;
  clarity?: string | null;
  cut?: string | null;
  lab?: string | null;
  fluorescence?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  intent?: string | null;
  originalQuery: string;
}

interface Diamond {
  carat: number;
  shape?: string;
  color?: string;
  clarity?: string;
  cut?: string;
  lab?: string;
  fluorescence?: string;
  totalPrice?: number;
  price?: number;
  [key: string]: any;
}

// Initialize Gemini
const initializeGemini = () => {
  if (!genAI && GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash', // Latest Gemini 2.5 (June 2025)
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent parsing
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      });
      console.log('✅ Gemini AI initialized');
    } catch (error) {
      console.error('❌ Gemini initialization error:', error);
    }
  }
};

/**
 * Parse natural language search query using Gemini AI
 * @param query - User search query (multilingual)
 * @returns Parsed filter parameters
 */
export const parseSearchWithGemini = async (
  query: string
): Promise<GeminiFilters | null> => {
  if (!query || query.trim().length === 0) {
    return null;
  }

  // Initialize if not already done
  if (!model) {
    initializeGemini();
  }

  // If API key not configured, return null (fallback to regex search)
  if (!model || !GEMINI_API_KEY) {
    console.log('⚠️ Gemini API key not configured, using fallback search');
    return null;
  }

  try {
    const prompt = `You are a diamond search query parser for an e-commerce marketplace.
Parse the following search query and extract diamond search parameters.

QUERY: "${query}"

Extract these parameters if mentioned:
- carat: number or range (e.g., 2, 1.5, 0.5-1)
- quantity/limit: number of stones requested (e.g., "5 adet", "10 tane", "5 pieces")
- shape: diamond shape (e.g., Round, Oval, Princess, Cushion, Emerald, Pear)
- color: diamond color grade (D, E, F, G, H, I, J, K, L, M, etc.)
- clarity: clarity grade (FL, IF, VVS1, VVS2, VS1, VS2, SI1, SI2, SI3, I1, I2, I3)
- cut: cut grade (Excellent, Very Good, Good, Fair, Poor, or EX, VG, G, F, P)
- lab: certification lab (GIA, IGI, HRD, AGS, etc.)
- fluorescence: fluorescence level (None, Faint, Medium, Strong, Very Strong)
- priceRange: price range in USD (e.g., "1000-5000", "under 2000", "max 3000")
- intent: what user wants (e.g., "buy", "view", "compare", "find")

MULTILINGUAL SUPPORT (Turkish, English, Arabic, Chinese, Spanish, French, Russian, Italian):

TURKISH KEYWORDS:
- "adet", "tane", "parça" = quantity
- "ct", "karat" = carat weight
- "taş", "elmas", "pırlanta" = diamond
- "lazım", "istiyorum", "arıyorum", "gerekiyor" = intent to buy/find

ENGLISH KEYWORDS:
- "piece", "pieces", "stones" = quantity
- "ct", "carat", "carats" = carat weight
- "diamond", "stone", "gem" = diamond
- "need", "want", "looking for", "searching", "find" = intent to buy/find

RESPONSE FORMAT (JSON):
{
  "carat": number or null,
  "caratMin": number or null,
  "caratMax": number or null,
  "quantity": number or null,
  "shape": string or null,
  "color": string or null,
  "clarity": string or null,
  "cut": string or null,
  "lab": string or null,
  "fluorescence": string or null,
  "priceMin": number or null,
  "priceMax": number or null,
  "intent": string or null,
  "originalQuery": "${query}"
}

PARSING RULES:
1. Return null for parameters not mentioned in query
2. For carat ranges like "0.5-1", set caratMin=0.5, caratMax=1
3. For exact carat like "2 ct", set carat=2
4. Translate numbers from any language to digits
5. Normalize clarity: "VVS" → "VVS1", "VS" → "VS1", "SI" → "SI1"
6. Normalize cut: Accept abbreviations (EX=Excellent, VG=Very Good, G=Good)
7. If query is just an ID or certificate number, return null
8. Detect language automatically - user can mix languages in same query

EXAMPLES:
- "2 ct 5 adet taş lazım" → {carat: 2, quantity: 5}
- "I need 3 pieces around 1.5ct D color" → {carat: 1.5, quantity: 3, color: "D"}
- "oval şekil büyük taşlar" → {shape: "Oval"}

Parse the query now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const parsed: GeminiFilters = JSON.parse(text);
    console.log('🤖 Gemini parsed:', parsed);

    return parsed;
  } catch (error) {
    console.error('❌ Gemini parsing error:', error);
    return null; // Fallback to regex search
  }
};

/**
 * Apply Gemini-parsed filters to diamond list
 * @param diamonds - Array of diamond objects
 * @param filters - Parsed filters from Gemini
 * @returns Filtered diamonds
 */
export const applyGeminiFilters = (
  diamonds: Diamond[],
  filters: GeminiFilters | null
): Diamond[] => {
  if (!filters) return diamonds;

  let result = [...diamonds];

  // Carat filters
  if (filters.carat !== null && filters.carat !== undefined) {
    const target = filters.carat;
    // Match exact or very close (within 0.01)
    result = result.filter((d) => Math.abs(d.carat - target) < 0.01);
  }
  if (filters.caratMin !== null && filters.caratMin !== undefined) {
    result = result.filter((d) => d.carat >= filters.caratMin!);
  }
  if (filters.caratMax !== null && filters.caratMax !== undefined) {
    result = result.filter((d) => d.carat <= filters.caratMax!);
  }

  // Shape
  if (filters.shape) {
    result = result.filter(
      (d) => d.shape && d.shape.toLowerCase() === filters.shape!.toLowerCase()
    );
  }

  // Color
  if (filters.color) {
    result = result.filter(
      (d) => d.color && d.color.toUpperCase() === filters.color!.toUpperCase()
    );
  }

  // Clarity
  if (filters.clarity) {
    result = result.filter(
      (d) =>
        d.clarity && d.clarity.toUpperCase() === filters.clarity!.toUpperCase()
    );
  }

  // Cut
  if (filters.cut) {
    const cutNormalized = filters.cut.toLowerCase();
    result = result.filter((d) => {
      if (!d.cut) return false;
      const dCut = d.cut.toLowerCase();
      // Handle abbreviations: EX = Excellent, VG = Very Good, etc.
      if (cutNormalized === 'ex' || cutNormalized === 'excellent') {
        return dCut === 'ex' || dCut === 'excellent';
      }
      if (cutNormalized === 'vg' || cutNormalized === 'very good') {
        return dCut === 'vg' || dCut === 'very good';
      }
      return dCut === cutNormalized;
    });
  }

  // Lab
  if (filters.lab) {
    result = result.filter(
      (d) => d.lab && d.lab.toUpperCase() === filters.lab!.toUpperCase()
    );
  }

  // Fluorescence
  if (filters.fluorescence) {
    result = result.filter(
      (d) =>
        d.fluorescence &&
        d.fluorescence.toLowerCase() === filters.fluorescence!.toLowerCase()
    );
  }

  // Price range
  if (filters.priceMin !== null && filters.priceMin !== undefined) {
    result = result.filter(
      (d) => (d.totalPrice || d.price || 0) >= filters.priceMin!
    );
  }
  if (filters.priceMax !== null && filters.priceMax !== undefined) {
    result = result.filter(
      (d) => (d.totalPrice || d.price || 0) <= filters.priceMax!
    );
  }

  // Quantity limit (return only first N results)
  if (filters.quantity && filters.quantity > 0) {
    result = result.slice(0, filters.quantity);
  }

  return result;
};

/**
 * Check if Gemini API is configured
 * @returns boolean
 */
export const isGeminiConfigured = (): boolean => {
  return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
};

/**
 * Get Gemini API status message
 * @returns string
 */
export const getGeminiStatus = (): string => {
  if (!isGeminiConfigured()) {
    return '⚠️ Gemini API not configured. Using fallback regex search.';
  }
  return '✅ Gemini AI Search active';
};

// Initialize on module load
initializeGemini();

export default {
  parseSearchWithGemini,
  applyGeminiFilters,
  isGeminiConfigured,
  getGeminiStatus,
};
