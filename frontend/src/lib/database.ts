import { getSupabaseClient } from './supabase';

// Types
export interface DBProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  files: ProjectFile[];
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface DBApiKey {
  id: string;
  user_id: string;
  name: string;
  key_preview: string; // Only show last 4 chars
  encrypted_key: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  created_at: string;
  last_used_at: string | null;
}

export interface UserStats {
  total_projects: number;
  total_generations: number;
  projects_this_month: number;
  last_active: string | null;
}

// ============ PROJECTS ============

export async function getProjects(): Promise<DBProject[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
  
  return data || [];
}

export async function getProject(id: string): Promise<DBProject | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching project:', error);
    throw error;
  }
  
  return data;
}

export async function createProject(project: {
  name: string;
  description?: string;
  files?: ProjectFile[];
}): Promise<DBProject> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: project.name,
      description: project.description || null,
      files: project.files || [],
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }
  
  return data;
}

export async function updateProject(id: string, updates: {
  name?: string;
  description?: string;
  files?: ProjectFile[];
}): Promise<DBProject> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }
  
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

// ============ API KEYS ============

export async function getApiKeys(): Promise<DBApiKey[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, key_preview, encrypted_key, provider, created_at, last_used_at')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching API keys:', error);
    throw error;
  }
  
  return data || [];
}

export async function createApiKey(apiKey: {
  name: string;
  key: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
}): Promise<DBApiKey> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Only store preview (last 4 chars) - in production, encrypt the full key
  const keyPreview = '•'.repeat(apiKey.key.length - 4) + apiKey.key.slice(-4);
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name: apiKey.name,
      key_preview: keyPreview,
      encrypted_key: apiKey.key, // In production, encrypt this!
      provider: apiKey.provider,
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
  
  return data;
}

export async function deleteApiKey(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting API key:', error);
    throw error;
  }
}

// ============ USER STATS ============

export async function getUserStats(): Promise<UserStats> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get total projects
  const { count: totalProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
    
  // Get projects this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const { count: projectsThisMonth } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString());
    
  // Get last project update
  const { data: lastProject } = await supabase
    .from('projects')
    .select('updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
    
  // Get generations count from user_stats table (if exists)
  let totalGenerations = 0;
  try {
    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('total_generations')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!error && stats) {
      totalGenerations = stats.total_generations || 0;
    }
  } catch {
    // Table might not exist yet or other error - silently ignore
    console.log('user_stats table not available');
  }
  
  return {
    total_projects: totalProjects || 0,
    total_generations: totalGenerations,
    projects_this_month: projectsThisMonth || 0,
    last_active: lastProject?.updated_at || null,
  };
}

// ============ INCREMENT GENERATION COUNT ============

export async function incrementGenerationCount(): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  try {
    // Upsert user stats
    await supabase.rpc('increment_generations', { p_user_id: user.id });
  } catch (error) {
    console.error('Error incrementing generation count:', error);
  }
}
