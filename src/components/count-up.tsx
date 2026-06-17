import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";
import { formatNumber } from "@/lib/format";

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}

export function CountUp({ value, duration = 1.2, className, format = formatNumber }: CountUpProps) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => format(Math.round(v)));

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, duration, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
