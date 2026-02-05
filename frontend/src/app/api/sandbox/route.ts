/**
 * E2B Sandbox API Routes - Stateless Version
 * 
 * ВАЖНО: Vercel Functions stateless! Каждый request - новый instance.
 * Поэтому мы:
 * 1. Создаём sandbox и возвращаем его ID клиенту
 * 2. Клиент сохраняет sandboxId 
 * 3. При каждом запросе reconnect к sandbox по ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from 'e2b';

// Vercel function config - request longer timeout
// Note: Hobby plan is limited to 10s, Pro plan can go up to 300s
export const maxDuration = 60; // 60 seconds (requires Pro plan)

const E2B_API_KEY = process.env.E2B_API_KEY;

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!E2B_API_KEY) {
    return NextResponse.json(
      { 
        error: 'E2B не настроен',
        message: 'Добавьте E2B_API_KEY в Vercel Environment Variables'
      },
      { status: 503 }
    );
  }

  try {
    switch (action) {
      case 'create':
        return await createSession(request);
      case 'exec':
        return await executeCommand(request);
      case 'upload':
        return await uploadFiles(request);
      case 'expo-start':
        return await startExpo(request);
      case 'expo-status':
        return await getExpoStatus(request);
      case 'expo-stop':
        return await stopExpo(request);
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error(`[E2B] Error in ${action}:`, error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function createSession(request: NextRequest) {
  const { projectId } = await request.json();

  console.log('[E2B] Creating sandbox for project:', projectId);

  // Create E2B sandbox
  const sandbox = await Sandbox.create('base', {
    apiKey: E2B_API_KEY!,
    timeoutMs: 60 * 60 * 1000, // 1 hour timeout
  });

  // Sandbox ID - это ключ для reconnect
  const sandboxId = sandbox.sandboxId;
  
  console.log('[E2B] Sandbox created with ID:', sandboxId);

  // Install Node.js using nvm
  console.log('[E2B] Installing Node.js via nvm...');
  
  const installResult = await sandbox.commands.run(
    'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash && ' +
    'export NVM_DIR="$HOME/.nvm" && ' +
    '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && ' +
    'nvm install 18 && nvm use 18 && node --version',
    { timeoutMs: 180000 }
  );
  
  console.log('[E2B] Node.js installed:', installResult.stdout?.slice(-50));

  // Create .bashrc to auto-load nvm
  await sandbox.files.write('/home/user/.bashrc', `
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
`);

  // Create project directory
  await sandbox.commands.run('mkdir -p /home/user/project');

  console.log('[E2B] Sandbox ready:', sandboxId);

  // Возвращаем sandboxId клиенту - он будет использовать его для reconnect
  return NextResponse.json({
    id: sandboxId, // Это настоящий E2B sandbox ID
    sandboxId: sandboxId,
    status: 'ready',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000,
    ports: {},
  });
}

// Helper to add timeout to any promise
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

// Reconnect to existing sandbox with timeout
async function reconnectSandbox(sandboxId: string): Promise<Sandbox> {
  console.log('[E2B] Reconnecting to sandbox:', sandboxId);
  
  try {
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: E2B_API_KEY!,
      timeoutMs: 8000, // 8 second timeout for connection
    });
    
    console.log('[E2B] Connected! Sandbox ID confirmed:', sandbox.sandboxId);
    return sandbox;
  } catch (error) {
    console.error('[E2B] Failed to reconnect:', error);
    throw error;
  }
}

async function executeCommand(request: NextRequest) {
  const { sessionId, sandboxId, command } = await request.json();
  
  const id = sandboxId || sessionId;
  if (!id) {
    return NextResponse.json({ error: 'sandboxId required' }, { status: 400 });
  }

  const sandbox = await reconnectSandbox(id);

  console.log(`[E2B] Executing: ${command}`);

  try {
    const nvmPrefix = 'source $HOME/.nvm/nvm.sh 2>/dev/null; ';
    const result = await sandbox.commands.run(nvmPrefix + command, {
      timeoutMs: 120000,
    });

    return NextResponse.json({
      exitCode: result.exitCode,
      output: result.stdout + (result.stderr ? '\n' + result.stderr : ''),
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Command failed';
    console.error('[E2B] Command error:', error);
    return NextResponse.json({
      exitCode: 1,
      output: errorMessage,
      error: errorMessage,
    });
  }
}

async function uploadFiles(request: NextRequest) {
  const { sessionId, sandboxId, files } = await request.json();
  
  const id = sandboxId || sessionId;
  if (!id) {
    return NextResponse.json({ error: 'sandboxId required' }, { status: 400 });
  }

  const sandbox = await reconnectSandbox(id);
  const projectDir = '/home/user/project';

  console.log(`[E2B] Uploading ${files.length} files to sandbox ${id}...`);

  // Ensure project directory exists
  await sandbox.commands.run(`mkdir -p ${projectDir}`);

  // Upload each file
  for (const file of files as Array<{ path: string; content: string }>) {
    const filePath = `${projectDir}/${file.path}`;
    
    // Create directory if needed
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (dir) {
      await sandbox.commands.run(`mkdir -p "${dir}"`);
    }
    
    // Write file content
    await sandbox.files.write(filePath, file.content);
    console.log(`[E2B] Wrote file: ${filePath}`);
  }

  // Verify files were written
  const verifyResult = await sandbox.commands.run(`ls -la ${projectDir}/ && cat ${projectDir}/package.json | head -5`, {
    timeoutMs: 10000,
  });
  
  console.log('[E2B] Verify files result:', verifyResult.stdout);
  console.log('[E2B] Verify stderr:', verifyResult.stderr);

  if (verifyResult.exitCode !== 0) {
    console.error('[E2B] File verification failed!');
    return NextResponse.json({ 
      success: false, 
      error: 'Files not properly saved',
      stderr: verifyResult.stderr
    }, { status: 500 });
  }

  console.log('[E2B] Files uploaded and verified successfully');

  return NextResponse.json({ 
    success: true, 
    filesUploaded: files.length,
    projectPath: projectDir,
    sandboxId: id, // Return sandboxId for confirmation
  });
}

async function startExpo(request: NextRequest) {
  const { sessionId, sandboxId } = await request.json();
  
  const id = sandboxId || sessionId;
  if (!id) {
    return NextResponse.json({ error: 'sandboxId required' }, { status: 400 });
  }

  console.log('[E2B] Starting Expo for sandbox:', id);

  let sandbox: Sandbox;
  try {
    sandbox = await reconnectSandbox(id);
  } catch (error) {
    console.error('[E2B] Reconnect failed:', error);
    return NextResponse.json({
      error: 'Sandbox expired or not found',
      message: 'Please create a new sandbox session',
    }, { status: 410 }); // 410 Gone
  }
  
  const projectDir = '/home/user/project';
  
  try {
    // Quick check if package.json exists (with short timeout)
    const checkResult = await sandbox.commands.run(`test -f ${projectDir}/package.json && echo "exists"`, {
      timeoutMs: 3000,
    });
    
    console.log('[E2B] package.json check - exitCode:', checkResult.exitCode);
    
    if (checkResult.exitCode !== 0) {
      return NextResponse.json({
        error: 'Project not found',
        message: 'Please upload project files first. No package.json found.',
      }, { status: 400 });
    }

    // Create a startup script that runs everything in background
    // This avoids Vercel function timeout
    const startupScript = `#!/bin/bash
set -e
cd ${projectDir}
source $HOME/.nvm/nvm.sh 2>/dev/null || true

echo "Starting npm install..." > /tmp/expo-status.log
npm install >> /tmp/expo-install.log 2>&1
echo "npm install complete" >> /tmp/expo-status.log

echo "Installing expo-cli..." >> /tmp/expo-status.log
npm install -g expo-cli @expo/ngrok >> /tmp/expo-install.log 2>&1
echo "expo-cli installed" >> /tmp/expo-status.log

echo "Starting Expo..." >> /tmp/expo-status.log
npx expo start --tunnel --non-interactive > /tmp/expo.log 2>&1 &
echo "Expo started" >> /tmp/expo-status.log
`;

    // Write and execute startup script in background
    await sandbox.files.write('/tmp/start-expo.sh', startupScript);
    
    console.log('[E2B] Starting background install process...');
    
    // Run the script in background (nohup ensures it continues after we disconnect)
    await sandbox.commands.run(
      'chmod +x /tmp/start-expo.sh && nohup /tmp/start-expo.sh > /tmp/startup.log 2>&1 &',
      { timeoutMs: 5000 }
    );

    // Return immediately - client will poll for status
    return NextResponse.json({
      status: 'starting',
      message: 'Installing dependencies and starting Expo (this may take a few minutes)...',
      sandboxId: id,
      success: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[E2B] Expo start error:', error);
    return NextResponse.json({
      error: 'Failed to start Expo',
      message: errorMessage,
    }, { status: 500 });
  }
}

async function getExpoStatus(request: NextRequest) {
  const { sessionId, sandboxId } = await request.json();
  
  const id = sandboxId || sessionId;
  if (!id) {
    return NextResponse.json({ error: 'sandboxId required' }, { status: 400 });
  }

  try {
    const sandbox = await reconnectSandbox(id);
    
    // Check status log
    const statusResult = await sandbox.commands.run('cat /tmp/expo-status.log 2>/dev/null || echo "not started"', {
      timeoutMs: 5000,
    });
    
    const statusLog = statusResult.stdout || '';
    
    // Check if expo is running and has URL
    const expoLogResult = await sandbox.commands.run('cat /tmp/expo.log 2>/dev/null | tail -100', {
      timeoutMs: 5000,
    });
    
    const expoLog = expoLogResult.stdout || '';
    
    // Determine status
    let status = 'starting';
    let message = 'Starting...';
    
    if (statusLog.includes('Starting npm install')) {
      status = 'installing';
      message = 'Installing dependencies...';
    }
    if (statusLog.includes('npm install complete')) {
      status = 'installing-expo';
      message = 'Installing expo-cli...';
    }
    if (statusLog.includes('expo-cli installed')) {
      status = 'starting-expo';
      message = 'Starting Expo server...';
    }
    if (statusLog.includes('Expo started')) {
      status = 'running';
      message = 'Expo is running';
    }
    
    // Look for expo URL in the log
    let expoUrl = '';
    const urlMatch = expoLog.match(/exp:\/\/[^\s\]"]+/) || 
                     expoLog.match(/https:\/\/exp\.host\/[^\s"]+/);
    
    if (urlMatch) {
      expoUrl = urlMatch[0].replace(/[\]\)"]+$/, '');
      status = 'ready';
      message = 'Expo is ready!';
    }
    
    // Check for errors
    if (expoLog.includes('error') || expoLog.includes('Error')) {
      const errorMatch = expoLog.match(/error[:\s].+/i);
      if (errorMatch && !expoUrl) {
        // Only treat as error if we don't have a URL
        status = 'error';
        message = errorMatch[0].slice(0, 200);
      }
    }
    
    // Generate QR code URL if we have expo URL
    const qrCodeUrl = expoUrl 
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(expoUrl)}`
      : '';
    
    return NextResponse.json({
      status,
      message,
      url: expoUrl,
      qrCode: qrCodeUrl,
      log: expoLog.slice(-1000), // Last 1000 chars of log
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'error',
      message: errorMessage,
    }, { status: 500 });
  }
}

async function stopExpo(request: NextRequest) {
  const { sessionId, sandboxId } = await request.json();
  
  const id = sandboxId || sessionId;
  if (!id) {
    return NextResponse.json({ success: true });
  }

  try {
    const sandbox = await reconnectSandbox(id);
    await sandbox.commands.run('pkill -f expo || true');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sandboxId = searchParams.get('sandboxId') || searchParams.get('sessionId');

  if (!sandboxId) {
    return NextResponse.json({ error: 'sandboxId required' }, { status: 400 });
  }

  try {
    const sandbox = await reconnectSandbox(sandboxId);
    await sandbox.kill();
    console.log('[E2B] Sandbox killed:', sandboxId);
  } catch {
    // Sandbox might already be dead
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sandboxId = searchParams.get('sandboxId');

  if (!sandboxId) {
    return NextResponse.json({ 
      configured: !!E2B_API_KEY,
    });
  }

  try {
    const sandbox = await reconnectSandbox(sandboxId);
    const result = await sandbox.commands.run('echo "alive"');
    
    return NextResponse.json({
      id: sandboxId,
      status: result.exitCode === 0 ? 'ready' : 'error',
    });
  } catch {
    return NextResponse.json({ 
      id: sandboxId,
      status: 'expired' 
    });
  }
}
