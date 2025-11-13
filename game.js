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
scene.background = new THREE.Color(0xa8c5dd);
scene.fog = new THREE.Fog(0xa8c5dd, 30, 250);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.body.appendChild(renderer.domElement);

// Enhanced Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff4e0, 3.5);
sunLight.position.set(100, 140, 80);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -150;
sunLight.shadow.camera.right = 150;
sunLight.shadow.camera.top = 150;
sunLight.shadow.camera.bottom = -150;
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.bias = -0.0002;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xb4d4ff, 1.2);
fillLight.position.set(-80, 60, -60);
scene.add(fillLight);

const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4a5236, 1.5);
scene.add(hemiLight);

// Create high-contrast bark texture
function createBarkTexture(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const rng = seededRandom(seed);

    // Much darker base for contrast
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add strong vertical bark lines
    for (let i = 0; i < 50; i++) {
        const x = (i / 50) * canvas.width;
        ctx.strokeStyle = `rgba(${15 + rng() * 20}, ${10 + rng() * 10}, ${8 + rng() * 8}, 0.9)`;
        ctx.lineWidth = 3 + rng() * 5;
        ctx.beginPath();

        for (let y = 0; y < canvas.height; y += 2) {
            const wobble = Math.sin(y * 0.03 + rng() * 10) * 15;
            ctx.lineTo(x + wobble, y);
        }
        ctx.stroke();
    }

    // Add bark detail patches
    for (let i = 0; i < 1000; i++) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const w = 4 + rng() * 10;
        const h = 10 + rng() * 30;
        ctx.fillStyle = `rgba(${20 + rng() * 25}, ${15 + rng() * 15}, ${10 + rng() * 10}, ${0.4 + rng() * 0.5})`;
        ctx.fillRect(x, y, w, h);
    }

    // Add highlights for depth
    for (let i = 0; i < 300; i++) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        ctx.fillStyle = `rgba(${100 + rng() * 60}, ${70 + rng() * 40}, ${40 + rng() * 30}, ${0.15 + rng() * 0.25})`;
        ctx.fillRect(x, y, 2 + rng() * 4, 4 + rng() * 12);
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

