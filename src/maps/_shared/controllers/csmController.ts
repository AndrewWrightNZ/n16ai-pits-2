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
 * Enhanced with memory leak prevention
 */
export class CSMController {
  private csm: CSM | null = null;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private lastUpdateTime = 0;
  private isActive = true;

  // Reusable objects to prevent garbage collection
  private readonly lightDirectionVector = new Vector3();

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
      maxFar: 1000,
      // Reduced shadow map size to conserve memory
      shadowMapSize: 2048,
      lightIntensity: 1.5,
      lightMargin: 250,
      shadowBias: -0.0009,
      normalBias: 0.01,
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
    if (csm.lights && csm.lights.length > 0) {
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
    this.isActive = true;
    return csm;
  }

  /**
   * Update CSM with new time of day
   * @param timeOfDay Date object representing the time of day
   * @param elapsedTime Optional elapsed time for wobble effect
   */
  update(timeOfDay: Date, elapsedTime?: number): void {
    if (!this.csm || !this.isActive) return;

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

    // Reuse the same vector instead of creating a new one
    this.lightDirectionVector
      .set(
        -Math.cos(sunAngle + wobble),
        -Math.max(0.1, Math.sin(sunAngle + wobble)),
        0.5
      )
      .normalize();

    // Update the light direction
    this.csm.lightDirection = this.lightDirectionVector;

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
   * Pause the controller to save resources
   * Useful when the scene is not visible
   */
  pause(): void {
    this.isActive = false;
  }

  /**
   * Resume the controller after pausing
   */
  resume(): void {
    this.isActive = true;
  }

  /**
   * Dispose of CSM resources
   * Enhanced to properly clean up all resources
   */
  dispose(): void {
    if (this.csm) {
      // Explicitly dispose of shadow textures
      if (this.csm.lights) {
        this.csm.lights.forEach((light) => {
          if (light.shadow && light.shadow.map) {
            light.shadow.map.dispose();
            light.shadow.map = null;
          }
        });
      }

      // Reset any cached data in CSM
      if (
        this.csm.updateFrustums &&
        typeof this.csm.updateFrustums === "function"
      ) {
        this.csm.updateFrustums();
      }

      // Remove from scene and dispose
      this.csm.remove();
      this.csm.dispose();
      this.csm = null;
    }

    // Force a garbage collection hint (note: this is just a hint)
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        console.warn("Manual garbage collection not available");
      }
    }
  }
}

export default CSMController;
