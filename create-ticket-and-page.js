import 'dotenv/config';
import { JiraService } from './packages/jira/build/jira-service.js';
import { ConfluenceService } from './packages/confluence/build/confluence-service.js';

const jiraService = new JiraService(
  process.env.JIRA_HOST,
  process.env.JIRA_API_TOKEN,
  process.env.JIRA_API_BASE_PATH
);

const confluenceService = new ConfluenceService(
  process.env.CONFLUENCE_HOST,
  process.env.CONFLUENCE_API_TOKEN,
  process.env.CONFLUENCE_API_BASE_PATH
);

async function main() {
  console.log('Step 1: Finding DevOps project...');

  // Search for DevOps project
  const projectSearch = await jiraService.searchIssues('project = DEVOPS OR project = DevOps', 0, [], 1);
  console.log('Project search result:', JSON.stringify(projectSearch, null, 2));

  // Get issue type for Task
  console.log('\nStep 2: Finding Task issue type...');
  const issueTypesSearch = await jiraService.searchIssues('project = DEVOPS', 0, ['issuetype'], 1);
  console.log('Issue types:', JSON.stringify(issueTypesSearch, null, 2));

  // Search for DevOps space
  console.log('\nStep 3: Searching for DevOps space...');
  const spaceSearch = await confluenceService.searchSpaces('DevOps', 10);
  console.log('Space search result:', JSON.stringify(spaceSearch, null, 2));

  if (!spaceSearch.success || !spaceSearch.data || !spaceSearch.data.results || spaceSearch.data.results.length === 0) {
    console.error('DevOps space not found. Please verify the space key.');
    return;
  }

  const spaceKey = spaceSearch.data.results[0].space?.key;
  console.log(`Using space key: ${spaceKey}`);

  // Create the Confluence page
  console.log('\nStep 4: Creating Confluence page...');

  const confluenceContent = `<h1>Setting Up Visual Studio Code with WSL for Claude Code</h1>

<h2>Prerequisites</h2>
<ul>
<li>Windows 10/11 with WSL2 installed</li>
<li>Ubuntu (or preferred Linux distribution) installed in WSL</li>
<li>Visual Studio Code installed on Windows</li>
</ul>

<h2>Step 1: Install WSL Remote Extension</h2>
<ol>
<li>Open Visual Studio Code on Windows</li>
<li>Go to Extensions (Ctrl+Shift+X)</li>
<li>Search for "WSL" by Microsoft</li>
<li>Install the "WSL" extension</li>
</ol>

<h2>Step 2: Connect VS Code to WSL</h2>
<ol>
<li>Press <code>F1</code> or <code>Ctrl+Shift+P</code> to open command palette</li>
<li>Type "WSL: Connect to WSL" and select it</li>
<li>A new VS Code window will open connected to your WSL environment</li>
<li>Alternatively, click the green button in the bottom-left corner and select "Connect to WSL"</li>
</ol>

<h2>Step 3: Install Claude Code in WSL</h2>
<ol>
<li>In the WSL-connected VS Code window, open a terminal (Ctrl+backtick)</li>
<li>Install Node.js if not already installed:
<ac:structured-macro ac:name="code">
<ac:plain-text-body><![CDATA[curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs]]></ac:plain-text-body>
</ac:structured-macro>
</li>
<li>Install Claude Code CLI globally:
<ac:structured-macro ac:name="code">
<ac:plain-text-body><![CDATA[npm install -g @anthropic-ai/claude-code]]></ac:plain-text-body>
</ac:structured-macro>
</li>
</ol>

<h2>Step 4: Configure Claude Code</h2>
<ol>
<li>Run the Claude Code setup:
<ac:structured-macro ac:name="code">
<ac:plain-text-body><![CDATA[claude-code init]]></ac:plain-text-body>
</ac:structured-macro>
</li>
<li>Follow the prompts to configure your API key and preferences</li>
<li>Configure your workspace settings in <code>.vscode/settings.json</code> if needed</li>
</ol>

<h2>Step 5: Verify Installation</h2>
<ol>
<li>Open a project folder in WSL VS Code</li>
<li>Run Claude Code:
<ac:structured-macro ac:name="code">
<ac:plain-text-body><![CDATA[claude-code]]></ac:plain-text-body>
</ac:structured-macro>
</li>
<li>You should see the Claude Code interface ready to assist</li>
</ol>

<h2>Tips</h2>
<ul>
<li>All your files will be in the Linux filesystem (/home/username/)</li>
<li>You can access Windows files from WSL at /mnt/c/</li>
<li>Extensions installed in WSL VS Code are separate from Windows VS Code</li>
<li>Performance is better when working with files in the WSL filesystem rather than /mnt/c/</li>
</ul>

<h2>Troubleshooting</h2>
<ul>
<li>If WSL connection fails, ensure WSL2 is running: <code>wsl --status</code></li>
<li>If Node.js installation fails, check your Ubuntu sources list</li>
<li>For permission issues, use <code>sudo</code> where needed</li>
</ul>`;

  // Try to create the page, if it exists use the existing one
  let confluencePage = await confluenceService.createContent({
    type: 'page',
    title: 'Setting Up Visual Studio Code with WSL for Claude Code',
    space: { key: spaceKey },
    body: {
      storage: {
        value: confluenceContent,
        representation: 'storage'
      }
    }
  });

  console.log('Confluence page result:', JSON.stringify(confluencePage, null, 2));

  let confluencePageId;

  if (!confluencePage.success) {
    // Page might already exist, search for it
    console.log('Page creation failed, searching for existing page...');
    const searchResult = await confluenceService.searchContent(
      `type=page AND space="${spaceKey}" AND title="Setting Up Visual Studio Code with WSL for Claude Code"`,
      1
    );

    console.log('Search result:', JSON.stringify(searchResult, null, 2));

    if (searchResult.success && searchResult.data && searchResult.data.results && searchResult.data.results.length > 0) {
      // The id might be in content or directly in the result
      const result = searchResult.data.results[0];
      confluencePageId = result.content?.id || result.id;
      console.log(`Found existing page with ID: ${confluencePageId}`);
    } else {
      console.error('Failed to create or find Confluence page');
      return;
    }
  } else {
    confluencePageId = confluencePage.data.id;
  }

  const confluencePageUrl = `https://${process.env.CONFLUENCE_HOST}/pages/viewpage.action?pageId=${confluencePageId}`;

  console.log(`\nUsing Confluence page: ${confluencePageUrl}`);

  // Create the Jira ticket
  console.log('\nStep 5: Creating Jira ticket...');

  const description = `h1. Setup Instructions

Please follow the instructions for setting up Visual Studio Code in WSL mode to use Claude Code.

*Documentation:* [Setting Up VS Code with WSL for Claude Code|${confluencePageUrl}]

h2. Summary
This ticket tracks the setup and configuration of VS Code with WSL integration for using Claude Code effectively in a Linux development environment.`;

  // Try creating without priority first, then update if needed
  const jiraTicket = await jiraService.createIssue({
    projectId: 'DEVOPS',
    summary: 'Setup Visual Studio Code in WSL mode with Claude Code',
    description: description,
    issueTypeId: '10700', // Support ticket type (found from DEVOPS-34876)
    customFields: {
      assignee: { name: 'corey.hughes' }
    }
  });

  console.log('Jira ticket result:', JSON.stringify(jiraTicket, null, 2));

  if (jiraTicket.success && jiraTicket.data) {
    console.log(`\n✓ Successfully created Jira ticket: ${jiraTicket.data.key}`);
    console.log(`✓ Ticket URL: https://${process.env.JIRA_HOST}/browse/${jiraTicket.data.key}`);
    console.log(`✓ Linked to Confluence page: ${confluencePageUrl}`);
  } else {
    console.error('Failed to create Jira ticket:', jiraTicket.error);
  }
}

main().catch(console.error);
