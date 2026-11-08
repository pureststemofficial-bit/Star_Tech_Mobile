import { Headset, Lock, RotateCcw, Truck } from 'lucide-react';
import { localizedSettings } from '@/lib/store';
import { getI18n } from '@/lib/i18n/server';

const ICONS = [Truck, Lock, RotateCcw, Headset];

export async function Features() {
  const { locale } = await getI18n();
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-4">
      {localizedSettings(locale).featureList.slice(0, 4).map((f, i) => {
        const Icon = ICONS[i];
        return (
          <div key={f.title} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-primary" aria-hidden="true" />
            <div>
              <strong className="block text-sm font-medium">{f.title}</strong>
              <span className="text-[13px] text-muted-foreground">{f.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
