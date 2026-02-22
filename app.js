/* ============================================================
   WebGL Shader Explorer — Main Application
   ============================================================ */

(function () {
    'use strict';

    // ---- State ----
    let currentGeometry = 'cube';
    let clock, scene, camera, renderer, controls;
    let mesh, uniforms, floor, gridHelper, axesHelper;
    let vertexEditor, fragmentEditor;
    let dirLight, ambientLight, gui;
    let refractionTarget; // WebGLRenderTarget for crystal refraction

    const lightSettings = {
        sunIntensity: 1.2,
        ambient: 0.5,
        sunColor: '#ffffff',
        posX: 6, posY: 12, posZ: 8,
        shadowOpacity: 0.15
    };

    let lastFrameTime = performance.now();
    let frameCount = 0;

    // ---- DOM ----
    const canvas = document.getElementById('viewport');
    const viewportPanel = document.getElementById('panelViewport');
    const editorsPanel = document.getElementById('panelEditors');
    const vertexSection = document.getElementById('vertexSection');
    const fragmentSection = document.getElementById('fragmentSection');
    const errorDisplay = document.getElementById('errorDisplay');
    const fpsCounter = document.getElementById('fpsCounter');
    const geoInfo = document.getElementById('geoInfo');
    const compileBtn = document.getElementById('compileBtn');

    // ===========================================================
    //  init
    // ===========================================================
    function init() {
        try {
            initEditors();
            initPresetMenus();
            initThree();
            initGUI();
            initResizeHandles();
            initEventListeners();

            setTimeout(() => {
                applyShaders();
                updateRendererSize();
                vertexEditor.refresh();
                fragmentEditor.refresh();
            }, 150);

            animate();
        } catch (err) {
            console.error('Init error:', err);
        }
    }

    // ===========================================================
    //  Editors
    // ===========================================================
    function initEditors() {
        document.getElementById('vertexEditor').value = VERTEX_PRESETS[0].code;
        document.getElementById('fragmentEditor').value = FRAGMENT_PRESETS[0].code;

        const opts = {
            mode: 'clike',
            lineNumbers: true,
            tabSize: 2,
            indentWithTabs: false,
            matchBrackets: true,
            scrollbarStyle: 'native'
        };

        vertexEditor = CodeMirror.fromTextArea(document.getElementById('vertexEditor'), opts);
        fragmentEditor = CodeMirror.fromTextArea(document.getElementById('fragmentEditor'), opts);

        const run = () => applyShaders();
        vertexEditor.setOption('extraKeys', { 'Ctrl-Enter': run, 'Cmd-Enter': run });
        fragmentEditor.setOption('extraKeys', { 'Ctrl-Enter': run, 'Cmd-Enter': run });
    }

    // ===========================================================
    //  Preset menus
    // ===========================================================
    function initPresetMenus() {
        const cfg = [
            { menuId: 'vertexPresetMenu', btnId: 'vertexPresetBtn', presets: VERTEX_PRESETS, ed: () => vertexEditor },
            { menuId: 'fragmentPresetMenu', btnId: 'fragmentPresetBtn', presets: FRAGMENT_PRESETS, ed: () => fragmentEditor }
        ];

        cfg.forEach(({ menuId, btnId, presets, ed }) => {
            const menuEl = document.getElementById(menuId);
            const btnEl = document.getElementById(btnId);

            presets.forEach(p => {
                const item = document.createElement('div');
                item.className = 'preset-item';
                item.innerHTML = `<strong>${p.name}</strong><small>${p.desc || ''}</small>`;
                item.addEventListener('click', e => {
                    e.stopPropagation();
                    ed().setValue(p.code);
                    menuEl.classList.remove('open');
                    applyShaders();
                });
                menuEl.appendChild(item);
            });

            btnEl.addEventListener('click', e => {
                e.stopPropagation();
                document.querySelectorAll('.preset-menu').forEach(m => { if (m !== menuEl) m.classList.remove('open'); });
                menuEl.classList.toggle('open');
            });
        });

        document.addEventListener('click', () =>
            document.querySelectorAll('.preset-menu').forEach(m => m.classList.remove('open')));
    }

    // ===========================================================
    //  Three.js init
    // ===========================================================
    function initThree() {
        clock = new THREE.Clock();

        const rect = viewportPanel.getBoundingClientRect();
        const W = rect.width || 800;
        const H = rect.height || 600;

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H);
        renderer.setClearColor(0xf5f5f7);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // RenderTarget for crystal refraction
        refractionTarget = new THREE.WebGLRenderTarget(W, H, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat
        });

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f7);

        // Lights
        ambientLight = new THREE.AmbientLight(0xffffff, lightSettings.ambient);
        scene.add(ambientLight);

        dirLight = new THREE.DirectionalLight(0xffffff, lightSettings.sunIntensity);
        dirLight.position.set(lightSettings.posX, lightSettings.posY, lightSettings.posZ);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.left = -12;
        dirLight.shadow.camera.right = 12;
        dirLight.shadow.camera.top = 12;
        dirLight.shadow.camera.bottom = -12;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 60;
        scene.add(dirLight);

        // Floor — visible plane at y=0 that receives shadows
        // Two meshes: one visible (light grey), one shadow-only overlay
        const floorGeo = new THREE.PlaneGeometry(60, 60);

        // Visible floor — soft grey that shows crisp shadows via onBeforeCompile
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xf0f0f3,
            roughness: 0.85,
            metalness: 0.0,
            envMapIntensity: 0.2
        });
        floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);

        // dirLight.target must be explicitly added to scene for shadow frustum
        dirLight.target.position.set(0, 0, 0);
        scene.add(dirLight.target);

        // Camera
        camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
        camera.position.set(6, 6, 12);

        // Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.target.set(0, 1.2, 0);
        controls.minDistance = 2;
        controls.maxDistance = 30;

        // Helpers
        gridHelper = new THREE.GridHelper(20, 40, 0xd1d1d6, 0xe5e5ea);
        scene.add(gridHelper);

        axesHelper = new THREE.AxesHelper(3);
        scene.add(axesHelper);

        createMesh();
    }

    function updateRendererSize() {
        const rect = viewportPanel.getBoundingClientRect();
        const W = Math.max(rect.width, 100);
        const H = Math.max(rect.height, 100);
        renderer.setSize(W, H);
        refractionTarget.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
    }

    // ===========================================================
    //  Mesh creation
    // ===========================================================
    function createMesh() {
        if (mesh) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            if (mesh.customDepthMaterial) mesh.customDepthMaterial.dispose();
        }

        const geo = buildGeometry();
        uniforms = buildUniforms();

        let mat;
        try {
            mat = new THREE.ShaderMaterial({
                uniforms,
                vertexShader: VERTEX_PRESETS[0].code,
                fragmentShader: FRAGMENT_PRESETS[0].code,
                transparent: true,
                side: THREE.DoubleSide
            });
        } catch (_) {
            mat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.0 });
        }

        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, 1.5, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // customDepthMaterial: MeshDepthMaterial correctly feeds the shadow map.
        // For synced vertex-displacement shadows, we inject the vertex shader below.
        mesh.customDepthMaterial = buildDepthMaterial();

        scene.add(mesh);
        refreshInfoText(geo);
    }

    // Build a reliable depth material for shadow casting.
    // MeshDepthMaterial is the safest option for r128 — avoids ShaderLib fragShader issues.
    function buildDepthMaterial() {
        return new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    }

    function buildGeometry() {
        switch (currentGeometry) {
            case 'sphere':
                return new THREE.SphereGeometry(1.5, 64, 64);
            case 'gem': {
                const pts = [
                    new THREE.Vector2(0.00, 0.60),
                    new THREE.Vector2(0.35, 0.45),
                    new THREE.Vector2(0.90, 0.15),
                    new THREE.Vector2(1.10, 0.00),
                    new THREE.Vector2(0.55, -0.60),
                    new THREE.Vector2(0.00, -1.40)
                ];
                const g = new THREE.LatheGeometry(pts, 12);
                g.computeVertexNormals();
                return g;
            }
            default:
                return new THREE.BoxGeometry(2, 2, 2, 32, 32, 32);
        }
    }

    function buildUniforms() {
        return {
            uTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(viewportPanel.clientWidth, viewportPanel.clientHeight) },
            uRefractionMap: { value: refractionTarget.texture },
            uEnvColor: { value: new THREE.Color(0xf5f5f7) },
            uSunDir: { value: new THREE.Vector3().copy(dirLight.position).normalize() },
            uSunColor: { value: new THREE.Color(lightSettings.sunColor) },
            uAmbient: { value: lightSettings.ambient },
            // cameraPosition is a built-in in ShaderMaterial BUT only when
            // Three.js injects it — which it doesn't for custom ShaderMaterial.
            // We pass it explicitly so GLSL can use cameraPosition.
            uCameraPos: { value: new THREE.Vector3() }
        };
    }

    function refreshInfoText(geo) {
        const tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
        const label = currentGeometry.charAt(0).toUpperCase() + currentGeometry.slice(1);
        geoInfo.textContent = `${label} — ${Math.round(tris)} tri`;
    }

    // ===========================================================
    //  dat.GUI
    // ===========================================================
    function initGUI() {
        if (typeof dat === 'undefined') return;

        gui = new dat.GUI({ autoPlace: false, width: 240 });

        let container = viewportPanel.querySelector('.gui-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'gui-container';
            viewportPanel.appendChild(container);
        }
        container.appendChild(gui.domElement);

        const f1 = gui.addFolder('Light & Shadow');
        f1.add(lightSettings, 'sunIntensity', 0, 4, 0.05).name('Sun Intensity')
            .onChange(v => dirLight.intensity = v);
        f1.add(lightSettings, 'ambient', 0, 1, 0.02).name('Ambient')
            .onChange(v => { ambientLight.intensity = v; if (uniforms && uniforms.uAmbient) uniforms.uAmbient.value = v; });
        f1.addColor(lightSettings, 'sunColor').name('Sun Color')
            .onChange(v => { dirLight.color.set(v); if (uniforms && uniforms.uSunColor) uniforms.uSunColor.value.set(v); });
        f1.add(lightSettings, 'shadowOpacity', 0, 0.8, 0.01).name('Shadow Dark')
            .onChange(v => {
                if (floor && floor.material) {
                    // Darken floor colour to simulate shadow strength
                    const base = 0xf0f0f3;
                    const r = ((base >> 16) & 0xff) / 255;
                    const g = ((base >> 8) & 0xff) / 255;
                    const b = (base & 0xff) / 255;
                    const factor = 1.0 - v * 0.5;
                    floor.material.color.setRGB(r * factor, g * factor, b * factor);
                }
            });

        const f2 = gui.addFolder('Sun Position');
        f2.add(lightSettings, 'posX', -20, 20, 0.5).name('X').onChange(v => updateSunPos());
        f2.add(lightSettings, 'posY', 1, 25, 0.5).name('Y').onChange(v => updateSunPos());
        f2.add(lightSettings, 'posZ', -20, 20, 0.5).name('Z').onChange(v => updateSunPos());

        f1.open();
        f2.open();
    }

    function updateSunPos() {
        dirLight.position.set(lightSettings.posX, lightSettings.posY, lightSettings.posZ);
        if (uniforms && uniforms.uSunDir) {
            uniforms.uSunDir.value.copy(dirLight.position).normalize();
        }
    }

    // ===========================================================
    //  Shader compilation
    // ===========================================================
    function applyShaders() {
        if (!vertexEditor || !fragmentEditor) return;
        hideError();

        const vCode = vertexEditor.getValue().trim();
        const fCode = fragmentEditor.getValue().trim();
        if (!vCode || !fCode) { showError('Shader code is empty'); return; }

        try {
            const newUniforms = Object.assign(buildUniforms(), {
                uTime: { value: clock.getElapsedTime() }
            });

            const newMat = new THREE.ShaderMaterial({
                uniforms: newUniforms,
                vertexShader: vCode,
                fragmentShader: fCode,
                transparent: true,
                side: THREE.DoubleSide
            });

            // customDepthMaterial uses MeshDepthMaterial — reliable shadow casting.
            // (Vertex-shader deformation is not synced to shadows in this lightweight version.)
            const depthMat = new THREE.MeshDepthMaterial({
                depthPacking: THREE.RGBADepthPacking
            });

            if (mesh) {
                if (mesh.material) mesh.material.dispose();
                if (mesh.customDepthMaterial) mesh.customDepthMaterial.dispose();
                mesh.material = newMat;
                mesh.customDepthMaterial = depthMat;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
            uniforms = newUniforms;

            // Flash green
            const orig = compileBtn.style.background;
            compileBtn.style.background = '#30d158';
            setTimeout(() => compileBtn.style.background = orig, 500);

        } catch (err) {
            showError(err.message || 'Shader compilation error');
        }
    }

    function showError(msg) {
        errorDisplay.textContent = msg;
        errorDisplay.classList.add('visible');
    }
    function hideError() {
        errorDisplay.classList.remove('visible');
        errorDisplay.textContent = '';
    }

    // ===========================================================
    //  Animation loop
    // ===========================================================
    function animate() {
        requestAnimationFrame(animate);

        const t = clock.getElapsedTime();
        if (uniforms) {
            if (uniforms.uTime) uniforms.uTime.value = t;
            if (uniforms.uResolution) uniforms.uResolution.value.set(viewportPanel.clientWidth, viewportPanel.clientHeight);
        }

        controls.update();

        // Keep uSunDir in sync every frame (responds to dat.gui changes)
        if (uniforms && uniforms.uSunDir) {
            uniforms.uSunDir.value.copy(dirLight.position).normalize();
        }
        if (uniforms && uniforms.uSunColor) {
            uniforms.uSunColor.value.set(lightSettings.sunColor);
        }

        // Capture background for crystal refraction (hide mesh, render BG, restore)
        if (mesh && mesh.visible) {
            mesh.visible = false;
            renderer.setRenderTarget(refractionTarget);
            renderer.render(scene, camera);
            renderer.setRenderTarget(null);
            mesh.visible = true;
            if (uniforms && uniforms.uRefractionMap) uniforms.uRefractionMap.value = refractionTarget.texture;
        }

        renderer.render(scene, camera);

        // FPS
        frameCount++;
        const now = performance.now();
        if (now - lastFrameTime >= 1000) {
            fpsCounter.textContent = `${Math.round(frameCount * 1000 / (now - lastFrameTime))} FPS`;
            frameCount = 0;
            lastFrameTime = now;
        }
    }

    // ===========================================================
    //  Resize handles
    // ===========================================================
    function initResizeHandles() {
        let draggingH = false, draggingV = false;

        const panelHandle = document.getElementById('panelResizeHandle');
        const editorHandle = document.getElementById('editorResizeHandle');

        panelHandle.addEventListener('mousedown', e => { e.preventDefault(); draggingH = true; document.body.style.cursor = 'ew-resize'; document.body.style.userSelect = 'none'; });
        editorHandle.addEventListener('mousedown', e => { e.preventDefault(); draggingV = true; document.body.style.cursor = 'ns-resize'; document.body.style.userSelect = 'none'; });

        document.addEventListener('mousemove', e => {
            if (draggingH) {
                const main = document.getElementById('main');
                const r = (e.clientX - main.getBoundingClientRect().left) / main.clientWidth;
                editorsPanel.style.width = `${Math.max(20, Math.min(75, r * 100))}%`;
                updateRendererSize();
                vertexEditor.refresh();
                fragmentEditor.refresh();
            }
            if (draggingV) {
                const pRect = editorsPanel.getBoundingClientRect();
                const r = (e.clientY - pRect.top) / pRect.height;
                vertexSection.style.flex = `${Math.max(0.15, Math.min(0.85, r))}`;
                fragmentSection.style.flex = `${1 - Math.max(0.15, Math.min(0.85, r))}`;
                vertexEditor.refresh();
                fragmentEditor.refresh();
            }
        });

        document.addEventListener('mouseup', () => {
            draggingH = draggingV = false;
            document.body.style.cursor = document.body.style.userSelect = '';
        });

        window.addEventListener('resize', () => {
            updateRendererSize();
            vertexEditor && vertexEditor.refresh();
            fragmentEditor && fragmentEditor.refresh();
        });
    }

    // ===========================================================
    //  Event listeners
    // ===========================================================
    function initEventListeners() {
        document.querySelectorAll('.geo-btn').forEach(btn =>
            btn.addEventListener('click', () => {
                document.querySelectorAll('.geo-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentGeometry = btn.dataset.geo;
                createMesh();
                applyShaders();
            })
        );

        compileBtn.addEventListener('click', applyShaders);

        document.getElementById('gridToggle').addEventListener('change', e =>
            gridHelper.visible = e.target.checked);

        document.getElementById('axisToggle').addEventListener('change', e =>
            axesHelper.visible = e.target.checked);

        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); applyShaders(); }
        });
    }

    // ===========================================================
    //  Start
    // ===========================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
