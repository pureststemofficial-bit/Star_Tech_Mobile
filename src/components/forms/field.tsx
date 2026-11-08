'use client';

import { Label } from '@/components/ui/label';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

/** Label + control + optional hint, laid out consistently across every form. */
export function Field({
  label,
  htmlFor,
  hint,
  optional,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground">{t('form.optional')}</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
