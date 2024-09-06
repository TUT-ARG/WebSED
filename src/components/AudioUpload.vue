<template>
  <div class="upload-container">
    <input type="file" @change="handleFileUpload" accept="audio/wav" />
    <p v-if="fileName" class="file-info">Uploaded File: {{ fileName }} ({{ fileSize }} KB)</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fileName: '',
      fileSize: 0,
    };
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (file && file.type === "audio/wav") {
        this.fileName = file.name;
        this.fileSize = (file.size / 1024).toFixed(2); // Size in KB

        try {
          const arrayBuffer = await file.arrayBuffer();
          this.$emit('audio-uploaded', arrayBuffer);
          console.log("File uploaded:", file);
        } catch (error) {
          console.error("Error processing the audio file:", error);
          alert("An error occurred while processing the audio file. Please try again.");
        }
      } else {
        alert("Please upload a valid .wav file.");
      }
    }
  }
};
</script>

<style scoped>
.upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #fff; /* White background for contrast */
  border-radius: 8px; /* Rounded corners */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  margin-bottom: 20px; /* Space below the component */
}

input[type="file"] {
  margin-bottom: 10px;
  padding: 10px;
  border: 2px dashed #42b983; /* Dashed border with primary color */
  border-radius: 8px; /* Rounded corners */
  background-color: #f9f9f9; /* Light background for input area */
  cursor: pointer;
  transition: border-color 0.3s ease;
}

input[type="file"]:hover {
  border-color: #2c3e50; /* Darker border on hover */
}

.file-info {
  color: #2c3e50; /* Dark text color for file info */
  font-weight: bold;
}
</style>