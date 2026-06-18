#!/bin/bash

set -euo pipefail

echo "Publishing packages to MCP Registry..."

# Download MCP Publisher if not exists
if [ ! -f "./mcp-publisher" ]; then
  echo "Downloading MCP Publisher..."
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
  DOWNLOAD_URL="https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_${OS}_${ARCH}.tar.gz"

  echo "Downloading from: $DOWNLOAD_URL"
  curl -fsSL "$DOWNLOAD_URL" | tar xz mcp-publisher
fi

# Login to MCP Registry using GitHub OIDC
echo "Logging into MCP Registry..."
./mcp-publisher login github-oidc

# Publish each package
packages=("jira" "confluence" "bitbucket")

for pkg in "${packages[@]}"; do
  echo "Publishing $pkg to MCP Registry..."
  (
    cd "packages/$pkg"
    ../../mcp-publisher publish
  )
  echo "$pkg published successfully!"
done

echo "All packages published to MCP Registry successfully!"
