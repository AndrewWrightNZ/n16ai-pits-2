import { PerspectiveCamera, Scene } from "three";

// Shadows
import { CSM } from "../csm";

// Helpers
import { SunPositionCalculator } from "../helpers/sunPositionCalculator";

/**
 * Controller for Cascade Shadow Maps (CSM) system
 */
export class CSMController {
  private csm: CSM | null = null;
  private camera: PerspectiveCamera;
  private scene: Scene;

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
   * @returns CSM instance
   */
  initialize(timeOfDay: Date): CSM {
    // Clean up existing CSM if any
    this.dispose();

    // Get initial light direction based on time of day
    const lightDirection =
      SunPositionCalculator.getLightDirectionFromTime(timeOfDay);

    // Create a new CSM instance with proper config
    const csm = new CSM({
      camera: this.camera,
      parent: this.scene,
      cascades: 3,
      maxFar: 1000,
      mode: "practical",
      shadowMapSize: 2048,
      shadowBias: -0.0001,
      lightDirection: lightDirection,
      lightIntensity: 2.0,
      lightNear: 1,
      lightFar: 1000,
      lightMargin: 100,
      fade: false,
    });

    // Enhance shadow properties
    if (csm.lights.length > 0) {
      csm.lights.forEach((light) => {
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 10;
        light.shadow.camera.far = 2000;
        light.shadow.bias = -0.0003;
        light.shadow.normalBias = 0.02;
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

    // Add slight wobble for smoother transitions if elapsedTime is provided
    const wobble = elapsedTime ? Math.sin(elapsedTime * 0.1) * 0.001 : 0;

    // Update the light direction
    const lightDirection = SunPositionCalculator.getLightDirectionFromTime(
      timeOfDay,
      wobble
    );
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
