import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

// Basic variables
let scene, camera, renderer, controls, world;
let car, ground, carBody;
let speed = 0;
let rotationSpeed = 0;
let engineSound, hornSound;
let timeOfDay = 12;
let particles = [];
let trees = [];
let buildings = [];
let wheels = [];
let lastTime = 0;
let cameraOffset = new THREE.Vector3(0, 5, -10);
let currentCameraPosition = new THREE.Vector3();
let targetCameraPosition = new THREE.Vector3();

// Variables for new features
let raindrops = [];
let snowflakes = [];
let isRaining = false;
let isSnowing = false;
let isFogActive = false;
let areLightsOn = false;
let headlights = [];
let carColor = 0xff0000;

// Class for particle system
class Particle {
    constructor(position) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.1
        );
        this.life = 1.0;
    }

    update() {
        this.mesh.position.add(this.velocity);
        this.life -= 0.02;
        this.mesh.material.opacity = this.life;
        return this.life > 0;
    }
}

// Yağmur damlası sınıfı
class Raindrop {
    constructor() {
        const geometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3);
        const material = new THREE.MeshBasicMaterial({
            color: 0x4444ff,
            transparent: true,
            opacity: 0.6
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.reset();
    }

    reset() {
        this.mesh.position.set(
            (Math.random() - 0.5) * 100,
            50,
            (Math.random() - 0.5) * 100
        );
        this.velocity = -2 - Math.random() * 2;
    }

    update() {
        this.mesh.position.y += this.velocity;
        if (this.mesh.position.y < 0) {
            this.reset();
        }
    }
}

// Kar tanesi sınıfı
class Snowflake {
    constructor() {
        const geometry = new THREE.SphereGeometry(0.05);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.reset();
    }

    reset() {
        this.mesh.position.set(
            (Math.random() - 0.5) * 100,
            50,
            (Math.random() - 0.5) * 100
        );
        this.velocity = {
            y: -0.5 - Math.random() * 0.5,
            x: (Math.random() - 0.5) * 0.2
        };
    }

    update() {
        this.mesh.position.y += this.velocity.y;
        this.mesh.position.x += this.velocity.x;
        if (this.mesh.position.y < 0) {
            this.reset();
        }
    }
}

function initWeatherEffects() {
    // Yağmur damlaları oluştur
    for (let i = 0; i < 1000; i++) {
        const raindrop = new Raindrop();
        scene.add(raindrop.mesh);
        raindrops.push(raindrop);
        raindrop.mesh.visible = false;
    }

    // Kar taneleri oluştur
    for (let i = 0; i < 500; i++) {
        const snowflake = new Snowflake();
        scene.add(snowflake.mesh);
        snowflakes.push(snowflake);
        snowflake.mesh.visible = false;
    }
}

function updateWeather() {
    // Yağmur güncelleme
    if (isRaining) {
        raindrops.forEach(raindrop => {
            raindrop.mesh.visible = true;
            raindrop.update();
        });
    }

    // Kar güncelleme
    if (isSnowing) {
        snowflakes.forEach(snowflake => {
            snowflake.mesh.visible = true;
            snowflake.update();
        });
    }

    // Sis güncelleme
    if (isFogActive) {
        scene.fog.density = 0.03;
    } else {
        scene.fog.density = 0.01;
    }
}

function createDetailedCar() {
    // Main body
    const carGeometry = new THREE.BoxGeometry(2, 1, 4);
    const carMaterial = new THREE.MeshPhongMaterial({
        color: carColor,
        metalness: 0.7,
        roughness: 0.3
    });
    car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.y = 1;
    car.castShadow = true;

    // Roof
    const roofGeometry = new THREE.BoxGeometry(1.8, 0.8, 2);
    const roof = new THREE.Mesh(roofGeometry, carMaterial);
    roof.position.y = 0.9;
    roof.position.z = -0.5;
    car.add(roof);

    // Windows
    const windowMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5,
        metalness: 0.9,
        roughness: 0.1
    });

    // Front window
    const frontWindowGeometry = new THREE.PlaneGeometry(1.6, 0.7);
    const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    frontWindow.position.set(0, 1.2, 0.7);
    frontWindow.rotation.x = Math.PI * 0.2;
    car.add(frontWindow);

    // Rear window
    const rearWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
    rearWindow.position.set(0, 1.2, -1.7);
    rearWindow.rotation.x = -Math.PI * 0.2;
    car.add(rearWindow);

    // Side windows
    const sideWindowGeometry = new THREE.PlaneGeometry(0.7, 0.6);
    const leftWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    leftWindow.position.set(-0.9, 1.1, -0.5);
    leftWindow.rotation.y = Math.PI * 0.5;
    car.add(leftWindow);

    const rightWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    rightWindow.position.set(0.9, 1.1, -0.5);
    rightWindow.rotation.y = -Math.PI * 0.5;
    car.add(rightWindow);

    // Headlights
    const headlightGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
    const headlightMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-0.6, 0, 2);
    leftHeadlight.rotation.z = Math.PI / 2;
    car.add(leftHeadlight);
    headlights.push(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(0.6, 0, 2);
    rightHeadlight.rotation.z = Math.PI / 2;
    car.add(rightHeadlight);
    headlights.push(rightHeadlight);

    // Headlight beams
    headlights.forEach(headlight => {
        const spotLight = new THREE.SpotLight(0xffffff, 0);
        spotLight.position.copy(headlight.position);
        spotLight.target.position.set(
            headlight.position.x,
            0,
            headlight.position.z + 10
        );
        car.add(spotLight);
        car.add(spotLight.target);
        headlights.push(spotLight);
    });

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });

    const wheelPositions = [
        { x: -1, z: 1.5 },
        { x: 1, z: 1.5 },
        { x: -1, z: -1.5 },
        { x: 1, z: -1.5 }
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, -0.2, pos.z);
        wheel.castShadow = true;
        car.add(wheel);
        wheels.push(wheel);
    });

    // Car physics
    const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    carBody = new CANNON.Body({
        mass: 1500,
        shape: carShape,
        position: new CANNON.Vec3(car.position.x, car.position.y, car.position.z),
        linearDamping: 0.5,
        angularDamping: 0.5
    });

    carBody.addEventListener('collide', function(e) {
        if (speed !== 0) {
            speed = speed * 0.5;
        }
    });

    world.addBody(carBody);
    scene.add(car);
}

