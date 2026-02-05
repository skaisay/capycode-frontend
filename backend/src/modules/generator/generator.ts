import { openai, AI_MODEL, SYSTEM_PROMPTS } from '../../lib/openai.js';
import type { 
  GenerationResult, 
  ProjectFile, 
  ExpoConfig 
} from '../../types/database.js';
import { ProjectTemplates, type ProjectTemplate } from './templates.js';
import { nanoid } from 'nanoid';

interface GenerationOptions {
  style: 'minimal' | 'detailed' | 'enterprise';
  features: string[];
}

interface StreamCallbacks {
  onProgress?: (progress: { stage: string; percent: number }) => Promise<void>;
  onFile?: (file: ProjectFile) => Promise<void>;
  onComplete?: (result: GenerationResult) => Promise<void>;
}

export class AICodeGenerator {
  private maxRetries = 3;

  /**
   * Generate a complete React Native project from a natural language prompt
   */
  async generateProject(prompt: string, options: GenerationOptions): Promise<GenerationResult> {
    const enhancedPrompt = this.buildEnhancedPrompt(prompt, options);

    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.projectGenerator },
          { role: 'user', content: enhancedPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 16000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { success: false, files: [], dependencies: {}, devDependencies: {}, expoConfig: {} as ExpoConfig, errors: ['Empty response from AI'] };
      }

      const parsed = JSON.parse(content);
      
      // Validate and enhance the generated structure
      const files = this.validateAndEnhanceFiles(parsed.files || []);
      const expoConfig = this.buildExpoConfig(parsed.projectName, parsed.expoConfig);
      
      // Add essential files if missing
      const completeFiles = this.ensureEssentialFiles(files, parsed.projectName, expoConfig, parsed.dependencies || {});

