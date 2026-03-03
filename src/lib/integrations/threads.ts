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

export interface ThreadsPost {
  id: string;
  text?: string;
  timestamp: string;
  media_type: string;
  permalink?: string;
  shortcode?: string;
}

export interface ThreadsPostInsights {
  postId: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

export interface ThreadsProfileInsights {
  since: string;
  until: string;
  totalViews: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalQuotes: number;
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
    scope: 'threads_basic,threads_content_publish,threads_manage_insights,threads_read_replies',
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
   * Lista os posts mais recentes da conta (requer threads_basic)
   */
  async getRecentPosts(limit = 10): Promise<ThreadsPost[]> {
    const l = Math.min(Math.max(1, limit), 25)
    const params = new URLSearchParams({
      fields: 'id,text,timestamp,media_type,permalink,shortcode',
      limit: String(l),
      access_token: this.accessToken,
    })
    try {
      const res = await fetch(`${THREADS_BASE}/${this.userId}/threads?${params.toString()}`)
      if (!res.ok) return []
      const data = await res.json()
      return data.data ?? []
    } catch {
      return []
    }
  }

  /**
   * Retorna métricas de um post específico (requer threads_manage_insights)
   */
  async getPostInsights(postId: string): Promise<ThreadsPostInsights> {
    const params = new URLSearchParams({
      metric: 'views,likes,replies,reposts,quotes',
      access_token: this.accessToken,
    })
    const res = await fetch(`${THREADS_BASE}/${postId}/insights?${params.toString()}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch post insights')
    }
    const data = await res.json()
    const result: ThreadsPostInsights = { postId, views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0 }
    for (const insight of (data.data ?? [])) {
      const value = insight.values?.[0]?.value ?? insight.total_value?.value ?? 0
      switch (insight.name) {
        case 'views':   result.views   = value; break
        case 'likes':   result.likes   = value; break
        case 'replies': result.replies = value; break
        case 'reposts': result.reposts = value; break
        case 'quotes':  result.quotes  = value; break
      }
    }
    return result
  }

  /**
   * Retorna métricas do perfil em um período (requer threads_manage_insights)
   */
  async getProfileInsights(since?: string, until?: string): Promise<ThreadsProfileInsights> {
    const nowTs  = Math.floor(Date.now() / 1000)
    const sinceTs = since ? Math.floor(new Date(since).getTime() / 1000) : nowTs - 7 * 24 * 60 * 60
    const untilTs = until ? Math.floor(new Date(until).getTime() / 1000) : nowTs
    const params = new URLSearchParams({
      metric: 'views,likes,replies,reposts,quotes',
      period: 'day',
      since: String(sinceTs),
      until: String(untilTs),
      access_token: this.accessToken,
    })
    const res = await fetch(`${THREADS_BASE}/${this.userId}/insights?${params.toString()}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || 'Failed to fetch profile insights')
    }
    const data = await res.json()
    const result: ThreadsProfileInsights = {
      since: new Date(sinceTs * 1000).toISOString().slice(0, 10),
      until: new Date(untilTs * 1000).toISOString().slice(0, 10),
      totalViews: 0, totalLikes: 0, totalReplies: 0, totalReposts: 0, totalQuotes: 0,
    }
    for (const insight of (data.data ?? [])) {
      const total = (insight.values ?? []).reduce((s: number, v: { value: number }) => s + (v.value ?? 0), 0)
      switch (insight.name) {
        case 'views':   result.totalViews   = total; break
        case 'likes':   result.totalLikes   = total; break
        case 'replies': result.totalReplies = total; break
        case 'reposts': result.totalReposts = total; break
        case 'quotes':  result.totalQuotes  = total; break
      }
    }
    return result
  }

  /**
   * Verifica se o token ainda é válido
   */
  async validateToken(): Promise<boolean> {
    const profile = await this.getProfile();
    return !!profile;
  }
}
