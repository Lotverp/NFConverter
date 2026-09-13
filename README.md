# Universal NFC Web Converter 🐬

A beautiful, fully client-side web application designed to convert various NFC dump formats natively in your browser. Perfect for Flipper Zero enthusiasts and RFID researchers.

## Features ✨

- **N-to-N Conversion**: Convert seamlessly between `.nfc`, `.mct`, `.dump`, `.txt`, `.bin`, and `.dmp`.
- **100% Offline & Secure**: All conversions happen directly in your browser. No files are ever uploaded to a remote server.
- **Auto-Detection**: The app automatically identifies your input file based on its extension.
- **Premium Interface**: A sleek, dark-mode GUI with glassmorphism effects and drag-and-drop support.
- **Responsive**: Works on desktop and mobile browsers.

## How to use 🚀

1. Open the [Web App](#) *(Insert your GitHub Pages link here)*
2. Drag and drop your dump file into the upload zone.
3. Select your desired output format from the dropdown.
4. Click **Convert File**. The new file will be downloaded instantly.

## Local Development 💻

To run the converter locally on your machine:

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/FlipperConvertMCT.git
   cd FlipperConvertMCT
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Built With 🛠️
- **React.js** for the UI logic
- **Vite** for the build tooling
- **Vanilla CSS** for the custom responsive design

---
*Based on the original python CLI converter scripts. Refactored into a universal NFC File Converter.*
