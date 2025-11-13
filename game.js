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
scene.background = new THREE.Color(0xb8d4f0);
scene.fog = new THREE.Fog(0xb8d4f0, 50, 300);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 0);

// Renderer with enhanced settings
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Realistic Lighting - Much more intense and visible
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Primary sunlight - bright and warm
const sunLight = new THREE.DirectionalLight(0xffffeb, 2.8);
sunLight.position.set(80, 120, 60);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -120;
sunLight.shadow.camera.right = 120;
sunLight.shadow.camera.top = 120;
sunLight.shadow.camera.bottom = -120;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.bias = -0.0005;
sunLight.shadow.radius = 2;
scene.add(sunLight);

// Secondary fill light for softer shadows
const fillLight = new THREE.DirectionalLight(0xadd8e6, 0.8);
fillLight.position.set(-50, 50, -50);
scene.add(fillLight);

// Hemisphere light for realistic sky/ground color
const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4a5a3a, 1.2);
scene.add(hemiLight);

// Create realistic bark texture with normal map
function createBarkTexture(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const rng = seededRandom(seed);

    // Base dark brown bark
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#3d2817');
    gradient.addColorStop(0.5, '#4a3520');
    gradient.addColorStop(1, '#3d2817');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add vertical bark lines
    for (let i = 0; i < 40; i++) {
        const x = (i / 40) * canvas.width;
        const wobble = rng() * 20 - 10;

        ctx.strokeStyle = `rgba(${20 + rng() * 15}, ${15 + rng() * 10}, ${10 + rng() * 8}, ${0.6 + rng() * 0.4})`;
        ctx.lineWidth = 2 + rng() * 4;
        ctx.beginPath();

        for (let y = 0; y < canvas.height; y += 3) {
            const xOffset = Math.sin(y * 0.02) * wobble + (rng() - 0.5) * 5;
            ctx.lineTo(x + xOffset, y);
        }
        ctx.stroke();
    }

    // Add bark texture details
    for (let i = 0; i < 800; i++) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const w = 3 + rng() * 12;
        const h = 8 + rng() * 30;

        ctx.fillStyle = `rgba(${25 + rng() * 15}, ${20 + rng() * 10}, ${15 + rng() * 8}, ${0.3 + rng() * 0.5})`;
        ctx.fillRect(x, y, w, h);
    }

    // Add highlights
    for (let i = 0; i < 200; i++) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const w = 1 + rng() * 3;
        const h = 3 + rng() * 10;

        ctx.fillStyle = `rgba(${80 + rng() * 40}, ${60 + rng() * 30}, ${40 + rng() * 20}, ${0.2 + rng() * 0.3})`;
        ctx.fillRect(x, y, w, h);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
}

