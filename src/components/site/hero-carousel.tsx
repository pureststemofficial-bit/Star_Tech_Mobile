'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const INTERVAL = 2000;

type Labels = { region: string; prev: string; next: string; pause: string; play: string; slide: string };

/**
 * Full-width hero banner whose background photos crossfade. It advances on its own, pauses while the
 * pointer or keyboard focus is inside it (and when the visitor prefers reduced motion), and can be
 * swiped on touch screens. The text overlay is rendered on the server and passed in as children.
 *
 * Phones show the banner at its own shape with the text underneath; wider screens lay the text over
 * the empty left side of the photo.
 */
export function HeroCarousel({ slides, labels, children }: { slides: string[]; labels: Labels; children: React.ReactNode }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false); // hovered or focused
  const touchX = useRef<number | null>(null);

  const go = useCallback((to: number) => setIndex(((to % count) + count) % count), [count]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || held || count < 2) return;
    const id = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(id);
  }, [playing, held, index, count, go]);

  const controls = count > 1;
  const arrow = 'grid size-10 place-items-center rounded-full bg-white/85 text-ink shadow-md backdrop-blur transition hover:bg-white [&_svg]:size-5';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.region}
      className="relative isolate overflow-hidden bg-[#e8f1ff] text-ink md:flex md:min-h-[460px] md:h-[min(42vw,720px)] md:items-center"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false); }}
    >
      <div
        className="relative aspect-[2/1] md:absolute md:inset-0 md:aspect-auto"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {slides.map((src, i) => (
          <div
            key={src}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slide.replace('{n}', String(i + 1)).replace('{total}', String(count))}
            aria-hidden={i !== index}
            className={cn('absolute inset-0 transition-opacity duration-1000 ease-out', i === index ? 'opacity-100' : 'opacity-0')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              width={1600}
              height={670}
              sizes="100vw"
              fetchPriority={i === 0 ? 'high' : undefined}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={cn('size-full object-cover object-[85%_center] md:object-[70%_center]', i === index && 'hero-settle')}
            />
          </div>
        ))}

        {/* Soft wash over the empty left side so the overlaid text always reads cleanly. */}
        <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-white/75 via-white/25 to-transparent md:block" />

        {controls ? (
          <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-3 md:bottom-6">
            <button type="button" onClick={() => go(index - 1)} aria-label={labels.prev} className={cn(arrow, 'hidden md:grid')}>
              <ChevronLeft />
            </button>
            <div className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-1.5 shadow-sm backdrop-blur">
              {slides.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={labels.slide.replace('{n}', String(i + 1)).replace('{total}', String(count))}
                  aria-current={i === index ? 'true' : undefined}
                  className="grid h-6 place-items-center px-0.5"
                >
                  <span className={cn('block h-1.5 rounded-full transition-all duration-500', i === index ? 'w-6 bg-ink' : 'w-1.5 bg-ink/30 hover:bg-ink/55')} />
                </button>
              ))}
              <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? labels.pause : labels.play} className="ml-1 grid size-6 place-items-center rounded-full text-ink/70 hover:text-ink [&_svg]:size-3.5">
                {playing ? <Pause /> : <Play />}
              </button>
            </div>
            <button type="button" onClick={() => go(index + 1)} aria-label={labels.next} className={cn(arrow, 'hidden md:grid')}>
              <ChevronRight />
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative z-10 w-full">{children}</div>
    </section>
  );
}
