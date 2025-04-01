import * as THREE from "three";

/**
 * Helper class for calculating sun position based on time of day
 */
export class SunPositionCalculator {
  // Default sunrise and sunset hours
  private static DEFAULT_SUNRISE_HOUR = 6;
  private static DEFAULT_SUNSET_HOUR = 20;

  /**
   * Calculate sun angle based on time of day
   * @param timeOfDay Date object representing the current time
   * @param sunriseHour Hour when sunrise occurs (0-23)
   * @param sunsetHour Hour when sunset occurs (0-23)
   * @returns Angle in radians
   */
  static calculateSunAngle(
    timeOfDay: Date,
    sunriseHour = SunPositionCalculator.DEFAULT_SUNRISE_HOUR,
    sunsetHour = SunPositionCalculator.DEFAULT_SUNSET_HOUR
  ): number {
    const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
    const dayLength = sunsetHour - sunriseHour;

    // Calculate sun angle based on time of day
    if (hours >= sunriseHour && hours <= sunsetHour) {
      return ((hours - sunriseHour) / dayLength) * Math.PI;
    } else if (hours < sunriseHour) {
      return -0.2; // Just before sunrise
    } else {
      return Math.PI + 0.2; // Just after sunset
    }
  }

  /**
   * Get light direction vector based on sun angle
   * @param sunAngle Angle in radians
   * @param wobble Optional small variation to add to angle
   * @returns Normalized THREE.Vector3 representing light direction
   */
  static getLightDirectionFromAngle(
    sunAngle: number,
    wobble = 0
  ): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.cos(sunAngle + wobble),
      -Math.max(0.1, Math.sin(sunAngle + wobble)),
      0.5
    ).normalize();
  }

  /**
   * Calculate shadow opacity based on time of day
   * @param timeOfDay Date object representing the current time
   * @returns Number between 0 and 1 representing shadow opacity
   */
  static calculateShadowOpacity(timeOfDay: Date): number {
    const hours = timeOfDay.getHours();

    if (hours < 6 || hours > 20) {
      return 0.8; // Much stronger shadows at night
    } else if (hours < 8 || hours > 18) {
      return 0.7; // Stronger shadows at dawn/dusk
    } else {
      return 0.6; // Stronger shadows during day
    }
  }

  /**
   * Convenience method to get light direction directly from time
   * @param timeOfDay Date object representing the current time
   * @param wobble Optional small variation to add to angle
   * @returns Normalized THREE.Vector3 representing light direction
   */
  static getLightDirectionFromTime(timeOfDay: Date, wobble = 0): THREE.Vector3 {
    const sunAngle = this.calculateSunAngle(timeOfDay);
    return this.getLightDirectionFromAngle(sunAngle, wobble);
  }
}

export default SunPositionCalculator;
