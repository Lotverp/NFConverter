import { useState, useRef, useEffect, useMemo } from 'react';
import {
  parseMct, parseBin, parseNfc,
  generateMct, generateBin, generateNfc
} from './utils/converters';
import { detectInputFormat, OUTPUT_OPTIONS } from './utils/constants';
import './index.css';

/**
 * Main Application Component for the NFC File Converter
 * Handles file dragging, format selection, and conversion processing.
 */
function App() {
  const [file, setFile] = useState(null);
  const [inputFormat, setInputFormat] = useState('auto');
  const [outputFormat, setOutputFormat] = useState('nfc');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // --- Event Handlers for Drag & Drop ---

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleNewFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleNewFile(e.target.files[0]);
    }
  };

  const handleNewFile = (selectedFile) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // --- Format Resolution Logic ---

  // Compute the actual input format if 'auto' is selected
  const actualInputFormat = useMemo(() => {
    if (inputFormat === 'auto') {
      return file ? detectInputFormat(file.name) : 'mct';
    }
    return inputFormat;
  }, [inputFormat, file]);

  // Ensure output format never perfectly matches input format
  useEffect(() => {
    if (outputFormat === actualInputFormat) {
      const fallback = OUTPUT_OPTIONS.find(opt => opt.value !== actualInputFormat);
      if (fallback) setOutputFormat(fallback.value);
    }
  }, [actualInputFormat, outputFormat]);

  // --- Conversion Processing ---

  const handleConvert = async () => {
    if (!file) return;

    setError(null);
    setResult(null);

    try {
      let tagData;

      // 1. Parsing Phase (Extract common data structure from file)
      if (['mct', 'dump', 'txt'].includes(actualInputFormat)) {
        const text = await file.text();
        tagData = parseMct(text);
      } else if (['bin', 'dmp'].includes(actualInputFormat)) {
        const buffer = await file.arrayBuffer();
        tagData = parseBin(buffer);
      } else if (actualInputFormat === 'nfc') {
        const text = await file.text();
        tagData = parseNfc(text);
      }

      if (!tagData) throw new Error("Unsupported format or parsing failed.");

      // 2. Generation Phase (Build target file format)
      let outBlob;
      let outExtension = `.${outputFormat}`;

      if (['mct', 'dump', 'txt'].includes(outputFormat)) {
        const outText = generateMct(tagData);
        outBlob = new Blob([outText], { type: 'application/octet-stream' });
      } else if (['bin', 'dmp'].includes(outputFormat)) {
        const outBuffer = generateBin(tagData);
        outBlob = new Blob([outBuffer], { type: 'application/octet-stream' });
      } else if (outputFormat === 'nfc') {
        const outText = generateNfc(tagData);
        outBlob = new Blob([outText], { type: 'application/octet-stream' });
      }

      // 3. Expose generated file for download
      const url = URL.createObjectURL(outBlob);
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

      setResult({
        url,
        filename: `${baseName}${outExtension}`
      });

    } catch (err) {
      console.error('Conversion Error:', err);
      setError(err.message || 'Conversion failed. Please verify format compatibility.');
    }
  };

  return (
    <div className="container">
      <header>
        <div className="title-container">
          <h1>NFC File Converter</h1>
          <a
            href="https://github.com/Lotverp/NFConverter"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            aria-label="GitHub Repository"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </a>
        </div>
        <p>Convert any format between MCT, Bin, .Nfc (flipper zero)</p>
      </header>

      <main className="card">
        {/* --- Format Selectors --- */}
        <div className="format-grid">
          <div className="form-group">
            <label htmlFor="inputFormat">Input Format</label>
            <select
              id="inputFormat"
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value)}
            >
              <option value="auto">Auto-detect from extension</option>
              <option value="mct">MCT Format (.mct)</option>
              <option value="dump">Text Dump (.dump)</option>
              <option value="txt">Text File (.txt)</option>
              <option value="bin">Binary Dump (.bin)</option>
              <option value="dmp">Binary Dump (.dmp)</option>
              <option value="nfc">Flipper NFC (.nfc)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="outputFormat">Output Format</label>
            <select
              id="outputFormat"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            >
              {OUTPUT_OPTIONS
                .filter(opt => opt.value !== actualInputFormat)
                .map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
          </div>
        </div>

        {/* --- File Uploader --- */}
        <div className="form-group">
          <label>Upload File</label>
          <div
            className={`drop-zone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            role="button"
            tabIndex={0}
          >
            <p>{file ? file.name : 'Drag & drop a file here'}</p>
            <span>{file ? `${(file.size / 1024).toFixed(2)} KB` : 'or click to browse'}</span>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".mct,.dump,.txt,.bin,.dmp,.nfc"
            />
          </div>
        </div>

        {/* --- Action Buttons & Status --- */}
        <button
          className="convert-btn"
          onClick={handleConvert}
          disabled={!file}
        >
          Convert File
        </button>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        {result && (
          <div className="result">
            <p>Conversion successful!</p>
            <a href={result.url} download={result.filename}>
              Download {result.filename}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
