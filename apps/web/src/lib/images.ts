/** Unsplash CDN URL for a photo id; next/image then resizes/encodes it (AVIF/WebP). */
export const unsplash = (id: string, width = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
