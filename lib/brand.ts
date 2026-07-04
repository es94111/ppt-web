export const BRAND_FONT_VALUES = ["system", "display", "serif", "mono"] as const;
export type BrandFont = (typeof BRAND_FONT_VALUES)[number];

export type BrandKit = {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  font: BrandFont | null;
  footer: string | null;
};

export const EMPTY_BRAND_KIT: BrandKit = {
  name: null,
  logoUrl: null,
  primaryColor: null,
  accentColor: null,
  font: null,
  footer: null,
};

export function normalizeBrandKit(input?: Partial<BrandKit> | null): BrandKit {
  const brand = input ?? {};
  const font = BRAND_FONT_VALUES.includes(brand.font as BrandFont) ? brand.font as BrandFont : null;
  return {
    name: cleanText(brand.name, 80),
    logoUrl: cleanText(brand.logoUrl, 2048),
    primaryColor: cleanText(brand.primaryColor, 7),
    accentColor: cleanText(brand.accentColor, 7),
    font,
    footer: cleanText(brand.footer, 120),
  };
}

export function brandKitFromDeck(deck: Record<string, unknown>): BrandKit {
  return normalizeBrandKit({
    name: deck.brandName as string | null,
    logoUrl: deck.brandLogoUrl as string | null,
    primaryColor: deck.brandPrimaryColor as string | null,
    accentColor: deck.brandAccentColor as string | null,
    font: deck.brandFont as BrandFont | null,
    footer: deck.brandFooter as string | null,
  });
}

export function hasBrandKit(brand: BrandKit | null | undefined) {
  if (!brand) return false;
  return Boolean(brand.name || brand.logoUrl || brand.primaryColor || brand.accentColor || brand.font || brand.footer);
}

function cleanText(value: string | null | undefined, max: number) {
  const text = (value ?? "").trim().slice(0, max);
  return text || null;
}
