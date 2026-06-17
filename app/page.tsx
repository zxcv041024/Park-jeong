"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Music2 } from "lucide-react";

export default function SplashPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      window.location.replace(`${basePath}/home`);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#071A2F]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.38),transparent_34%),linear-gradient(135deg,rgba(7,26,47,1),rgba(11,61,145,0.68),rgba(7,26,47,1))]" />
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.72, 0.16, 1] }}
        className="relative text-center"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 42px rgba(56,189,248,0.45)",
              "0 0 86px rgba(56,189,248,0.82)",
              "0 0 42px rgba(56,189,248,0.45)"
            ]
          }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto grid h-28 w-28 place-items-center rounded-2xl bg-sky-300 text-slate-950"
        >
          <Music2 size={54} strokeWidth={2.45} />
        </motion.div>
        <p className="mt-7 text-4xl font-black tracking-[0.34em] text-white">MAFIA</p>
        <p className="mt-3 text-sm font-semibold tracking-[0.22em] text-sky-100/75">마음만은 피아니스트</p>
      </motion.div>
    </main>
  );
}