// Create normal map for bark
function createBarkNormalMap(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const rng = seededRandom(seed);

    // Base normal (pointing outward)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add vertical ridges
    for (let i = 0; i < 30; i++) {
        const x = (i / 30) * canvas.width;
        ctx.strokeStyle = '#a0a0ff';
        ctx.lineWidth = 3 + rng() * 3;
        ctx.beginPath();

        for (let y = 0; y < canvas.height; y += 5) {
            ctx.lineTo(x + (rng() - 0.5) * 10, y);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
}

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

// Photorealistic Tree with proper geometry
class RealisticTree {
    constructor(x, z, seed = Math.random()) {
        this.group = new THREE.Group();
        this.seed = seed;
        this.random = seededRandom(seed);

        const trunkHeight = 15 + this.random() * 10;
        const trunkRadius = 0.5 + this.random() * 0.4;

        // Create materials
        const barkTexture = createBarkTexture(seed);
        const barkNormalMap = createBarkNormalMap(seed);

        this.barkMaterial = new THREE.MeshStandardMaterial({
            map: barkTexture,
            normalMap: barkNormalMap,
            normalScale: new THREE.Vector2(1.5, 1.5),
            roughness: 0.95,
            metalness: 0.0,
            color: 0xffffff
        });

        this.createTrunk(trunkHeight, trunkRadius);
        this.createBranches(trunkHeight, trunkRadius);
        this.createRealisticFoliage(trunkHeight, trunkRadius);

        this.group.position.set(x, 0, z);
    }

    createTrunk(height, radius) {
        // More segments for smoother trunk
        const geometry = new THREE.CylinderGeometry(
            radius * 0.7,
            radius * 1.2,
            height,
            16,
            20
        );

        // Add irregularities
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const heightRatio = (y + height / 2) / height;

            if (heightRatio > 0.1) {
                const noise = (this.random() - 0.5) * 0.08 * radius;
                const x = positions.getX(i);
                const z = positions.getZ(i);
                const angle = Math.atan2(z, x);

                // Add knots and bumps
                const bumpiness = Math.sin(heightRatio * 10 + this.random() * 5) * 0.05 * radius;

                positions.setX(i, x + Math.cos(angle) * (noise + bumpiness));
                positions.setZ(i, z + Math.sin(angle) * (noise + bumpiness));
            }
        }
        geometry.computeVertexNormals();

        const trunk = new THREE.Mesh(geometry, this.barkMaterial);
        trunk.position.y = height / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.group.add(trunk);

        // Add roots
        this.createRoots(radius);
    }

    createRoots(trunkRadius) {
        const numRoots = 4 + Math.floor(this.random() * 3);

        for (let i = 0; i < numRoots; i++) {
            const angle = (i / numRoots) * Math.PI * 2 + this.random() * 0.8;
            const rootLength = trunkRadius * (2.5 + this.random() * 1.5);

            const geometry = new THREE.CylinderGeometry(
                trunkRadius * 0.15,
                trunkRadius * 0.45,
                rootLength,
                8
            );

            const root = new THREE.Mesh(geometry, this.barkMaterial);
            root.position.y = rootLength * 0.2;
            root.position.x = Math.cos(angle) * trunkRadius * 0.6;
            root.position.z = Math.sin(angle) * trunkRadius * 0.6;
            root.rotation.z = Math.PI / 2.5 + this.random() * 0.4;
            root.rotation.y = angle;
            root.castShadow = true;
            root.receiveShadow = true;

            this.group.add(root);
        }
    }

    createBranches(trunkHeight, trunkRadius) {
        const numBranches = 6 + Math.floor(this.random() * 6);
        const startHeight = trunkHeight * 0.45;

        for (let i = 0; i < numBranches; i++) {
            const heightRatio = i / numBranches;
            const branchY = startHeight + (trunkHeight - startHeight) * heightRatio;
            const angle = (i / numBranches) * Math.PI * 2 + this.random() * 1.2;

            this.createBranch(branchY, angle, trunkRadius * 0.7, 0, trunkHeight);
        }
    }

    createBranch(startY, angle, parentRadius, depth, trunkHeight) {
        if (depth > 3) return;

        const lengthFactor = (4 - depth) * (2.5 + this.random() * 2);
        const radiusFactor = parentRadius * (0.5 - depth * 0.08);

        const geometry = new THREE.CylinderGeometry(
            radiusFactor * 0.5,
            radiusFactor,
            lengthFactor,
            8
        );

        const branch = new THREE.Mesh(geometry, this.barkMaterial);

        const tilt = Math.PI / 4.5 + this.random() * Math.PI / 8;

        branch.position.y = startY;
        branch.rotation.z = tilt;
        branch.rotation.y = angle;

        const radiusAtHeight = parentRadius * (1 - (startY / trunkHeight) * 0.4);
        branch.position.x = Math.cos(angle) * radiusAtHeight;
        branch.position.z = Math.sin(angle) * radiusAtHeight;

        const offsetY = Math.sin(tilt) * lengthFactor / 2;
        const offsetXZ = Math.cos(tilt) * lengthFactor / 2;
        branch.position.y += offsetY;
        branch.position.x += Math.cos(angle) * offsetXZ;
        branch.position.z += Math.sin(angle) * offsetXZ;

        branch.castShadow = true;
        branch.receiveShadow = true;
        this.group.add(branch);

        // Create sub-branches
        if (depth < 3) {
            const numSubs = depth === 0 ? 2 + Math.floor(this.random() * 3) : 1 + Math.floor(this.random() * 2);
            for (let i = 0; i < numSubs; i++) {
                const subAngle = angle + (this.random() - 0.5) * Math.PI / 1.8;
                const endY = startY + Math.sin(tilt) * lengthFactor * (0.5 + this.random() * 0.4);
                this.createBranch(endY, subAngle, radiusFactor, depth + 1, trunkHeight);
            }
        }
    }

    createRealisticFoliage(trunkHeight, trunkRadius) {
        // Create clusters of individual leaves
        const numClusters = 25 + Math.floor(this.random() * 25);

        const leafColors = [
            new THREE.Color(0x2d5016),
            new THREE.Color(0x3a6b1f),
            new THREE.Color(0x4d7c26),
            new THREE.Color(0x2a4a15),
            new THREE.Color(0x355e1a),
            new THREE.Color(0x416d20)
        ];

        for (let c = 0; c < numClusters; c++) {
            const clusterAngle = this.random() * Math.PI * 2;
            const clusterDist = this.random() * 7;
            const clusterHeight = trunkHeight * (0.5 + this.random() * 0.45);

            const numLeavesInCluster = 15 + Math.floor(this.random() * 25);

            for (let i = 0; i < numLeavesInCluster; i++) {
                const leafGeometry = new THREE.PlaneGeometry(0.6 + this.random() * 0.8, 1.2 + this.random() * 1);

                const leafMaterial = new THREE.MeshStandardMaterial({
                    color: leafColors[Math.floor(this.random() * leafColors.length)],
                    roughness: 0.8,
                    metalness: 0.0,
                    side: THREE.DoubleSide
                });

                const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

                const localAngle = (i / numLeavesInCluster) * Math.PI * 2;
                const localDist = this.random() * 1.5;

                leaf.position.set(
                    Math.cos(clusterAngle) * clusterDist + Math.cos(localAngle) * localDist,
                    clusterHeight + (this.random() - 0.5) * 2,
                    Math.sin(clusterAngle) * clusterDist + Math.sin(localAngle) * localDist
                );

                leaf.rotation.set(
                    (this.random() - 0.5) * Math.PI,
                    this.random() * Math.PI * 2,
                    (this.random() - 0.5) * Math.PI / 2
                );

                leaf.castShadow = true;
                leaf.receiveShadow = true;
                this.group.add(leaf);
            }
        }
    }

    getGroup() {
        return this.group;
    }
}

// Create realistic forest floor
function createForestFloor() {
    const groundSize = 500;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);

    const positions = geometry.attributes.position;
    const colors = [];

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Multi-layered terrain
        let height = 0;
        height += Math.sin(x * 0.008) * Math.cos(z * 0.008) * 3;
        height += Math.sin(x * 0.03) * Math.cos(z * 0.03) * 0.8;
        height += Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.3;
        height += (Math.random() - 0.5) * 0.4;

        positions.setY(i, height);

        // Realistic forest floor colors
        const r = Math.random();
        let color;

        if (r < 0.25) {
            // Rich dark soil
            color = new THREE.Color(0x3a2f1f);
        } else if (r < 0.45) {
            // Medium brown earth
            color = new THREE.Color(0x4a3929);
        } else if (r < 0.65) {
            // Moss green
            color = new THREE.Color(0x3d5228);
        } else if (r < 0.85) {
            // Leaf litter brown
            color = new THREE.Color(0x5a4a32);
        } else {
            // Dark greenish brown
            color = new THREE.Color(0x4a5238);
        }

        // Add variation
        color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0.0
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Add forest details
function createForestDetails() {
    // Ferns
    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * 350;
        const z = (Math.random() - 0.5) * 350;
        createFern(x, z);
    }

    // Rocks
    for (let i = 0; i < 60; i++) {
        const x = (Math.random() - 0.5) * 350;
        const z = (Math.random() - 0.5) * 350;
        createRock(x, z);
    }

    // Bushes
    for (let i = 0; i < 80; i++) {
        const x = (Math.random() - 0.5) * 350;
        const z = (Math.random() - 0.5) * 350;
        createBush(x, z);
    }
}

