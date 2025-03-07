// @ts-nocheck
import * as THREE from "three";

/**
 * CustomShadowProjector
 *  - Renders a "shadow depth pass" from a directional light's POV
 *  - Exposes a matrix + texture so you can sample it in your main materials
 */
export class CustomShadowProjector {
  constructor(scene, light, options = {}) {
    this.scene = scene;
    this.light = light;

    const size = options.shadowMapSize || 1024;
    this.shadowRenderTarget = new THREE.WebGLRenderTarget(size, size, {
      depthBuffer: true,
      stencilBuffer: false,
    });

    // Orthographic camera for the sunlight’s POV.
    // Tweak left/right/top/bottom for your city scale.
    this.shadowCamera = new THREE.OrthographicCamera(
      -5000,
      5000,
      5000,
      -5000,
      1,
      20000
    );
    this.shadowCamera.position.copy(this.light.position);
    this.shadowCamera.lookAt(0, 0, 0);
    this.shadowCamera.up.set(0, 1, 0);
    this.shadowCamera.updateProjectionMatrix();

    // Depth material: used to store depth in the shadow map
    this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.depthPacking = THREE.RGBADepthPacking;

    // A matrix that transforms world space -> shadow map UV
    this.lightMatrix = new THREE.Matrix4();

    // For bias from NDC to [0..1]
    this.biasMatrix = new THREE.Matrix4().set(
      0.5,
      0.0,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.5,
      0.0,
      0.0,
      0.5,
      0.5,
      0.0,
      0.0,
      0.0,
      1.0
    );
  }

  // Render from the light’s POV into the shadowRenderTarget
  renderShadowMap = (renderer) => {
    // Save original settings
    const oldOverride = this.scene.overrideMaterial;
    const oldTarget = renderer.getRenderTarget();
    const oldXREnabled = renderer.xr.enabled;

    renderer.xr.enabled = false;
    this.scene.overrideMaterial = this.depthMaterial;
    renderer.setRenderTarget(this.shadowRenderTarget);
    renderer.clear();
    renderer.render(this.scene, this.shadowCamera);

    // Restore
    this.scene.overrideMaterial = oldOverride;
    renderer.setRenderTarget(oldTarget);
    renderer.xr.enabled = oldXREnabled;

    // Compute the matrix for sampling the shadow map in the main pass
    // typical formula: (projection * view) -> range-shift
    this.lightMatrix.multiplyMatrices(
      this.shadowCamera.projectionMatrix,
      this.shadowCamera.matrixWorldInverse
    );
    this.lightMatrix.multiply(this.biasMatrix);
  };

  update = (renderer) => {
    // Move shadow camera with the directional light
    this.shadowCamera.position.copy(this.light.position);
    // Optionally, lookAt( your city center ) if needed
    this.shadowCamera.lookAt(0, 0, 0);
    this.shadowCamera.updateProjectionMatrix();

    this.renderShadowMap(renderer);
  };
}