      return {
        success: true,
        projectName: parsed.projectName || `app-${nanoid(6)}`,
        files: completeFiles,
        dependencies: this.mergeDependencies(parsed.dependencies || {}),
        devDependencies: this.mergeDevDependencies(parsed.devDependencies || {}),
        expoConfig,
      };
    } catch (err) {
      console.error('AI generation error:', err);
      return { 
        success: false, 
        files: [], 
        dependencies: {}, 
        devDependencies: {}, 
        expoConfig: {} as ExpoConfig, 
        errors: [(err as Error).message] 
      };
    }
  }

  /**
   * Generate a single component
   */
  async generateComponent(
    prompt: string, 
    componentType: string, 
    existingFiles: ProjectFile[]
  ): Promise<GenerationResult> {
    const contextFiles = existingFiles.slice(0, 5).map(f => `${f.path}: ${f.type}`).join('\n');

    const enhancedPrompt = `
Generate a ${componentType} component based on this request:
"${prompt}"

Existing project structure:
${contextFiles}

Follow the Atomic Design pattern. The component should be reusable and well-documented.
`;

    try {
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.componentGenerator },
          { role: 'user', content: enhancedPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { success: false, files: [], dependencies: {}, devDependencies: {}, expoConfig: {} as ExpoConfig, errors: ['Empty response'] };
      }

      const parsed = JSON.parse(content);

      return {
        success: true,
        files: [{
          path: parsed.path,
          content: parsed.content,
          type: 'component',
        }],
        dependencies: parsed.dependencies || {},
        devDependencies: {},
        expoConfig: {} as ExpoConfig,
      };
    } catch (err) {
      return { 
        success: false, 
        files: [], 
        dependencies: {}, 
        devDependencies: {}, 
        expoConfig: {} as ExpoConfig, 
        errors: [(err as Error).message] 
      };
    }
  }

  /**
   * Generate project from template with customizations
   */
  async generateFromTemplate(
    template: ProjectTemplate, 
    customizations: Record<string, unknown>
  ): Promise<GenerationResult> {
    const prompt = `
Using this template as a base: ${template.name}
Template description: ${template.description}

Apply these customizations:
${JSON.stringify(customizations, null, 2)}

Generate a complete project with all necessary files.
`;

    return this.generateProject(prompt, {
      style: 'detailed',
      features: template.features,
    });
  }

  /**
   * Stream generation with progress updates
   */
  async generateProjectStream(
    prompt: string, 
    options: GenerationOptions & StreamCallbacks
  ): Promise<void> {
    const { onProgress, onFile, onComplete, ...genOptions } = options;

    await onProgress?.({ stage: 'analyzing', percent: 10 });

    // Analyze the prompt to determine structure
    const structure = await this.analyzePrompt(prompt);
    await onProgress?.({ stage: 'planning', percent: 20 });

    // Generate files in stages
    const files: ProjectFile[] = [];
    const stages = ['config', 'components', 'screens', 'navigation', 'services'];
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      await onProgress?.({ stage: `generating_${stage}`, percent: 20 + (i + 1) * 15 });

      const stageFiles = await this.generateStage(prompt, stage, structure);
      for (const file of stageFiles) {
        files.push(file);
        await onFile?.(file);
      }
    }

    await onProgress?.({ stage: 'finalizing', percent: 95 });

    const expoConfig = this.buildExpoConfig(structure.projectName, {});
    const result: GenerationResult = {
      success: true,
      projectName: structure.projectName,
      files,
      dependencies: this.mergeDependencies(structure.dependencies),
      devDependencies: this.mergeDevDependencies({}),
      expoConfig,
    };

    await onProgress?.({ stage: 'complete', percent: 100 });
    await onComplete?.(result);
  }

  private async analyzePrompt(prompt: string): Promise<{
    projectName: string;
    type: string;
    features: string[];
    dependencies: Record<string, string>;
  }> {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Analyze this app request and return JSON with:
{
  "projectName": "suggested-name",
  "type": "e-commerce|social|utility|game|productivity|other",
  "features": ["list", "of", "features"],
  "dependencies": {"needed": "packages"}
}`
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }

  private async generateStage(
    prompt: string, 
    stage: string, 
    structure: { projectName: string; features: string[] }
  ): Promise<ProjectFile[]> {
    const stagePrompt = `
For a ${structure.projectName} app with features: ${structure.features.join(', ')}

Generate ONLY the ${stage} files for this app idea:
"${prompt}"

Return JSON: { "files": [{ "path": "...", "content": "...", "type": "..." }] }
`;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.projectGenerator },
        { role: 'user', content: stagePrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{"files":[]}');
    return parsed.files || [];
  }

  private buildEnhancedPrompt(prompt: string, options: GenerationOptions): string {
    const styleGuide = {
      minimal: 'Generate minimal, essential code only. Avoid unnecessary abstractions.',
      detailed: 'Generate comprehensive code with proper error handling, loading states, and documentation.',
      enterprise: 'Generate enterprise-grade code with full testing setup, CI/CD configs, and documentation.',
    };

    return `
Create a React Native mobile application based on this description:
"${prompt}"

Style: ${styleGuide[options.style]}
${options.features.length > 0 ? `Include these features: ${options.features.join(', ')}` : ''}

Generate ALL necessary files for a complete, runnable Expo project.
Include proper TypeScript types, navigation setup, and responsive styling.
`;
  }

  private validateAndEnhanceFiles(files: ProjectFile[]): ProjectFile[] {
    return files.map(file => ({
      ...file,
      path: file.path.startsWith('/') ? file.path.slice(1) : file.path,
      type: file.type || this.inferFileType(file.path),
    }));
  }

  private inferFileType(path: string): ProjectFile['type'] {
    if (path.includes('/screens/') || path.includes('Screen.')) return 'screen';
    if (path.includes('/components/')) return 'component';
    if (path.includes('/hooks/')) return 'hook';
    if (path.includes('/services/') || path.includes('/api/')) return 'service';
    if (path.includes('/types/')) return 'type';
    if (path.includes('/styles/')) return 'style';
    if (path.includes('/utils/')) return 'util';
    if (path.match(/\.(json|config)/)) return 'config';
    return 'component';
  }

  private buildExpoConfig(projectName: string, partial: Partial<ExpoConfig>): ExpoConfig {
    const slug = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    return {
      name: projectName,
      slug,
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'automatic',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: `com.codevibe.${slug}`,
        buildNumber: '1',
      },
      android: {
        package: `com.codevibe.${slug}`,
        versionCode: 1,
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
      },
      plugins: ['expo-router'],
      ...partial,
    };
  }

  private ensureEssentialFiles(
    files: ProjectFile[], 
    projectName: string, 
    expoConfig: ExpoConfig,
    dependencies: Record<string, string>
  ): ProjectFile[] {
    const existingPaths = new Set(files.map(f => f.path));
    const essential: ProjectFile[] = [...files];

    // App.tsx
    if (!existingPaths.has('App.tsx')) {
      essential.push({
        path: 'App.tsx',
        type: 'component',
        content: `import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
`,
      });
    }

    // app.json
    if (!existingPaths.has('app.json')) {
      essential.push({
        path: 'app.json',
        type: 'config',
        content: JSON.stringify({ expo: expoConfig }, null, 2),
      });
    }

    // package.json
    if (!existingPaths.has('package.json')) {
      essential.push({
        path: 'package.json',
        type: 'config',
        content: JSON.stringify({
          name: projectName.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          main: 'node_modules/expo/AppEntry.js',
          scripts: {
            start: 'expo start',
            android: 'expo start --android',
            ios: 'expo start --ios',
            web: 'expo start --web',
          },
          dependencies: this.mergeDependencies(dependencies),
          devDependencies: this.mergeDevDependencies({}),
          private: true,
        }, null, 2),
      });
    }

    // tsconfig.json
    if (!existingPaths.has('tsconfig.json')) {
      essential.push({
        path: 'tsconfig.json',
        type: 'config',
        content: JSON.stringify({
          extends: 'expo/tsconfig.base',
          compilerOptions: {
            strict: true,
            baseUrl: '.',
            paths: {
              '@/*': ['src/*'],
            },
          },
          include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
        }, null, 2),
      });
    }

    // babel.config.js
    if (!existingPaths.has('babel.config.js')) {
      essential.push({
        path: 'babel.config.js',
        type: 'config',
        content: `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './src',
        },
      }],
    ],
  };
};
`,
      });
    }

    return essential;
  }

  private mergeDependencies(custom: Record<string, string>): Record<string, string> {
    return {
      'expo': '~50.0.0',
      'expo-status-bar': '~1.11.0',
      'react': '18.2.0',
      'react-native': '0.73.0',
      'react-native-safe-area-context': '^4.8.0',
      '@react-navigation/native': '^6.1.0',
      '@react-navigation/native-stack': '^6.9.0',
      'react-native-screens': '~3.29.0',
      ...custom,
    };
  }

  private mergeDevDependencies(custom: Record<string, string>): Record<string, string> {
    return {
      '@babel/core': '^7.23.0',
      '@types/react': '~18.2.0',
      'typescript': '^5.3.0',
      'babel-plugin-module-resolver': '^5.0.0',
      ...custom,
    };
  }
}
