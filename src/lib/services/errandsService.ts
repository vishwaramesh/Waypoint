import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Errand, ErrandInput, ErrandLocation } from '@/types/errand';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const LOCAL_STORAGE_KEY = 'waypoint_local_errands';

// Fallback initial errands for local demo mode with multi-location targets
const defaultErrands: Errand[] = [
  {
    id: '1',
    user_id: 'demo-user-id',
    title: 'Pick up prescription at Pharmacy',
    note: 'Prescription #482910. Either CVS on Main St or Apollo Pharmacy works.',
    lat: DEFAULT_MAP_CENTER.lat,
    lng: DEFAULT_MAP_CENTER.lng,
    radius_m: 150,
    is_done: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    locations: [
      {
        id: 'loc-1',
        errand_id: '1',
        label: 'CVS Pharmacy (Main St)',
        lat: DEFAULT_MAP_CENTER.lat,
        lng: DEFAULT_MAP_CENTER.lng,
        radius_m: 150,
      },
      {
        id: 'loc-2',
        errand_id: '1',
        label: 'Apollo Pharmacy (Shela)',
        lat: DEFAULT_MAP_CENTER.lat + 0.003,
        lng: DEFAULT_MAP_CENTER.lng + 0.003,
        radius_m: 120,
      },
    ],
  },
  {
    id: '2',
    user_id: 'demo-user-id',
    title: 'Grocery shopping for weekly prep',
    note: 'Organic produce, oat milk, almond butter.',
    lat: DEFAULT_MAP_CENTER.lat - 0.004,
    lng: DEFAULT_MAP_CENTER.lng - 0.002,
    radius_m: 200,
    is_done: false,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    locations: [
      {
        id: 'loc-3',
        errand_id: '2',
        label: 'Whole Foods Supermarket',
        lat: DEFAULT_MAP_CENTER.lat - 0.004,
        lng: DEFAULT_MAP_CENTER.lng - 0.002,
        radius_m: 200,
      },
    ],
  },
  {
    id: '3',
    user_id: 'demo-user-id',
    title: 'Drop off dry cleaning',
    note: '2 suits and 1 winter coat.',
    lat: DEFAULT_MAP_CENTER.lat + 0.002,
    lng: DEFAULT_MAP_CENTER.lng - 0.004,
    radius_m: 100,
    is_done: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    locations: [
      {
        id: 'loc-4',
        errand_id: '3',
        label: 'Sparkle Cleaners',
        lat: DEFAULT_MAP_CENTER.lat + 0.002,
        lng: DEFAULT_MAP_CENTER.lng - 0.004,
        radius_m: 100,
      },
    ],
  },
];

function getLocalErrands(): Errand[] {
  if (typeof window === 'undefined') return defaultErrands;
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultErrands));
  } catch (e) {
    // ignore
  }
  return defaultErrands;
}

function saveLocalErrands(items: Errand[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // ignore
  }
}

export async function fetchUserErrands(userId: string): Promise<Errand[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('errands')
      .select('*, locations:errand_locations(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching errands from Supabase:', error);
      throw error;
    }

    const items = (data as Errand[]).map((errand) => {
      // Fallback if errand has no locations in location table yet
      if (!errand.locations || errand.locations.length === 0) {
        errand.locations = [
          {
            id: `legacy-${errand.id}`,
            errand_id: errand.id,
            label: null,
            lat: errand.lat ?? DEFAULT_MAP_CENTER.lat,
            lng: errand.lng ?? DEFAULT_MAP_CENTER.lng,
            radius_m: errand.radius_m ?? 100,
          },
        ];
      }
      return errand;
    });

    return items;
  } else {
    return getLocalErrands();
  }
}

