import { spawn } from 'child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

class NodemonManager {
  constructor(packageName, options = {}) {
    this.nodemonProcess = null;
    this.isShuttingDown = false;
    this.packageName = packageName;
    this.verbose = options.verbose || false;
  }

  start() {
    // Get the current file path and directory (root of monorepo)
    const fileName = fileURLToPath(import.meta.url);
    const rootDir = dirname(fileName);

    // Determine the package directory
    let packageDir;
    if (this.packageName) {
      packageDir = join(rootDir, 'packages', this.packageName);
      if (!existsSync(packageDir)) {
        console.error(`Package '${this.packageName}' not found in packages directory`);
        process.exit(1);
      }
    } else {
      console.error('No package specified. Please specify a package name.');
      console.log('Usage: node mcp-live-debug.js <package-name>');
      console.log('Available packages: bitbucket, common, confluence, jira');
      process.exit(1);
    }

    if (this.verbose) {
      console.log(`Starting debug session for package: ${this.packageName}`);
      console.log(`Working directory: ${packageDir}`);
    }

    // Determine the npm command based on platform
    const npmCmd = platform() === 'win32' ? 'npm.cmd' : 'npm';
    
    // Use npx for nodemon to ensure it's available
    const command = platform() === 'win32' ? 'npx.cmd' : 'npx';
    
    this.nodemonProcess = spawn(command, [
      'nodemon',
      '--quiet',
      '--watch', 'src',
      '-e', 'ts',
      '--exec', 'tsx src/index.ts'
    ], {
      shell: true,
      stdio: 'inherit',
      cwd: packageDir,
      env: {
        ...process.env,
        PORT: '3098'
      }
    });

    this.nodemonProcess.on('error', (err) => {
      if (!this.isShuttingDown) {
        console.error('Failed to start nodemon:', err);
      }
    });

    this.nodemonProcess.on('exit', (code, signal) => {
      if (!this.isShuttingDown && this.verbose && code !== 0) {
        console.error(`Process exited with code ${code}`);
      }
    });
  }

  stop() {
    this.isShuttingDown = true;

    return new Promise((resolve, reject) => {
      if (!this.nodemonProcess) {
        resolve();
        return;
      }

      try {
        // Kill the process
        this.nodemonProcess.kill('SIGINT');

        // Wait for the process to exit
        this.nodemonProcess.on('exit', () => {
          this.nodemonProcess = null;
          resolve();
        });

        // Set a timeout in case the process doesn't exit
        setTimeout(() => {
          if (this.nodemonProcess) {
            this.nodemonProcess.kill('SIGKILL');
            this.nodemonProcess = null;
            resolve();
          }
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Get the package name from command line arguments
const packageName = process.argv[2];
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

// Create nodemon manager with the specified package
const nodemonManager = new NodemonManager(packageName, { verbose });

// Start the process
nodemonManager.start();

if (verbose) {
  console.log('\nPress Ctrl+C to stop the debug session');
}

// Handle process termination
process.on('SIGINT', async () => {
  if (verbose) {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
  }
  await nodemonManager.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (verbose) {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
  }
  await nodemonManager.stop();
  process.exit(0);
});

// Catch and log any unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
