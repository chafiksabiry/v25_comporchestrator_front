export function brandHost(hostnameOrUrl: string): string {
  try {
    const host = /^https?:\/\//i.test(hostnameOrUrl)
      ? new URL(hostnameOrUrl).hostname
      : hostnameOrUrl;
    return host.replace(/^www\./i, "").toLowerCase();
  } catch {
    return String(hostnameOrUrl || "")
      .replace(/^www\./i, "")
      .toLowerCase();
  }
}

/** Social / campaign CDNs — not a company mark, often CORS-blocked. */
export function isUnreliableLogoUrl(url: string): boolean {
  return /cdninstagram|instagram\.com|fbcdn\.|facebook\.com\/.+\/(p|photos?|picture)|pbs\.twimg|tiktokcdn|s24\.fr|bdi\.dlpdomain/i.test(
    url
  );
}

export function clearbitLogo(websiteOrHost: string): string {
  return `https://logo.clearbit.com/${brandHost(websiteOrHost)}`;
}

export function googleFavicon(websiteOrHost: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${brandHost(websiteOrHost)}&sz=${size}`;
}

export function logoCandidates(website?: string, current?: string): string[] {
  const list: string[] = [];
  if (current && !isUnreliableLogoUrl(current)) list.push(current);
  if (website) {
    const host = brandHost(website);
    if (host) {
      list.push(clearbitLogo(host));
      list.push(googleFavicon(host));
    }
  }
  return [...new Set(list.filter(Boolean))];
}

export function nextLogoFallback(website: string | undefined, current: string): string {
  const chain = logoCandidates(website);
  const idx = chain.indexOf(current);
  return chain[idx + 1] || "";
}
