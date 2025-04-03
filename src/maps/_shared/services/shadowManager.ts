import * as THREE from "three";
import { WebGLRenderer } from "three";
import { SunPositionCalculator } from "../helpers/sunPositionCalculator";

/**
 * Manages shadow settings and updates for the scene
 */
export class ShadowsManager {
  private renderer: WebGLRenderer;
  private shadowOpacity: number = 0.6;

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

  /**
   * Create a shadow-receiving ground plane
   * @param width Width of the plane
   * @param height Height of the plane
   * @param y Y position of the plane
   * @returns THREE.Mesh
   */
  createShadowReceivingPlane(width = 500, height = 500, y = 60): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.ShadowMaterial({
      transparent: true,
      opacity: 0.8,
      color: 0x000000,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = y;

    return plane;
  }
}

export default ShadowsManager;
