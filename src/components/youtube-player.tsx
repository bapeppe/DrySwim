'use client';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';
import type { Exercise } from '@/lib/models';
import { youtubeSearchUrl } from '@/data/videos';
import { CategoryArt } from './visuals';
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
  return (
    <div className="video-block">
      {!enabled || fallback ? (
        <>
          <CategoryArt category={exercise.categories[0]} large />
          <div className="video-overlay">
            {fallback ? (
              <>
                <span className="video-label">
                  {error ? 'Video non disponibile' : 'Dimostrazione da verificare'}
                </span>
                <a
                  className="btn btn-secondary"
                  href={youtubeSearchUrl(exercise.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={17} />
                  Cerca “{exercise.name}” su YouTube
                </a>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => setEnabled(true)}>
                <PlayCircle size={20} />
                Carica video YouTube
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="youtube-container" ref={container} />
      )}
      <p className="video-note">
        {fallback
          ? 'Le istruzioni complete sono disponibili qui sotto. Fai verificare il video all’allenatore.'
          : 'Il video usa YouTube e richiede Internet. Viene caricato solo dopo il tuo consenso.'}
      </p>
    </div>
  );
}
