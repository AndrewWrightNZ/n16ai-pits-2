import {
  Vector2,
  Vector3,
  DirectionalLight,
  MathUtils,
  ShaderChunk,
  Matrix4,
  Box3,
  Object3D,
  Material,
  PerspectiveCamera,
  OrthographicCamera,
  ShaderMaterial,
} from "three";
import { CSMFrustum } from "./frustrum";
import { CSMShader } from "./shader";

const _cameraToLightMatrix = new Matrix4();
const _lightSpaceFrustum = new CSMFrustum();
const _center = new Vector3();
const _bbox = new Box3();
const _uniformArray: number[] = [];
const _logArray: number[] = [];
const _lightOrientationMatrix = new Matrix4();
const _lightOrientationMatrixInverse = new Matrix4();
const _up = new Vector3(0, 1, 0);

// Additional reusable objects to reduce GC pressure
const _tempLightDirection = new Vector3();

interface CSMParams {
  camera: PerspectiveCamera | OrthographicCamera;
  parent: Object3D;
  cascades?: number;
  maxFar?: number;
  mode?: "uniform" | "logarithmic" | "practical" | "custom";
  shadowMapSize?: number;
  shadowBias?: number;
  lightDirection?: Vector3;
  lightIntensity?: number;
  lightNear?: number;
  lightFar?: number;
  lightMargin?: number;
  customSplitsCallback?: (
    cascades: number,
    near: number,
    far: number,
    breaks: number[]
  ) => void;
  fade?: boolean;
}

export class CSM {
  camera: PerspectiveCamera | OrthographicCamera;
  parent: Object3D;
  cascades: number;
  maxFar: number;
  mode: "uniform" | "logarithmic" | "practical" | "custom";
  shadowMapSize: number;
  shadowBias: number;
  lightDirection: Vector3;
  lightIntensity: number;
  lightNear: number;
  lightFar: number;
  lightMargin: number;
  customSplitsCallback?: (
    cascades: number,
    near: number,
    far: number,
    breaks: number[]
  ) => void;
  fade: boolean;
  mainFrustum: CSMFrustum;
  frustums: CSMFrustum[];
  breaks: number[];
  lights: DirectionalLight[];
  shaders: Map<
    Material,
    {
      uniforms: { [uniform: string]: { value: any } };
      vertexShader: string;
      fragmentShader: string;
    } | null
  >;
  // Track last update time for throttling
  private _lastUpdateTime: number = 0;

  constructor(data: CSMParams) {
    this.camera = data.camera;
    this.parent = data.parent;
    this.cascades = data.cascades || 3;
    this.maxFar = data.maxFar || 100000;
    this.mode = data.mode || "practical";
    this.shadowMapSize = data.shadowMapSize || 2048;
    this.shadowBias = data.shadowBias || 0.000001;
    this.lightDirection =
      data.lightDirection || new Vector3(1, -1, 1).normalize();
    this.lightIntensity = data.lightIntensity || 1;
    this.lightNear = data.lightNear || 1;
    this.lightFar = data.lightFar || 2000;
    this.lightMargin = data.lightMargin || 200;
    this.customSplitsCallback = data.customSplitsCallback;
    this.fade = data.fade || false;
    this.mainFrustum = new CSMFrustum();
    this.frustums = [];
    this.breaks = [];

    this.lights = [];
    this.shaders = new Map();

    this.createLights();
    this.updateFrustums();
    this.injectInclude();
  }

  private createLights(): void {
    for (let i = 0; i < this.cascades; i++) {
      const light = new DirectionalLight(0xffffff, this.lightIntensity);
      light.castShadow = true;
      light.shadow.mapSize.width = this.shadowMapSize;
      light.shadow.mapSize.height = this.shadowMapSize;

      light.shadow.camera.near = this.lightNear;
      light.shadow.camera.far = this.lightFar;
      light.shadow.bias = this.shadowBias;

      this.parent.add(light);
      this.parent.add(light.target);
      this.lights.push(light);
    }
  }

  private initCascades(): void {
    const camera = this.camera;
    camera.updateProjectionMatrix();
    this.mainFrustum.setFromProjectionMatrix(
      camera.projectionMatrix,
      this.maxFar
    );
    this.mainFrustum.split(this.breaks, this.frustums);
  }

  private updateShadowBounds(): void {
    const frustums = this.frustums;
    for (let i = 0; i < frustums.length; i++) {
      const light = this.lights[i];
      const shadowCam = light.shadow.camera;
      const frustum = this.frustums[i];

      const nearVerts = frustum.vertices.near;
      const farVerts = frustum.vertices.far;
      const point1 = farVerts[0];

      // Determine the furthest point to use for shadow camera sizing
      // This is more efficiently done with direct comparisons
      const distFarFar = point1.distanceTo(farVerts[2]);
      const distFarNear = point1.distanceTo(nearVerts[2]);

      const point2 = distFarFar > distFarNear ? farVerts[2] : nearVerts[2];
      let squaredBBWidth = point1.distanceTo(point2);

      if (this.fade) {
        const camera = this.camera;
        const far = Math.max(camera.far, this.maxFar);
        const linearDepth = frustum.vertices.far[0].z / (far - camera.near);
        const margin = 0.25 * Math.pow(linearDepth, 2.0) * (far - camera.near);

        squaredBBWidth += margin;
      }

      // Update shadow camera projection - these are symmetric so we can optimize the calculations
      const halfWidth = squaredBBWidth * 0.5;
      shadowCam.left = -halfWidth;
      shadowCam.right = halfWidth;
      shadowCam.top = halfWidth;
      shadowCam.bottom = -halfWidth;
      shadowCam.updateProjectionMatrix();
    }
  }

