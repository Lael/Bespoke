import * as THREE from 'three';

// type RoundPointsMaterialParams = {
//   color?: THREE.ColorRepresentation;
//   size?: number;
//   opacity?: number;
//   transparent?: boolean;
//   depthTest?: boolean;
//   depthWrite?: boolean;
//   /** Whether to use geometry 'color' attribute */
//   useVertexColors?: boolean;
//   sizeAttenuation?: boolean;
//   /** Whether to use geometry 'size' attribute */
//   usePerPointSize?: boolean;
//   alphaTest?: number;
// };


type RoundPointsMaterialParams =
  THREE.ShaderMaterialParameters & {
  color?: THREE.ColorRepresentation;
  size?: number;
  useVertexColors?: boolean;
  sizeAttenuation?: boolean;
  usePerPointSize?: boolean;
  alphaTest?: number;
};


export class RoundPointsMaterial extends THREE.ShaderMaterial {
  constructor(params: RoundPointsMaterialParams = {}) {
    const {
      color = 0xffffff,
      size = 4,
      opacity = 1,
      transparent = opacity < 1,
      depthTest = true,
      depthWrite = true,
      useVertexColors = false,
      sizeAttenuation = true,
      usePerPointSize = false,
      alphaTest = 0.0,
    } = params;

    const defines: Record<string, string> = {};
    if (useVertexColors) defines['USE_COLOR'] = '';
    if (usePerPointSize) defines['USE_POINT_SIZE_ATTRIBUTE'] = '';

    type RoundPointUniforms = {
      uColor: THREE.IUniform<THREE.Color>;
      uSize: THREE.IUniform<number>;
      uOpacity: THREE.IUniform<number>;
      uSizeAttenuation: THREE.IUniform<number>;
      uUsePerPointSize: THREE.IUniform<number>;
      uAlphaTest: THREE.IUniform<number>;
    };

    super({
      transparent,
      depthTest,
      depthWrite,
      // keep ShaderMaterial.opacity as the canonical value
      opacity,
      defines,
      uniforms: {
        uColor: {value: new THREE.Color(color)},
        uSize: {value: size},
        uOpacity: {value: opacity},
        uSizeAttenuation: {value: sizeAttenuation ? 1.0 : 0.0},
        uUsePerPointSize: {value: usePerPointSize ? 1.0 : 0.0},
        uAlphaTest: {value: alphaTest},
      },
      vertexShader: `
        uniform float uSize;
        uniform float uSizeAttenuation;
        uniform float uUsePerPointSize;

        #ifdef USE_COLOR
          attribute vec3 color;
          varying vec3 vColor;
        #endif

        #ifdef USE_POINT_SIZE_ATTRIBUTE
          attribute float size;
        #endif

        void main() {
          #ifdef USE_COLOR
            vColor = color;
          #endif

          float pointSize = uSize;

          #ifdef USE_POINT_SIZE_ATTRIBUTE
            pointSize = mix(uSize, size, uUsePerPointSize);
          #endif

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          if (uSizeAttenuation > 0.5) {
            gl_PointSize = pointSize * (300.0 / -mvPosition.z);
          } else {
            gl_PointSize = pointSize;
          }
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uAlphaTest;

        #ifdef USE_COLOR
          varying vec3 vColor;
        #endif

        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float r = length(p);

          float alpha = 1.0 - smoothstep(0.48, 0.5, r);
          if (alpha <= uAlphaTest) discard;

          vec3 baseColor = uColor;
          #ifdef USE_COLOR
            baseColor *= vColor;
          #endif

          gl_FragColor = vec4(baseColor, alpha * uOpacity);
        }
      `,
    });

    // optional: makes built-in flags consistent with expected behavior
    this.vertexColors = useVertexColors;
  }

  setRoundValues(values: Partial<RoundPointsMaterialParams>): void {
    // pass only ShaderMaterial-compatible keys to super
    const shaderVals: THREE.ShaderMaterialParameters = {};
    if ('transparent' in values) shaderVals.transparent = values.transparent;
    if ('depthTest' in values) shaderVals.depthTest = values.depthTest;
    if ('depthWrite' in values) shaderVals.depthWrite = values.depthWrite;
    if ('opacity' in values) shaderVals.opacity = values.opacity;
    // ...add any others you care about

    super.setValues(shaderVals);

    if (values.color !== undefined) this.color = new THREE.Color(values.color);
    if (values.size !== undefined) this.size = values.size;
    if (values.sizeAttenuation !== undefined) this.sizeAttenuation = values.sizeAttenuation;
    if (values.usePerPointSize !== undefined) this.usePerPointSize = values.usePerPointSize;
    if (values.useVertexColors !== undefined) this.setUseVertexColors(values.useVertexColors);
    if (values.alphaTest !== undefined) this.uniforms['uAlphaTest'].value = values.alphaTest;

    this.uniforms['uOpacity'].value = this.opacity;
  }

  get color(): THREE.Color {
    return this.uniforms['uColor'].value;
  }

  set color(v: THREE.Color) {
    this.uniforms['uColor'].value = v;
  }

  get size(): number {
    return this.uniforms['uSize'].value;
  }

  set size(v: number) {
    this.uniforms['uSize'].value = v;
  }

  get sizeAttenuation(): boolean {
    return this.uniforms['uSizeAttenuation'].value > 0.5;
  }

  set sizeAttenuation(v: boolean) {
    this.uniforms['uSizeAttenuation'].value = v ? 1.0 : 0.0;
  }

  get usePerPointSize(): boolean {
    return this.uniforms['uUsePerPointSize'].value > 0.5;
  }

  set usePerPointSize(v: boolean) {
    this.uniforms['uUsePerPointSize'].value = v ? 1.0 : 0.0;
  }

  get useVertexColors(): boolean {
    return !!this.defines?.['USE_COLOR'];
  }

  /**
   * Toggle vertex-color support after construction.
   * Needs recompilation because it changes shader defines.
   */
  setUseVertexColors(enabled: boolean): void {
    const has = !!this.defines?.['USE_COLOR'];
    if (enabled === has) return;

    this.defines = {...(this.defines || {})};
    if (enabled) this.defines['USE_COLOR'] = '';
    else delete this.defines['USE_COLOR'];

    this.vertexColors = enabled;
    this.needsUpdate = true;
  }

  /**
   * Toggle per-point-size attribute support after construction.
   * Needs recompilation because it changes shader defines.
   */
  setUsePerPointSizeAttribute(enabled: boolean): void {
    const has = !!this.defines?.['USE_POINT_SIZE_ATTRIBUTE'];
    if (enabled === has) return;

    this.defines = {...(this.defines || {})};
    if (enabled) this.defines['USE_POINT_SIZE_ATTRIBUTE'] = '';
    else delete this.defines['USE_POINT_SIZE_ATTRIBUTE'];

    this.uniforms['uUsePerPointSize'].value = enabled ? 1.0 : 0.0;
    this.needsUpdate = true;
  }

  /** If you change material.opacity directly, call this (or setValues) */
  syncOpacityUniform(): void {
    this.uniforms['uOpacity'].value = this.opacity;
  }
}

export class RoundPoints extends THREE.Points {
  declare material: RoundPointsMaterial;

  constructor(
    geometry?: THREE.BufferGeometry,
    material?: RoundPointsMaterial
  ) {
    super(geometry, material ?? new RoundPointsMaterial());
  }
}