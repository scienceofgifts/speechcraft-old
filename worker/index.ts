import { GoogleGenAI, Type } from '@google/genai';

export interface Env {
  GEMINI_API_KEY: string;
}

function resolveApiModelId(requestedModel?: string): string {
  if (!requestedModel) return 'gemini-3.5-flash-lite';
  const clean = requestedModel.toLowerCase();
  if (clean.includes('3.8')) return 'gemini-3.8-flash';
  if (clean.includes('3.7')) return 'gemini-3.7-flash';
  if (clean.includes('3.6')) return 'gemini-3.6-flash';
  if (clean.includes('3.5') && clean.includes('pro')) return 'gemini-3.5-pro';
  if (clean.includes('3.5')) return 'gemini-3.5-flash';
  if (clean.includes('3.1')) return 'gemini-3.1-flash-lite';
  return 'gemini-3.5-flash-lite';
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY environment secret is not configured on Cloudflare Worker.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    try {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ status: 'SpeechCraft Studio Cloudflare Worker API active' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body: any = await request.json().catch(() => ({}));
      const modelName = resolveApiModelId(body.selectedGeminiModel || body.selectedModel || body.model);

      if (path === '/api/analyze-speech') {
        const { audioBase64, mimeType = 'audio/webm', exerciseType = 'general', targetText = '', context = '', learnerGoals = [], targetAccent = 'General American English' } = body;
        
        if (!audioBase64) {
          return new Response(JSON.stringify({ error: 'Missing audio data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const commaIndex = audioBase64.indexOf(',');
        const cleanBase64 = commaIndex !== -1 ? audioBase64.substring(commaIndex + 1).trim() : audioBase64.trim();
        const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();

        const prompt = `Analyze this spoken audio.
Exercise Type: ${exerciseType}
Target Accent: ${targetAccent}
${targetText ? `Target Text/Script: "${targetText}"` : ''}
${context ? `Context: ${context}` : ''}
${learnerGoals?.length ? `Goals: ${learnerGoals.join(', ')}` : ''}
Provide verbatim transcript, breakdown of metrics (estimatedWpm, fillerCount, detectedFillers, clarityScore, pronunciationScore, pacingScore, fluencyScore), thought groups, and actionable feedback.`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: cleanMime, data: cleanBase64 } },
                { text: prompt }
              ]
            }
          ],
          config: {
            systemInstruction: 'You are an expert American speech coach and linguist. Return strict structured JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transcript: { type: Type.STRING },
                summary: { type: Type.STRING },
                metrics: {
                  type: Type.OBJECT,
                  properties: {
                    estimatedWpm: { type: Type.NUMBER },
                    fillerCount: { type: Type.INTEGER },
                    detectedFillers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    clarityScore: { type: Type.NUMBER },
                    pronunciationScore: { type: Type.NUMBER },
                    pacingScore: { type: Type.NUMBER },
                    fluencyScore: { type: Type.NUMBER },
                  },
                  required: ['estimatedWpm', 'fillerCount', 'clarityScore', 'pronunciationScore', 'pacingScore', 'fluencyScore']
                },
                thoughtGroups: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      pacing: { type: Type.STRING },
                      stressNotes: { type: Type.STRING }
                    },
                    required: ['text', 'pacing', 'stressNotes']
                  }
                },
                actionableFeedback: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      observation: { type: Type.STRING },
                      remedy: { type: Type.STRING }
                    },
                    required: ['category', 'observation', 'remedy']
                  }
                }
              },
              required: ['transcript', 'summary', 'metrics', 'thoughtGroups', 'actionableFeedback']
            }
          }
        });

        const textOutput = response.text || '{}';
        const parsed = JSON.parse(textOutput);
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/tts-reference') {
        return new Response(JSON.stringify({ fallback: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/conversation-reply') {
        const { scenarioTitle, scenarioPrompt, conversationHistory = [], latestUserTranscript, mode = 'roleplay', toneStyle, flirtationLevel, partnerGender, practiceObjective } = body;
        
        const prompt = `You are an interactive conversational partner and speaking coach in SpeechCraft Studio.
Scenario: ${scenarioTitle} - ${scenarioPrompt}
Mode: ${mode}
${practiceObjective ? `Objective: ${practiceObjective}` : ''}
${partnerGender ? `Partner Persona Gender: ${partnerGender}` : ''}
${toneStyle ? `Tone/Style: ${toneStyle}` : ''}
${flirtationLevel ? `Flirtation Level: ${flirtationLevel}` : ''}

Conversation History:
${conversationHistory.map((h: any) => `${h.role}: ${h.text}`).join('\n')}
${latestUserTranscript ? `user: ${latestUserTranscript}` : ''}

Respond with coachResponseText (natural conversational reply), learnerTranscript, coachingFeedback (array of strings), and suggestedNextQuestion.`;

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: 'You are an engaging American English conversation partner. Return JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                learnerTranscript: { type: Type.STRING },
                coachingFeedback: { type: Type.ARRAY, items: { type: Type.STRING } },
                coachResponseText: { type: Type.STRING },
                suggestedNextQuestion: { type: Type.STRING }
              },
              required: ['learnerTranscript', 'coachingFeedback', 'coachResponseText', 'suggestedNextQuestion']
            }
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/generate-vocab-lesson') {
        const { word, definition, partOfSpeech, difficulty } = body;
        const prompt = `Generate a comprehensive American English vocabulary lesson for the word "${word}" (${partOfSpeech}): "${definition}". Difficulty: ${difficulty}.`;
        
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: 'You are an expert vocabulary and idioms instructor. Return JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                definition: { type: Type.STRING },
                nuanceAndUsage: { type: Type.STRING },
                americanPronunciationTip: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                collocations: { type: Type.ARRAY, items: { type: Type.STRING } },
                synonymsAndContrasts: { type: Type.ARRAY, items: { type: Type.STRING } },
                practicePrompt: { type: Type.STRING }
              },
              required: ['word', 'phonetic', 'partOfSpeech', 'definition', 'nuanceAndUsage', 'examples']
            }
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generic handler for remaining endpoints
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: `Generate structured JSON response for endpoint ${path} with body: ${JSON.stringify(body)}` }] }],
        config: {
          systemInstruction: 'You are an AI speech training assistant. Return valid JSON.',
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message || 'Worker processing error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
};
