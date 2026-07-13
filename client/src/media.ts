// Helpers to turn a pasted video/reel link (YouTube, YouTube Shorts, Instagram
// reels/posts) into a URL that can be dropped straight into an <iframe>.

export type MediaKind = 'youtube' | 'instagram' | 'other';

export function mediaKind(url?: string | null): MediaKind {
  if (!url) return 'other';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/instagram\.com/i.test(url)) return 'instagram';
  return 'other';
}

function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function instagramPath(url: string): string | null {
  // matches /reel/CODE/, /p/CODE/, /tv/CODE/
  const m = url.match(/instagram\.com\/(reel|reels|p|tv)\/([\w-]+)/i);
  if (!m) return null;
  const kind = m[1] === 'reels' ? 'reel' : m[1];
  return `${kind}/${m[2]}`;
}

// Returns an embeddable src, or null if we can't safely embed it.
export function toEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const kind = mediaKind(url);
  if (kind === 'youtube') {
    const id = youtubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (kind === 'instagram') {
    const p = instagramPath(url);
    return p ? `https://www.instagram.com/${p}/embed` : null;
  }
  return null;
}

export function isEmbeddable(url?: string | null): boolean {
  return !!toEmbedUrl(url);
}
