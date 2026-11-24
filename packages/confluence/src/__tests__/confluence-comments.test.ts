import { ConfluenceService } from '../confluence-service.js';
import { ChildContentService, ContentResourceService } from '../confluence-client/index.js';
import { shapeConfluenceComment, shapeConfluenceComments } from '../confluence-response-mapper.js';

jest.mock('../confluence-client/index.js', () => ({
  ChildContentService: {
    commentsOfContent: jest.fn(),
  },
  ContentResourceService: {
    createContent: jest.fn(),
  },
  SearchService: {},
  UserService: {},
  OpenAPI: { BASE: '', TOKEN: '', VERSION: '' },
}));

const storageBody = (value: string) => ({ storage: { value, representation: 'storage' } });

const topLevelComment = {
  id: '200',
  type: 'comment',
  title: 'Re: Example page',
  extensions: { location: 'footer' },
  history: { createdBy: { displayName: 'Jane Doe', username: 'jdoe' }, createdDate: '2026-01-02T10:00:00.000Z' },
  ancestors: [],
  body: storageBody('<p>First &amp; foremost</p>'),
};

const nestedReply = {
  id: '202',
  type: 'comment',
  title: 'Re: Example page',
  extensions: { location: 'footer' },
  history: { createdBy: { displayName: 'John Roe' }, createdDate: '2026-01-02T12:00:00.000Z' },
  ancestors: [{ id: '201', type: 'comment' }, { id: '200', type: 'comment' }],
  body: storageBody('<p>Reply to the reply</p>'),
};

describe('ConfluenceService.createComment', () => {
  let service: ConfluenceService;

  beforeEach(() => {
    service = new ConfluenceService('test-host', 'test-token');
    jest.clearAllMocks();
    (ContentResourceService.createContent as jest.Mock).mockResolvedValue({ id: '300', type: 'comment' });
  });

  it('creates a top-level comment with the page as container and no ancestors', async () => {
    const result = await service.createComment('12345', '<p>Looks good</p>');

    expect(result.success).toBe(true);
    expect(ContentResourceService.createContent).toHaveBeenCalledWith({
      type: 'comment',
      container: { id: '12345', type: 'page' },
      body: storageBody('<p>Looks good</p>'),
    });
  });

  it('creates a reply with the parent comment as ancestor', async () => {
    await service.createComment('12345', '<p>Agreed</p>', '200');

    expect(ContentResourceService.createContent).toHaveBeenCalledWith({
      type: 'comment',
      container: { id: '12345', type: 'page' },
      ancestors: [{ id: '200' }],
      body: storageBody('<p>Agreed</p>'),
    });
  });

  it('uses the given container type for a blog post', async () => {
    await service.createComment('12345', '<p>Nice post</p>', undefined, 'blogpost');

    const payload = (ContentResourceService.createContent as jest.Mock).mock.calls[0][0];
    expect(payload.container).toEqual({ id: '12345', type: 'blogpost' });
    expect(payload).not.toHaveProperty('ancestors');
  });

  it('forwards API errors via handleApiOperation', async () => {
    (ContentResourceService.createContent as jest.Mock).mockRejectedValue(new Error('API error'));

    const result = await service.createComment('12345', '<p>Looks good</p>');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('ConfluenceService.getComments', () => {
  let service: ConfluenceService;

  beforeEach(() => {
    service = new ConfluenceService('test-host', 'test-token');
    jest.clearAllMocks();
    (ChildContentService.commentsOfContent as jest.Mock).mockResolvedValue({
      results: [topLevelComment, nestedReply],
      start: 0,
      limit: 25,
      size: 2,
      _links: {},
    });
  });

  it('requests every comment with ancestors, body and history at the default page size', async () => {
    await service.getComments({ contentId: '12345' });

    expect(ChildContentService.commentsOfContent).toHaveBeenCalledWith(
      '12345',
      'body.storage,ancestors,history',
      'all',
      '25',
      undefined,
      undefined,
    );
  });

  it('forwards root depth, location and pagination', async () => {
    await service.getComments({ contentId: '12345', depth: 'root', location: 'inline', limit: 10, start: 20 });

    expect(ChildContentService.commentsOfContent).toHaveBeenCalledWith(
      '12345',
      'body.storage,ancestors,history',
      undefined,
      '10',
      '20',
      'inline',
    );
  });

  it('returns compact comments with the parent id of each reply', async () => {
    const result = await service.getComments({ contentId: '12345' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      comments: [
        {
          id: '200',
          location: 'footer',
          author: 'Jane Doe',
          created: '2026-01-02T10:00:00.000Z',
          body: '<p>First &amp; foremost</p>',
        },
        {
          id: '202',
          parentId: '201',
          location: 'footer',
          author: 'John Roe',
          created: '2026-01-02T12:00:00.000Z',
          body: '<p>Reply to the reply</p>',
        },
      ],
      start: 0,
      size: 2,
    });
  });

  it('forwards API errors via handleApiOperation', async () => {
    (ChildContentService.commentsOfContent as jest.Mock).mockRejectedValue(new Error('API error'));

    const result = await service.getComments({ contentId: '12345' });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('shapeConfluenceComment', () => {
  it('converts the body to text when bodyMode is text', () => {
    expect(shapeConfluenceComment(topLevelComment, 'text').body).toBe('First & foremost');
  });

  it('omits the body when bodyMode is none', () => {
    expect(shapeConfluenceComment(topLevelComment, 'none')).not.toHaveProperty('body');
  });

  it('falls back to the username when the author has no display name', () => {
    const comment = { ...topLevelComment, history: { createdBy: { username: 'jdoe' } } };
    expect(shapeConfluenceComment(comment).author).toBe('jdoe');
  });
});

describe('shapeConfluenceComments', () => {
  it('reports the next start index when more comments are available', () => {
    const shaped = shapeConfluenceComments({
      results: [topLevelComment, nestedReply],
      start: 20,
      _links: { next: '/rest/api/content/12345/child/comment?start=22' },
    });

    expect(shaped.start).toBe(20);
    expect(shaped.size).toBe(2);
    expect(shaped.nextStart).toBe(22);
  });

  it('returns an empty list when the page has no comments', () => {
    expect(shapeConfluenceComments({ results: [], start: 0, _links: {} })).toEqual({ comments: [], start: 0, size: 0 });
  });
});
