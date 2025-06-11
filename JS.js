// Global variables
let scene, camera, renderer, controls;
let sun, planets = [];
let raycaster, mouse;
let currentSection = null;
let isTransitioning = false;
let stars;
const clock = new THREE.Clock();

// Planet data
const planetData = [
    { name: 'Home', section: 'home', color: 0x4A90E2, distance: 5, speed: 0.001, size: 0.6 },
    { name: 'Projects', section: 'projects', color: 0xF5A623, distance: 7, speed: 0.0008, size: 0.7 },
    { name: 'Publications', section: 'publications', color: 0x7ED321, distance: 9, speed: 0.0006, size: 0.8 },
    { name: 'Contact', section: 'contact', color: 0xD0021B, distance: 11, speed: 0.0004, size: 0.5 }
];

// Initialize the application
function init() {
    // Wait for Three.js to be fully loaded
    if (typeof THREE === 'undefined') {
        setTimeout(init, 100);
        return;
    }
    
    createScene();
    createSun();
    createPlanets();
    createStars();
    createOrbitLines();
    setupEventListeners();
    animate();
    
    // Hide loading screen after initialization
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }, 1500);
}

// Create the 3D scene
function createScene() {
    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to DOM
    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.appendChild(renderer.domElement);
    
    // Controls setup - using the correct way to access OrbitControls
    if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
    } else {
        // Fallback manual controls
        controls = {
            enableDamping: true,
            dampingFactor: 0.05,
            maxDistance: 25,
            minDistance: 8,
            maxPolarAngle: Math.PI / 2,
            update: function() {}
        };
    }
    
    if (controls.enableDamping !== undefined) {
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 25;
        controls.minDistance = 8;
        controls.maxPolarAngle = Math.PI / 2;
    }
    
    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Point light from sun
    const sunLight = new THREE.PointLight(0xFFD700, 1.5, 100);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
}

// Create the sun with glow effect
// MODIFIED: Create the sun with a procedural plasma shader
function createSun() {
    // Sun geometry
    const sunGeometry = new THREE.SphereGeometry(1.5, 64, 64);

    // Vertex Shader: passes attributes to the fragment shader
    const vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    // Fragment Shader: creates the procedural plasma effect
    const fragmentShader = `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        
        // 2D Random function
        float random (vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        // 2D Noise function
        float noise (vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        // Fractional Brownian Motion (fBm) to create layers of noise
        float fbm (vec2 st) {
            float value = 0.0;
            float amplitude = .5;
            float frequency = 0.;
            for (int i = 0; i < 6; i++) {
                value += amplitude * noise(st);
                st *= 2.;
                amplitude *= .5;
            }
            return value;
        }

        void main() {
            // Base color for the sun
            vec3 color = vec3(0.9, 0.4, 0.1);
            
            // Generate moving noise pattern
            float n = fbm(vUv * 4.0 + time * 0.1);
            
            // Add noise to the color
            vec3 plasma = color * n * 2.5;

            // Fresnel effect for a glowing edge
            float fresnel = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
            fresnel = pow(fresnel, 2.0);
            
            // Combine plasma and fresnel effect
            gl_FragColor = vec4(plasma + fresnel * color, 1.0);
        }
    `;

    // Shader material
    const sunMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });

    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.userData = { type: 'sun' };
    scene.add(sun);

    // Create sun glow effect
    const glowGeometry = new THREE.SphereGeometry(1.55, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3
    });

    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    sunGlow.userData = { type: 'glow' };
    scene.add(sunGlow);
}

// Create planets with claymation appearance
function createPlanets() {
    planetData.forEach((data, index) => {
        // Planet geometry
        const geometry = new THREE.SphereGeometry(data.size, 16, 16);
        
        // Clay-like material
        const material = new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true
        });
        
        const planet = new THREE.Mesh(geometry, material);
        
        // Position planet
        planet.position.x = data.distance;
        planet.position.y = Math.sin(index * 0.5) * 0.5; // Slight vertical offset
        
        // Add properties for animation and interaction
        planet.userData = {
            distance: data.distance,
            speed: data.speed,
            angle: index * Math.PI / 2, // Spread planets around
            name: data.name,
            section: data.section,
            originalY: planet.position.y,
            type: 'planet'
        };
        
        planet.castShadow = true;
        planet.receiveShadow = true;
        
        planets.push(planet);
        scene.add(planet);
    });
}

