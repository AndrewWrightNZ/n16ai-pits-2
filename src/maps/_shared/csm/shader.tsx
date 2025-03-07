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

  // Custom CSM fragment
  csm_fragment: /* glsl */ `
#if defined( USE_CSM ) && defined( CSM_CASCADES )

    #if defined( USE_SHADOWMAP )

    #if NUM_DIR_LIGHT_SHADOWS > 0

    DirectionalLightShadow directionalLightShadow;
    float linearDepth = (-vViewPosition.z - cameraNear) / (shadowFar - cameraNear);

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {

        directionalLightShadow = directionalLightShadows[ i ];
        
        if(linearDepth >= CSM_cascades[i].x && linearDepth < CSM_cascades[i].y) {
            directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
        }

        if(linearDepth >= CSM_cascades[i].x && (linearDepth < CSM_cascades[i].y || i == CSM_CASCADES - 1)) {
            RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
        }

    }
    #pragma unroll_loop_end

    #endif

    #endif

#endif
`,
};

export { CSMShader };
