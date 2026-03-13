/**
 * ElevenLabs Text-to-Speech Integration
 * Usa ElevenLabs API para converter texto em áudio
 */

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export interface ElevenLabsTTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  outputFormat?: 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_22050' | 'ulaw_8000';
}

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

export class ElevenLabsService {
  private apiKey: string;
  private defaultVoiceId: string;
  private defaultModelId: string;
  private defaultStability: number;
  private defaultSimilarityBoost: number;

  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey;
    this.defaultVoiceId = config.voiceId || DEFAULT_VOICE_ID;
    this.defaultModelId = config.modelId || DEFAULT_MODEL_ID;
    this.defaultStability = config.stability ?? 0.5;
    this.defaultSimilarityBoost = config.similarityBoost ?? 0.75;
  }

  private get headers() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Valida as credenciais consultando o endpoint /user
   */
  async validate(): Promise<{ valid: boolean; error?: string; info?: unknown }> {
    try {
      const response = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
        headers: { 'xi-api-key': this.apiKey },
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `API Key inválida ou sem permissão (status ${response.status})`,
        };
      }

      const data = await response.json();
      return {
        valid: true,
        info: {
          subscription: (data as Record<string, unknown>).subscription,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: `Erro ao conectar com ElevenLabs: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Lista todas as vozes disponíveis (pré-definidas + clonadas)
   */
  async listVoices(): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Erro ao listar vozes: ${response.status}`);
    }

    const data = await response.json() as { voices: ElevenLabsVoice[] };
    return data.voices;
  }

  /**
   * Converte texto em áudio (retorna ArrayBuffer)
   */
  async textToSpeech(options: ElevenLabsTTSOptions): Promise<ArrayBuffer> {
    const voiceId = options.voiceId || this.defaultVoiceId;
    const outputFormat = options.outputFormat || 'mp3_44100_128';

    const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}?output_format=${outputFormat}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId || this.defaultModelId,
        voice_settings: {
          stability: options.stability ?? this.defaultStability,
          similarity_boost: options.similarityBoost ?? this.defaultSimilarityBoost,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao gerar áudio: ${response.status} - ${error}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Converte texto em áudio e retorna como base64
   */
  async textToSpeechBase64(options: ElevenLabsTTSOptions): Promise<string> {
    const buffer = await this.textToSpeech(options);
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export function createElevenLabsService(
  credentials: Record<string, unknown>
): ElevenLabsService | null {
  const apiKey = credentials.apiKey as string | undefined;
  if (!apiKey) return null;

  return new ElevenLabsService({
    apiKey,
    voiceId: credentials.voiceId as string | undefined,
    modelId: credentials.modelId as string | undefined,
    stability: credentials.stability as number | undefined,
    similarityBoost: credentials.similarityBoost as number | undefined,
  });
}
