import * as THREE from "three";

// This function calculates the sun position based on date, time, and location
export function calculateSunPosition(
  date: Date,
  latitude: number,
  longitude: number
) {
  // Convert date to Julian date
  const julian = date.getTime() / 86400000.0 + 2440587.5;
  const julianCentury = (julian - 2451545.0) / 36525.0;

  // Calculate geometric mean longitude of the sun
  let geomMeanLongSun =
    (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) %
    360;

  // Calculate geometric mean anomaly of the sun
  const geomMeanAnomSun =
    357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury);

  // Calculate sun's equation of center
  const sunEqOfCenter =
    Math.sin((geomMeanAnomSun * Math.PI) / 180) *
      (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
    Math.sin((2 * geomMeanAnomSun * Math.PI) / 180) *
      (0.019993 - 0.000101 * julianCentury) +
    Math.sin((3 * geomMeanAnomSun * Math.PI) / 180) * 0.000289;

  // Calculate sun's true longitude
  const sunTrueLong = geomMeanLongSun + sunEqOfCenter;

  // Calculate sun's apparent longitude
  const sunAppLong =
    sunTrueLong -
    0.00569 -
    0.00478 * Math.sin(((125.04 - 1934.136 * julianCentury) * Math.PI) / 180);

  // Calculate obliquity of the ecliptic
  const obliqCorr =
    23.439291 -
    julianCentury *
      (0.0130042 - julianCentury * (0.00000016 + 0.000000504 * julianCentury));

  // Calculate sun's declination
  const declination =
    (Math.asin(
      Math.sin((obliqCorr * Math.PI) / 180) *
        Math.sin((sunAppLong * Math.PI) / 180)
    ) *
      180) /
    Math.PI;

  // Calculate the local time (hours from midnight)
  const localTime =
    (date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600 +
      longitude / 15) %
    24;

  // Calculate solar time
  const eqOfTime =
    4 *
    (geomMeanLongSun -
      0.0057183 -
      0.0008 * Math.sin((geomMeanLongSun * Math.PI) / 180) -
      Math.sin((2 * geomMeanLongSun * Math.PI) / 180) * 0.0003 -
      (Math.atan2(
        Math.tan((obliqCorr * Math.PI) / 180),
        Math.cos((sunAppLong * Math.PI) / 180)
      ) *
        180) /
        Math.PI);

  const solarTime = (localTime + eqOfTime / 60) % 24;

  // Calculate solar hour angle
  const hourAngle = (solarTime - 12) * 15;

  // Calculate solar elevation
  const elevation =
    (Math.asin(
      Math.sin((latitude * Math.PI) / 180) *
        Math.sin((declination * Math.PI) / 180) +
        Math.cos((latitude * Math.PI) / 180) *
          Math.cos((declination * Math.PI) / 180) *
          Math.cos((hourAngle * Math.PI) / 180)
    ) *
      180) /
    Math.PI;

  // Calculate solar azimuth
  let azimuth =
    (Math.atan2(
      -Math.sin((hourAngle * Math.PI) / 180),
      Math.cos((latitude * Math.PI) / 180) *
        Math.tan((declination * Math.PI) / 180) -
        Math.sin((latitude * Math.PI) / 180) *
          Math.cos((hourAngle * Math.PI) / 180)
    ) *
      180) /
    Math.PI;

  azimuth = (azimuth + 180) % 360;

  // Convert elevation and azimuth to Cartesian coordinates
  const phi = (azimuth * Math.PI) / 180;
  const theta = ((90 - elevation) * Math.PI) / 180;

  const x = Math.sin(theta) * Math.sin(phi);
  const y = Math.cos(theta);
  const z = Math.sin(theta) * Math.cos(phi);

  return {
    x: x * 1000, // Scale for Three.js
    y: y * 1000,
    z: z * 1000,
    elevation,
    azimuth,
  };
}

// Function to calculate the sun color based on elevation
export function calculateSunColor(elevation: number): THREE.Color {
  // Sun color ranges from red/orange at sunrise/sunset to white/yellow at zenith
  if (elevation < 0) {
    // Night time - moonlight (blue)
    return new THREE.Color(0x3a454c);
  } else if (elevation < 10) {
    // Sunrise/sunset (orange)
    return new THREE.Color(0xff7e22);
  } else if (elevation < 30) {
    // Morning/evening (golden)
    return new THREE.Color(0xffc04d);
  } else {
    // Midday (white-yellow)
    return new THREE.Color(0xffffad);
  }
}

// Function to calculate light intensity based on sun elevation
export function calculateLightIntensity(elevation: number): number {
  if (elevation < 0) {
    // Night time - very low intensity
    return 0.2;
  } else if (elevation < 10) {
    // Sunrise/sunset - low intensity
    return 0.7 + (elevation / 10) * 0.6;
  } else {
    // Day time - full intensity, scaling up with elevation
    return 1.0 + (elevation / 90) * 0.4; // Max 1.4 at zenith
  }
}

// Function to calculate ambient light intensity and color based on sun elevation
export function calculateAmbientLight(elevation: number): {
  intensity: number;
  color: THREE.Color;
} {
  if (elevation < 0) {
    // Night time - blue tint, low intensity
    return {
      intensity: 0,
      color: new THREE.Color(0x111133),
    };
  } else if (elevation < 10) {
    // Sunrise/sunset - warm tint, low-medium intensity
    return {
      intensity: 0,
      color: new THREE.Color(0x994422),
    };
  } else {
    // Day time - neutral tint, medium-high intensity
    return {
      intensity: 0,
      color: new THREE.Color(0xaabbcc),
    };
  }
}
