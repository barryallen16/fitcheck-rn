# FitCheck

FitCheck is a multi-modular AI framework and heterogeneous wardrobe recommendation system. Designed specifically to handle a diverse range of clothing categories including complex Indian ethnic fashion like kurtas, sarees, and fusion wear. it provides intelligent outfit styling and virtual try-on capabilities entirely through edge inference and dedicated APIs.
<img width="1920" height="1080" alt="demo-ss" src="https://github.com/user-attachments/assets/a79deedb-1230-4669-9938-63c6c4e30b6b" />

## Architecture & Tech Stack

This project is built to operate efficiently via local edge inference, ensuring privacy and reducing reliance on cloud-based LLM subscriptions. All text and styling reasoning is routed locally, while specialized endpoints handle complex image rendering:

* **Frontend**: React Native (via Expo)
* **Recommendation Engine**: **LM Studio** for local/edge inference. The application queries a finetuned 2B Vision-Language Model (VLM) to analyze garments and suggest outfits based on styling preferences.
* **Virtual Try-On (VTON)**: **Hugging Face** serverless endpoints process and render the virtual try-on imagery, allowing users to visualize different garment combinations.

## Models & Datasets

FitCheck relies on custom-trained models and specialized datasets to understand nuanced fashion categories.

* **Finetuned VLM (Stylist Engine)**: The core recommendation model is available in `Q4_K_M` Quantized GGUF format, specifically optimized for efficient edge inference via LM Studio.
    * Model Weights: [FitCheck-Qwen3-VL-Stylist-GGUF](https://huggingface.co/barryallen16/FitCheck-Qwen3-VL-Stylist-GGUF)
* **Datasets & Full Collection**: The complete repository featuring all datasets used to train the model, along with the base and finetuned weights, is organized in a dedicated Hugging Face collection.
    * FitCheck Collection: [Hugging Face Collection](https://huggingface.co/collections/barryallen16/fitcheck)

## Project Structure

```text
FitCheck/
├── App.js
├── app.json
├── package.json
├── babel.config.js
├── assets/
│   └── logo-placeholder.png
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   ├── WardrobeScreen.js
│   │   ├── AnalyzingScreen.js
│   │   ├── GarmentDetailScreen.js
│   │   ├── RecommendationScreen.js
│   │   └── ResultScreen.js
│   ├── components/
│   │   ├── GarmentCard.js
│   │   ├── LoadingOverlay.js
│   │   ├── ErrorBanner.js
│   │   └── BaseGarmentSelector.js
│   ├── services/
│   │   ├── lmStudioService.js      # Handles local edge inference requests
│   │   ├── weatherService.js
│   │   └── storageService.js
│   ├── context/
│   │   └── WardrobeContext.js
│   ├── constants/
│   │   └── theme.js
│   └── utils/
│       └── helpers.js
```

## Execution Instructions

Follow these steps to set up and run FitCheck locally:

### 1. Prerequisites
* **Bun** installed on your machine (`curl -fsSL https://bun.sh/install | bash`).
* **Expo CLI** installed globally (optional, but recommended).
* **LM Studio** installed on your local machine.
* A valid **Hugging Face** account and API token for the VTON capabilities.

### 2. Set Up Local Edge Inference (LM Studio)
1.  Download the `Q4_K_M` quantized GGUF model from the [FitCheck-Qwen3-VL-Stylist-GGUF repository](https://huggingface.co/barryallen16/FitCheck-Qwen3-VL-Stylist-GGUF).
2.  Open **LM Studio** and load the downloaded GGUF model.
3.  Start the Local Server in LM Studio (typically broadcasts on `http://localhost:1234/v1`).
4.  Ensure the `src/services/lmStudioService.js` file is correctly pointing to this local server port.

### 3. Install App Dependencies
Navigate to the root directory of the React Native project and install the required packages using Bun:
```bash
cd fitcheck-rn
bun install
```

### 4. Configure Environment Variables
Configure your environment variables for Hugging Face (VTON) and weather services. Ensure all styling prompt requests are routed strictly to your LM Studio local server.

### 5. Run the Application
Start the Expo development server utilizing Bun:
```bash
bun start
# or alternatively
bunx expo start
```
From the terminal, press `a` to run on an Android emulator, `i` to run on an iOS simulator, or scan the QR code with the Expo Go app on a physical device.
