/**
 * Threads API Integration (Meta)
 * Publica posts em texto e imagem via Threads Graph API
 */

const THREADS_BASE = 'https://graph.threads.net/v1.0';
const THREADS_AUTH_URL = 'https://threads.net/oauth/authorize';
const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';
const THREADS_LONG_TOKEN_URL = 'https://graph.threads.net/access_token';

// ─── Types ────────────────────────────────────────────────

export interface ThreadsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface ThreadsUserProfile {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
  followers_count?: number;
}

export interface ThreadsPublishResult {
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

export type ThreadsMediaType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';

export interface ThreadsPostOptions {
  text: string;
  mediaType?: ThreadsMediaType;
  imageUrl?: string;      // URL pública da imagem (para mediaType IMAGE)
  replyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
}

// ─── OAuth Helpers ────────────────────────────────────────

export function buildAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.THREADS_APP_ID!,
    redirect_uri: redirectUri,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
  });
  return `${THREADS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<ThreadsTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.THREADS_APP_ID!,
    client_secret: process.env.THREADS_APP_SECRET!,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(THREADS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_message || 'Failed to exchange code for token');
  }

  return res.json();
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<ThreadsTokenResponse & { expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'th_exchange_token',
    client_secret: process.env.THREADS_APP_SECRET!,
    access_token: shortLivedToken,
  });

  const res = await fetch(`${THREADS_LONG_TOKEN_URL}?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to get long-lived token');
  }

  return res.json();
}

// ─── ThreadsService ───────────────────────────────────────

export class ThreadsService {
  private accessToken: string;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  /**
   * Busca perfil do usuário autenticado
   */
  async getProfile(): Promise<ThreadsUserProfile | null> {
    try {
      const res = await fetch(
        `${THREADS_BASE}/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${this.accessToken}`
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  /**
   * Publica um post no Threads (fluxo em 2 etapas)
   */
  async publish(options: ThreadsPostOptions): Promise<ThreadsPublishResult> {
    try {
      // Etapa 1: criar container
      const containerId = await this.createContainer(options);

      // Etapa 2: publicar
      const postId = await this.publishContainer(containerId);

      return { success: true, postId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async createContainer(options: ThreadsPostOptions): Promise<string> {
    const mediaType = options.mediaType ?? (options.imageUrl ? 'IMAGE' : 'TEXT');

    const params = new URLSearchParams({
      media_type: mediaType,
      text: options.text,
      access_token: this.accessToken,
    });

    if (options.imageUrl) {
      params.set('image_url', options.imageUrl);
    }

    if (options.replyControl) {
      params.set('reply_control', options.replyControl);
    }

    const res = await fetch(
      `${THREADS_BASE}/${this.userId}/threads?${params.toString()}`,
      { method: 'POST' }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to create container');
    }

    const data = await res.json();
    return data.id;
  }

  private async publishContainer(containerId: string): Promise<string> {
    const params = new URLSearchParams({
      creation_id: containerId,
      access_token: this.accessToken,
    });

    const res = await fetch(
      `${THREADS_BASE}/${this.userId}/threads_publish?${params.toString()}`,
      { method: 'POST' }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to publish container');
    }

    const data = await res.json();
    return data.id;
  }

  /**
   * Verifica se o token ainda é válido
   */
  async validateToken(): Promise<boolean> {
    const profile = await this.getProfile();
    return !!profile;
  }
}
