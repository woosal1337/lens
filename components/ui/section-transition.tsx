"use client";

import * as stylex from "@stylexjs/stylex";
import { motion } from "@/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: "translateY(8px)" },
      to: { opacity: 1, transform: "translateY(0)" }
    }),
    animationDuration: {
      default: motion.panel,
      "@media (prefers-reduced-motion: reduce)": motion.press
    },
    animationTimingFunction: motion.ease,
    animationFillMode: "both"
  }
});

export function SectionTransition({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div key={id} {...stylex.props(styles.root)}>
      {children}
    </div>
  );
}
