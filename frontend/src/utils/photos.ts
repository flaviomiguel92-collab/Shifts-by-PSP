export const MAX_PHOTOS = 5;
export const MAX_PHOTO_CHARS = 3_000_000;

// Older uploads may contain raw base64; current uploads contain a data URI.
export function photoUri(photo: string): string {
  if (photo.startsWith('data:image/')) return photo;
  const type = photo.startsWith('iVBOR') ? 'png' : photo.startsWith('R0lGOD') ? 'gif'
    : photo.startsWith('UklGR') ? 'webp' : 'jpeg';
  return `data:image/${type};base64,${photo}`;
}

export function validatePhotos(photos: string[]): void {
  if (photos.length > MAX_PHOTOS) throw new Error(`Máximo de ${MAX_PHOTOS} fotografias.`);
  if (photos.some((photo) => photo.length > MAX_PHOTO_CHARS)) {
    throw new Error('Cada fotografia não pode exceder 2 MB.');
  }
}
