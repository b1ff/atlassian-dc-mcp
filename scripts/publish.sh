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
    # Extract CHANGELOG.md changes from the release commit
    # Get the added lines from CHANGELOG.md, excluding the header lines and empty lines
    TEMP_NOTES="/tmp/release_notes_$$.md"

    # Extract the diff and format it properly
    git diff HEAD^ HEAD -- CHANGELOG.md 2>/dev/null | \
      grep '^+' | \
      grep -v '^+++' | \
      sed 's/^+//' | \
      grep -v '^# Change Log' | \
      grep -v '^All notable changes' | \
      grep -v '^See \[Conventional Commits\]' | \
      grep -v '^$' | \
      head -n 20 > "$TEMP_NOTES"

    if [ -s "$TEMP_NOTES" ]; then
      echo "Creating release with changes from CHANGELOG.md"
      gh release create "$LATEST_TAG" -F "$TEMP_NOTES" --latest || echo "Release may already exist or creation failed"
    else
      echo "No CHANGELOG.md changes found, using auto-generated notes"
      gh release create "$LATEST_TAG" --generate-notes --latest || echo "Release may already exist or creation failed"
    fi

    rm -f "$TEMP_NOTES"
  fi
}

# Function to move tags to current HEAD
move_tags_to_head() {
  echo "Moving tags to current HEAD..."
  # Get all tags pointing to HEAD (before we amend)
  TAGS_TO_MOVE=$(git tag --points-at HEAD 2>/dev/null || true)

  if [ ! -z "$TAGS_TO_MOVE" ]; then
    echo "Tags found on current commit: $TAGS_TO_MOVE"
    # Store tags to recreate them after amending
    echo "$TAGS_TO_MOVE" > /tmp/tags_to_move_$$
  fi
}

# Function to recreate tags after amending
recreate_tags() {
  if [ -f "/tmp/tags_to_move_$$" ]; then
    TAGS_TO_MOVE=$(cat /tmp/tags_to_move_$$)
    for tag in $TAGS_TO_MOVE; do
      echo "Recreating tag $tag on amended HEAD"
      # Delete the old tag locally
      git tag -d "$tag"
      # Create it again pointing to current HEAD
      git tag "$tag" HEAD
    done
    rm -f /tmp/tags_to_move_$$
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

    # Save tags before amending
    move_tags_to_head

    git add -A
    # Amend the last commit instead of creating a new one
    git commit --amend --no-edit

    # Recreate tags on the amended commit
    recreate_tags

    echo "Pushing amended commit..."
    git push origin HEAD:master
    echo "Commit pushed."

    # Push tags immediately after commit
    push_tags
  else
    echo "No changes to commit after reverting package-lock.json files"
    # Still push the commit even if no changes were made
    git push origin master
    echo "Commit pushed."

    # Push tags immediately after commit
    push_tags
  fi
else
  echo "No package-lock.json changes detected"
  # Push the commit created by lerna
  git push origin master
  echo "Commit pushed."

  # Push tags immediately after commit
  push_tags
fi

# Don't push tags again - already done above
create_github_release