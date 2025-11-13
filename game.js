import * as THREE from './node_modules/three/build/three.module.js';

// Game state
const gameState = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    canJump: false,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    prevTime: performance.now()
};

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 0, 400);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Hemisphere light for better ambient lighting
const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x6B8E23, 0.6);
scene.add(hemiLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(500, 500, 100, 100);
const groundMaterial = new THREE.MeshLambertMaterial({
    color: 0x3a5f0b,
    flatShading: true
});

// Add some noise to the ground
const positions = groundGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
    const y = Math.random() * 2 - 0.5;
    positions.setY(i, y);
}
positions.needsUpdate = true;
groundGeometry.computeVertexNormals();

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Procedural Tree Generation
class ProceduralTree {
    constructor(x, z, seed = Math.random()) {
        this.group = new THREE.Group();
        this.seed = seed;
        this.random = this.seededRandom(seed);

        const trunkHeight = 8 + this.random() * 8;
        const trunkRadius = 0.3 + this.random() * 0.4;

        this.createTrunk(trunkHeight, trunkRadius);
        this.createBranches(trunkHeight, trunkRadius);

        this.group.position.set(x, 0, z);
        this.group.castShadow = true;
    }

    seededRandom(seed) {
        let s = seed;
        return function() {
            s = Math.sin(s) * 10000;
            return s - Math.floor(s);
        };
    }

    createTrunk(height, radius) {
        const segments = 8;
        const trunkGeometry = new THREE.CylinderGeometry(
            radius * 0.7,
            radius,
            height,
            segments
        );
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = height / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.group.add(trunk);
    }

    createBranches(trunkHeight, trunkRadius) {
        const numBranches = 4 + Math.floor(this.random() * 4);
        const startHeight = trunkHeight * 0.4;

        for (let i = 0; i < numBranches; i++) {
            const heightRatio = (i / numBranches);
            const branchY = startHeight + (trunkHeight - startHeight) * heightRatio;
            const angle = (i / numBranches) * Math.PI * 2 + this.random() * 0.5;

            this.createBranch(branchY, angle, trunkRadius, 0);
        }

        // Create foliage
        this.createFoliage(trunkHeight);
    }

    createBranch(startY, angle, parentRadius, depth) {
        if (depth > 2) return;

        const branchLength = (3 - depth) * (2 + this.random() * 2);
        const branchRadius = parentRadius * 0.5;

        const branchGeometry = new THREE.CylinderGeometry(
            branchRadius * 0.5,
            branchRadius,
            branchLength,
            6
        );
        const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
        const branch = new THREE.Mesh(branchGeometry, branchMaterial);

        const tilt = Math.PI / 6 + this.random() * Math.PI / 6;

        branch.position.y = startY;
        branch.rotation.z = tilt;
        branch.rotation.y = angle;
        branch.position.x = Math.cos(angle) * parentRadius;
        branch.position.z = Math.sin(angle) * parentRadius;

        const offsetY = Math.sin(tilt) * branchLength / 2;
        const offsetXZ = Math.cos(tilt) * branchLength / 2;
        branch.position.y += offsetY;
        branch.position.x += Math.cos(angle) * offsetXZ;
        branch.position.z += Math.sin(angle) * offsetXZ;

        branch.castShadow = true;
        this.group.add(branch);

        // Recursively create sub-branches
        if (depth < 2 && this.random() > 0.3) {
            const numSubBranches = 1 + Math.floor(this.random() * 2);
            for (let i = 0; i < numSubBranches; i++) {
                const subAngle = angle + (this.random() - 0.5) * Math.PI / 2;
                const endY = startY + Math.sin(tilt) * branchLength;
                this.createBranch(endY, subAngle, branchRadius, depth + 1);
            }
        }
    }

    createFoliage(trunkHeight) {
        const numLeafClusters = 8 + Math.floor(this.random() * 8);

        for (let i = 0; i < numLeafClusters; i++) {
            const leafSize = 2 + this.random() * 3;
            const leafGeometry = new THREE.SphereGeometry(leafSize, 6, 6);
            const leafMaterial = new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(0.3, 0.6 + this.random() * 0.2, 0.3 + this.random() * 0.2)
            });
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

            const angle = this.random() * Math.PI * 2;
            const distance = this.random() * 4;
            const height = trunkHeight * 0.6 + this.random() * trunkHeight * 0.4;

