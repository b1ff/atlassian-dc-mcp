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
        id: 5652270,
        createdDate: 1754117078335,
        user: {
          name: "user1",
          emailAddress: "user1@example.com",
          active: true,
          displayName: "Test User One",
          id: 7571,
          slug: "user1",
          type: "NORMAL",
          links: {
            self: [{ href: "https://git.example.org/users/user1" }]
          }
        },
        action: "COMMENTED",
        commentAction: "ADDED",
        comment: {
          properties: { repositoryId: 3941 },
          id: 473382,
          version: 0,
          text: "Can this value be an empty string?",
          author: {
            name: "user1",
            emailAddress: "user1@example.com",
            active: true,
            displayName: "Test User One",
            id: 7571,
            slug: "user1",
            type: "NORMAL",
            links: {
              self: [{ href: "https://git.example.org/users/user1" }]
            }
          },
          createdDate: 1754117078317,
          updatedDate: 1754117078317,
          comments: [],
          anchor: {
            fromHash: "5d0f3ef3a79fc6978640a87094a3271e513766a7",
            toHash: "d08555e40a3aeebb4cd201f680d0dd36ca748894",
            line: 6,
            lineType: "ADDED",
            fileType: "TO",
            path: "tags.tf",
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
        id: 5652061,
        createdDate: 1754067942249,
        user: {
          name: "user2",
          emailAddress: "user2@example.com",
          active: true,
          displayName: "Test User Two",
          id: 11016,
          slug: "user2",
          type: "NORMAL",
          links: {
            self: [{ href: "https://git.example.org/users/user2" }]
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

      expect(result.activities).toHaveLength(2);
      expect(result.summary.totalActivities).toBe(2);
      expect(result.summary.commentCount).toBe(1);

      // Check first activity (comment)
      const firstActivity = result.activities[0];
      expect(firstActivity.id).toBe(5652270);
      expect(firstActivity.action).toBe("COMMENTED");
      expect(firstActivity.user.displayName).toBe("Test User One");
      expect(firstActivity.comment?.text).toBe("Can this value be an empty string?");
      expect(firstActivity.comment?.anchor?.path).toBe("tags.tf");

      // Check second activity (opened)
      const secondActivity = result.activities[1];
      expect(secondActivity.id).toBe(5652061);
      expect(secondActivity.action).toBe("OPENED");
      expect(secondActivity.user.displayName).toBe("Test User Two");
      expect(secondActivity.comment).toBeUndefined();
    });

    it('should handle malformed input gracefully', () => {
      const malformedInput = { invalid: 'data' } as any;
      const result = simplifyBitbucketPRComments(malformedInput) as SimplifiedPRResponse;
      // Malformed input without 'values' property gets processed as empty activities
      expect(result.activities).toHaveLength(0);
      expect(result.summary.totalActivities).toBe(0);
      expect(result.summary.commentCount).toBe(0);
      expect(result.isLastPage).toBe(true);
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
      expect(result.activities).toHaveLength(0);
      expect(result.summary.totalActivities).toBe(0);
      expect(result.summary.commentCount).toBe(0);
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
      expect(summary[0]).toContain("Test User One");
      expect(summary[0]).toContain("tags.tf");
      expect(summary[0]).toContain("Can this value be an empty string?");
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
