import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Errand, ErrandInput } from '@/types/errand';

const LOCAL_STORAGE_KEY = 'waypoint_local_errands';

// Fallback initial errands for local demo mode
const defaultErrands: Errand[] = [
  {
    id: '1',
    user_id: 'demo-user-id',
    title: 'Pick up prescription at CVS Pharmacy',
    note: 'Prescription #482910. Pick up vitamins too.',
    lat: 37.7749,
    lng: -122.4194,
    radius_m: 150,
    is_done: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: '2',
    user_id: 'demo-user-id',
    title: 'Grocery shopping for weekly prep',
    note: 'Organic produce, oat milk, almond butter.',
    lat: 37.7790,
    lng: -122.4140,
    radius_m: 200,
    is_done: false,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: '3',
    user_id: 'demo-user-id',
    title: 'Drop off dry cleaning',
    note: '2 suits and 1 winter coat at Sparkle Cleaners.',
    lat: 37.7690,
    lng: -122.4280,
    radius_m: 100,
    is_done: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
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
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching errands from Supabase:', error);
      throw error;
    }
    return data as Errand[];
  } else {
    return getLocalErrands();
  }
}

export async function createErrand(userId: string, input: ErrandInput): Promise<Errand> {
  if (isSupabaseConfigured) {
    const newRecord = {
      user_id: userId,
      title: input.title,
      note: input.note || null,
      lat: input.lat,
      lng: input.lng,
      radius_m: input.radius_m || 100,
      is_done: input.is_done ?? false,
    };

    const { data, error } = await supabase
      .from('errands')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.error('Error inserting errand into Supabase:', error);
      throw error;
    }
    return data as Errand;
  } else {
    const localErrand: Errand = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      user_id: userId,
      title: input.title,
      note: input.note || null,
      lat: input.lat,
      lng: input.lng,
      radius_m: input.radius_m || 100,
      is_done: input.is_done ?? false,
      created_at: new Date().toISOString(),
    };

    const current = getLocalErrands();
    const updated = [localErrand, ...current];
    saveLocalErrands(updated);
    return localErrand;
  }
}

export async function updateErrand(id: string, input: Partial<ErrandInput>): Promise<Errand> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('errands')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating errand in Supabase:', error);
      throw error;
    }
    return data as Errand;
  } else {
    const current = getLocalErrands();
    let updatedItem: Errand | null = null;
    const updatedList = current.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...input };
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
