import { createClient } from '@supabase/supabase-js';
import { Employee } from '../types';

// Using the provided keys. 
// NOTE: Standard Supabase setup requires a Project URL (e.g., https://xyz.supabase.co) and an Anon Key (JWT).
// The provided keys look different. Please ensure you have the correct Project URL and Anon Key.
// For now, we will use placeholders for the URL and the provided key as the Anon Key.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a dummy client if URL is missing to prevent crash during dev/build
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const fetchEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }

  return data.map((row: any) => ({
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
        y: parseFloat(row.photo_position_y) || 0 
    },
    // Calculate tenure on the fly or store it? The frontend calculates it.
    tenure: '', // Will be calculated by frontend helper
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
    providerGridConfig: row.provider_grid_config
  }));
};

export const upsertEmployee = async (employee: Employee) => {
  const { data, error } = await supabase
    .from('employees')
    .upsert({
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
      updated_at: new Date().toISOString()
    })
    .select();

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

  return data.map((row: any) => row.url).filter((url: string) => !url.includes('baby_images/'));
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
