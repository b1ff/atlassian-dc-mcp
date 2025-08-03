import {
  simplifyBitbucketPRComments,
  getCommentSummary,
  type BitbucketPRApiResponse,
  type SimplifiedPRResponse
} from '../pr-comment-mapper.js';

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
        user: {
          name: "testuser1",
          emailAddress: "testuser1@company.local",
          active: true,
          displayName: "User A",
          id: 101,
          slug: "testuser1",
          type: "NORMAL",
          links: {
            self: [{ href: "https://bitbucket.company.local/users/testuser1" }]
          }
        },
        action: "COMMENTED",
        commentAction: "ADDED",
        comment: {
          properties: { repositoryId: 1001 },
          id: 2001,
          version: 0,
          text: "This needs review",
          author: {
            name: "testuser1",
            emailAddress: "testuser1@company.local",
            active: true,
            displayName: "User A",
            id: 101,
            slug: "testuser1",
            type: "NORMAL",
            links: {
              self: [{ href: "https://bitbucket.company.local/users/testuser1" }]
            }
          },
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
          }
        }
      },
      {
        id: 1002,
        createdDate: 1600000001000,
        user: {
          name: "testuser2",
          emailAddress: "testuser2@company.local",
          active: true,
          displayName: "User B",
          id: 102,
          slug: "testuser2",
          type: "NORMAL",
          links: {
            self: [{ href: "https://bitbucket.company.local/users/testuser2" }]
          }
        },
        action: "OPENED"
      }
    ],
    start: 0
  };

  describe('simplifyBitbucketPRComments', () => {
    it('should simplify valid PR response correctly', () => {
      const result = simplifyBitbucketPRComments(validPRResponse) as SimplifiedPRResponse;

      const expectedResult = {
        isLastPage: true,
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
              threadResolved: false,
              state: "OPEN"
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
          unresolvedCount: 1
        }
      };

      expect(result).toEqual(expectedResult);
    });

    it('should handle malformed input gracefully', () => {
      const malformedInput = { invalid: 'data' } as any;
      const result = simplifyBitbucketPRComments(malformedInput) as SimplifiedPRResponse;

      const expectedResult = {
        isLastPage: true,
        activities: [],
        summary: {
          totalActivities: 0,
          commentCount: 0,
          unresolvedCount: 0
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
        activities: [],
        summary: {
          totalActivities: 0,
          commentCount: 0,
          unresolvedCount: 0
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
});
