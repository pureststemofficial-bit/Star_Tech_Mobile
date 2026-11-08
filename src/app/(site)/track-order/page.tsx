import { Container } from '@/components/site/container';
import { Card, CardContent } from '@/components/ui/card';
import { getI18n, titled } from '@/lib/i18n/server';
import { TrackForm } from './track-form';

export const generateMetadata = titled('track.title');

export default async function TrackOrderPage() {
  const { t } = await getI18n();
  return (
    <Container className="max-w-3xl pt-12">
      <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] leading-none">{t('track.title')}</h1>
      <p className="mt-3 mb-8 text-muted-foreground">{t('track.body')}</p>
      <Card><CardContent><TrackForm /></CardContent></Card>
    </Container>
  );
}
