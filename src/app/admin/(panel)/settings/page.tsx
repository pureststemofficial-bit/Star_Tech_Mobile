import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { PageHeader } from '@/components/admin/page-header';
import { saveSettings } from '@/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { settings, type SettingKey } from '@/lib/store';
import { fromPence } from '@/lib/format';

export const metadata: Metadata = { title: 'Site settings' };

export default async function SettingsAdmin() {
  await requireAdmin();
  const s = settings();
  const text = (key: SettingKey, label: string, hint?: string, max = 300) => (
    <Field label={label} htmlFor={key} hint={hint}><Input id={key} name={key} defaultValue={s[key]} maxLength={max} /></Field>
  );
  const area = (key: SettingKey, label: string, hint?: string, rows = 4) => (
    <Field label={label} htmlFor={key} hint={hint}><Textarea id={key} name={key} defaultValue={s[key]} rows={rows} maxLength={5000} /></Field>
  );
  const section = (title: string, children: React.ReactNode) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader title="Site settings" description="Everything shown on the website that isn't a product, category or page." />
      <ActionForm key={JSON.stringify(s).length} action={saveSettings} toastOnSuccess className="grid gap-5">
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {section('General', <>
            {text('site_name', 'Store name', undefined, 80)}
            {text('tagline', 'Tagline', 'Shown in the footer.')}
            {text('announcement', 'Footer strapline')}
            {area('meta_description', 'Search engine description', 'Shown by Google under your site name (150–160 characters is ideal).', 3)}
          </>)}
          {section('Home page banner', <>
            {area('hero_title', 'Headline', 'Each line appears on a new line.', 4)}
            {text('hero_subtitle', 'Sub-heading')}
            <div className="grid gap-4 sm:grid-cols-2">
              {text('hero_button_text', 'Button text', undefined, 40)}
              {text('hero_button_link', 'Button link', 'e.g. /shop or /shop?category=gaming')}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.hero_image} alt="Current banner" width={400} height={280} className="h-auto w-full max-w-sm rounded-lg" />
            <Field label="Replace banner image" htmlFor="hero_image_file" hint="Landscape image, ideally 1400×980 px or larger.">
              <Input id="hero_image_file" name="hero_image_file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="h-auto py-2" />
            </Field>
            <Label className="font-medium"><Checkbox name="reset_hero" /> Restore the default banner image</Label>
          </>)}
          {section('Feature strip & shop banner', <>
            {area('features', 'Four selling points', 'One per line as “Title|Subtitle”. Shown on the home and about pages.', 4)}
            {text('shop_title', 'Shop banner title')}
            {text('shop_subtitle', 'Shop banner subtitle')}
          </>)}
          {section('Delivery & payment', <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Free delivery over (€)" htmlFor="free_delivery" hint="0 = never free"><Input id="free_delivery" name="free_delivery" inputMode="decimal" defaultValue={fromPence(Number(s.free_delivery_pence))} /></Field>
              <Field label="Delivery charge (€)" htmlFor="delivery_fee"><Input id="delivery_fee" name="delivery_fee" inputMode="decimal" defaultValue={fromPence(Number(s.delivery_fee_pence))} /></Field>
            </div>
            {area('payment_methods', 'Payment options at checkout', 'One per line.', 4)}
          </>)}
          {section('Repair booking', <>
            {text('repair_title', 'Banner title')}
            {text('repair_subtitle', 'Banner subtitle')}
            {text('repair_text', 'Banner text')}
            <div className="grid gap-4 sm:grid-cols-2">
              {area('repair_device_types', 'Device types', 'One per line.', 6)}
              {area('repair_brands', 'Brands', 'One per line.', 6)}
              {area('repair_types', 'Repair types', 'One per line.', 6)}
              {area('repair_times', 'Time slots', 'One per line.', 6)}
            </div>
          </>)}
          {section('Portuguese version', <>
            <p className="text-sm text-muted-foreground">Shown to visitors browsing in Portuguese. For lists, keep the same number of lines in the same order as the English list.</p>
            {text('tagline_pt', 'Tagline')}
            {text('announcement_pt', 'Footer strapline')}
            {area('meta_description_pt', 'Search engine description', undefined, 3)}
            {area('hero_title_pt', 'Banner headline', undefined, 3)}
            {text('hero_subtitle_pt', 'Banner sub-heading')}
            {text('hero_button_text_pt', 'Banner button text', undefined, 40)}
            {area('features_pt', 'Four selling points', 'One per line as “Title|Subtitle”.', 4)}
            {text('shop_title_pt', 'Shop banner title')}
            {text('shop_subtitle_pt', 'Shop banner subtitle')}
            {text('repair_title_pt', 'Repair banner title')}
            {text('repair_subtitle_pt', 'Repair banner subtitle')}
            {text('repair_text_pt', 'Repair banner text')}
            {area('repair_device_types_pt', 'Device types', 'Same order as English.', 6)}
            {area('repair_types_pt', 'Repair types', 'Same order as English.', 6)}
            {area('payment_methods_pt', 'Payment options at checkout', 'Same order as English.', 3)}
            {area('hours_pt', 'Opening hours', undefined, 3)}
          </>)}
          {section('Contact details & social links', <>
            <div className="grid gap-4 sm:grid-cols-2">
              {text('phone', 'Phone', undefined, 30)}
              {text('email', 'Email', undefined, 254)}
            </div>
            {area('address', 'Address', undefined, 3)}
            {area('hours', 'Opening hours', undefined, 3)}
            {text('map_query', 'Map location', 'Address shown on the Google map on the Contact page.')}
            <div className="grid gap-4 sm:grid-cols-2">
              {text('social_facebook', 'Facebook')}
              {text('social_instagram', 'Instagram')}
              {text('social_tiktok', 'TikTok')}
              {text('social_youtube', 'YouTube')}
            </div>
            <p className="text-xs text-muted-foreground">Links must start with https://. Leave blank to hide an icon.</p>
          </>)}
        </div>
        <div className="sticky bottom-0 flex justify-end bg-gradient-to-t from-background via-background/90 to-transparent py-4">
          <SubmitButton size="lg">Save settings</SubmitButton>
        </div>
      </ActionForm>
    </>
  );
}
