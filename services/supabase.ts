import { createClient } from '@supabase/supabase-js';
import { Employee } from '../types';

// Using the provided keys. 
// NOTE: Standard Supabase setup requires a Project URL (e.g., https://xyz.supabase.co) and an Anon Key (JWT).
// The provided keys look different. Please ensure you have the correct Project URL and Anon Key.
// For now, we will use placeholders for the URL and the provided key as the Anon Key.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a dummy client if URL is missing to prevent crash during dev/build
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const safeUrl = isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://placeholder-project.supabase.co';
const safeKey = SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey);

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }

  return data.map(rowToEmployee);
};

// --- ROW <-> EMPLOYEE -------------------------------------------------------
//
// The table has a column per field for the ones it was designed around. Every
// control added since then -- the whole New Provider panel, the HR Feedback
// text and image settings, the Hiring titles -- had no column, so it was
// written nowhere: configure a card, reopen it on another machine, and the
// work is gone. That is not a bug in any one of those features; it is a bug
// in having to remember to add a column each time one is built.
//
// So anything without a dedicated column round-trips through a single jsonb
// column, `template_settings`. New controls need no migration. The fields
// below keep their own columns because they predate this and other things
// read them.
const COLUMN_BACKED_FIELDS = [
  'id', 'name', 'role', 'previousRole', 'photoUrl', 'dateStr', 'admissionDate',
  'gameThumbnails', 'photoScale', 'photoPosition', 'birthDate', 'description',
  'socials', 'department', 'status', 'managerId', 'onboardingChecklist',
  'offboardingChecklist', 'providerLogo', 'providerLogoScale', 'providerGridConfig',
] as const;

const columnBacked = new Set<string>(COLUMN_BACKED_FIELDS);

/** Everything the table has no column for, as one plain object. */
const templateSettingsOf = (employee: Employee): Record<string, unknown> => {
  const settings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(employee)) {
    if (columnBacked.has(key) || value === undefined) continue;
    settings[key] = value;
  }
  return settings;
};

export const employeeToRow = (employee: Employee): Record<string, unknown> => ({
  id: employee.id,
  name: employee.name,
  role: employee.role,
  previous_role: employee.previousRole,
  photo_url: employee.photoUrl,
  date_str: employee.dateStr,
  admission_date: employee.admissionDate,
  game_thumbnails: employee.gameThumbnails,
  photo_scale: employee.photoScale,
  photo_position_x: employee.photoPosition?.x || 0,
  photo_position_y: employee.photoPosition?.y || 0,
  birth_date: employee.birthDate,
  description: employee.description,
  socials: employee.socials,
  department: employee.department,
  status: employee.status,
  manager_id: employee.managerId,
  onboarding_checklist: employee.onboardingChecklist,
  offboarding_checklist: employee.offboardingChecklist,
  provider_logo: employee.providerLogo,
  provider_logo_scale: employee.providerLogoScale,
  provider_grid_config: employee.providerGridConfig,
  template_settings: templateSettingsOf(employee),
  updated_at: new Date().toISOString(),
});

export const rowToEmployee = (row: any): Employee => ({
  // Spread first, so a dedicated column always wins over a stale copy an
  // older build may have left inside the blob.
  ...(row.template_settings && typeof row.template_settings === 'object' ? row.template_settings : {}),
  id: row.id,
  name: row.name,
  role: row.role,
  previousRole: row.previous_role,
  photoUrl: row.photo_url,
  dateStr: row.date_str,
  admissionDate: row.admission_date,
  gameThumbnails: row.game_thumbnails || [],
  photoScale: parseFloat(row.photo_scale) || 1,
  photoPosition: {
    x: parseFloat(row.photo_position_x) || 0,
    y: parseFloat(row.photo_position_y) || 0,
  },
  birthDate: row.birth_date,
  description: row.description,
  socials: row.socials,
  department: row.department,
  status: row.status,
  managerId: row.manager_id,
  onboardingChecklist: row.onboarding_checklist,
  offboardingChecklist: row.offboarding_checklist,
  providerLogo: row.provider_logo,
  providerLogoScale: row.provider_logo_scale,
  providerGridConfig: row.provider_grid_config,
});

// PostgREST reports an unknown column as PGRST204; the message names it.
const isMissingColumnError = (error: { code?: string; message?: string }, column: string): boolean =>
  error?.code === 'PGRST204' || (error?.message || '').includes(column);

let warnedAboutSettingsColumn = false;
const warnOnceAboutMissingSettingsColumn = () => {
  if (warnedAboutSettingsColumn) return;
  warnedAboutSettingsColumn = true;
  console.warn(
    '[supabase] The employees table has no template_settings column yet, so template ' +
    'configuration (New Provider, HR Feedback, Hiring, Baby) is still only saved in this ' +
    'browser. Run the migration at the bottom of supabase_schema.sql to fix that.',
  );
};

