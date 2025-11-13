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
scene.background = new THREE.Color(0x8AB8E6);
scene.fog = new THREE.FogExp2(0x8AB8E6, 0.002);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 0);

// Renderer with enhanced settings
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Realistic Lighting
const ambientLight = new THREE.AmbientLight(0xB5D5F5, 0.4);
scene.add(ambientLight);

// Sunlight - warm morning/afternoon light
const directionalLight = new THREE.DirectionalLight(0xFFF5E6, 2.5);
directionalLight.position.set(100, 150, 100);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -150;
directionalLight.shadow.camera.right = 150;
directionalLight.shadow.camera.top = 150;
directionalLight.shadow.camera.bottom = -150;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// Hemisphere light for sky/ground ambient
const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4A5F3A, 0.6);
scene.add(hemiLight);

// Ground with realistic forest floor
function createForestFloor() {
    const groundSize = 500;
    const segments = 150;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);

    // Create varied terrain with Perlin-like noise
    const positions = groundGeometry.attributes.position;
    const colors = [];

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        // Multi-octave noise for natural terrain
        let height = 0;
        height += Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2;
        height += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
        height += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.2;
        height += (Math.random() - 0.5) * 0.3;

        positions.setY(i, height);

        // Varied forest floor colors (dirt, moss, leaves)
        const variation = Math.random();
        let color;
        if (variation < 0.3) {
            // Dark soil
            color = new THREE.Color().setHSL(0.08, 0.4, 0.15 + Math.random() * 0.1);
        } else if (variation < 0.6) {
            // Moss green
            color = new THREE.Color().setHSL(0.25, 0.5, 0.2 + Math.random() * 0.15);
        } else {
            // Leaf litter brown
            color = new THREE.Color().setHSL(0.08, 0.6, 0.25 + Math.random() * 0.1);
        }
        colors.push(color.r, color.g, color.b);
    }

    groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    positions.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: false
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Create procedural bark texture
function createBarkMaterial(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base bark color
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add bark texture details
    const rng = seededRandom(seed);
    for (let i = 0; i < 300; i++) {
        const x = rng() * canvas.width;
        const y = rng() * canvas.height;
        const width = 2 + rng() * 8;
        const height = 10 + rng() * 40;

        ctx.fillStyle = `rgba(${30 + rng() * 20}, ${20 + rng() * 15}, ${15 + rng() * 10}, ${0.3 + rng() * 0.4})`;
        ctx.fillRect(x, y, width, height);
    }

    // Add vertical lines for bark ridges
    for (let i = 0; i < 20; i++) {
        const x = (i / 20) * canvas.width;
        ctx.strokeStyle = `rgba(25, 18, 13, ${0.4 + rng() * 0.3})`;
        ctx.lineWidth = 1 + rng() * 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);

        for (let y = 0; y < canvas.height; y += 5) {
            ctx.lineTo(x + (rng() - 0.5) * 8, y);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.95,
        metalness: 0.0,
        normalScale: new THREE.Vector2(0.5, 0.5)
    });
}

// Seeded random function
function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

// Photorealistic Procedural Tree
class PhotorealisticTree {
    constructor(x, z, seed = Math.random()) {
        this.group = new THREE.Group();
        this.seed = seed;
        this.random = seededRandom(seed);

        const trunkHeight = 12 + this.random() * 12;
        const trunkRadius = 0.4 + this.random() * 0.5;

        this.barkMaterial = createBarkMaterial(seed);
        this.createTrunk(trunkHeight, trunkRadius);
        this.createBranches(trunkHeight, trunkRadius);

        this.group.position.set(x, 0, z);
    }

    createTrunk(height, radius) {
        const segments = 12;
        const heightSegments = 16;

        // Create slightly irregular trunk
        const trunkGeometry = new THREE.CylinderGeometry(
            radius * 0.6,
            radius * 1.1,
            height,
            segments,
            heightSegments
        );

        // Add irregularities to trunk
        const positions = trunkGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const heightRatio = (y + height / 2) / height;
            const noise = (this.random() - 0.5) * 0.1 * radius * (1 - heightRatio * 0.5);

            const x = positions.getX(i);
            const z = positions.getZ(i);
            const angle = Math.atan2(z, x);

            positions.setX(i, x + Math.cos(angle) * noise);
            positions.setZ(i, z + Math.sin(angle) * noise);
        }
        trunkGeometry.computeVertexNormals();

