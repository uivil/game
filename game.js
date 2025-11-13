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
scene.background = new THREE.Color(0xadd8e6);
scene.fog = new THREE.Fog(0xadd8e6, 20, 200);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
document.body.appendChild(renderer.domElement);

// Powerful lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff8e1, 4.0);
sunLight.position.set(120, 150, 100);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -150;
sunLight.shadow.camera.right = 150;
sunLight.shadow.camera.top = 150;
sunLight.shadow.camera.bottom = -150;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.bias = -0.0001;
scene.add(sunLight);

const fillLight1 = new THREE.DirectionalLight(0xb0d0f0, 1.8);
fillLight1.position.set(-100, 80, -80);
scene.add(fillLight1);

const fillLight2 = new THREE.DirectionalLight(0xffeaa7, 1.2);
fillLight2.position.set(50, 60, -100);
scene.add(fillLight2);

const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4a5020, 2.0);
scene.add(hemiLight);

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

// High quality bark texture
function createRealisticBarkTexture(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    const rng = seededRandom(seed);

    // Very dark base
    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Major bark ridges
    for (let i = 0; i < 80; i++) {
        const x = (i / 80) * canvas.width + (rng() - 0.5) * 30;

        ctx.strokeStyle = `rgba(${10 + rng() * 20}, ${8 + rng() * 12}, ${5 + rng() * 8}, ${0.7 + rng() * 0.3})`;
        ctx.lineWidth = 5 + rng() * 8;
        ctx.beginPath();

        for (let y = 0; y < canvas.height; y += 1) {
            const wobble = Math.sin(y * 0.02 + rng() * 10) * 20 + Math.sin(y * 0.05) * 10;
            ctx.lineTo(x + wobble, y);
        }
        ctx.stroke();
    }

    // Texture details
    for (let i = 0; i < 2000; i++) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const w = 4 + rng() * 15;
        const h = 12 + rng() * 40;
        ctx.fillStyle = `rgba(${25 + rng() * 30}, ${18 + rng() * 20}, ${12 + rng() * 15}, ${0.3 + rng() * 0.6})`;
        ctx.fillRect(x, y, w, h);
    }

    // Highlights and cracks
    for (let i = 0; i < 500; i++) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const brightness = rng() > 0.5;

        if (brightness) {
            ctx.fillStyle = `rgba(${120 + rng() * 80}, ${90 + rng() * 60}, ${50 + rng() * 40}, ${0.1 + rng() * 0.3})`;
        } else {
            ctx.fillStyle = `rgba(5, 3, 2, ${0.6 + rng() * 0.4})`;
        }
        ctx.fillRect(x, y, 2 + rng() * 5, 5 + rng() * 15);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Realistic tree class
class RealisticForestTree {
    constructor(x, z, seed = Math.random()) {
        this.group = new THREE.Group();
        this.seed = seed;
        this.random = seededRandom(seed);

        const trunkHeight = 20 + this.random() * 15;
        const trunkRadius = 0.7 + this.random() * 0.6;

        const barkTexture = createRealisticBarkTexture(seed);

        // High quality bark material
        this.barkMaterial = new THREE.MeshStandardMaterial({
            map: barkTexture,
            roughness: 0.98,
            metalness: 0.0,
            color: 0xffffff
        });

        this.createHighQualityTrunk(trunkHeight, trunkRadius);
        this.createNaturalBranches(trunkHeight, trunkRadius);
        this.createScatteredFoliage(trunkHeight);

        this.group.position.set(x, 0, z);
    }

