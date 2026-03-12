import { ConfluenceService, escapeSearchTextForCql } from '../confluence-service.js';
import { SearchService } from '../confluence-client/index.js';

jest.mock('../confluence-client/index.js', () => ({
  ContentResourceService: {},
  SearchService: {
    search1: jest.fn(),
  },
  OpenAPI: {
    BASE: '',
    TOKEN: '',
    VERSION: '',
  },
}));

describe('escapeSearchTextForCql', () => {
  it('returns plain text unchanged', () => {
    expect(escapeSearchTextForCql('hello')).toBe('hello');
    expect(escapeSearchTextForCql('space name')).toBe('space name');
  });

  it('escapes double quotes', () => {
    expect(escapeSearchTextForCql('say "hello"')).toBe('say \\"hello\\"');
  });

  it('escapes backslashes first so they cannot escape the following quote', () => {
    expect(escapeSearchTextForCql('\\')).toBe('\\\\');
    expect(escapeSearchTextForCql('path\\to\\space')).toBe('path\\\\to\\\\space');
  });

  it('escapes backslash then quote correctly (order matters)', () => {
    expect(escapeSearchTextForCql('\\"')).toBe('\\\\\\"');
  });

  it('escapes quote then backslash correctly', () => {
    expect(escapeSearchTextForCql('"\\')).toBe('\\"\\\\');
  });

  it('prevents CQL injection via quoted phrase breakout', () => {
    const malicious = '" OR type=page AND text ~ "secret';
    const escaped = escapeSearchTextForCql(malicious);
    expect(escaped).toContain('\\"');
    expect(escaped).not.toBe(malicious);
  });

  it('double-escaping is not idempotent (call once only)', () => {
    const input = 'foo"bar\\baz';
    const once = escapeSearchTextForCql(input);
    const twice = escapeSearchTextForCql(once);
    expect(twice).not.toBe(once);
    expect(twice).toContain('\\\\');
  });

  it('handles empty string', () => {
    expect(escapeSearchTextForCql('')).toBe('');
  });
});

describe('ConfluenceService.searchSpaces', () => {
  let service: ConfluenceService;

  beforeEach(() => {
    service = new ConfluenceService('test-host', 'test-token');
    jest.clearAllMocks();
  });

  it('builds CQL with escaped searchText and calls SearchService', async () => {
    (SearchService.search1 as jest.Mock).mockResolvedValue({ results: [] });

    await service.searchSpaces('my space', 10, 0);

    expect(SearchService.search1).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '10',
      '0',
      undefined,
      'type=space AND title ~ "my space"'
    );
  });

  it('escapes quotes in searchText in the CQL passed to the API', async () => {
    (SearchService.search1 as jest.Mock).mockResolvedValue({ results: [] });

    await service.searchSpaces('say "hello"', 5);

    expect(SearchService.search1).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '5',
      undefined,
      undefined,
      'type=space AND title ~ "say \\"hello\\""'
    );
  });

  it('escapes backslashes in searchText in the CQL passed to the API', async () => {
    (SearchService.search1 as jest.Mock).mockResolvedValue({ results: [] });

    await service.searchSpaces('path\\to\\space', 5);

    expect(SearchService.search1).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '5',
      undefined,
      undefined,
      'type=space AND title ~ "path\\\\to\\\\space"'
    );
  });

  it('forwards API errors via handleApiOperation', async () => {
    const err = new Error('API error');
    (SearchService.search1 as jest.Mock).mockRejectedValue(err);

    const result = await service.searchSpaces('test');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
