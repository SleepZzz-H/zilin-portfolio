import * as THREE from '../assets/vendor/three.module.js';
import { EffectComposer } from '../assets/vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../assets/vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../assets/vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../assets/vendor/addons/postprocessing/OutputPass.js';
import { ShaderPass } from '../assets/vendor/addons/postprocessing/ShaderPass.js';
import { createFluid } from './fluid.js';

/* ============================================================
   三维档案场景：圆环螺旋排布 + 滚动相机 + 自定义卡片 shader
   参考 Active Theory 的空间组织方式，用 three.js 原生实现
   ============================================================ */
(function orbit3d() {
  var wrap = document.getElementById('orbitWrap');
  var stage = document.getElementById('orbitStage');
  var canvas = document.getElementById('orbitGL');
  var track = document.getElementById('orbitTrack');
  var indexEl = document.getElementById('orbitIndex');
  var nameEl = document.getElementById('orbitName');
  var capB = document.querySelector('#glCaption b');
  var capS = document.querySelector('#glCaption span');
  if (!wrap || !stage || !canvas || !track) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var renderer;
  try {
    var probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return;
  }

  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR);
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, stage.clientWidth / Math.max(1, stage.clientHeight), .1, 100);
  camera.position.set(0, 0, 9.2);

  var group = new THREE.Group();
  scene.add(group);

  // 流体层：铺在卡片后方，鼠标划过时产生墨迹般的扰动
  var fluid = null, fluidMat = null, fluidPlane = null;
  var lastSplat = 0, lastAuto = 0;
  var scratchColor = new THREE.Color();
  try {
    var small = stage.clientWidth < 760;
    fluid = createFluid(renderer, THREE, { sim: small ? 96 : 128, dye: small ? 384 : 512, iterations: small ? 12 : 18 });
    fluidMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        tFluid: { value: fluid.texture() },
        uColor: { value: readSignal() },
        uIntensity: { value: .85 }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform sampler2D tFluid;',
        'uniform vec3 uColor;',
        'uniform float uIntensity;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec3 c = texture2D(tFluid, vUv).rgb;',
        '  float a = max(c.r, max(c.g, c.b));',
        '  gl_FragColor = vec4(c * uColor * uIntensity, a * .6);',
        '}'
      ].join('\n')
    });
    fluidPlane = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), fluidMat);
    fluidPlane.position.z = -9;
    fluidPlane.renderOrder = -10;
    scene.add(fluidPlane);
  } catch (e) {
    fluid = null;
  }

  // Bloom：让信号色描边与粒子产生辉光
  var composer = null;
  var bloom = null;
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(
      new THREE.Vector2(stage.clientWidth, stage.clientHeight),
      stage.clientWidth < 720 ? .26 : .36,
      .5,
      .85
    );
    composer.addPass(bloom);

    // 镜头色散：越靠边缘 R/B 分离越明显
    var dispersionPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uAmount: { value: stage.clientWidth < 760 ? .0006 : .0012 }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform sampler2D tDiffuse;',
        'uniform float uAmount;',
        'varying vec2 vUv;',
        'void main(){',
        '  vec2 dir = vUv - 0.5;',
        '  vec2 off = dir * uAmount * (0.4 + length(dir) * 2.2);',
        '  float r = texture2D(tDiffuse, vUv + off).r;',
        '  vec4 g = texture2D(tDiffuse, vUv);',
        '  float b = texture2D(tDiffuse, vUv - off).b;',
        '  gl_FragColor = vec4(r, g.g, b, 1.0);',
        '}'
      ].join('\n')
    });
    composer.addPass(dispersionPass);
    composer.addPass(new OutputPass());
  } catch (e) {
    composer = null;
  }

  var STEP = .58;
  var RADIUS = 4.9;
  var PW = 4.0;
  var PH = 2.5;
  var items = window.__orbitItems || window.WORKS || [];
  var cards = [];
  var raf = null;
  var visible = true;
  var focus = 0;
  var targetFocus = 0;
  var first = true;
  var lastAct = -1;
  var pointer = { x: 0, y: 0 };
  var ndc = new THREE.Vector2(-9, -9);
  var hovered = null;
  var raycaster = new THREE.Raycaster();

  function readSignal() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--signal').trim() || '#dff21a';
    return new THREE.Color(v);
  }
  var baseColor = readSignal();

  // 可交互粒子：鼠标靠近时产生旋涡式排斥
  var pCount = 520;
  var pPos = new Float32Array(pCount * 3);
  var pSeed = new Float32Array(pCount);
  for (var pi = 0; pi < pCount; pi++) {
    pPos[pi * 3] = (Math.random() - .5) * 20;
    pPos[pi * 3 + 1] = (Math.random() - .5) * 12;
    pPos[pi * 3 + 2] = -12 + Math.random() * 10;
    pSeed[pi] = Math.random();
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1));
  var pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColor: { value: baseColor.clone() },
      uPixelRatio: { value: DPR }
    },
    vertexShader: [
      'attribute float aSeed;',
      'uniform float uTime;',
      'uniform vec2 uMouse;',
      'uniform float uPixelRatio;',
      'varying float vA;',
      'varying float vSeed;',
      'void main(){',
      '  vSeed = aSeed;',
      '  vec3 p = position;',
      '  p.y += sin(uTime * .32 + aSeed * 6.283) * .16;',
      '  p.x += cos(uTime * .26 + aSeed * 9.42) * .1;',
      '  vec2 m = uMouse * vec2(16.0, 9.0);',
      '  vec2 d = p.xy - m;',
      '  float dist = length(d);',
      '  float f = smoothstep(3.4, 0.0, dist);',
      '  vec2 dir = d / max(dist, 0.001);',
      '  p.xy += dir * f * 2.4;',
      '  p.z += f * .8;',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = (2.2 + aSeed * 1.9) * uPixelRatio * (15.0 / -mv.z);',
      '  gl_Position = projectionMatrix * mv;',
      '  vA = .12 + f * .8;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColor;',
      'varying float vA;',
      'varying float vSeed;',
      'void main(){',
      '  vec2 c = gl_PointCoord - .5;',
      '  float d = length(c);',
      '  float a = smoothstep(.5, .3, d) * vA;',
      '  vec3 col = mix(uColor, vec3(.92, .93, .88), step(.86, vSeed) * .75);',
      '  gl_FragColor = vec4(col, a);',
      '}'
    ].join('\n')
  });
  var dust = new THREE.Points(pGeo, pMat);
  scene.add(dust);

  // 第二层：大颗柔光粒子，负责 Bloom 的光斑层次
  var haloCount = 55;
  var hPos = new Float32Array(haloCount * 3);
  for (var hi = 0; hi < haloCount; hi++) {
    hPos[hi * 3] = (Math.random() - .5) * 22;
    hPos[hi * 3 + 1] = (Math.random() - .5) * 13;
    hPos[hi * 3 + 2] = -11 + Math.random() * 9;
  }
  var hGeo = new THREE.BufferGeometry();
  hGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
  var haloTexCanvas = document.createElement('canvas');
  haloTexCanvas.width = haloTexCanvas.height = 64;
  var hctx = haloTexCanvas.getContext('2d');
  var hgrad = hctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  hgrad.addColorStop(0, 'rgba(255,255,255,.95)');
  hgrad.addColorStop(.25, 'rgba(255,255,255,.45)');
  hgrad.addColorStop(1, 'rgba(255,255,255,0)');
  hctx.fillStyle = hgrad;
  hctx.fillRect(0, 0, 64, 64);
  var haloTex = new THREE.CanvasTexture(haloTexCanvas);
  var haloMat = new THREE.PointsMaterial({
    size: .26, map: haloTex, color: baseColor.clone(),
    transparent: true, opacity: .12, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  var halos = new THREE.Points(hGeo, haloMat);
  scene.add(halos);

  // 光芒：当前作品背后的放射状 lens flare
  var flareMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: baseColor.clone() },
      uPower: { value: .0 },
      uTime: { value: 0 }
    },
    vertexShader: [
      'varying vec2 vUv;',
      'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'uniform vec3 uColor;',
      'uniform float uPower;',
      'uniform float uTime;',
      'varying vec2 vUv;',
      'void main(){',
      '  vec2 p = vUv - 0.5;',
      '  float x = abs(p.x) * 2.0;',
      '  float y = abs(p.y) * 2.0;',
      '  float streak = exp(-y * 16.0) * exp(-x * 1.6);',
      '  float core = exp(-length(p) * 12.0);',
      '  float a = streak * .5 + core * .22;',
      '  a *= smoothstep(1.0, 0.2, max(x, y));',
      '  gl_FragColor = vec4(uColor, a * uPower);',
      '}'
    ].join('\n'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var flare = new THREE.Mesh(new THREE.PlaneGeometry(17, 3.4), flareMat);
  flare.position.z = -2.2;
  scene.add(flare);

  var vertexShader = [
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'precision highp float;',
    'uniform sampler2D tMap;',
    'uniform float uHover;',
    'uniform float uActive;',
    'uniform float uImgAspect;',
    'uniform float uPlaneAspect;',
    'uniform vec2 uMouse;',
    'uniform vec3 uColor;',
    'uniform float uDim;',
    'uniform float uExposure;',
    'uniform sampler2D tFluid;',
    'uniform vec2 uResolution;',
    'uniform float uFluid;',
    'uniform float uDispersion;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 uv = vUv;',
    '  if (uImgAspect > uPlaneAspect) {',
    '    uv.x = (uv.x - 0.5) * (uPlaneAspect / uImgAspect) + 0.5;',
    '  } else {',
    '    uv.y = (uv.y - 0.5) * (uImgAspect / uPlaneAspect) + 0.5;',
    '  }',
    '  vec2 suv = gl_FragCoord.xy / uResolution;',
    '  vec3 fluid = texture2D(tFluid, suv).rgb;',
    '  uv += (fluid.rg - 0.5) * 0.012 * uFluid;',
    '  vec2 dir = normalize(vUv - 0.5 + vec2(0.0001));',
    '  float disp = (0.0008 + 0.0035 * length(vUv - 0.5)) * uDispersion * (0.4 + uHover * 1.4 + uActive * 0.5);',
    '  float rr = texture2D(tMap, uv + dir * disp).r;',
    '  vec4 gg = texture2D(tMap, uv);',
    '  float bb = texture2D(tMap, uv - dir * disp).b;',
    '  vec3 c = vec3(rr, gg.g, bb);',
    '  float g = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c = mix(vec3(g) * 0.86, c, clamp(uActive * 0.9 + uHover * 0.4, 0.0, 1.0));',
    '  c *= (0.86 + uHover * 0.26 + uActive * 0.14) * uDim * uExposure;',
    '  c = min(c, vec3(0.9));',
    '  vec2 p = abs(vUv - 0.5) * 2.0;',
    '  float r = 0.045;',
    '  float d = length(max(p - (1.0 - r), 0.0)) - r;',
    '  float alpha = 1.0 - smoothstep(0.0, 0.014, d);',
    '  float edge = 1.0 - smoothstep(0.0, 0.02, abs(d));',
    '  c += uColor * edge * (uActive * 0.85 + uHover * 0.6);',
    '  vec2 m = uMouse * 0.5 + 0.5;',
    '  float sheen = pow(clamp(1.0 - length((vUv - m) * vec2(1.7, 1.0)), 0.0, 1.0), 3.0);',
    '  c += uColor * sheen * uHover * 0.22;',
    '  gl_FragColor = vec4(c, alpha);',
    '}'
  ].join('\n');

  var planeGeo = new THREE.PlaneGeometry(PW, PH, 1, 1);
  var boxGeo = new THREE.BoxGeometry(PW, PH, .12);
  var edgeGeo = new THREE.EdgesGeometry(boxGeo);
  var glowGeo = new THREE.PlaneGeometry(PW * 1.38, PH * 1.38, 1, 1);
  var streakGeo = new THREE.PlaneGeometry(PW * 2.8, .12, 1, 1);

  // 发光壳层：卡片背后的柔和光晕，参考 fresnel 边缘光的叠色方式
  var glowVert = [
    'varying vec2 vUv;',
    'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');
  var glowFrag = [
    'precision highp float;',
    'uniform vec3 uColor;',
    'uniform float uPower;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 p = abs(vUv - 0.5) * 2.0;',
    '  float d = length(max(p - 0.62, 0.0)) - 0.06;',
    '  float a = exp(-max(d, 0.0) * 8.5);',
    '  a *= smoothstep(1.0, 0.84, max(p.x, p.y));',
    '  gl_FragColor = vec4(uColor, a * uPower);',
    '}'
  ].join('\n');
  var streakFrag = [
    'precision highp float;',
    'uniform vec3 uColor;',
    'uniform float uPower;',
    'varying vec2 vUv;',
    'void main(){',
    '  float x = abs(vUv.x - 0.5) * 2.0;',
    '  float y = abs(vUv.y - 0.5) * 2.0;',
    '  float a = pow(max(0.0, 1.0 - x), 2.2) * pow(max(0.0, 1.0 - y), 5.0);',
    '  gl_FragColor = vec4(uColor, a * uPower);',
    '}'
  ].join('\n');

  function makeCard(w) {
    var card = new THREE.Group();

    var sideMat = new THREE.MeshBasicMaterial({ color: 0x0a0b08 });
    var box = new THREE.Mesh(boxGeo, sideMat);
    box.position.z = -.06;
    card.add(box);

    var uniforms = {
      tMap: { value: null },
      uHover: { value: 0 },
      uActive: { value: 0 },
      uImgAspect: { value: PW / PH },
      uPlaneAspect: { value: PW / PH },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColor: { value: baseColor.clone() },
      uDim: { value: 1 },
      uExposure: { value: 1 },
      tFluid: { value: null },
      uResolution: { value: new THREE.Vector2(stage.clientWidth, stage.clientHeight) },
      uFluid: { value: .45 },
      uDispersion: { value: stage.clientWidth < 760 ? .7 : 1 }
    };
    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var front = new THREE.Mesh(planeGeo, material);
    front.position.z = .061;
    card.add(front);

    var edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
      color: baseColor.clone(), transparent: true, opacity: .32
    }));
    edges.position.z = -.06;
    card.add(edges);

    var glowMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: baseColor.clone() }, uPower: { value: 0 } },
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -.14;
    card.add(glow);

    var streakMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: baseColor.clone() }, uPower: { value: 0 } },
      vertexShader: glowVert,
      fragmentShader: streakFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var streak = new THREE.Mesh(streakGeo, streakMat);
    streak.position.z = -.22;
    card.add(streak);

    card.userData = {
      work: w, hover: 0, active: 0, base: null,
      fm: material, front: front, edges: edges, box: box,
      glow: glowMat, streak: streakMat
    };

    new THREE.TextureLoader().load(w.img, function (tex) {
      var img = tex.image;
      var max = 1000;
      var finalTex = tex;
      var exposure = 1;
      if (img && (img.width > max || img.height > max)) {
        var s = Math.min(max / img.width, max / img.height);
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        finalTex = new THREE.CanvasTexture(c);
        finalTex.colorSpace = THREE.SRGBColorSpace;
        tex.dispose();
      }
      // 采样平均亮度：白底版面自动降曝光，避免 Bloom 过曝
      var probe = document.createElement('canvas');
      probe.width = probe.height = 18;
      var pg = probe.getContext('2d');
      try {
        pg.drawImage(finalTex.image, 0, 0, 18, 18);
        var d = pg.getImageData(0, 0, 18, 18).data;
        var sum = 0;
        for (var i = 0; i < d.length; i += 4) {
          sum += (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) / 255;
        }
        var avg = sum / (d.length / 4);
        exposure = Math.max(.42, Math.min(1.05, .58 / Math.max(.08, avg)));
      } catch (e) {}
      uniforms.uExposure.value = exposure;
      finalTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      uniforms.tMap.value = finalTex;
      if (finalTex.image && finalTex.image.width) {
        uniforms.uImgAspect.value = finalTex.image.width / finalTex.image.height;
      }
    });
    return card;
  }

  function disposeCard(card) {
    group.remove(card);
    var ud = card.userData || {};
    if (ud.fm) {
      if (ud.fm.uniforms.tMap.value) ud.fm.uniforms.tMap.value.dispose();
      ud.fm.dispose();
    }
    if (ud.box && ud.box.material) ud.box.material.dispose();
    if (ud.edges && ud.edges.material) ud.edges.material.dispose();
    if (ud.glow) ud.glow.dispose();
    if (ud.streak) ud.streak.dispose();
  }

  function build(list) {
    items = list || items;
    cards.forEach(disposeCard);
    cards = [];
    var n = items.length;
    items.forEach(function (w, i) {
      var mesh = makeCard(w);
      var a = i * STEP;
      mesh.position.set(Math.sin(a) * RADIUS, -(i - (n - 1) / 2) * .16, Math.cos(a) * RADIUS - RADIUS);
      mesh.rotation.y = a;
      mesh.userData.base = mesh.position.clone();
      group.add(mesh);
      cards.push(mesh);
    });
    focus = targetFocus = 0;
    lastAct = -1;
    document.documentElement.classList.add('gl-orbit');
    stage.classList.add('is-gl');
  }

  function resize() {
    var w = stage.clientWidth;
    var h = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = camera.aspect < .95 ? 13.2 : 9.2;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h);
    if (bloom) bloom.setSize(w, h);
    if (pMat) pMat.uniforms.uPixelRatio.value = DPR;
    cards.forEach(function (c) {
      var fm = c.userData.fm;
      if (fm) fm.uniforms.uResolution.value.set(w, h);
    });
  }

  function progress() {
    var top = wrap.getBoundingClientRect().top + window.scrollY;
    var total = wrap.offsetHeight - stage.offsetHeight;
    return total > 0 ? Math.max(0, Math.min(1, (window.scrollY - top) / total)) : 0;
  }

  function updatePointer(e) {
    var r = stage.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width - .5;
    pointer.y = (e.clientY - r.top) / r.height - .5;
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function hitTest() {
    if (!cards.length) return null;
    raycaster.setFromCamera(ndc, camera);
    var hits = raycaster.intersectObjects(cards, true);
    return hits.length ? hits[0].object.parent : null;
  }

  function updateHud(act) {
    if (act === lastAct) return;
    lastAct = act;
    if (indexEl) indexEl.textContent = String(act + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    if (nameEl && items[act]) nameEl.textContent = items[act].title + ' — ' + items[act].en;
    if (capB && items[act]) capB.textContent = items[act].title;
    if (capS && items[act]) capS.textContent = items[act].en + ' · ' + items[act].catName;
  }

  function tick() {
    try {
    targetFocus = progress() * Math.max(0, cards.length - 1);
    if (first) { focus = targetFocus; first = false; }
    else focus += (targetFocus - focus) * .11;

    group.rotation.y = 0;
    group.position.y = 0;

    camera.position.x += (pointer.x * .55 - camera.position.x) * .05;
    camera.position.y += (-pointer.y * .38 - camera.position.y) * .05;
    camera.lookAt(0, 0, 0);

    pMat.uniforms.uTime.value += .016;
    flareMat.uniforms.uTime.value += .016;
    flareMat.uniforms.uColor.value.copy(baseColor);
    flareMat.uniforms.uPower.value = .05 + (1 - Math.min(1, Math.abs(focus - Math.round(focus)))) * .07;
    pMat.uniforms.uMouse.value.set(pointer.x, pointer.y);
    pMat.uniforms.uColor.value.copy(baseColor);
    pMat.uniforms.uPixelRatio.value = DPR;
    halos.rotation.y += .0005;
    haloMat.color.copy(baseColor);

    if (fluid) {
      fluid.step(1 / 60);
      fluidMat.uniforms.tFluid.value = fluid.texture();
      fluidMat.uniforms.uColor.value.copy(baseColor);
    }

    cards.forEach(function (c, i) {
      var isActive = Math.abs(i - focus) < .5;
      var isHover = c === hovered;
      c.userData.active += ((isActive ? 1 : 0) - c.userData.active) * .1;
      c.userData.hover += ((isHover ? 1 : 0) - c.userData.hover) * .14;

      var fm = c.userData.fm;
      fm.uniforms.uActive.value = c.userData.active;
      fm.uniforms.uHover.value = c.userData.hover;
      fm.uniforms.uMouse.value.set(pointer.x, pointer.y);
      fm.uniforms.uColor.value.copy(baseColor);
      var dist = Math.abs(i - focus);
      fm.uniforms.uDim.value = Math.max(.32, 1 - dist * .16);
      if (fluid) {
        fm.uniforms.tFluid.value = fluid.texture();
        fm.uniforms.uFluid.value = .45;
      }

      if (c.userData.edges) {
        c.userData.edges.material.color.copy(baseColor);
        c.userData.edges.material.opacity = .18 + c.userData.active * .5 + c.userData.hover * .25;
      }
      if (c.userData.glow) {
        c.userData.glow.uniforms.uColor.value.copy(baseColor);
        c.userData.glow.uniforms.uPower.value = .01 + c.userData.active * .09 + c.userData.hover * .06;
      }
      if (c.userData.streak) {
        c.userData.streak.uniforms.uColor.value.copy(baseColor);
        c.userData.streak.uniforms.uPower.value = c.userData.active * .07 + c.userData.hover * .05;
      }

      var a = dist === 0 ? 0 : (i - focus) * STEP;
      c.position.x = Math.sin(a) * RADIUS;
      c.position.z = Math.cos(a) * RADIUS - RADIUS + c.userData.hover * .2;
      c.position.y = -(i - focus) * .16 + c.userData.hover * .09;
      c.rotation.y = a;
      var s = 1 + c.userData.active * .05 + c.userData.hover * .035;
      c.scale.setScalar(s);
    });

    updateHud(Math.round(focus));
    if (composer) composer.render();
    else renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
    } catch (err) {
      window.__f3dErr = (err && (err.stack || err.message)) || 'unknown';
    }
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }
  function inView() {
    var r = stage.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  canvas.addEventListener('pointermove', function (e) {
    var px = pointer.x, py = pointer.y;
    updatePointer(e);
    var now = performance.now();
    if (fluid && now - lastSplat > 28) {
      var dx = pointer.x - px, dy = pointer.y - py;
      if (Math.abs(dx) + Math.abs(dy) > .002) {
        lastSplat = now;
        scratchColor.copy(baseColor).multiplyScalar(.55);
        fluid.splat(pointer.x + .5, pointer.y + .5, dx * 3000, dy * 3000, scratchColor, .0034);
      }
    }
  }, { passive: true });
  canvas.addEventListener('pointerleave', function () { ndc.set(-9, -9); hovered = null; });
  canvas.addEventListener('click', function (e) {
    if (e.target !== canvas) return;
    updatePointer(e);
    var hit = hitTest();
    if (!hit) return;
    var idx = cards.indexOf(hit);
    var act = Math.round(focus);
    if (idx >= 0 && Math.abs(idx - act) > .45 && cards.length > 1) {
      var top = wrap.getBoundingClientRect().top + window.scrollY;
      var total = wrap.offsetHeight - stage.offsetHeight;
      window.scrollTo({
        top: top + (idx / (cards.length - 1)) * total,
        behavior: reduce ? 'auto' : 'smooth'
      });
      return;
    }
    var no = hit.userData.work.no;
    var btn = track.querySelector('[data-open="' + no + '"]');
    if (btn) btn.click();
  });

  window.addEventListener('resize', resize);
  document.addEventListener('orbit:rebuild', function (e) { build(e.detail); });

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
    visible = en[0].isIntersecting;
    if (visible) start(); else stop();
  }, { threshold: .01 }) : null;

  // 主题色变化时同步卡片描边
  var mo = new MutationObserver(function () {
    baseColor = readSignal();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-signal'] });

  build(items);
  resize();
  if (io) io.observe(stage);
  window.addEventListener('scroll', function () {
    if (inView() && !raf) start();
  }, { passive: true });
  if (inView()) start();
})();