  private getBreaks(): void {
    const camera = this.camera;
    const far = Math.min(camera.far, this.maxFar);
    this.breaks.length = 0;

    switch (this.mode) {
      case "uniform":
        this.uniformSplit(this.cascades, camera.near, far, this.breaks);
        break;
      case "logarithmic":
        this.logarithmicSplit(this.cascades, camera.near, far, this.breaks);
        break;
      case "practical":
        this.practicalSplit(this.cascades, camera.near, far, 0.5, this.breaks);
        break;
      case "custom":
        if (this.customSplitsCallback === undefined)
          console.error("CSM: Custom split scheme callback not defined.");
        else
          this.customSplitsCallback(
            this.cascades,
            camera.near,
            far,
            this.breaks
          );
        break;
    }
  }

  private uniformSplit(
    amount: number,
    near: number,
    far: number,
    target: number[]
  ): void {
    // Precompute the factor for better performance
    const step = (far - near) / amount;
    const invFar = 1 / far;

    for (let i = 1; i < amount; i++) {
      target.push((near + step * i) * invFar);
    }

    target.push(1);
  }

  private logarithmicSplit(
    amount: number,
    near: number,
    far: number,
    target: number[]
  ): void {
    // Pre-calculate the logarithmic base once
    const logBase = far / near;
    const invFar = 1 / far;

    for (let i = 1; i < amount; i++) {
      target.push(near * Math.pow(logBase, i / amount) * invFar);
    }

    target.push(1);
  }

  private practicalSplit(
    amount: number,
    near: number,
    far: number,
    lambda: number,
    target: number[]
  ): void {
    _uniformArray.length = 0;
    _logArray.length = 0;
    this.logarithmicSplit(amount, near, far, _logArray);
    this.uniformSplit(amount, near, far, _uniformArray);

    for (let i = 1; i < amount; i++) {
      target.push(
        MathUtils.lerp(_uniformArray[i - 1], _logArray[i - 1], lambda)
      );
    }

    target.push(1);
  }

  update(): void {
    const camera = this.camera;
    const frustums = this.frustums;

    // Performance optimization: throttle updates
    const now = performance.now();
    if (now - this._lastUpdateTime < 16) {
      // ~60fps max update rate
      return;
    }
    this._lastUpdateTime = now;

    _lightOrientationMatrix.lookAt(new Vector3(), this.lightDirection, _up);
    _lightOrientationMatrixInverse.copy(_lightOrientationMatrix).invert();

    for (let i = 0; i < frustums.length; i++) {
      const light = this.lights[i];
      const shadowCam = light.shadow.camera;

      // Calculate texel dimensions only once per cascade
      const texelWidth =
        (shadowCam.right - shadowCam.left) / this.shadowMapSize;
      const texelHeight =
        (shadowCam.top - shadowCam.bottom) / this.shadowMapSize;

      _cameraToLightMatrix.multiplyMatrices(
        _lightOrientationMatrixInverse,
        camera.matrixWorld
      );
      frustums[i].toSpace(_cameraToLightMatrix, _lightSpaceFrustum);

      const nearVerts = _lightSpaceFrustum.vertices.near;
      const farVerts = _lightSpaceFrustum.vertices.far;

      // Reset bounding box
      _bbox.makeEmpty();

      // Unroll small loop for better performance
      _bbox.expandByPoint(nearVerts[0]);
      _bbox.expandByPoint(nearVerts[1]);
      _bbox.expandByPoint(nearVerts[2]);
      _bbox.expandByPoint(nearVerts[3]);
      _bbox.expandByPoint(farVerts[0]);
      _bbox.expandByPoint(farVerts[1]);
      _bbox.expandByPoint(farVerts[2]);
      _bbox.expandByPoint(farVerts[3]);

      _bbox.getCenter(_center);
      _center.z = _bbox.max.z + this.lightMargin;

      // Quantize position to texel grid to reduce flickering
      _center.x = Math.floor(_center.x / texelWidth) * texelWidth;
      _center.y = Math.floor(_center.y / texelHeight) * texelHeight;

      _center.applyMatrix4(_lightOrientationMatrix);

      light.position.copy(_center);
      light.target.position.copy(_center);

      // Update light target position
      light.target.position.x += this.lightDirection.x;
      light.target.position.y += this.lightDirection.y;
      light.target.position.z += this.lightDirection.z;

      // Mark matrices as needing update
      light.matrixWorldNeedsUpdate = true;
      light.target.matrixWorldNeedsUpdate = true;
    }
  }

