import * as THREE from "three";

export interface Pub {
  id: number;
  name: string;
  address_text: string;
  latitude: number;
  longitude: number;
  camera_details: CameraPosition;
  vision_mask_points: number[];
}

export interface CameraPosition {
  position: THREE.Vector3;
  lookingAt: THREE.Vector3;
  up: THREE.Vector3;
  fov: number;
  aspect: number;
  near: number;
  far: number;
}

export interface SunEvaluation {
  id: number;
  pub_id: number;
  date: string;
  time: string;
  eval: string;
}

export interface SunEvalReport {
  time_stamp: string;
  counts: {
    full_sun_count: number;
    partial_sun_count: number;
    no_sun_count: number;
    total_count: number;
  };
}
