import type { MetadataRoute } from 'next';

const siteUrl = 'https://readagora.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
    ['/', 'daily', 1],
    ['/discovery/all', 'daily', 0.8],
    ['/discovery/for_you', 'daily', 0.7],
    ['/discovery/trending', 'daily', 0.8],
    ['/discovery/rising', 'daily', 0.7],
    ['/discovery/recently_updated', 'daily', 0.8],
    ['/discovery/hidden_gems', 'weekly', 0.6],
    ['/discovery/ai_generated', 'weekly', 0.5],
    ['/community', 'daily', 0.7],
    ['/events', 'weekly', 0.6],
    ['/creator', 'monthly', 0.5],
    ['/download', 'monthly', 0.6],
    ['/download/about', 'yearly', 0.3],
    ['/terms', 'yearly', 0.3],
    ['/privacy', 'yearly', 0.3],
    ['/account-deletion', 'yearly', 0.2],
  ];

  return pages.map(([path, changeFrequency, priority]) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency,
    priority,
  }));
}
