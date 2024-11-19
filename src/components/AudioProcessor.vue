<template>
  <div class="audio-processor-container">
    <!-- Mode selector for Audio Tagging or Frame-wise SED -->
    <select v-model="displayMode" class="mode-selector">
      <option value="audio_tagging">Audio Tagging</option>
      <option value="framewise_sed">Frame-wise SED</option>
    </select>

    <!-- Dropdown to select file for display -->
    <select
      v-if="fileNames.length"
      v-model="selectedFile"
      @change="updateResultsDisplay"
      class="file-selector"
    >
      <option v-for="file in fileNames" :key="file" :value="file">
        {{ file }}
      </option>
    </select>

    <!-- Button to process audio files -->
    <button
      @click="processAllAudioFiles"
      class="process-button"
      :disabled="!Object.keys(audioDataMap).length || isProcessing"
      :class="{
        enabled: Object.keys(audioDataMap).length && !isProcessing,
        disabled: !Object.keys(audioDataMap).length || isProcessing,
      }"
    >
      {{ isProcessing ? 'Processing...' : 'Process ' }}
    </button>

    <!-- Progress Bar and Estimated Time Remaining -->
    <div v-if="isProcessing" class="progress-container">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>
      <p>
        Processing: {{ progressPercentage.toFixed(2) }}% -
        Estimated time remaining: {{ estimatedTimeRemaining }}
      </p>
    </div>

    <!-- Button to download all results -->
    <button
      @click="downloadAllResults"
      class="download-button"
      v-if="modelProcessed"
    >
      Download All Results
    </button>

    <!-- Display Clipwise or Framewise Results based on selected file and display mode -->
    <div
      v-if="displayMode === 'audio_tagging' && clipwiseResults[selectedFile]"
    >
      <h3>Clipwise Tagging Results for {{ selectedFile }}:</h3>
      <pre class="results-display">{{ clipwiseResults[selectedFile] }}</pre>
      <button
        @click="downloadClipwiseResults(selectedFile)"
        class="download-button"
      >
        Download Clipwise Results
      </button>
    </div>

    <div
      v-if="
        displayMode === 'framewise_sed' &&
        framewiseResults[selectedFile]?.length
      "
    >
      <h3>Framewise SED Results for {{ selectedFile }}:</h3>
      <button
        @click="downloadFramewiseCSV(selectedFile)"
        class="download-button"
      >
        Download Framewise Results
      </button>
      <table class="event-roll-table">
        <thead>
          <tr>
            <th>Frame</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Tags (Probability &gt; 0.1)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="frameResult in framewiseResults[selectedFile]"
            :key="frameResult.frame"
          >
            <td>{{ frameResult.frame }}</td>
            <td>{{ frameResult.startTime }}</td>
            <td>{{ frameResult.endTime }}</td>
            <td>
              <ul>
                <li
                  v-for="result in frameResult.results"
                  :key="result.label"
                >
                  {{ result.label }}: {{ result.probability.toFixed(3) }}
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script>
import * as ort from 'onnxruntime-web';
import Papa from 'papaparse';
import JSZip from 'jszip'; // Import JSZip
import { saveAs } from 'file-saver'; // Import FileSaver

