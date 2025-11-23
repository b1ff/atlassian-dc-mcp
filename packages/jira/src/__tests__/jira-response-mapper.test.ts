import {
  simplifyIssue,
  simplifyComment,
  simplifySearchResults,
  simplifyCommentsResponse
} from '../jira-response-mapper.js';
import type { IssueBean } from '../jira-client/models/IssueBean.js';
import type { SearchResultsBean } from '../jira-client/models/SearchResultsBean.js';
import type { CommentJsonBean } from '../jira-client/models/CommentJsonBean.js';

// Test interfaces that match actual JIRA API responses
// Note: Generated types have overly strict typing (fields as Record<string, Record<string, any>>)
// but real JIRA responses have mixed types (strings, objects, arrays, etc.)
interface TestIssueFields {
  summary?: string;
  description?: string;
  status?: {
    name?: string;
    id?: string;
    self?: string;
    statusCategory?: {
      key?: string;
      name?: string;
      id?: number;
      self?: string;
    };
  };
  priority?: {
    name?: string;
    id?: string;
    self?: string;
    iconUrl?: string;
  };
  issuetype?: {
    name?: string;
    id?: string;
    subtask?: boolean;
    self?: string;
    iconUrl?: string;
  };
  assignee?: TestUser;
  reporter?: TestUser;
  created?: string;
  updated?: string;
  labels?: string[];
  components?: Array<{
    name?: string;
    id?: string;
    self?: string;
  }>;
  customfield_10001?: string;
  [key: string]: any;
}

interface TestUser {
  name?: string;
  displayName?: string;
  emailAddress?: string;
  active?: boolean;
  self?: string;
  avatarUrls?: Record<string, string>;
  timeZone?: string;
  key?: string;
}

interface TestIssue {
  id?: string;
  key?: string;
  self?: string;
  fields?: TestIssueFields;
  schema?: Record<string, any>;
  names?: Record<string, string>;
  operations?: any;
  editmeta?: any;
  renderedFields?: Record<string, any>;
  properties?: any;
  versionedRepresentations?: any;
}

interface TestComment {
  id?: string;
  body?: string;
  self?: string;
  author?: TestUser;
  created?: string;
  updated?: string;
  renderedBody?: string;
  properties?: any;
}

