import { useState, useEffect } from "react";

interface LightingState {
  brightnessValue: number;
  vignetteDarkness: number;
  skyColor: string;
}

/**
 * Custom hook that calculates lighting values based on time of day.
 * Provides smooth transitions that peak at 4pm and gradually decrease until 10pm.
 *
 * @param timeOfDay - Current time
 * @returns Object containing brightnessValue, vignetteDarkness, and skyColor
 */
export function useDaylightLighting(timeOfDay: Date): LightingState {
  const [brightnessValue, setBrightnessValue] = useState<number>(-0.2);
  const [vignetteDarkness, setVignetteDarkness] = useState<number>(0.7);
  const [skyColor, setSkyColor] = useState<string>("#050505");

  useEffect(() => {
    const hour = timeOfDay.getHours();
    const minute = timeOfDay.getMinutes();
    const timeVal = hour + minute / 60;

    // Helper function for linear interpolation
    function lerp(start: number, end: number, t: number): number {
      return start * (1 - t) + end * t;
    }

    // Night time (10pm to 6am)
    if (timeVal < 6 || timeVal > 22) {
      setBrightnessValue(-0.5);
      setVignetteDarkness(0.8);
      setSkyColor("#000000");
    }
    // Morning transition (6am to 16pm/4pm)
    else if (timeVal >= 6 && timeVal <= 16) {
      // Normalize time value to 0-1 range (0 = 6am, 1 = 4pm)
      const normalizedTime = (timeVal - 6) / 10;

      // Smooth brightness that increases steadily until 4pm
      const brightness = -0.5 + normalizedTime * 0.5; // -0.5 at 6am to 0 at 4pm
      setBrightnessValue(brightness);

      // Smooth vignette that decreases (gets lighter) until 4pm
      const vignette = 0.8 - normalizedTime * 0.5; // 0.8 at 6am to 0.3 at 4pm
      setVignetteDarkness(vignette);

      // Smooth sky color transition
      if (normalizedTime < 0.2) {
        // 6am-8am: dark blue to medium blue
        const blueT = normalizedTime * 5; // 0-1 within this range
        const r = Math.floor(lerp(10, 10, blueT));
        const g = Math.floor(lerp(15, 26, blueT));
        const b = Math.floor(lerp(48, 64, blueT));
        setSkyColor(
          `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
        );
      } else if (normalizedTime < 0.5) {
        // 8am-11am: medium blue to brighter blue
        const blueT = (normalizedTime - 0.2) * 3.33; // 0-1 within this range
        const r = Math.floor(lerp(10, 10, blueT));
        const g = Math.floor(lerp(26, 26, blueT));
        const b = Math.floor(lerp(64, 70, blueT));
        setSkyColor(
          `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
        );
      } else {
        // 11am-4pm: brighter blue to peak blue
        const blueT = (normalizedTime - 0.5) * 2; // 0-1 within this range
        const r = Math.floor(lerp(10, 10, blueT));
        const g = Math.floor(lerp(26, 30, blueT));
        const b = Math.floor(lerp(70, 75, blueT));
        setSkyColor(
          `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
        );
      }
    }
    // Evening transition (4pm to 10pm)
    else if (timeVal > 16 && timeVal <= 22) {
      // Normalize time value to 0-1 range (0 = 4pm, 1 = 10pm)
      const normalizedTime = (timeVal - 16) / 6;

      // Smooth brightness that decreases steadily from 4pm to 10pm
      const brightness = 0 - normalizedTime * 0.5; // 0 at 4pm to -0.5 at 10pm
      setBrightnessValue(brightness);

      // Smooth vignette that increases (gets darker) from 4pm to 10pm
      const vignette = 0.3 + normalizedTime * 0.5; // 0.3 at 4pm to 0.8 at 10pm
      setVignetteDarkness(vignette);

      // Evening sky color transition
      if (normalizedTime < 0.3) {
        // 4pm-5:50pm: peak blue to warm blue
        const blueT = normalizedTime * 3.33; // 0-1 within this range
        const r = Math.floor(lerp(10, 12, blueT));
        const g = Math.floor(lerp(30, 26, blueT));
        const b = Math.floor(lerp(75, 60, blueT));
        setSkyColor(
          `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
        );
      } else if (normalizedTime < 0.6) {
        // 5:50pm-7:40pm: warm blue to purple
        const blueT = (normalizedTime - 0.3) * 3.33; // 0-1 within this range
        const r = Math.floor(lerp(12, 20, blueT));
        const g = Math.floor(lerp(26, 15, blueT));
        const b = Math.floor(lerp(60, 45, blueT));
        setSkyColor(
          `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
        );
      } else {
        // 7:40pm-10pm: purple to dark
        const blueT = (normalizedTime - 0.6) * 2.5; // 0-1 within this range
        const r = Math.floor(lerp(20, 0, blueT));
        const g = Math.floor(lerp(15, 0, blueT));
        const b = Math.floor(lerp(45, 0, blueT));
        setSkyColor(
          `#${r.toString(16).padStart(2, "0")}${g
            .toString(16)
            .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
        );
      }
    }
  }, [timeOfDay]);

  return { brightnessValue, vignetteDarkness, skyColor };
}
