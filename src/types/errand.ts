export interface Errand {
  id: string;
  user_id: string;
  title: string;
  note?: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  is_done: boolean;
  created_at: string;
}

export type ErrandInput = Omit<Errand, 'id' | 'user_id' | 'created_at' | 'is_done'> & {
  is_done?: boolean;
};
