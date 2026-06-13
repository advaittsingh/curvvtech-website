export type CmsService = {
  id: string;
  title: string;
  hero: string;
  features: string;
  process: string;
  pricing: string;
  faq: string;
  updatedAt: string;
};

export type CmsPortfolio = {
  id: string;
  title: string;
  caseStudy: string;
  images: string;
  results: string;
  testimonial: string;
  updatedAt: string;
};

function store<T>(key: string, fallback: T[]): { read: () => T[]; write: (v: T[]) => void } {
  return {
    read: () => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    write: (v) => localStorage.setItem(key, JSON.stringify(v)),
  };
}

const servicesStore = store<CmsService>("curvvtech_cms_services", []);
const portfolioStore = store<CmsPortfolio>("curvvtech_cms_portfolio", []);

export const contentApi = {
  services: {
    list: async () => servicesStore.read(),
    upsert: async (item: Omit<CmsService, "id" | "updatedAt"> & { id?: string }) => {
      const items = servicesStore.read();
      const now = new Date().toISOString();
      if (item.id) {
        const idx = items.findIndex((s) => s.id === item.id);
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...item, updatedAt: now };
          servicesStore.write(items);
          return items[idx];
        }
      }
      const created = { ...item, id: crypto.randomUUID(), updatedAt: now } as CmsService;
      items.unshift(created);
      servicesStore.write(items);
      return created;
    },
  },
  portfolio: {
    list: async () => portfolioStore.read(),
    upsert: async (item: Omit<CmsPortfolio, "id" | "updatedAt"> & { id?: string }) => {
      const items = portfolioStore.read();
      const now = new Date().toISOString();
      if (item.id) {
        const idx = items.findIndex((s) => s.id === item.id);
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...item, updatedAt: now };
          portfolioStore.write(items);
          return items[idx];
        }
      }
      const created = { ...item, id: crypto.randomUUID(), updatedAt: now } as CmsPortfolio;
      items.unshift(created);
      portfolioStore.write(items);
      return created;
    },
  },
};
