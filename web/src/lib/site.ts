/** Product name and links, in one place. Change SITE.name to rebrand. */
export const SITE = {
  name: 'ERP Suite',
  appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
} as const;

export const LINKS = {
  signup: `${SITE.appUrl}/signup`,
  login: `${SITE.appUrl}/login`,
} as const;