  /**
   * Set a new light direction with optional throttling
   * @param newDirection The new light direction vector
   * @param forceUpdate Force a complete update regardless of direction change
   */
  setLightDirection(newDirection: Vector3, forceUpdate: boolean = false): void {
    _tempLightDirection.copy(newDirection).normalize();

    // Only update if direction has changed significantly (0.001 radians ≈ 0.057 degrees)
    // or if forceUpdate is true
    if (
      forceUpdate ||
      (!this.lightDirection.equals(_tempLightDirection) &&
        this.lightDirection.angleTo(_tempLightDirection) > 0.001)
    ) {
      this.lightDirection.copy(_tempLightDirection);
      this.update();
    }
  }

  injectInclude(): void {
    ShaderChunk.lights_fragment_begin = CSMShader.lights_fragment_begin;
    ShaderChunk.lights_pars_begin = CSMShader.lights_pars_begin;

    // Add this line to inject the custom shadowmap_pars_fragment
    ShaderChunk.shadowmap_pars_fragment = CSMShader.shadowmap_pars_fragment;
  }

  setupMaterial(material: Material): void {
    if (material instanceof ShaderMaterial) {
      material.defines = material.defines || {};
      material.defines.USE_CSM = 1;
      material.defines.CSM_CASCADES = this.cascades;

      if (this.fade) {
        material.defines.CSM_FADE = "";
      }

      const breaksVec2: Vector2[] = [];
      const scope = this;
      const shaders = this.shaders;

      material.onBeforeCompile = function (shader: {
        uniforms: { [uniform: string]: { value: any } };
        vertexShader: string;
        fragmentShader: string;
      }) {
        const far = Math.min(scope.camera.far, scope.maxFar);
        scope.getExtendedBreaks(breaksVec2);

        shader.uniforms.CSM_cascades = { value: breaksVec2 };
        shader.uniforms.cameraNear = { value: scope.camera.near };
        shader.uniforms.shadowFar = { value: far };

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <lights_fragment_end>",
          CSMShader.csm_fragment + "\n#include <lights_fragment_end>"
        );

        shaders.set(material, shader);
      };

      shaders.set(material, null);
    } else {
      console.warn(
        "CSM: Material is not a ShaderMaterial. CSM may not work correctly."
      );
    }
  }

  updateUniforms(): void {
    const far = Math.min(this.camera.far, this.maxFar);
    const shaders = this.shaders;

    shaders.forEach((shader, material) => {
      if (shader !== null) {
        const uniforms = shader.uniforms;
        if (
          uniforms.CSM_cascades &&
          Array.isArray(uniforms.CSM_cascades.value)
        ) {
          this.getExtendedBreaks(uniforms.CSM_cascades.value);
        }
        if (uniforms.cameraNear) uniforms.cameraNear.value = this.camera.near;
        if (uniforms.shadowFar) uniforms.shadowFar.value = far;
      }

      // Ensure material.defines exists
      if (!material.defines) {
        material.defines = {};
      }

      if (!this.fade && "CSM_FADE" in material.defines) {
        delete material.defines.CSM_FADE;
        material.needsUpdate = true;
      } else if (this.fade && !("CSM_FADE" in material.defines)) {
        material.defines.CSM_FADE = "";
        material.needsUpdate = true;
      }
    });
  }

  getExtendedBreaks(target: Vector2[]): void {
    // Pre-allocate the array to the right size
    while (target.length < this.breaks.length) {
      target.push(new Vector2());
    }
    // Truncate if needed
    target.length = this.breaks.length;

    // Update the values directly
    for (let i = 0; i < this.cascades; i++) {
      const amount = this.breaks[i];
      const prev = this.breaks[i - 1] || 0;
      target[i].x = prev;
      target[i].y = amount;
    }
  }

  updateFrustums(): void {
    this.getBreaks();
    this.initCascades();
    this.updateShadowBounds();
    this.updateUniforms();
  }

  remove(): void {
    for (let i = 0; i < this.lights.length; i++) {
      this.parent.remove(this.lights[i].target);
      this.parent.remove(this.lights[i]);
    }
  }

  dispose(): void {
    const shaders = this.shaders;
    shaders.forEach((shader, material) => {
      // Type assertion for material to allow property modification
      const mat = material as any;
      mat.onBeforeCompile = undefined;

      if (mat.defines) {
        mat.defines.USE_CSM = undefined;
        mat.defines.CSM_CASCADES = undefined;
        mat.defines.CSM_FADE = undefined;
      }

      if (shader !== null && shader.uniforms) {
        // Remove CSM-specific uniforms
        delete shader.uniforms.CSM_cascades;
        delete shader.uniforms.cameraNear;
        delete shader.uniforms.shadowFar;
      }

      material.needsUpdate = true;
    });
    shaders.clear();
  }
}
