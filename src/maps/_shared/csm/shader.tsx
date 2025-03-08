import { ShaderChunk } from "three";

const CSMShader = {
  lights_fragment_begin: /* glsl */ `
#if defined( USE_CSM ) && defined( CSM_CASCADES )
uniform vec2 CSM_cascades[CSM_CASCADES];
uniform float cameraNear;
uniform float shadowFar;
#endif

${ShaderChunk.lights_fragment_begin}
`,

  lights_pars_begin: /* glsl */ `
#if defined( USE_CSM ) && defined( CSM_CASCADES )
uniform vec2 CSM_cascades[CSM_CASCADES];
uniform float cameraNear;
uniform float shadowFar;
#endif

${ShaderChunk.lights_pars_begin}
`,

  // Add shadowmap_pars_fragment to ensure getShadow is defined
  shadowmap_pars_fragment: ShaderChunk.shadowmap_pars_fragment,

  // Optimized CSM fragment shader with improved branching and efficiency
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
};

export { CSMShader };