export async function createErrand(userId: string, input: ErrandInput): Promise<Errand> {
  const primaryLocation = input.locations[0] || {
    lat: DEFAULT_MAP_CENTER.lat,
    lng: DEFAULT_MAP_CENTER.lng,
    radius_m: 100,
  };

  if (isSupabaseConfigured) {
    // 1. Insert parent errand row
    const newRecord = {
      user_id: userId,
      title: input.title,
      note: input.note || null,
      lat: primaryLocation.lat,
      lng: primaryLocation.lng,
      radius_m: primaryLocation.radius_m || 100,
      is_done: input.is_done ?? false,
    };

    const { data: errandData, error: errandError } = await supabase
      .from('errands')
      .insert([newRecord])
      .select()
      .single();

    if (errandError) {
      console.error('Error inserting errand into Supabase:', errandError);
      throw errandError;
    }

    // 2. Insert locations into errand_locations table
    const locationRecords = input.locations.map((loc) => ({
      errand_id: errandData.id,
      label: loc.label || null,
      lat: loc.lat,
      lng: loc.lng,
      radius_m: loc.radius_m || 100,
    }));

    const { data: locData, error: locError } = await supabase
      .from('errand_locations')
      .insert(locationRecords)
      .select();

    if (locError) {
      console.error('Error inserting errand locations:', locError);
    }

    return {
      ...errandData,
      locations: locData as ErrandLocation[],
    };
  } else {
    const errandId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const locationsWithId: ErrandLocation[] = input.locations.map((loc, idx) => ({
      id: `loc-${errandId}-${idx}`,
      errand_id: errandId,
      label: loc.label || null,
      lat: loc.lat,
      lng: loc.lng,
      radius_m: loc.radius_m || 100,
    }));

    const localErrand: Errand = {
      id: errandId,
      user_id: userId,
      title: input.title,
      note: input.note || null,
      lat: primaryLocation.lat,
      lng: primaryLocation.lng,
      radius_m: primaryLocation.radius_m || 100,
      is_done: input.is_done ?? false,
      created_at: new Date().toISOString(),
      locations: locationsWithId,
    };

    const current = getLocalErrands();
    const updated = [localErrand, ...current];
    saveLocalErrands(updated);
    return localErrand;
  }
}

export async function updateErrand(id: string, input: Partial<ErrandInput>): Promise<Errand> {
  const primaryLocation = input.locations && input.locations.length > 0 ? input.locations[0] : null;

  if (isSupabaseConfigured) {
    // 1. Update parent errand row
    const updatePayload: any = {};
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.note !== undefined) updatePayload.note = input.note;
    if (input.is_done !== undefined) updatePayload.is_done = input.is_done;
    if (primaryLocation) {
      updatePayload.lat = primaryLocation.lat;
      updatePayload.lng = primaryLocation.lng;
      updatePayload.radius_m = primaryLocation.radius_m;
    }

    const { data: errandData, error: errandError } = await supabase
      .from('errands')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (errandError) {
      console.error('Error updating errand in Supabase:', errandError);
      throw errandError;
    }

    // 2. Update locations if locations array was provided
    let updatedLocations: ErrandLocation[] = [];
    if (input.locations) {
      // Delete existing locations for this errand
      await supabase.from('errand_locations').delete().eq('errand_id', id);

      // Insert new location set
      const locationRecords = input.locations.map((loc) => ({
        errand_id: id,
        label: loc.label || null,
        lat: loc.lat,
        lng: loc.lng,
        radius_m: loc.radius_m || 100,
      }));

      const { data: locData, error: locError } = await supabase
        .from('errand_locations')
        .insert(locationRecords)
        .select();

      if (locError) {
        console.error('Error updating errand locations:', locError);
      } else {
        updatedLocations = locData as ErrandLocation[];
      }
    } else {
      // Fetch existing locations
      const { data: locData } = await supabase
        .from('errand_locations')
        .select('*')
        .eq('errand_id', id);
      updatedLocations = (locData as ErrandLocation[]) || [];
    }

    return {
      ...errandData,
      locations: updatedLocations,
    };
  } else {
    const current = getLocalErrands();
    let updatedItem: Errand | null = null;
    const updatedList = current.map((item) => {
      if (item.id === id) {
        const locationsWithId = input.locations
          ? input.locations.map((loc, idx) => ({
              id: loc.id || `loc-${id}-${idx}`,
              errand_id: id,
              label: loc.label || null,
              lat: loc.lat,
              lng: loc.lng,
              radius_m: loc.radius_m || 100,
            }))
          : item.locations;

        updatedItem = {
          ...item,
          ...input,
          lat: primaryLocation ? primaryLocation.lat : item.lat,
          lng: primaryLocation ? primaryLocation.lng : item.lng,
          radius_m: primaryLocation ? primaryLocation.radius_m : item.radius_m,
          locations: locationsWithId,
        };
        return updatedItem;
      }
      return item;
    });

    saveLocalErrands(updatedList);
    if (!updatedItem) throw new Error('Errand not found');
    return updatedItem;
  }
}

export async function toggleErrandDone(id: string, is_done: boolean): Promise<Errand> {
  return updateErrand(id, { is_done });
}

export async function deleteErrand(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('errands')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting errand from Supabase:', error);
      throw error;
    }
  } else {
    const current = getLocalErrands();
    const updatedList = current.filter((item) => item.id !== id);
    saveLocalErrands(updatedList);
  }
}