function createFern(x, z) {
    const group = new THREE.Group();
    const numFronds = 6 + Math.floor(Math.random() * 3);

    const material = new THREE.MeshStandardMaterial({
        color: 0x1d4a0f,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < numFronds; i++) {
        const angle = (i / numFronds) * Math.PI * 2;
        const length = 1.2 + Math.random() * 0.8;

        const geometry = new THREE.PlaneGeometry(0.4, length);
        const frond = new THREE.Mesh(geometry, material);

        frond.position.x = Math.cos(angle) * 0.2;
        frond.position.y = length / 2 + 0.2;
        frond.position.z = Math.sin(angle) * 0.2;
        frond.rotation.z = Math.PI / 3;
        frond.rotation.y = angle;
        frond.castShadow = true;

        group.add(frond);
    }

    group.position.set(x, 0, z);
    scene.add(group);
}

function createRock(x, z) {
    const size = 0.4 + Math.random() * 1.8;
    const geometry = new THREE.DodecahedronGeometry(size, 0);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        const py = positions.getY(i);
        const pz = positions.getZ(i);
        const noise = 0.7 + Math.random() * 0.5;
        positions.setX(i, px * noise);
        positions.setY(i, py * noise);
        positions.setZ(i, pz * noise);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x4a4a4a).offsetHSL(0, 0, Math.random() * 0.15 - 0.05),
        roughness: 0.9,
        metalness: 0.0
    });

    const rock = new THREE.Mesh(geometry, material);
    rock.position.set(x, size * 0.35, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;

    scene.add(rock);
}

