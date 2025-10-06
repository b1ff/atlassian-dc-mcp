import { JiraService } from './packages/jira/build/jira-service.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const jiraService = new JiraService(
  process.env.JIRA_HOST,
  process.env.JIRA_API_TOKEN,
  process.env.JIRA_API_BASE_PATH
);

async function searchBlockedIssues() {
  try {
    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    console.log('\n=== Searching for Blocked Issues in DevOps Project ===\n');
    console.log(`Searching from: ${dateStr} to today`);
    console.log('Issue types: Support, Story');
    console.log('Status: Blocked\n');

    // JQL query to find blocked Support and Story issues in DevOps project from last 30 days
    // This query looks for issues that were updated in the last 30 days and are currently blocked
    // or have a status history showing they were blocked
    const jql = `project = "DevOps" AND issuetype in (Support, Story) AND (status = Blocked OR status was Blocked) AND updated >= -30d`;

    console.log(`JQL Query: ${jql}\n`);

    // Search with expanded fields to get changelog and comments
    const result = await jiraService.searchIssues(
      jql,
      0,
      ['changelog', 'transitions'],
      100 // Get up to 100 results
    );

    if (!result.success) {
      console.error('Error searching issues:', result.error);
      console.error('Details:', result.details);
      return;
    }

    const issues = result.data?.issues || [];
    console.log(`Found ${issues.length} issues\n`);
    console.log('='.repeat(80));

    if (issues.length === 0) {
      console.log('\nNo blocked issues found in the last 30 days.');
      return;
    }

    // Process each issue
    for (const issue of issues) {
      console.log(`\nIssue: ${issue.key}`);
      console.log(`Summary: ${issue.fields?.summary || 'N/A'}`);
      console.log(`Type: ${issue.fields?.issuetype?.name || 'N/A'}`);
      console.log(`Status: ${issue.fields?.status?.name || 'N/A'}`);
      console.log(`Created: ${issue.fields?.created || 'N/A'}`);
      console.log(`Updated: ${issue.fields?.updated || 'N/A'}`);
      console.log(`Assignee: ${issue.fields?.assignee?.displayName || 'Unassigned'}`);
      console.log(`Reporter: ${issue.fields?.reporter?.displayName || 'N/A'}`);
      console.log(`Priority: ${issue.fields?.priority?.name || 'N/A'}`);

      // Get comments to find blocking reasons
      console.log('\nFetching comments for blocking reasons...');
      const commentsResult = await jiraService.getIssueComments(issue.key);

      if (commentsResult.success && commentsResult.data?.comments) {
        const blockingComments = commentsResult.data.comments.filter(comment => {
          const body = comment.body?.toLowerCase() || '';
          return body.includes('block') || body.includes('blocker') || body.includes('blocked');
        });

        if (blockingComments.length > 0) {
          console.log('\nComments mentioning blocking:');
          blockingComments.slice(0, 3).forEach((comment, idx) => {
            console.log(`  [${idx + 1}] ${comment.author?.displayName} on ${comment.created}:`);
            console.log(`      ${comment.body?.substring(0, 200)}${comment.body?.length > 200 ? '...' : ''}`);
          });
        }
      }

      // Check changelog for status transitions to/from Blocked
      if (issue.changelog?.histories) {
        console.log('\nStatus History (Blocked transitions):');
        const blockedTransitions = issue.changelog.histories
          .filter(history => {
            return history.items?.some(item =>
              item.field === 'status' &&
              (item.toString?.toLowerCase().includes('blocked') ||
               item.fromString?.toLowerCase().includes('blocked'))
            );
          })
          .slice(0, 5); // Show last 5 transitions

        if (blockedTransitions.length > 0) {
          blockedTransitions.forEach(history => {
            const statusChange = history.items?.find(item => item.field === 'status');
            if (statusChange) {
              console.log(`  ${history.created}: ${statusChange.fromString} -> ${statusChange.toString}`);
              console.log(`    Changed by: ${history.author?.displayName}`);
            }
          });
        } else {
          console.log('  No blocked status transitions found in changelog');
        }
      }

      console.log('\n' + '-'.repeat(80));
    }

    // Summary
    console.log('\n\n=== SUMMARY ===');
    console.log(`Total issues found: ${issues.length}`);

    const byType = {};
    const byStatus = {};
    issues.forEach(issue => {
      const type = issue.fields?.issuetype?.name || 'Unknown';
      const status = issue.fields?.status?.name || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    console.log('\nBy Issue Type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\nBy Current Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the search
searchBlockedIssues();
