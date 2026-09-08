import site from '@site';

export type Locale = typeof site.locale;
export const activeLocales: readonly Locale[] = [site.locale];
export function localizePath(path: string, locale: Locale = site.locale): string {
  if (!activeLocales.includes(locale)) throw new Error('Inactive locale');
  return path;
}
