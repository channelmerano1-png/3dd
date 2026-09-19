import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const clamp = THREE.MathUtils.clamp;

function canvasTexture(draw, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function makeKnit() {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = "#747474";
    ctx.fillRect(0, 0, size, size);

for (let row = -1; row < 34; row++) {
      for (let col = -1; col < 34; col++) {
        const x = col * 8 + (row % 2) * 4;
        const y = row * 8;

ctx.strokeStyle = "#b8b8b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 5, y + 4, x + 3, y + 8);
        ctx.stroke();

ctx.strokeStyle = "#383838";
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.quadraticCurveTo(x - 1, y + 4, x + 2, y + 8);
        ctx.stroke();
      }
    }
  });
}

const profile = [
  [-1.78, 0.14, 0.67],
  [-1.52, 0.48, 0.98],
  [-0.98, 0.55, 1.08],
  [-0.48, 0.57, 0.86],
  [0.05, 0.65, 0.60],
  [0.65, 0.69, 0.40],
  [1.30, 0.54, 0.30],
  [1.72, 0.19, 0.17],
  [1.80, 0.025, 0.055],
];

function sectionAt(x) {
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    if (x <= b[0]) {
      const t = THREE.MathUtils.smoothstep(x, a[0], b[0]);
      return {
        width: THREE.MathUtils.lerp(a[1], b[1], t),
        height: THREE.MathUtils.lerp(a[2], b[2], t),
      };
    }
  }
  return { width: 0.025, height: 0.055 };
}

function upperPoint(x, angle, extra = 0) {
  const { width, height } = sectionAt(x);
  return new THREE.Vector3(
    x,
    0.035 + Math.sin(angle) * height + extra,
    Math.cos(angle) * width,
  );
}

function buildUpperGeometry() {
  const nx = 100;
  const nr = 36;
  const positions = [];
  const uvs = [];
  const indices = [];

for (let i = 0; i <= nx; i++) {
    const x = THREE.MathUtils.lerp(-1.78, 1.80, i / nx);
    for (let j = 0; j <= nr; j++) {
      const p = upperPoint(x, (j / nr) * Math.PI);
      positions.push(p.x, p.y, p.z);
      uvs.push(i / nx, j / nr);
    }
  }

for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nr; j++) {
      const x = THREE.MathUtils.lerp(-1.78, 1.80, (i + 0.5) / nx);
      const angle = ((j + 0.5) / nr) * Math.PI;
      const collar =
        ((x + 0.97) / 0.46) ** 2 +
        ((angle - Math.PI / 2) / 0.70) ** 2;

if (collar < 1) continue;

const a = i * (nr + 1) + j;
      const b = a + nr + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function footprint() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.85, 0);
  shape.bezierCurveTo(-1.90, 0.40, -1.58, 0.58, -1.12, 0.59);
  shape.bezierCurveTo(-0.48, 0.56, 0.18, 0.79, 0.87, 0.70);
  shape.bezierCurveTo(1.54, 0.66, 1.94, 0.36, 1.94, 0);
  shape.bezierCurveTo(1.94, -0.36, 1.54, -0.66, 0.87, -0.70);
  shape.bezierCurveTo(0.18, -0.79, -0.48, -0.56, -1.12, -0.59);
  shape.bezierCurveTo(-1.58, -0.58, -1.90, -0.40, -1.85, 0);
  return shape;
}

function tube(points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(28, points.length * 5), radius, 7, closed),
    material,
  );
  mesh.castShadow = true;
  return mesh;
}

function buildShoe(renderer) {
  const root = new THREE.Group();
  const upper = new THREE.Group();
  const laces = new THREE.Group();
  const plate = new THREE.Group();
  const sole = new THREE.Group();
  root.add(upper, laces, plate, sole);

const knit = makeKnit();
  knit.repeat.set(5, 2);
  knit.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const fabric = new THREE.MeshStandardMaterial({
    color: "#d8d6c8",
    roughness: 0.93,
    bumpMap: knit,
    bumpScale: 0.026,
    side: THREE.DoubleSide,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: "#c8c9b9",
    roughness: 0.73,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#d5e7a8",
    roughness: 0.40,
    metalness: 0.22,
  });
  const laceMaterial = new THREE.MeshStandardMaterial({
    color: "#eeede0",
    roughness: 0.92,
    bumpMap: knit,
    bumpScale: 0.015,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#151a14",
    roughness: 0.9,
  });

const carbonTexture = canvasTexture((ctx, size) => {
    ctx.fillStyle = "#242924";
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 8) {
      for (let x = 0; x < size; x += 8) {
        ctx.fillStyle = ((x + y) / 8) % 2 ? "#111710" : "#444b40";
        ctx.fillRect(x, y, 7, 7);
      }
    }
  });
  carbonTexture.colorSpace = THREE.SRGBColorSpace;
  carbonTexture.repeat.set(2, 1);

