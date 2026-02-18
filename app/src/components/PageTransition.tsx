import React from "react";
import { motion } from "framer-motion";
import { useNavigation } from "../contexts/NavigationContext";

interface PageTransitionProps {
  children: React.ReactNode;
}

const variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction * 48,
    filter: "blur(8px)",
    scale: 0.975,
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -48,
    filter: "blur(8px)",
    scale: 0.975,
  }),
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const { direction } = useNavigation();

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: 0.38,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
};