        const trunk = new THREE.Mesh(trunkGeometry, this.barkMaterial);
        trunk.position.y = height / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        this.group.add(trunk);

        // Add some roots
        this.createRoots(radius);
    }

    createRoots(trunkRadius) {
        const numRoots = 3 + Math.floor(this.random() * 3);

        for (let i = 0; i < numRoots; i++) {
            const angle = (i / numRoots) * Math.PI * 2 + this.random() * 0.5;
            const rootGeometry = new THREE.CylinderGeometry(
                trunkRadius * 0.2,
                trunkRadius * 0.4,
                trunkRadius * 2,
                6
            );

            const root = new THREE.Mesh(rootGeometry, this.barkMaterial);
            root.position.y = trunkRadius * 0.5;
            root.position.x = Math.cos(angle) * trunkRadius * 0.8;
            root.position.z = Math.sin(angle) * trunkRadius * 0.8;
            root.rotation.z = Math.PI / 3 + this.random() * 0.3;
            root.rotation.y = angle;
            root.castShadow = true;
            root.receiveShadow = true;

            this.group.add(root);
        }
    }

    createBranches(trunkHeight, trunkRadius) {
        const numMainBranches = 5 + Math.floor(this.random() * 5);
        const startHeight = trunkHeight * 0.4;

        for (let i = 0; i < numMainBranches; i++) {
            const heightRatio = i / numMainBranches;
            const branchY = startHeight + (trunkHeight - startHeight) * heightRatio;
            const angle = (i / numMainBranches) * Math.PI * 2 + this.random() * 1.0;

            this.createBranch(branchY, angle, trunkRadius, 0, trunkHeight);
        }

        this.createCanopy(trunkHeight, trunkRadius);
    }

    createBranch(startY, angle, parentRadius, depth, trunkHeight) {
        if (depth > 3) return;

        const branchLength = (4 - depth) * (2 + this.random() * 2.5);
        const branchRadius = parentRadius * (0.4 + depth * 0.1);

        const branchGeometry = new THREE.CylinderGeometry(
            branchRadius * 0.4,
            branchRadius,
            branchLength,
            8
        );

        const branch = new THREE.Mesh(branchGeometry, this.barkMaterial);

        const tilt = Math.PI / 5 + this.random() * Math.PI / 6;

        branch.position.y = startY;
        branch.rotation.z = tilt;
        branch.rotation.y = angle;

        const radiusAtHeight = parentRadius * (1 - (startY / trunkHeight) * 0.3);
        branch.position.x = Math.cos(angle) * radiusAtHeight;
        branch.position.z = Math.sin(angle) * radiusAtHeight;

        const offsetY = Math.sin(tilt) * branchLength / 2;
        const offsetXZ = Math.cos(tilt) * branchLength / 2;
        branch.position.y += offsetY;
        branch.position.x += Math.cos(angle) * offsetXZ;
        branch.position.z += Math.sin(angle) * offsetXZ;

        branch.castShadow = true;
        branch.receiveShadow = true;
        this.group.add(branch);

        // Recursively create sub-branches
        if (depth < 3) {
            const numSubBranches = depth === 0 ? 2 + Math.floor(this.random() * 2) : 1 + Math.floor(this.random() * 2);
            for (let i = 0; i < numSubBranches; i++) {
                const subAngle = angle + (this.random() - 0.5) * Math.PI / 2;
                const endY = startY + Math.sin(tilt) * branchLength * (0.6 + this.random() * 0.4);
                this.createBranch(endY, subAngle, branchRadius, depth + 1, trunkHeight);
            }
        }
    }

    createCanopy(trunkHeight, trunkRadius) {
        const numLeafClusters = 30 + Math.floor(this.random() * 30);

        // Multiple shades of green for realistic foliage
        const leafShades = [
            new THREE.Color(0x2d5016),
            new THREE.Color(0x3a6b1f),
            new THREE.Color(0x4d7c26),
            new THREE.Color(0x2a4a15),
            new THREE.Color(0x3f5e23)
        ];

        for (let i = 0; i < numLeafClusters; i++) {
            const leafSize = 1.5 + this.random() * 2;
            const leafGeometry = new THREE.DodecahedronGeometry(leafSize, 0);

            const leafMaterial = new THREE.MeshStandardMaterial({
                color: leafShades[Math.floor(this.random() * leafShades.length)],
                roughness: 0.9,
                metalness: 0.0,
                flatShading: true
            });

            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

            const angle = this.random() * Math.PI * 2;
            const distance = this.random() * 6;
            const height = trunkHeight * 0.5 + this.random() * trunkHeight * 0.5;

            leaf.position.set(
                Math.cos(angle) * distance,
                height,
                Math.sin(angle) * distance
            );

            leaf.rotation.set(
                this.random() * Math.PI,
                this.random() * Math.PI,
                this.random() * Math.PI
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

// Forest undergrowth
function createUndergrowth() {
    // Ferns
    for (let i = 0; i < 150; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        createFern(x, z);
    }

    // Rocks
    for (let i = 0; i < 80; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        createRock(x, z);
    }

    // Small bushes
    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        createBush(x, z);
    }
}

function createFern(x, z) {
    const fernGroup = new THREE.Group();
    const numFronds = 6 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numFronds; i++) {
        const angle = (i / numFronds) * Math.PI * 2;
        const frondGeometry = new THREE.ConeGeometry(0.3, 1.5 + Math.random() * 1, 4);
        const frondMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x1a4d0f),
            roughness: 0.9,
            metalness: 0.0,
            flatShading: true
        });

        const frond = new THREE.Mesh(frondGeometry, frondMaterial);
        frond.position.y = 0.5;
        frond.position.x = Math.cos(angle) * 0.2;
        frond.position.z = Math.sin(angle) * 0.2;
        frond.rotation.z = Math.PI / 4;
        frond.rotation.y = angle;
        frond.castShadow = true;

        fernGroup.add(frond);
    }

    fernGroup.position.set(x, 0, z);
    scene.add(fernGroup);
}

