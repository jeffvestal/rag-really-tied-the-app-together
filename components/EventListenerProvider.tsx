"use client"; // Mark this as a Client Component

import { useEffect } from "react";

export default function EventListenerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const options = { passive: true };
    const handleWheel = () => {};
    const handleTouchStart = () => {};

    document.addEventListener("wheel", handleWheel, options);
    document.addEventListener("touchstart", handleTouchStart, options);

    return () => {
      document.removeEventListener("wheel", handleWheel, options);
      document.removeEventListener("touchstart", handleTouchStart, options);
    };
  }, []);

  return <>{children}</>;
}
