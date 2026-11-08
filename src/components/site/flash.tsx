import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { takeFlash } from '@/lib/session';

/** One-time message set by a Server Action before redirecting (e.g. "Address saved."). */
export async function Flash({ className }: { className?: string }) {
  const flash = await takeFlash();
  if (!flash) return null;
  const variant = flash.type === 'error' ? 'destructive' : flash.type === 'success' ? 'success' : 'default';
  const Icon = flash.type === 'error' ? TriangleAlert : flash.type === 'success' ? CircleCheck : Info;
  return (
    <div className={className}>
      <Alert variant={variant} role="status">
        <Icon />
        <AlertDescription>{flash.message}</AlertDescription>
      </Alert>
    </div>
  );
}
