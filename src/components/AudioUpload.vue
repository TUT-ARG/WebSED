<template>
  <div
    class="upload-container"
    @dragover.prevent
    @dragenter.prevent
    @drop.prevent="handleDrop"
  >
    <p class="upload-instructions">
      Drag and drop your .wav or .mp3 files or directories here, or click to select files.
    </p>
    <input
      type="file"
      ref="fileInput"
      @change="handleFileSelect"
      accept="audio/wav,audio/mpeg"
      multiple
      style="display: none;"
    />
    <button @click="triggerFileInput" class="upload-button">
      Select Files
    </button>
    <p v-if="fileNames.length" class="file-info">
      Uploaded Files: {{ fileNames.join(', ') }}
    </p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fileNames: [],
    };
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    handleFileSelect(event) {
      const files = Array.from(event.target.files);
      this.processFiles(files);
    },
    handleDrop(event) {
      const items = event.dataTransfer.items;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          this.traverseFileTree(item, files);
        }
      }

      // Delay processing to ensure all files are collected
      setTimeout(() => {
        this.processFiles(files);
      }, 1000);
    },
    traverseFileTree(item, files) {
      if (item.isFile) {
        item.file((file) => {
          if (file.type === 'audio/wav' || file.type === 'audio/mpeg') {
            files.push(file);
          }
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries((entries) => {
          for (let i = 0; i < entries.length; i++) {
            this.traverseFileTree(entries[i], files);
          }
        });
      }
    },
    processFiles(files) {
      if (files.length) {
        this.fileNames = files.map((file) => file.name);
        try {
          this.$emit('audio-files-uploaded', files);
          console.log('Files uploaded:', files);
        } catch (error) {
          console.error('Error processing the audio files:', error);
          alert(
            'An error occurred while processing the audio files. Please try again.'
          );
        }
      } else {
        alert('Please upload valid .wav or .mp3 files.');
      }
    },
  },
};
</script>




<style scoped>
.upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #fff; /* White background for contrast */
  border: 2px dashed #42b983; /* Dashed border to indicate drop area */
  border-radius: 8px; /* Rounded corners */
  margin-bottom: 20px; /* Space below the component */
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.upload-container:hover {
  background-color: #f9f9f9;
}

.upload-instructions {
  margin-bottom: 10px;
  color: #2c3e50;
  font-weight: bold;
}

.upload-button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
}

.upload-button:hover {
  background-color: #3a9b6c;
}

.file-info {
  color: #2c3e50; /* Dark text color for file info */
  font-weight: bold;
  margin-top: 10px;
}
</style>
