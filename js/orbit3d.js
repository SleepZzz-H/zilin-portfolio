import * as THREE from '../assets/vendor/three.module.js';

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

  // 背景粒子：参考站的空间尘埃
  var pCount = 520;
  var pPos = new Float32Array(pCount * 3);
  for (var pi = 0; pi < pCount; pi++) {
    pPos[pi * 3] = (Math.random() - .5) * 18;
    pPos[pi * 3 + 1] = (Math.random() - .5) * 11;
    pPos[pi * 3 + 2] = -8 + Math.random() * 10;
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  var pMat = new THREE.PointsMaterial({
    color: baseColor.clone(), size: .045, transparent: true,
    opacity: .62, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  var dust = new THREE.Points(pGeo, pMat);
  scene.add(dust);

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
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 uv = vUv;',
    '  if (uImgAspect > uPlaneAspect) {',
    '    uv.x = (uv.x - 0.5) * (uPlaneAspect / uImgAspect) + 0.5;',
    '  } else {',
    '    uv.y = (uv.y - 0.5) * (uImgAspect / uPlaneAspect) + 0.5;',
    '  }',
    '  vec4 tex = texture2D(tMap, uv);',
    '  vec3 c = tex.rgb;',
    '  float g = dot(c, vec3(0.299, 0.587, 0.114));',
    '  c = mix(vec3(g) * 0.86, c, clamp(uActive * 0.9 + uHover * 0.4, 0.0, 1.0));',
    '  c *= (0.9 + uHover * 0.3 + uActive * 0.16) * uDim;',
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

  function makeCard(w) {
    var uniforms = {
      tMap: { value: null },
      uHover: { value: 0 },
      uActive: { value: 0 },
      uImgAspect: { value: PW / PH },
      uPlaneAspect: { value: PW / PH },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColor: { value: baseColor.clone() },
      uDim: { value: 1 }
    };
    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(planeGeo, material);
    mesh.userData = { work: w, hover: 0, active: 0, base: null };
    new THREE.TextureLoader().load(w.img, function (tex) {
      var img = tex.image;
      var max = 1000;
      var finalTex = tex;
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
      finalTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      uniforms.tMap.value = finalTex;
      if (finalTex.image && finalTex.image.width) {
        uniforms.uImgAspect.value = finalTex.image.width / finalTex.image.height;
      }
    });
    return mesh;
  }

  function disposeCard(mesh) {
    group.remove(mesh);
    if (mesh.material) {
      if (mesh.material.uniforms.tMap.value) mesh.material.uniforms.tMap.value.dispose();
      mesh.material.dispose();
    }
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
    camera.updateProjectionMatrix();
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
    var hits = raycaster.intersectObjects(cards, false);
    return hits.length ? hits[0].object : null;
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

    dust.rotation.y += .0007;
    dust.rotation.x = pointer.y * .12;
    dust.position.x += (pointer.x * .9 - dust.position.x) * .02;
    pMat.color.copy(baseColor);

    hovered = hitTest();

    cards.forEach(function (c, i) {
      var isActive = Math.abs(i - focus) < .5;
      var isHover = c === hovered;
      c.userData.active += ((isActive ? 1 : 0) - c.userData.active) * .1;
      c.userData.hover += ((isHover ? 1 : 0) - c.userData.hover) * .14;
      c.material.uniforms.uActive.value = c.userData.active;
      c.material.uniforms.uHover.value = c.userData.hover;
      c.material.uniforms.uMouse.value.set(pointer.x, pointer.y);
      c.material.uniforms.uColor.value.copy(baseColor);
      var dist = Math.abs(i - focus);
      c.material.uniforms.uDim.value = Math.max(.32, 1 - dist * .16);
      var a = dist === 0 ? 0 : (i - focus) * STEP;
      c.position.x = Math.sin(a) * RADIUS;
      c.position.z = Math.cos(a) * RADIUS - RADIUS + c.userData.hover * .2;
      c.position.y = -(i - focus) * .16 + c.userData.hover * .09;
      c.rotation.y = a;
      var s = 1 + c.userData.active * .05 + c.userData.hover * .035;
      c.scale.setScalar(s);
    });

    updateHud(Math.round(focus));
    renderer.render(scene, camera);
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

  canvas.addEventListener('pointermove', updatePointer, { passive: true });
  canvas.addEventListener('pointerleave', function () { ndc.set(-9, -9); hovered = null; });
  canvas.addEventListener('click', function (e) {
    if (e.target !== canvas) return;
    updatePointer(e);
    var hit = hitTest();
    if (!hit) return;
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




