/* ============================================================
   GPU 流体：速度场 / 散度 / 涡量 / 压力迭代 / 平流
   基于 three.js 的 WebGLRenderTarget 乒乓缓冲实现
   ============================================================ */
export function createFluid(renderer, THREE, opts) {
  opts = opts || {};
  var SIM = opts.sim || 128;
  var DYE = opts.dye || 512;
  var ITER = opts.iterations || 18;

  var quadScene = new THREE.Scene();
  var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quadScene.add(quad);

  function makeRT(size) {
    return new THREE.WebGLRenderTarget(size, size, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false
    });
  }
  function makeFBO(size) {
    var a = makeRT(size), b = makeRT(size);
    return {
      read: a, write: b,
      swap: function () { var t = this.read; this.read = this.write; this.write = t; }
    };
  }

  var velocity = makeFBO(SIM);
  var density = makeFBO(DYE);
  var divergence = makeRT(SIM);
  var curl = makeRT(SIM);
  var pressure = makeFBO(SIM);

  var baseVert = [
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = uv;',
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}'
  ].join('\n');

  function mat(frag, uniforms) {
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: baseVert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false
    });
  }

  var splatMat = mat([
    'precision highp float;',
    'uniform sampler2D uTarget;',
    'uniform float aspectRatio;',
    'uniform vec3 color;',
    'uniform vec2 point;',
    'uniform vec2 prevPoint;',
    'uniform float radius;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 p = vUv;',
    '  vec2 d = p - point;',
    '  d.x *= aspectRatio;',
    '  vec3 base = texture2D(uTarget, p).xyz;',
    '  float influence = exp(-dot(d, d) / radius);',
    '  gl_FragColor = vec4(base + color * influence, 1.0);',
    '}'
  ].join('\n'), {
    uTarget: { value: null },
    aspectRatio: { value: 1 },
    color: { value: new THREE.Vector3() },
    point: { value: new THREE.Vector2() },
    prevPoint: { value: new THREE.Vector2() },
    radius: { value: .0025 }
  });

  var advectMat = mat([
    'precision highp float;',
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uSource;',
    'uniform vec2 texelSize;',
    'uniform float dt;',
    'uniform float dissipation;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;',
    '  gl_FragColor = texture2D(uSource, coord) * dissipation;',
    '}'
  ].join('\n'), {
    uVelocity: { value: null },
    uSource: { value: null },
    texelSize: { value: new THREE.Vector2(1 / SIM, 1 / SIM) },
    dt: { value: 1 / 60 },
    dissipation: { value: .98 }
  });

  var divergenceMat = mat([
    'precision highp float;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 texelSize;',
    'varying vec2 vUv;',
    'void main(){',
    '  float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;',
    '  float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;',
    '  float T = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).y;',
    '  float B = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).y;',
    '  vec2 C = texture2D(uVelocity, vUv).xy;',
    '  if (vUv.x < texelSize.x) L = -C.x;',
    '  if (vUv.x > 1.0 - texelSize.x) R = -C.x;',
    '  if (vUv.y < texelSize.y) B = -C.y;',
    '  if (vUv.y > 1.0 - texelSize.y) T = -C.y;',
    '  float div = 0.5 * (R - L + T - B);',
    '  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n'), {
    uVelocity: { value: null },
    texelSize: { value: new THREE.Vector2(1 / SIM, 1 / SIM) }
  });

  var curlMat = mat([
    'precision highp float;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 texelSize;',
    'varying vec2 vUv;',
    'void main(){',
    '  float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).y;',
    '  float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).y;',
    '  float T = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).x;',
    '  float B = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).x;',
    '  float vorticity = R - L - T + B;',
    '  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n'), {
    uVelocity: { value: null },
    texelSize: { value: new THREE.Vector2(1 / SIM, 1 / SIM) }
  });

  var vorticityMat = mat([
    'precision highp float;',
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uCurl;',
    'uniform vec2 texelSize;',
    'uniform float curl;',
    'uniform float dt;',
    'varying vec2 vUv;',
    'void main(){',
    '  float L = texture2D(uCurl, vUv - vec2(texelSize.x, 0.0)).x;',
    '  float R = texture2D(uCurl, vUv + vec2(texelSize.x, 0.0)).x;',
    '  float T = texture2D(uCurl, vUv + vec2(0.0, texelSize.y)).x;',
    '  float B = texture2D(uCurl, vUv - vec2(0.0, texelSize.y)).x;',
    '  float C = texture2D(uCurl, vUv).x;',
    '  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));',
    '  force /= length(force) + 0.0001;',
    '  force *= curl * C;',
    '  force.y *= -1.0;',
    '  vec2 vel = texture2D(uVelocity, vUv).xy;',
    '  gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);',
    '}'
  ].join('\n'), {
    uVelocity: { value: null },
    uCurl: { value: null },
    texelSize: { value: new THREE.Vector2(1 / SIM, 1 / SIM) },
    curl: { value: 28 },
    dt: { value: 1 / 60 }
  });

  var pressureMat = mat([
    'precision highp float;',
    'uniform sampler2D uPressure;',
    'uniform sampler2D uDivergence;',
    'uniform vec2 texelSize;',
    'varying vec2 vUv;',
    'void main(){',
    '  float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;',
    '  float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;',
    '  float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;',
    '  float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;',
    '  float div = texture2D(uDivergence, vUv).x;',
    '  float p = (L + R + T + B - div) * 0.25;',
    '  gl_FragColor = vec4(p, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n'), {
    uPressure: { value: null },
    uDivergence: { value: null },
    texelSize: { value: new THREE.Vector2(1 / SIM, 1 / SIM) }
  });

  var gradientMat = mat([
    'precision highp float;',
    'uniform sampler2D uPressure;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 texelSize;',
    'varying vec2 vUv;',
    'void main(){',
    '  float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;',
    '  float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;',
    '  float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;',
    '  float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;',
    '  vec2 velocity = texture2D(uVelocity, vUv).xy;',
    '  velocity -= vec2(R - L, T - B);',
    '  gl_FragColor = vec4(velocity, 0.0, 1.0);',
    '}'
  ].join('\n'), {
    uPressure: { value: null },
    uVelocity: { value: null },
    texelSize: { value: new THREE.Vector2(1 / SIM, 1 / SIM) }
  });

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target || null);
    renderer.render(quadScene, quadCam);
  }

  var config = {
    VELOCITY_DISSIPATION: .985,
    DENSITY_DISSIPATION: .988,
    CURL: 26
  };

  function splat(x, y, dx, dy, color, radius) {
    splatMat.uniforms.aspectRatio.value = renderer.domElement.width / Math.max(1, renderer.domElement.height);
    splatMat.uniforms.radius.value = radius || .0026;

    splatMat.uniforms.uTarget.value = velocity.read.texture;
    splatMat.uniforms.point.value.set(x, 1 - y);
    splatMat.uniforms.color.value.set(dx, -dy, 0);
    pass(splatMat, velocity.write);
    velocity.swap();

    splatMat.uniforms.uTarget.value = density.read.texture;
    splatMat.uniforms.color.value.set(color.r, color.g, color.b);
    pass(splatMat, density.write);
    density.swap();
  }

  function step(dt) {
    dt = Math.min(.033, dt || 1 / 60);

    curlMat.uniforms.uVelocity.value = velocity.read.texture;
    pass(curlMat, curl);

    vorticityMat.uniforms.uVelocity.value = velocity.read.texture;
    vorticityMat.uniforms.uCurl.value = curl.texture;
    vorticityMat.uniforms.curl.value = config.CURL;
    vorticityMat.uniforms.dt.value = dt;
    pass(vorticityMat, velocity.write);
    velocity.swap();

    divergenceMat.uniforms.uVelocity.value = velocity.read.texture;
    pass(divergenceMat, divergence);

    pressureMat.uniforms.uDivergence.value = divergence.texture;
    for (var i = 0; i < ITER; i++) {
      pressureMat.uniforms.uPressure.value = pressure.read.texture;
      pass(pressureMat, pressure.write);
      pressure.swap();
    }

    gradientMat.uniforms.uPressure.value = pressure.read.texture;
    gradientMat.uniforms.uVelocity.value = velocity.read.texture;
    pass(gradientMat, velocity.write);
    velocity.swap();

    advectMat.uniforms.texelSize.value.set(1 / SIM, 1 / SIM);
    advectMat.uniforms.uVelocity.value = velocity.read.texture;
    advectMat.uniforms.uSource.value = velocity.read.texture;
    advectMat.uniforms.dissipation.value = config.VELOCITY_DISSIPATION;
    advectMat.uniforms.dt.value = dt;
    pass(advectMat, velocity.write);
    velocity.swap();

    advectMat.uniforms.texelSize.value.set(1 / DYE, 1 / DYE);
    advectMat.uniforms.uVelocity.value = velocity.read.texture;
    advectMat.uniforms.uSource.value = density.read.texture;
    advectMat.uniforms.dissipation.value = config.DENSITY_DISSIPATION;
    advectMat.uniforms.dt.value = dt;
    pass(advectMat, density.write);
    density.swap();

    renderer.setRenderTarget(null);
  }

  return {
    splat: splat,
    step: step,
    texture: function () { return density.read.texture; },
    config: config,
    dispose: function () {
      [velocity, density, pressure].forEach(function (f) {
        f.read.dispose(); f.write.dispose();
      });
      divergence.dispose(); curl.dispose();
    }
  };
}
