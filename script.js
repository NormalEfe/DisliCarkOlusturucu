
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class GearGenerator {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentGear = null;
        this.container = document.getElementById('three-container');
        
        this.init();
        this.setupEventListeners();
        this.generateGear(); // Generate initial gear
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(50, 50, 50);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Create controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;

        // Add lights
        this.setupLighting();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start render loop
        this.animate();
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Point light
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-50, 50, 50);
        this.scene.add(pointLight);
    }

    setupEventListeners() {
        document.getElementById('generateBtn').addEventListener('click', () => this.generateGear());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetParameters());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportSTL());

        // Gear type change handler
        document.getElementById('gearType').addEventListener('change', (e) => {
            this.toggleLayeredGearControls(e.target.value === 'crown');
            clearTimeout(this.updateTimeout);
            this.updateTimeout = setTimeout(() => this.generateGear(), 300);
        });

        // Real-time updates
        const inputs = ['gearType', 'toothCount', 'outerDiameter', 'innerHoleDiameter', 'width', 'scaleX', 'scaleY', 'scaleZ', 'topToothCount', 'topDiameter', 'topWidth', 'topOffset'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    clearTimeout(this.updateTimeout);
                    this.updateTimeout = setTimeout(() => this.generateGear(), 300);
                });
            }
        });
        
        // Initialize layered gear controls visibility
        this.toggleLayeredGearControls(false);
    }

    toggleLayeredGearControls(show) {
        const layeredControls = document.querySelector('.layered-gear-controls');
        if (layeredControls) {
            layeredControls.style.display = show ? 'block' : 'none';
        }
    }

    getParameters() {
        return {
            gearType: document.getElementById('gearType').value,
            toothCount: parseInt(document.getElementById('toothCount').value),
            outerDiameter: parseFloat(document.getElementById('outerDiameter').value),
            innerHoleDiameter: parseFloat(document.getElementById('innerHoleDiameter').value),
            width: parseFloat(document.getElementById('width').value),
            scaleX: parseFloat(document.getElementById('scaleX').value),
            scaleY: parseFloat(document.getElementById('scaleY').value),
            scaleZ: parseFloat(document.getElementById('scaleZ').value),
            // Top gear parameters for layered gear
            topToothCount: parseInt(document.getElementById('topToothCount')?.value || 16),
            topDiameter: parseFloat(document.getElementById('topDiameter')?.value || 40),
            topWidth: parseFloat(document.getElementById('topWidth')?.value || 4),
            topOffset: parseFloat(document.getElementById('topOffset')?.value || 80)
        };
    }

    calculateGearParameters(params) {
        const module = params.outerDiameter / (params.toothCount + 2);
        const pitchDiameter = module * params.toothCount;
        const toothDepth = 2.25 * module;
        
        return {
            module: module.toFixed(2),
            pitchDiameter: pitchDiameter.toFixed(2),
            toothDepth: toothDepth.toFixed(2),
            pitchRadius: pitchDiameter / 2,
            outerRadius: params.outerDiameter / 2,
            innerRadius: params.innerHoleDiameter / 2
        };
    }

    updateCalculatedValues(calculated) {
        document.getElementById('module').textContent = calculated.module + ' mm';
        document.getElementById('toothDepth').textContent = calculated.toothDepth + ' mm';
        document.getElementById('pitchDiameter').textContent = calculated.pitchDiameter + ' mm';
    }

    createGearGeometry(params, calculated) {
        switch (params.gearType) {
            case 'spur':
                return this.createSpurGear(params, calculated);
            case 'helical':
                return this.createHelicalGear(params, calculated);
            case 'bevel':
                return this.createBevelGear(params, calculated);
            case 'crown':
                return this.createCrownGear(params, calculated);
            case 'internal':
                return this.createInternalGear(params, calculated);
            default:
                return this.createSpurGear(params, calculated);
        }
    }

    createSpurGear(params, calculated) {
        const toothCount = Math.max(8, Math.min(100, params.toothCount));
        const outerRadius = Math.max(5, calculated.outerRadius);
        const pitchRadius = Math.max(3, calculated.pitchRadius);
        const innerRadius = Math.max(0, Math.min(pitchRadius - 2, calculated.innerRadius));
        const width = Math.max(1, params.width);

        const points = [];
        const angleStep = (Math.PI * 2) / toothCount;

        for (let i = 0; i < toothCount; i++) {
            const baseAngle = i * angleStep;
            const toothWidth = angleStep * 0.4;
            
            const rootAngle1 = baseAngle - toothWidth / 2;
            const rootAngle2 = baseAngle + toothWidth / 2;
            const tipAngle1 = baseAngle - toothWidth / 3;
            const tipAngle2 = baseAngle + toothWidth / 3;
            
            points.push(new THREE.Vector2(Math.cos(rootAngle1) * pitchRadius, Math.sin(rootAngle1) * pitchRadius));
            points.push(new THREE.Vector2(Math.cos(tipAngle1) * outerRadius, Math.sin(tipAngle1) * outerRadius));
            points.push(new THREE.Vector2(Math.cos(tipAngle2) * outerRadius, Math.sin(tipAngle2) * outerRadius));
            points.push(new THREE.Vector2(Math.cos(rootAngle2) * pitchRadius, Math.sin(rootAngle2) * pitchRadius));
        }

        const gearShape = new THREE.Shape(points);
        
        if (innerRadius > 0) {
            const holePoints = [];
            for (let i = 0; i < 32; i++) {
                const angle = (i / 32) * Math.PI * 2;
                holePoints.push(new THREE.Vector2(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius));
            }
            gearShape.holes.push(new THREE.Path(holePoints));
        }

        return new THREE.ExtrudeGeometry(gearShape, { depth: width, bevelEnabled: false });
    }

    createHelicalGear(params, calculated) {
        const baseGeometry = this.createSpurGear(params, calculated);
        const helixAngle = 0.3; // 30 degrees helix
        
        const vertices = baseGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const z = vertices[i + 2];
            const twist = (z / params.width) * helixAngle;
            const x = vertices[i];
            const y = vertices[i + 1];
            vertices[i] = x * Math.cos(twist) - y * Math.sin(twist);
            vertices[i + 1] = x * Math.sin(twist) + y * Math.cos(twist);
        }
        
        baseGeometry.attributes.position.needsUpdate = true;
        return baseGeometry;
    }

    createBevelGear(params, calculated) {
        const baseGeometry = this.createSpurGear(params, calculated);
        const vertices = baseGeometry.attributes.position.array;
        const coneAngle = 0.5; // 30 degrees cone
        
        for (let i = 0; i < vertices.length; i += 3) {
            const z = vertices[i + 2];
            const scale = 1 - (z / params.width) * coneAngle;
            vertices[i] *= scale;
            vertices[i + 1] *= scale;
        }
        
        baseGeometry.attributes.position.needsUpdate = true;
        return baseGeometry;
    }

    createCrownGear(params, calculated) {
        const toothCount = Math.max(8, Math.min(100, params.toothCount));
        const outerRadius = Math.max(5, calculated.outerRadius);
        const pitchRadius = Math.max(3, calculated.pitchRadius);
        const innerRadius = Math.max(0, Math.min(pitchRadius - 2, calculated.innerRadius));
        const width = Math.max(1, params.width);

        // Create base gear first
        const baseGear = this.createSpurGear(params, calculated);
        
        // Create top gear with user-defined parameters
        const topGearParams = {
            ...params,
            toothCount: Math.max(8, Math.min(100, params.topToothCount)),
            outerDiameter: Math.max(10, Math.min(params.outerDiameter * 0.95, params.topDiameter)),
            width: Math.max(1, Math.min(width * 0.8, params.topWidth)),
            innerHoleDiameter: params.innerHoleDiameter // Same inner hole
        };
        const topCalculated = this.calculateGearParameters(topGearParams);
        const topGear = this.createSpurGear(topGearParams, topCalculated);
        
        // Position top gear based on user offset
        const topGearMatrix = new THREE.Matrix4();
        const offsetZ = (width * params.topOffset) / 100; // Convert percentage to position
        topGearMatrix.makeTranslation(0, 0, offsetZ);
        topGear.applyMatrix4(topGearMatrix);
        
        // Merge geometries
        const mergedGeometry = new THREE.BufferGeometry();
        const basePositions = baseGear.attributes.position.array;
        const topPositions = topGear.attributes.position.array;
        
        // Combine position arrays
        const totalVertices = basePositions.length + topPositions.length;
        const positions = new Float32Array(totalVertices);
        positions.set(basePositions, 0);
        positions.set(topPositions, basePositions.length);
        
        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Handle indices
        let indices = [];
        if (baseGear.index) {
            indices = indices.concat(Array.from(baseGear.index.array));
        }
        if (topGear.index) {
            const topIndices = Array.from(topGear.index.array);
            const baseVertexCount = basePositions.length / 3;
            const offsetTopIndices = topIndices.map(index => index + baseVertexCount);
            indices = indices.concat(offsetTopIndices);
        }
        
        if (indices.length > 0) {
            mergedGeometry.setIndex(indices);
        }
        
        // Compute normals
        mergedGeometry.computeVertexNormals();
        
        // Clean up
        baseGear.dispose();
        topGear.dispose();
        
        return mergedGeometry;
    }

    createInternalGear(params, calculated) {
        const toothCount = Math.max(8, Math.min(100, params.toothCount));
        const outerRadius = Math.max(5, calculated.outerRadius);
        const pitchRadius = Math.max(3, calculated.pitchRadius);
        const innerRadius = Math.max(pitchRadius + 2, outerRadius + 5); // Internal gear has larger inner radius
        const width = Math.max(1, params.width);

        const points = [];
        const angleStep = (Math.PI * 2) / toothCount;

        // Create outer circle
        for (let i = 0; i < 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            points.push(new THREE.Vector2(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius));
        }

        const gearShape = new THREE.Shape(points);

        // Create internal teeth as holes
        for (let i = 0; i < toothCount; i++) {
            const baseAngle = i * angleStep;
            const toothWidth = angleStep * 0.4;
            
            const toothPoints = [];
            const segments = 8;
            for (let j = 0; j < segments; j++) {
                const angle = baseAngle - toothWidth/2 + (j / (segments-1)) * toothWidth;
                const radius = pitchRadius + Math.sin(j / (segments-1) * Math.PI) * (outerRadius - pitchRadius);
                toothPoints.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
            }
            gearShape.holes.push(new THREE.Path(toothPoints));
        }

        return new THREE.ExtrudeGeometry(gearShape, { depth: width, bevelEnabled: false });
    }

    generateGear() {
        const params = this.getParameters();
        const calculated = this.calculateGearParameters(params);
        
        // Update UI with calculated values
        this.updateCalculatedValues(calculated);

        // Remove existing gear
        if (this.currentGear) {
            this.scene.remove(this.currentGear);
            this.currentGear.geometry.dispose();
            this.currentGear.material.dispose();
        }

        // Create new gear geometry
        const geometry = this.createGearGeometry(params, calculated);
        
        // Center the geometry
        geometry.center();

        // Create material
        const material = new THREE.MeshLambertMaterial({
            color: 0x3498db,
            side: THREE.DoubleSide
        });

        // Create mesh
        this.currentGear = new THREE.Mesh(geometry, material);
        this.currentGear.castShadow = true;
        this.currentGear.receiveShadow = true;

        // Apply scale
        this.currentGear.scale.set(params.scaleX, params.scaleY, params.scaleZ);

        // Add to scene
        this.scene.add(this.currentGear);

        // Store geometry for export
        this.exportGeometry = geometry.clone();
        this.exportGeometry.scale(params.scaleX, params.scaleY, params.scaleZ);
    }

    resetParameters() {
        document.getElementById('gearType').value = 'spur';
        document.getElementById('toothCount').value = 24;
        document.getElementById('outerDiameter').value = 25.58;
        document.getElementById('innerHoleDiameter').value = 5;
        document.getElementById('width').value = 8;
        document.getElementById('scaleX').value = 1;
        document.getElementById('scaleY').value = 1;
        document.getElementById('scaleZ').value = 1;
        
        // Reset top gear parameters to match the image
        document.getElementById('topToothCount').value = 12;
        document.getElementById('topDiameter').value = 13.33;
        document.getElementById('topWidth').value = 3;
        document.getElementById('topOffset').value = 100;
        
        // Hide layered gear controls
        this.toggleLayeredGearControls(false);
        
        this.generateGear();
    }

    exportSTL() {
        if (!this.currentGear) {
            alert('Önce bir dişli oluşturun!');
            return;
        }

        try {
            // Get geometry and validate
            const geometry = this.exportGeometry || this.currentGear.geometry;
            
            if (!geometry || !geometry.attributes.position) {
                alert('Geometry bulunamadı!');
                return;
            }

            const vertices = geometry.attributes.position.array;
            const indices = geometry.index ? geometry.index.array : null;

            // Validate vertices
            for (let i = 0; i < vertices.length; i++) {
                if (!isFinite(vertices[i]) || isNaN(vertices[i])) {
                    alert('Geçersiz geometry! Parametreleri kontrol edin.');
                    return;
                }
            }

            let stlString = 'solid gear\n';
            let triangleCount = 0;

            if (indices) {
                // Use indices
                for (let i = 0; i < indices.length; i += 3) {
                    const i1 = indices[i] * 3;
                    const i2 = indices[i + 1] * 3;
                    const i3 = indices[i + 2] * 3;

                    // Validate indices
                    if (i1 >= vertices.length || i2 >= vertices.length || i3 >= vertices.length) {
                        continue;
                    }

                    const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
                    const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);
                    const v3 = new THREE.Vector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);

                    // Skip degenerate triangles
                    const area = new THREE.Vector3().crossVectors(
                        new THREE.Vector3().subVectors(v2, v1),
                        new THREE.Vector3().subVectors(v3, v1)
                    ).length();
                    
                    if (area < 0.0001) continue;

                    const normal = new THREE.Vector3().crossVectors(
                        new THREE.Vector3().subVectors(v2, v1),
                        new THREE.Vector3().subVectors(v3, v1)
                    ).normalize();

                    // Validate normal
                    if (isNaN(normal.x) || isNaN(normal.y) || isNaN(normal.z)) {
                        normal.set(0, 0, 1); // Default normal
                    }

                    stlString += `  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
                    stlString += `    outer loop\n`;
                    stlString += `      vertex ${v1.x.toFixed(6)} ${v1.y.toFixed(6)} ${v1.z.toFixed(6)}\n`;
                    stlString += `      vertex ${v2.x.toFixed(6)} ${v2.y.toFixed(6)} ${v2.z.toFixed(6)}\n`;
                    stlString += `      vertex ${v3.x.toFixed(6)} ${v3.y.toFixed(6)} ${v3.z.toFixed(6)}\n`;
                    stlString += `    endloop\n`;
                    stlString += `  endfacet\n`;
                    triangleCount++;
                }
            } else {
                // No indices, use vertices directly
                for (let i = 0; i < vertices.length; i += 9) {
                    if (i + 8 >= vertices.length) break;

                    const v1 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
                    const v2 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
                    const v3 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);

                    const normal = new THREE.Vector3().crossVectors(
                        new THREE.Vector3().subVectors(v2, v1),
                        new THREE.Vector3().subVectors(v3, v1)
                    ).normalize();

                    if (isNaN(normal.x) || isNaN(normal.y) || isNaN(normal.z)) {
                        normal.set(0, 0, 1);
                    }

                    stlString += `  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
                    stlString += `    outer loop\n`;
                    stlString += `      vertex ${v1.x.toFixed(6)} ${v1.y.toFixed(6)} ${v1.z.toFixed(6)}\n`;
                    stlString += `      vertex ${v2.x.toFixed(6)} ${v2.y.toFixed(6)} ${v2.z.toFixed(6)}\n`;
                    stlString += `      vertex ${v3.x.toFixed(6)} ${v3.y.toFixed(6)} ${v3.z.toFixed(6)}\n`;
                    stlString += `    endloop\n`;
                    stlString += `  endfacet\n`;
                    triangleCount++;
                }
            }

            stlString += 'endsolid gear\n';

            if (triangleCount === 0) {
                alert('STL dosyası oluşturulamadı! Geometry boş.');
                return;
            }

            console.log(`STL exported with ${triangleCount} triangles`);

            // Download file
            const blob = new Blob([stlString], { type: 'application/sla' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gear_${Date.now()}.stl`;
            link.click();
            URL.revokeObjectURL(url);

            alert(`STL dosyası başarıyla oluşturuldu! (${triangleCount} triangle)`);

        } catch (error) {
            console.error('STL export error:', error);
            alert('STL dışa aktarımında hata oluştu: ' + error.message);
        }
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GearGenerator();
});
