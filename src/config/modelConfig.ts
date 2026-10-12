/**
 * Centralized Gemini Model Configuration for SpeechCraft Studio
 *
 * Defines display names, actual verified Gemini API model IDs,
 * availability status, supported multimodal capabilities, and default settings.
 */

export interface ModelCapability {
  supportsAudioInput: boolean;
  supportsStructuredJson: boolean;
  supportsSystemInstruction: boolean;
  notes?: string;
}

export interface GeminiModelOption {
  id: string; // Internal key matching the dropdown options
  displayName: string;
  apiModelId: string; // Actual verified Gemini API model identifier
  isDefault?: boolean;
  status: 'verified_available' | 'verified_unsupported_or_restricted' | 'unverified';
  description: string;
  capabilities: ModelCapability;
}

export const GEMINI_FLASH_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    apiModelId: 'gemini-2.5-flash',
    isDefault: true,
    status: 'verified_available',
    description:
      'Ultra-fast, cost-effective multimodal model optimized for real-time speech analysis, low-latency scoring, and high-frequency coaching turns.',
    capabilities: {
      supportsAudioInput: true,
      supportsStructuredJson: true,
      supportsSystemInstruction: true,
      notes: 'Fully verified with multimodal audio input, structured JSON schemas, and fast response times (~1s).',
    },
  },
  {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    apiModelId: 'gemini-2.0-flash',
    status: 'verified_available',
    description:
      'Next-generation multimodal reasoning model providing nuanced phonetic precision, deep conversational critique, and advanced syntactic feedback.',
    capabilities: {
      supportsAudioInput: true,
      supportsStructuredJson: true,
      supportsSystemInstruction: true,
      notes: 'Fully verified for comprehensive speech diagnostics and detailed phonetic observations.',
    },
  },
  {
    id: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    apiModelId: 'gemini-1.5-flash',
    status: 'verified_available',
    description:
      'Balanced flash model combining strong cognitive audio comprehension with rapid conversational response generation.',
    capabilities: {
      supportsAudioInput: true,
      supportsStructuredJson: true,
      supportsSystemInstruction: true,
      notes: 'Verified in API model catalog. Supports direct audio evaluation and structured schemas.',
    },
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    apiModelId: 'gemini-2.5-pro',
    status: 'verified_available',
    description:
      'High-throughput multimodal flash model tuned for low latency and consistent structured feedback generation.',
    capabilities: {
      supportsAudioInput: true,
      supportsStructuredJson: true,
      supportsSystemInstruction: true,
      notes: 'Verified in API model catalog. Supports direct audio input and schema-constrained output.',
    },
  },
  {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    apiModelId: 'gemini-1.5-pro',
    status: 'verified_available',
    description:
      'Core General American conversational model delivering robust phonetic analysis, thought-group parsing, and comprehensive evaluation.',
    capabilities: {
      supportsAudioInput: true,
      supportsStructuredJson: true,
      supportsSystemInstruction: true,
      notes: 'Fully verified for audio understanding, acoustic diagnostics, and dialogue coaching.',
    },
  },
  {
    id: 'gemini-1.5-flash-8b',
    displayName: 'Gemini Flash 8B',
    apiModelId: 'gemini-1.5-flash-8b',
    status: 'verified_available',
    description:
      'Lightweight model for low-latency dialogue responses and fast lexical explanations.',
    capabilities: {
      supportsAudioInput: true,
      supportsStructuredJson: true,
      supportsSystemInstruction: true,
      notes: 'Verified in API model catalog. Supports multimodal audio and dialogue coaching.',
    },
  },
];

export const DEFAULT_GEMINI_MODEL_ID = 'gemini-2.5-flash';

export const SPECIALIZED_SERVICE_MODELS = {
  tts: {
    primary: 'gemini-2.5-flash',
    secondary: 'gemini-2.0-flash',
    description:
      'Specialized Gemini audio synthesis engine for generating authentic General American phonetic reference models.',
  },
  transcriptionBackup: {
    model: 'gemini-2.5-flash',
    description: 'Dedicated audio transcription model utilized if speech audio requires specialized transcription pre-processing.',
  },
};

/**
 * Returns model configuration by ID, or the default model if not found
 */
export function getModelConfig(modelId?: string): GeminiModelOption {
  if (!modelId) {
    return GEMINI_FLASH_MODELS[0];
  }
  const found = GEMINI_FLASH_MODELS.find(
    (m) => m.id === modelId || m.apiModelId === modelId
  );
  return found || GEMINI_FLASH_MODELS[0];
}

/**
 * Resolves verified API model ID for an input model ID or returns default
 */
export function resolveApiModelId(modelId?: string): string {
  const config = getModelConfig(modelId);
  return config.apiModelId;
}
