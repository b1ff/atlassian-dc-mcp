import { cleanCodeSearchSnippets, describeUnhonoredQuery } from '../code-search-mapper.js';

describe('cleanCodeSearchSnippets', () => {
  const makeResponse = (text: string) => ({
    code: {
      count: 1,
      values: [
        {
          repository: { slug: 'demo', project: { key: 'TEST' } },
          file: 'src/app.ts',
          hitContexts: [[{ line: 12, text }]],
        },
      ],
    },
  });

  const cleanedText = (text: string) => {
    const result = cleanCodeSearchSnippets(makeResponse(text)) as ReturnType<typeof makeResponse>;
    return result.code.values[0].hitContexts[0][0].text;
  };

  it('strips em tags wrapping matched terms', () => {
    expect(cleanedText('const <em>token</em> = read();')).toBe('const token = read();');
  });

  // Bitbucket emits empty pairs around token boundaries, e.g. `Atna.<em></em><em>Logger</em>`.
  it('strips empty em pairs', () => {
    expect(cleanedText('LoggerHub.<em></em>Create<em>Logger</em>Factory()')).toBe(
      'LoggerHub.CreateLoggerFactory()'
    );
  });

  it('decodes named entities', () => {
    expect(cleanedText('if (a &lt; b &amp;&amp; c &gt; d)')).toBe('if (a < b && c > d)');
  });

  it('decodes quote and non-breaking space entities', () => {
    expect(cleanedText('&quot;x&quot; &apos;y&apos;&nbsp;z')).toBe('"x" \'y\'\u00a0z');
  });

  it('decodes decimal numeric entities', () => {
    expect(cleanedText('a&#47;b')).toBe('a/b');
  });

  it('decodes hexadecimal numeric entities', () => {
    expect(cleanedText('&#x2F;&#x2F;&#x2F; &lt;summary&gt;')).toBe('/// <summary>');
  });

  it('leaves unrecognized entities untouched', () => {
    expect(cleanedText('&unknown; &amp;')).toBe('&unknown; &');
  });

  it('decodes a full snippet line while preserving indentation', () => {
    expect(
      cleanedText(
        '    &#x2F;&#x2F; comment &amp;&amp; more &lt;T&gt; &quot;x&quot; &#39;y&#39; &#47;z &unknown;'
      )
    ).toBe('    // comment && more <T> "x" \'y\' /z &unknown;');
  });

  it('leaves out-of-range numeric entities untouched', () => {
    expect(cleanedText('&#x110000;')).toBe('&#x110000;');
  });

  it('does not mutate the original response', () => {
    const original = makeResponse('a &lt; b');
    cleanCodeSearchSnippets(original);
    expect(original.code.values[0].hitContexts[0][0].text).toBe('a &lt; b');
  });

  it('cleans every block of a multi-block hit', () => {
    const result = cleanCodeSearchSnippets({
      code: {
        values: [
          {
            file: 'a.cs',
            hitContexts: [
              [{ line: 1, text: 'a &lt; b' }],
              [{ line: 9, text: 'c &gt; <em>d</em>' }],
            ],
          },
        ],
      },
    }) as Record<string, any>;

    expect(result.code.values[0].hitContexts[0][0].text).toBe('a < b');
    expect(result.code.values[0].hitContexts[1][0].text).toBe('c > d');
  });

  it('preserves unrelated response fields', () => {
    const result = cleanCodeSearchSnippets({
      scope: { type: 'GLOBAL' },
      code: { count: 7, isLastPage: false, nextStart: 5, values: [] },
    }) as Record<string, any>;

    expect(result.scope).toEqual({ type: 'GLOBAL' });
    expect(result.code).toEqual({ count: 7, isLastPage: false, nextStart: 5, values: [] });
  });

  it('returns hits without hit contexts unchanged', () => {
    const result = cleanCodeSearchSnippets({
      code: { values: [{ file: 'a.ts' }] },
    }) as Record<string, any>;

    expect(result.code.values[0]).toEqual({ file: 'a.ts' });
  });

  it('returns unrecognized payloads as-is', () => {
    expect(cleanCodeSearchSnippets(undefined)).toBeUndefined();
    expect(cleanCodeSearchSnippets({ error: 'nope' })).toEqual({ error: 'nope' });
  });
});

describe('describeUnhonoredQuery', () => {
  it('reports a substituted query and names the explicit AND as the cause', () => {
    const message = describeUnhonoredQuery({
      query: { substituted: true },
      code: { count: 10000, values: [] },
    });

    expect(message).toContain('silently ran a different');
    expect(message).toContain('"foo project:KEY"');
  });

  it('reports a query Bitbucket could not interpret at all', () => {
    const message = describeUnhonoredQuery({ query: null, code: { count: 0, values: [] } });

    expect(message).toContain('could not interpret');
    expect(message).toContain('project key');
  });

  it('accepts a query Bitbucket honored', () => {
    expect(
      describeUnhonoredQuery({ query: { substituted: false }, code: { values: [] } })
    ).toBeUndefined();
  });

  it('accepts responses that carry no query field', () => {
    expect(describeUnhonoredQuery({ code: { values: [] } })).toBeUndefined();
    expect(describeUnhonoredQuery(undefined)).toBeUndefined();
    expect(describeUnhonoredQuery('nonsense')).toBeUndefined();
  });
});
