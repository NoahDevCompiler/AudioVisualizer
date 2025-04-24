import p5 from 'p5';
import { Howl, Howler } from 'howler';

export default function createP5Sketch(containerId) {
  const sketch = (p) => {
    let particles = [];
    let totalParticles = 100000;
    let radius = 350;

    let sound;
    let analyser, frequencyData;
    let bass = 0;
    let bassHistory = [];
    let deformationFactor = 0;
    let bounceFactor = 0;
    let particleDeform = 0;

    let bassPeak = 0;
    let bassPeakDecay = 0.9;
    let bassImpact = 0;

    let waveMovement = 0;

    let red = 255, green = 255, blue = 255;

    p.setup = () => {
      p.createCanvas(p.displayWidth, p.displayHeight, p.WEBGL).parent(containerId);
      p.angleMode(p.DEGREES);
      p.noFill();

      sound = new Howl({
        src: ['src/assets/beat.mp3'],
        volume: 0.5,
        loop: true,
        onload: setupAudioAnalyser
      });

      generateParticles();
    };

    function generateParticles() {
      for (let i = 0; i < totalParticles; i++) {
        let u = Math.random();
        let v = Math.random();

        let theta = 2 * Math.PI * u;
        let phi = Math.acos(2 * v - 1);

        let x = radius * Math.sin(phi) * Math.cos(theta);
        let y = radius * Math.sin(phi) * Math.sin(theta);
        let z = radius * Math.cos(phi);

        particles.push({ x, y, z, theta, phi });
      }
    }

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

      if (sound.state() !== 'loaded') return;

      Howler.ctx.resume().then(() => {
        if (!sound.playing()) sound.play();
        else sound.pause();
      });
    };

    p.draw = () => {
      p.background(0);
      p.rotateY(p.frameCount * 0.3);

      if (analyser) {
        analyser.getByteFrequencyData(frequencyData);
        bass = frequencyData[0] * 500;
        let lowMid = frequencyData[2] * 100;
        let mid = frequencyData[5] * 60;
        let midHigh = frequencyData[7] * 40;
        let high = frequencyData[10] * 25;

        bassHistory.push(bass);
        if (bassHistory.length > 30) bassHistory.shift();

        let avgBass = bassHistory.reduce((a, b) => a + b, 0) / bassHistory.length;
        let maxBass = Math.max(...bassHistory);
        if (bass > avgBass * 1.2) {
          bassImpact = p.map(bass - avgBass, 0, avgBass * 0.5, 0, 1, true);
          bassPeak = bassImpact;
        }
        bassPeak *= bassPeakDecay;



        let smoothness = p.lerp(lowMid, mid, 0.1);
        let targetDeformation = (bass + smoothness + midHigh + high) / 255.0 * 3;

        let stiffness = 0.3;
        let damping = 0.7;

        let velocity = 0;
        let deformation = 0;

        let force = (targetDeformation - deformation) * stiffness;
        velocity = (velocity + force) * damping;
        deformation += velocity;

        deformationFactor = p.lerp(deformationFactor, bassPeak * 15, 0.05);
        bounceFactor = p.lerp(bounceFactor, (frequencyData[10] / 255) * 1.5, 0.05);

        bounceFactor = (high) / 255 * 2;

        waveMovement = Math.sin(p.frameCount * 0.02) * 20;
      }

      p.stroke(red, green, blue);
      p.strokeWeight(0.01);
      p.beginShape(p.POINTS);

      let timeFactor = p.frameCount * 0.01;
      for (let i = 0; i < particles.length; i++) {
        let particle = particles[i];
        let noiseValue = p.noise(
          particle.theta * 5,
          particle.phi * 5,
          timeFactor * 1.2
        );

        let noiseValue1 = p.noise(particle.theta * 5, particle.phi * 5, timeFactor);
        let noiseValue2 = p.noise(particle.theta * 15, particle.phi * 15, timeFactor * 1.5);
        let deform = (noiseValue1 * 0.6 + noiseValue2 * 0.4 - 0.5) * 2 * deformationFactor;
        let lift = p.map(noiseValue, 0, 1, -bounceFactor, bounceFactor);
        let waveFactor = Math.sin(particle.phi * 3 + timeFactor * 0.5) * waveMovement;

        let deformFactor = noiseValue * deform * Math.cos(particle.theta);
        let liftFactor = 1 + lift * Math.sin(particle.phi * 3) * Math.cos(particle.theta * 3);
        let maxDeformFactor = p.map(bass, 0, 500 * 500, 1, 4);

        let newRadius = radius + deformFactor + liftFactor * 8 + waveFactor;

        if (bassImpact > 0.5) {
          let centerPull = p.map(bassImpact, 0, 1, 0.5, 2);
          newRadius * centerPull;
        }
        if (i % 3 == 0) {
          newRadius * maxDeformFactor
        }

        let x = newRadius * Math.sin(particle.phi) * Math.cos(particle.theta);
        let y = newRadius * Math.sin(particle.phi) * Math.sin(particle.theta);
        let z = newRadius * Math.cos(particle.phi);

        p.vertex(x, y, z);
      }

      p.endShape();
    };

    p.windowResized = () => {
      p.resizeCanvas(p.displayWidth, p.displayHeight);
    };
  };

  new p5(sketch);
}
