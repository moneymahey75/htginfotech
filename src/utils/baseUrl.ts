const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  const configuredBaseUrl = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_PUBLIC_SITE_URL;

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl);
  }

  return '';
};

export const buildAbsoluteUrl = (path = '/'): string => {
  const baseUrl = getBaseUrl();
  const normalizedPath = ensureLeadingSlash(path);

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
};