function createEnvironment() {
    // Trees
    const treeGeometry = new THREE.ConeGeometry(1, 3, 8);
    const treeMaterial = new THREE.MeshPhongMaterial({ color: 0x2d5a27 });
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4a2f1b });

    for (let i = 0; i < 50; i++) {
        const tree = new THREE.Group();
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        tree.add(trunk);

        const leaves = new THREE.Mesh(treeGeometry, treeMaterial);
        leaves.position.y = 2;
        leaves.castShadow = true;
        tree.add(leaves);

        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        tree.position.set(x, 0, z);
        
        if (tree.position.distanceTo(car.position) > 20) {
            scene.add(tree);
            trees.push(tree);

            // Physics body for tree
            const treeShape = new CANNON.Cylinder(1, 1, 4, 8);
            const treeBody = new CANNON.Body({
                mass: 0, // Static object
                position: new CANNON.Vec3(x, 2, z),
                shape: treeShape
            });
            world.addBody(treeBody);
        }
    }

    // Buildings
    const buildingGeometry = new THREE.BoxGeometry(5, 15, 5);
    const buildingMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });

    for (let i = 0; i < 20; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(x, 7.5, z);
        building.castShadow = true;
        building.receiveShadow = true;

        if (building.position.distanceTo(car.position) > 30) {
            scene.add(building);
            buildings.push(building);

            // Physics body for building
            const buildingShape = new CANNON.Box(new CANNON.Vec3(2.5, 7.5, 2.5));
            const buildingBody = new CANNON.Body({
                mass: 0, // Static object
                position: new CANNON.Vec3(x, 7.5, z),
                shape: buildingShape
            });
            world.addBody(buildingBody);
        }
    }
}

function updateParticles() {
    // Exhaust smoke and dust effects
    if (speed !== 0) {
        // Exhaust smoke
        const exhaustPosition = new THREE.Vector3()
            .copy(car.position)
            .add(new THREE.Vector3(
                -Math.sin(car.rotation.y) * 2,
                0.5,
                -Math.cos(car.rotation.y) * 2
            ));
        
        const particle = new Particle(exhaustPosition);
        scene.add(particle.mesh);
        particles.push(particle);

        // Dust effect
        if (Math.random() > 0.7) {
            const dustPosition = new THREE.Vector3()
                .copy(car.position)
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    0.1,
                    (Math.random() - 0.5) * 2
                ));
            
            const dust = new Particle(dustPosition);
            dust.mesh.material.color.setHex(0x8B4513);
            scene.add(dust.mesh);
            particles.push(dust);
        }
    }

    // Update and remove particles
    particles = particles.filter(particle => {
        const isAlive = particle.update();
        if (!isAlive) {
            scene.remove(particle.mesh);
        }
        return isAlive;
    });
}

