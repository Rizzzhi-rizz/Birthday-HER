/* ==========================================================================
   REACT BITS: GALAXY COMPONENT (Vanilla WebGL Port)
   ========================================================================== */

(function () {
  const vertexShaderSource = `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;

    uniform float uTime;
    uniform vec3 uResolution;
    uniform vec2 uFocal;
    uniform vec2 uRotation;
    uniform float uStarSpeed;
    uniform float uDensity;
    uniform float uHueShift;
    uniform float uSpeed;
    uniform vec2 uMouse;
    uniform float uGlowIntensity;
    uniform float uSaturation;
    uniform bool uMouseRepulsion;
    uniform float uTwinkleIntensity;
    uniform float uRotationSpeed;
    uniform float uRepulsionStrength;
    uniform float uMouseActiveFactor;
    uniform float uAutoCenterRepulsion;
    uniform bool uTransparent;
    uniform float uLightMode;

    varying vec2 vUv;

    #define NUM_LAYER 4.0
    #define STAR_COLOR_CUTOFF 0.2
    #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
    #define PERIOD 3.0

    float Hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float tri(float x) {
      return abs(fract(x) * 2.0 - 1.0);
    }

    float tris(float x) {
      float t = fract(x);
      return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
    }

    float trisn(float x) {
      float t = fract(x);
      return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    float Star(vec2 uv, float flare) {
      float d = length(uv);
      float m = (0.05 * uGlowIntensity) / d;
      float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * flare * uGlowIntensity;
      uv *= MAT45;
      rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
      m += rays * 0.3 * flare * uGlowIntensity;
      m *= smoothstep(1.0, 0.2, d);
      return m;
    }

    vec3 StarLayer(vec2 uv) {
      vec3 col = vec3(0.0);

      vec2 gv = fract(uv) - 0.5; 
      vec2 id = floor(uv);

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 si = id + vec2(float(x), float(y));
          float seed = Hash21(si);
          float size = fract(seed * 345.32);
          float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
          float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

          float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
          float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
          float grn = min(red, blu) * seed;
          vec3 base = vec3(red, grn, blu);
          
          float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
          hue = fract(hue + uHueShift / 360.0);
          float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
          float val = max(max(base.r, base.g), base.b);
          base = hsv2rgb(vec3(hue, sat, val));

          vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;

          float star = Star(gv - offset - pad, flareSize);
          vec3 color = base;

          float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
          twinkle = mix(1.0, twinkle, uTwinkleIntensity);
          star *= twinkle;
          
          col += star * size * color;
        }
      }

      return col;
    }

    void main() {
      vec2 focalPx = uFocal * uResolution.xy;
      vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;

      vec2 mouseNorm = uMouse - vec2(0.5);
      
      if (uAutoCenterRepulsion > 0.0) {
        vec2 centerUV = vec2(0.0, 0.0);
        float centerDist = length(uv - centerUV);
        vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
        uv += repulsion * 0.05;
      } else if (uMouseRepulsion) {
        vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
        float mouseDist = length(uv - mousePosUV);
        vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
        uv += repulsion * 0.05 * uMouseActiveFactor;
      } else {
        vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
        uv += mouseOffset;
      }

      float autoRotAngle = uTime * uRotationSpeed;
      mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
      uv = autoRot * uv;

      uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

      vec3 col = vec3(0.0);

      for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
        float depth = fract(i + uStarSpeed * uSpeed);
        float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
        float fade = depth * smoothstep(1.0, 0.9, depth);
        col += StarLayer(uv * scale + i * 453.32) * fade;
      }

      if (uLightMode > 0.5) {
        float energy = max(max(col.r, col.g), col.b);
        float coverage = clamp(smoothstep(0.0, 0.42, energy) * 0.92, 0.0, 0.92);
        vec3 ink = clamp(col * 0.48, 0.0, 0.82);
        gl_FragColor = vec4(mix(vec3(1.0), ink, coverage), 1.0);
      } else if (uTransparent) {
        float alpha = length(col);
        alpha = smoothstep(0.0, 0.3, alpha);
        alpha = min(alpha, 1.0);
        gl_FragColor = vec4(col, alpha);
      } else {
        gl_FragColor = vec4(col, 1.0);
      }
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Galaxy Shader Compile Error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Galaxy Program Link Error:', gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  window.createGalaxy = function (canvas, options = {}) {
    const opts = Object.assign({
      focal: [0.5, 0.5],
      rotation: [1.0, 0.0],
      starSpeed: 0.5,
      density: 1.5,
      hueShift: 240,
      disableAnimation: false,
      speed: 1.0,
      mouseInteraction: true,
      glowIntensity: 0.6,
      saturation: 0.85,
      mouseRepulsion: true,
      repulsionStrength: 2.0,
      twinkleIntensity: 0.5,
      rotationSpeed: 0.1,
      autoCenterRepulsion: 0,
      transparent: true,
      lightMode: false
    }, options);

    const gl = canvas.getContext('webgl', {
      alpha: opts.transparent,
      premultipliedAlpha: false,
      antialias: true
    });

    if (!gl) {
      console.warn('WebGL not supported for Galaxy component');
      return { dispose: function () {} };
    }

    if (opts.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    // Quad geometry covering clip space
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);

    const uvs = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
    ]);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    const uvLoc = gl.getAttribLocation(program, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uLocs = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uResolution: gl.getUniformLocation(program, 'uResolution'),
      uFocal: gl.getUniformLocation(program, 'uFocal'),
      uRotation: gl.getUniformLocation(program, 'uRotation'),
      uStarSpeed: gl.getUniformLocation(program, 'uStarSpeed'),
      uDensity: gl.getUniformLocation(program, 'uDensity'),
      uHueShift: gl.getUniformLocation(program, 'uHueShift'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uGlowIntensity: gl.getUniformLocation(program, 'uGlowIntensity'),
      uSaturation: gl.getUniformLocation(program, 'uSaturation'),
      uMouseRepulsion: gl.getUniformLocation(program, 'uMouseRepulsion'),
      uTwinkleIntensity: gl.getUniformLocation(program, 'uTwinkleIntensity'),
      uRotationSpeed: gl.getUniformLocation(program, 'uRotationSpeed'),
      uRepulsionStrength: gl.getUniformLocation(program, 'uRepulsionStrength'),
      uMouseActiveFactor: gl.getUniformLocation(program, 'uMouseActiveFactor'),
      uAutoCenterRepulsion: gl.getUniformLocation(program, 'uAutoCenterRepulsion'),
      uTransparent: gl.getUniformLocation(program, 'uTransparent'),
      uLightMode: gl.getUniformLocation(program, 'uLightMode')
    };

    let targetMousePos = { x: 0.5, y: 0.5 };
    let smoothMousePos = { x: 0.5, y: 0.5 };
    let targetMouseActive = 0.0;
    let smoothMouseActive = 0.0;

    function resize() {
      const parent = canvas.parentElement || document.body;
      const width = parent.clientWidth || window.innerWidth;
      const height = parent.clientHeight || window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform3f(uLocs.uResolution, width, height, width / height);
    }

    window.addEventListener('resize', resize);
    resize();

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMousePos = { x, y };
      targetMouseActive = 1.0;
    }

    function handleMouseLeave() {
      targetMouseActive = 0.0;
    }

    if (opts.mouseInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }

    let animId;
    let startTime = performance.now();

    function render(now) {
      animId = requestAnimationFrame(render);
      const t = now - startTime;

      if (!opts.disableAnimation) {
        gl.uniform1f(uLocs.uTime, t * 0.001);
        gl.uniform1f(uLocs.uStarSpeed, (t * 0.001 * opts.starSpeed) / 10.0);
      }

      const lerpFactor = 0.05;
      smoothMousePos.x += (targetMousePos.x - smoothMousePos.x) * lerpFactor;
      smoothMousePos.y += (targetMousePos.y - smoothMousePos.y) * lerpFactor;
      smoothMouseActive += (targetMouseActive - smoothMouseActive) * lerpFactor;

      gl.uniform2f(uLocs.uFocal, opts.focal[0], opts.focal[1]);
      gl.uniform2f(uLocs.uRotation, opts.rotation[0], opts.rotation[1]);
      gl.uniform1f(uLocs.uDensity, opts.density);
      gl.uniform1f(uLocs.uHueShift, opts.hueShift);
      gl.uniform1f(uLocs.uSpeed, opts.speed);
      gl.uniform2f(uLocs.uMouse, smoothMousePos.x, smoothMousePos.y);
      gl.uniform1f(uLocs.uGlowIntensity, opts.glowIntensity);
      gl.uniform1f(uLocs.uSaturation, opts.saturation);
      gl.uniform1i(uLocs.uMouseRepulsion, opts.mouseRepulsion ? 1 : 0);
      gl.uniform1f(uLocs.uTwinkleIntensity, opts.twinkleIntensity);
      gl.uniform1f(uLocs.uRotationSpeed, opts.rotationSpeed);
      gl.uniform1f(uLocs.uRepulsionStrength, opts.repulsionStrength);
      gl.uniform1f(uLocs.uMouseActiveFactor, smoothMouseActive);
      gl.uniform1f(uLocs.uAutoCenterRepulsion, opts.autoCenterRepulsion);
      gl.uniform1i(uLocs.uTransparent, opts.transparent ? 1 : 0);
      gl.uniform1i(uLocs.uLightMode, opts.lightMode ? 1 : 0);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    render(performance.now());

    return {
      dispose: function () {
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', resize);
        if (opts.mouseInteraction) {
          window.removeEventListener('mousemove', handleMouseMove);
          canvas.removeEventListener('mouseleave', handleMouseLeave);
        }
        const loseExt = gl.getExtension('WEBGL_lose_context');
        if (loseExt) loseExt.loseContext();
      }
    };
  };
})();
