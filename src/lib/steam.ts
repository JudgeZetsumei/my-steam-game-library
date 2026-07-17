export const headerImageUrl = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

export const steamRunUrl = (appId: number) => `steam://run/${appId}`;

export function initials(name: string): string {
  return name
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
