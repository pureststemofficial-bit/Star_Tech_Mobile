import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Tips for the rich-text editor, plus the text syntax (lib/markdown.ts) shown in its Source view. */
export function FormattingHelp() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Formatting help</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="text-muted-foreground">Use the toolbar above the text, or these shortcuts: <kbd>Ctrl+B</kbd> bold, <kbd>Ctrl+I</kbd> italic, <kbd>Ctrl+U</kbd> underline, <kbd>Ctrl+K</kbd> link, <kbd>Ctrl+Alt+2/3/4</kbd> headings, <kbd>Ctrl+Alt+0</kbd> paragraph.</p>
        <p className="font-medium">In Source view</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          <dt><code>## Heading</code></dt><dd>Section heading (H2)</dd>
          <dt><code>### / ####</code></dt><dd>Smaller headings (H3, H4)</dd>
          <dt><code>**bold**</code></dt><dd><strong>bold</strong></dd>
          <dt><code>*italic*</code></dt><dd><em>italic</em></dd>
          <dt><code>++underline++</code></dt><dd><u>underline</u></dd>
          <dt><code>~~strike~~</code></dt><dd><s>strike</s></dd>
          <dt><code>- item</code></dt><dd>Bullet list</dd>
          <dt><code>1. item</code></dt><dd>Numbered list</dd>
          <dt><code>&gt; text</code></dt><dd>Quote</dd>
          <dt><code>---</code></dt><dd>Divider line</dd>
          <dt><code>[text](/repairs)</code></dt><dd>Link to a page or https:// site</dd>
          <dt>Blank line</dt><dd>New paragraph</dd>
        </dl>
        <p className="text-muted-foreground">The page title is the only H1, so the editor starts at H2. HTML is not allowed and is shown as plain text. This keeps the site safe.</p>
      </CardContent>
    </Card>
  );
}
