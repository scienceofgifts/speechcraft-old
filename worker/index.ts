import { GoogleGenAI, Type } from '@google/genai';

export interface Env {
  GEMINI_API_KEY: string;
}

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

function resolveApiModelId(requestedModel?: unknown): string {
  if (typeof requestedModel !== 'string' || !requestedModel.trim()) {
    return DEFAULT_MODEL;
  }

  const clean = requestedModel.trim().toLowerCase();

  // Accept explicit Gemini model IDs.
  if (/^gemini-[a-z0-9.-]+$/.test(clean)) {
    return clean;
  }

  // Map model names shown in the app's selector.
  if (clean.includes('3.8')) return 'gemini-3.8-flash';
  if (clean.includes('3.7')) return 'gemini-3.7-flash';
  if (clean.includes('3.6')) return 'gemini-3.6-flash';
  if (clean.includes('3.5') && clean.includes('lite')) {
    return 'gemini-3.5-flash-lite';
  }
  if (clean.includes('3.5') && clean.includes('pro')) {
    return 'gemini-3.5-pro';
  }
  if (clean.includes('3.5')) return 'gemini-3.5-flash';
  if (clean.includes('3.1')) return 'gemini-3.1-flash-lite';

  throw new Error(`Unsupported Gemini model selection: ${requestedModel}`);
}

function getErrorStatus(error: any): number {
  const candidate = Number(
    error?.status ?? error?.code ?? error?.response?.status
  );

  if (Number.isInteger(candidate) && candidate >= 400 && candidate <= 599) {
    return candidate;
  }

  const message = String(error?.message ?? error ?? '');
  const match = message.match(
    /\b(400|401|403|404|408|413|429|500|502|503|504)\b/
  );

  return match ? Number(match[1]) : 500;
}

function getErrorMessage(error: any): string {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown Gemini API error';
  }
}

