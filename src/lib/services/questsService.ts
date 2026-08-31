import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Quest, QuestInput, QuestStop, QuestStopLocation } from '@/types/quest';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const LOCAL_STORAGE_KEY = 'waypoint_local_quests';

const defaultQuests: Quest[] = [
  {
    id: 'quest-1',
    user_id: 'demo-user-id',
    title: 'MICA Shela Campus Exploration',
    note: 'Follow the checkpoint chain across MICA campus.',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    stops: [
      {
        id: 'stop-1',
        quest_id: 'quest-1',
        order_index: 0,
        title: 'MICA Main Gate Checkpoint',
        note: 'Check in at the main campus entrance.',
        lat: DEFAULT_MAP_CENTER.lat,
        lng: DEFAULT_MAP_CENTER.lng,
        radius_m: 120,
        is_done: true,
        locations: [
          {
            id: 'stop-1-loc-1',
            quest_stop_id: 'stop-1',
            label: null,
            lat: DEFAULT_MAP_CENTER.lat,
            lng: DEFAULT_MAP_CENTER.lng,
            radius_m: 120,
          },
        ],
      },
      {
        id: 'stop-2',
        quest_id: 'quest-1',
        order_index: 1,
        title: 'Auditorium & Amphitheatre',
        note: 'Head towards the central outdoor amphitheatre.',
        lat: DEFAULT_MAP_CENTER.lat + 0.002,
        lng: DEFAULT_MAP_CENTER.lng + 0.002,
        radius_m: 100,
        is_done: false,
        locations: [
          {
            id: 'stop-2-loc-1',
            quest_stop_id: 'stop-2',
            label: null,
            lat: DEFAULT_MAP_CENTER.lat + 0.002,
            lng: DEFAULT_MAP_CENTER.lng + 0.002,
            radius_m: 100,
          },
        ],
      },
      {
        id: 'stop-3',
        quest_id: 'quest-1',
        order_index: 2,
        title: 'KEIC Library & Resource Center',
        note: 'Final stop at the Knowledge Exchange Library.',
        lat: DEFAULT_MAP_CENTER.lat + 0.004,
        lng: DEFAULT_MAP_CENTER.lng + 0.001,
        radius_m: 100,
        is_done: false,
        locations: [
          {
            id: 'stop-3-loc-1',
            quest_stop_id: 'stop-3',
            label: null,
            lat: DEFAULT_MAP_CENTER.lat + 0.004,
            lng: DEFAULT_MAP_CENTER.lng + 0.001,
            radius_m: 100,
          },
        ],
      },
    ],
  },
];

function getLocalQuests(): Quest[] {
  if (typeof window === 'undefined') return defaultQuests;
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultQuests));
  } catch (e) {
    // ignore
  }
  return defaultQuests;
}

function saveLocalQuests(items: Quest[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // ignore
  }
}

export async function fetchUserQuests(userId: string): Promise<Quest[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('quests')
      .select('*, stops:quest_stops(*, locations:quest_stop_locations(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quests from Supabase:', error);
      throw error;
    }

    const items = (data as Quest[]).map((quest) => {
      if (quest.stops) {
        quest.stops.sort((a, b) => a.order_index - b.order_index);
        quest.stops = quest.stops.map((stop) => {
          // Fallback if a stop has no rows in quest_stop_locations yet
          // (e.g. created before this feature existed)
          if (!stop.locations || stop.locations.length === 0) {
            stop.locations = [
              {
                id: `legacy-${stop.id}`,
                quest_stop_id: stop.id,
                label: null,
                lat: stop.lat,
                lng: stop.lng,
                radius_m: stop.radius_m,
              },
            ];
          }
          return stop;
        });
      } else {
        quest.stops = [];
      }
      return quest;
    });

    return items;
  } else {
    return getLocalQuests();
  }
}