function createBush(x, z) {
    const group = new THREE.Group();
    const numLeaves = 20 + Math.floor(Math.random() * 15);

    const material = new THREE.MeshStandardMaterial({
        color: 0x2a5018,
        roughness: 0.9,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < numLeaves; i++) {
        const geometry = new THREE.PlaneGeometry(0.3 + Math.random() * 0.3, 0.4 + Math.random() * 0.4);
        const leaf = new THREE.Mesh(geometry, material);

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 0.7;

        leaf.position.set(
            Math.cos(angle) * dist,
            0.3 + Math.random() * 0.6,
            Math.sin(angle) * dist
        );

        leaf.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI
        );

        leaf.castShadow = true;
        group.add(leaf);
    }

    group.position.set(x, 0, z);
    scene.add(group);
}

// Generate forest
function generateForest() {
    const treePositions = [];
    const numTrees = 50;
    const forestRadius = 180;

    for (let i = 0; i < numTrees; i++) {
        const angle = (i / numTrees) * Math.PI * 2 + Math.random();
        const distance = 18 + Math.random() * forestRadius;

        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        let tooClose = false;
        for (const pos of treePositions) {
            const dx = pos.x - x;
            const dz = pos.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < 12) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            treePositions.push({ x, z });
            const tree = new RealisticTree(x, z, Math.random() * 10000);
            scene.add(tree.getGroup());
        }
    }

    createForestDetails();
}

// Controls
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

const onKeyDown = (event) => {
    switch (event.code) {
        case 'KeyW': gameState.moveForward = true; break;
        case 'KeyA': gameState.moveLeft = true; break;
        case 'KeyS': gameState.moveBackward = true; break;
        case 'KeyD': gameState.moveRight = true; break;
        case 'Space':
            if (gameState.canJump) gameState.velocity.y += 200;
            gameState.canJump = false;
            break;
    }
};

const onKeyUp = (event) => {
    switch (event.code) {
        case 'KeyW': gameState.moveForward = false; break;
        case 'KeyA': gameState.moveLeft = false; break;
        case 'KeyS': gameState.moveBackward = false; break;
        case 'KeyD': gameState.moveRight = false; break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

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
    gameState.velocity.y -= 9.8 * 50.0 * delta;

    gameState.direction.z = Number(gameState.moveForward) - Number(gameState.moveBackward);
    gameState.direction.x = Number(gameState.moveRight) - Number(gameState.moveLeft);
    gameState.direction.normalize();

    if (gameState.moveForward || gameState.moveBackward) {
        gameState.velocity.z -= gameState.direction.z * 200.0 * delta;
    }
    if (gameState.moveLeft || gameState.moveRight) {
        gameState.velocity.x -= gameState.direction.x * 200.0 * delta;
    }

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(camera.up, cameraDirection).normalize();

    camera.position.addScaledVector(cameraDirection, -gameState.velocity.z * delta);
    camera.position.addScaledVector(cameraRight, -gameState.velocity.x * delta);
    camera.position.y += gameState.velocity.y * delta;

    if (camera.position.y < 1.7) {
        gameState.velocity.y = 0;
        camera.position.y = 1.7;
        gameState.canJump = true;
    }

    gameState.prevTime = time;
    renderer.render(scene, camera);
}

// Initialize
console.log('Generating forest floor...');
createForestFloor();
console.log('Generating trees with bark textures...');
generateForest();
console.log('Scene ready!');
document.getElementById('loading').style.display = 'none';
animate();
