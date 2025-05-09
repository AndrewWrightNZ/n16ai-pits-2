import * as THREE from "three";
import { PolygonCoordinate } from "../hooks/pubAreas/usePubAreas";

// Types

// Define a type for the partial pub data returned from Supabase
export type PartialPub = Pick<
  Pub,
  "id" | "name" | "latitude" | "longitude" | "address_text"
> & {
  created_at: string;
};

export interface Pub {
  id: number;
  name: string;
  address_text: string;
  latitude: number;
  longitude: number;
  camera_details: CameraPosition;

  // Areas
  has_areas_added: boolean;
  has_areas_measured: boolean;
  has_labels_added: boolean;
  has_vision_masks_added: boolean;

  // Processing
  last_processed_julian_week: number;
}

export interface SimpleCameraPosition {
  position: {
    x: number;
    y: number;
    z: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
}

export interface PubArea {
  id: number;
  name: string;
  description: string;
  type: string;
  latitude: number;
  longitude: number;
  camera_position: SimpleCameraPosition;
  pub_id: number;
  created_at: string;
  floor_area: number;
  coordinates: PolygonCoordinate[];
  vision_mask_points: { x: number; y: number }[];
}

export interface PubLabel {
  id: number;
  name: string;
  description: string;
  type: string;
  created_at: string;
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

export interface SunEval {
  id: number;
  pub_id: number;
  area_id: number;
  date: string;
  time: number;
  pc_in_sun: number;
}
