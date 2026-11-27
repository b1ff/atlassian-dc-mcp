import {
  filterPullRequestComments,
  simplifyBitbucketPRComments,
  getCommentSummary,
  type BitbucketPRApiResponse,
  type SimplifiedPRResponse
} from '../pr-comment-mapper.js';
import { formatToolResponse } from '@atlassian-dc-mcp/common';

interface TestComment {
  properties: { repositoryId: number };
  id: number;
  version: number;
  text: string;
  author: ReturnType<typeof createUser>;
  createdDate: number;
  updatedDate: number;
  comments: TestComment[];
  anchor?: {
    fromHash: string;
    toHash: string;
    line: number;
    lineType: string;
    fileType: string;
    path: string;
    diffType: string;
    orphaned: boolean;
  };
  threadResolved: boolean;
  severity: string;
  state: string;
  permittedOperations: {
    editable: boolean;
    transitionable: boolean;
    deletable: boolean;
  };
}

function createUser(name: string, id: number, displayName: string) {
  return {
    name,
    emailAddress: `${name}@company.local`,
    active: true,
    displayName,
    id,
    slug: name,
    type: "NORMAL",
    links: {
      self: [{ href: `https://bitbucket.company.local/users/${name}` }]
    }
  };
}

function createComment(overrides: Partial<TestComment> = {}): TestComment {
  return {
    properties: { repositoryId: 1001 },
    id: 2001,
    version: 0,
    text: "This needs review",
    author: createUser('testuser1', 101, 'User A'),
    createdDate: 1600000000000,
    updatedDate: 1600000000000,
    comments: [],
    anchor: {
      fromHash: "abc123def456789012345678901234567890abcd",
      toHash: "def456abc789012345678901234567890123cdef",
      line: 6,
      lineType: "ADDED",
      fileType: "TO",
      path: "config.yml",
      diffType: "EFFECTIVE",
      orphaned: false
    },
    threadResolved: false,
    severity: "NORMAL",
    state: "OPEN",
    permittedOperations: {
      editable: false,
      transitionable: true,
      deletable: false
    },
    ...overrides
  };
}

