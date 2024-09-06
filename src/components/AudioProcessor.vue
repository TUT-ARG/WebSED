<template>
  <div class="audio-processor-container">
    <button 
      @click="runModel" 
      class="process-button" 
      :disabled="!audioData"
      :class="{ 'enabled': audioData, 'disabled': !audioData }"
    >
      Process Audio
    </button>
    
    <div v-if="clipwiseResults">
      <h3>Clipwise Tagging Results:</h3>
      <pre class="results-display">{{ clipwiseResults }}</pre>
      <button @click="downloadResults" class="download-button">Download Results</button> <!-- Download Button -->
    </div>

    <div v-if="framewiseResults.length">
      <h3>Event Roll (Framewise) Results:</h3>
      <table class="event-roll-table">
        <thead>
          <tr>
            <th>Frame</th>
            <th>Tags (Probability > 0.1)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="frameResult in framewiseResults" :key="frameResult.frame">
            <td>{{ frameResult.frame }}</td>
            <td>
              <ul>
                <li v-for="result in frameResult.results" :key="result.label">{{ result.label }}: {{ result.probability.toFixed(3) }}</li>
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
import FFT from 'fft.js';
import Papa from 'papaparse';

export default {
  data() {
    return {
      session: null,
      clipwiseResults: null,
      framewiseResults: [],
      audioData: null,
      labels: [] // Store the labels here
    };
  },
  created() {
    ort.env.wasm.wasmPaths = {
      'ort-wasm-simd-threaded.wasm': '/model/ort-wasm-simd-threaded.wasm',
      'ort-wasm-simd-threaded.jsep.wasm': '/model/ort-wasm-simd-threaded.jsep.wasm',
      'ort-training-wasm-simd-threaded.wasm': '/model/ort-training-wasm-simd-threaded.wasm',
    };

    this.loadLabels(); // Load labels on creation
  },
  async mounted() {
    try {
      console.log("Starting to load the model...");
      this.session = await ort.InferenceSession.create('/model/Cnn14_16k_112000.onnx', {
        executionProviders: ['wasm']
      });
      console.log("Model loaded successfully.");
    } catch (error) {
      console.error("Error loading model:", error);
    }
  },
  methods: {
    async loadLabels() {
      try {
        const response = await fetch('/metadata/class_labels_indices.csv');
        const csvText = await response.text();
        
        // Parse the CSV text using Papa Parse
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            this.labels = results.data.map(row => row.display_name); // 'display_name' should match the column name in your CSV
            console.log("Labels loaded successfully:", this.labels);
          }
        });
      } catch (error) {
        console.error("Error loading labels:", error);
      }
    },
    async setAudioData(audioData) {
      if (audioData instanceof AudioBuffer) {
        this.audioData = audioData;
      } else if (audioData instanceof ArrayBuffer) {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          this.audioData = await audioContext.decodeAudioData(audioData);
          console.log("Audio data decoded successfully.");
        } catch (error) {
          console.error("Error decoding audio data:", error);
        }
      } else {
        console.error("Unsupported audio data format");
      }
    },
    async preprocessAudio(audioBuffer) {
      const sampleRate = 16000;
      let resampledBuffer;
      if (audioBuffer.sampleRate !== sampleRate) {
        const offlineContext = new OfflineAudioContext(1, audioBuffer.length * sampleRate / audioBuffer.sampleRate, sampleRate);
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        resampledBuffer = await offlineContext.startRendering();
      } else {
        resampledBuffer = audioBuffer;
      }
      const pcmData = resampledBuffer.getChannelData(0);
      const maxAbsValue = Math.max(...pcmData.map(Math.abs));
      const scaledPcmData = pcmData.map(x => x / maxAbsValue);
      return scaledPcmData;
    },
    async runModel() {
      if (!this.session || !this.audioData) {
        alert('Model or audio data not loaded.');
        return;
      }
      try {
        console.log("Starting audio preprocessing...");
        const waveform = await this.preprocessAudio(this.audioData);
        console.log("Audio preprocessing completed.");

        const inputTensor = new ort.Tensor('float32', waveform, [1, waveform.length]);

        console.log("Running inference...");
        const results = await this.session.run({ input: inputTensor });

        // Handle clipwise output for entire audio tagging
        const clipwiseOutput = results.clipwise_output?.data || [];
        const labeledClipwiseResults = Array.from(clipwiseOutput).map((probability, index) => ({
          label: this.labels[index],
          probability: probability
        }));

        labeledClipwiseResults.sort((a, b) => b.probability - a.probability);
        
        // Store the top clipwise results
        this.clipwiseResults = labeledClipwiseResults.slice(0, 10).map(result => `${result.label}: ${result.probability.toFixed(3)}`).join('\n');

        // Handle framewise output for event roll
        const framewiseOutput = results.framewise_output?.data || [];
        const framewiseLength = framewiseOutput.length / this.labels.length;
        this.framewiseResults = [];

        for (let i = 0; i < framewiseLength; i++) {
          const frameResults = Array.from({ length: this.labels.length }, (_, index) => ({
            label: this.labels[index],
            probability: framewiseOutput[i * this.labels.length + index]
          })).filter(result => result.probability > 0.1); // Filter low probabilities

          this.framewiseResults.push({
            frame: i,
            results: frameResults
          });
        }

        console.log("Inference completed.");
      } catch (error) {
        console.error("Error during model inference:", error);
      }
    },
    downloadResults() {
      const blob = new Blob([this.clipwiseResults], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'audio_results.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
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
}

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

.results-display {
  background-color: #333;
  color: #f4f4f4;
  padding: 20px;
  border-radius: 8px;
  width: calc(100% - 40px); /* Adjust width to account for padding */
  max-width: 800px;
  margin-top: 20px;
  overflow-x: auto;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
}


.download-button {
  padding: 10px 15px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
}

.download-button:hover {
  background-color: #3a9b6c;
}

/* New styles for the event roll table */
.event-roll-table {
  width: 100%;
  max-width: 800px;
  margin-top: 20px;
  border-collapse: collapse;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
}

.event-roll-table th, .event-roll-table td {
  border: 1px solid #444;
  padding: 8px;
  text-align: left;
  color: #f4f4f4;
}

.event-roll-table th {
  background-color: #42b983;
  color: white;
}

</style>