# FitCheck

FitCheck is a React Native app for photographing clothes, getting outfit suggestions, and generating virtual try-ons.
It runs on Expo.

<img width="1920" height="1080" alt="demo-ss" src="https://github.com/user-attachments/assets/a79deedb-1230-4669-9938-63c6c4e30b6b" />

## How it works

The app analyzes garment photos with a finetuned vision-language model and suggests outfits for the current weather.
The model runs in LM Studio on your own machine.
A remote OpenAI-compatible API can handle the same recommendation request.
When that API is configured, the app prefers its answer and falls back to LM Studio if the request fails.
Virtual try-on images come from Hugging Face Spaces.

The frontend is React Native with Expo.
Garment analysis, outfit history, personas, and try-on results are stored on the device.

## Models and datasets

The styling model is a finetuned Qwen3-VL vision-language model in Q4_K_M GGUF format.
Load it in LM Studio.

* Model weights: [FitCheck-Qwen3-VL-Stylist-GGUF](https://huggingface.co/barryallen16/FitCheck-Qwen3-VL-Stylist-GGUF)
* Training datasets and model weights: [FitCheck collection](https://huggingface.co/collections/barryallen16/fitcheck)

## Project structure

```text
FitCheck/
├── App.js
├── app.json
├── package.json
├── assets/
└── src/
    ├── screens/
    ├── components/
    ├── services/
    ├── context/
    ├── constants/
    ├── config/
    └── utils/
```

## Running the app

### Prerequisites

* Node.js and npm.
* LM Studio with the `Q4_K_M` model loaded and its local server running.
* A Hugging Face token for virtual try-on.
* Expo Go on a phone, or an Android or iOS emulator.

### Install dependencies

```bash
cd fitcheck-rn
npm install
```

### Configure the app

Copy `src/config/example.keys.js` to `src/config/keys.js` and fill in the values you need.
`keys.js` is ignored by git, so keep your real keys there.

* `LMS_API_URL`: remote OpenAI-compatible chat completion endpoint.
* `LMS_KEYS`: API keys for that endpoint.
* `LMS_MODEL`: model name the endpoint expects.
* `HF_TOKEN`: one or more Hugging Face tokens for try-on.

If you leave the API values empty, recommendations use LM Studio only.
Try-on needs a Hugging Face token.

### Start LM Studio

Load the model from the link above and start the local server.
The app uses port `1234` by default.
Set a different server URL in the app's server settings if yours is not on that port.

### Start Expo

```bash
npm start
```

Press `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

The app asks for location access for weather-based suggestions and for photo library or camera access when you add garments.
