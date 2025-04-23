import * as THREE from "three";
import { ExtendedTilesRenderer } from "./tilesRendererService";

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
   * @param location Location object with lat, lng, heading and optional position/target properties
   * @param viewingAltitude Optional altitude in meters (default: 200)
   */
  positionCameraAtLocation(
    location: Location & {
      position?: { x: number; y: number; z: number };
      target?: { x: number; y: number; z: number };
      tilt?: number;
      distance?: number;
      altitude?: number;
    },
    viewingAltitude: number = 200
  ): void {
    if (!this.camera || !this.tilesRenderer || !this.orbitControls.current)
      return;

    // Align tile set so lat/lon is Y-up in the local scene
    if (this.tilesRenderer.setLatLonToYUp) {
      this.tilesRenderer.setLatLonToYUp(
        location.lat * THREE.MathUtils.DEG2RAD,
        location.lng * THREE.MathUtils.DEG2RAD
      );
    }

    // If we have explicit position and target data, use those
    if (location.position && location.target) {
      // Set camera position directly
      this.camera.position.set(
        location.position.x,
        location.position.y,
        location.position.z
      );

      // Set orbit controls target
      if (this.orbitControls.current) {
        this.orbitControls.current.target.set(
          location.target.x,
          location.target.y,
          location.target.z
        );
      }
    } else {
      // Use the older method of positioning based on heading and altitude
      const altitude = location.altitude || viewingAltitude;

      // Position camera relative to the origin
      this.camera.position.set(
        Math.sin(location.heading * THREE.MathUtils.DEG2RAD) * altitude,
        altitude,
        Math.cos(location.heading * THREE.MathUtils.DEG2RAD) * altitude
      );

      // Set the target to origin
      if (this.orbitControls.current) {
        this.orbitControls.current.target.set(0, 0, 0);
      }
    }

    // Configure camera basics
    this.camera.up.set(0, 1, 0);
    this.camera.near = 1;
    this.camera.far = 5000;
    this.camera.updateProjectionMatrix();

    // Configure orbit controls
    if (this.orbitControls.current) {
      this.orbitControls.current.minDistance = 50;
      this.orbitControls.current.maxDistance = location.distance || 800;
      this.orbitControls.current.update();
    }

    // Update tile renderer error target
    if (this.tilesRenderer) {
      this.tilesRenderer.errorTarget = 1;
      this.tilesRenderer.update();
    }
  }

  /**
   * Restore camera to a previously saved position and target
   * @param position The camera position to restore
   * @param target The orbit controls target to restore
   */
  restorePosition(position: THREE.Vector3, target: THREE.Vector3): void {
    if (!this.camera || !this.orbitControls.current) return;

    // Set camera position
    this.camera.position.copy(position);

    // Set orbit controls target
    this.orbitControls.current.target.copy(target);

    // Update the controls
    this.orbitControls.current.update();

    // Update camera
    this.camera.updateProjectionMatrix();

    // Update tile renderer to refresh with new camera position
    if (this.tilesRenderer) {
      this.tilesRenderer.errorTarget = 0.2; // High detail for restored position
      this.tilesRenderer.update();
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
