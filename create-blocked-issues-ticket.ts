#!/usr/bin/env tsx

/**
 * Script to create a Jira Support ticket summarizing blocked issues research findings
 */

import { JiraService } from './packages/jira/src/jira-service.js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, 'packages/jira/.env') });

const JIRA_HOST = process.env.JIRA_HOST || '';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || '';
const JIRA_API_BASE_PATH = process.env.JIRA_API_BASE_PATH;

if (!JIRA_API_TOKEN || (!JIRA_HOST && !JIRA_API_BASE_PATH)) {
  console.error('Missing required environment variables: JIRA_API_TOKEN and (JIRA_HOST or JIRA_API_BASE_PATH)');
  process.exit(1);
}

// Initialize Jira service
const jiraService = new JiraService(JIRA_HOST, JIRA_API_TOKEN, JIRA_API_BASE_PATH);

// Build the description in Jira markdown format
const description = `h2. Executive Summary

This ticket summarizes findings from a comprehensive analysis of blocked issues in the DevOps project over the last 30 days (September 3 - October 3, 2025).

*Key Findings:*
* *Total Issues Analyzed:* 86 issues (Support and Story types)
* *Currently Blocked:* 7 issues requiring immediate attention
* *Previously Blocked (Now Resolved):* 79 issues

h2. Currently Blocked Issues (Active - Requires Attention)

h3. High Priority (P3) Issues - Immediate Action Required

# *DEVOPS-34745* - MageAI throwing permission error when calling ADF
** Type: Support | Priority: Significant-P3
** Assignee: Mark Moelter
** Blocked Since: October 2, 2025 (1 day)
** Blocking Reason: Permission error when MageAI calls Azure Data Factory

# *DEVOPS-34040* - Integrate https://dev.azure.com/DataScienceAI/ ADO with DevOps access and analyze
** Type: Support | Priority: Significant-P3
** Assignee: Sarath Kumar
** Blocked Since: September 29, 2025 (4 days)
** Blocking Reason: Azure DevOps integration and access analysis

h3. Long-Running Blocked Issues (15+ Days) - CRITICAL ATTENTION NEEDED

# *DEVOPS-34338* - ANTHEM: Offboarding the dashboards from Intelligence 1.0
** Type: Support | Priority: Minor-P4
** Assignee: Arun kumar
** Blocked Since: September 17, 2025 (*16+ days*)
** Blocking Reason: Pending confirmation of new target date (10/1/25?) from Product
** *STATUS: Target date has passed - needs immediate follow-up*

# *DEVOPS-34337* - PopHealth: Offboarding the dashboards from Intelligence 1.0
** Type: Support | Priority: Minor-P4
** Assignee: Arun kumar
** Blocked Since: September 17, 2025 (*16+ days*)
** Blocking Reason: Dashboard offboarding from Intelligence 1.0, likely waiting on Product team

# *DEVOPS-34436* - Update CorpIT Subscriptions with Azure Tags
** Type: Support | Priority: Minor-P4
** Assignee: Scott Shelton
** Blocked Since: September 18, 2025 (*15+ days*)
** Blocking Reason: Long-running with no recent updates

# *DEVOPS-34339* - PopHealth | Please Archive the following pipeline folders
** Type: Support | Priority: Minor-P4
** Assignee: Arun kumar
** Blocked Since: September 18, 2025 (*15+ days*)
** Blocking Reason: Pipeline archival request, possibly waiting on approvals

h3. Other Currently Blocked Issues

# *DEVOPS-34286* - Deployment pipelines are failing for GMR pipeline configuration
** Type: Support | Priority: Low-P5
** Assignee: Mark Moelter
** Blocked Since: September 25, 2025 (Re-blocked after fix attempt)
** *NOTABLE: Issue was unblocked and re-blocked on the same day* - suggests incomplete resolution

h2. Common Blocking Reasons Identified

h3. External Dependencies / Waiting on Confirmation
* Waiting on product team for target dates and approvals
* Pending stakeholder decisions
* Requires Salesforce ticket and documented approvals

h3. Technical Issues
* Authentication/token expiration issues
* Permission and access control problems
* Deployment failures and configuration errors
* Database connectivity issues

h3. Resource/Access Requirements
* Waiting for access provisioning
* Firewall restrictions
* Missing credentials or secrets
* Azure subscription access needed

h2. Detailed Reports Available

Three comprehensive reports have been created in the \`atlassian-dc-mcp/\` directory:
# \`blocked-issues-report.md\` - Full analysis of all 86 issues
# \`currently-blocked-issues-detailed.md\` - Detailed breakdown of 7 active blockers
# Additional analysis of recently resolved issues and patterns

h2. Recommended Actions

h3. Immediate (This Week)
# *Unblock P3 issues* (DEVOPS-34745, DEVOPS-34040)
## Schedule focused time with Mark Moelter and Sarath Kumar
## Escalate permission/access requests if needed

# *Review long-blocked P4 issues* (16+ days blocked)
## DEVOPS-34338 and DEVOPS-34337: Contact Product team for updated timelines
## Confirm if these are still valid or should be closed/postponed

h3. Short Term (Next 2 Weeks)
# *Investigate re-blocking pattern*
## DEVOPS-34286: Schedule technical review to prevent re-blocking

# *Cleanup blocked backlog*
## Review all 15+ day blocked issues with stakeholders
## Either unblock with clear actions or close if no longer relevant

h3. Process Improvements
# Implement automated alerts for issues blocked > 7 days
# Add "Blocker Reason" field to track specific blocking causes
# Consider weekly sync on blocked items to improve cross-team coordination

h2. Data Collection Method

* *Jira Instance:* jira.integraconnect.com (Jira Data Center edition)
* *JQL Query:* \`project = "DevOps" AND issuetype in (Support, Story) AND (status = Blocked OR status was Blocked) AND updated >= -30d\`
* *API:* Jira REST API v2
* *Analysis Period:* Last 30 days (September 3 - October 3, 2025)

----

_This analysis was generated using the Atlassian Data Center MCP tools to systematically review blocked issues and identify patterns requiring attention._
`;

