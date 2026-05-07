"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
};

export function Reveal({ children, delay = 0, className = "", as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: "-60px 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const style: CSSProperties = {
    transitionDelay: `${delay}ms`,
    transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
  };

  const cls = `transition-[opacity,transform] duration-[700ms] ${
    shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
  } ${className}`;

  const Tag = as;
  return (
    // @ts-expect-error – ref is generic across element tags
    <Tag ref={ref} style={style} className={cls}>
      {children}
    </Tag>
  );
}