// Create leaf texture for better visibility
function createLeafTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Leaf shape
    ctx.fillStyle = '#2d5016';
    ctx.beginPath();
    ctx.ellipse(64, 64, 60, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Darker edges
    ctx.strokeStyle = '#1a3010';
    ctx.lineWidth = 8;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const leafTexture = createLeafTexture();

// Highly detailed photorealistic tree
class PhotorealisticTree {
    constructor(x, z, seed = Math.random()) {
        this.group = new THREE.Group();
        this.seed = seed;
        this.random = seededRandom(seed);

        const trunkHeight = 18 + this.random() * 12;
        const trunkRadius = 0.6 + this.random() * 0.5;

        const barkTexture = createBarkTexture(seed);

        this.barkMaterial = new THREE.MeshStandardMaterial({
            map: barkTexture,
            roughness: 0.95,
            metalness: 0.0,
            color: 0xcccccc  // Lighter multiplier to show texture better
        });

        this.createDetailedTrunk(trunkHeight, trunkRadius);
        this.createDetailedBranches(trunkHeight, trunkRadius);
        this.createRealisticCanopy(trunkHeight);

        this.group.position.set(x, 0, z);
    }

    createDetailedTrunk(height, radius) {
        const geometry = new THREE.CylinderGeometry(
            radius * 0.65,
            radius * 1.3,
            height,
            20,
            24
        );

        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const heightRatio = (y + height / 2) / height;

            if (heightRatio > 0.05) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                const angle = Math.atan2(z, x);

                const noise = (this.random() - 0.5) * 0.12 * radius;
                const bump = Math.sin(heightRatio * 12 + angle * 3) * 0.08 * radius;

                positions.setX(i, x + Math.cos(angle) * (noise + bump));
                positions.setZ(i, z + Math.sin(angle) * (noise + bump));
            }
        }
        geometry.computeVertexNormals();

        const trunk = new THREE.Mesh(geometry, this.barkMaterial);
        trunk.position.y = height / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.group.add(trunk);

        this.createVisibleRoots(radius);
    }

    createVisibleRoots(trunkRadius) {
        const numRoots = 5 + Math.floor(this.random() * 3);

        for (let i = 0; i < numRoots; i++) {
            const angle = (i / numRoots) * Math.PI * 2 + this.random() * 1;
            const rootLength = trunkRadius * (3 + this.random() * 2);

            const geometry = new THREE.CylinderGeometry(
                trunkRadius * 0.12,
                trunkRadius * 0.5,
                rootLength,
                10
            );

            const root = new THREE.Mesh(geometry, this.barkMaterial);
            root.position.y = rootLength * 0.15;
            root.position.x = Math.cos(angle) * trunkRadius * 0.5;
            root.position.z = Math.sin(angle) * trunkRadius * 0.5;
            root.rotation.z = Math.PI / 2.3 + this.random() * 0.5;
            root.rotation.y = angle;
            root.castShadow = true;
            root.receiveShadow = true;

            this.group.add(root);
        }
    }

    createDetailedBranches(trunkHeight, trunkRadius) {
        const numMainBranches = 7 + Math.floor(this.random() * 6);
        const startHeight = trunkHeight * 0.4;

        for (let i = 0; i < numMainBranches; i++) {
            const ratio = i / numMainBranches;
            const branchY = startHeight + (trunkHeight - startHeight) * ratio;
            const angle = (i / numMainBranches) * Math.PI * 2 + this.random() * 1.4;

            this.createBranch(branchY, angle, trunkRadius * 0.6, 0, trunkHeight);
        }
    }

    createBranch(startY, angle, radius, depth, trunkHeight) {
        if (depth > 3) return;

        const length = (4 - depth) * (3 + this.random() * 2.5);
        const branchRadius = radius * (0.55 - depth * 0.1);

        const geometry = new THREE.CylinderGeometry(
            branchRadius * 0.4,
            branchRadius,
            length,
            12
        );

        const branch = new THREE.Mesh(geometry, this.barkMaterial);
        const tilt = Math.PI / 4 + this.random() * Math.PI / 7;

        branch.position.y = startY;
        branch.rotation.z = tilt;
        branch.rotation.y = angle;

        const radiusAtHeight = radius * (1 - (startY / trunkHeight) * 0.35);
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

        if (depth < 3) {
            const numSubs = depth === 0 ? 3 + Math.floor(this.random() * 3) : 2 + Math.floor(this.random() * 2);
            for (let i = 0; i < numSubs; i++) {
                const subAngle = angle + (this.random() - 0.5) * Math.PI / 1.5;
                const endY = startY + Math.sin(tilt) * length * (0.6 + this.random() * 0.35);
                this.createBranch(endY, subAngle, branchRadius, depth + 1, trunkHeight);
            }
        }
    }

    createRealisticCanopy(trunkHeight) {
        const leafColors = [
            0x2d5016, 0x3a6b1f, 0x4d7c26,
            0x2a4a15, 0x355e1a, 0x416d20,
            0x38621d, 0x2f5518
        ];

        // Create larger leaf groups for better appearance
        const numGroups = 35 + Math.floor(this.random() * 30);

        for (let g = 0; g < numGroups; g++) {
            const groupAngle = this.random() * Math.PI * 2;
            const groupDist = this.random() * 8;
            const groupHeight = trunkHeight * (0.5 + this.random() * 0.48);

            // Create a visible cluster
            const clusterSize = 8 + Math.floor(this.random() * 12);

            for (let i = 0; i < clusterSize; i++) {
                const size = 1.2 + this.random() * 1.5;
                const leafGeom = new THREE.PlaneGeometry(size, size * 1.4);

                const leafMat = new THREE.MeshStandardMaterial({
                    color: leafColors[Math.floor(this.random() * leafColors.length)],
                    map: leafTexture,
                    roughness: 0.85,
                    metalness: 0.0,
                    side: THREE.DoubleSide,
                    transparent: true,
                    alphaTest: 0.1
                });

                const leaf = new THREE.Mesh(leafGeom, leafMat);

                const localAngle = (i / clusterSize) * Math.PI * 2;
                const localRad = this.random() * 2;

                leaf.position.set(
                    Math.cos(groupAngle) * groupDist + Math.cos(localAngle) * localRad,
                    groupHeight + (this.random() - 0.5) * 3,
                    Math.sin(groupAngle) * groupDist + Math.sin(localAngle) * localRad
                );

                leaf.rotation.set(
                    (this.random() - 0.5) * Math.PI * 0.8,
                    this.random() * Math.PI * 2,
                    (this.random() - 0.5) * Math.PI * 0.6
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

// Enhanced forest floor
function createForestFloor() {
    const size = 500;
    const segments = 140;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    const positions = geometry.attributes.position;
    const colors = [];

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        let height = 0;
        height += Math.sin(x * 0.007) * Math.cos(z * 0.007) * 3.5;
        height += Math.sin(x * 0.025) * Math.cos(z * 0.025) * 1;
        height += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.3;
        height += (Math.random() - 0.5) * 0.5;

        positions.setY(i, height);

        // Rich forest floor colors
        const r = Math.random();
        let color;

        if (r < 0.2) {
            color = new THREE.Color(0x2a1f15); // Very dark soil
        } else if (r < 0.4) {
            color = new THREE.Color(0x3d2f1f); // Dark brown
        } else if (r < 0.55) {
            color = new THREE.Color(0x4a3825); // Medium brown
        } else if (r < 0.7) {
            color = new THREE.Color(0x354820); // Dark moss
        } else if (r < 0.85) {
            color = new THREE.Color(0x5a4a30); // Leaf litter
        } else {
            color = new THREE.Color(0x3f4f28); // Forest green-brown
        }

        color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);
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

// Forest undergrowth
function createUndergrowth() {
    // Ferns
    for (let i = 0; i < 120; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        createFern(x, z);
    }

    // Rocks
    for (let i = 0; i < 70; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        createRock(x, z);
    }

    // Bushes
    for (let i = 0; i < 90; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        createBush(x, z);
    }
}

function createFern(x, z) {
    const group = new THREE.Group();
    const numFronds = 7 + Math.floor(Math.random() * 4);

    const material = new THREE.MeshStandardMaterial({
        color: 0x1d4a0f,
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < numFronds; i++) {
        const angle = (i / numFronds) * Math.PI * 2;
        const length = 1.5 + Math.random();
        const geometry = new THREE.PlaneGeometry(0.5, length);
        const frond = new THREE.Mesh(geometry, material);

        frond.position.x = Math.cos(angle) * 0.25;
        frond.position.y = length / 2 + 0.3;
        frond.position.z = Math.sin(angle) * 0.25;
        frond.rotation.z = Math.PI / 3.2;
        frond.rotation.y = angle;
        frond.castShadow = true;

        group.add(frond);
    }

    group.position.set(x, 0, z);
    scene.add(group);
}

function createRock(x, z) {
    const size = 0.5 + Math.random() * 2;
    const geometry = new THREE.DodecahedronGeometry(size, 0);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        const py = positions.getY(i);
        const pz = positions.getZ(i);
        const noise = 0.7 + Math.random() * 0.6;
        positions.setX(i, px * noise);
        positions.setY(i, py * noise);
        positions.setZ(i, pz * noise);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x3d3d3d).offsetHSL(0, 0, Math.random() * 0.2 - 0.1),
        roughness: 0.9,
        metalness: 0.0
    });

    const rock = new THREE.Mesh(geometry, material);
    rock.position.set(x, size * 0.4, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;

    scene.add(rock);
}

function createBush(x, z) {
    const group = new THREE.Group();
    const numLeaves = 25 + Math.floor(Math.random() * 20);

    const material = new THREE.MeshStandardMaterial({
        color: 0x2a5018,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    for (let i = 0; i < numLeaves; i++) {
        const geometry = new THREE.PlaneGeometry(
            0.35 + Math.random() * 0.35,
            0.45 + Math.random() * 0.45
        );
        const leaf = new THREE.Mesh(geometry, material);

        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 0.8;

        leaf.position.set(
            Math.cos(angle) * dist,
            0.4 + Math.random() * 0.7,
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
    const numTrees = 45;
    const radius = 180;

    for (let i = 0; i < numTrees; i++) {
        const angle = (i / numTrees) * Math.PI * 2 + Math.random() * 1.2;
        const distance = 20 + Math.random() * radius;

        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        let tooClose = false;
        for (const pos of treePositions) {
            const dx = pos.x - x;
            const dz = pos.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < 15) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            treePositions.push({ x, z });
            const tree = new PhotorealisticTree(x, z, Math.random() * 10000);
            scene.add(tree.getGroup());
        }
    }

    createUndergrowth();
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
console.log('Creating photorealistic forest...');
createForestFloor();
generateForest();
document.getElementById('loading').style.display = 'none';
console.log('Forest ready! Trees have visible bark and individual leaves.');
animate();
