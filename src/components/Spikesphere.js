import p5 from 'p5'
import { Howl, Howler } from 'howler';

export default function createP5Sketch(containerId) {
    const sketch = (p) => {
        let sound
        let analyser, frequencyData;
        let bassAccumulator = 0;

        let particles = [];
        let totalParticles = 10000;
        let radius = 600;
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

        var red = 255;
        var green = 255;
        var blue = 255;

        let bassHistory = [];

        p.setup = () => {

            p.createCanvas(p.displayWidth, p.displayHeight, p.WEBGL).parent(containerId);
            p.angleMode(p.DEGREES);

            sound = new Howl({
                src: ['src/assets/burnin.mp3'],
                volume: 0.5,
                loop: true,
                onload: setupAudioAnalyser,

            });

            for (let i = 0; i < totalParticles; i++) {
                theta = p.random(0, 360);
                phi = p.random(0, 360);

                x = radius * p.sin(theta) * p.cos(phi);
                y = radius * p.sin(theta) * p.sin(phi);
                z = radius * p.cos(theta);

                particles.push({ x, y, z, theta, phi });
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
            let fastRotation = p.frameCount * 0.5

            p.camera(200, -400, 800);
            p.background(0, 0);
            p.rotateY(fastRotation);

            p.scale(2);
            p.noFill();
            p.strokeWeight(2);

            p.beginShape(p.POINTS);


            //p.stroke(100.8, 40, 255)

            //p.stroke(r, g, b)

            let timeFactor = p.frameCount * 0.01;
            let maxBass = 0;
            let avgBass = 0;

            if (analyser) {
                analyser.getByteFrequencyData(frequencyData);
                bass = frequencyData[0] * 500
                let lowMid = frequencyData[2] * 100;
                let mid = frequencyData[5] * 60;
                let midHigh = frequencyData[7] * 40;
                let high = frequencyData[10] * 25;

                bassHistory.push(bass)

                if (bass > maxBass) {
                    maxBass = bass
                }

                if (bassHistory.length >= 30) {
                    avgBass = bassHistory.reduce((x, y) => x + y);
                    avgBass = avgBass / bassHistory.length;
                    bassHistory.shift()
                }

                let bassThreshold = avgBass * 1.5
                let smoothFactor = 0.1;
                let bassTarget = bass * 2
                let lightBassThreshold = maxBass * 0.8

                //console.log(bass)
                if (bass > lightBassThreshold) {
                    //console.log("jioafsdjioadfjö")
                    //console.log(bassThreshold)
                    let targetRed = Math.max(255 - bass / 500 / 1.5, 0);
                    let targetGreen = Math.max(255 - bass / 500 / 1.5, 0);
                    let targetBlue = 255;

                    red = p.constrain(p.lerp(red, targetRed, 0.1), 0, 255);
                    green = p.constrain(p.lerp(green, targetGreen, 0.1), 0, 255);
                    blue = p.constrain(p.lerp(blue, targetBlue, 0.1), 0, 255);
                    bass = p.lerp(bass, bassTarget, smoothFactor);
                    //bass = bass * (1 - 0.05) + bassTarget * 0.05;

                }
                let smoothness = p.lerp(lowMid, mid, smoothFactor)

                let targetDeformation = (bass + smoothness + lowMid + midHigh + high) / 255.0 * 2;

                if (targetDeformation > deformationFactor) {
                    deformationFactor = targetDeformation;
                }
                else {
                    deformationFactor += (targetDeformation - deformationFactor) * 0.1;
                }

                //High frequnce transform calculation 

                bounceFactor = (high) / 255 * 2;

            }

            for (let i = 0; i < particles.length; i++) {
                let particle = particles[i];

                let noiseValue = p.noise(
                    particle.theta * noiseScale,
                    particle.phi * noiseScale,
                    timeFactor
                );

                let PHIADJ = (1 / (p.sin(particle.phi) ^ (2 * p) + p.cos(particle.phi) ^ (2* p))) ^ (1 / 2 * p)
                let THETAADJ = (1 / (p.sin(particle.theta) ^ (2 * p) + p.cos(particle.theta) ^ (2 * p))) ^ (1 / 2 * p)

                //let deformation = p.map(noiseValue, 0, 1, deformationFactor, -deformationFactor);
                let deformation = p.map(noiseValue, 0, -1, deformationFactor, deformationFactor);
                let deformFactor = 1 + deformation * p.sin(particle.phi * 2) * p.cos(particle.theta * 2);
                let liftFactor = 1 + particleDeform * p.sin(particle.phi * 3) * p.cos(particle.theta * 3);
                let newRadius = radius + deformFactor;
                newRadius += liftFactor * 8

                let newX = 200 * p.sin(particle.theta) * p.cos(particle.phi) * PHIADJ * THETAADJ;
                let newY = 200 * p.sin(particle.theta) * p.sin(particle.phi) * PHIADJ * THETAADJ;
                let newZ = 200 * p.cos(particle.theta) * THETAADJ;
                //high frequence transformation
                particleDeform = p.map(noiseValue, 0, 1, -bounceFactor, bounceFactor)

                let threshold = bass / 255 * 0.1;
                let Intensity = 0;
                let mappedIntense = p.map(Intensity, threshold, 0, 5, -threshold, threshold)
                let liftedRadius = newRadius + liftFactor * 8
               

                p.vertex(newX, newY, newZ);
            }

            p.stroke(red, green, blue)
            p.endShape(p.POINTS);
        };
        p.windowResized = () => {
            p.resizeCanvas(p.displayWidth, p.displayHeight);
        };
    };

    new p5(sketch);
}