// Create starry background
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.5,
        sizeAttenuation: false
    });
    
    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Create orbital lines
function createOrbitLines() {
    planetData.forEach(data => {
        const curve = new THREE.EllipseCurve(
            0, 0,
            data.distance, data.distance,
            0, 2 * Math.PI,
            false,
            0
        );
        
        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x404040,
            opacity: 0.3,
            transparent: true
        });
        
        const orbit = new THREE.Line(geometry, material);
        orbit.rotation.x = Math.PI / 2; // Rotate to horizontal plane
        orbit.userData = { type: 'orbit' };
        scene.add(orbit);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Mouse events
    const canvas = renderer.domElement;
    canvas.addEventListener('mousemove', onMouseMove, false);
    canvas.addEventListener('click', onMouseClick, false);
    
    // Navigation events
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });
    
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', showSolarSystem);
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle mouse movement for planet hover
function onMouseMove(event) {
    if (currentSection) return; // Don't show tooltips when in content view
    
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);
    
    const tooltip = document.getElementById('planet-tooltip');
    
    if (intersects.length > 0) {
        const planet = intersects[0].object;
        
        if (planet.userData && planet.userData.type === 'planet') {
            // Show tooltip
            tooltip.textContent = planet.userData.name;
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY - 30) + 'px';
            tooltip.classList.add('show');
            
            // Change cursor
            renderer.domElement.style.cursor = 'pointer';
            
            // Highlight planet
            planet.material.emissive.setHex(0x333333);
        }
    } else {
        // Hide tooltip
        tooltip.classList.remove('show');
        renderer.domElement.style.cursor = 'default';
        
        // Remove planet highlights
        planets.forEach(planet => {
            planet.material.emissive.setHex(0x000000);
        });
    }
}

// Handle mouse click for planet selection
function onMouseClick(event) {
    if (currentSection || isTransitioning) return;
    
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets);
    
    if (intersects.length > 0) {
        const planet = intersects[0].object;
        if (planet.userData && planet.userData.type === 'planet') {
            showSection(planet.userData.section);
        }
    }
}

// Show content section
function showSection(sectionName) {
    if (isTransitioning) return;
    
    isTransitioning = true;
    currentSection = sectionName;
    
    // Hide tooltip
    const tooltip = document.getElementById('planet-tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
    }
    
    // Show back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.style.display = 'block';
    }
    
    // Show content container
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
        contentContainer.classList.add('active');
    }
    
    // Hide all sections first
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update navigation active state
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionName) {
            link.classList.add('active');
        }
    });
    
    setTimeout(() => {
        isTransitioning = false;
    }, 300);
}

// Show solar system view
function showSolarSystem() {
    if (isTransitioning) return;
    
    isTransitioning = true;
    currentSection = null;
    
    // Hide back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.style.display = 'none';
    }
    
    // Hide content container
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
        contentContainer.classList.remove('active');
    }
    
    // Remove active states
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    setTimeout(() => {
        isTransitioning = false;
    }, 300);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Get time delta for smooth animation
    const delta = clock.getDelta();
    
    // Update shader time uniform
    if (sun && sun.material.uniforms && sun.material.uniforms.time) {
        sun.material.uniforms.time.value += delta * 0.5;
    }

    if (!currentSection) {
        // Animate planets
        planets.forEach(planet => {
            if (planet.userData) {
                planet.userData.angle += planet.userData.speed;
                planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
                planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
                planet.position.y = planet.userData.originalY + Math.sin(planet.userData.angle * 3) * 0.1;
                planet.rotation.y += 0.0002;
            }
        });
        
        // Slowly rotate stars
        if (stars) {
            stars.rotation.y += 0.0001;
        }
    }
    
    // Update controls
    if (controls && controls.update) {
        controls.update();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}