export type BrandId =
  | "blaaze"
  | "dreamz"
  | "masako"
  | "paata"
  | "lifeset"
  | "treadtrails"
  | "youngboyztoyz";

export type BrandItem = {
  id: BrandId;
  title: string;
  src: string;
  width: number;
  height: number;
  glowColor: string;
  /** Per-logo display box overrides for visual balance */
  displayWidth?: number;
  displayHeight?: number;
  logoClassName?: string;
};

/** Horizontal padding inside each slot (20px per side → uniform edge-to-edge gaps) */
export const BRAND_SLOT_PADDING_X = 40;

/** Gap between logo slots (also set in CSS as gap) */
export const BRAND_ITEM_GAP = 72;

export const BRAND_LOGO_WIDTH = 148;
export const BRAND_LOGO_HEIGHT = 52;

/** Shared marquee size for BLAAZE + DREAMZ wordmarks */
export const BLAAZE_DREAMZ_DISPLAY = {
  width: 200,
  height: 62,
} as const;

/** DREAMZ aspect needs more height to match BLAAZE width without scale bleed */
export const DREAMZ_DISPLAY = {
  width: 200,
  height: 122,
} as const;

export const brandList: BrandItem[] = [
  {
    id: "blaaze",
    title: "BLAAZE",
    src: "/images/home/brand/clients/blaaze.png",
    width: 845,
    height: 145,
    glowColor: "rgba(255, 235, 210, 0.45)",
    displayWidth: BLAAZE_DREAMZ_DISPLAY.width,
    displayHeight: BLAAZE_DREAMZ_DISPLAY.height,
  },
  {
    id: "dreamz",
    title: "DREAMZ",
    src: "/images/home/brand/clients/dreamz.png",
    width: 916,
    height: 558,
    glowColor: "rgba(233, 30, 99, 0.5)",
    displayWidth: DREAMZ_DISPLAY.width,
    displayHeight: DREAMZ_DISPLAY.height,
    logoClassName: "client-brand-logo--dreamz",
  },
  {
    id: "masako",
    title: "MASAKO INDIA",
    src: "/images/home/brand/clients/masako-india.png",
    width: 1023,
    height: 910,
    glowColor: "rgba(197, 160, 89, 0.55)",
    displayWidth: 88,
    displayHeight: 52,
    logoClassName: "client-brand-logo--masako",
  },
  {
    id: "paata",
    title: "PAATA.AI",
    src: "/images/home/brand/clients/paata-ai.png",
    width: 784,
    height: 784,
    glowColor: "rgba(34, 211, 238, 0.45)",
    displayWidth: 52,
    displayHeight: 52,
    logoClassName: "client-brand-logo--paata",
  },
  {
    id: "lifeset",
    title: "LIFESET",
    src: "/images/home/brand/clients/lifeset.png",
    width: 292,
    height: 207,
    glowColor: "rgba(255, 193, 7, 0.5)",
    displayWidth: 132,
    displayHeight: 48,
    logoClassName: "client-brand-logo--lifeset",
  },
  {
    id: "treadtrails",
    title: "TREAD TRAILS INDIA",
    src: "/images/home/brand/clients/treadtrails.png",
    width: 885,
    height: 152,
    glowColor: "rgba(220, 38, 38, 0.45)",
  },
  {
    id: "youngboyztoyz",
    title: "YOUNGBOYZTOYZ",
    src: "/images/home/brand/clients/youngboyztoyz.png",
    width: 828,
    height: 726,
    glowColor: "rgba(255, 255, 255, 0.35)",
  },
];
