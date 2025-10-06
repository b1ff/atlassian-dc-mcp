import { JiraService } from './packages/jira/build/jira-service.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

const jiraService = new JiraService(
  process.env.JIRA_HOST,
  process.env.JIRA_API_TOKEN,
  process.env.JIRA_API_BASE_PATH
);

async function exportBlockedIssuesToCSV() {
  try {
    const jql = `project = "DevOps" AND issuetype in (Support, Story) AND (status = Blocked OR status was Blocked) AND updated >= -30d`;

    console.log('Fetching blocked issues...');
    const result = await jiraService.searchIssues(jql, 0, ['changelog'], 100);

    if (!result.success) {
      console.error('Error searching issues:', result.error);
      return;
    }

    const issues = result.data?.issues || [];
    console.log(`Found ${issues.length} issues. Generating CSV...`);

    // CSV header
    let csvContent = 'Issue Key,Summary,Type,Current Status,Priority,Assignee,Reporter,Created Date,Last Updated,Blocked Date,Blocked Duration (Days),Blocked By,Unblocked Date,Current State\n';

    for (const issue of issues) {
      const key = issue.key || '';
      const summary = (issue.fields?.summary || '').replace(/"/g, '""').replace(/,/g, ';');
      const type = issue.fields?.issuetype?.name || '';
      const status = issue.fields?.status?.name || '';
      const priority = issue.fields?.priority?.name || '';
      const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
      const reporter = issue.fields?.reporter?.displayName || '';
      const created = issue.fields?.created || '';
      const updated = issue.fields?.updated || '';

      // Find blocked transitions
      let blockedDate = '';
      let unblockedDate = '';
      let blockedBy = '';
      let isCurrentlyBlocked = status.toLowerCase() === 'blocked';

      if (issue.changelog?.histories) {
        const blockedTransitions = issue.changelog.histories.filter(history => {
          return history.items?.some(item =>
            item.field === 'status' &&
            (item.toString?.toLowerCase() === 'blocked' || item.fromString?.toLowerCase() === 'blocked')
          );
        });

        // Get most recent block
        const lastBlocked = blockedTransitions.find(history => {
          return history.items?.some(item => item.toString?.toLowerCase() === 'blocked');
        });

        if (lastBlocked) {
          blockedDate = lastBlocked.created || '';
          blockedBy = lastBlocked.author?.displayName || '';
        }

        // Get most recent unblock (if exists)
        const lastUnblocked = blockedTransitions.find(history => {
          return history.items?.some(item => item.fromString?.toLowerCase() === 'blocked');
        });

        if (lastUnblocked && !isCurrentlyBlocked) {
          unblockedDate = lastUnblocked.created || '';
        }
      }

      // Calculate blocked duration
      let blockedDuration = '';
      if (blockedDate) {
        const blockedDateTime = new Date(blockedDate);
        const endDate = unblockedDate ? new Date(unblockedDate) : new Date();
        const durationMs = endDate - blockedDateTime;
        const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
        blockedDuration = durationDays.toString();
      }

      const currentState = isCurrentlyBlocked ? 'BLOCKED' : 'RESOLVED';

      csvContent += `"${key}","${summary}","${type}","${status}","${priority}","${assignee}","${reporter}","${created}","${updated}","${blockedDate}","${blockedDuration}","${blockedBy}","${unblockedDate}","${currentState}"\n`;
    }

    // Write to file
    const filename = '/home/corey/src/development/atlassian-dc-mcp/blocked-issues-report.csv';
    fs.writeFileSync(filename, csvContent);
    console.log(`\nCSV report generated: ${filename}`);
    console.log(`Total issues exported: ${issues.length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

exportBlockedIssuesToCSV();
