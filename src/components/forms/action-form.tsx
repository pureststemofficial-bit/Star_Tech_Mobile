'use client';

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FormState } from '@/lib/types';

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const PendingContext = createContext<boolean | null>(null);

/**
 * A <form> wired to a Server Action with useActionState. Validation errors from the server are
 * shown above the fields, and typed values are kept (we submit manually so React doesn't reset
 * the form). Without JavaScript it still works as a normal form post.
 */
export function ActionForm({
  action,
  children,
  className,
  toastOnSuccess = false,
  resetOnSuccess = false,
  render,
  ...props
}: Omit<React.ComponentProps<'form'>, 'action' | 'children'> & {
  action: Action;
  children?: React.ReactNode;
  toastOnSuccess?: boolean;
  resetOnSuccess?: boolean;
  /** Optional render prop for showing returned data (e.g. order tracking results). */
  render?: (state: FormState) => React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message && toastOnSuccess) toast.success(state.message);
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, toastOnSuccess, resetOnSuccess]);

  return (
    <>
      <form
        ref={ref}
        action={formAction}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(fd));
        }}
        className={className}
        {...props}
      >
        <PendingContext.Provider value={pending}>
          {state.errors?.length ? (
            <Alert variant="destructive" className="mb-4">
              <TriangleAlert />
              <AlertDescription>
                {state.errors.length === 1 ? state.errors[0] : <ul>{state.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
              </AlertDescription>
            </Alert>
          ) : null}
          {state.ok && state.message && !toastOnSuccess ? (
            <Alert variant="success" className="mb-4">
              <CircleCheck />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          {children}
        </PendingContext.Provider>
      </form>
      {render?.(state)}
    </>
  );
}

/** Submit button that shows a spinner while its form's action is running. */
export function SubmitButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  const ctx = useContext(PendingContext);
  const status = useFormStatus();
  const pending = ctx ?? status.pending;
  return (
    <Button type="submit" disabled={pending || props.disabled} className={cn(className)} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

/** Submit button that asks for confirmation first (deletes, disabling accounts...). */
export function ConfirmButton({ message, children, ...props }: React.ComponentProps<typeof Button> & { message: string }) {
  return (
    <SubmitButton
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </SubmitButton>
  );
}
