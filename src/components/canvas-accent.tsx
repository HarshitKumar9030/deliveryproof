'use client';

import { useEffect, useRef } from 'react';
import { useWorkspace } from '@/components/workspace-provider';

/** Finite decorative motion: no data is drawn here and no idle animation loop runs. */
export function CanvasAccent({ variant = 'sweep', replayKey = '' }: {
  variant?: 'sweep' | 'orbit';
  replayKey?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = useWorkspace();
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const color = getComputedStyle(canvas).getPropertyValue('--accent').trim();
    let frame = 0;
    let width = 0;
    let height = 0;
    let visible = false;
    let lastPlayed = -Infinity;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      context.clearRect(0, 0, width, height);
    };
    const play = () => {
      if (reduced.matches || document.hidden || !visible || width === 0) return;
      const start = performance.now();
      if (start - lastPlayed < 1400) return;
      lastPlayed = start;
      stop();
      const draw = (now: number) => {
        const progress = Math.min((now - start) / 1100, 1);
        context.clearRect(0, 0, width, height);
        if (progress >= 1) { frame = 0; return; }
        context.fillStyle = color;
        context.strokeStyle = color;
        const fade = Math.sin(progress * Math.PI);
        for (let index = 0; index < 24; index++) {
          const seed = index / 24;
          let x: number;
          let y: number;
          if (variant === 'orbit') {
            const angle = seed * Math.PI * 2 + progress * Math.PI;
            const radius = Math.min(width, height) * (0.37 + 0.06 * Math.sin(seed * 15));
            x = width / 2 + Math.cos(angle) * radius;
            y = height / 2 + Math.sin(angle) * radius;
          } else {
            x = (progress * 1.3 - 0.15) * width + (seed - 0.5) * width * 0.23;
            y = height * (0.22 + seed * 0.62) + Math.sin(progress * 6 + seed * 12) * 8;
          }
          context.globalAlpha = fade * (variant === 'orbit' ? 0.3 : 0.22) * (0.4 + seed * 0.6);
          context.beginPath();
          context.arc(x, y, 1 + (index % 3) * 0.4, 0, Math.PI * 2);
          context.fill();
          if (variant === 'sweep' && index % 4 === 0) {
            context.globalAlpha *= 0.4;
            context.beginPath();
            context.moveTo(x - 16, y);
            context.lineTo(x - 3, y);
            context.stroke();
          }
        }
        context.globalAlpha = 1;
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(() => {
      stop();
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      play();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) play(); else stop();
    }, { threshold: 0.2 });
    const visibility = () => { if (document.hidden) stop(); };
    resize.observe(canvas);
    observer.observe(canvas);
    parent.addEventListener('pointerenter', play);
    reduced.addEventListener('change', stop);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stop();
      resize.disconnect();
      observer.disconnect();
      parent.removeEventListener('pointerenter', play);
      reduced.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [variant, replayKey, theme]);
  return <canvas ref={ref} className={`canvas-accent canvas-accent-${variant}`} aria-hidden="true" />;
}
