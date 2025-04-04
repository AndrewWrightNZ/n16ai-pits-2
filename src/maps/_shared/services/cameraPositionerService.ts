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
    this.camera.far = true ? 10000 : 20000;
    this.camera.updateProjectionMatrix();

    // Configure orbit controls
    if (this.orbitControls.current) {
      this.orbitControls.current.minDistance = 50;
      this.orbitControls.current.maxDistance =
        location.distance || (true ? 800 : 1000);
      this.orbitControls.current.update();
    }

    // Update tile renderer error target
    if (this.tilesRenderer) {
      this.tilesRenderer.errorTarget = true ? 4 : 2;
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

  /**
   * Logs the current camera position, rotation and controls settings
   * to the console in a format ready for PRESET_LOCATIONS
   */
  logCurrentPosition(): void {
    if (!this.camera || !this.orbitControls.current) {
      console.error("Camera or orbit controls not available");
      return;
    }

    // Get current camera position
    const position = this.camera.position.clone();

    // Get orbit controls target (look-at point)
    const target = this.orbitControls.current.target.clone();

    // Calculate distance from target
    const distance = position.distanceTo(target);

    // Get camera rotation in degrees
    const rotation = {
      x: THREE.MathUtils.radToDeg(this.camera.rotation.x),
      y: THREE.MathUtils.radToDeg(this.camera.rotation.y),
      z: THREE.MathUtils.radToDeg(this.camera.rotation.z),
    };

    // Calculate a heading value based on camera position relative to target
    const heading = Math.atan2(position.x - target.x, position.z - target.z);
    const headingDegrees = THREE.MathUtils.radToDeg(heading);

    // Calculate tilt (pitch) from camera rotation
    const tilt = rotation.x;

    // Format as a location object to copy/paste into PRESET_LOCATIONS
    const locationData = {
      name: "Custom Location",
      lat: 0, // You need to determine this based on your app's coordinate system
      lng: 0, // You need to determine this based on your app's coordinate system
      heading: headingDegrees,
      tilt: tilt,
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      target: {
        x: target.x,
        y: target.y,
        z: target.z,
      },
      distance: distance,
    };

    // Log formatted object for easy copy/paste
    console.log("Current Camera Position:");
    console.log(JSON.stringify(locationData, null, 2));

    // For easier integration with your PRESET_LOCATIONS
    console.log("\nFor PRESET_LOCATIONS array:");
    console.log(`{
  name: "Custom Location",
  lat: 0, // Update this value
  lng: 0, // Update this value
  heading: ${headingDegrees.toFixed(2)},
  tilt: ${tilt.toFixed(2)},
  position: { x: ${position.x.toFixed(2)}, y: ${position.y.toFixed(
      2
    )}, z: ${position.z.toFixed(2)} },
  target: { x: ${target.x.toFixed(2)}, y: ${target.y.toFixed(
      2
    )}, z: ${target.z.toFixed(2)} },
  distance: ${distance.toFixed(2)}
},`);
  }
}

export default CameraPositioner;
