export interface ErrandLocation {
  id?: string;
  errand_id?: string;
  label?: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  created_at?: string;
}

export interface Errand {
  id: string;
  user_id: string;
  title: string;
  note?: string | null;
  lat?: number;
  lng?: number;
  radius_m?: number;
  is_done: boolean;
  created_at: string;
  locations?: ErrandLocation[];
}

export type ErrandInput = {
  title: string;
  note?: string | null;
  is_done?: boolean;
  locations: Omit<ErrandLocation, 'errand_id' | 'created_at'>[];
};
