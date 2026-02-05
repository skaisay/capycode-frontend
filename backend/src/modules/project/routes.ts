import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { supabase } from '../../lib/supabase.js';

export const projectRoutes = new Hono();

// List user's projects
projectRoutes.get('/', async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    const { data: projects, error, count } = await supabase
      .from('projects')
      .select('id, name, slug, description, status, created_at, updated_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return c.json({ error: 'Failed to fetch projects' }, 500);
    }

    return c.json({
      projects,
      total: count,
      limit,
      offset,
    });
  } catch (err) {
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

// Get single project
projectRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json({ project });
  } catch (err) {
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

// Update project
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.string(),
  })).optional(),
  expo_config: z.record(z.unknown()).optional(),
  dependencies: z.record(z.string()).optional(),
});

projectRoutes.put('/:id', zValidator('json', updateProjectSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const updates = await c.req.json();

  try {
    // Check ownership
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return c.json({ error: 'Failed to update project' }, 500);
    }

    return c.json({ project });
  } catch (err) {
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

// Delete project
projectRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return c.json({ error: 'Failed to delete project' }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// Get project files
projectRoutes.get('/:id/files', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('files')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Build file tree
    const fileTree = buildFileTree(project.files);

    return c.json({
      files: project.files,
      tree: fileTree,
    });
  } catch (err) {
    return c.json({ error: 'Failed to fetch files' }, 500);
  }
});

// Update single file
projectRoutes.put('/:id/files/:path', async (c) => {
  const user = c.get('user');
  const { id, path } = c.req.param();
  const { content } = await c.req.json();

  try {
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('files')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Update the specific file
    const decodedPath = decodeURIComponent(path);
    const updatedFiles = project.files.map((f: { path: string; content: string }) => 
      f.path === decodedPath ? { ...f, content } : f
    );

    const { error: updateError } = await supabase
      .from('projects')
      .update({ files: updatedFiles })
      .eq('id', id);

    if (updateError) {
      return c.json({ error: 'Failed to update file' }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to update file' }, 500);
  }
});

// Add new file
projectRoutes.post('/:id/files', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { path, content, type } = await c.req.json();

  try {
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('files')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Check if file already exists
    if (project.files.some((f: { path: string }) => f.path === path)) {
      return c.json({ error: 'File already exists' }, 400);
    }

    const updatedFiles = [...project.files, { path, content, type: type || 'component' }];

    const { error: updateError } = await supabase
      .from('projects')
      .update({ files: updatedFiles })
      .eq('id', id);

    if (updateError) {
      return c.json({ error: 'Failed to add file' }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to add file' }, 500);
  }
});

// Delete file
projectRoutes.delete('/:id/files/:path', async (c) => {
  const user = c.get('user');
  const { id, path } = c.req.param();

  try {
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('files')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const decodedPath = decodeURIComponent(path);
    const updatedFiles = project.files.filter((f: { path: string }) => f.path !== decodedPath);

    const { error: updateError } = await supabase
      .from('projects')
      .update({ files: updatedFiles })
      .eq('id', id);

    if (updateError) {
      return c.json({ error: 'Failed to delete file' }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete file' }, 500);
  }
});

// Export project as ZIP
projectRoutes.get('/:id/export', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Return file data for client-side ZIP creation
    return c.json({
      name: project.slug,
      files: project.files,
      appJson: { expo: project.expo_config },
      packageJson: {
        name: project.slug,
        version: project.expo_config.version || '1.0.0',
        main: 'node_modules/expo/AppEntry.js',
        scripts: {
          start: 'expo start',
          android: 'expo start --android',
          ios: 'expo start --ios',
          web: 'expo start --web',
        },
        dependencies: project.dependencies,
        devDependencies: project.dev_dependencies,
        private: true,
      },
    });
  } catch (err) {
    return c.json({ error: 'Failed to export project' }, 500);
  }
});

// Clone project
projectRoutes.post('/:id/clone', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { name } = await c.req.json();

  try {
    const { data: original, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !original) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const newName = name || `${original.name} (Copy)`;
    const newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data: cloned, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: newName,
        slug: newSlug,
        description: original.description,
        files: original.files,
        expo_config: { ...original.expo_config, name: newName, slug: newSlug },
        dependencies: original.dependencies,
        dev_dependencies: original.dev_dependencies,
        status: 'ready',
      })
      .select()
      .single();

    if (insertError) {
      return c.json({ error: 'Failed to clone project' }, 500);
    }

    return c.json({ project: cloned });
  } catch (err) {
    return c.json({ error: 'Failed to clone project' }, 500);
  }
});

// Helper function to build file tree
interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileTreeNode[];
}

function buildFileTree(files: Array<{ path: string; type: string }>): FileTreeNode[] {
  const tree: FileTreeNode[] = [];
  const pathMap = new Map<string, FileTreeNode>();

  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!pathMap.has(currentPath)) {
        const isFile = i === parts.length - 1;
        const node: FileTreeNode = {
          name: part,
          type: isFile ? 'file' : 'folder',
          path: currentPath,
          children: isFile ? undefined : [],
        };

        pathMap.set(currentPath, node);

        if (parentPath) {
          const parent = pathMap.get(parentPath);
          parent?.children?.push(node);
        } else {
          tree.push(node);
        }
      }
    }
  }

  return tree;
}
