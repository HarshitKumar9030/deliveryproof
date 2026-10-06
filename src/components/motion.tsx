'use client';

import {
  useLayoutEffect,
  useRef,
  useEffect,
  useState,
  type InputHTMLAttributes,
} from 'react';

/** Measures real controls, including variable labels and responsive navigation. */
export function SlidingPill({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const initialized = useRef(false);
  useLayoutEffect(() => {
    const pill = ref.current;
    const bar = pill?.parentElement;
    if (!pill || !bar) return;
    function move(animate: boolean) {
      const active = bar!.querySelector<HTMLElement>(
        '[aria-current="page"], [aria-pressed="true"]',
      );
      if (!active) return;
      const previous = pill!.style.transition;
      if (!animate) pill!.style.transition = 'none';
      pill!.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      pill!.style.width = `${active.offsetWidth}px`;
      pill!.style.height = `${active.offsetHeight}px`;
      pill!.style.opacity = '1';
      if (!animate) {
        void pill!.offsetWidth;
        pill!.style.transition = previous;
      }
    }
    move(initialized.current);
    initialized.current = true;
    let width = bar.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width !== bar.clientWidth) {
        width = bar.clientWidth;
        move(false);
      }
    });
    observer.observe(bar);
    return () => observer.disconnect();
  }, [value]);
  return <span ref={ref} className="t-tabs-pill" aria-hidden="true" />;
}

export function AnimatedValue({ value }: { value: string | number }) {
  const text = String(value);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span
        className="t-digit-group is-animating"
        key={text}
        aria-hidden="true"
      >
        {Array.from(text).map((char, index) => (
          <span
            className="t-digit"
            key={index}
            data-stagger={
              index === text.length - 2
                ? '1'
                : index === text.length - 1
                  ? '2'
                  : undefined
            }
          >
            {char}
          </span>
        ))}
      </span>
    </>
  );
}

export function SuccessCheck({ size = 24 }: { size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    const path = root?.querySelector('path');
    if (!root || !path) return;
    const length = String(Math.ceil(path.getTotalLength()) + 1);
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    root.dataset.state = 'out';
    void root.offsetWidth;
    root.dataset.state = 'in';
  }, []);
  return (
    <span
      ref={ref}
      className="t-success-check"
      data-state="out"
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".12" />
        <path
          d="m7 12 3.2 3.2L17 8.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function MotionCheckbox(props: InputHTMLAttributes<HTMLInputElement>) {
  const path = useRef<SVGPathElement>(null);
  useLayoutEffect(() => {
    if (path.current)
      path.current.style.setProperty(
        '--check-len',
        String(Math.ceil(path.current.getTotalLength()) + 1),
      );
  }, []);
  return (
    <span className="motion-checkbox">
      <input {...props} type="checkbox" />
      <span
        className="t-check"
        aria-hidden="true"
        aria-checked={Boolean(props.checked)}
      >
        <svg viewBox="0 0 20 20" fill="none">
          <path
            ref={path}
            d="m5 10 3.5 3.5L15 6.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

export function Toast({ message }: { message: string }) {
  const [lastMessage, setLastMessage] = useState(message);
  useEffect(() => {
    if (message) setLastMessage(message);
  }, [message]);
  return (
    <div className="toast-position">
      <div
        className={`toast t-toast${message ? ' is-open' : ''}`}
        role="status"
        aria-live="polite"
        aria-hidden={!message}
      >
        <SuccessCheck key={message || lastMessage} size={23} />
        <span>{lastMessage}</span>
      </div>
    </div>
  );
}
