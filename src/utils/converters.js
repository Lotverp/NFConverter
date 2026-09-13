// =======================
// Helper Functions
// =======================

// Convert Uint8Array to Hex string without spaces
export function bytesToHex(uint8array) {
  return Array.from(uint8array)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

// Convert Hex string (with or without spaces) to Uint8Array
export function hexToBytes(hex) {
  const cleanHex = hex.replace(/\s+/g, "");
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Add spaces to hex string: AABB -> AA BB
export function addSpacesToHex(str) {
  let out = "";
  for (let i = 0; i < str.length; i += 2) {
    out += str.substring(i, i + 2) + " ";
  }
  return out.trim();
}

function guessMifareSizeBySak(sakHex) {
  const sak = sakHex.toUpperCase();
  const sakk = {
    "18": "4K",
    "08": "1K",
    "88": "1K",
    "11": "4K",
    "09": "MINI",
    "89": "MINI",
  };
  return sakk[sak] || "1K";
}

// =======================
// PARSERS (Input -> TagData)
// TagData: { uid: string, atqa: string, sak: string, cardType: string, blocks: string[] }
// All strings are hex without spaces.
// =======================

export function parseMct(textContent) {
  const lines = textContent.split(/\r?\n/);
  const blocks = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("+")) {
      blocks.push(trimmed.replace(/\s+/g, "").toUpperCase());
    }
  }

  if (blocks.length === 0) throw new Error("No data found in MCT file.");

  const block0 = blocks[0];
  let uidSize = 4;
  if ((block0[0] === "0" && block0[1] === "8") || (block0[0] === "0" && block0[1] === "F")) {
    uidSize = 7;
  }

  const uid = uidSize === 7 ? block0.substring(0, 14) : block0.substring(0, 8);
  const atqa = uidSize === 7 ? block0.substring(16, 20) : block0.substring(12, 16);
  const sak = uidSize === 7 ? block0.substring(14, 16) : block0.substring(10, 12);
  const cardType = guessMifareSizeBySak(sak);

  return { uid, atqa, sak, cardType, blocks };
}

export function parseBin(buffer) {
  const data = new Uint8Array(buffer);
  const size = data.length;

  // Try to detect Mikai / ST25TB first
  if (size >= 0x208) {
    const uidCandidate = data.subarray(0x200, 0x208);
    let isZero = true;
    for (let b of uidCandidate) {
      if (b !== 0) { isZero = false; break; }
    }
    if (!isZero) {
      // It's ST25TB 4K
      const blocks = [];
      const dataToDump = data.subarray(0, 0x200);
      for (let i = 0; i < dataToDump.length; i += 4) {
        blocks.push(bytesToHex(dataToDump.subarray(i, i + 4)));
      }
      return {
        uid: bytesToHex(uidCandidate),
        atqa: null,
        sak: null,
        cardType: "ST25TB",
        blocks
      };
    }
  }

  // Fallback to Mifare Classic Bin
  if (size < 16) throw new Error("File too small");

  let uid, uidLength;
  if (data[0] === 0x88) {
    // 7 byte UID
    const uidBytes = new Uint8Array(7);
    uidBytes.set(data.subarray(1, 4), 0);
    uidBytes.set(data.subarray(4, 7), 3);
    uid = bytesToHex(uidBytes);
    uidLength = 7;
  } else {
    // 4 byte UID
    uid = bytesToHex(data.subarray(0, 4));
    uidLength = 4;
  }

  let cardType, blockCount, atqa, sak;
  if (size === 1024) {
    cardType = "1K"; blockCount = 64;
    atqa = uidLength === 7 ? "4400" : "0400";
    sak = uidLength === 7 ? "88" : "08";
  } else if (size === 4096) {
    cardType = "4K"; blockCount = 256;
    atqa = "0400"; sak = "18";
  } else if (size === 320) {
    cardType = "Mini"; blockCount = 20;
    atqa = "0400"; sak = "09";
  } else {
    throw new Error(`Invalid size: ${size} bytes. Expected 320 (Mini), 1024 (1K), or 4096 (4K).`);
  }

  const blocks = [];
  for (let i = 0; i < blockCount; i++) {
    blocks.push(bytesToHex(data.subarray(i * 16, (i + 1) * 16)));
  }

  return { uid, atqa, sak, cardType, blocks };
}

