"use client";

import * as React from "react";
import { motion, HTMLMotionProps, Variants, useReducedMotion } from "framer-motion";
import { useGateReady } from "@/hooks/use-asset-queue";

const RevealContext = React.createContext<boolean>(false);

// ── Shared item variants (no per-render allocation) ─────────────────
const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const ITEM_VARIANTS_REDUCED: Variants = {
  hidden: { opacity: 0, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.05, ease: "easeOut" },
  },
};

const DEFAULT_VIEWPORT = {
  once: true,
  // amount=0.15 → trigger when 15% of the element is visible.
  // Compromise between the old 0.25 (too much scroll required) and the
  // brief 0.1 (felt too eager — animations fired before the user could
  // actually see the element). 0.15 fires shortly after the element's
  // top edge enters the viewport, but late enough that the element is
  // clearly in view when the animation starts.
  amount: 0.15,
  // Slightly negative bottom margin (-2%) shrinks the trigger viewport by
  // a small amount, so the animation fires just a touch later than a
  // pure-amount trigger would. Previously -6% felt too late; +10% felt
  // too early. -2% is the sweet spot between them.
  margin: "0px 0px -2% 0px",
} as const;

// ── RevealOnScroll ──────────────────────────────────────────────────

type RevealOnScrollProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  staggerDelay?: number;
  once?: boolean;
  amount?: number;
  margin?: string;
};

/**
 * Reusable container that initiates a staggered scroll reveal.
 * Monitors viewport entrance and triggers sequence animations for nested RevealItems.
 */
export function RevealOnScroll({
  children,
  className,
  staggerDelay = 0.1,
  once = DEFAULT_VIEWPORT.once,
  amount = DEFAULT_VIEWPORT.amount,
  margin = DEFAULT_VIEWPORT.margin,
  ...props
}: RevealOnScrollProps) {
  const gateReady = useGateReady();

  // Memoize variants so framer-motion doesn't diff a new object each render
  const containerVariants = React.useMemo<Variants>(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: staggerDelay },
      },
    }),
    [staggerDelay],
  );

  // Memoize viewport config
  const viewportConfig = React.useMemo(
    () => ({ once, amount, margin }),
    [once, amount, margin],
  );

  return (
    <RevealContext.Provider value={true}>
      <motion.div
        initial="hidden"
        whileInView={gateReady ? "visible" : "hidden"}
        viewport={viewportConfig}
        variants={containerVariants}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </RevealContext.Provider>
  );
}

// ── RevealItem ──────────────────────────────────────────────────────

type RevealItemProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
};

/**
 * Reusable content block that coordinates with the parent RevealOnScroll
 * to perform staggered fade-in + translateY scroll entry animations.
 */
export function RevealItem({
  children,
  className,
  ...props
}: RevealItemProps) {
  const isInReveal = React.useContext(RevealContext);
  const shouldReduceMotion = useReducedMotion();

  const variants = shouldReduceMotion ? ITEM_VARIANTS_REDUCED : ITEM_VARIANTS;

  if (isInReveal) {
    return (
      <motion.div variants={variants} className={className} {...props}>
        {children}
      </motion.div>
    );
  }

  // Fallback standalone reveal if not nested inside a RevealOnScroll container
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={STANDALONE_VIEWPORT}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stable viewport config for standalone items
const STANDALONE_VIEWPORT = DEFAULT_VIEWPORT;
