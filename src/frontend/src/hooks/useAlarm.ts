import { useCallback, useEffect, useRef } from "react";

/**
 * Plays an ambulance-style two-tone siren using the Web Audio API.
 * The siren alternates between ~770 Hz and ~970 Hz every 0.5 s.
 */
export function useAlarm() {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      stopRef.current?.();
    };
  }, []);

  const playAlarm = useCallback(async (durationMs = 4000) => {
    if (activeRef.current) return; // already playing
    activeRef.current = true;

    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtxCtor) {
      activeRef.current = false;
      return;
    }

    const ctx = new AudioCtxCtor();
    ctxRef.current = ctx;

    // Browsers suspend AudioContext until a user gesture -- resume it
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        activeRef.current = false;
        return;
      }
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.connect(gainNode);

    const hi = 970;
    const lo = 770;
    const halfCycle = 0.5; // seconds per tone

    const now = ctx.currentTime;
    const cycles = Math.ceil(durationMs / 1000 / (halfCycle * 2));

    osc.frequency.setValueAtTime(hi, now);
    for (let i = 0; i < cycles * 2; i++) {
      osc.frequency.setValueAtTime(i % 2 === 0 ? hi : lo, now + i * halfCycle);
    }

    // Fade out at the end
    gainNode.gain.setValueAtTime(0.5, now + durationMs / 1000 - 0.3);
    gainNode.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

    osc.start(now);
    osc.stop(now + durationMs / 1000);

    const timer = setTimeout(() => {
      ctx.close();
      ctxRef.current = null;
      activeRef.current = false;
    }, durationMs + 100);

    stopRef.current = () => {
      clearTimeout(timer);
      gainNode.gain.cancelScheduledValues(ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      setTimeout(() => {
        try {
          osc.stop();
        } catch {}
        ctx.close();
        ctxRef.current = null;
        activeRef.current = false;
      }, 150);
    };
  }, []);

  const stopAlarm = useCallback(() => {
    stopRef.current?.();
  }, []);

  return { playAlarm, stopAlarm };
}