const carbon = new THREE.MeshStandardMaterial({
    map: carbonTexture,
    roughness: 0.35,
    metalness: 0.55,
  });

const shell = new THREE.Mesh(buildUpperGeometry(), fabric);
  shell.castShadow = true;
  shell.receiveShadow = true;
  upper.add(shell);

// A recessed dark footbed remains visible through the real collar opening.
  const footbed = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), dark);
  footbed.scale.set(0.59, 0.065, 0.42);
  footbed.position.set(-0.96, 0.57, 0);
  upper.add(footbed);

const collarPoints = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const x = -0.97 + Math.cos(t) * 0.46;
    const angle = Math.PI / 2 + Math.sin(t) * 0.70;
    collarPoints.push(upperPoint(x, angle, 0.008));
  }
  upper.add(tube(collarPoints, 0.042, fabric, true));

function slab(parent, material, y, depth, bevel) {
    const geometry = new THREE.ExtrudeGeometry(footprint(), {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 30,
    });
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

slab(sole, rubber, -0.025, 0.24, 0.065);
  const carbonPlate = slab(plate, carbon, -0.31, 0.034, 0.02);
  carbonPlate.scale.set(0.98, 1, 0.98);
  slab(sole, dark, -0.39, 0.07, 0.025);

// Shared tread geometry/material keeps repeated detail to one draw call.
  const treadCount = 22;
  const tread = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.075, 0.045, 1),
    dark,
    treadCount,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < treadCount; i++) {
    const x = -1.65 + i * 0.158;
    dummy.position.set(x, -0.49, 0);
    dummy.scale.set(1, 1, Math.max(0.22, sectionAt(x).width * 1.7));
    dummy.rotation.y = -0.16;
    dummy.updateMatrix();
    tread.setMatrixAt(i, dummy.matrix);
  }
  tread.instanceMatrix.needsUpdate = true;
  tread.castShadow = true;
  sole.add(tread);

// Architectural side piping on both sides.
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 30; i++) {
      const x = -1.55 + (i / 30) * 2.8;
      const { width, height } = sectionAt(x);
      points.push(new THREE.Vector3(
        x,
        0.13 + Math.sin((i / 30) * Math.PI) * height * 0.10,
        side * width * 0.98,
      ));
    }
    upper.add(tube(points, 0.014, trim));
  }

// Individual woven cross-laces and eyelets.
  const eyeletGeometry = new THREE.TorusGeometry(0.037, 0.009, 6, 12);

function lacePoint(x, z, lift = 0) {
    const { width, height } = sectionAt(x);
    return new THREE.Vector3(
      x,
      0.035 + height * Math.sqrt(Math.max(0, 1 - (z / width) ** 2)) + lift,
      z,
    );
  }

for (let i = 0; i < 6; i++) {
    const x = -0.42 + i * 0.195;
    const spread = 0.24 + i * 0.013;
    const a = lacePoint(x, -spread, 0.045);
    const b = lacePoint(x + 0.12, spread, 0.045);
    const mid = lacePoint(x + 0.06, 0, 0.08);

laces.add(tube([a, mid, b], 0.022, laceMaterial));

const c = lacePoint(x + 0.12, -spread, 0.06);
    const d = lacePoint(x, spread, 0.06);
    laces.add(tube([c, lacePoint(x + 0.06, 0, 0.11), d], 0.021, laceMaterial));

for (const p of [a, b]) {
      const eyelet = new THREE.Mesh(eyeletGeometry, trim);
      eyelet.position.copy(p);
      eyelet.rotation.x = Math.PI / 2;
      laces.add(eyelet);
    }
  }

