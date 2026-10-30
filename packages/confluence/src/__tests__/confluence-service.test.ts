import { ConfluenceService, applyStorageEdits, escapeSearchTextForCql } from '../confluence-service.js';
import { ContentResourceService, SearchService } from '../confluence-client/index.js';

jest.mock('../confluence-client/index.js', () => ({
  ContentResourceService: {
    getContentById: jest.fn(),
    createContent: jest.fn(),
    update2: jest.fn(),
  },
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

describe('applyStorageEdits', () => {
  const body = '<p>Host</p><table><tr><td>a b</td><td>old</td></tr></table>';

  it('replaces each oldStr in order', () => {
    const result = applyStorageEdits(body, [
      { oldStr: '<td>old</td>', newStr: '<td>new</td>' },
      { oldStr: '<p>Host</p>', newStr: '<p>Hosts</p>' },
    ]);
    expect(result).toBe('<p>Hosts</p><table><tr><td>a b</td><td>new</td></tr></table>');
  });

  it('sees the result of earlier edits', () => {
    const result = applyStorageEdits(body, [
      { oldStr: 'old', newStr: 'mid' },
      { oldStr: 'mid', newStr: 'new' },
    ]);
    expect(result).toContain('<td>new</td>');
  });

  it('deletes oldStr when newStr is empty', () => {
    expect(applyStorageEdits(body, [{ oldStr: '<p>Host</p>', newStr: '' }])).toBe(body.slice('<p>Host</p>'.length));
  });

  it('keeps $ sequences in newStr literal', () => {
    expect(applyStorageEdits(body, [{ oldStr: 'old', newStr: "$& $' $1" }])).toContain("<td>$& $' $1</td>");
  });

  it('keeps non-breaking spaces outside the edited text', () => {
    expect(applyStorageEdits(body, [{ oldStr: 'old', newStr: 'new' }])).toContain('a b');
  });

  it('rejects oldStr typed with a plain space where storage has U+00A0', () => {
    expect(() => applyStorageEdits(body, [{ oldStr: '<td>a b</td>', newStr: 'x' }]))
      .toThrow(/edits\[0\].*found 0.*U\+00A0/);
  });

  it('rejects an oldStr that occurs more than once', () => {
    expect(() => applyStorageEdits(body, [{ oldStr: '<td>', newStr: 'x' }]))
      .toThrow(/edits\[0\].*found 2.*more surrounding text/);
  });

  it('rejects an empty oldStr', () => {
    expect(() => applyStorageEdits(body, [{ oldStr: '', newStr: 'x' }])).toThrow(/edits\[0\]\.oldStr must not be empty/);
  });

  it('applies nothing when a later edit fails', () => {
    const input = body;
    expect(() => applyStorageEdits(input, [
      { oldStr: 'old', newStr: 'new' },
      { oldStr: 'missing', newStr: 'x' },
    ])).toThrow(/edits\[1\]/);
    expect(input).toBe(body);
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
      'none',
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
      'none',
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
      'none',
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

describe('ConfluenceService token optimization paths', () => {
  let service: ConfluenceService;

  beforeEach(() => {
    service = new ConfluenceService('test-host', 'test-token');
    jest.clearAllMocks();
  });

  it('keeps storage mode as the default body shape', async () => {
    const mockContent = {
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        storage: {
          value: '<p>Hello</p>',
          representation: 'storage',
        },
      },
    };
    (ContentResourceService.getContentById as jest.Mock).mockResolvedValue(mockContent);

    const result = await service.getContent('123');

    expect(result.success).toBe(true);
    expect(result.data).toBe(mockContent);
    expect(ContentResourceService.getContentById).toHaveBeenCalledWith('123', 'body.storage');
  });

  it('converts storage XML to text when bodyMode is text', async () => {
    (ContentResourceService.getContentById as jest.Mock).mockResolvedValue({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        storage: {
          value: '<p>Hello &amp; <strong>world</strong></p><ul><li>One</li><li>Two</li></ul>',
          representation: 'storage',
        },
      },
      version: { number: 3 },
    });

    const result = await service.getContent('123', 'version', 'text');

    expect(result.success).toBe(true);
    expect(ContentResourceService.getContentById).toHaveBeenCalledWith('123', 'version,body.storage');
    expect(result.data).toMatchObject({
      id: '123',
      type: 'page',
      title: 'Test page',
      version: { number: 3 },
      body: {
        text: {
          representation: 'text',
        },
      },
    });
    expect((result.data as any).body.text.value).toContain('Hello & world');
    expect((result.data as any).body.text.value).toContain('- One');
    expect((result.data as any).body.text.value).toContain('- Two');
  });

  it('truncates text bodies when maxBodyChars is provided', async () => {
    (ContentResourceService.getContentById as jest.Mock).mockResolvedValue({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        storage: {
          value: '<p>Hello world</p>',
          representation: 'storage',
        },
      },
    });

    const result = await service.getContent('123', undefined, 'text', 5);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        text: {
          value: 'Hello',
          representation: 'text',
          truncated: true,
          originalLength: 11,
        },
      },
    });
  });

  it('slices text bodies from a requested start offset', async () => {
    (ContentResourceService.getContentById as jest.Mock).mockResolvedValue({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        storage: {
          value: '<p>0123456789</p>',
          representation: 'storage',
        },
      },
    });

    const result = await service.getContent('123', undefined, 'text', 4, 3);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        text: {
          value: '3456',
          representation: 'text',
          truncated: true,
          originalLength: 10,
          start: 3,
          end: 7,
        },
      },
    });
  });

  it('supports negative start offsets for tail reads', async () => {
    (ContentResourceService.getContentById as jest.Mock).mockResolvedValue({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        storage: {
          value: '<p>0123456789</p>',
          representation: 'storage',
        },
      },
    });

    const result = await service.getContent('123', undefined, 'text', undefined, -4);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        text: {
          value: '6789',
          representation: 'text',
          truncated: true,
          originalLength: 10,
          start: 6,
          end: 10,
        },
      },
    });
  });

  it('omits the body when bodyMode is none', async () => {
    (ContentResourceService.getContentById as jest.Mock).mockResolvedValue({
      id: '123',
      type: 'page',
      title: 'Test page',
      body: {
        storage: {
          value: '<p>Hello</p>',
          representation: 'storage',
        },
      },
      version: { number: 1 },
    });

    const result = await service.getContent('123', undefined, 'none');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: '123',
      type: 'page',
      title: 'Test page',
      version: { number: 1 },
    });
  });

  it('uses the package default limit and no excerpt for content search', async () => {
    (SearchService.search1 as jest.Mock).mockResolvedValue({ results: [] });

    await service.searchContent('type=page');

    expect(SearchService.search1).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      '25',
      undefined,
      'none',
      'type=page'
    );
  });

  it('forwards explicit excerpt for space search', async () => {
    (SearchService.search1 as jest.Mock).mockResolvedValue({ results: [] });

    await service.searchSpaces('docs', 5, 10, 'space.icon', 'highlight');

    expect(SearchService.search1).toHaveBeenCalledWith(
      undefined,
      'space.icon',
      undefined,
      '5',
      '10',
      'highlight',
      'type=space AND title ~ "docs"'
    );
  });
});