describe('PR Comment Mapper', () => {
  // Test data from the original ad-hoc test
  const validPRResponse: BitbucketPRApiResponse = {
    size: 2,
    limit: 100,
    isLastPage: true,
    values: [
      {
        id: 1001,
        createdDate: 1600000000000,
        user: createUser('testuser1', 101, 'User A'),
        action: "COMMENTED",
        commentAction: "ADDED",
        comment: createComment()
      },
      {
        id: 1002,
        createdDate: 1600000001000,
        user: createUser('testuser2', 102, 'User B'),
        action: "OPENED"
      }
    ],
    start: 0
  };
  const [baseCommentActivity, openedActivity] = validPRResponse.values ?? [];

  describe('simplifyBitbucketPRComments', () => {
    it('should simplify valid PR response correctly', () => {
      const result = simplifyBitbucketPRComments(validPRResponse) as SimplifiedPRResponse;

      const expectedResult = {
        isLastPage: true,
        start: 0,
        limit: 100,
        nextPageStart: null,
        activities: [
          {
            id: 1001,
            createdDate: 1600000000000,
            user: {
              name: "testuser1",
              displayName: "User A"
            },
            action: "COMMENTED",
            commentAction: "ADDED",
            comment: {
              id: 2001,
              text: "This needs review",
              author: {
                name: "testuser1",
                displayName: "User A"
              },
              createdDate: 1600000000000,
              anchor: {
                line: 6,
                path: "config.yml",
                fileType: "TO"
              },
              comments: [],
              threadResolved: false,
              state: "OPEN",
              severity: "NORMAL"
            }
          },
          {
            id: 1002,
            createdDate: 1600000001000,
            user: {
              name: "testuser2",
              displayName: "User B"
            },
            action: "OPENED"
          }
        ],
        summary: {
          totalActivities: 2,
          prAuthor: {
            name: "testuser2",
            displayName: "User B"
          },
          commentCount: 1,
          unresolvedCount: 1,
          blockerCount: 0,
          unresolvedBlockerCount: 0
        }
      };

      expect(result).toEqual(expectedResult);
    });

    it('should expose BLOCKER severity so tasks are distinguishable from normal comments', () => {
      const blockerResponse: BitbucketPRApiResponse = {
        ...validPRResponse,
        values: [
          {
            id: 1001,
            createdDate: 1600000000000,
            user: createUser('reviewer1', 106, 'Reviewer One'),
            action: 'COMMENTED',
            commentAction: 'ADDED',
            comment: createComment({
              id: 2010,
              text: 'Blocking: fix this',
              severity: 'BLOCKER',
              comments: [
                createComment({
                  id: 2011,
                  text: 'Reply keeps its own severity',
                  anchor: undefined,
                  severity: 'NORMAL'
                })
              ]
            })
          }
        ]
      };

      const result = simplifyBitbucketPRComments(blockerResponse) as SimplifiedPRResponse;
      expect(result.activities[0].comment?.severity).toBe('BLOCKER');
      expect(result.activities[0].comment?.comments[0].severity).toBe('NORMAL');
    });

    it('should count blockers and unresolved blockers by task state in the summary', () => {
      const blockerResponse: BitbucketPRApiResponse = {
        ...validPRResponse,
        values: [
          openedActivity!,
          {
            id: 1010,
            createdDate: 1600000003000,
            user: createUser('reviewer1', 106, 'Reviewer One'),
            action: 'COMMENTED',
            commentAction: 'ADDED',
            comment: createComment({ id: 2020, text: 'Unresolved task', severity: 'BLOCKER', state: 'OPEN' })
          },
          {
            id: 1011,
            createdDate: 1600000004000,
            user: createUser('reviewer1', 106, 'Reviewer One'),
            action: 'COMMENTED',
            commentAction: 'ADDED',
            comment: createComment({ id: 2021, text: 'Ticked task', severity: 'BLOCKER', state: 'RESOLVED' })
          },
          {
            id: 1012,
            createdDate: 1600000005000,
            user: createUser('reviewer1', 106, 'Reviewer One'),
            action: 'COMMENTED',
            commentAction: 'ADDED',
            comment: createComment({ id: 2022, text: 'Just a note', severity: 'NORMAL', state: 'OPEN' })
          }
        ]
      };

      const result = simplifyBitbucketPRComments(blockerResponse) as SimplifiedPRResponse;
      expect(result.summary.commentCount).toBe(3);
      expect(result.summary.blockerCount).toBe(2);
      expect(result.summary.unresolvedBlockerCount).toBe(1);
    });

    it('should preserve nested replies recursively', () => {
      const threadedResponse: BitbucketPRApiResponse = {
        ...validPRResponse,
        values: [
          {
            id: 1001,
            createdDate: 1600000000000,
            user: createUser('testuser1', 101, 'User A'),
            action: "COMMENTED",
            commentAction: "ADDED",
            comment: createComment({
              comments: [
                createComment({
                  id: 2002,
                  text: "Author reply",
                  author: createUser('author1', 103, 'Author One'),
                  anchor: undefined,
                  comments: [
                    createComment({
                      id: 2003,
                      text: "Reviewer follow-up",
                      author: createUser('reviewer2', 104, 'Reviewer Two'),
                      anchor: undefined
                    })
                  ]
                })
              ]
            })
          }
        ]
      };

      const result = simplifyBitbucketPRComments(threadedResponse) as SimplifiedPRResponse;
      expect(result.activities[0].comment?.comments).toEqual([
        {
          id: 2002,
          text: "Author reply",
          author: {
            name: "author1",
            displayName: "Author One"
          },
          createdDate: 1600000000000,
          comments: [
            {
              id: 2003,
              text: "Reviewer follow-up",
              author: {
                name: "reviewer2",
                displayName: "Reviewer Two"
              },
              createdDate: 1600000000000,
              comments: [],
              threadResolved: false,
              state: "OPEN",
              severity: "NORMAL"
            }
          ],
          threadResolved: false,
          state: "OPEN",
          severity: "NORMAL"
        }
      ]);
    });

    it('should exclude resolved threads and all replies by default', () => {
      const resolvedThreadResponse: BitbucketPRApiResponse = {
        ...validPRResponse,
        values: [
          openedActivity!,
          {
            id: 1003,
            createdDate: 1600000002000,
            user: createUser('reviewer3', 105, 'Reviewer Three'),
            action: 'COMMENTED',
            commentAction: 'ADDED',
            comment: createComment({
              id: 2004,
              text: 'Resolved thread root',
              threadResolved: true,
              comments: [
                createComment({
                  id: 2005,
                  text: 'Resolved reply',
                  anchor: undefined,
                  threadResolved: true,
                })
              ]
            })
          },
          baseCommentActivity!,
        ],
      };

      const result = simplifyBitbucketPRComments(resolvedThreadResponse) as SimplifiedPRResponse;

      expect(result.activities).toEqual([
        {
          id: 1002,
          createdDate: 1600000001000,
          user: {
            name: 'testuser2',
            displayName: 'User B'
          },
          action: 'OPENED'
        },
        {
          id: 1001,
          createdDate: 1600000000000,
          user: {
            name: 'testuser1',
            displayName: 'User A'
          },
          action: 'COMMENTED',
          commentAction: 'ADDED',
          comment: {
            id: 2001,
            text: 'This needs review',
            author: {
              name: 'testuser1',
              displayName: 'User A'
            },
            createdDate: 1600000000000,
            anchor: {
              line: 6,
              path: 'config.yml',
              fileType: 'TO'
            },
            comments: [],
            threadResolved: false,
            state: 'OPEN',
            severity: 'NORMAL'
          }
        }
      ]);
      expect(result.summary.commentCount).toBe(1);
      expect(getCommentSummary(resolvedThreadResponse)).toEqual(['User A on config.yml:6: This needs review']);
    });

    it('should include resolved threads when requested', () => {
      const resolvedThreadResponse: BitbucketPRApiResponse = {
        ...validPRResponse,
        values: [
          {
            id: 1003,
            createdDate: 1600000002000,
            user: createUser('reviewer3', 105, 'Reviewer Three'),
            action: 'COMMENTED',
            commentAction: 'ADDED',
            comment: createComment({
              id: 2004,
              text: 'Resolved thread root',
              threadResolved: true,
              comments: [
                createComment({
                  id: 2005,
                  text: 'Resolved reply',
                  anchor: undefined,
                  threadResolved: true,
                })
              ]
            })
          }
        ],
      };

      const result = simplifyBitbucketPRComments(resolvedThreadResponse, { includeResolved: true }) as SimplifiedPRResponse;

      expect(result.activities[0].comment).toEqual({
        id: 2004,
        text: 'Resolved thread root',
        author: {
          name: 'testuser1',
          displayName: 'User A'
        },
        createdDate: 1600000000000,
        anchor: {
          line: 6,
          path: 'config.yml',
          fileType: 'TO'
        },
        comments: [
          {
            id: 2005,
            text: 'Resolved reply',
            author: {
              name: 'testuser1',
              displayName: 'User A'
            },
            createdDate: 1600000000000,
            comments: [],
            threadResolved: true,
            state: 'OPEN',
            severity: 'NORMAL'
          }
        ],
        threadResolved: true,
        state: 'OPEN',
        severity: 'NORMAL'
      });
      expect(getCommentSummary(resolvedThreadResponse, { includeResolved: true })).toEqual([
        'User A on config.yml:6: Resolved thread root'
      ]);
    });

    it('should skip malformed nested replies', () => {
      const malformedNestedResponse: BitbucketPRApiResponse = {
        ...validPRResponse,
        values: [
          {
            id: 1001,
            createdDate: 1600000000000,
            user: createUser('testuser1', 101, 'User A'),
            action: "COMMENTED",
            commentAction: "ADDED",
            comment: createComment({
              comments: [
                { id: 'bad-comment-id' } as unknown as TestComment,
                createComment({
                  id: 2002,
                  text: "Valid reply",
                  anchor: undefined
                })
              ]
            })
          }
        ]
      };

      const result = simplifyBitbucketPRComments(malformedNestedResponse) as SimplifiedPRResponse;
      expect(result.activities[0].comment?.comments).toEqual([
        {
          id: 2002,
          text: "Valid reply",
          author: {
            name: "testuser1",
            displayName: "User A"
          },
          createdDate: 1600000000000,
          comments: [],
          threadResolved: false,
          state: "OPEN",
          severity: "NORMAL"
        }
      ]);
    });

    it('should drop cyclic reply branches and remain JSON serializable', () => {
      const rootComment = createComment();
      const childComment = createComment({
        id: 2002,
        text: "Child reply",
        anchor: undefined
      });

      rootComment.comments = [childComment];
      childComment.comments = [rootComment];

      const cyclicResponse: BitbucketPRApiResponse = {
        size: 1,
        limit: 100,
        isLastPage: true,
        values: [
          {
            id: 1001,
            createdDate: 1600000000000,
            user: createUser('testuser1', 101, 'User A'),
            action: "COMMENTED",
            commentAction: "ADDED",
            comment: rootComment
          }
        ],
        start: 0
      };

      const result = simplifyBitbucketPRComments(cyclicResponse) as SimplifiedPRResponse;
      expect(result.activities[0].comment?.comments).toEqual([
        {
          id: 2002,
          text: "Child reply",
          author: {
            name: "testuser1",
            displayName: "User A"
          },
          createdDate: 1600000000000,
          comments: [],
          threadResolved: false,
          state: "OPEN",
          severity: "NORMAL"
        }
      ]);

      expect(() => formatToolResponse(result)).not.toThrow();
      expect(JSON.parse(formatToolResponse(result).content[0].text)).toBeTruthy();
    });

    it('should handle malformed input gracefully', () => {
      const malformedInput = { invalid: 'data' } as any;
      const result = simplifyBitbucketPRComments(malformedInput) as SimplifiedPRResponse;

      const expectedResult = {
        isLastPage: true,
        nextPageStart: null,
        activities: [],
        summary: {
          totalActivities: 0,
          commentCount: 0,
          unresolvedCount: 0,
          blockerCount: 0,
          unresolvedBlockerCount: 0
        }
      };

      expect(result).toEqual(expectedResult);
    });

    it('should handle empty values array', () => {
      const emptyResponse: BitbucketPRApiResponse = {
        size: 0,
        limit: 100,
        isLastPage: true,
        values: [],
        start: 0
      };

      const result = simplifyBitbucketPRComments(emptyResponse) as SimplifiedPRResponse;

      const expectedResult = {
        isLastPage: true,
        start: 0,
        limit: 100,
        nextPageStart: null,
        activities: [],
        summary: {
          totalActivities: 0,
          commentCount: 0,
          unresolvedCount: 0,
          blockerCount: 0,
          unresolvedBlockerCount: 0
        }
      };

      expect(result).toEqual(expectedResult);
    });

    it('should reduce response size significantly', () => {
      const originalSize = JSON.stringify(validPRResponse).length;
      const simplified = simplifyBitbucketPRComments(validPRResponse);
      const simplifiedSize = JSON.stringify(simplified).length;

      const reduction = (originalSize - simplifiedSize) / originalSize;
      expect(reduction).toBeGreaterThan(0.3); // At least 30% reduction
    });
  });

  describe('getCommentSummary', () => {
    it('should return comment summaries as string array', () => {
      const summary = getCommentSummary(validPRResponse);
      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(1);
      expect(summary[0]).toContain("User A");
      expect(summary[0]).toContain("config.yml");
      expect(summary[0]).toContain("This needs review");
    });

    it('should handle malformed input gracefully', () => {
      const summary = getCommentSummary({ invalid: 'data' } as any);
      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(0);
    });

    it('should handle empty values array', () => {
      const emptyResponse: BitbucketPRApiResponse = {
        size: 0,
        limit: 100,
        isLastPage: true,
        values: [],
        start: 0
      };
      const summary = getCommentSummary(emptyResponse);
      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(0);
    });
  });

  describe('filterPullRequestComments', () => {
    it('should keep non-comment activities while removing resolved comment activities by default', () => {
      const response: BitbucketPRApiResponse = {
        ...validPRResponse,
        values: [
          openedActivity!,
          {
            id: 1004,
            createdDate: 1600000003000,
            user: createUser('reviewer4', 106, 'Reviewer Four'),
            action: 'COMMENTED',
            commentAction: 'ADDED',
            comment: createComment({ id: 2006, threadResolved: true })
          }
        ]
      };

      expect(filterPullRequestComments(response).values).toEqual([openedActivity!]);
    });
  });
});