export async function createQuest(userId: string, input: QuestInput): Promise<Quest> {
  if (isSupabaseConfigured) {
    // 1. Insert parent quest
    const { data: questData, error: questError } = await supabase
      .from('quests')
      .insert([
        {
          user_id: userId,
          title: input.title,
          note: input.note || null,
        },
      ])
      .select()
      .single();

    if (questError) {
      console.error('Error inserting quest:', questError);
      throw questError;
    }

    // 2. Insert quest stops (one row per stop, using each stop's first
    // location as the primary lat/lng/radius for backward compatibility)
    const stopRecords = input.stops.map((stop, idx) => {
      const primaryLoc = stop.locations[0] || { lat: stop.lat, lng: stop.lng, radius_m: stop.radius_m };
      return {
        quest_id: questData.id,
        order_index: idx,
        title: stop.title,
        note: stop.note || null,
        lat: primaryLoc.lat,
        lng: primaryLoc.lng,
        radius_m: primaryLoc.radius_m || 100,
        is_done: false,
      };
    });

    const { data: stopsData, error: stopsError } = await supabase
      .from('quest_stops')
      .insert(stopRecords)
      .select();

    if (stopsError) {
      console.error('Error inserting quest stops:', stopsError);
      throw stopsError;
    }

    // Correlate returned stop rows back to the input's location lists via
    // order_index (bulk insert doesn't guarantee return order matches input order).
    const sortedStops = ((stopsData as QuestStop[]) || []).slice().sort((a, b) => a.order_index - b.order_index);

    const locationRecords: { quest_stop_id: string; label: string | null; lat: number; lng: number; radius_m: number }[] = [];
    sortedStops.forEach((stopRow, idx) => {
      const stopInput = input.stops[idx];
      const locs = stopInput.locations && stopInput.locations.length > 0
        ? stopInput.locations
        : [{ label: null, lat: stopInput.lat, lng: stopInput.lng, radius_m: stopInput.radius_m }];

      locs.forEach((loc) => {
        locationRecords.push({
          quest_stop_id: stopRow.id as string,
          label: loc.label || null,
          lat: loc.lat,
          lng: loc.lng,
          radius_m: loc.radius_m || 100,
        });
      });
    });

    let locData: QuestStopLocation[] = [];
    if (locationRecords.length > 0) {
      const { data, error: locError } = await supabase
        .from('quest_stop_locations')
        .insert(locationRecords)
        .select();

      if (locError) {
        console.error('Error inserting quest stop locations:', locError);
      } else {
        locData = (data as QuestStopLocation[]) || [];
      }
    }

    const stopsWithLocations = sortedStops.map((stopRow) => ({
      ...stopRow,
      locations: locData.filter((l) => l.quest_stop_id === stopRow.id),
    }));

    return {
      ...questData,
      stops: stopsWithLocations,
    };
  } else {
    const questId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const stopsWithId: QuestStop[] = input.stops.map((stop, idx) => {
      const stopId = `stop-${questId}-${idx}`;
      const locs = stop.locations && stop.locations.length > 0
        ? stop.locations
        : [{ label: null, lat: stop.lat, lng: stop.lng, radius_m: stop.radius_m }];

      const locationsWithId: QuestStopLocation[] = locs.map((loc, lIdx) => ({
        id: `loc-${stopId}-${lIdx}`,
        quest_stop_id: stopId,
        label: loc.label || null,
        lat: loc.lat,
        lng: loc.lng,
        radius_m: loc.radius_m || 100,
      }));

      const primaryLoc = locationsWithId[0];

      return {
        id: stopId,
        quest_id: questId,
        order_index: idx,
        title: stop.title,
        note: stop.note || null,
        lat: primaryLoc.lat,
        lng: primaryLoc.lng,
        radius_m: primaryLoc.radius_m,
        is_done: false,
        locations: locationsWithId,
      };
    });

    const localQuest: Quest = {
      id: questId,
      user_id: userId,
      title: input.title,
      note: input.note || null,
      created_at: new Date().toISOString(),
      stops: stopsWithId,
    };

    const current = getLocalQuests();
    const updated = [localQuest, ...current];
    saveLocalQuests(updated);
    return localQuest;
  }
}

export async function markQuestStopDone(stopId: string, questId: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('quest_stops')
      .update({ is_done: true })
      .eq('id', stopId);

    if (error) {
      console.error('Error marking quest stop done:', error);
      throw error;
    }
  } else {
    const current = getLocalQuests();
    const updated = current.map((quest) => {
      if (quest.id === questId && quest.stops) {
        const updatedStops = quest.stops.map((stop) =>
          stop.id === stopId ? { ...stop, is_done: true } : stop
        );
        return { ...quest, stops: updatedStops };
      }
      return quest;
    });
    saveLocalQuests(updated);
  }
}

export async function deleteQuest(questId: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('quests')
      .delete()
      .eq('id', questId);

    if (error) {
      console.error('Error deleting quest:', error);
      throw error;
    }
  } else {
    const current = getLocalQuests();
    const updated = current.filter((q) => q.id !== questId);
    saveLocalQuests(updated);
  }
}
