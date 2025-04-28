import * as THREE from "three";

/**
 * SunPositionCalculator provides accurate sun position (altitude and azimuth)
 * using a simplified solar position algorithm. All angles are in radians.
 */
export class SunPositionCalculator {
  /**
   * Calculate the sun's position (azimuth and altitude) for a given date/time and location.
   * @param date Date object (local time)
   * @param latitude Latitude in degrees
   * @param longitude Longitude in degrees
   * @returns { azimuth: number, altitude: number }
   */
  static calculateSunPosition(
    date: Date,
    latitude: number,
    longitude: number
  ): { azimuth: number; altitude: number } {
    // Debug: Log inputs
    console.log("[SunCalc] Inputs:", {
      date: date.toISOString(),
      latitude,
      longitude,
    });
    // Convert date to UTC
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // JS months start at 0
    const day = date.getUTCDate();
    const hour =
      date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600;
    console.log("[SunCalc] UTC:", { year, month, day, hour });

    // Julian Day
    const A = Math.floor((14 - month) / 12);
    const Y = year + 4800 - A;
    const M = month + 12 * A - 3;
    let JDN =
      day +
      Math.floor((153 * M + 2) / 5) +
      365 * Y +
      Math.floor(Y / 4) -
      Math.floor(Y / 100) +
      Math.floor(Y / 400) -
      32045;
    let JD = JDN + (hour - 12) / 24;
    let n = JD - 2451545.0;
    console.log("[SunCalc] Julian:", { JDN, JD, n });

    // Mean longitude, mean anomaly, ecliptic longitude
    let L = (280.46 + 0.9856474 * n) % 360;
    let g = (357.528 + 0.9856003 * n) % 360;
    let lambda =
      (L +
        1.915 * Math.sin((g * Math.PI) / 180) +
        0.02 * Math.sin((2 * g * Math.PI) / 180)) %
      360;
    console.log("[SunCalc] Mean longitude/anomaly/ecliptic:", { L, g, lambda });

    // Obliquity of the ecliptic
    let epsilon = 23.439 - 0.0000004 * n;
    console.log("[SunCalc] Obliquity:", { epsilon });

    // Right Ascension and Declination
    let alpha = Math.atan2(
      Math.cos((epsilon * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180),
      Math.cos((lambda * Math.PI) / 180)
    );
    let delta = Math.asin(
      Math.sin((epsilon * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180)
    );
    console.log("[SunCalc] RA/Dec:", { alpha, delta });

    // Sidereal Time
    let GMST = (6.697375 + 0.0657098242 * n + hour) % 24;
    let LMST = (GMST + longitude / 15) % 24;
    let LMST_rad = (LMST * 15 * Math.PI) / 180;
    console.log("[SunCalc] Sidereal:", { GMST, LMST, LMST_rad });

    // Hour angle
    let H = LMST_rad - alpha;
    console.log("[SunCalc] Hour angle:", { H });

    // Convert latitude to radians
    let latRad = (latitude * Math.PI) / 180;
    console.log("[SunCalc] Latitude radians:", { latRad });

    // Altitude
    let altitude = Math.asin(
      Math.sin(delta) * Math.sin(latRad) +
        Math.cos(delta) * Math.cos(latRad) * Math.cos(H)
    );
    console.log("[SunCalc] Altitude:", { altitude });

    // Azimuth
    let azimuth = Math.atan2(
      -Math.sin(H),
      Math.tan(delta) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(H)
    );
    // Normalize azimuth to [0, 2PI]
    if (azimuth < 0) azimuth += 2 * Math.PI;
    console.log("[SunCalc] Azimuth:", { azimuth });

    console.log("[SunCalc] Output:", { azimuth, altitude });
    return { azimuth, altitude };
  }

  /**
   * Get light direction vector based on sun position
   * @param azimuth Sun's azimuth angle (radians)
   * @param altitude Sun's altitude angle (radians)
   * @returns Normalized THREE.Vector3 representing light direction
   */
  static getLightDirectionFromSunPosition(
    azimuth: number,
    altitude: number
  ): THREE.Vector3 {
    // Spherical to Cartesian (Y up)
    const x = Math.cos(altitude) * Math.sin(azimuth);
    const y = Math.sin(altitude);
    const z = Math.cos(altitude) * Math.cos(azimuth);
    return new THREE.Vector3(x, y, z).normalize();
  }

  /**
   * Calculate shadow opacity based on sun altitude
   * @param altitude Sun's altitude angle (radians)
   * @returns Number between 0 (no shadow) and 1 (full shadow)
   */
  static calculateShadowOpacityFromAltitude(altitude: number): number {
    if (altitude <= 0) return 0.8; // Night
    if (altitude < Math.PI / 12) return 0.7; // Dawn/dusk
    return 0.6; // Day
  }

  /**
   * Convenience method: get light direction for a given date/time/location
   * @param date Date object (local time)
   * @param latitude Latitude in degrees
   * @param longitude Longitude in degrees
   * @returns Normalized THREE.Vector3 representing light direction
   */
  static getLightDirection(
    date: Date,
    latitude: number,
    longitude: number
  ): THREE.Vector3 {
    const { azimuth, altitude } = this.calculateSunPosition(
      date,
      latitude,
      longitude
    );
    return this.getLightDirectionFromSunPosition(azimuth, altitude);
  }

  /**
   * Convenience method: get shadow opacity for a given date/time/location
   * @param date Date object (local time)
   * @param latitude Latitude in degrees
   * @param longitude Longitude in degrees
   * @returns Number between 0 and 1 representing shadow opacity
   */
  static getShadowOpacity(
    date: Date,
    latitude: number,
    longitude: number
  ): number {
    const { altitude } = this.calculateSunPosition(date, latitude, longitude);
    return this.calculateShadowOpacityFromAltitude(altitude);
  }
}

export default SunPositionCalculator;
