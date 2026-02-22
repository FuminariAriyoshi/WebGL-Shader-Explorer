// ============================================================
// Shader Presets — Vertex
// ============================================================

const VERTEX_PRESETS = [
  {
    name: 'Default',
    desc: '標準的な頂点シェーダー',
    code:
      `varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vPosition;
varying vec3  vWorldPosition;

void main() {
  vUv            = uv;
  vNormal        = normalize(normalMatrix * normal);
  vPosition      = position;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
  },
  {
    name: 'Wave',
    desc: 'Sin/Cos で頂点を波状に変形する',
    code:
      `uniform float uTime;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vPosition;
varying vec3  vWorldPosition;

void main() {
  vUv     = uv;
  vNormal = normalize(normalMatrix * normal);

  vec3 pos = position;
  pos.y += sin(pos.x * 3.0 + uTime * 2.0) * 0.18;
  pos.y += cos(pos.z * 3.0 + uTime * 2.0) * 0.18;

  vPosition      = pos;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`
  },
  {
    name: 'Explode',
    desc: '法線方向に膨張するエフェクト',
    code:
      `uniform float uTime;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vPosition;
varying vec3  vWorldPosition;

void main() {
  vUv     = uv;
  vNormal = normalize(normalMatrix * normal);

  float expand = sin(uTime * 1.4) * 0.35 + 0.05;
  vec3 pos = position + normal * expand;

  vPosition      = pos;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`
  },
  {
    name: 'Twist',
    desc: 'Y軸周りにねじれるエフェクト',
    code:
      `uniform float uTime;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vPosition;
varying vec3  vWorldPosition;

void main() {
  vUv     = uv;
  vNormal = normalize(normalMatrix * normal);

  float twist = position.y * sin(uTime * 0.7) * 2.5;
  float c = cos(twist), s = sin(twist);
  vec3 pos = position;
  pos.x = position.x * c - position.z * s;
  pos.z = position.x * s + position.z * c;

  vPosition      = pos;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`
  },
  {
    name: 'Noise Displacement',
    desc: 'Simplex Noise で頂点を変位',
    code:
      `uniform float uTime;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vPosition;
varying vec3  vWorldPosition;

vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m;m=m*m;
  vec3 x=2.*fract(p*C.www)-1.;
  vec3 h=abs(x)-.5;
  vec3 ox=floor(x+.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}

void main() {
  vUv     = uv;
  vNormal = normalize(normalMatrix * normal);

  float n = snoise(position.xz*1.8+uTime*0.4)*0.25;
  vec3 pos = position + normal * n;

  vPosition      = pos;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`
  },
  {
    name: 'Pulse Scale',
    desc: 'パルス状に全体が拡縮する',
    code:
      `uniform float uTime;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vPosition;
varying vec3  vWorldPosition;

void main() {
  vUv     = uv;
  vNormal = normalize(normalMatrix * normal);

  float s = 1.0 + sin(uTime * 2.8) * 0.12;
  vec3 pos = position * s;

  vPosition      = pos;
  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position    = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`
  }
];

// ============================================================
// Shader Presets — Fragment
// ============================================================

const FRAGMENT_PRESETS = [
  {
    name: 'Solid White',
    desc: '純白のシンプルシェーダー',
    code:
      `void main() {
  gl_FragColor = vec4(0.96, 0.96, 0.97, 1.0);
}`
  },
  {
    name: 'Lit White',
    desc: 'ライトに反応するシンプルな白',
    code:
      `varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(6.0, 12.0, 8.0) - vWorldPosition);
  float diff = max(dot(N, L), 0.0);
  float ambient = 0.35;

  vec3 col = vec3(0.97) * (ambient + diff * 0.65);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  // -------------------------------------------------------
  //  Crystal / Multifaceted Refraction
  //  Inspired by amsXYZ/three-multifaceted-refraction
  //  Key techniques:
  //    • Screen-space refraction via uRefractionMap (WebGLRenderTarget)
  //    • Chromatic aberration: per-channel IOR (R=1.46 G=1.48 B=1.52)
  //    • Schlick Fresnel
  //    • Sun-position-dependent specular + caustic highlights
  //    • View-angle iridescence
  // -------------------------------------------------------
  {
    name: 'Crystal Refraction',
    desc: '多面体屈折＋色分散＋太陽光スペキュラー',
    code:
      `uniform float uTime;
uniform vec2  uResolution;
uniform sampler2D uRefractionMap;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform float uAmbient;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

// Schlick Fresnel approximation
float schlick(float cosTheta, float F0) {
  float x = clamp(1.0 - cosTheta, 0.0, 1.0);
  return F0 + (1.0 - F0) * x*x*x*x*x;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec2 sc = gl_FragCoord.xy / uResolution;

  float NdotV = max(dot(N, V), 0.0);
  float F = schlick(NdotV, 0.04);

  // --- Screen-space chromatic offset ---
  // Use normal projected to screen to offset UV (always valid, no TIR)
  // Strength scales with how "grazing" the surface is
  float str = 0.06 * (1.0 - NdotV * 0.5);
  vec2 nScreen = N.xy * str;

  // Chromatic aberration: shift R/G/B by slightly different amounts
  float r = texture2D(uRefractionMap, clamp(sc + nScreen * 1.10, 0.001, 0.999)).r;
  float g = texture2D(uRefractionMap, clamp(sc + nScreen * 1.00, 0.001, 0.999)).g;
  float b = texture2D(uRefractionMap, clamp(sc + nScreen * 0.88, 0.001, 0.999)).b;
  vec3 refracted = vec3(r, g, b);

  // --- Sky reflection ---
  vec3 R = reflect(-V, N);
  float skyGrad = 0.5 + 0.5 * R.y;
  vec3 skyCol = mix(vec3(0.78, 0.88, 0.98), vec3(0.97, 0.98, 1.0), skyGrad);

  // --- Sun specular — primary sharp lobe + soft lobe ---
  vec3 H = normalize(uSunDir + V);
  float NdotH = max(dot(N, H), 0.0);
  float specSharp = pow(NdotH, 200.0) * 3.0;
  float specSoft  = pow(NdotH, 24.0)  * 0.5;
  vec3 specCol = uSunColor * (specSharp + specSoft);

  // --- Iridescence (view-angle rainbow) ---
  float iriT = 0.5 + 0.5 * sin(NdotV * 18.0 + uTime * 0.6);
  vec3 iriCol = vec3(
    0.5 + 0.5 * sin(iriT * 6.28),
    0.5 + 0.5 * sin(iriT * 6.28 + 2.094),
    0.5 + 0.5 * sin(iriT * 6.28 + 4.189)
  ) * 0.14;

  // --- Sub-surface bluish tint at grazing angles ---
  vec3 sss = vec3(0.80, 0.93, 1.0) * (1.0 - NdotV) * 0.28;

  // --- Compose ---
  vec3 inside  = refracted + sss + iriCol;
  vec3 outside = skyCol;
  vec3 col = mix(inside, outside, F) + specCol;

  // Alpha: more solid at edges (Fresnel), more transparent at centre
  float alpha = clamp(0.45 + F * 0.5 + specSharp * 0.15, 0.3, 1.0);
  gl_FragColor = vec4(col, alpha);
}`
  },

  // -------------------------------------------------------
  //  Transparent + Crystal Refraction
  //  Physically-inspired: glass transparency baked together
  //  with the refraction RT, so you see *through* the object
  //  with realistic color fringes and Fresnel rim
  // -------------------------------------------------------
  {
    name: 'Transparent Crystal',
    desc: '透明ガラス＋色分散屈折＋リム発光',
    code:
      `uniform float uTime;
uniform vec2  uResolution;
uniform sampler2D uRefractionMap;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform float uAmbient;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

float schlick(float cosT, float F0) {
  float x = clamp(1.0 - cosT, 0.0, 1.0);
  return F0 + (1.0 - F0) * x*x*x*x*x;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec2 sc = gl_FragCoord.xy / uResolution;

  float NdotV = max(dot(N, V), 0.0);
  float F = schlick(NdotV, 0.04);

  // Wide chromatic dispersion via normal-offset screen sampling
  float str = 0.10;
  vec2 nSc = N.xy * str;
  float r = texture2D(uRefractionMap, clamp(sc + nSc * 1.20, 0.001, 0.999)).r;
  float g = texture2D(uRefractionMap, clamp(sc + nSc * 1.00, 0.001, 0.999)).g;
  float b = texture2D(uRefractionMap, clamp(sc + nSc * 0.80, 0.001, 0.999)).b;
  vec3 refracted = vec3(r, g, b);

  // Sky reflection
  vec3 R = reflect(-V, N);
  float skyT = 0.5 + 0.5 * R.y;
  vec3 skyCol = mix(vec3(0.76, 0.88, 0.99), vec3(0.97, 0.98, 1.0), skyT);

  // Sun specular (Sun-direction-aware)
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 140.0) * 4.0;
  vec3 specCol = uSunColor * spec;

  // Rim glow (edge transparency)
  float rim = pow(1.0 - NdotV, 3.0);
  vec3 rimCol = vec3(0.55, 0.80, 1.0) * rim * 0.8;

  // Thin-film rainbow at edges (animated)
  float filmT = 0.5 + 0.5 * sin((1.0 - NdotV) * 22.0 + uTime * 1.0);
  vec3 filmCol = vec3(
    0.5 + 0.5 * sin(filmT * 6.28),
    0.5 + 0.5 * sin(filmT * 6.28 + 2.094),
    0.5 + 0.5 * sin(filmT * 6.28 + 4.189)
  ) * rim * 0.5;

  // Body: transparent centre blending to reflection at edges
  vec3 body = mix(refracted, skyCol, F * 0.4);
  vec3 col = body + specCol + rimCol + filmCol;

  // Very transparent at centre, more opaque at grazing angles
  float alpha = clamp(0.06 + F * 0.65 + rim * 0.55 + spec * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`
  },

  {
    name: 'Transparent Glass',
    desc: 'フレネルガラス',
    code:
      `uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

  vec3 glassCol = mix(vec3(0.70, 0.88, 1.0), vec3(0.92, 0.96, 1.0), fresnel);

  vec3 L = normalize(vec3(6.0, 12.0, 8.0));
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 80.0);

  vec3 col = glassCol + vec3(1.0)*spec*0.9;
  float alpha = 0.15 + fresnel * 0.65;
  gl_FragColor = vec4(col, alpha);
}`
  },

  {
    name: 'Holographic',
    desc: 'ホログラム＋スキャンライン',
    code:
      `uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.0);

  float holo = dot(N, V);
  vec3 holoCol;
  holoCol.r = 0.5 + 0.5*sin(holo*12.0 + uTime*2.0);
  holoCol.g = 0.5 + 0.5*sin(holo*12.0 + uTime*2.0 + 2.094);
  holoCol.b = 0.5 + 0.5*sin(holo*12.0 + uTime*2.0 + 4.189);

  float scan = 0.92 + 0.08*sin(vWorldPosition.y*70.0 + uTime*5.0);
  vec3 edge = vec3(0.3, 0.6, 1.0);
  vec3 col = mix(holoCol*0.7, edge, fresnel) * scan;

  gl_FragColor = vec4(col, 0.4 + fresnel*0.45);
}`
  },

  {
    name: 'Normal Visualizer',
    desc: '法線方向を RGB で可視化',
    code:
      `varying vec3 vNormal;

void main() {
  vec3 col = normalize(vNormal) * 0.5 + 0.5;
  gl_FragColor = vec4(col, 1.0);
}`
  },

  {
    name: 'UV Gradient',
    desc: 'UV 座標をグラデーション表示',
    code:
      `varying vec2 vUv;

void main() {
  vec3 col = vec3(vUv.x, vUv.y, 1.0 - vUv.x*vUv.y);
  gl_FragColor = vec4(col, 1.0);
}`
  },

  {
    name: 'Toon',
    desc: 'セルシェーディング（アニメ風）',
    code:
      `varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 L = normalize(vec3(6.0, 12.0, 8.0));
  float d = dot(normalize(vNormal), L);

  vec3 h = vec3(0.95, 0.97, 1.0);
  vec3 m = vec3(0.55, 0.70, 0.90);
  vec3 s = vec3(0.15, 0.22, 0.40);

  vec3 col;
  if      (d > 0.75) col = h;
  else if (d > 0.35) col = m;
  else if (d > 0.0)  col = s;
  else               col = s * 0.55;

  vec3 V = normalize(cameraPosition - vWorldPosition);
  float rim = 1.0 - max(dot(normalize(vNormal), V), 0.0);
  rim = smoothstep(0.55, 1.0, rim);
  col += vec3(0.4, 0.6, 1.0)*rim*0.55;

  gl_FragColor = vec4(col, 1.0);
}`
  },

  {
    name: 'Plasma',
    desc: 'プラズマアニメーション',
    code:
      `uniform float uTime;
varying vec2 vUv;

void main() {
  float t = uTime * 0.5;
  vec2 p = vUv * 4.0;
  float v = sin(p.x+t) + sin(p.y+t) + sin(p.x+p.y+t)
          + sin(sqrt(p.x*p.x+p.y*p.y)+t);
  v *= 0.25;
  vec3 col = vec3(
    sin(v*3.14159)*0.5+0.5,
    sin(v*3.14159+2.094)*0.5+0.5,
    sin(v*3.14159+4.189)*0.5+0.5
  );
  gl_FragColor = vec4(pow(col, vec3(0.8)), 1.0);
}`
  },

  {
    name: 'Matcap',
    desc: 'プロシージャルMatcapメタリック',
    code:
      `varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 N = normalize(vNormal);
  vec3 r = reflect(-V, N);
  float m = 2.0*sqrt(r.x*r.x + r.y*r.y + (r.z+1.0)*(r.z+1.0));
  vec2 uv = r.xy/m + 0.5;

  vec3 dark   = vec3(0.05, 0.06, 0.10);
  vec3 mid    = vec3(0.30, 0.32, 0.45);
  vec3 bright = vec3(0.90, 0.92, 1.00);
  vec3 accent = vec3(0.50, 0.42, 0.80);

  float d = length(uv - vec2(0.35, 0.35));
  vec3 col = mix(bright, mid,    smoothstep(0.0, 0.40, d));
  col       = mix(col,   dark,   smoothstep(0.4, 0.75, d));
  col       = mix(col,   accent, smoothstep(0.25,0.50, d)*0.3);
  gl_FragColor = vec4(col, 1.0);
}`
  }
];
