import { ShaderChunk } from "three";

/**
 * Cascade Shadow Mapping shader chunks for Three.js
 * Optimized for performance and memory efficiency
 */
export const CSMShader = {
  // Cache original shader chunks to avoid repeated string operations
  _originalLightsFragmentBegin: ShaderChunk.lights_fragment_begin,
  _originalLightsParsBegin: ShaderChunk.lights_pars_begin,
  _originalShadowmapParsFragment: ShaderChunk.shadowmap_pars_fragment,

  /**
   * Extended lights_fragment_begin with CSM uniforms
   */
  lights_fragment_begin: /* glsl */ `
#if defined( USE_CSM ) && defined( CSM_CASCADES )
uniform vec2 CSM_cascades[CSM_CASCADES];
uniform float cameraNear;
uniform float shadowFar;
#endif

${ShaderChunk.lights_fragment_begin}
`,

  /**
   * Extended lights_pars_begin with CSM uniforms
   */
  lights_pars_begin: /* glsl */ `
#if defined( USE_CSM ) && defined( CSM_CASCADES )
uniform vec2 CSM_cascades[CSM_CASCADES];
uniform float cameraNear;
uniform float shadowFar;
#endif

${ShaderChunk.lights_pars_begin}
`,

  /**
   * Original shadowmap_pars_fragment to ensure getShadow is defined
   * No modification needed here - just using the original
   */
  shadowmap_pars_fragment: ShaderChunk.shadowmap_pars_fragment,

  /**
   * Optimized CSM fragment shader with improved branching and efficiency
   */
  csm_fragment: /* glsl */ `
#if defined( USE_CSM ) && defined( CSM_CASCADES )
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow directionalLightShadow;
    float linearDepth = (-vViewPosition.z - cameraNear) / (shadowFar - cameraNear);
    float shadow = 1.0;
    
    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
      directionalLightShadow = directionalLightShadows[ i ];
      
      // Use step() instead of if() for better performance
      // step(edge, x) returns 0.0 if x < edge, and 1.0 otherwise
      float inCascade = step(CSM_cascades[i].x, linearDepth) * step(linearDepth, CSM_cascades[i].y);
      float isLastCascade = float(i == CSM_CASCADES - 1);
      float useThisCascade = inCascade + (isLastCascade * step(CSM_cascades[i].x, linearDepth) * (1.0 - inCascade));
      
      // Calculate shadow only if cascade is relevant
      if (useThisCascade > 0.5) {
        // This calculation is only performed if the cascade is relevant
        if (directLight.visible && receiveShadow) {
          shadow = getShadow(
            directionalShadowMap[ i ],
            directionalLightShadow.shadowMapSize,
            directionalLightShadow.shadowBias,
            directionalLightShadow.shadowRadius,
            vDirectionalShadowCoord[ i ]
          );
        }
        
        // Apply shadow and lighting - only executed once for the correct cascade
        directLight.color *= shadow;
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
        
        // Early exit optimization - no need to check further cascades
        break;
      }
    }
    #pragma unroll_loop_end
  #endif
#endif
`,

  /**
   * Restore original shader chunks
   * Call this method when removing CSM from the scene
   */
  restoreOriginalShaders: function () {
    // Restore original shader chunks
    ShaderChunk.lights_fragment_begin = this._originalLightsFragmentBegin;
    ShaderChunk.lights_pars_begin = this._originalLightsParsBegin;
    ShaderChunk.shadowmap_pars_fragment = this._originalShadowmapParsFragment;
  },
};
