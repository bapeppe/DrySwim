'use client';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';
import type { Exercise } from '@/lib/models';
import { youtubeSearchUrl } from '@/data/videos';
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}
let apiPromise: Promise<void> | undefined;
function loadApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise)
    apiPromise = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve();
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        apiPromise = undefined;
        reject(new Error('API non disponibile'));
      };
      document.head.appendChild(script);
    });
  return apiPromise;
}
export function YouTubePlayer({ exercise }: { exercise: Exercise }) {
  const container = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!enabled || !exercise.youtubeVideoId) return;
    let player: YT.Player | undefined;
    let disposed = false;
    const timer = window.setTimeout(() => setError(true), 15000);
    loadApi()
      .then(() => {
        if (disposed || !container.current) return;
        const target = document.createElement('div');
        container.current.replaceChildren(target);
        player = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: exercise.youtubeVideoId,
          playerVars: { playsinline: 1, origin: window.location.origin, rel: 0 },
          events: { onReady: () => window.clearTimeout(timer), onError: () => setError(true) },
        });
      })
      .catch(() => setError(true));
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      player?.destroy();
    };
  }, [enabled, exercise.youtubeVideoId]);
  const fallback = !exercise.youtubeVideoId || error;
  if (fallback)
    return (
      <div className="video-fallback">
        <p>{error ? 'Il video non si apre.' : 'Non c’è ancora un video scelto dall’allenatore.'}</p>
        <a
          className="btn btn-secondary"
          aria-label={`Cerca “${exercise.name}” su YouTube`}
          href={youtubeSearchUrl(exercise.name)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={19} />
          Cerca un video su YouTube
        </a>
        <p className="small muted">Chiedi all’allenatore quale dimostrazione seguire.</p>
      </div>
    );
  return (
    <div className="video-block">
      {enabled ? (
        <div className="youtube-container" ref={container} />
      ) : (
        <div className="video-overlay">
          <button className="btn btn-secondary" onClick={() => setEnabled(true)}>
            <PlayCircle size={20} />
            Guarda la dimostrazione
          </button>
        </div>
      )}
      <p className="video-note">
        Il video usa YouTube e richiede Internet. Si carica solo quando premi il pulsante.
      </p>
    </div>
  );
}
