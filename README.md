# WebSED: Web-Based Sound Event Detection

**Supervisors**: Tuomas Virtanen, Toni Heittola  
**Author**: Bilal Lamsili

## Overview

WebSED is a web-based application that implements Sound Event Detection (SED) using Pretrained Audio Neural Networks (PANNs). It performs real-time audio tagging and event detection directly in the browser, leveraging the ONNX model format for fast inference. The application ensures user privacy by minimizing backend dependencies.

> **Note**: This project builds on the excellent work of [Qiuqiang Kong's Pretrained Audio Neural Networks (PANNs)](https://github.com/qiuqiangkong/audioset_tagging_cnn). For more details on the PANNs architecture, refer to the official repository.

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
- Pretrained model weights (`Cnn14_16k_mAP=0.438.pth`)

### Conversion Steps

To convert the model to the ONNX format, follow these steps:

1. Create a Python script `convert_to_onnx.py` with the following content:

    ```python
    import torch
    from pytorch.models import Cnn14_16k

    def export_model_to_onnx():
        model = Cnn14_16k(sample_rate=16000, window_size=512, hop_size=160, 
                          mel_bins=64, fmin=50, fmax=8000, classes_num=527)
        checkpoint = torch.load('Cnn14_16k_mAP=0.438.pth', map_location='cpu')
        model.load_state_dict(checkpoint['model'])
        model.eval()

        dummy_input = torch.randn(1, 112000)  # Input with dynamic audio length
        torch.onnx.export(model, dummy_input, "Cnn14_16k_112000.onnx", 
                          export_params=True, opset_version=12, 
                          input_names=['input'], output_names=['clipwise_output', 'embedding'])

    if __name__ == "__main__":
        export_model_to_onnx()
    ```

2. Run the script to generate the ONNX model:

    ```bash
    python convert_to_onnx.py
    ```

This will create the ONNX model file `Cnn14_16k_112000.onnx`, which you can use in the web application.

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

4. Open your browser and navigate to `http://localhost:3000` to interact with the web application.

## Usage

Once the development server is up and running, you can interact with the WebSED interface to perform real-time sound event detection. The web app takes in audio input, processes it through the ONNX model in the browser, and displays the detected sound events.

### Example

1. Start the server using the command `npm run dev`.
2. Access the application via your browser at `http://localhost:3000`.
3. Provide an audio input through your microphone or an audio file.
4. The detected sound events will be displayed in real-time.

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add a new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

Please ensure your code adheres to the project style guidelines and includes appropriate tests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Acknowledgements

Special thanks to [Qiuqiang Kong](https://github.com/qiuqiangkong) for his work on PANNs, which serves as the foundation for this project.

---


