<script setup>
import { ref, onMounted } from "vue";
import createP5Sketch from "./components/Spikesphere.Js"
const canvasRef = ref(null);

onMounted(() => {
  if (canvasRef.value) {
    createP5Sketch(canvasRef.value);
  }
});
</script>

<template>
  <div >
    <div id="home" >
      <Home />
    </div>
    <div class="canva" ref="canvasRef"></div>
  </div>
</template>

<style scoped>
.canva {
  width: 100vw;
  height: 100vh;
  position: fixed; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -50%);
  background: transparent;
  pointer-events: none;
}
#home{
  z-index: 10;
  top: 0;
  left: 42%;
  position: absolute;

}
</style>
