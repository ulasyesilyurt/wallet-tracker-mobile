export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
};
