export interface QuestStopLocation {
  id?: string;
  quest_stop_id?: string;
  label?: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  created_at?: string;
}

export interface QuestStop {
  id?: string;
  quest_id?: string;
  order_index: number;
  title: string;
  note?: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  is_done: boolean;
  created_at?: string;
  locations?: QuestStopLocation[];
}

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  note?: string | null;
  created_at: string;
  stops?: QuestStop[];
}

export type QuestStopInput = Omit<QuestStop, 'id' | 'quest_id' | 'is_done' | 'created_at' | 'locations'> & {
  locations: Omit<QuestStopLocation, 'id' | 'quest_stop_id' | 'created_at'>[];
};

export type QuestInput = {
  title: string;
  note?: string | null;
  stops: QuestStopInput[];
};
