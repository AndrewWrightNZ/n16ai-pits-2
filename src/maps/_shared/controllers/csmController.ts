import { PerspectiveCamera, Scene, Vector3 } from "three";

// Shadows
import { CSM } from "../csm";

// Helpers
import { SunPositionCalculator } from "../helpers/sunPositionCalculator";

/**
 * Configuration options for CSM initialization
 */
interface CSMOptions {
  cascades?: number;
  maxFar?: number;
  shadowMapSize?: number;
  lightIntensity?: number;
  lightMargin?: number;
  shadowBias?: number;
  normalBias?: number;
}

/**
 * Controller for Cascade Shadow Maps (CSM) system
 */
export class CSMController {
  private csm: CSM | null = null;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private lastUpdateTime = 0;

  /**
   * Create a new CSM controller
   * @param camera THREE.Camera instance
   * @param scene THREE.Scene instance
   */
  constructor(camera: PerspectiveCamera, scene: Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  /**
   * Initialize or reinitialize the CSM system
   * @param timeOfDay Date object representing the time of day
   * @param options Optional configuration options
   * @returns CSM instance
   */
  initialize(timeOfDay: Date, options?: CSMOptions): CSM {
    // Clean up existing CSM if any
    this.dispose();

    // Get initial light direction based on time of day
    const lightDirection =
      SunPositionCalculator.getLightDirectionFromTime(timeOfDay);

    // Default options with performance considerations
    const defaultOptions = {
      cascades: 2,
      maxFar: 5000,
      shadowMapSize: 2048,
      lightIntensity: 2.0,
      lightMargin: 250,
      shadowBias: -0.0001,
      normalBias: 0.02,
    };

    // Merge provided options with defaults
    const mergedOptions = { ...defaultOptions, ...options };

    // Create a new CSM instance with proper config
    const csm = new CSM({
      camera: this.camera,
      parent: this.scene,
      cascades: mergedOptions.cascades,
      maxFar: mergedOptions.maxFar,
      mode: "practical",
      shadowMapSize: mergedOptions.shadowMapSize,
      shadowBias: mergedOptions.shadowBias,
      lightDirection: lightDirection,
      lightIntensity: mergedOptions.lightIntensity,
      lightNear: 1,
      lightFar: mergedOptions.maxFar,
      lightMargin: mergedOptions.lightMargin,
      fade: false,
    });

    // Enhance shadow properties
    if (csm.lights.length > 0) {
      csm.lights.forEach((light) => {
        light.castShadow = true;
        light.shadow.mapSize.width = mergedOptions.shadowMapSize;
        light.shadow.mapSize.height = mergedOptions.shadowMapSize;
        light.shadow.camera.near = 10;
        light.shadow.camera.far = mergedOptions.maxFar;
        light.shadow.bias = -0.0003;
        light.shadow.normalBias = mergedOptions.normalBias;
        light.shadow.radius = 1;
      });
    }

    this.csm = csm;
    return csm;
  }

  /**
   * Update CSM with new time of day
   * @param timeOfDay Date object representing the time of day
   * @param elapsedTime Optional elapsed time for wobble effect
   */
  update(timeOfDay: Date, elapsedTime?: number): void {
    if (!this.csm) return;

    // Throttle updates in performance mode
    const now = Date.now();

    if (now - this.lastUpdateTime < 500) {
      return; // Only update every 500ms in performance mode
    }

    this.lastUpdateTime = now;

    // Calculate sun position based on time
    const hours = timeOfDay.getHours() + timeOfDay.getMinutes() / 60;
    const sunriseHour = 6;
    const sunsetHour = 20;
    const dayLength = sunsetHour - sunriseHour;
    let sunAngle = 0;

    if (hours >= sunriseHour && hours <= sunsetHour) {
      sunAngle = ((hours - sunriseHour) / dayLength) * Math.PI;
    } else if (hours < sunriseHour) {
      sunAngle = -0.2;
    } else {
      sunAngle = Math.PI + 0.2;
    }

    // Add subtle wobble for realism if elapsedTime is provided
    const wobbleFactor = 0.001;
    const wobble = elapsedTime ? Math.sin(elapsedTime * 0.1) * wobbleFactor : 0;

    // Create direction vector
    const lightDirection = new Vector3(
      -Math.cos(sunAngle + wobble),
      -Math.max(0.1, Math.sin(sunAngle + wobble)),
      0.5
    ).normalize();

    // Update the light direction
    this.csm.lightDirection = lightDirection;

    // Force a full update of all CSM components
    this.csm.updateFrustums();
    this.csm.update();
  }

  /**
   * Get the current CSM instance
   * @returns CSM instance or null if not initialized
   */
  getCSM(): CSM | null {
    return this.csm;
  }

  /**
   * Dispose of CSM resources
   */
  dispose(): void {
    if (this.csm) {
      this.csm.remove();
      this.csm.dispose();
      this.csm = null;
    }
  }
}

export default CSMController;
