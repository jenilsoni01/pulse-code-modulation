# Real-Time Pulse Code Modulation Visualizer

A web-based tool to visualize the Pulse Code Modulation (PCM) process in real-time. This project demonstrates how an analog signal is sampled, quantized, encoded into binary PCM codes, and reconstructed using Zero-Order Hold (ZOH). It includes interactive charts, a data table, and SNR calculation, making it an excellent resource for learning digital signal processing concepts.


## Features

- **Interactive Inputs**: Adjust signal parameters (frequency, amplitude, phase), PCM settings (sampling rate, quantization levels), and time range.
- **Real-Time Visualization**: See updates instantly (with a 400ms debounce) across four charts:
  - Original analog wave with sampled points.
  - Quantized signal.
  - Reconstructed signal (ZOH).
  - Quantization error.
- **PCM Outputs**: Displays a table of sampled/quantized values and the binary PCM encoded sequence.
- **SNR Calculation**: Computes and shows the Signal-to-Noise Ratio in dB.
- **Theme Support**: Toggle between light and dark modes, with settings saved in `localStorage`.
- **Input Validation**: Ensures valid inputs with warnings for Nyquist violations.

## Demo

Try it live: [Link](https://pulse-code-modulation.netlify.app) <!-- Replace with actual link if hosted -->

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/jenilsoni01/pulse-code-modulation.git
   cd pulse-code-modulation