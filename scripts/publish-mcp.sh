#!/bin/bash

set -e

echo "Publishing packages to MCP Registry..."

# Download MCP Publisher if not exists
if [ ! -f "./mcp-publisher" ]; then
  echo "Downloading MCP Publisher..."
  # Get the latest release download URL
  DOWNLOAD_URL=$(curl -s https://api.github.com/repos/modelcontextprotocol/registry/releases/latest | grep -E '"browser_download_url".*mcp-publisher.*linux_amd64.tar.gz"' | grep -v '.sig' | grep -v '.sbom' | cut -d'"' -f4)

  if [ -z "$DOWNLOAD_URL" ]; then
    echo "Error: Could not find MCP Publisher download URL"
    exit 1
  fi

  echo "Downloading from: $DOWNLOAD_URL"
  curl -L "$DOWNLOAD_URL" | tar xz
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