    createHighQualityTrunk(height, radius) {
        // Very high detail trunk
        const geometry = new THREE.CylinderGeometry(
            radius * 0.6,
            radius * 1.4,
            height,
            32,
            32
        );

        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const heightRatio = (y + height / 2) / height;

            if (heightRatio > 0.03) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                const angle = Math.atan2(z, x);

                const noise = (this.random() - 0.5) * 0.15 * radius;
                const bump = Math.sin(heightRatio * 15 + angle * 4) * 0.1 * radius;
                const knot = Math.sin(heightRatio * 8 + this.random() * 10) * 0.08 * radius;

                positions.setX(i, x + Math.cos(angle) * (noise + bump + knot));
                positions.setZ(i, z + Math.sin(angle) * (noise + bump + knot));
            }
        }
        geometry.computeVertexNormals();

        const trunk = new THREE.Mesh(geometry, this.barkMaterial);
        trunk.position.y = height / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.group.add(trunk);

        this.createLargeRoots(radius, height);
    }

    createLargeRoots(trunkRadius, trunkHeight) {
        const numRoots = 6 + Math.floor(this.random() * 4);

        for (let i = 0; i < numRoots; i++) {
            const angle = (i / numRoots) * Math.PI * 2 + this.random() * 1.2;
            const rootLength = trunkRadius * (3.5 + this.random() * 2.5);

            const geometry = new THREE.CylinderGeometry(
                trunkRadius * 0.1,
                trunkRadius * 0.6,
                rootLength,
                16
            );

            const root = new THREE.Mesh(geometry, this.barkMaterial);
            root.position.y = rootLength * 0.1;
            root.position.x = Math.cos(angle) * trunkRadius * 0.4;
            root.position.z = Math.sin(angle) * trunkRadius * 0.4;
            root.rotation.z = Math.PI / 2.2 + this.random() * 0.6;
            root.rotation.y = angle;
            root.castShadow = true;
            root.receiveShadow = true;

            this.group.add(root);
        }
    }

    createNaturalBranches(trunkHeight, trunkRadius) {
        const numMainBranches = 8 + Math.floor(this.random() * 8);
        const startHeight = trunkHeight * 0.35;

        for (let i = 0; i < numMainBranches; i++) {
            const ratio = i / numMainBranches;
            const branchY = startHeight + (trunkHeight - startHeight) * ratio;
            const angle = (i / numMainBranches) * Math.PI * 2 + this.random() * 1.5;

            this.createBranch(branchY, angle, trunkRadius * 0.55, 0, trunkHeight);
        }
    }

    createBranch(startY, angle, radius, depth, trunkHeight) {
        if (depth > 4) return;

        const length = (5 - depth) * (3.5 + this.random() * 2.8);
        const branchRadius = radius * (0.5 - depth * 0.08);

        const geometry = new THREE.CylinderGeometry(
            branchRadius * 0.35,
            branchRadius,
            length,
            16
        );

        const branch = new THREE.Mesh(geometry, this.barkMaterial);
        const tilt = Math.PI / 3.8 + this.random() * Math.PI / 6;

        branch.position.y = startY;
        branch.rotation.z = tilt;
        branch.rotation.y = angle;

        const radiusAtHeight = radius * (1 - (startY / trunkHeight) * 0.3);
        branch.position.x = Math.cos(angle) * radiusAtHeight;
        branch.position.z = Math.sin(angle) * radiusAtHeight;

        const offsetY = Math.sin(tilt) * length / 2;
        const offsetXZ = Math.cos(tilt) * length / 2;
        branch.position.y += offsetY;
        branch.position.x += Math.cos(angle) * offsetXZ;
        branch.position.z += Math.sin(angle) * offsetXZ;

        branch.castShadow = true;
        branch.receiveShadow = true;
        this.group.add(branch);

        if (depth < 4) {
            const numSubs = depth === 0 ? 4 + Math.floor(this.random() * 3) :
                           depth === 1 ? 3 + Math.floor(this.random() * 2) :
                           2 + Math.floor(this.random() * 2);

            for (let i = 0; i < numSubs; i++) {
                const subAngle = angle + (this.random() - 0.5) * Math.PI / 1.3;
                const endY = startY + Math.sin(tilt) * length * (0.5 + this.random() * 0.4);
                this.createBranch(endY, subAngle, branchRadius, depth + 1, trunkHeight);
            }
        }
    }

    createScatteredFoliage(trunkHeight) {
        const leafColors = [
            0x2d5016, 0x3a6b1f, 0x4d7c26, 0x2a4a15,
            0x355e1a, 0x416d20, 0x38621d, 0x2f5518,
            0x426e21, 0x314f19
        ];

        // Create MANY individual leaves scattered naturally
        const numLeaves = 400 + Math.floor(this.random() * 300);

        for (let i = 0; i < numLeaves; i++) {
            const angle = this.random() * Math.PI * 2;
            const distance = this.random() * 10;
            const height = trunkHeight * (0.45 + this.random() * 0.5);

            // Vary leaf sizes
            const size = 0.8 + this.random() * 1.2;

            const leafGeom = new THREE.PlaneGeometry(size, size * 1.6);

            const leafMat = new THREE.MeshStandardMaterial({
                color: leafColors[Math.floor(this.random() * leafColors.length)],
                roughness: 0.9,
                metalness: 0.0,
                side: THREE.DoubleSide
            });

            const leaf = new THREE.Mesh(leafGeom, leafMat);

            leaf.position.set(
                Math.cos(angle) * distance,
                height + (this.random() - 0.5) * 4,
                Math.sin(angle) * distance
            );

            leaf.rotation.set(
                (this.random() - 0.5) * Math.PI,
                this.random() * Math.PI * 2,
                (this.random() - 0.5) * Math.PI
            );

            leaf.castShadow = true;
            leaf.receiveShadow = true;
            this.group.add(leaf);
        }
    }

    getGroup() {
        return this.group;
    }
}

