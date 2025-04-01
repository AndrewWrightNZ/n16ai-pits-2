import * as THREE from "three";
import { ExtendedTilesRenderer } from "./tilesRendererService";
import { CSM } from "../csm";

// Location interface
export interface Location {
  lat: number;
  lng: number;
  heading: number;
  // Additional optional properties
  tilt?: number;
  zoom?: number;
  name?: string;
}

/**
 * Handles camera positioning and orbit controls for 3D tiles
 */
export class CameraPositioner {
  private camera: THREE.PerspectiveCamera;
  private orbitControls: React.RefObject<any>; // OrbitControls reference
  private tilesRenderer: ExtendedTilesRenderer | null = null;
  private csm: CSM | null = null;

  /**
   * Create a new CameraPositioner
   * @param camera THREE.Camera instance
   * @param orbitControls React ref to OrbitControls
   */
  constructor(
    camera: THREE.PerspectiveCamera,
    orbitControls: React.RefObject<any>
  ) {
    this.camera = camera;
    this.orbitControls = orbitControls;
  }

  /**
   * Set the TilesRenderer instance
   * @param tilesRenderer TilesRenderer instance
   */
  setTilesRenderer(tilesRenderer: ExtendedTilesRenderer | null): void {
    this.tilesRenderer = tilesRenderer;
  }

  /**
   * Set the CSM instance
   * @param csm CSM instance
   */
  setCSM(csm: CSM | null): void {
    this.csm = csm;
  }

  /**
   * Set orbit controls auto-rotation
   * @param isOrbiting Whether auto-rotation should be enabled
   * @param speed Optional rotation speed (default: 2.0)
   */
  setAutoRotate(isOrbiting: boolean, speed = 2.0): void {
    if (this.orbitControls.current) {
      this.orbitControls.current.autoRotate = isOrbiting;
      this.orbitControls.current.autoRotateSpeed = speed;
    }
  }

  /**
   * Position camera at a specific location
   * @param location Location object with lat, lng, heading
   * @param viewingAltitude Optional altitude in meters (default: 200)
   */
  positionCameraAtLocation(location: Location, viewingAltitude = 200): void {
    if (!this.camera || !this.tilesRenderer || !this.orbitControls.current)
      return;

    // Align tile set so lat/lon is Y-up in the local scene
    if (this.tilesRenderer.setLatLonToYUp) {
      this.tilesRenderer.setLatLonToYUp(
        location.lat * THREE.MathUtils.DEG2RAD,
        location.lng * THREE.MathUtils.DEG2RAD
      );
    }

    // Position camera relative to the origin
    this.camera.position.set(
      Math.sin(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude,
      viewingAltitude,
      Math.cos(location.heading * THREE.MathUtils.DEG2RAD) * viewingAltitude
    );

    // Configure camera
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.near = 1;
    this.camera.far = 20000;
    this.camera.updateProjectionMatrix();

    // Configure orbit controls
    if (this.orbitControls.current) {
      this.orbitControls.current.target.set(0, 0, 0);
      this.orbitControls.current.minDistance = 50;
      this.orbitControls.current.maxDistance = 1000;
      this.orbitControls.current.update();
    }

    // Update tile renderer error target
    if (this.tilesRenderer) {
      this.tilesRenderer.errorTarget = 2;
      this.tilesRenderer.update();
    }

    // Update CSM after camera position changes
    if (this.csm) {
      this.csm.updateFrustums();
      this.csm.update();
    }
  }

  /**
   * Initialize orbit controls with default settings
   */
  initializeOrbitControls(): void {
    if (!this.orbitControls.current) return;

    // Set default orbit control properties
    this.orbitControls.current.enableDamping = true;
    this.orbitControls.current.dampingFactor = 0.1;
    this.orbitControls.current.screenSpacePanning = false;
    this.orbitControls.current.maxPolarAngle = Math.PI / 2;
    this.orbitControls.current.minDistance = 100;
    this.orbitControls.current.maxDistance = 500;
  }
}

export default CameraPositioner;
