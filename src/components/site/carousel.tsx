'use client';

import { Children, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Horizontal, swipeable product row with snap points. Arrow buttons scroll one "page" at a time
 * and disable themselves at either end; on touch screens people simply swipe.
 * Slides are rendered on the server and passed in as children.
 */
export function Carousel({ children, label, prevLabel, nextLabel }: { children: React.ReactNode; label: string; prevLabel: string; nextLabel: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const arrow = 'absolute top-[calc(var(--img)/2)] z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 shadow-md backdrop-blur transition hover:bg-background disabled:pointer-events-none disabled:opacity-0 md:flex';

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="@container relative [--img:calc((100cqw-3rem)/3)] lg:[--img:calc((100cqw-4.5rem)/4)]">
      <ul ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:gap-6 sm:px-0">
        {Children.map(children, (child) => (
          <li className="shrink-0 basis-[44%] snap-start sm:basis-[calc((100%-3rem)/3)] lg:basis-[calc((100%-4.5rem)/4)]">{child}</li>
        ))}
      </ul>
      <button type="button" onClick={() => go(-1)} disabled={edges.start} aria-label={prevLabel} className={cn(arrow, '-left-5')}>
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" onClick={() => go(1)} disabled={edges.end} aria-label={nextLabel} className={cn(arrow, '-right-5')}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
