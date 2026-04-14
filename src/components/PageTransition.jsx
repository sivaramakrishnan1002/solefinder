import { motion } from "framer-motion";

export default function PageTransition({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
