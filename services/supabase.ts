import { createClient } from '@supabase/supabase-js';
import { Employee } from '../types';

// Using the provided keys. 
// NOTE: Standard Supabase setup requires a Project URL (e.g., https://xyz.supabase.co) and an Anon Key (JWT).
// The provided keys look different. Please ensure you have the correct Project URL and Anon Key.
// For now, we will use placeholders for the URL and the provided key as the Anon Key.

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7HoIOpT8gj8LvBHVwbltiA_gYquJTgH';

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