function createRock(x, z) {
    const size = 0.5 + Math.random() * 2;
    const rockGeometry = new THREE.DodecahedronGeometry(size, 0);

    // Randomize vertices for irregular shape
    const positions = rockGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i);
        const py = positions.getY(i);
        const pz = positions.getZ(i);

        const noise = 0.8 + Math.random() * 0.4;
        positions.setX(i, px * noise);
        positions.setY(i, py * noise);
        positions.setZ(i, pz * noise);
    }
    rockGeometry.computeVertexNormals();

    const rockMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x555555).offsetHSL(0, 0, Math.random() * 0.1 - 0.05),
        roughness: 0.95,
        metalness: 0.0,
        flatShading: true
    });

    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, size * 0.3, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;

    scene.add(rock);
}

function createBush(x, z) {
    const bushGroup = new THREE.Group();
    const numSpheres = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numSpheres; i++) {
        const size = 0.4 + Math.random() * 0.6;
        const bushGeometry = new THREE.SphereGeometry(size, 6, 6);
        const bushMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x2a5018),
            roughness: 0.95,
            metalness: 0.0
        });

        const sphere = new THREE.Mesh(bushGeometry, bushMaterial);
        sphere.position.set(
            (Math.random() - 0.5) * 1,
            0.3 + Math.random() * 0.5,
            (Math.random() - 0.5) * 1
        );
        sphere.castShadow = true;
        sphere.receiveShadow = true;

        bushGroup.add(sphere);
    }

    bushGroup.position.set(x, 0, z);
    scene.add(bushGroup);
}

// Generate photorealistic forest
function generateForest() {
    const treePositions = [];
    const numTrees = 60;
    const forestRadius = 200;

    for (let i = 0; i < numTrees; i++) {
        const angle = (i / numTrees) * Math.PI * 2 + Math.random() * 0.8;
        const distance = 15 + Math.random() * forestRadius;

        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        let tooClose = false;
        for (const pos of treePositions) {
            const dx = pos.x - x;
            const dz = pos.z - z;
            if (Math.sqrt(dx * dx + dz * dz) < 10) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) {
            treePositions.push({ x, z });
            const tree = new PhotorealisticTree(x, z, Math.random() * 1000);
            scene.add(tree.getGroup());
        }
    }

    createUndergrowth();
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

    // Ground collision at realistic eye height
    if (camera.position.y < 1.7) {
        gameState.velocity.y = 0;
        camera.position.y = 1.7;
        gameState.canJump = true;
    }

    gameState.prevTime = time;

    renderer.render(scene, camera);
}

// Initialize
createForestFloor();
generateForest();
document.getElementById('loading').style.display = 'none';
animate();