function isRetryable(error: any): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    message.includes('temporarily unavailable') ||
    message.includes('high demand') ||
    message.includes('overloaded')
  );
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0],
  attempts = 3
): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      if (!isRetryable(error) || attempt >= attempts - 1) {
        throw error;
      }

      const delay =
        Math.min(1000 * 2 ** attempt, 4000) +
        Math.floor(Math.random() * 250);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function cleanBase64(value: string): string {
  const commaIndex = value.indexOf(',');
  return (
    commaIndex >= 0 ? value.slice(commaIndex + 1) : value
  ).trim();
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (!env.GEMINI_API_KEY) {
      return jsonResponse(
        {
          error:
            'GEMINI_API_KEY environment secret is not configured on this Cloudflare Worker.'
        },
        500,
        corsHeaders
      );
    }

    if (request.method !== 'POST') {
      return jsonResponse(
        { status: 'SpeechCraft Studio Cloudflare Worker API active' },
        200,
        corsHeaders
      );
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: 'Request body must be valid JSON.' },
        400,
        corsHeaders
      );
    }

    let model: string;

    try {
      model = resolveApiModelId(
        body.selectedGeminiModel ||
        body.selectedModel ||
        body.model
      );
    } catch (error: any) {
      return jsonResponse(
        { error: getErrorMessage(error) },
        400,
        corsHeaders
      );
    }

    const ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY
    });

    try {
      // Speech analysis
      if (path === '/api/analyze-speech') {
        const {
          audioBase64,
          mimeType = 'audio/webm',
          exerciseType = 'general',
          targetText = '',
          context = '',
          learnerGoals = [],
          targetAccent = 'General American English'
        } = body;

        if (
          typeof audioBase64 !== 'string' ||
          !audioBase64.trim()
        ) {
          return jsonResponse(
            { error: 'Missing audio data' },
            400,
            corsHeaders
          );
        }

        const response = await generateWithRetry(ai, {
          model,
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType:
                    String(mimeType).split(';')[0] ||
                    'audio/webm',
                  data: cleanBase64(audioBase64)
                }
              },
              {
                text: `Analyze this spoken audio.

Exercise Type: ${exerciseType}
Target Accent: ${targetAccent}
${targetText ? `Target Script: "${targetText}"` : ''}
${context ? `Context: ${context}` : ''}
${
  Array.isArray(learnerGoals) && learnerGoals.length
    ? `Learner Goals: ${learnerGoals.join(', ')}`
    : ''
}

Return strict JSON containing:
- transcript: verbatim transcript
- summary: concise assessment
- scores: overall, pronunciation, fluency, pacing, intonation (0-100)
- phonemeFeedback: array of objects with phoneme, status, comment
- actionableTips: array of strings

Analyze only what is audible. Do not invent speech.`
              }
            ]
          }],
          config: {
            systemInstruction:
              'You are an expert American English speech coach. Analyze only the supplied recording and return valid JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transcript: { type: Type.STRING },
                summary: { type: Type.STRING },
                scores: {
                  type: Type.OBJECT,
                  properties: {
                    overall: { type: Type.NUMBER },
                    pronunciation: { type: Type.NUMBER },
                    fluency: { type: Type.NUMBER },
                    pacing: { type: Type.NUMBER },
                    intonation: { type: Type.NUMBER }
                  },
                  required: [
                    'overall',
                    'pronunciation',
                    'fluency',
                    'pacing',
                    'intonation'
                  ]
                },
                phonemeFeedback: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phoneme: { type: Type.STRING },
                      status: { type: Type.STRING },
                      comment: { type: Type.STRING }
                    },
                    required: [
                      'phoneme',
                      'status',
                      'comment'
                    ]
                  }
                },
                actionableTips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: [
                'transcript',
                'summary',
                'scores',
                'phonemeFeedback',
                'actionableTips'
              ]
            }
          }
        });

        const rawText = response.text || '{}';

        try {
          return jsonResponse(
            JSON.parse(rawText),
            200,
            corsHeaders
          );
        } catch {
          return jsonResponse(
            {
              error: 'Gemini returned invalid JSON.',
              details: rawText
            },
            502,
            corsHeaders
          );
        }
      }

      // TTS is not implemented by ordinary text generation.
      if (path === '/api/tts-reference') {
        const { text } = body;

        if (typeof text !== 'string' || !text.trim()) {
          return jsonResponse(
            { error: 'Missing text' },
            400,
            corsHeaders
          );
        }

        return jsonResponse(
          {
            fallback: true,
            message:
              'Text-to-speech audio generation is not configured on this Worker.'
          },
          501,
          corsHeaders
        );
      }

      // Conversation practice
      if (path === '/api/conversation-reply') {
        const { messages, scenario, persona } = body;

        const promptText = `You are an American English conversation partner and speaking coach.

Scenario: ${scenario?.title || 'Casual'}
Scenario details: ${
  scenario?.prompt || scenario?.description || ''
}
Persona: ${persona?.name || 'Partner'}

Conversation so far:
${JSON.stringify(Array.isArray(messages) ? messages : [])}

Return JSON with:
- reply: a natural conversational response
- coachingFeedback: an array of concise feedback strings
- suggestedNextQuestion: a question that continues the conversation.`;

        const response = await generateWithRetry(ai, {
          model,
          contents: [{
            role: 'user',
            parts: [{ text: promptText }]
          }],
          config: {
            systemInstruction:
              'Be a natural American English conversation partner. Return valid JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING },
                coachingFeedback: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                suggestedNextQuestion: {
                  type: Type.STRING
                }
              },
              required: [
                'reply',
                'coachingFeedback',
                'suggestedNextQuestion'
              ]
            }
          }
        });

        const rawText = response.text || '{}';

        try {
          return jsonResponse(
            JSON.parse(rawText),
            200,
            corsHeaders
          );
        } catch {
          return jsonResponse(
            {
              error: 'Gemini returned invalid JSON.',
              details: rawText
            },
            502,
            corsHeaders
          );
        }
      }

      // AI lesson and enrichment endpoints
      const supportedPaths = new Set([
        '/api/generate-vocab-lesson',
        '/api/generate-root-enrichment',
        '/api/generate-family-enrichment',
        '/api/generate-compliment-collection',
        '/api/generate-curriculum-lessons',
        '/api/analyze-conversation-patterns'
      ]);

      if (supportedPaths.has(path)) {
        const promptText =
          typeof body.prompt === 'string' &&
          body.prompt.trim()
            ? body.prompt
            : `Generate the requested structured response for endpoint ${path} using this request data:\n${JSON.stringify(body)}`;

        const response = await generateWithRetry(ai, {
          model,
          contents: [{
            role: 'user',
            parts: [{ text: promptText }]
          }],
          config: {
            systemInstruction:
              'Follow the request carefully. Return valid JSON only, without Markdown fences.',
            responseMimeType: 'application/json'
          }
        });

        const rawText = response.text || '{}';

        try {
          return jsonResponse(
            JSON.parse(rawText),
            200,
            corsHeaders
          );
        } catch {
          return jsonResponse(
            {
              error: 'Gemini returned invalid JSON.',
              details: rawText
            },
            502,
            corsHeaders
          );
        }
      }

      return jsonResponse(
        { error: `Not Found: ${path}` },
        404,
        corsHeaders
      );
    } catch (error: any) {
      const status = getErrorStatus(error);
      const message = getErrorMessage(error);

      console.error('[SPEECHCRAFT GEMINI ERROR]', {
        path,
        model,
        status,
        message
      });

      return jsonResponse(
        {
          error: message,
          status,
          model
        },
        status,
        corsHeaders
      );
    }
  }
};