// Realistic forest floor
function createRealisticForestFloor() {
    const size = 500;
    const segments = 150;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    const positions = geometry.attributes.position;
    const colors = [];

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        let height = 0;
        height += Math.sin(x * 0.006) * Math.cos(z * 0.006) * 4;
        height += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1.2;
        height += Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.4;
        height += (Math.random() - 0.5) * 0.6;

        positions.setY(i, height);

        const r = Math.random();
        let color;

        if (r < 0.15) {
            color = new THREE.Color(0x1a0f08); // Very dark soil
        } else if (r < 0.35) {
            color = new THREE.Color(0x2d1f12); // Dark brown
        } else if (r < 0.5) {
            color = new THREE.Color(0x3d2f1f); // Medium brown
        } else if (r < 0.65) {
            color = new THREE.Color(0x4a3825); // Lighter brown
        } else if (r < 0.8) {
            color = new THREE.Color(0x2d3f18); // Dark moss
        } else {
            color = new THREE.Color(0x5a4a30); // Leaf litter
        }

        color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.15);
        colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.98,
        metalness: 0.0
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Add undergrowth
function createDetailedUndergrowth() {
    // More ferns
    for (let i = 0; i < 150; i++) {
        const x = (Math.random() - 0.5) * 450;
        const z = (Math.random() - 0.5) * 450;
        createFern(x, z);
    }

    // More rocks
    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * 450;
        const z = (Math.random() - 0.5) * 450;
        createRock(x, z);
    }

    // More bushes
    for (let i = 0; i < 120; i++) {
        const x = (Math.random() - 0.5) * 450;
        const z = (Math.random() - 0.5) * 450;
        createBush(x, z);
    }
}

function createFern(x, z) {
    const group = new THREE.Group();
    const numFronds = 8 + Math.floor(Math.random() * 5);

    for (let i = 0; i < numFronds; i++) {
        const angle = (i / numFronds) * Math.PI * 2;
        const length = 1.8 + Math.random() * 1.2;

        const geometry = new THREE.PlaneGeometry(0.6, length);
        const material = new THREE.MeshStandardMaterial({
            color: 0x1a4510,
            roughness: 0.85,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        const frond = new THREE.Mesh(geometry, material);
        frond.position.x = Math.cos(angle) * 0.3;
        frond.position.y = length / 2 + 0.4;
        frond.position.z = Math.sin(angle) * 0.3;
        frond.rotation.z = Math.PI / 3;
        frond.rotation.y = angle;
        frond.castShadow = true;

        group.add(frond);
    }

    group.position.set(x, 0, z);
    scene.add(group);
}

function createRock(x, z) {
    const size = 0.6 + Math.random() * 2.5;
    const geometry = new THREE.DodecahedronGeometry(size, 0);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        const py = positions.getY(i);
        const pz = positions.getZ(i);
        const noise = 0.65 + Math.random() * 0.7;
        positions.setX(i, px * noise);
        positions.setY(i, py * noise);
        positions.setZ(i, pz * noise);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x3a3a3a).offsetHSL(0, 0, Math.random() * 0.25 - 0.12),
        roughness: 0.95,
        metalness: 0.0
    });

    const rock = new THREE.Mesh(geometry, material);
    rock.position.set(x, size * 0.45, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;

    scene.add(rock);
}

function createBush(x, z) {
    const group = new THREE.Group();
    const numLeaves = 30 + Math.floor(Math.random() * 25);

    for (let i = 0; i < numLeaves; i++) {
        const size = 0.4 + Math.random() * 0.4;
        const geometry = new THREE.PlaneGeometry(size, size * 1.2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x2a5018,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        const leaf = new THREE.Mesh(geometry, material);

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 0.9;

        leaf.position.set(
            Math.cos(angle) * dist,
            0.5 + Math.random() * 0.8,
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
function generateRealisticForest() {
    const treePositions = [];
    const numTrees = 40;
    const radius = 180;

    console.log('Generating trees with high-quality bark and scattered foliage...');

    for (let i = 0; i < numTrees; i++) {
        const angle = (i / numTrees) * Math.PI * 2 + Math.random() * 1.5;
        const distance = 25 + Math.random() * radius;

        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        let tooClose = false;
        for (const pos of treePositions) {
            const dx = pos.x - x;
            const dz = pos.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < 18) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            treePositions.push({ x, z });
            const tree = new RealisticForestTree(x, z, Math.random() * 10000);
            scene.add(tree.getGroup());
            console.log(`Tree ${i + 1}/${numTrees} created`);
        }
    }

    createDetailedUndergrowth();
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

// Animation
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
console.log('=== Creating Photorealistic Forest ===');
console.log('Resolution: 1024x2048 bark textures');
console.log('Detail level: 32 segments per trunk');
console.log('400-700 individual leaves per tree');
createRealisticForestFloor();
generateRealisticForest();
document.getElementById('loading').style.display = 'none';
console.log('=== Forest Complete! ===');
animate();
