export type ContentItem = {
  id: string;
  titolo: string;
  categoria: string;
  tag?: string;
  descrizione?: string;
  contenuto?: string;
  link?: string;
  premium?: boolean;
};

export type UserProfile = {
  name: string;
  email?: string;
  createdAt: string; // ISO
};
