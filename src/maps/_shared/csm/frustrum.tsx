import { Vector3, Matrix4 } from "three";

// Reusable objects for calculations - shared across all instances
const inverseProjectionMatrix = new Matrix4();
// Use a single array for clip points to minimize object creation
const _clipPoints = [
  new Vector3(1, 1, -1), // near top right - 0
  new Vector3(1, -1, -1), // near bottom right - 1
  new Vector3(-1, -1, -1), // near bottom left - 2
  new Vector3(-1, 1, -1), // near top left - 3
  new Vector3(1, 1, 1), // far top right - 4
  new Vector3(1, -1, 1), // far bottom right - 5
  new Vector3(-1, -1, 1), // far bottom left - 6
  new Vector3(-1, 1, 1), // far top left - 7
];

interface CSMFrustumData {
  projectionMatrix?: Matrix4;
  maxFar?: number;
}

interface FrustumVertices {
  near: Vector3[];
  far: Vector3[];
}

export class CSMFrustum {
  vertices: FrustumVertices;
  private _isDisposed: boolean = false;

  constructor(data?: CSMFrustumData) {
    // Pre-allocate all vertices
    this.vertices = {
      near: [new Vector3(), new Vector3(), new Vector3(), new Vector3()],
      far: [new Vector3(), new Vector3(), new Vector3(), new Vector3()],
    };

    if (data?.projectionMatrix !== undefined) {
      this.setFromProjectionMatrix(data.projectionMatrix, data.maxFar || 10000);
    }
  }

  setFromProjectionMatrix(
    projectionMatrix: Matrix4,
    maxFar: number
  ): FrustumVertices {
    if (this._isDisposed) return this.vertices;

    // Check if orthographic by examining the specific matrix element
    const isOrthographic = projectionMatrix.elements[2 * 4 + 3] === 0;

    // Compute inverse projection matrix once
    inverseProjectionMatrix.copy(projectionMatrix).invert();

    // 3 --- 0  vertices.near/far order
    // |     |
    // 2 --- 1
    // clip space spans from [-1, 1]

    // Apply transformation directly without using forEach to avoid callback overhead
    for (let i = 0; i < 4; i++) {
      // Near vertices (first 4 in _clipPoints)
      this.vertices.near[i]
        .copy(_clipPoints[i])
        .applyMatrix4(inverseProjectionMatrix);

      // Far vertices (last 4 in _clipPoints)
      this.vertices.far[i]
        .copy(_clipPoints[i + 4])
        .applyMatrix4(inverseProjectionMatrix);

      // Apply far clipping
      const farVertex = this.vertices.far[i];
      const absZ = Math.abs(farVertex.z);
      // Use max to avoid division by zero
      const factor = Math.min(maxFar / Math.max(absZ, 0.0001), 1.0);

      if (isOrthographic) {
        farVertex.z *= factor;
      } else {
        farVertex.multiplyScalar(factor);
      }
    }

    return this.vertices;
  }

  split(breaks: number[], target: CSMFrustum[]): void {
    if (this._isDisposed) return;

    // Ensure target array has correct size
    while (breaks.length > target.length) {
      target.push(new CSMFrustum());
    }
    target.length = breaks.length;

    // Cache vertices references for better performance
    const sourceNear = this.vertices.near;
    const sourceFar = this.vertices.far;

    for (let i = 0; i < breaks.length; i++) {
      const cascade = target[i];
      if (cascade._isDisposed) continue;

      const cascadeNear = cascade.vertices.near;
      const cascadeFar = cascade.vertices.far;

      if (i === 0) {
        // First cascade - just copy near vertices directly
        cascadeNear[0].copy(sourceNear[0]);
        cascadeNear[1].copy(sourceNear[1]);
        cascadeNear[2].copy(sourceNear[2]);
        cascadeNear[3].copy(sourceNear[3]);
      } else {
        // Use the previous break value for interpolation
        const prevBreak = breaks[i - 1];

        // Manual unrolling for better performance
        cascadeNear[0].lerpVectors(sourceNear[0], sourceFar[0], prevBreak);
        cascadeNear[1].lerpVectors(sourceNear[1], sourceFar[1], prevBreak);
        cascadeNear[2].lerpVectors(sourceNear[2], sourceFar[2], prevBreak);
        cascadeNear[3].lerpVectors(sourceNear[3], sourceFar[3], prevBreak);
      }

      if (i === breaks.length - 1) {
        // Last cascade - just copy far vertices directly
        cascadeFar[0].copy(sourceFar[0]);
        cascadeFar[1].copy(sourceFar[1]);
        cascadeFar[2].copy(sourceFar[2]);
        cascadeFar[3].copy(sourceFar[3]);
      } else {
        // Use current break value for interpolation
        const currBreak = breaks[i];

        // Manual unrolling for better performance
        cascadeFar[0].lerpVectors(sourceNear[0], sourceFar[0], currBreak);
        cascadeFar[1].lerpVectors(sourceNear[1], sourceFar[1], currBreak);
        cascadeFar[2].lerpVectors(sourceNear[2], sourceFar[2], currBreak);
        cascadeFar[3].lerpVectors(sourceNear[3], sourceFar[3], currBreak);
      }
    }
  }

  toSpace(cameraMatrix: Matrix4, target: CSMFrustum): void {
    if (this._isDisposed || target._isDisposed) return;

    // Manual unrolling for better performance - this function is called frequently in render loop
    // Near vertices
    target.vertices.near[0]
      .copy(this.vertices.near[0])
      .applyMatrix4(cameraMatrix);
    target.vertices.near[1]
      .copy(this.vertices.near[1])
      .applyMatrix4(cameraMatrix);
    target.vertices.near[2]
      .copy(this.vertices.near[2])
      .applyMatrix4(cameraMatrix);
    target.vertices.near[3]
      .copy(this.vertices.near[3])
      .applyMatrix4(cameraMatrix);

    // Far vertices
    target.vertices.far[0]
      .copy(this.vertices.far[0])
      .applyMatrix4(cameraMatrix);
    target.vertices.far[1]
      .copy(this.vertices.far[1])
      .applyMatrix4(cameraMatrix);
    target.vertices.far[2]
      .copy(this.vertices.far[2])
      .applyMatrix4(cameraMatrix);
    target.vertices.far[3]
      .copy(this.vertices.far[3])
      .applyMatrix4(cameraMatrix);
  }

  /**
   * Dispose method to clean up resources
   * and mark the frustum as disposed
   */
  dispose(): void {
    if (this._isDisposed) return;
    this._isDisposed = true;

    // Clear references in vectors to help GC
    for (let i = 0; i < 4; i++) {
      this.vertices.near[i].set(0, 0, 0);
      this.vertices.far[i].set(0, 0, 0);
    }
  }

  /**
   * Check if this frustum has been disposed
   */
  isDisposed(): boolean {
    return this._isDisposed;
  }
}
