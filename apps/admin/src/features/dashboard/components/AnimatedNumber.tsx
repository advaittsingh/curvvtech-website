import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

type Props = { value: number; format?: (n: number) => string; className?: string };

export function AnimatedNumber({ value, format, className }: Props) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => (format ? format(Math.round(v)) : String(Math.round(v))));
  const [text, setText] = useState(format ? format(value) : String(value));

  useEffect(() => {
    spring.set(value);
    const unsub = display.on("change", (v) => setText(v));
    return () => unsub();
  }, [value, spring, display, format]);

  return <motion.span className={className}>{text}</motion.span>;
}