describe('JIRA Response Mapper', () => {
  const mockIssue: TestIssue = {
    id: '10001',
    key: 'PROJ-123',
    self: 'https://jira.company.local/rest/api/2/issue/10001',
    fields: {
      summary: 'Fix login bug',
      description: 'Users cannot login with special characters in password',
      status: {
        name: 'In Progress',
        id: '3',
        self: 'https://jira.company.local/rest/api/2/status/3',
        statusCategory: {
          key: 'indeterminate',
          name: 'In Progress',
          id: 4,
          self: 'https://jira.company.local/rest/api/2/statuscategory/4'
        }
      },
      priority: {
        name: 'High',
        id: '2',
        self: 'https://jira.company.local/rest/api/2/priority/2',
        iconUrl: 'https://jira.company.local/images/icons/priorities/high.svg'
      },
      issuetype: {
        name: 'Bug',
        id: '1',
        subtask: false,
        self: 'https://jira.company.local/rest/api/2/issuetype/1',
        iconUrl: 'https://jira.company.local/images/icons/issuetypes/bug.svg'
      },
      assignee: {
        name: 'jsmith',
        displayName: 'John Smith',
        emailAddress: 'jsmith@company.local',
        active: true,
        self: 'https://jira.company.local/rest/api/2/user?username=jsmith',
        avatarUrls: {
          '16x16': 'https://jira.company.local/avatar/16x16.png',
          '24x24': 'https://jira.company.local/avatar/24x24.png',
          '32x32': 'https://jira.company.local/avatar/32x32.png',
          '48x48': 'https://jira.company.local/avatar/48x48.png'
        },
        timeZone: 'America/New_York'
      },
      reporter: {
        name: 'adoe',
        displayName: 'Alice Doe',
        emailAddress: 'adoe@company.local',
        active: true,
        self: 'https://jira.company.local/rest/api/2/user?username=adoe',
        avatarUrls: {
          '16x16': 'https://jira.company.local/avatar/16x16.png',
          '24x24': 'https://jira.company.local/avatar/24x24.png',
          '32x32': 'https://jira.company.local/avatar/32x32.png',
          '48x48': 'https://jira.company.local/avatar/48x48.png'
        },
        timeZone: 'America/Los_Angeles'
      },
      created: '2024-01-15T10:30:00.000+0000',
      updated: '2024-01-16T14:20:00.000+0000',
      labels: ['security', 'urgent'],
      components: [
        {
          name: 'Authentication',
          id: '10050',
          self: 'https://jira.company.local/rest/api/2/component/10050'
        }
      ],
      customfield_10001: 'Custom Value'
    },
    // Verbose metadata fields that should be removed
    schema: {
      summary: { type: 'string', system: 'summary' },
      description: { type: 'string', system: 'description' }
    },
    names: {
      summary: 'Summary',
      description: 'Description'
    },
    operations: {
      linkGroups: []
    },
    editmeta: {
      fields: {}
    },
    renderedFields: {
      description: '<p>Users cannot login with special characters in password</p>'
    },
    properties: {},
    versionedRepresentations: {}
  };

  const mockComment: TestComment = {
    id: '10050',
    body: 'This is a test comment',
    self: 'https://jira.company.local/rest/api/2/issue/10001/comment/10050',
    author: {
      name: 'jsmith',
      displayName: 'John Smith',
      emailAddress: 'jsmith@company.local',
      active: true,
      self: 'https://jira.company.local/rest/api/2/user?username=jsmith',
      avatarUrls: {
        '16x16': 'https://jira.company.local/avatar/16x16.png',
        '24x24': 'https://jira.company.local/avatar/24x24.png',
        '32x32': 'https://jira.company.local/avatar/32x32.png',
        '48x48': 'https://jira.company.local/avatar/48x48.png'
      },
      timeZone: 'America/New_York'
    },
    created: '2024-01-16T14:20:00.000+0000',
    updated: '2024-01-16T14:20:00.000+0000',
    renderedBody: '<p>This is a test comment</p>',
    properties: []
  };

  describe('simplifyIssue', () => {
    it('should simplify issue by removing verbose metadata fields', () => {
      const result = simplifyIssue(mockIssue as IssueBean);

      expect(result).toBeDefined();
      expect(result!.id).toBe('10001');
      expect(result!.key).toBe('PROJ-123');
      expect(result!.fields).toBeDefined();

      // Verify essential fields are preserved
      expect(result!.fields!.summary).toBe('Fix login bug');
      expect(result!.fields!.description).toBe('Users cannot login with special characters in password');
      expect(result!.fields!.status?.name).toBe('In Progress');
      expect(result!.fields!.priority?.name).toBe('High');
      expect(result!.fields!.issuetype?.name).toBe('Bug');

      // Verify user fields are simplified
      expect(result!.fields!.assignee?.displayName).toBe('John Smith');
      expect(result!.fields!.assignee?.emailAddress).toBe('jsmith@company.local');
      expect((result!.fields!.assignee as any)?.avatarUrls).toBeUndefined();
      expect((result!.fields!.assignee as any)?.self).toBeUndefined();
      expect((result!.fields!.assignee as any)?.timeZone).toBeUndefined();

      // Verify custom fields are preserved
      expect(result!.fields!.customfield_10001).toBe('Custom Value');
    });

    it('should remove verbose metadata fields from issue', () => {
      const result = simplifyIssue(mockIssue as IssueBean);

      // Verify verbose fields are removed
      expect((result as any).self).toBeUndefined();
      expect((result as any).schema).toBeUndefined();
      expect((result as any).names).toBeUndefined();
      expect((result as any).operations).toBeUndefined();
      expect((result as any).editmeta).toBeUndefined();
      expect((result as any).renderedFields).toBeUndefined();
      expect((result as any).properties).toBeUndefined();
      expect((result as any).versionedRepresentations).toBeUndefined();
    });

    it('should handle undefined issue', () => {
      const result = simplifyIssue(undefined);
      expect(result).toBeUndefined();
    });

    it('should reduce issue size significantly', () => {
      const originalSize = JSON.stringify(mockIssue).length;
      const simplified = simplifyIssue(mockIssue as IssueBean);
      const simplifiedSize = JSON.stringify(simplified).length;

      const reduction = (originalSize - simplifiedSize) / originalSize;
      expect(reduction).toBeGreaterThan(0.3); // At least 30% reduction
    });
  });

  describe('simplifyComment', () => {
    it('should simplify comment by removing unnecessary fields', () => {
      const result = simplifyComment(mockComment as CommentJsonBean);

      expect(result).toBeDefined();
      expect(result!.id).toBe('10050');
      expect(result!.body).toBe('This is a test comment');
      expect(result!.author?.displayName).toBe('John Smith');
      expect(result!.created).toBe('2024-01-16T14:20:00.000+0000');
      expect(result!.updated).toBe('2024-01-16T14:20:00.000+0000');

      // Verify verbose fields are removed
      expect((result as any).self).toBeUndefined();
      expect((result as any).renderedBody).toBeUndefined();
      expect((result as any).properties).toBeUndefined();
      expect((result!.author as any)?.avatarUrls).toBeUndefined();
      expect((result!.author as any)?.self).toBeUndefined();
    });

    it('should handle undefined comment', () => {
      const result = simplifyComment(undefined);
      expect(result).toBeUndefined();
    });

    it('should reduce comment size significantly', () => {
      const originalSize = JSON.stringify(mockComment).length;
      const simplified = simplifyComment(mockComment as CommentJsonBean);
      const simplifiedSize = JSON.stringify(simplified).length;

      const reduction = (originalSize - simplifiedSize) / originalSize;
      expect(reduction).toBeGreaterThan(0.4); // At least 40% reduction
    });
  });

  describe('simplifySearchResults', () => {
    it('should simplify search results', () => {
      const mockSearchResults = {
        total: 1,
        startAt: 0,
        maxResults: 10,
        issues: [mockIssue as IssueBean],
        expand: 'names,schema',
        schema: {
          summary: { type: 'string', system: 'summary' }
        },
        names: {
          summary: 'Summary'
        }
      } as SearchResultsBean;

      const result = simplifySearchResults(mockSearchResults);

      expect(result).toBeDefined();
      expect(result!.total).toBe(1);
      expect(result!.startAt).toBe(0);
      expect(result!.maxResults).toBe(10);
      expect(result!.issues).toHaveLength(1);
      expect(result!.issues![0].key).toBe('PROJ-123');

      // Verify verbose fields are removed
      expect((result as any).expand).toBeUndefined();
      expect((result as any).schema).toBeUndefined();
      expect((result as any).names).toBeUndefined();
    });

    it('should handle undefined search results', () => {
      const result = simplifySearchResults(undefined);
      expect(result).toBeUndefined();
    });

    it('should reduce search results size significantly', () => {
      const mockSearchResults = {
        total: 2,
        startAt: 0,
        maxResults: 10,
        issues: [mockIssue as IssueBean, { ...mockIssue, id: '10002', key: 'PROJ-124' } as IssueBean],
        expand: 'names,schema',
        schema: {
          summary: { type: 'string', system: 'summary' },
          description: { type: 'string', system: 'description' }
        },
        names: {
          summary: 'Summary',
          description: 'Description'
        }
      } as SearchResultsBean;

      const originalSize = JSON.stringify(mockSearchResults).length;
      const simplified = simplifySearchResults(mockSearchResults);
      const simplifiedSize = JSON.stringify(simplified).length;

      const reduction = (originalSize - simplifiedSize) / originalSize;
      expect(reduction).toBeGreaterThan(0.3); // At least 30% reduction
    });
  });

  describe('simplifyCommentsResponse', () => {
    it('should simplify comments response', () => {
      const mockCommentsResponse = {
        total: 1,
        startAt: 0,
        maxResults: 50,
        comments: [mockComment]
      };

      const result = simplifyCommentsResponse(mockCommentsResponse);

      expect(result).toBeDefined();
      expect(result!.total).toBe(1);
      expect(result!.startAt).toBe(0);
      expect(result!.maxResults).toBe(50);
      expect(result!.comments).toHaveLength(1);
      expect(result!.comments![0].id).toBe('10050');
    });

    it('should handle undefined comments response', () => {
      const result = simplifyCommentsResponse(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('Token reduction from pretty-printing removal', () => {
    it('should demonstrate additional token savings from compact JSON', () => {
      const mockSearchResults = {
        total: 1,
        startAt: 0,
        maxResults: 10,
        issues: [mockIssue as IssueBean]
      } as SearchResultsBean;

      // Simulate old behavior with pretty-printing
      const prettyPrintedSize = JSON.stringify(mockSearchResults, null, 2).length;

      // New behavior: simplified + compact
      const simplified = simplifySearchResults(mockSearchResults);
      const compactSize = JSON.stringify(simplified).length;

      const totalReduction = (prettyPrintedSize - compactSize) / prettyPrintedSize;

      // Combined optimization should achieve significant reduction
      expect(totalReduction).toBeGreaterThan(0.4); // At least 40% total reduction
    });
  });
});
