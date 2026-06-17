"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Music2 } from "lucide-react";
import { useEffect, useState } from "react";

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const seen = window.sessionStorage.getItem("mafia-splash-seen");
    if (seen) {
      setShowSplash(false);
      return;
    }

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem("mafia-splash-seen", "true");
      setShowSplash(false);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash ? (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-[#071A2F]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.7, ease: [0.2, 0.72, 0.16, 1] }}
              className="text-center"
            >
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-2xl bg-sky-300 text-slate-950 shadow-[0_0_70px_rgba(56,189,248,0.75)]">
                <Music2 size={48} strokeWidth={2.4} />
              </div>
              <p className="mt-6 text-3xl font-black tracking-[0.34em] text-white">MAFIA</p>
              <p className="mt-2 text-sm font-semibold tracking-[0.2em] text-sky-100/72">마음만은 피아니스트</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {children}
    </>
  );
}
