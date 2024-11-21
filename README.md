# WebSED: Web-Based Sound Event Detection

**Supervisors**: Tuomas Virtanen, Toni Heittola  
**Author**: Bilal Lamsili

## Overview

WebSED is a web-based application that implements Sound Event Detection (SED) using Pretrained Audio Neural Networks (PANNs). It performs real-time audio tagging and event detection directly in the browser, leveraging the ONNX model format for fast inference. The application ensures user privacy by minimizing backend dependencies.

> **Note**: This project builds on the work of [Qiuqiang Kong's Pretrained Audio Neural Networks (PANNs)](https://github.com/qiuqiangkong/audioset_tagging_cnn). For more details on the PANNs architecture, refer to the official repository.

## Features

- Real-time sound event detection in the browser.
- Powered by PANNs for high-accuracy audio tagging.
- Utilizes the ONNX Runtime for fast and efficient model inference.
- Minimal backend reliance, ensuring user privacy.

## Model Conversion to ONNX

### Prerequisites

Before converting the model, make sure you have the following dependencies installed:

- `torch`
- `onnx`
- Pretrained model weights (`Cnn14_DecisionLevelMax.pth`)

### Conversion Steps

To convert the model to the ONNX format, follow these steps:

1. Create a Python script `convert_to_onnx.py` with the following content:

    ```python
    import torch
    import warnings
    from pytorch.models import Cnn14_DecisionLevelMax  # Adjust this path if needed

    # Override torch.log10 globally to ensure ONNX compatibility
    if hasattr(torch, 'log10'):
        torch.log10 = lambda x: torch.log(x) / torch.log(torch.tensor(10.0))

    # Suppress ONNX export warnings related to unsupported operators
    warnings.filterwarnings("ignore", category=UserWarning, module="torch.onnx")

    def export_model_to_onnx():
        # Initialize the model with required parameters
        model = Cnn14_DecisionLevelMax(
            sample_rate=32000,
            window_size=1024,
            hop_size=320,
            mel_bins=64,
            fmin=50,
            fmax=14000,
            classes_num=527
        )

        # Load the checkpoint file (update the file path as necessary)
        checkpoint = torch.load('Cnn14_DecisionLevelMax_mAP=0.385.pth', map_location='cpu')
        model.load_state_dict(checkpoint['model'])
        model.eval()

        # Define a dummy input for the model (adjust size if needed)
        dummy_input = torch.randn(1, 320000)  # Example input size for 32kHz audio

        # Export the model to ONNX format with opset version 12
        torch.onnx.export(
            model,
            dummy_input,
            "Cnn14_DecisionLevelMax.onnx",
            export_params=True,
            opset_version=12,
            input_names=['input'],
            output_names=['clipwise_output', 'framewise_output'],
            dynamic_axes={'input': {1: 'audio_length'}}  # Allows variable input lengths
        )

        print("Model successfully converted to ONNX format.")

    if __name__ == "__main__":
        export_model_to_onnx()
    ```

2. Run the script to generate the ONNX model:

    ```bash
    python convert_to_onnx.py
    ```

This will create the ONNX model file `Cnn14_DecisionLevelMax_mAP=0.385.onnx`, which you can use in the web application.

## Local Development Setup

### Requirements

To set up the project locally, ensure you have the following installed:

- [Node.js](https://nodejs.org/)
- [Vue.js](https://vuejs.org/)
- [ONNX Runtime for Web](https://github.com/microsoft/onnxruntime) for running the model inference in the browser.

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/TUT-ARG/WebSED
    cd WebSED
    ```

2. Install the project dependencies:

    ```bash
    npm install
    ```

3. Start the development server:

    ```bash
    npm run dev
    ```

4. Open your browser and navigate to `http://localhost:5173` to interact with the web application.

## Usage

Once the development server is up and running, you can interact with the WebSED interface to perform real-time sound event detection. The web app takes in audio input, processes it through the ONNX model in the browser, and displays the detected sound events.

### Example

1. Start the server using the command `npm run dev`.
2. Access the application via your browser at `http://localhost:5173`.
3. Provide an audio input through your microphone or an audio file.
4. The detected sound events will be displayed in real-time.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.


---


