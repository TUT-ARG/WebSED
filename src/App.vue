<template>
  <div id="app">
    <header>
      <h1>Audio Analysis Application</h1>
    </header>
    <main>
      <AudioUpload @audio-files-uploaded="handleAudioFilesUploaded" />
      <AudioProcessor
        ref="audioProcessor"
        :audioFiles="audioFiles"
        :selectedMode="selectedMode"
      />
    </main>
  </div>
</template>

<script>
import AudioUpload from './components/AudioUpload.vue';
import AudioProcessor from './components/AudioProcessor.vue';

export default {
  components: {
    AudioUpload,
    AudioProcessor,
  },
  data() {
    return {
      selectedMode: 'tagging', // Default to Audio Tagging
      audioFiles: [], // Store multiple audio files here
    };
  },
  methods: {
    handleAudioFilesUploaded(files) {
      this.audioFiles = files; // Set audioFiles to the list of uploaded files
      this.$refs.audioProcessor.setAudioData(files);
    },
  },
};
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
}

header {
  background-color: #42b983;
  color: white;
  padding: 20px;
  font-size: 36px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

main {
  padding: 20px;
  background-color: #f4f4f4;
  min-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
