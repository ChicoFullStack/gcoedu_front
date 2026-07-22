import type { AxiosInstance } from 'axios';
import type { PlayTvVideo } from '@/types/playtv';
import { isPlayTvLinkResource } from '@/types/playtv';

export const PLAY_TV_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function validatePlayTvVideoUrl(videoUrl: string): boolean {
  if (!videoUrl.trim()) return false;
  try {
    const u = new URL(videoUrl);
    return (u.protocol === 'http:' || u.protocol === 'https:') && Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function linksSnapshotFromVideo(video: PlayTvVideo): string {
  const links = (video.resources ?? [])
    .filter(isPlayTvLinkResource)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return JSON.stringify(links.map((l) => ({ id: l.id ?? null, title: l.title, url: l.url })));
}

export function canEditPlayTvVideo(
  video: PlayTvVideo,
  role: string,
  ctx: {
    userId?: string;
    escola_id?: string;
    municipio_id?: string;
    turmas?: Array<{ class_id: string; school_id: string; grade_id: string; subject_id?: string }>;
  }
): boolean {
  const r = role.toLowerCase();
  if (r === 'aluno') return false;

  if (video.created_by?.id && video.created_by.id === ctx.userId) {
    return true;
  }

  if (video.entire_municipality === true) {
    return r === 'admin' || r === 'tecadm';
  }

  if (r === 'admin' || r === 'tecadm') return true;

  if ((r === 'diretor' || r === 'coordenador') && ctx.escola_id) {
    return video.schools.some((s) => s.id === ctx.escola_id);
  }

  return false;
}

export function extractCreatedPlayTvVideoId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const video = d.video;
  if (video && typeof video === 'object' && video !== null) {
    const id = (video as Record<string, unknown>).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  if (typeof d.id === 'string' && d.id.length > 0) return d.id;
  return null;
}

export function getPlayTvApiErrorMessage(error: unknown, fallback = 'Operação falhou. Tente novamente.'): string {
  const err = error as {
    response?: { data?: { erro?: string; message?: string; error?: string; detalhes?: string } };
    message?: string;
  };
  const data = err.response?.data;
  return (
    data?.erro ||
    data?.message ||
    data?.error ||
    (typeof data?.detalhes === 'string' ? data.detalhes : undefined) ||
    err.message ||
    fallback
  );
}

export async function uploadPlayTvFileResource(
  apiClient: AxiosInstance,
  videoId: string,
  file: File,
  title: string,
  sortOrder: number,
  cityId?: string
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title.trim());
  formData.append('sort_order', String(sortOrder));

  await apiClient.post(`/play-tv/videos/${videoId}/resources/file`, formData, {
    ...(cityId ? { meta: { cityId } } : {}),
  });
}