function updateDayNightCycle() {
    timeOfDay += 0.01;
    if (timeOfDay >= 24) timeOfDay = 0;

    // Sky color
    const skyColor = new THREE.Color();
    if (timeOfDay >= 6 && timeOfDay < 18) {
        // Daytime
        const t = Math.sin((timeOfDay - 6) / 12 * Math.PI);
        skyColor.setRGB(0.529 + t * 0.1, 0.808 + t * 0.1, 0.922 + t * 0.05);
    } else {
        // Night
        skyColor.setRGB(0.1, 0.1, 0.2);
    }
    scene.background = skyColor;
    scene.fog.color = skyColor;

    // Ambient light intensity
    const ambientIntensity = Math.max(0.2, Math.sin((timeOfDay - 6) / 12 * Math.PI));
    scene.children.find(child => child instanceof THREE.AmbientLight).intensity = ambientIntensity;

    // Saat göstergesi
    const hours = Math.floor(timeOfDay);
    const minutes = Math.floor((timeOfDay % 1) * 60);
    document.getElementById('timeOfDay').textContent = 
        `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch(event.key) {
        case 'ArrowUp':
            speed = 0.1;
            if (!engineSound.playing) engineSound.play();
            break;
        case 'ArrowDown':
            speed = -0.1;
            if (!engineSound.playing) engineSound.play();
            break;
        case 'ArrowLeft':
            rotationSpeed = 0.02;
            break;
        case 'ArrowRight':
            rotationSpeed = -0.02;
            break;
        case ' ':
            engineSound.paused ? engineSound.play() : engineSound.pause();
            break;
        case 'h':
        case 'H':
            hornSound.currentTime = 0;
            hornSound.play();
            break;
        case 'l':
        case 'L':
            toggleHeadlights();
            break;
    }
}

function onKeyUp(event) {
    switch(event.key) {
        case 'ArrowUp':
        case 'ArrowDown':
            speed = 0;
            engineSound.pause();
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            rotationSpeed = 0;
            break;
    }
}

function toggleHeadlights() {
    areLightsOn = !areLightsOn;
    headlights.forEach(light => {
        if (light instanceof THREE.SpotLight) {
            light.intensity = areLightsOn ? 2 : 0;
        } else {
            light.material.emissive.setHex(areLightsOn ? 0xffffcc : 0x000000);
        }
    });
}

function updateSpeedometer() {
    const currentSpeed = Math.abs(speed) * 500;
    document.getElementById('speedometer').textContent = 
        `Speed: ${Math.round(currentSpeed)} km/h`;
}

function animate(time) {
    requestAnimationFrame(animate);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    // Fizik dünyasını güncelle
    world.step(1/60);

    // Araba hareketi
    if (speed !== 0) {
        const newX = car.position.x + Math.sin(car.rotation.y) * speed;
        const newZ = car.position.z + Math.cos(car.rotation.y) * speed;

        // Check map boundaries (90 units from center in each direction)
        const mapBoundary = 90;
        const isWithinBounds = 
            newX >= -mapBoundary && 
            newX <= mapBoundary && 
            newZ >= -mapBoundary && 
            newZ <= mapBoundary;

        if (isWithinBounds) {
            car.position.x = newX;
            car.position.z = newZ;
            carBody.position.copy(car.position);

            wheels.forEach(wheel => {
                wheel.rotation.x += speed * 5;
            });
        } else {
            // Stop the car at the boundary
            speed = 0;
        }
    }
    
    if (rotationSpeed !== 0) {
        car.rotation.y += rotationSpeed;
        carBody.quaternion.setFromEuler(0, car.rotation.y, 0);
    }

    // Kamera takibi
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationY(car.rotation.y);
    
    const offsetRotated = cameraOffset.clone().applyMatrix4(rotationMatrix);
    targetCameraPosition.copy(car.position).add(offsetRotated);
    
    currentCameraPosition.lerp(targetCameraPosition, 0.1);
    camera.position.copy(currentCameraPosition);
    camera.lookAt(car.position);

    // Hava durumu efektlerini güncelle
    updateWeather();

    // Parçacık sistemini güncelle
    updateParticles();

    // Gün/gece döngüsünü güncelle
    updateDayNightCycle();

    // Hız göstergesini güncelle
    updateSpeedometer();

    renderer.render(scene, camera);
}

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.01);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, -10);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Create physics world
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1B4D3E,
        side: THREE.DoubleSide
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground physics
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Create car and environment
    createDetailedCar();
    createEnvironment();
    initWeatherEffects();

    // Setup sound effects
    engineSound = document.getElementById('engineSound');
    hornSound = document.getElementById('hornSound');

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // UI event listeners
    document.getElementById('carColor').addEventListener('change', (e) => {
        car.material.color.setHex(parseInt(e.target.value));
    });

    document.getElementById('toggleRain').addEventListener('click', () => {
        isRaining = !isRaining;
        raindrops.forEach(raindrop => raindrop.mesh.visible = isRaining);
    });

    document.getElementById('toggleSnow').addEventListener('click', () => {
        isSnowing = !isSnowing;
        snowflakes.forEach(snowflake => snowflake.mesh.visible = isSnowing);
    });

    document.getElementById('toggleFog').addEventListener('click', () => {
        isFogActive = !isFogActive;
    });

    document.getElementById('toggleLights').addEventListener('click', toggleHeadlights);
}

// Start the application
init();
animate(0);