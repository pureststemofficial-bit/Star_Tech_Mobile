'use client';

import { Input } from '@/components/ui/input';
import { useI18n } from '@/components/i18n-provider';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Field } from '@/components/forms/field';
import { changePassword } from '@/actions/account';

/** Used by both the customer account and the admin panel. */
export function PasswordForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={changePassword} resetOnSuccess className="grid gap-4">
      <Field label={t('form.currentPassword')} htmlFor="current_password">
        <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.newPassword')} htmlFor="new_password" hint={t('form.passwordHint')}>
          <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label={t('form.confirmNewPassword')} htmlFor="new_password_confirm">
          <Input id="new_password_confirm" name="new_password_confirm" type="password" autoComplete="new-password" required />
        </Field>
      </div>
      <div><SubmitButton>{t('form.updatePassword')}</SubmitButton></div>
    </ActionForm>
  );
}
