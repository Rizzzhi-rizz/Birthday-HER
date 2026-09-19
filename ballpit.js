/**
 * Ballpit — Vanilla JS port of the React Bits Ballpit component
 * Adapted from: https://reactbits.dev/backgrounds/ballpit
 * Original by Kevin Levron: https://x.com/soju22/status/1858925191671271801
 *
 * Requires THREE (global) loaded before this script.
 * Usage:
 *   const bp = createBallpit(canvasElement, { count: 150, gravity: 0.7, ... });
 *   bp.dispose(); // cleanup
 */

(function () {
  if (typeof window === 'undefined') return;

  /* ─── Tiny pointer/touch tracker (one global per canvas) ─── */
  const _trackers = new Map();
  const _cursor   = { x: 0, y: 0 };
  let _listening  = false;

  function _listenGlobal() {
    if (_listening) return;
    _listening = true;
    document.addEventListener('pointermove',   _onPointerMove);
    document.addEventListener('pointerleave',  _onPointerLeave);
    document.addEventListener('touchstart',    _onTouchStart, { passive: false });
    document.addEventListener('touchmove',     _onTouchMove,  { passive: false });
    document.addEventListener('touchend',      _onTouchEnd);
    document.addEventListener('touchcancel',   _onTouchEnd);
  }

  function _inRect(rect) {
    return _cursor.x >= rect.left && _cursor.x <= rect.left + rect.width &&
           _cursor.y >= rect.top  && _cursor.y <= rect.top  + rect.height;
  }

  function _updateTracker(tracker, rect) {
    tracker.pos.x  =  _cursor.x - rect.left;
    tracker.pos.y  =  _cursor.y - rect.top;
    tracker.npos.x = (tracker.pos.x / rect.width)  * 2 - 1;
    tracker.npos.y = -(tracker.pos.y / rect.height) * 2 + 1;
  }

  function _onPointerMove(e) {
    _cursor.x = e.clientX; _cursor.y = e.clientY;
    _trackers.forEach((tracker, el) => {
      const rect = el.getBoundingClientRect();
      _updateTracker(tracker, rect);
      if (_inRect(rect)) {
        if (!tracker.hover) { tracker.hover = true; tracker.onEnter && tracker.onEnter(tracker); }
        tracker.onMove && tracker.onMove(tracker);
      } else if (tracker.hover) {
        tracker.hover = false; tracker.onLeave && tracker.onLeave(tracker);
      }
    });
  }

  function _onPointerLeave() {
    _trackers.forEach(tracker => {
      if (tracker.hover) { tracker.hover = false; tracker.onLeave && tracker.onLeave(tracker); }
    });
  }

  function _onTouchStart(e) {
    if (!e.touches.length) return;
    e.preventDefault();
    _cursor.x = e.touches[0].clientX; _cursor.y = e.touches[0].clientY;
    _trackers.forEach((tracker, el) => {
      const rect = el.getBoundingClientRect();
      if (_inRect(rect)) {
        tracker.touching = true; _updateTracker(tracker, rect);
        if (!tracker.hover) { tracker.hover = true; tracker.onEnter && tracker.onEnter(tracker); }
        tracker.onMove && tracker.onMove(tracker);
      }
    });
  }

  function _onTouchMove(e) {
    if (!e.touches.length) return;
    e.preventDefault();
    _cursor.x = e.touches[0].clientX; _cursor.y = e.touches[0].clientY;
    _trackers.forEach((tracker, el) => {
      const rect = el.getBoundingClientRect();
      _updateTracker(tracker, rect);
      if (_inRect(rect)) {
        if (!tracker.hover) { tracker.hover = true; tracker.touching = true; tracker.onEnter && tracker.onEnter(tracker); }
        tracker.onMove && tracker.onMove(tracker);
      } else if (tracker.hover && tracker.touching) {
        tracker.onMove && tracker.onMove(tracker);
      }
    });
  }

  function _onTouchEnd() {
    _trackers.forEach(tracker => {
      if (tracker.touching) {
        tracker.touching = false;
        if (tracker.hover) { tracker.hover = false; tracker.onLeave && tracker.onLeave(tracker); }
      }
    });
  }

  function createPointerTracker(canvas, opts) {
    const tracker = {
      pos: { x: 0, y: 0 },
      npos: { x: 0, y: 0 },
      hover: false,
      touching: false,
      onEnter: opts.onEnter || null,
      onMove:  opts.onMove  || null,
      onLeave: opts.onLeave || null,
      dispose() { _trackers.delete(canvas); }
    };
    _trackers.set(canvas, tracker);
    _listenGlobal();
    return tracker;
  }

  /* ─── Physics Simulation ─── */
  const _tmp = {
    a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(),
    d: new THREE.Vector3(), e: new THREE.Vector3(), f: new THREE.Vector3(),
    g: new THREE.Vector3(), h: new THREE.Vector3(), i: new THREE.Vector3(),
    j: new THREE.Vector3()
  };

  class BallPhysics {
    constructor(cfg) {
      this.cfg  = cfg;
      this.pos  = new Float32Array(cfg.count * 3);
      this.vel  = new Float32Array(cfg.count * 3);
      this.size = new Float32Array(cfg.count);
      this.center = new THREE.Vector3();
      this._scatter();
      this._setSizes();
    }

    _scatter() {
      const { cfg, pos } = this;
      this.center.toArray(pos, 0);
      for (let i = 1; i < cfg.count; i++) {
        const b = i * 3;
        pos[b]   = THREE.MathUtils.randFloatSpread(cfg.maxX * 2);
        pos[b+1] = THREE.MathUtils.randFloatSpread(cfg.maxY * 2);
        pos[b+2] = THREE.MathUtils.randFloatSpread(cfg.maxZ * 2);
      }
    }

    _setSizes() {
      const { cfg, size } = this;
      size[0] = cfg.size0;
      for (let i = 1; i < cfg.count; i++) {
        size[i] = THREE.MathUtils.randFloat(cfg.minSize, cfg.maxSize);
      }
    }

    update(frame) {
      const { cfg, pos, vel, size, center } = this;
      const { a, b, c, d, e, f, g, h } = _tmp;
      let start = 0;

      if (cfg.controlSphere0) {
        start = 1;
        a.fromArray(pos, 0).lerp(center, 0.1).toArray(pos, 0);
        b.set(0, 0, 0).toArray(vel, 0);
      }

      // Integrate velocity + gravity
      for (let i = start; i < cfg.count; i++) {
        const bi = i * 3;
        c.fromArray(pos, bi);
        d.fromArray(vel, bi);
        d.y -= frame.delta * cfg.gravity * size[i];
        d.multiplyScalar(cfg.friction);
        d.clampLength(0, cfg.maxVelocity);
        c.add(d);
        c.toArray(pos, bi);
        d.toArray(vel, bi);
      }

      // Collision resolve
      for (let i = start; i < cfg.count; i++) {
        const bi = i * 3;
        c.fromArray(pos, bi);
        d.fromArray(vel, bi);
        const ri = size[i];

        for (let j = i + 1; j < cfg.count; j++) {
          const bj = j * 3;
          e.fromArray(pos, bj);
          f.fromArray(vel, bj);
          const rj = size[j];
          g.copy(e).sub(c);
          const dist = g.length();
          const sumR = ri + rj;
          if (dist < sumR) {
            const overlap = sumR - dist;
            h.copy(g).normalize().multiplyScalar(overlap * 0.5);
            const pushI = h.clone().multiplyScalar(Math.max(d.length(), 1));
            const pushJ = h.clone().multiplyScalar(Math.max(f.length(), 1));
            c.sub(h);  d.sub(pushI);
            e.add(h);  f.add(pushJ);
            c.toArray(pos, bi); d.toArray(vel, bi);
            e.toArray(pos, bj); f.toArray(vel, bj);
          }
        }

        // Cursor sphere push
        if (cfg.controlSphere0) {
          a.fromArray(pos, 0);
          g.copy(a).sub(c);
          const dist0 = g.length();
          const sumR0 = ri + size[0];
          if (dist0 < sumR0) {
            const diff = sumR0 - dist0;
            h.copy(g.normalize()).multiplyScalar(diff);
            const push = h.clone().multiplyScalar(Math.max(d.length(), 2));
            c.sub(h); d.sub(push);
          }
        }

        // Wall bounce
        if (Math.abs(c.x) + ri > cfg.maxX) {
          c.x = Math.sign(c.x) * (cfg.maxX - ri);
          d.x *= -cfg.wallBounce;
        }
        if (cfg.gravity === 0) {
          if (Math.abs(c.y) + ri > cfg.maxY) {
            c.y = Math.sign(c.y) * (cfg.maxY - ri);
            d.y *= -cfg.wallBounce;
          }
        } else if (c.y - ri < -cfg.maxY) {
          c.y = -cfg.maxY + ri;
          d.y *= -cfg.wallBounce;
        }
        const maxBound = Math.max(cfg.maxZ, cfg.maxSize);
        if (Math.abs(c.z) + ri > maxBound) {
          c.z = Math.sign(c.z) * (cfg.maxZ - ri);
          d.z *= -cfg.wallBounce;
        }

        c.toArray(pos, bi);
        d.toArray(vel, bi);
      }
    }
  }

  /* ─── Subsurface Scattering Material ─── */
  class BallMaterial extends THREE.MeshPhysicalMaterial {
    constructor(opts) {
      super(opts);
      this.defines = this.defines || {};
      this.defines.USE_UV = '';
      const self = this;
      this.onBeforeCompile = (shader) => {
        shader.fragmentShader =
          `uniform float thicknessPower;\nuniform float thicknessScale;\nuniform float thicknessDistortion;\nuniform float thicknessAmbient;\nuniform float thicknessAttenuation;\n` +
          shader.fragmentShader;
        shader.uniforms.thicknessPower       = { value: 2 };
        shader.uniforms.thicknessScale       = { value: 10 };
        shader.uniforms.thicknessDistortion  = { value: 0.1 };
        shader.uniforms.thicknessAmbient     = { value: 0 };
        shader.uniforms.thicknessAttenuation = { value: 0.1 };
        shader.fragmentShader = shader.fragmentShader.replace(
          'void main() {',
          `void RE_Direct_Scattering(const in IncidentLight directLight,const in vec2 uv,const in vec3 geometryPosition,const in vec3 geometryNormal,const in vec3 geometryViewDir,const in vec3 geometryClearcoatNormal,inout ReflectedLight reflectedLight){vec3 scatteringHalf=normalize(directLight.direction+(geometryNormal*thicknessDistortion));float scatteringDot=pow(saturate(dot(geometryViewDir,-scatteringHalf)),thicknessPower)*thicknessScale;vec3 scatteringIllu=(scatteringDot+thicknessAmbient)*diffuse;reflectedLight.directDiffuse+=scatteringIllu*thicknessAttenuation*directLight.color;}\nvoid main(){`
        );
        const replaced = THREE.ShaderChunk.lights_fragment_begin.replaceAll(
          'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
          'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\nRE_Direct_Scattering(directLight,vUv,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,reflectedLight);'
        );
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', replaced);
      };
    }
  }

  /* ─── Gradient color mapper ─── */
  function makeGradient(colors) {
    const c3 = colors.map(c => new THREE.Color(c));
    return function getAt(ratio, out = new THREE.Color()) {
      const scaled = Math.max(0, Math.min(1, ratio)) * (c3.length - 1);
      const idx    = Math.floor(scaled);
      const start  = c3[idx];
      if (idx >= c3.length - 1) return out.copy(start);
      const alpha  = scaled - idx;
      const end    = c3[idx + 1];
      out.r = start.r + alpha * (end.r - start.r);
      out.g = start.g + alpha * (end.g - start.g);
      out.b = start.b + alpha * (end.b - start.b);
      return out;
    };
  }

  /* ─── InstancedMesh spheres ─── */
  const _dummy = new THREE.Object3D();

  class BallpitMesh extends THREE.InstancedMesh {
    constructor(renderer, cfg) {
      const geo = new THREE.SphereGeometry(1, 32, 32);
      const mat = new THREE.MeshPhysicalMaterial({
        metalness:          cfg.materialParams ? cfg.materialParams.metalness          : 0.05,
        roughness:          cfg.materialParams ? cfg.materialParams.roughness          : 0.15,
        clearcoat:          cfg.materialParams ? cfg.materialParams.clearcoat          : 1.0,
        clearcoatRoughness: cfg.materialParams ? cfg.materialParams.clearcoatRoughness : 0.1,
        transparent: false,
      });

      super(geo, mat, cfg.count);
      this.cfg      = cfg;
      this.physics  = new BallPhysics(cfg);

      // Lights
      this.ambientLight = new THREE.AmbientLight(cfg.ambientColor, cfg.ambientIntensity);
      this.add(this.ambientLight);
      this.pointLight = new THREE.PointLight(0xffffff, cfg.lightIntensity || 120, 200);
      this.pointLight.position.set(5, 10, 10);
      this.add(this.pointLight);

      // Secondary fill light for depth
      this.fillLight = new THREE.DirectionalLight(0xffd6f0, 1.2);
      this.fillLight.position.set(-8, 5, 5);
      this.add(this.fillLight);

      this._applyColors();
    }

    _applyColors() {
      const { cfg } = this;
      if (!Array.isArray(cfg.colors) || cfg.colors.length < 2) return;
      const grad = makeGradient(cfg.colors);
      for (let i = 0; i < cfg.count; i++) {
        const col = grad(i / cfg.count);
        this.setColorAt(i, col);
        if (i === 0) this.pointLight.color.copy(col);
      }
      if (this.instanceColor) this.instanceColor.needsUpdate = true;
    }

    tick(frame) {
      this.physics.update(frame);
      for (let i = 0; i < this.count; i++) {
        _dummy.position.fromArray(this.physics.pos, i * 3);
        _dummy.scale.setScalar(i === 0 && !this.cfg.followCursor ? 0 : this.physics.size[i]);
        _dummy.updateMatrix();
        this.setMatrixAt(i, _dummy.matrix);
        if (i === 0) this.pointLight.position.copy(_dummy.position);
      }
      this.instanceMatrix.needsUpdate = true;
    }
  }

  /* ─── Main createBallpit factory ─── */
  const DEFAULTS = {
    count:         150,
    colors:        [0xff69b4, 0xc084fc, 0x818cf8, 0xfbbf24, 0xf472b6],
    ambientColor:  0xffffff,
    ambientIntensity: 1.2,
    lightIntensity: 180,
    minSize:       0.4,
    maxSize:       0.9,
    size0:         0.8,
    gravity:       0.6,
    friction:      0.9975,
    wallBounce:    0.95,
    maxVelocity:   0.15,
    maxX:          5,
    maxY:          5,
    maxZ:          2,
    followCursor:  true,
    controlSphere0: false
  };

  window.createBallpit = function (canvas, userCfg = {}) {
    if (!window.THREE) { console.error('Ballpit: THREE.js is required'); return null; }

    const cfg = { ...DEFAULTS, ...userCfg };

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping      = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0); // transparent background

    /* Scene + Camera */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    /* Ballpit mesh */
    let mesh = new BallpitMesh(renderer, cfg);
    scene.add(mesh);

    /* Size / resize */
    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.offsetWidth  || window.innerWidth;
      const h = parent.offsetHeight || window.innerHeight;
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Keep world-space boundaries in sync
      const fov  = (camera.fov * Math.PI) / 180;
      const wH   = 2 * Math.tan(fov / 2) * camera.position.z;
      const wW   = wH * camera.aspect;
      mesh.cfg.maxX = wW / 2;
      mesh.cfg.maxY = wH / 2;
    }
    resize();
    const resizeObs = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObs.observe(canvas.parentElement);

    /* Cursor / touch interaction */
    const raycaster = new THREE.Raycaster();
    const plane     = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hitPoint  = new THREE.Vector3();

    canvas.style.touchAction       = 'none';
    canvas.style.userSelect        = 'none';
    canvas.style.webkitUserSelect  = 'none';

    const pointer = createPointerTracker(canvas, {
      onMove(t) {
        raycaster.setFromCamera(t.npos, camera);
        camera.getWorldDirection(plane.normal);
        raycaster.ray.intersectPlane(plane, hitPoint);
        mesh.physics.center.copy(hitPoint);
        mesh.cfg.controlSphere0 = true;
      },
      onLeave() {
        mesh.cfg.controlSphere0 = false;
      }
    });

    /* Render loop */
    let raf = null;
    let prevTime = performance.now();
    let paused = false;

    function animate() {
      raf = requestAnimationFrame(animate);
      const now   = performance.now();
      const delta = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;
      if (!paused) mesh.tick({ delta, elapsed: now / 1000 });
      renderer.render(scene, camera);
    }
    animate();

    return {
      dispose() {
        cancelAnimationFrame(raf);
        pointer.dispose();
        resizeObs.disconnect();
        scene.traverse(obj => {
          if (obj.isMesh) {
            obj.geometry && obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
              else obj.material.dispose();
            }
          }
        });
        renderer.dispose();
        renderer.forceContextLoss();
      },
      pause()  { paused = true; },
      resume() { paused = false; },
      resize
    };
  };

})();
