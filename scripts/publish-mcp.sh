#!/bin/bash

set -e

echo "Publishing packages to MCP Registry..."

# Download MCP Publisher if not exists
if [ ! -f "./mcp-publisher" ]; then
  echo "Downloading MCP Publisher..."
  curl -L https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher-linux-amd64.tar.gz | tar xz
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