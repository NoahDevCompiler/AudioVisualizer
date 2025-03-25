import p5 from 'p5'
import { Howl, Howler } from 'howler';

export default function createP5Sketch(containerId) {
    const sketch = (p) => {
        let sound
        let analyser, frequencyData;
        let bassAccumulator = 0;

        let particles = [];
        let totalParticles = 10000;
        let baseRadius = 300; // Reduced base radius
        let noiseScale = 0.2;
        let deformationFactor = 0;
        let particleDeform = 0;
        let bounceFactor = 0;

        let theta;
        let phi;
        let x;
        let y;
        let z;

        let bass = 0;
        
        // Dodecahedron parameters
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const dodecahedronVertices = [

            [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
            [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
            [0, 1/goldenRatio, goldenRatio], [0, 1/goldenRatio, -goldenRatio],
            [0, -1/goldenRatio, goldenRatio], [0, -1/goldenRatio, -goldenRatio],
            [1/goldenRatio, goldenRatio, 0], [1/goldenRatio, -goldenRatio, 0],
            [-1/goldenRatio, goldenRatio, 0], [-1/goldenRatio, -goldenRatio, 0],
            [goldenRatio, 0, 1/goldenRatio], [goldenRatio, 0, -1/goldenRatio],
            [-goldenRatio, 0, 1/goldenRatio], [-goldenRatio, 0, -1/goldenRatio]
        ].map(v => {
            // Normalize the vertices to unit length
            const length = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
            return [v[0]/length, v[1]/length, v[2]/length];
        });

        var red = 255;
        var green = 255;
        var blue = 255;

        let bassHistory = [];
        let maxDeformationRadius = baseRadius * 1.2; // Maximum allowed radius during deformation

        p.setup = () => {
            p.createCanvas(p.displayWidth, p.displayHeight, p.WEBGL).parent(containerId);
            p.angleMode(p.DEGREES);

            sound = new Howl({
                src: ['src/assets/burnin.mp3'],
                volume: 0.5,
                loop: true,
                onload: setupAudioAnalyser,
            });

            // Initialize particles on a sphere
            for (let i = 0; i < totalParticles; i++) {
                theta = p.random(0, 360);
                phi = p.random(0, 360);

                x = baseRadius * p.sin(theta) * p.cos(phi);
                y = baseRadius * p.sin(theta) * p.sin(phi);
                z = baseRadius * p.cos(theta);

                particles.push({ 
                    x, y, z, 
                    theta, phi,
                    originalX: x,
                    originalY: y,
                    originalZ: z,
                    targetX: x,
                    targetY: y,
                    targetZ: z
                });
            }
        };

        function setupAudioAnalyser() {
            let audioCtx = Howler.ctx;
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 4096;
            let source = sound._sounds[0]._node;
            source.connect(analyser);

            frequencyData = new Uint8Array(analyser.frequencyBinCount);
        }

        function findClosestDodecahedronVertex(x, y, z) {
            let closestVertex = null;
            let minDistance = Infinity;
            
            // Normalize input vector
            const inputLength = Math.sqrt(x*x + y*y + z*z);
            const nx = x / inputLength;
            const ny = y / inputLength;
            const nz = z / inputLength;
            
            for (let vertex of dodecahedronVertices) {
                const [vx, vy, vz] = vertex;
                const dx = nx - vx;
                const dy = ny - vy;
                const dz = nz - vz;
                const distance = dx*dx + dy*dy + dz*dz;
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestVertex = vertex;
                }
            }
            
            return closestVertex;
        }

        p.mousePressed = () => {
            if (!sound) return;

            if (sound.state() !== 'loaded') {
                console.log('Sound noch nicht geladen');
                return;
            }

            Howler.ctx.resume().then(() => {
                if (!sound.playing()) {
                    sound.play();
                    console.log('Sound gestartet');
                } else {
                    sound.pause();
                    console.log('Sound pausiert');
                }
            });
        };

        p.draw = () => {
            let fastRotation = p.frameCount * 0.5;

            p.camera(200, -400, 800);
            p.background(0, 0);
            p.rotateY(fastRotation);

            p.scale(1.5); // Reduced scale
            p.noFill();
            p.strokeWeight(2);

            p.beginShape(p.POINTS);

            if (analyser) {
                analyser.getByteFrequencyData(frequencyData);
                bass = frequencyData[0] * 0.5; // Reduced bass multiplier
                let lowMid = frequencyData[2] * 0.3;
                let mid = frequencyData[5] * 0.2;
                let midHigh = frequencyData[7] * 0.1;
                let high = frequencyData[10] * 0.05;

                bassHistory.push(bass);

                if (bassHistory.length > 30) {
                    bassHistory.shift();
                }

                // Calculate average bass
                let avgBass = bassHistory.reduce((a, b) => a + b, 0) / bassHistory.length;
                
                // Smoother deformation factor calculation
                let targetDeformation = (bass + lowMid + mid + midHigh + high) / 255.0;
                targetDeformation = p.constrain(targetDeformation, 0, 0.8); // Limit max deformation
                
                // Apply smoothing
                deformationFactor += (targetDeformation - deformationFactor) * 0.1;

                // Color changes
                if (bass > avgBass * 1.5) {
                    let targetRed = Math.max(255 - bass * 2, 0);
                    let targetGreen = Math.max(255 - bass * 2, 0);
                    let targetBlue = 255;

                    red = p.lerp(red, targetRed, 0.1);
                    green = p.lerp(green, targetGreen, 0.1);
                    blue = p.lerp(blue, targetBlue, 0.1);
                } else {
                    // Gradually return to white
                    red = p.lerp(red, 255, 0.02);
                    green = p.lerp(green, 255, 0.02);
                    blue = p.lerp(blue, 255, 0.02);
                }
            }

            for (let i = 0; i < particles.length; i++) {
                let particle = particles[i];
                
                // Find closest dodecahedron vertex (normalized)
                const [vx, vy, vz] = findClosestDodecahedronVertex(
                    particle.originalX, 
                    particle.originalY, 
                    particle.originalZ
                );
                
                // Calculate target position (scaled to our base radius)
                particle.targetX = vx * baseRadius;
                particle.targetY = vy * baseRadius;
                particle.targetZ = vz * baseRadius;
                
                // Interpolate with constrained radius
                let newX = p.lerp(particle.originalX, particle.targetX, deformationFactor);
                let newY = p.lerp(particle.originalY, particle.targetY, deformationFactor);
                let newZ = p.lerp(particle.originalZ, particle.targetZ, deformationFactor);
                
                // Ensure we don't exceed max radius
                const currentRadius = Math.sqrt(newX*newX + newY*newY + newZ*newZ);
                if (currentRadius > maxDeformationRadius) {
                    const scaleFactor = maxDeformationRadius / currentRadius;
                    newX *= scaleFactor;
                    newY *= scaleFactor;
                    newZ *= scaleFactor;
                }
                
                // Add subtle noise during transition
                if (deformationFactor > 0 && deformationFactor < 1) {
                    const noiseAmount = 5 * deformationFactor * (1 - deformationFactor);
                    newX += p.random(-noiseAmount, noiseAmount);
                    newY += p.random(-noiseAmount, noiseAmount);
                    newZ += p.random(-noiseAmount, noiseAmount);
                }
                
                p.vertex(newX, newY, newZ);
            }

            p.stroke(red, green, blue);
            p.endShape(p.POINTS);
        };

        p.windowResized = () => {
            p.resizeCanvas(p.displayWidth, p.displayHeight);
        };
    };

    new p5(sketch);
}