export type SiteAdCreative = {
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  overlayColor: string;
  textAlign: 'left' | 'center';
  fontStyle: 'sans' | 'serif' | 'handwritten';
  decorationStyle: 'orbit' | 'rays' | 'confetti' | 'corners' | 'none';
  showBrand: boolean;
  headline: string;
  tagline: string;
  boldText: string;
  textFields: Array<{
    id: string;
    label: string;
    text: string;
    style: 'heading' | 'body' | 'small';
  }>;
  ctaText: string;
  backgroundImage: string;
  artwork: Array<{
    url: string;
    alt: string;
    side: 'left' | 'right';
    rotation: number;
    shape: 'square' | 'rounded' | 'circle';
    size?: { width: number; height: number };
    position?: { x: number; y: number };
  }>;
  positions: Record<string, { x: number; y: number }>;
  textScale: Record<string, number>;
  buttonStyle: { width: number; height: number; radius: number };
};

export function normalizeSiteAdCreative(
  input: unknown,
  fallback?: { title?: string; message?: string; boldText?: string | null; ctaText?: string; includeCta?: boolean },
): SiteAdCreative;
export function createSiteAdSvg(input: unknown, width: number, height: number): string;
export function resolveSiteAdHeight(creative: { bannerSize?: string; desktopHeight?: number; mobileHeight?: number } | null | undefined, mobile: boolean): number;
