import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Reference for the text syntax understood by lib/markdown.ts. */
export function FormattingHelp() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Formatting help</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          <dt><code>## Heading</code></dt><dd>Section heading</dd>
          <dt><code>### Smaller</code></dt><dd>Sub-heading</dd>
          <dt><code>- item</code></dt><dd>Bullet list</dd>
          <dt><code>**bold**</code></dt><dd><strong>bold</strong></dd>
          <dt>Blank line</dt><dd>New paragraph</dd>
        </dl>
        <p className="text-muted-foreground">HTML is not allowed and is shown as plain text. This keeps the site safe.</p>
      </CardContent>
    </Card>
  );
}