export function parseNfc(textContent) {
  const lines = textContent.split(/\r?\n/);
  const blocks = [];
  let uid = "", atqa = "", sak = "", cardType = "1K";
  let isMifare = false;
  let isST25TB = false;

  for (const line of lines) {
    if (line.startsWith("Device type:")) {
      if (line.includes("Mifare Classic")) isMifare = true;
      else if (line.includes("ST25TB")) isST25TB = true;
    }
    if (line.startsWith("UID:")) uid = line.substring(4).replace(/\s+/g, "").toUpperCase();
    if (line.startsWith("ATQA:")) atqa = line.substring(5).replace(/\s+/g, "").toUpperCase();
    if (line.startsWith("SAK:")) sak = line.substring(4).replace(/\s+/g, "").toUpperCase();
    if (line.startsWith("Mifare Classic type:")) cardType = line.split(":")[1].trim();
    if (line.startsWith("Block ")) {
      // Block 0: AA BB CC...
      const parts = line.split(":");
      if (parts.length >= 2) {
        let blockData = parts[1].trim().replace(/\s+/g, "").toUpperCase();
        blockData = blockData.replace(/\?\?/g, "00"); // Replace unknown with zeros for intermediate
        blocks.push(blockData);
      }
    }
  }

  if (!isMifare && isST25TB) cardType = "ST25TB";
  
  return { uid, atqa, sak, cardType, blocks };
}

// =======================
// GENERATORS (TagData -> Output)
// =======================

export function generateMct(tagData) {
  // MCT format typically just contains the blocks grouped in sectors.
  if (tagData.cardType === "ST25TB") throw new Error("ST25TB cannot be exported to MCT format.");

  let out = "";
  let blockIdx = 0;
  
  while (blockIdx < tagData.blocks.length) {
    const sector = Math.floor(blockIdx / 4); // Simplified, actual sectors in 4K vary
    out += `+Sector: ${sector}\n`;
    
    // In Mifare 1K, 4 blocks per sector. In 4K, after sector 31, 16 blocks per sector.
    let blocksInSector = 4;
    if (tagData.cardType === "4K" && sector >= 32) {
      blocksInSector = 16;
    }

    for (let i = 0; i < blocksInSector; i++) {
      if (blockIdx < tagData.blocks.length) {
        out += tagData.blocks[blockIdx] + "\n";
        blockIdx++;
      } else {
        break;
      }
    }
  }

  return out;
}

export function generateBin(tagData) {
  if (tagData.cardType === "ST25TB") {
    // ST25TB uses 4 bytes per block and requires specific padding up to 0x208
    const buffer = new Uint8Array(0x208); // 520 bytes
    // Fill blocks (up to 0x200 bytes)
    for (let i = 0; i < tagData.blocks.length; i++) {
      const blockBytes = hexToBytes(tagData.blocks[i]);
      buffer.set(blockBytes, i * 4);
    }
    // Set UID at 0x200
    if (tagData.uid) {
      buffer.set(hexToBytes(tagData.uid), 0x200);
    }
    return buffer.buffer;
  } else {
    // Mifare Classic
    const totalBlocks = tagData.blocks.length;
    const buffer = new Uint8Array(totalBlocks * 16);
    
    for (let i = 0; i < totalBlocks; i++) {
      const blockHex = tagData.blocks[i] || "00000000000000000000000000000000";
      buffer.set(hexToBytes(blockHex), i * 16);
    }
    return buffer.buffer;
  }
}

export function generateNfc(tagData) {
  let nfc = "Filetype: Flipper NFC device\nVersion: 4\n";
  nfc += "# Device type can be ISO14443-3A, ISO14443-3B, ISO14443-4A, ISO14443-4B, ISO15693-3, FeliCa, NTAG/Ultralight, Mifare Classic, Mifare DESFire, SLIX, ST25TB\n";
  
  if (tagData.cardType === "ST25TB") {
    nfc += "Device type: ST25TB\n";
    nfc += "# UID is common for all formats\n";
    nfc += `UID: ${addSpacesToHex(tagData.uid)}\n`;
    nfc += "# ST25TB specific data\n";
    nfc += `ST25TB Type: 4K\n`; // Assumed 4K for now based on logic
    for (let i = 0; i < tagData.blocks.length; i++) {
      nfc += `Block ${i}: ${addSpacesToHex(tagData.blocks[i])}\n`;
    }
    nfc += "System OTP Block: FF FF FF FE\n";
  } else {
    nfc += "Device type: Mifare Classic\n";
    nfc += "# UID, ATQA and SAK are common for all formats\n";
    nfc += `UID: ${addSpacesToHex(tagData.uid)}\n`;
    nfc += `ATQA: ${addSpacesToHex(tagData.atqa)}\n`;
    nfc += `SAK: ${addSpacesToHex(tagData.sak)}\n`;
    nfc += `Mifare Classic type: ${tagData.cardType}\n`;
    nfc += "Data format version: 2\n";
    nfc += "# Mifare Classic blocks, '??' means unknown data\n";
    for (let i = 0; i < tagData.blocks.length; i++) {
      nfc += `Block ${i}: ${addSpacesToHex(tagData.blocks[i])}\n`;
    }
  }

  return nfc;
}