export default {
  props: {
    audioFiles: Array, // Receive the array of audio files
  },
  data() {
    return {
      session: null,
      audioDataMap: {}, // Map to hold audio data per file
      fileNames: [], // List of file names
      clipwiseResults: {}, // Stores clipwise results per file
      framewiseResults: {}, // Stores framewise results per file
      selectedFile: '', // Currently selected file for display
      labels: [],
      displayMode: 'audio_tagging', // Default mode for display
      modelProcessed: false, // Tracks if model has already processed the current audio data
      isProcessing: false, // Tracks if the model is currently processing
      totalChunks: 0, // Total number of chunks to process
      processedChunks: 0, // Number of chunks processed
      startTime: null, // Timestamp when processing starts
      estimatedTimeRemaining: '', // Estimated time remaining
      // New accumulators
      clipwiseProbabilities: {}, // Accumulator for clipwise probabilities per file
      cumulativeFrameIndices: {}, // Cumulative frame indices per file
      cumulativeTimeOffsets: {}, // Cumulative time offsets per file
    };
  },
  created() {
    ort.env.wasm.wasmPaths = {
      'ort-wasm-simd-threaded.wasm': '/model/ort-wasm-simd-threaded.wasm',
      'ort-wasm-simd-threaded.jsep.wasm':
        '/model/ort-wasm-simd-threaded.jsep.wasm',
      'ort-training-wasm-simd-threaded.wasm':
        '/model/ort-training-wasm-simd-threaded.wasm',
    };
    this.loadLabels();
  },
  async mounted() {
    try {
      console.log('Starting to load the model...');
      this.session = await ort.InferenceSession.create(
        '/WebSED/model/Cnn14_DecisionLevelMax.onnx',
        {
          executionProviders: ['wasm'],
        }
      );
      console.log('Model loaded successfully.');
    } catch (error) {
      console.error('Error loading model:', error);
    }
  },
  methods: {
    async loadLabels() {
      try {
        const response = await fetch('/WebSED/metadata/class_labels_indices.csv');
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            this.labels = results.data.map((row) => row.display_name);
            console.log('Labels loaded successfully:', this.labels);
          },
        });
      } catch (error) {
        console.error('Error loading labels:', error);
      }
    },
    async setAudioData(files) {
      this.audioDataMap = {};
      this.fileNames = [];

      for (const file of files) {
        if (file.type === 'audio/wav' || file.type === 'audio/mpeg') {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const audioContext =
              new (window.AudioContext || window.webkitAudioContext)();
            const audioData = await audioContext.decodeAudioData(arrayBuffer);
            this.audioDataMap[file.name] = audioData;
            this.fileNames.push(file.name);
          } catch (decodeError) {
            console.error(`Error decoding file ${file.name}:`, decodeError);
            alert(
              `Error decoding file ${file.name}. Please upload a valid audio file.`
            );
            continue; // Skip to the next file
          }
        }
      }

      this.selectedFile = this.fileNames[0] || ''; // Set the first file as selected
      this.modelProcessed = false;
    },
    async preprocessAudio(audioBuffer) {
      const sampleRate = 32000;
      const chunkSize = sampleRate * 10;

      let resampledBuffer;
      if (audioBuffer.sampleRate !== sampleRate) {
        const offlineContext = new OfflineAudioContext(
          1,
          (audioBuffer.length * sampleRate) / audioBuffer.sampleRate,
          sampleRate
        );
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        resampledBuffer = await offlineContext.startRendering();
      } else {
        resampledBuffer = audioBuffer;
      }

      const pcmData = resampledBuffer.getChannelData(0);
      const chunks = [];
      for (let i = 0; i < pcmData.length; i += chunkSize) {
        const chunk = pcmData.slice(i, i + chunkSize);
        if (chunk.length < chunkSize) {
          const paddedChunk = new Float32Array(chunkSize);
          paddedChunk.set(chunk);
          chunks.push(paddedChunk);
        } else {
          chunks.push(chunk);
        }
      }
      return chunks;
    },
    async processAllAudioFiles() {
      if (!this.session || !Object.keys(this.audioDataMap).length) {
        alert('Model or audio data not loaded.');
        return;
      }

      this.isProcessing = true; // Start processing
      this.modelProcessed = false; // Reset modelProcessed state
      this.processedChunks = 0; // Reset processed chunks
      this.totalChunks = 0; // Reset total chunks
      this.startTime = Date.now(); // Record the start time

      try {
        // Calculate total chunks
        for (const audioData of Object.values(this.audioDataMap)) {
          const chunks = await this.preprocessAudio(audioData);
          this.totalChunks += chunks.length;
        }

        // Reset results
        this.clipwiseResults = {};
        this.framewiseResults = {};
        this.clipwiseProbabilities = {}; // Reset accumulators
        this.cumulativeFrameIndices = {};
        this.cumulativeTimeOffsets = {};

        // Process each file
        for (const fileName of this.fileNames) {
          await this.processAudioFile(fileName, this.audioDataMap[fileName]);
        }
        this.modelProcessed = true;
      } catch (error) {
        console.error('Error during processing:', error);
        alert('An error occurred during processing. Please try again.');
      } finally {
        this.isProcessing = false; // Processing complete
        this.estimatedTimeRemaining = ''; // Clear estimated time remaining
      }
    },
    async processAudioFile(fileName, audioData) {
      try {
        const waveformChunks = await this.preprocessAudio(audioData);
        this.clipwiseResults[fileName] = '';
        this.framewiseResults[fileName] = [];

        // Initialize accumulators
        this.clipwiseProbabilities[fileName] = new Float32Array(
          this.labels.length
        ).fill(0);
        this.cumulativeFrameIndices[fileName] = 0;
        this.cumulativeTimeOffsets[fileName] = 0;

        const sampleRate = 32000; // Define sample rate

        for (const chunk of waveformChunks) {
          const chunkDuration = chunk.length / sampleRate;

          const inputTensor = new ort.Tensor('float32', chunk, [
            1,
            chunk.length,
          ]);
          const results = await this.session.run({ input: inputTensor });
          this.storeClipwiseResults(
            results.clipwise_output?.data || [],
            fileName
          );
          this.storeFramewiseResults(
            results.framewise_output?.data || [],
            fileName,
            chunkDuration
          );

          // Update progress
          this.processedChunks++;
          this.updateProgress();
        }

        // After processing all chunks, compute final clipwise results
        this.computeFinalClipwiseResults(fileName);
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
        throw error; // Rethrow to handle in processAllAudioFiles
      }
    },
    updateProgress() {
      // No need to set this.progressPercentage because it's computed

      // Calculate estimated time remaining
      const elapsedTime = (Date.now() - this.startTime) / 1000; // in seconds
      const averageTimePerChunk = elapsedTime / this.processedChunks;
      const remainingChunks = this.totalChunks - this.processedChunks;
      const estimatedTime = averageTimePerChunk * remainingChunks;

      // Format estimated time remaining
      this.estimatedTimeRemaining = this.formatTime(estimatedTime);
    },
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    },
    storeClipwiseResults(data, fileName) {
      // Use maximum probability per label
      for (let i = 0; i < data.length; i++) {
        const currentProb = data[i];
        if (currentProb > this.clipwiseProbabilities[fileName][i]) {
          this.clipwiseProbabilities[fileName][i] = currentProb;
        }
      }
    },
    computeFinalClipwiseResults(fileName) {
      const probabilities = this.clipwiseProbabilities[fileName];
      const results = Array.from(probabilities).map((prob, index) => ({
        label: this.labels[index],
        probability: prob,
      }));
      results.sort((a, b) => b.probability - a.probability);
      const topResults = results.slice(0, 10);
      this.clipwiseResults[fileName] = topResults
        .map((result) => `${result.label}: ${result.probability.toFixed(3)}`)
        .join('\n');
    },
    storeFramewiseResults(data, fileName, chunkDuration) {
      const numLabels = this.labels.length;
      const totalFrames = data.length / numLabels;

      // Ensure numFrames is an integer
      const numFrames = Math.floor(totalFrames);
      if (totalFrames !== numFrames) {
        console.warn(
          `Number of frames (${totalFrames}) is not an integer, rounding down to ${numFrames}.`
        );
      }

      const frameDuration = chunkDuration / numFrames;
      const cumulativeFrameIndex = this.cumulativeFrameIndices[fileName];
      const timeOffset = this.cumulativeTimeOffsets[fileName];

      for (let i = 0; i < numFrames; i++) {
        const results = [];
        for (let j = 0; j < numLabels; j++) {
          const probability = data[i * numLabels + j];
          if (probability > 0.1) {
            results.push({
              label: this.labels[j],
              probability: probability,
            });
          }
        }
        if (results.length > 0) {
          this.framewiseResults[fileName].push({
            frame: cumulativeFrameIndex + i,
            startTime: (timeOffset + i * frameDuration).toFixed(2),
            endTime: (timeOffset + (i + 1) * frameDuration).toFixed(2),
            results,
          });
        }
      }

      // Update cumulative frame index and time offset
      this.cumulativeFrameIndices[fileName] += numFrames;
      this.cumulativeTimeOffsets[fileName] += numFrames * frameDuration;
    },
    updateResultsDisplay() {
      // This method can be used if any additional actions are needed when the selected file changes
    },
    downloadClipwiseResults(fileName) {
      const blob = new Blob([this.clipwiseResults[fileName]], {
        type: 'text/plain;charset=utf-8',
      });
      saveAs(blob, `${fileName}_clipwise_results.txt`);
    },
    downloadFramewiseCSV(fileName) {
      const csvData = this.framewiseResults[fileName].map((frameResult) => {
        const events = frameResult.results
          .map((result) => result.label)
          .join(';');
        return `${frameResult.frame},${frameResult.startTime},${frameResult.endTime},${events}`;
      });

      const csvContent = [
        'frame_index,start_time,end_time,sound_events',
        ...csvData,
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${fileName}_framewise_results.csv`);
    },
    async downloadAllResults() {
      if (!this.modelProcessed) {
        alert('Please process the files before downloading results.');
        return;
      }

      const zip = new JSZip();

      for (const fileName of this.fileNames) {
        // Add Clipwise Results
        if (this.clipwiseResults[fileName]) {
          zip.file(
            `${fileName}_clipwise_results.txt`,
            this.clipwiseResults[fileName]
          );
        }

        // Add Framewise Results
        if (this.framewiseResults[fileName]) {
          const csvData = this.framewiseResults[fileName].map((frameResult) => {
            const events = frameResult.results
              .map((result) => result.label)
              .join(';');
            return `${frameResult.frame},${frameResult.startTime},${frameResult.endTime},${events}`;
          });

          const csvContent = [
            'frame_index,start_time,end_time,sound_events',
            ...csvData,
          ].join('\n');

          zip.file(`${fileName}_framewise_results.csv`, csvContent);
        }
      }

      // Generate the ZIP file and trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'All_Results.zip');
    },
  },
  computed: {
    progressPercentage() {
      return (this.processedChunks / this.totalChunks) * 100 || 0;
    },
  },
};
</script>


<style scoped>
.audio-processor-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  width: 100%;
  max-width: 900px;
}

/* Dropdown styling for selecting file */
.file-selector {
  margin-bottom: 20px;
  padding: 8px;
  font-size: 1rem;
  border-radius: 5px;
  border: 2px solid #42b983;
}

/* Mode selector styling */
.mode-selector {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.mode-selector select {
  padding: 8px;
  font-size: 1rem;
  border-radius: 5px;
  border: 2px solid #42b983;
}

/* Process button styling */
.process-button {
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1rem;
  margin-bottom: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border: none;
  color: white;
}

.process-button.disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.process-button.enabled {
  background-color: #42b983;
}

/* Download button styling */
.download-button {
  padding: 10px 15px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-bottom: 10px; /* Position above results display */
}

.download-button:hover {
  background-color: #3a9b6c;
}

/* Progress bar styling */
.progress-container {
  width: 100%;
  max-width: 800px;
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  background-color: #e6e6e6;
  border-radius: 5px;
  overflow: hidden;
  height: 20px;
}

.progress-fill {
  height: 100%;
  background-color: #42b983;
  width: 0%;
  transition: width 0.2s ease;
}

/* Results display styling */
.results-display {
  background-color: #333;
  color: #f4f4f4;
  padding: 20px;
  border-radius: 8px;
  width: 100%;
  max-width: 800px;
  margin-top: 20px;
  overflow-x: auto;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
}

/* Table styling for framewise results */
.event-roll-table {
  width: 100%;
  max-width: 800px;
  margin-top: 20px;
  border-collapse: collapse;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
}

.event-roll-table th {
  background-color: #2c3e50;
  color: white;
  padding: 8px;
  font-weight: bold;
}

.event-roll-table td {
  background-color: #f5f5f5;
  color: #333333;
  padding: 8px;
}

.event-roll-table tr:nth-child(even) td {
  background-color: #e6e6e6;
}

.event-roll-table ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.event-roll-table ul li {
  margin: 2px 0;
  color: #333333;
}
</style>
