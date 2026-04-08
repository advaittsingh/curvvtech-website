export type AuthPayload = {
  sub: string;
  email?: string;
  tokenUse?: string;
};

export type InternalUser = {
  id: string;
  authSub: string;
  email: string | null;
  accessAllowed: boolean;
  waitlistPosition: number | null;
};
