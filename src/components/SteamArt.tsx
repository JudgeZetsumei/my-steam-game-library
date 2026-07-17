import { useState } from 'react';
import { headerImageUrl, initials } from '@/lib/steam';

interface SteamArtProps {
  appId: number;
  name: string;
  /** Baked-in override (SteamGridDB) for games whose legacy CDN URL is dead. */
  artUrl?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export default function SteamArt({ appId, name, artUrl, className, loading = 'lazy' }: SteamArtProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className={className ? `ph ${className}` : 'ph'}>{initials(name)}</div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Steam CDN/SGDB serve exact-size headers; next/image adds no value.
    <img
      src={artUrl ?? headerImageUrl(appId)}
      alt=""
      loading={loading}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
