#!/bin/bash
set -ex

# Function to push tags
push_tags() {
  echo "Pushing tags..."
  git push --tags origin
  echo "Tags pushed."
}

# Function to create GitHub release
create_github_release() {
  echo "Creating GitHub release..."
  LATEST_TAG=$(git describe --tags --abbrev=0)
  if [ ! -z "$LATEST_TAG" ]; then
    # Use CHANGELOG.md if it exists, otherwise use auto-generated notes
    if [ -f "CHANGELOG.md" ]; then
      gh release create "$LATEST_TAG" -F CHANGELOG.md --latest || echo "Release may already exist or creation failed"
    else
      gh release create "$LATEST_TAG" --generate-notes --latest || echo "Release may already exist or creation failed"
    fi
  fi
}

# Use npm with package-lock=false for the publish command
npm run publish:ci

# Code below fixes strange lerna \ NPM bug with package-lock.json incorrectly updated on CI
# If lerna is removed from repository this workaround can be removed

echo "Checking git status..."
git status

# Check if package-lock.json was modified in the last commit
if git diff-tree --no-commit-id --name-only -r HEAD | grep -q "package-lock.json"; then
  echo "Reverting changes to package-lock.json files"
  # Revert any changes to package-lock.json files
  find . -name "package-lock.json" -exec git checkout HEAD^ -- {} \; 2>/dev/null || echo "No package-lock.json files found to revert"

  echo "Git status after reverting package-lock.json files:"
  git status

  # Check for both staged and unstaged changes
  if ! git diff --quiet || ! git diff --staged --quiet; then
    echo "Changes detected, amending commit..."
    git add -A
    # Amend the last commit instead of creating a new one
    git commit --amend --no-edit
    echo "Pushing amended commit..."
    git push origin HEAD:master
    echo "Push completed."
  else
    echo "No changes to commit after reverting package-lock.json files"
    # Still push the commit even if no changes were made
    git push origin master
    echo "Push completed."
  fi
else
  echo "No package-lock.json changes detected"
  # Push the commit created by lerna
  git push origin master
  echo "Push completed."
fi

# Always push tags and create release after handling commits
push_tags
create_github_release