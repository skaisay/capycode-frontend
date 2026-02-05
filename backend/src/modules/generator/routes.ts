import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AICodeGenerator } from './generator.js';
import { ProjectTemplates } from './templates.js';
import { supabase } from '../../lib/supabase.js';
import type { GenerationRequest } from '../../types/database.js';

export const generatorRoutes = new Hono();

// Schema validation
const generateProjectSchema = z.object({
  prompt: z.string().min(10).max(5000),
  type: z.enum(['full_project', 'component', 'screen', 'feature']).default('full_project'),
  projectId: z.string().uuid().optional(),
  context: z.object({
    style: z.enum(['minimal', 'detailed', 'enterprise']).optional(),
    features: z.array(z.string()).optional(),
  }).optional(),
});

const generateComponentSchema = z.object({
  prompt: z.string().min(5).max(2000),
  projectId: z.string().uuid(),
  componentType: z.enum(['atom', 'molecule', 'organism', 'template']).default('molecule'),
});

// Generate new project from prompt
generatorRoutes.post('/project', zValidator('json', generateProjectSchema), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<GenerationRequest>();

  try {
    const generator = new AICodeGenerator();
    
    // Start generation
    const result = await generator.generateProject(body.prompt, {
      style: body.context?.style || 'detailed',
      features: body.context?.features || [],
    });

    if (!result.success) {
      return c.json({ error: 'Generation failed', details: result.errors }, 400);
    }

    // Save to database
    const { data: project, error: dbError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: result.projectName!,
        description: body.prompt,
        slug: result.projectName!.toLowerCase().replace(/\s+/g, '-'),
        files: result.files,
        expo_config: result.expoConfig,
        dependencies: result.dependencies,
        dev_dependencies: result.devDependencies,
        status: 'ready',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return c.json({ error: 'Failed to save project' }, 500);
    }

    return c.json({
      success: true,
      project,
      filesGenerated: result.files.length,
    });
  } catch (err) {
    console.error('Generation error:', err);
    return c.json({ error: 'Generation failed', message: (err as Error).message }, 500);
  }
});

// Generate component for existing project
generatorRoutes.post('/component', zValidator('json', generateComponentSchema), async (c) => {
  const user = c.get('user');
  const { prompt, projectId, componentType } = await c.req.json();

  try {
    // Get existing project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const generator = new AICodeGenerator();
    const result = await generator.generateComponent(prompt, componentType, project.files);

    if (!result.success) {
      return c.json({ error: 'Component generation failed' }, 400);
    }

    // Add new files to project
    const updatedFiles = [...project.files, ...result.files];
    const updatedDeps = { ...project.dependencies, ...result.dependencies };

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        files: updatedFiles,
        dependencies: updatedDeps,
      })
      .eq('id', projectId);

    if (updateError) {
      return c.json({ error: 'Failed to update project' }, 500);
    }

    return c.json({
      success: true,
      newFiles: result.files,
      totalFiles: updatedFiles.length,
    });
  } catch (err) {
    console.error('Component generation error:', err);
    return c.json({ error: 'Generation failed' }, 500);
  }
});

// Get available templates
generatorRoutes.get('/templates', async (c) => {
  return c.json({
    templates: ProjectTemplates.getAll(),
  });
});

// Generate from template
generatorRoutes.post('/from-template', async (c) => {
  const user = c.get('user');
  const { templateId, customizations } = await c.req.json();

  try {
    const template = ProjectTemplates.getById(templateId);
    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    const generator = new AICodeGenerator();
    const result = await generator.generateFromTemplate(template, customizations);

    if (!result.success) {
      return c.json({ error: 'Template generation failed' }, 400);
    }

    // Save to database
    const { data: project, error: dbError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: result.projectName!,
        description: `Generated from template: ${template.name}`,
        slug: result.projectName!.toLowerCase().replace(/\s+/g, '-'),
        files: result.files,
        expo_config: result.expoConfig,
        dependencies: result.dependencies,
        dev_dependencies: result.devDependencies,
        status: 'ready',
      })
      .select()
      .single();

    if (dbError) {
      return c.json({ error: 'Failed to save project' }, 500);
    }

    return c.json({
      success: true,
      project,
    });
  } catch (err) {
    console.error('Template generation error:', err);
    return c.json({ error: 'Generation failed' }, 500);
  }
});

// Stream generation (for real-time updates)
generatorRoutes.post('/stream', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<GenerationRequest>();

  // Set up SSE
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const generator = new AICodeGenerator();

  return c.streamText(async (stream) => {
    try {
      await generator.generateProjectStream(body.prompt, {
        style: body.context?.style || 'detailed',
        features: body.context?.features || [],
        onProgress: async (progress) => {
          await stream.write(`data: ${JSON.stringify(progress)}\n\n`);
        },
        onFile: async (file) => {
          await stream.write(`data: ${JSON.stringify({ type: 'file', file })}\n\n`);
        },
        onComplete: async (result) => {
          // Save to database
          const { data: project } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              name: result.projectName!,
              description: body.prompt,
              slug: result.projectName!.toLowerCase().replace(/\s+/g, '-'),
              files: result.files,
              expo_config: result.expoConfig,
              dependencies: result.dependencies,
              dev_dependencies: result.devDependencies,
              status: 'ready',
            })
            .select()
            .single();

          await stream.write(`data: ${JSON.stringify({ type: 'complete', project })}\n\n`);
        },
      });
    } catch (err) {
      await stream.write(`data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`);
    }
  });
});
