"use client";

import { useEffect, useState } from "react";

const dhakaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export default function DhakaClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      clearTimeout(timer);
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, 60_000 - (current.getTime() % 60_000));
    }

    function refreshOnReturn() {
      if (document.visibilityState === "visible") tick();
    }

    tick();
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, []);

  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap font-mono text-xs text-muted-foreground" title="Local time in Dhaka, Bangladesh">
      <span>Dhaka</span>
      <time className="tabular-nums" dateTime={now?.toISOString()}>{now ? dhakaTime.format(now) : "--:--"}</time>
    </div>
  );
}