export const upsertEmployee = async (employee: Employee) => {
  // The three template records (hiring-generic, baby-generic,
  // gaming-generic) used to return here without writing anything, so every
  // setting on the Baby, Hiring and HR Feedback cards lived in one browser's
  // localStorage and nowhere else. They are ordinary rows now; the editor
  // still keeps them out of the employee list by id.

  const row = employeeToRow(employee);
  let { data, error } = await supabase.from('employees').upsert(row).select();

  // The template_settings column arrives with a migration (see
  // supabase_schema.sql). Until that has been run, PostgREST rejects the
  // whole write because of the unknown column -- which would mean this
  // change breaks saving outright on a database that has not been migrated
  // yet. Retry without it instead: the card keeps saving exactly what it
  // saved before, and starts saving the rest the moment the column exists.
  if (error && isMissingColumnError(error, 'template_settings')) {
    warnOnceAboutMissingSettingsColumn();
    const { template_settings, ...withoutSettings } = row;
    ({ data, error } = await supabase.from('employees').upsert(withoutSettings).select());
  }

  if (error) {
    console.error('Error upserting employee:', error);
    throw error;
  }
  return data;
};

export const deleteEmployee = async (id: string) => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

export const fetchHiringImages = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('hiring_images')
    .select('url')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching hiring images:', error);
    return [];
  }

  return data.map((row: any) => row.url).filter((url: string) => !url.includes('baby_images/') && !url.includes('activation_images/'));
};

export const fetchBabyImages = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('hiring_images')
    .select('url')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching baby images:', error);
    return [];
  }

  return data.map((row: any) => row.url).filter((url: string) => url.includes('baby_images/'));
};

export const fetchActivationImages = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('hiring_images')
    .select('url')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching activation images:', error);
    return [];
  }

  return data.map((row: any) => row.url).filter((url: string) => url.includes('activation_images/'));
};

export const addHiringImage = async (url: string) => {
  const { error } = await supabase
    .from('hiring_images')
    .insert([{ url }]);

  if (error) {
    console.error('Error adding hiring image:', error);
    throw error;
  }
};

export const addBabyImage = async (url: string) => {
  const { error } = await supabase
    .from('hiring_images')
    .insert([{ url }]);

  if (error) {
    console.error('Error adding baby image:', error);
    throw error;
  }
};

export const addActivationImage = async (url: string) => {
  const { error } = await supabase
    .from('hiring_images')
    .insert([{ url }]);

  if (error) {
    console.error('Error adding activation image:', error);
    throw error;
  }
};

export const deleteHiringImage = async (url: string) => {
  console.log('Attempting to delete hiring image:', url);
  
  // 1. Delete from the database
  const { error } = await supabase
    .from('hiring_images')
    .delete()
    .eq('url', url);

  if (error) {
    console.error('Error deleting hiring image from DB:', error);
    throw error;
  }

  // 2. Try to delete the actual file from storage to free up space
  try {
    const urlParts = url.split('/EndoCanvas/');
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      console.log('Deleting from storage:', filePath);
      const { error: storageError } = await supabase.storage
        .from('EndoCanvas')
        .remove([filePath]);
        
      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }
    }
  } catch (err) {
    console.error('Failed to parse and delete storage file', err);
  }
};

export const deleteBabyImage = async (url: string) => {
  console.log('Attempting to delete baby image:', url);
  
  // 1. Delete from the database
  const { error } = await supabase
    .from('hiring_images')
    .delete()
    .eq('url', url);

  if (error) {
    console.error('Error deleting baby image from DB:', error);
    throw error;
  }

  // 2. Try to delete the actual file from storage to free up space
  try {
    const urlParts = url.split('/EndoCanvas/');
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      console.log('Deleting from storage:', filePath);
      const { error: storageError } = await supabase.storage
        .from('EndoCanvas')
        .remove([filePath]);
        
      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }
    }
  } catch (err) {
    console.error('Failed to parse and delete storage file', err);
  }
};

export const deleteActivationImage = async (url: string) => {
  console.log('Attempting to delete activation image:', url);
  
  // 1. Delete from the database
  const { error } = await supabase
    .from('hiring_images')
    .delete()
    .eq('url', url);

  if (error) {
    console.error('Error deleting activation image from DB:', error);
    throw error;
  }

  // 2. Try to delete the actual file from storage to free up space
  try {
    const urlParts = url.split('/EndoCanvas/');
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      console.log('Deleting from storage:', filePath);
      const { error: storageError } = await supabase.storage
        .from('EndoCanvas')
        .remove([filePath]);
        
      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }
    }
  } catch (err) {
    console.error('Failed to parse and delete storage file', err);
  }
};

export const uploadHiringImageToStorage = async (file: File): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `hiring-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `hiring_images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('EndoCanvas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error('Error uploading hiring image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('EndoCanvas')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const uploadBabyImageToStorage = async (file: File): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `baby-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `baby_images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('EndoCanvas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error('Error uploading baby image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('EndoCanvas')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const uploadActivationImageToStorage = async (file: File): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `activation-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `activation_images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('EndoCanvas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error('Error uploading activation image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('EndoCanvas')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const uploadEmployeePhoto = async (file: File, employeeId: string): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${employeeId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('EndoCanvas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error('Error uploading photo:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('EndoCanvas')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
