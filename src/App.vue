<template>
  <div id="app">
    <header>
      <h1>Audio Analysis Application</h1>
    </header>
    <main>
      <AudioUpload @audio-uploaded="handleAudioUploaded" />
      <AudioProcessor ref="audioProcessor" />
    </main>
  </div>
</template>

<script>
import AudioUpload from './components/AudioUpload.vue';
import AudioProcessor from './components/AudioProcessor.vue';

export default {
  components: {
    AudioUpload,
    AudioProcessor
  },
  methods: {
    handleAudioUploaded(audioData) {
      this.$refs.audioProcessor.setAudioData(audioData);
    }
  }
};
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
}

header {
  background-color: #42b983; /* Green header background */
  color: white; /* White text color */
  padding: 20px; /* Padding around the header */
  font-size: 36px; /* Larger font size for the header */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Subtle shadow for the header */
}

main {
  padding: 20px;
  background-color: #f4f4f4; /* Light background for the main content */
  min-height: calc(100vh - 100px); /* Ensures the main content takes up the full height */
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>