// Heel pull-loop.
  const pullLoop = tube([
    new THREE.Vector3(-1.63, 0.70, -0.09),
    new THREE.Vector3(-1.86, 1.05, -0.08),
    new THREE.Vector3(-1.86, 1.05, 0.08),
    new THREE.Vector3(-1.63, 0.70, 0.09),
  ], 0.045, trim);
  upper.add(pullLoop);

// Small embossed brand panel.
  const logoTexture = canvasTexture((ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#d6e8b5";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("A E T H E R", size / 2, size / 2 + 12);
  });
  logoTexture.colorSpace = THREE.SRGBColorSpace;

const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.64),
    new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  logo.position.set(-1.07, 0.42, 0.53);
  upper.add(logo);

return {
    root,
    parts: { upper, laces, plate, sole },
    materials: { fabric, rubber, trim, laceMaterial },
  };
}

export function createScene({ mount, hotspotLayer, onMaterial, initialColor }) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

let disposed = false;
  let contextLost = false;
  let paused = false;
  let reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = innerWidth;
  let height = innerHeight;
  let mobile = width < 768;
  let dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);

renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

renderer.domElement.setAttribute("aria-hidden", "true");
  mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2("#161d15", 0.023);

const camera = new THREE.PerspectiveCamera(37, width / height, 0.1, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.7;
  room.dispose();
  pmrem.dispose();

scene.add(new THREE.HemisphereLight("#edf0df", "#161d12", 1.3));

const key = new THREE.SpotLight("#ffefd5", 95, 22, Math.PI / 5, 0.85, 1.5);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0003;
  scene.add(key, key.target);

const rim = new THREE.DirectionalLight("#d6f0b3", 3);
  rim.position.set(3, 2, -4);
  scene.add(rim);

const fill = new THREE.DirectionalLight("#c3d5f5", 1.3);
  fill.position.set(-4, 1, 1);
  scene.add(fill);

const shoe = buildShoe(renderer);
  scene.add(shoe.root);

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.ShadowMaterial({ color: "#000000", opacity: 0.2 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.85;
  floor.receiveShadow = true;
  scene.add(floor);

const shadowTexture = canvasTexture((ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.40)");
    g.addColorStop(0.45, "rgba(0,0,0,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
  shadowTexture.wrapS = shadowTexture.wrapT = THREE.ClampToEdgeWrapping;

const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 3.7),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = -1.83;
  scene.add(contactShadow);

// Inexpensive atmospheric shaft approximation, not volumetric ray marching.
  const shaft = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 7, 32, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { tint: { value: new THREE.Color("#cadab6") } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 tint;
        void main() {
          float edge = pow(abs(sin(vUv.x * 6.283185)), 3.0);
          float fade = smoothstep(0.0, 0.3, vUv.y)
                     * (1.0 - smoothstep(0.7, 1.0, vUv.y));
          gl_FragColor = vec4(tint, edge * fade * 0.018);
        }
      `,
    }),
  );
  shaft.position.set(1.4, 2.0, -1.4);
  shaft.rotation.z = -0.36;
  scene.add(shaft);

const markerTexture = canvasTexture((ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(221,245,178,1)");
    g.addColorStop(0.12, "rgba(211,232,164,0.8)");
    g.addColorStop(1, "rgba(211,232,164,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
  markerTexture.colorSpace = THREE.SRGBColorSpace;
  markerTexture.wrapS = markerTexture.wrapT = THREE.ClampToEdgeWrapping;

const definitions = [
    { id: "knit", label: "OCEAN KNIT", parent: shoe.parts.upper, p: [-0.6, 0.64, 0.55] },
    { id: "plate", label: "CARBON PLATE", parent: shoe.parts.plate, p: [0.65, -0.31, 0.72] },
    { id: "sole", label: "CLOUD SOLE", parent: shoe.parts.sole, p: [-0.25, -0.18, 0.78] },
  ];

const markers = definitions.map(({ id, label, parent, p }) => {
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({
      map: markerTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    marker.position.set(...p);
    marker.scale.setScalar(0.25);
    marker.renderOrder = 10;
    parent.add(marker);

const button = document.createElement("button");
    button.className = "hotspot";
    button.textContent = "+";
    button.dataset.label = label;
    button.setAttribute("aria-label", `Explore ${label.toLowerCase()}`);
    button.hidden = true;
    button.addEventListener("click", () => onMaterial(id));
    hotspotLayer.appendChild(button);

return { marker, button };
  });

const state = { path: 0, explode: 0, turn: -0.18 };
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 2.0, 7.7),
    new THREE.Vector3(2.6, 2.2, 7.0),
    new THREE.Vector3(-0.5, 2.9, 7.4),
    new THREE.Vector3(0.4, 2.0, 7.7),
  ]);

const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: "#journey",
      start: "top top",
      end: "bottom bottom",
      scrub: reducedMotion ? true : 0.9,
      invalidateOnRefresh: true,
    },
  });

timeline
    .to(state, { path: 1, duration: 1 }, 0)
    .to(state, { explode: 1, duration: 0.22, ease: "power2.inOut" }, 0.20)
    .to(state, { explode: 0, duration: 0.22, ease: "power2.inOut" }, 0.62)
    .to(state, { turn: 0.15, duration: 0.48 }, 0)
    .to(state, { turn: -0.22, duration: 0.52 }, 0.48)
    .to(document.documentElement, {
      "--studio-glow": "#43513b",
      duration: 0.45,
    }, 0)
    .to(document.documentElement, {
      "--studio-glow": "#353c35",
      duration: 0.55,
    }, 0.45);

const pointer = new THREE.Vector2();
  const smoothPointer = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const target = new THREE.Vector3();
  const colorTweens = new Set();

function changeColor(colorway, immediate = false) {
    colorTweens.forEach((tween) => tween.kill());
    colorTweens.clear();

const pairs = [
      [shoe.materials.fabric, colorway.upper],
      [shoe.materials.rubber, colorway.sole],
      [shoe.materials.trim, colorway.accent],
      [shoe.materials.laceMaterial, colorway.laces],
    ];

for (const [material, hex] of pairs) {
      const targetColor = new THREE.Color(hex);
      if (immediate || reducedMotion) {
        material.color.copy(targetColor);
      } else {
        const tween = gsap.to(material.color, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          duration: 0.55,
          ease: "power2.out",
        });
        colorTweens.add(tween);
      }
    }
  }

changeColor(initialColor, true);

function onPointer(event) {
    if (event.pointerType === "touch") return;
    pointer.set(
      (event.clientX / width - 0.5) * 2,
      (event.clientY / height - 0.5) * 2,
    );
  }

function resetPointer() {
    pointer.set(0, 0);
  }

function resize() {
    width = innerWidth;
    height = innerHeight;
    mobile = width < 768;
    dpr = Math.min(dpr, devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    ScrollTrigger.refresh();
  }

function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    renderer.setAnimationLoop(null);
    markers.forEach(({ button }) => { button.hidden = true; });
    const fallback = document.querySelector("#fallback");
    fallback.hidden = false;
    document.querySelector("#render-status").textContent =
      "3D paused. Your shopping bag is still available.";
  }

function onContextRestored() {
    contextLost = false;
    lastTime = 0;
    renderer.shadowMap.needsUpdate = true;
    document.querySelector("#fallback").hidden = true;
    if (!document.hidden) renderer.setAnimationLoop(frame);
  }

function onVisibility() {
    lastTime = 0;
    if (!contextLost && !disposed) {
      renderer.setAnimationLoop(document.hidden ? null : frame);
    }
  }

window.addEventListener("pointermove", onPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", resetPointer);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);
  renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

let lastTime = 0;
  let time = 0;
  let frameCount = 0;
  let averageFrame = 16.7;
  let sampleCount = 0;
  let lastQualityChange = 0;
  let lastMarkerVisible = false;

function frame(now) {
    if (disposed || contextLost) return;
    const elapsed = lastTime ? now - lastTime : 16.7;
    const dt = Math.min(elapsed / 1000, 0.05);
    lastTime = now;
    frameCount++;

const still = paused || reducedMotion;
    if (!still) time += dt;

smoothPointer.lerp(still ? new THREE.Vector2() : pointer, 1 - Math.exp(-dt * 5));

const pathProgress = reducedMotion ? 0 : state.path;
    path.getPointAt(clamp(pathProgress, 0, 1), cameraPosition);

if (mobile) {
      // Fit the long silhouette inside a narrow viewport.
      cameraPosition.multiplyScalar(Math.max(1, 0.91 / camera.aspect));
      target.set(0, -0.20, 0);
    } else {
      target.set(-0.20, 0, 0);
    }

camera.position.copy(cameraPosition);
    camera.lookAt(target);

shoe.root.position.set(
      mobile ? 0 : 1.02,
      (mobile ? 0.16 : 0.02) + (still ? 0 : Math.sin(time * 0.72) * 0.055),
      0,
    );
    shoe.root.rotation.set(
      smoothPointer.y * 0.045,
      state.turn + smoothPointer.x * 0.14 + (still ? 0 : Math.sin(time * 0.23) * 0.055),
      -0.14 + smoothPointer.y * 0.025,
    );

// Reduced-motion mode keeps the product assembled.
    const explosion = reducedMotion ? 0 : state.explode;
    shoe.parts.upper.position.y = explosion * 0.38;
    shoe.parts.laces.position.y = explosion * 1.08;
    shoe.parts.plate.position.y = explosion * -0.35;
    shoe.parts.sole.position.y = explosion * -0.88;

contactShadow.position.x = shoe.root.position.x;
    contactShadow.material.opacity = 0.56 - explosion * 0.12;

// Update shadow maps at half rate; render the scene at display refresh rate.
    if (frameCount % 2 === 0) renderer.shadowMap.needsUpdate = true;

const showMarkers = state.path > 0.24 && state.path < 0.75;
    if (showMarkers !== lastMarkerVisible) {
      markers.forEach(({ marker, button }) => {
        marker.visible = showMarkers;
        button.hidden = !showMarkers;
      });
      lastMarkerVisible = showMarkers;
    }

if (showMarkers) {
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);

for (const { marker, button } of markers) {
        marker.getWorldPosition(projected);
        projected.project(camera);

const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;
        const visible =
          projected.z > -1 && projected.z < 1 &&
          x > 24 && x < width - 24 && y > 105 && y < height - 35;

// Avoid placing mobile markers over the editorial card.
        const craftBounds = mobile
          ? document.querySelector(".editorial-copy").getBoundingClientRect()
          : null;
        const overlapsCopy = craftBounds &&
          x >= craftBounds.left - 22 && x <= craftBounds.right + 22 &&
          y >= craftBounds.top - 22 && y <= craftBounds.bottom + 22;

button.hidden = !visible || Boolean(overlapsCopy);
        marker.visible = !button.hidden;
        button.style.transform = `translate3d(${x - 22}px, ${y - 22}px, 0)`;
      }
    } else {
      markers.forEach(({ marker }) => { marker.visible = false; });
    }

renderer.render(scene, camera);

// Adaptive resolution: protect slower devices without a large post-FX chain.
    if (elapsed < 100) {
      averageFrame += (elapsed - averageFrame) * 0.035;
      sampleCount++;
    }

if (sampleCount > 120 && now - lastQualityChange > 5000) {
      if (averageFrame > 22 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height);
        lastQualityChange = now;
      }
      sampleCount = 0;
    }
  }

renderer.setAnimationLoop(frame);
  document.querySelector("#fallback").hidden = true;

return {
    changeColor,
    setPaused(value) {
      paused = value;
    },
    setReducedMotion(value) {
      reducedMotion = value;
      timeline.scrollTrigger.scrubDuration(value ? 0 : 0.9);
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      timeline.scrollTrigger?.kill();
      timeline.kill();
      colorTweens.forEach((tween) => tween.kill());

window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

const geometries = new Set();
      const materials = new Set();
      const textures = new Set();

scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          const list = Array.isArray(object.material)
            ? object.material
            : [object.material];
          list.forEach((material) => materials.add(material));
        }
      });

materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value?.isTexture) textures.add(value);
        });
        material.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => {
        if (texture !== environment.texture) texture.dispose();
      });

key.shadow.map?.dispose();
      environment.dispose();
      markers.forEach(({ button }) => button.remove());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