            leaf.position.set(
                Math.cos(angle) * distance,
                height,
                Math.sin(angle) * distance
            );

            leaf.castShadow = true;
            this.group.add(leaf);
        }
    }

    getGroup() {
        return this.group;
    }
}

// Generate forest
function generateForest() {
    const treePositions = [];
    const numTrees = 80;
    const forestRadius = 200;

    for (let i = 0; i < numTrees; i++) {
        const angle = (i / numTrees) * Math.PI * 2 + Math.random() * 0.5;
        const distance = 20 + Math.random() * forestRadius;

        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Check if too close to other trees
        let tooClose = false;
        for (const pos of treePositions) {
            const dx = pos.x - x;
            const dz = pos.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < 8) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            treePositions.push({ x, z });
            const tree = new ProceduralTree(x, z, Math.random());
            scene.add(tree.getGroup());
        }
    }

    // Add some grass patches
    addGrass();
}

// Add grass
function addGrass() {
    const grassGeometry = new THREE.BufferGeometry();
    const grassPositions = [];
    const grassColors = [];

    for (let i = 0; i < 5000; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        const y = 0.5;

        grassPositions.push(x, y, z);

        const color = new THREE.Color().setHSL(0.25 + Math.random() * 0.1, 0.7, 0.4);
        grassColors.push(color.r, color.g, color.b);
    }

    grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3));
    grassGeometry.setAttribute('color', new THREE.Float32BufferAttribute(grassColors, 3));

    const grassMaterial = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const grass = new THREE.Points(grassGeometry, grassMaterial);
    scene.add(grass);
}

// Pointer lock controls
let controls = {
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    sensitivity: 0.002
};

document.addEventListener('click', () => {
    document.body.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        controls.euler.setFromQuaternion(camera.quaternion);
        controls.euler.y -= event.movementX * controls.sensitivity;
        controls.euler.x -= event.movementY * controls.sensitivity;
        controls.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, controls.euler.x));
        camera.quaternion.setFromEuler(controls.euler);
    }
});

// Keyboard controls
const onKeyDown = (event) => {
    switch (event.code) {
        case 'KeyW':
            gameState.moveForward = true;
            break;
        case 'KeyA':
            gameState.moveLeft = true;
            break;
        case 'KeyS':
            gameState.moveBackward = true;
            break;
        case 'KeyD':
            gameState.moveRight = true;
            break;
        case 'Space':
            if (gameState.canJump) {
                gameState.velocity.y += 200;
            }
            gameState.canJump = false;
            break;
    }
};

const onKeyUp = (event) => {
    switch (event.code) {
        case 'KeyW':
            gameState.moveForward = false;
            break;
        case 'KeyA':
            gameState.moveLeft = false;
            break;
        case 'KeyS':
            gameState.moveBackward = false;
            break;
        case 'KeyD':
            gameState.moveRight = false;
            break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - gameState.prevTime) / 1000;

    gameState.velocity.x -= gameState.velocity.x * 10.0 * delta;
    gameState.velocity.z -= gameState.velocity.z * 10.0 * delta;
    gameState.velocity.y -= 9.8 * 50.0 * delta; // Gravity

    gameState.direction.z = Number(gameState.moveForward) - Number(gameState.moveBackward);
    gameState.direction.x = Number(gameState.moveRight) - Number(gameState.moveLeft);
    gameState.direction.normalize();

    if (gameState.moveForward || gameState.moveBackward) {
        gameState.velocity.z -= gameState.direction.z * 200.0 * delta;
    }
    if (gameState.moveLeft || gameState.moveRight) {
        gameState.velocity.x -= gameState.direction.x * 200.0 * delta;
    }

    // Get camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(camera.up, cameraDirection).normalize();

    // Move camera
    camera.position.addScaledVector(cameraDirection, -gameState.velocity.z * delta);
    camera.position.addScaledVector(cameraRight, -gameState.velocity.x * delta);
    camera.position.y += gameState.velocity.y * delta;

    // Ground collision
    if (camera.position.y < 10) {
        gameState.velocity.y = 0;
        camera.position.y = 10;
        gameState.canJump = true;
    }

    gameState.prevTime = time;

    renderer.render(scene, camera);
}

// Initialize
generateForest();
document.getElementById('loading').style.display = 'none';
animate();
