import {
  simplifyBitbucketPRChanges,
  getChangesSummary
} from '../pr-changes-mapper.js';

describe('PR Changes Mapper', () => {
  // Test data based on the example from the issue description
  const validPRChangesResponse = {
    "fromHash": "abc123def456789012345678901234567890abcd",
    "toHash": "def456abc789012345678901234567890123cdef",
    "properties": {
      "changeScope": "ALL"
    },
    "values": [
      {
        "contentId": "content123456789abcdef0123456789abcdef01234",
        "fromContentId": "content123456789abcdef0123456789abcdef01234",
        "path": {
          "components": [
            "src",
            "MyProject",
            "Handlers",
            "Api",
            "ImageProcessor",
            "ImageHandler.cs"
          ],
          "parent": "src/MyProject/Handlers/Api/ImageProcessor",
          "name": "ImageHandler.cs",
          "extension": "cs",
          "toString": "src/MyProject/Handlers/Api/ImageProcessor/ImageHandler.cs"
        },
        "percentUnchanged": -1,
        "type": "DELETE",
        "nodeType": "FILE",
        "srcExecutable": false,
        "links": {
          "self": [
            null
          ]
        },
        "properties": {
          "gitChangeType": "DELETE"
        }
      },
      {
        "contentId": "content456789abcdef0123456789abcdef012345678",
        "fromContentId": "0000000000000000000000000000000000000000",
        "path": {
          "components": [
            "src",
            "MyProject",
            "Handlers",
            "Api",
            "ProcessorService",
            "ProcessorHandler.cs"
          ],
          "parent": "src/MyProject/Handlers/Api/ProcessorService",
          "name": "ProcessorHandler.cs",
          "extension": "cs",
          "toString": "src/MyProject/Handlers/Api/ProcessorService/ProcessorHandler.cs"
        },
        "executable": false,
        "percentUnchanged": -1,
        "type": "ADD",
        "nodeType": "FILE",
        "links": {
          "self": [
            null
          ]
        },
        "properties": {
          "gitChangeType": "ADD"
        }
      },
      {
        "contentId": "content789abcdef0123456789abcdef0123456789ab",
        "fromContentId": "content987654321fedcba0987654321fedcba098765",
        "path": {
          "components": [
            "src",
            "MyProject",
            "Extensions",
            "DatabaseExtensions.cs"
          ],
          "parent": "src/MyProject/Extensions",
          "name": "DatabaseExtensions.cs",
          "extension": "cs",
          "toString": "src/MyProject/Extensions/DatabaseExtensions.cs"
        },
        "executable": false,
        "percentUnchanged": -1,
        "type": "MODIFY",
        "nodeType": "FILE",
        "srcExecutable": false,
        "links": {
          "self": [
            null
          ]
        },
        "properties": {
          "gitChangeType": "MODIFY"
        }
      },
      {
        "contentId": "contentabcdef0123456789abcdef0123456789abcd",
        "fromContentId": "0000000000000000000000000000000000000000",
        "path": {
          "components": [
            "src",
            "MyProject",
            "Services",
            "EventHandlers",
            "RequestHandler.cs"
          ],
          "parent": "src/MyProject/Services/EventHandlers",
          "name": "RequestHandler.cs",
          "extension": "cs",
          "toString": "src/MyProject/Services/EventHandlers/RequestHandler.cs"
        },
        "executable": false,
        "percentUnchanged": -1,
        "type": "ADD",
        "nodeType": "FILE",
        "links": {
          "self": [
            null
          ]
        },
        "properties": {
          "orphanedComments": 0,
          "gitChangeType": "ADD",
          "activeComments": 1
        }
      },
      {
        "contentId": "contentdef0123456789abcdef0123456789abcdef01",
        "fromContentId": "contentfedcba9876543210fedcba9876543210fedcb",
        "path": {
          "components": [
            "tests",
            "MyProject.Tests",
            "Handlers",
            "Api",
            "ProcessorHandlerTests.cs"
          ],
          "parent": "tests/MyProject.Tests/Handlers/Api",
          "name": "ProcessorHandlerTests.cs",
          "extension": "cs",
          "toString": "tests/MyProject.Tests/Handlers/Api/ProcessorHandlerTests.cs"
        },
        "executable": false,
        "percentUnchanged": 54,
        "type": "MOVE",
        "nodeType": "FILE",
        "srcPath": {
          "components": [
            "tests",
            "MyProject.Tests",
            "Handlers",
            "Api",
            "ImageHandlerTests.cs"
          ],
          "parent": "tests/MyProject.Tests/Handlers/Api",
          "name": "ImageHandlerTests.cs",
          "extension": "cs",
          "toString": "tests/MyProject.Tests/Handlers/Api/ImageHandlerTests.cs"
        },
        "srcExecutable": false,
        "links": {
          "self": [
            null
          ]
        },
        "properties": {
          "gitChangeType": "RENAME"
        }
      }
    ],
    "size": 5,
    "isLastPage": true,
    "start": 0,
    "limit": 25,
    "nextPageStart": null
  };

  describe('simplifyBitbucketPRChanges', () => {
    it('should simplify valid PR changes response correctly', () => {
      const result = simplifyBitbucketPRChanges(validPRChangesResponse);

      const expectedResult = {
        fromHash: 'abc123def456789012345678901234567890abcd',
        toHash: 'def456abc789012345678901234567890123cdef',
        changeScope: 'ALL',
        changes: [
          {
            contentId: 'content123456789abcdef0123456789abcdef01234',
            path: {
              name: 'ImageHandler.cs',
              path: 'src/MyProject/Handlers/Api/ImageProcessor/ImageHandler.cs',
              extension: 'cs'
            },
            type: 'DELETE',
            gitChangeType: 'DELETE'
          },
          {
            contentId: 'content456789abcdef0123456789abcdef012345678',
            path: {
              name: 'ProcessorHandler.cs',
              path: 'src/MyProject/Handlers/Api/ProcessorService/ProcessorHandler.cs',
              extension: 'cs'
            },
            type: 'ADD',
            gitChangeType: 'ADD'
          },
          {
            contentId: 'content789abcdef0123456789abcdef0123456789ab',
            path: {
              name: 'DatabaseExtensions.cs',
              path: 'src/MyProject/Extensions/DatabaseExtensions.cs',
              extension: 'cs'
            },
            type: 'MODIFY',
            gitChangeType: 'MODIFY'
          },
          {
            contentId: 'contentabcdef0123456789abcdef0123456789abcd',
            path: {
              name: 'RequestHandler.cs',
              path: 'src/MyProject/Services/EventHandlers/RequestHandler.cs',
              extension: 'cs'
            },
            type: 'ADD',
            gitChangeType: 'ADD',
            comments: 1
          },
          {
            contentId: 'contentdef0123456789abcdef0123456789abcdef01',
            path: {
              name: 'ProcessorHandlerTests.cs',
              path: 'tests/MyProject.Tests/Handlers/Api/ProcessorHandlerTests.cs',
              extension: 'cs'
            },
            srcPath: {
              name: 'ImageHandlerTests.cs',
              path: 'tests/MyProject.Tests/Handlers/Api/ImageHandlerTests.cs',
              extension: 'cs'
            },
            type: 'MOVE',
            gitChangeType: 'RENAME'
          }
        ],
        summary: {
          totalChanges: 5,
          additions: 2,
          deletions: 1,
          modifications: 1,
          moves: 1,
          filesWithComments: 1
        },
        isLastPage: true
      };

      expect(result).toEqual(expectedResult);
    });

    it('should handle malformed input gracefully', () => {
      const malformedInput = { invalid: 'data' } as any;
      const result = simplifyBitbucketPRChanges(malformedInput);

      // Should return original response for malformed input
      expect(result).toBe(malformedInput);
    });

    it('should handle empty values array', () => {
      const emptyResponse = {
        "fromHash": "abc123",
        "toHash": "def456",
        "properties": {
          "changeScope": "ALL"
        },
        "values": [],
        "size": 0,
        "isLastPage": true,
        "start": 0,
        "limit": 25,
        "nextPageStart": null
      };

      const result = simplifyBitbucketPRChanges(emptyResponse);

      const expectedResult = {
        fromHash: "abc123",
        toHash: "def456",
        changeScope: "ALL",
        changes: [],
        summary: {
          totalChanges: 0,
          additions: 0,
          deletions: 0,
          modifications: 0,
          moves: 0,
          filesWithComments: 0
        },
        isLastPage: true
      };

      expect(result).toEqual(expectedResult);
    });

    it('should reduce response size significantly', () => {
      const originalSize = JSON.stringify(validPRChangesResponse).length;
      const simplified = simplifyBitbucketPRChanges(validPRChangesResponse);
      const simplifiedSize = JSON.stringify(simplified).length;

      const reduction = (originalSize - simplifiedSize) / originalSize;
      expect(reduction).toBeGreaterThan(0.4); // At least 40% reduction

      console.log(`Original size: ${originalSize} characters`);
      console.log(`Simplified size: ${simplifiedSize} characters`);
      console.log(`Reduction: ${(reduction * 100).toFixed(1)}%`);
    });

    it('should handle missing optional fields gracefully', () => {
      const responseWithMissingFields = {
        ...validPRChangesResponse,
        values: [
          {
            "contentId": "test123",
            "fromContentId": "test456",
            "path": {
              "components": ["test"],
              "parent": "",
              "name": "test.txt",
              "extension": "txt",
              "toString": "test.txt"
            },
            "type": "ADD",
            "properties": {
              "gitChangeType": "ADD"
            }
          }
        ]
      };

      const result = simplifyBitbucketPRChanges(responseWithMissingFields);

      const expectedResult = {
        fromHash: 'abc123def456789012345678901234567890abcd',
        toHash: 'def456abc789012345678901234567890123cdef',
        changeScope: 'ALL',
        changes: [
          {
            contentId: "test123",
            path: {
              name: "test.txt",
              path: "test.txt",
              extension: "txt"
            },
            type: "ADD",
            gitChangeType: "ADD"
            // Note: no 'comments' or 'srcPath' properties as they are optional and missing
          }
        ],
        summary: {
          totalChanges: 1,
          additions: 1,
          deletions: 0,
          modifications: 0,
          moves: 0,
          filesWithComments: 0
        },
        isLastPage: true
      };

      expect(result).toEqual(expectedResult);
    });
  });

  describe('getChangesSummary', () => {
    it('should return changes summaries as string array', () => {
      const summary = getChangesSummary(validPRChangesResponse);
      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(5);

      expect(summary[0]).toContain('Deleted: src/MyProject/Handlers/Api/ImageProcessor/ImageHandler.cs');
      expect(summary[1]).toContain('Added: src/MyProject/Handlers/Api/ProcessorService/ProcessorHandler.cs');
      expect(summary[2]).toContain('Modified: src/MyProject/Extensions/DatabaseExtensions.cs');
      expect(summary[3]).toContain('Added: src/MyProject/Services/EventHandlers/RequestHandler.cs');
      expect(summary[3]).toContain('[1 comment]');
      expect(summary[4]).toContain('Moved: tests/MyProject.Tests/Handlers/Api/ProcessorHandlerTests.cs');
      expect(summary[4]).toContain('(from tests/MyProject.Tests/Handlers/Api/ImageHandlerTests.cs)');
    });

    it('should handle malformed input gracefully', () => {
      const summary = getChangesSummary({ invalid: 'data' } as any);
      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(0);
    });

    it('should handle empty values array', () => {
      const emptyResponse = {
        "fromHash": "abc123",
        "toHash": "def456",
        "properties": {
          "changeScope": "ALL"
        },
        "values": [],
        "size": 0,
        "isLastPage": true,
        "start": 0,
        "limit": 25,
        "nextPageStart": null
      };

      const summary = getChangesSummary(emptyResponse);
      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(0);
    });
  });
});
