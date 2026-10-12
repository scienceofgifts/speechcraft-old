/**
 * Centralized Gemini Model Configuration for SpeechCraft Studio.
 * Keep these IDs aligned with Google's current Gemini API model catalogue.
 */

export interface ModelCapability {
  supportsAudioInput: boolean;
  supportsStructuredJson: boolean;
  supportsSystemInstruction: boolean;
  notes?: string;
}

export interface GeminiModelOption {
  id: string;
  displayName: string;
  apiModelId: string;
  isDefault?: boolean;
  status: 'verified_available' | 'verified_unsupported_or_restricted' | 'unverified';
  description: string;
  capabilities: ModelCapability;
}

const standardCapabilities: ModelCapability = {
  supportsAudioInput: true,
  supportsStructuredJson: true,
  supportsSystemInstruction: true,
  notes: 'Model ID is listed in the current Gemini API model catalogue. Check project/API access if a request is rejected.',
};

export const GEMINI_FLASH_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash-Lite',
    apiModelId: 'gemini-3.5-flash-lite',
    isDefault: true,
    status: 'verified_available',
    description: 'Fast, cost-effective model for frequent speech coaching turns and structured feedback.',
    capabilities: { ...standardCapabilities },
  },
  {
    id: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    apiModelId: 'gemini-3.8-flash',
    status: 'verified_available',
    description: 'Current flagship Flash model for stronger reasoning, detailed speech analysis, and complex coaching tasks.',
    capabilities: { ...standardCapabilities },
  },
  {
    id: 'gemini-3.6-flash',
    displayName: 'Gemini 3.6 Flash',
    apiModelId: 'gemini-3.6-flash',
    status: 'verified_available',
    description: 'Multimodal general-purpose model balancing speed and capability for speech analysis and conversation.',
    capabilities: { ...standardCapabilities },
  },
  {
    id: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash-Lite',
    apiModelId: 'gemini-3.1-flash-lite',
    status: 'verified_available',
    description: 'Lightweight, cost-efficient model for high-volume routine coaching and feedback.',
    capabilities: { ...standardCapabilities },
  },
];

export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.5-flash-lite';

export const SPECIALIZED_SERVICE_MODELS = {
  tts: {
    primary: 'gemini-3.8-flash-lite-tts',
    secondary: 'gemini-3.8-flash-tts',
    description: 'Dedicated Gemini text-to-speech models for reference audio generation.',
  },
  transcriptionBackup: {
    model: 'gemini-3.8-flash',
    description: 'Current general-purpose Gemini model used for transcription-related fallback tasks.',
  },
};

/** Returns model configuration by ID, or the current default for stale/unknown saved IDs. */
export function getModelConfig(modelId?: string): GeminiModelOption {
  if (!modelId) return GEMINI_FLASH_MODELS[0];
  const found = GEMINI_FLASH_MODELS.find((model) => model.id === modelId || model.apiModelId === modelId);
  return found || GEMINI_FLASH_MODELS[0];
}

/** Resolves an allowed model ID. Stale saved IDs safely fall back to the current default. */
export function resolveApiModelId(modelId?: string): string {
  return getModelConfig(modelId).apiModelId;
}
