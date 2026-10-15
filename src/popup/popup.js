const detectButton = document.getElementById("detect");
const statusText = document.getElementById("status");
const resultsList = document.getElementById("results");

supportsNativeQr().then((supported) => {
  if (!supported) {
    detectButton.disabled = true;
    showStatus("Ваш браузер не умеет распознавать QR-коды, детект не работает.");
  }
});

detectButton.addEventListener("click", async () => {
  detectButton.disabled = true;
  resultsList.replaceChildren();
  showStatus("Ищу QR-коды…");

  try {
    const screenshot = await chrome.tabs.captureVisibleTab({ format: "png" });

    const image = new Image();
    image.src = screenshot;
    await image.decode();

    const canvas = createCanvas(image);
    showCanvas(canvas);

    const codes = await detectCodes(canvas);

    if (codes.length === 0) {
      showStatus("QR-коды не найдены");
      return;
    }

    showStatus(codes.length === 1 ? "Найден 1 QR-код" : `Найдено QR-кодов: ${codes.length}`);
    for (const value of codes) {
      resultsList.append(renderResult(value));
    }
  } catch (error) {
    showStatus(`Ошибка: ${error.message}`);
  } finally {
    detectButton.disabled = false;
  }
});

function createCanvas(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return canvas;
}

function showCanvas(canvas) {
  canvas.className = "preview";
  canvas.id = "preview";
  document.getElementById("preview").replaceWith(canvas);
}

async function detectCodes(canvas) {
  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const codes = await detector.detect(canvas);
  return [...new Set(codes.map((code) => code.rawValue))];
}

async function supportsNativeQr() {
  if (!("BarcodeDetector" in self)) {
    return false;
  }
  const formats = await BarcodeDetector.getSupportedFormats();
  return formats.includes("qr_code");
}

function renderResult(value) {
  const item = document.createElement("li");

  if (isWebLink(value)) {
    const link = document.createElement("a");
    link.href = value;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = value;
    item.append(link);
  } else {
    item.textContent = value;
  }

  return item;
}

function isWebLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function showStatus(text) {
  statusText.textContent = text;
  statusText.hidden = false;
}
