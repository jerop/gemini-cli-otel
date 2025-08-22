#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use current working directory as project root (where user is running gemini)
const projectRoot = process.cwd();

class TelemetryManager {
  constructor() {
    this.pidDir = path.join(os.homedir(), '.gemini', 'tmp', 'telemetry-pids');
    this.scriptsDir = path.join(
      os.homedir(),
      '.gemini',
      'tmp',
      'telemetry-scripts',
    );
    this.githubRepo = 'google-gemini/gemini-cli';
    this.githubBranch = 'main';
    this.ensureDirectories();
  }

  ensureDirectories() {
    for (const dir of [this.pidDir, this.scriptsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async downloadScript(scriptName) {
    const scriptPath = path.join(this.scriptsDir, scriptName);
    const url = `https://raw.githubusercontent.com/${this.githubRepo}/${this.githubBranch}/scripts/${scriptName}`;

    try {
      console.log(`📥 Downloading ${scriptName} from GitHub...`);
      execSync(`curl -fsSL -o "${scriptPath}" "${url}"`, { stdio: 'pipe' });

      // Also download the utility script if it's the main telemetry script
      if (
        scriptName === 'telemetry_gcp.js' ||
        scriptName === 'local_telemetry.js'
      ) {
        const utilsPath = path.join(this.scriptsDir, 'telemetry_utils.js');
        const utilsUrl = `https://raw.githubusercontent.com/${this.githubRepo}/${this.githubBranch}/scripts/telemetry_utils.js`;
        console.log(`📥 Downloading telemetry_utils.js from GitHub...`);
        execSync(`curl -fsSL -o "${utilsPath}" "${utilsUrl}"`, {
          stdio: 'pipe',
        });

        // Fix the projectRoot in telemetry_utils.js to use the current working directory
        this.patchTelemetryUtils(utilsPath);
      }

      return scriptPath;
    } catch (error) {
      console.error(`❌ Failed to download ${scriptName}: ${error.message}`);
      throw error;
    }
  }

  patchTelemetryUtils(utilsPath) {
    try {
      let content = fs.readFileSync(utilsPath, 'utf8');
      
      // Replace the projectRoot calculation to use the current working directory
      content = content.replace(
        'const projectRoot = path.resolve(__dirname, \'..\');',
        `const projectRoot = '${projectRoot}';`
      );
      
      fs.writeFileSync(utilsPath, content);
    } catch (error) {
      console.warn(`⚠️  Failed to patch telemetry_utils.js: ${error.message}`);
    }
  }

  async startGcp(projectId) {
    if (this.isRunning('gcp')) {
      console.log('🟡 GCP telemetry collector is already running');
      return;
    }

    // Ensure the current project has telemetry configuration
    this.ensureProjectTelemetryConfig('gcp');

    // Download the latest telemetry script from GitHub
    const scriptPath = await this.downloadScript('telemetry_gcp.js');

    // Set environment variable for the script
    const env = {
      ...process.env,
      OTLP_GOOGLE_CLOUD_PROJECT: projectId,
    };

    console.log(
      `🚀 Starting GCP telemetry collector for project: ${projectId}`,
    );

    const logFile = path.join(this.pidDir, 'gcp-telemetry.log');
    const logFd = fs.openSync(logFile, 'a');

    const childProcess = spawn('node', [scriptPath], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: env,
      cwd: projectRoot, // Use the project root as working directory so telemetry script can find .gemini
    });

    childProcess.unref();

    const pidFile = path.join(this.pidDir, 'gcp.pid');
    fs.writeFileSync(pidFile, childProcess.pid.toString());

    console.log(`🟢 Started GCP telemetry collector (PID: ${childProcess.pid})`);
    console.log(`📋 Log file: ${logFile}`);
    console.log(
      `📊 View telemetry in Google Cloud Console for project: ${projectId}`,
    );
  }

  async startLocal(outfile) {
    if (this.isRunning('local')) {
      console.log('🟡 Local telemetry collector is already running');
      return;
    }

    // Download the latest telemetry script from GitHub
    const scriptPath = await this.downloadScript('local_telemetry.js');

    console.log('🚀 Starting local telemetry collector');

    const logFile = path.join(this.pidDir, 'local-telemetry.log');
    const logFd = fs.openSync(logFile, 'a');

    // Set environment for outfile if provided
    const env = { ...process.env };
    if (outfile) {
      // We'll modify the settings to include the outfile
      this.updateSettingsForOutfile(outfile);
    }

    const childProcess = spawn('node', [scriptPath], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: env,
      cwd: projectRoot, // Use the project root as working directory so telemetry script can find .gemini
    });

    childProcess.unref();

    const pidFile = path.join(this.pidDir, 'local.pid');
    fs.writeFileSync(pidFile, childProcess.pid.toString());

    console.log(`🟢 Started local telemetry collector (PID: ${childProcess.pid})`);
    console.log(`📋 Log file: ${logFile}`);
    console.log(`🌐 Jaeger UI: http://localhost:16686`);
    if (outfile) {
      console.log(`📄 Telemetry output: ${outfile}`);
    }
  }

  stop() {
    let stopped = false;

    for (const type of ['gcp', 'local']) {
      if (this.isRunning(type)) {
        const pidFile = path.join(this.pidDir, `${type}.pid`);
        const pid = fs.readFileSync(pidFile, 'utf8').trim();

        try {
          // Kill the process group to ensure all child processes are terminated
          process.kill(-parseInt(pid), 'SIGTERM');
          fs.unlinkSync(pidFile);
          console.log(`🔴 Stopped ${type} telemetry collector (PID: ${pid})`);
          stopped = true;
        } catch (e) {
          try {
            // Fallback to killing just the process
            process.kill(parseInt(pid), 'SIGTERM');
            fs.unlinkSync(pidFile);
            console.log(`🔴 Stopped ${type} telemetry collector (PID: ${pid})`);
            stopped = true;
          } catch (e2) {
            console.log(`⚠️  ${type} collector process ${pid} not found`);
            fs.unlinkSync(pidFile);
          }
        }
      }
    }

    if (!stopped) {
      console.log('🟡 No telemetry collectors were running');
    }
  }

  status() {
    const gcpRunning = this.isRunning('gcp');
    const localRunning = this.isRunning('local');

    console.log('📊 Telemetry Collector Status:');
    console.log(`  GCP Collector: ${gcpRunning ? '🟢 Running' : '🔴 Stopped'}`);
    console.log(
      `  Local Collector: ${localRunning ? '🟢 Running' : '🔴 Stopped'}`,
    );

    if (gcpRunning) {
      const pid = fs
        .readFileSync(path.join(this.pidDir, 'gcp.pid'), 'utf8')
        .trim();
      const logFile = path.join(this.pidDir, 'gcp-telemetry.log');
      console.log(`    GCP PID: ${pid}, Log: ${logFile}`);
    }

    if (localRunning) {
      const pid = fs
        .readFileSync(path.join(this.pidDir, 'local.pid'), 'utf8')
        .trim();
      const logFile = path.join(this.pidDir, 'local-telemetry.log');
      console.log(`    Local PID: ${pid}, Log: ${logFile}`);
      console.log(`    Jaeger UI: http://localhost:16686`);
    }
  }

  isRunning(type) {
    const pidFile = path.join(this.pidDir, `${type}.pid`);

    if (!fs.existsSync(pidFile)) {
      return false;
    }

    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
      process.kill(pid, 0); // Check if process exists
      return true;
    } catch (e) {
      // Process doesn't exist, clean up stale PID file
      fs.unlinkSync(pidFile);
      return false;
    }
  }

