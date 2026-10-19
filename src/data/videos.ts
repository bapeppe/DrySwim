/** Solo video controllati da un revisore: nessun ID presunto. Le schede senza voce usano la ricerca YouTube. */
export type VerifiedVideo = {
  youtubeVideoId: string;
  sourceUrl: string;
  reviewedAt: string;
  reviewedBy: string;
};
export const videoRegistry: Record<string, VerifiedVideo> = {};
export function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
