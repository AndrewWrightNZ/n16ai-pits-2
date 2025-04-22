import * as THREE from "three";
import { WebGLRenderer } from "three";
import { SunPositionCalculator } from "../helpers/sunPositionCalculator";

/**
 * Manages shadow settings and updates for the scene
 */
export class ShadowsManager {
  private renderer: WebGLRenderer;
  private shadowOpacity: number = 0.9;

  /**
   * Create a new ShadowsManager
   * @param renderer WebGLRenderer instance
   */
  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
  }

  /**
   * Initialize shadow settings for the renderer
   */
  initializeShadowRenderer(): void {
    if (!this.renderer) return;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * Update shadow opacity based on time of day
   * @param timeOfDay Date object representing the current time
   * @returns Current shadow opacity
   */
  updateShadowOpacity(timeOfDay: Date): number {
    this.shadowOpacity =
      SunPositionCalculator.calculateShadowOpacity(timeOfDay);
    return this.shadowOpacity;
  }

  /**
   * Get the current shadow opacity
   * @returns Current shadow opacity
   */
  getShadowOpacity(): number {
    return this.shadowOpacity;
  }
}

export default ShadowsManager;