  updateSettingsForOutfile(outfile) {
    const workspaceSettingsFile = path.join(
      projectRoot,
      '.gemini',
      'settings.json',
    );

    let settings = {};
    if (fs.existsSync(workspaceSettingsFile)) {
      try {
        const content = fs.readFileSync(workspaceSettingsFile, 'utf8');
        const cleanContent = content.replace(/\/\/[^\n]*/g, '');
        settings = JSON.parse(cleanContent);
      } catch (e) {
        console.warn(`⚠️  Could not parse settings file: ${e.message}`);
      }
    }

    if (!settings.telemetry) {
      settings.telemetry = {};
    }

    // Configure for local file output
    settings.telemetry.enabled = true;
    settings.telemetry.target = 'local';
    settings.telemetry.otlpEndpoint = '';
    settings.telemetry.outfile = outfile;
    settings.sandbox = false;

    // Ensure .gemini directory exists
    const geminiDir = path.dirname(workspaceSettingsFile);
    if (!fs.existsSync(geminiDir)) {
      fs.mkdirSync(geminiDir, { recursive: true });
    }

    try {
      fs.writeFileSync(
        workspaceSettingsFile,
        JSON.stringify(settings, null, 2),
      );
      console.log(`⚙️  Updated telemetry settings for outfile: ${outfile}`);
    } catch (e) {
      console.error(`❌ Failed to update settings: ${e.message}`);
    }
  }

  ensureProjectTelemetryConfig(target) {
    const workspaceSettingsFile = path.join(
      projectRoot,
      '.gemini',
      'settings.json',
    );

    // Ensure .gemini directory exists
    const geminiDir = path.dirname(workspaceSettingsFile);
    if (!fs.existsSync(geminiDir)) {
      fs.mkdirSync(geminiDir, { recursive: true });
    }

    // Create or update settings for telemetry
    let settings = {};
    if (fs.existsSync(workspaceSettingsFile)) {
      try {
        const content = fs.readFileSync(workspaceSettingsFile, 'utf8');
        const cleanContent = content.replace(/\/\/[^\n]*/g, '');
        settings = JSON.parse(cleanContent);
      } catch (e) {
        console.warn(`⚠️  Could not parse existing settings file: ${e.message}`);
      }
    }

    if (!settings.telemetry) {
      settings.telemetry = {};
    }

    settings.telemetry.enabled = true;
    settings.telemetry.target = target;
    settings.sandbox = false;

    try {
      fs.writeFileSync(
        workspaceSettingsFile,
        JSON.stringify(settings, null, 2),
      );
    } catch (e) {
      console.error(`❌ Failed to create telemetry settings: ${e.message}`);
    }
  }
}

// CLI interface
const manager = new TelemetryManager();
const command = process.argv[2];
const args = process.argv.slice(3);

try {
  switch (command) {
    case 'start-gcp':
      const projectId = args[0] || process.env.OTLP_GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        console.error(
          '❌ Project ID required. Set OTLP_GOOGLE_CLOUD_PROJECT environment variable or pass as argument.',
        );
        process.exit(1);
      }
      await manager.startGcp(projectId);
      break;

    case 'start-local':
      const outfile = args[0]; // Optional outfile parameter
      await manager.startLocal(outfile);
      break;

    case 'stop':
      manager.stop();
      break;

    case 'status':
      manager.status();
      break;

    default:
      console.log('Usage: telemetry-collector.js <command> [args]');
      console.log('Commands:');
      console.log(
        '  start-gcp [project-id]  - Start GCP telemetry collector in background',
      );
      console.log(
        '  start-local [outfile]   - Start local telemetry collector in background',
      );
      console.log(
        '  stop                    - Stop all running telemetry collectors',
      );
      console.log('  status                  - Show status of all collectors');
      process.exit(1);
  }
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
