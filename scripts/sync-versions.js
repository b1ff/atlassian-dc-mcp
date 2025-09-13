#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const packages = ['jira', 'confluence', 'bitbucket'];

console.log('Syncing versions between package.json and server.json files...');

for (const pkg of packages) {
  try {
    // Read package.json version
    const packageJsonPath = join('packages', pkg, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;

    // Read and update server.json
    const serverJsonPath = join('packages', pkg, 'server.json');
    const serverJson = JSON.parse(readFileSync(serverJsonPath, 'utf8'));

    console.log(`${pkg}: Updating from ${serverJson.version} to ${version}`);

    serverJson.version = version;

    // Update package version in server.json if it exists
    if (serverJson.packages && serverJson.packages[0]) {
      serverJson.packages[0].version = version;
    }

    // Write back to file
    writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, 2) + '\n');

    console.log(`${pkg}: Version synced successfully`);
  } catch (error) {
    console.error(`Error syncing ${pkg}:`, error.message);
    process.exit(1);
  }
}

console.log('All versions synced successfully!');