async function createTicket() {
  try {
    console.log('Creating Jira Support ticket in DevOps project...\n');

    // First, get the issue type ID for "Support"
    console.log('Looking up issue types for DevOps project...');
    const projectMetaResult = await jiraService.searchIssues(
      'project = DevOps',
      0,
      ['schema'],
      1
    );

    if (!projectMetaResult.success) {
      console.error('Failed to get project metadata:', projectMetaResult.error);
      process.exit(1);
    }

    // Create the issue
    // Note: We'll need to get the correct issue type ID and priority ID
    // For now, we'll use common values, but may need to adjust based on your Jira setup

    const issueParams = {
      projectId: 'DevOps',
      summary: 'Blocked Issues Analysis - 7 Active Blockers Requiring Attention (Last 30 Days)',
      description: description,
      issueTypeId: '10004', // Common ID for Support, may need adjustment
      customFields: {
        // Set priority to High (P3)
        priority: { name: 'Significant-P3' },
        // Assign to andrew.bilukha
        assignee: { name: 'andrew.bilukha' }
      }
    };

    console.log('Creating issue with summary:', issueParams.summary);
    const result = await jiraService.createIssue(issueParams);

    if (result.success && result.data) {
      const issue = result.data;
      console.log('\n✓ Successfully created Jira ticket!');
      console.log('  Issue Key:', issue.key);
      console.log('  Issue URL:', `https://${JIRA_HOST}/browse/${issue.key}`);
      console.log('\nIssue Details:');
      console.log('  Summary:', issueParams.summary);
      console.log('  Type: Support');
      console.log('  Priority: Significant-P3 (High)');
      console.log('  Assignee: andrew.bilukha');
      console.log('\nThe ticket includes:');
      console.log('  - Summary of 7 currently blocked issues');
      console.log('  - Highlight of 4 critical issues blocked 15+ days');
      console.log('  - Common blocking reasons and patterns');
      console.log('  - Recommended actions and process improvements');
      console.log('  - Reference to 3 detailed reports in atlassian-dc-mcp/ directory');
    } else {
      console.error('\n✗ Failed to create issue:', result.error);
      if (result.details) {
        console.error('Details:', JSON.stringify(result.details, null, 2));
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Unexpected error:', error);
    process.exit(1);
  }
}

createTicket();
