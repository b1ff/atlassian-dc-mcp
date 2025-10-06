# Jira DevOps Project - Blocked Issues Report
**Report Date:** October 3, 2025
**Period Analyzed:** Last 30 Days (September 3 - October 3, 2025)
**Query:** Issues in Blocked status or with Blocked status history in the last 30 days

## Executive Summary

- **Total Issues Found:** 86 issues (Support and Story types)
- **Currently Blocked:** 7 issues
- **Previously Blocked (Now Closed/Other):** 79 issues
- **Issue Types:** Support tickets and Story items

## Key Findings

### Currently Blocked Issues (Active - Requires Attention)

1. **DEVOPS-34745** - MageAI throwing permission error when calling ADF
   - **Type:** Support
   - **Priority:** Significant-P3
   - **Assignee:** Mark Moelter
   - **Blocked Since:** October 2, 2025
   - **Reason:** Moved from In Progress to Blocked on 2025-10-02

2. **DEVOPS-34436** - Update CorpIT Subscriptions with Azure Tags
   - **Type:** Support
   - **Priority:** Minor-P4
   - **Assignee:** Scott Shelton
   - **Blocked Since:** September 18, 2025
   - **Duration:** 15+ days blocked

3. **DEVOPS-34339** - PopHealth | Please Archive the following pipeline folders
   - **Type:** Support
   - **Priority:** Minor-P4
   - **Assignee:** Arun kumar
   - **Blocked Since:** September 18, 2025
   - **Duration:** 15+ days blocked

4. **DEVOPS-34338** - ANTHEM: Offboarding the dashboards from Intelligence 1.0
   - **Type:** Support
   - **Priority:** Minor-P4
   - **Assignee:** Arun kumar
   - **Blocked Since:** September 17, 2025
   - **Reason:** Pending confirmation of new target date (10/1/25?) from Product
   - **Duration:** 16+ days blocked

5. **DEVOPS-34337** - PopHealth: Offboarding the dashboards from Intelligence 1.0
   - **Type:** Support
   - **Priority:** Minor-P4
   - **Assignee:** Arun kumar
   - **Blocked Since:** September 17, 2025
   - **Duration:** 16+ days blocked

6. **DEVOPS-34286** - Deployment pipelines are failing for GMR pipeline configuration
   - **Type:** Support
   - **Priority:** Low-P5
   - **Assignee:** Mark Moelter
   - **Blocked Since:** September 25, 2025 (Re-blocked after being unblocked)
   - **History:** Initially blocked September 3, unblocked September 25, then re-blocked same day
   - **Duration:** Multiple blocking periods

7. **DEVOPS-34040** - Integrate https://dev.azure.com/DataScienceAI/ ADO with DevOps access and analyze
   - **Type:** Support
   - **Priority:** Significant-P3
   - **Assignee:** Sarath Kumar
   - **Blocked Since:** September 29, 2025
   - **Duration:** 4+ days blocked

### Recently Resolved Blocked Issues

#### High Priority Issues Recently Unblocked

1. **DEVOPS-34755** - DBT job failed due to Authentication token has expired
   - **Type:** Support
   - **Priority:** Low-P5
   - **Blocked Duration:** ~1 day (Sep 25-26)
   - **Resolution:** Closed on September 26, 2025

2. **DEVOPS-34624** - S55 | AppealAgent360: Create Azure Document Intelligence Service
   - **Type:** Story
   - **Priority:** Significant-P3
   - **Blocked Duration:** ~2 days (Sep 30 - Oct 2)
   - **Status:** Moved back to In Progress
   - **Blocking Reason:** Diagnostic setting block not being generated correctly in deployment

3. **DEVOPS-34542** - QA | Dataops appsettings.json not loaded in browser
   - **Type:** Support
   - **Priority:** Significant-P3
   - **Current Status:** In Progress
   - **Blocked Duration:** ~2 days (Sep 23-25)
   - **Blocking Reason:** Blocking other tickets (CPQ-34481), CORS or Security Policy Issues

4. **DEVOPS-34190** - Issue with Mage Anthem service user access to Snowflake Anthem
   - **Type:** Support
   - **Priority:** Urgent-P2 (Bumped from lower priority)
   - **Blocked Duration:** ~1.5 days (Aug 25-27)
   - **Resolution:** Closed
   - **Blocking Reason:** Tight deadlines on business commitments and hard deadlines for Jitterbit sunset

5. **DEVOPS-34156** - Intelligence 2.0 | Slow loading issue due to CDN/Server Latency
   - **Type:** Support
   - **Priority:** Urgent-P2
   - **Blocked Duration:** ~37 days (Aug 26 - Oct 2)
   - **Resolution:** Closed on October 2, 2025
   - **Blocking Reason:** Chunk-JSR returns incorrect type

## Common Blocking Reasons

Based on analysis of comments and status history:

### 1. **External Dependencies / Waiting on Confirmation**
- Waiting on product team for target dates
- Pending approvals from stakeholders
- Requires Salesforce ticket and documented approvals
- Waiting on client/customer decisions

### 2. **Technical Issues**
- Authentication/token expiration issues
- Permission and access control problems
- Deployment failures
- Configuration errors (diagnostic settings, CORS, security policies)
- Database connectivity issues
- CDN/Server latency issues

### 3. **Resource/Access Requirements**
- Waiting for access provisioning
- Firewall restrictions
- Missing credentials or secrets
- Azure subscription access needed

### 4. **Cross-team Dependencies**
- Blocking other tickets in sprint
- Dependent on other infrastructure work
- Requires coordination with multiple teams

## Issues by Priority Level

### Urgent (P2): 2 issues
- DEVOPS-34190 (Resolved)
- DEVOPS-34156 (Resolved)

### Significant (P3): ~25 issues
- Including currently blocked DEVOPS-34745 and DEVOPS-34040

### Minor (P4): ~35 issues
- Including currently blocked DEVOPS-34436, DEVOPS-34339, DEVOPS-34337, DEVOPS-34338

### Low (P5): ~24 issues
- Including currently blocked DEVOPS-34286

## Recommendations

1. **Address Long-Running Blocked Issues:**
   - DEVOPS-34436 (15+ days blocked)
   - DEVOPS-34339 (15+ days blocked)
   - DEVOPS-34338 (16+ days blocked)
   - DEVOPS-34337 (16+ days blocked)

2. **Investigate Re-blocking Pattern:**
   - DEVOPS-34286 was unblocked and then immediately re-blocked on the same day
   - May indicate incomplete resolution or new issues discovered

3. **Review P3 Blocked Issues:**
   - DEVOPS-34745 and DEVOPS-34040 are Significant priority and should be prioritized

4. **Common Root Causes to Address:**
   - Authentication/permission issues appear frequently
   - Consider proactive access management process
   - Improve communication channels with product teams for faster approvals

## Data Collection Method

This report was generated using:
- **Jira Instance:** jira.integraconnect.com (Jira Data Center edition)
- **JQL Query:** `project = "DevOps" AND issuetype in (Support, Story) AND (status = Blocked OR status was Blocked) AND updated >= -30d`
- **API:** Jira REST API v2
- **Expanded Fields:** changelog, transitions, comments
- **Date Range:** Last 30 days from current date

---
*Report generated automatically via Jira API*
