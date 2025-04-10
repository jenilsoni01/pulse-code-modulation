// --- Chart Instances ---
let analogSampledChartInstance = null;
let quantizedChartInstance = null;
let reconstructedChartInstance = null;
let errorChartInstance = null;

// --- DOM Elements ---
const pcmForm = document.getElementById("pcm-form");
const frequencyInput = document.getElementById("frequency");
const amplitudeInput = document.getElementById("amplitude");
const phaseInput = document.getElementById("phase"); // New: Phase input
const startTimeInput = document.getElementById("startTime"); // New: Start Time
const endTimeInput = document.getElementById("endTime"); // New: End Time
const samplingRateInput = document.getElementById("samplingRate");
const quantizationLevelsInput = document.getElementById("quantizationLevels");
const pcmOutputElement = document.getElementById("pcm-output");
const errorMessageElement = document.getElementById("error-message");
const snrDisplayElement = document.getElementById("snr-display");
const pcmTableBody = document.querySelector("#pcm-data-table tbody");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("theme-icon"); // Theme icon span

// --- Constants ---
const MAX_DURATION = 20; // Max time range allowed in seconds
const DEBOUNCE_DELAY = 400; // Milliseconds for debouncing input

// --- Global State ---
let currentChartData = {}; // Store latest data for theme/option updates

// --- Debounce Function ---
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// --- Event Listeners ---
// Listen to 'input' on the form for real-time updates
pcmForm.addEventListener("input", debounce(handleInputChange, DEBOUNCE_DELAY));
themeToggle.addEventListener("change", handleThemeToggle);
document.addEventListener("DOMContentLoaded", initializeApp);

// --- Initialization ---
function initializeApp() {
  const savedTheme =
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  setTheme(savedTheme);
  // Initial generation based on default form values
  triggerGeneration();
}

// --- Theme Handling ---
function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggle.checked = theme === "dark";
  themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  localStorage.setItem("theme", theme);
  updateChartThemes(); // Update charts when theme changes
}

function handleThemeToggle() {
  const newTheme = themeToggle.checked ? "dark" : "light";
  setTheme(newTheme);
}

// --- Input Handling ---
function handleInputChange(event) {
  // Optional: Add specific handling if needed, e.g., validating dependent fields
  // For now, just trigger regeneration after debounce
  triggerGeneration();
}

// --- Core Logic Trigger ---
function triggerGeneration() {
  if (validateInputs()) {
    generateAndDisplay();
  }
  // Validation function now displays errors/warnings directly
}

// --- Input Validation ---
function validateInputs() {
  errorMessageElement.textContent = ""; // Clear previous errors
  let isValid = true;
  let isWarning = false;
  const messages = []; // Collect messages

  const frequency = parseFloat(frequencyInput.value);
  const amplitude = parseFloat(amplitudeInput.value);
  const phase = parseFloat(phaseInput.value); // Get phase
  const samplingRate = parseFloat(samplingRateInput.value);
  const quantizationLevels = parseInt(quantizationLevelsInput.value);
  const startTime = parseFloat(startTimeInput.value); // Get start time
  const endTime = parseFloat(endTimeInput.value); // Get end time

  // Check individual values
  if (isNaN(frequency) || frequency <= 0) {
    messages.push("Frequency must be > 0.");
    isValid = false;
  }
  if (isNaN(amplitude) || amplitude <= 0) {
    messages.push("Amplitude must be > 0.");
    isValid = false;
  }
  if (isNaN(phase)) {
    messages.push("Phase must be a number.");
    isValid = false;
  } // Basic check
  if (isNaN(samplingRate) || samplingRate <= 0) {
    messages.push("Sampling Rate must be > 0.");
    isValid = false;
  }
  if (
    isNaN(quantizationLevels) ||
    quantizationLevels < 2 ||
    !Number.isInteger(quantizationLevels)
  ) {
    messages.push("Quantization Levels must be an integer ≥ 2.");
    isValid = false;
  }
  if (isNaN(startTime) || startTime < 0) {
    messages.push("Start Time must be ≥ 0.");
    isValid = false;
  }
  if (isNaN(endTime) || endTime < 0) {
    messages.push("End Time must be ≥ 0.");
    isValid = false;
  }

  // Check time range validity only if individual times are valid numbers
  if (!isNaN(startTime) && !isNaN(endTime)) {
    if (endTime <= startTime) {
      messages.push("End Time must be greater than Start Time.");
      isValid = false;
    } else {
      const duration = endTime - startTime;
      if (duration > MAX_DURATION) {
        messages.push(
          `Time range duration (${duration.toFixed(
            2
          )}s) exceeds maximum (${MAX_DURATION}s).`
        );
        isValid = false;
      }
      // Nyquist check (as warning) if other core values are valid
      if (
        !isNaN(frequency) &&
        !isNaN(samplingRate) &&
        samplingRate > 0 &&
        frequency > 0
      ) {
        if (samplingRate < 2 * frequency) {
          messages.push(
            `Warning: Sampling Rate (${samplingRate} Hz) may be below Nyquist rate (${(
              2 * frequency
            ).toFixed(1)} Hz). Aliasing may occur.`
          );
          isWarning = true;
        }
      }
    }
  }

  // Display messages
  if (messages.length > 0) {
    errorMessageElement.textContent = messages.join(" ");
    // If only warnings, style differently
    if (isValid && isWarning) {
      errorMessageElement.style.color = "var(--warning-color)";
    } else {
      errorMessageElement.style.color = "var(--error-color)";
    }
  }

  return isValid; // Only return true if there are no fatal errors (warnings are ok)
}

// --- Data Generation and Processing ---
function generateAndDisplay() {
  // Clear potential previous warnings if generation proceeds successfully
  if (errorMessageElement.style.color === "var(--warning-color)") {
    errorMessageElement.textContent = "";
  }

  const frequency = parseFloat(frequencyInput.value);
  const amplitude = parseFloat(amplitudeInput.value);
  const phase = parseFloat(phaseInput.value);
  const samplingRate = parseFloat(samplingRateInput.value);
  const quantizationLevels = parseInt(quantizationLevelsInput.value);
  const startTime = parseFloat(startTimeInput.value);
  const endTime = parseFloat(endTimeInput.value);

  const data = generatePCMData(
    frequency,
    amplitude,
    phase,
    samplingRate,
    quantizationLevels,
    startTime,
    endTime
  );
  currentChartData = data; // Store latest data *before* updating charts

  updateCharts(); // Update charts using currentChartData
  displayPcmOutput(data.pcmCodes);
  displaySNR(data.sampledData, data.quantizedData);
  populatePcmTable(data);
}

function generatePCMData(
  frequency,
  amplitude,
  phaseDegrees,
  samplingRate,
  numLevels,
  startTime,
  endTime
) {
  const analogData = [];
  const sampledData = [];
  const quantizedData = [];
  const reconstructedData = [];
  const errorData = [];
  const pcmCodes = [];

  const phaseRad = (phaseDegrees * Math.PI) / 180; // Convert phase to radians
  const duration = endTime - startTime;
  if (duration <= 0) return {}; // Should be caught by validation, but safe check

  const samplingInterval = 1 / samplingRate;
  const signalMin = -amplitude;
  const signalMax = amplitude;
  const quantizationStep = (signalMax - signalMin) / numLevels;
  const numBits = Math.ceil(Math.log2(numLevels));

  // 1. Generate Analog Wave Data
  const totalAnalogPoints = Math.max(
    500,
    Math.ceil(duration * frequency * 200)
  ); // Aim for ~200 points per cycle
  const analogTimeStep = duration / (totalAnalogPoints - 1);
  for (let i = 0; i < totalAnalogPoints; i++) {
    const t = startTime + i * analogTimeStep;
    let value = calculateWaveValue(t, frequency, amplitude, phaseRad);
    analogData.push({ x: t, y: value });
  }
  // Ensure last point is exactly at endTime if step doesn't match
  if (
    analogData.length > 0 &&
    analogData[analogData.length - 1].x < endTime - 1e-9
  ) {
    let finalValue = calculateWaveValue(
      endTime,
      frequency,
      amplitude,
      phaseRad
    );
    analogData.push({ x: endTime, y: finalValue });
  }

  // 2. Sample, Quantize, Encode, etc.
  const numSamples = Math.floor(duration / samplingInterval) + 1;
  let lastQuantizedValue = calculateWaveValue(
    startTime,
    frequency,
    amplitude,
    phaseRad
  ); // Initialize at start time
  // Quantize the initial value for ZOH start
  let initialClamped = Math.max(
    signalMin,
    Math.min(signalMax - 1e-9, lastQuantizedValue)
  );
  let initialLevelIndex = Math.floor(
    (initialClamped - signalMin) / quantizationStep
  );
  let initialClampedLevelIndex = Math.max(
    0,
    Math.min(numLevels - 1, initialLevelIndex)
  );
  lastQuantizedValue =
    signalMin + (initialClampedLevelIndex + 0.5) * quantizationStep;

  for (let i = 0; i < numSamples; i++) {
    const sampleTime = startTime + i * samplingInterval;
    // Ensure sampleTime does not significantly exceed endTime
    if (sampleTime > endTime + 1e-9) break;

    const sampleValue = calculateWaveValue(
      sampleTime,
      frequency,
      amplitude,
      phaseRad
    );
    sampledData.push({ x: sampleTime, y: sampleValue });

    // Quantization
    const clampedValue = Math.max(
      signalMin,
      Math.min(signalMax - 1e-9, sampleValue)
    );
    const levelIndex = Math.floor(
      (clampedValue - signalMin) / quantizationStep
    );
    const clampedLevelIndex = Math.max(0, Math.min(numLevels - 1, levelIndex));
    const quantizedValue =
      signalMin + (clampedLevelIndex + 0.5) * quantizationStep;
    quantizedData.push({ x: sampleTime, y: quantizedValue });

    // PCM Encode
    const binaryCode = clampedLevelIndex.toString(2).padStart(numBits, "0");
    pcmCodes.push(binaryCode);

    // Quantization Error
    const error = sampleValue - quantizedValue;
    errorData.push({ x: sampleTime, y: error });

    // Reconstructed Data (ZOH)
    if (i > 0 || startTime === sampleTime) {
      // Add previous point unless it's literally the very first point at t=startTime
      reconstructedData.push({ x: sampleTime, y: lastQuantizedValue });
    }
    reconstructedData.push({ x: sampleTime, y: quantizedValue });
    lastQuantizedValue = quantizedValue;
  }

  // Add final point for reconstruction visualization
  if (sampledData.length > 0) {
    const lastSampleTime = sampledData[sampledData.length - 1].x;
    const nextPotentialSampleTime = lastSampleTime + samplingInterval;
    // Extend hold to the *earlier* of endTime or the next sample time
    const finalReconTime = Math.min(endTime, nextPotentialSampleTime);
    // Only add if it's meaningfully different from the last point's time
    if (finalReconTime > lastSampleTime + 1e-9) {
      reconstructedData.push({ x: finalReconTime, y: lastQuantizedValue });
    }
  }

  return {
    analogData,
    sampledData,
    quantizedData,
    reconstructedData,
    errorData,
    pcmCodes,
    amplitude,
    samplingInterval,
    startTime,
    endTime, // Pass necessary params
  };
}

// Updated wave calculation with phase
function calculateWaveValue(t, frequency, amplitude, phaseRad) {
  return amplitude * Math.sin(2 * Math.PI * frequency * t + phaseRad);
}

// --- Charting ---

function getChartColors() {
  const isDarkMode = document.body.getAttribute("data-theme") === "dark";
  // Use CSS variables for consistency
  const style = getComputedStyle(document.body);
  return {
    analog: "#3b82f6", // Blue
    sampled: "#ef4444", // Red
    quantized: "#10b981", // Green
    reconstructed: "#8b5cf6", // Purple
    error: "#f59e0b", // Amber/Orange
    grid: style.getPropertyValue("--grid-color").trim(),
    text: style.getPropertyValue("--text-color").trim(),
    tooltipBg: style.getPropertyValue("--tooltip-bg").trim(),
    tooltipText: style.getPropertyValue("--tooltip-text").trim(),
  };
}

// Takes data object (currentChartData)
function createChartOptions(yAxisLabel, chartTitle, data) {
  const colors = getChartColors();
  const { amplitude, startTime, endTime, errorData } = data;

  let minY = -amplitude * 1.1;
  let maxY = amplitude * 1.1;
  if (yAxisLabel.toLowerCase().includes("error")) {
    const maxAbsError =
      errorData && errorData.length > 0
        ? Math.max(...errorData.map((p) => Math.abs(p.y)), 0)
        : amplitude / 2;
    const buffer = maxAbsError * 0.15 + 1e-6;
    minY = -maxAbsError - buffer;
    maxY = maxAbsError + buffer;
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        position: "bottom",
        title: { display: true, text: "Time (s)", color: colors.text },
        min: startTime, // Use user-defined start time
        max: endTime, // Use user-defined end time
        ticks: {
          color: colors.text,
          maxRotation: 0,
          autoSkipPadding: 20,
          precision: 3,
        }, // Adjust precision/padding
        grid: { color: colors.grid, drawBorder: false },
      },
      y: {
        title: { display: true, text: yAxisLabel, color: colors.text },
        min: minY,
        max: maxY,
        ticks: { color: colors.text, precision: 3 }, // Adjust precision
        grid: { color: colors.grid, drawBorder: false },
      },
    },
    plugins: {
      title: {
        display: true,
        text: chartTitle,
        color: colors.text,
        font: { weight: "500", size: 14 },
        padding: { bottom: 15 },
      },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipText,
        bodyColor: colors.tooltipText,
        boxPadding: 4,
        padding: 8, // Tooltip padding
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null) {
              label += `(T: ${context.parsed.x.toFixed(
                4
              )}s, V: ${context.parsed.y.toFixed(4)})`;
            }
            return label;
          },
        },
      },
      legend: {
        display: true, // Show legend
        position: "top", // Position legend at the top
        align: "end", // Align legend items to the end (right)
        labels: {
          color: colors.text,
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
        }, // Style legend labels
      },
    },
    animation: { duration: 0 }, // Disable animation for real-time feel
    elements: {
      point: {
        radius: (ctx) => {
          const type = ctx.dataset.label || "";
          const numPoints =
            ctx.chart.data.datasets[ctx.datasetIndex]?.data?.length || 0;
          if (type.includes("Sampled") || type.includes("Error")) {
            return numPoints > 250 ? 1.5 : numPoints > 80 ? 2.5 : 3.5; // Dynamic radius
          }
          return 0;
        },
      },
      line: { tension: 0, borderWidth: 1.5 }, // Default tension/width
    },
  };
}

function updateCharts() {
  const data = currentChartData;
  if (!data || !data.analogData) return;

  const {
    analogData,
    sampledData,
    quantizedData,
    reconstructedData,
    errorData,
  } = data;
  const colors = getChartColors();

  // Define chart configurations
  const chartConfigs = [
    {
      id: "analogSampledChart",
      instance: analogSampledChartInstance,
      options: createChartOptions("Amplitude", "Original Wave & Samples", data),
      datasets: [
        {
          label: "Analog",
          data: analogData,
          borderColor: colors.analog,
          type: "line",
          tension: 0.1,
        },
        {
          label: "Sampled",
          data: sampledData,
          borderColor: colors.sampled,
          backgroundColor: colors.sampled,
          type: "scatter",
          showLine: false,
        },
      ],
    },
    {
      id: "quantizedChart",
      instance: quantizedChartInstance,
      options: createChartOptions("Quantized Amp.", "Quantized Signal", data),
      datasets: [
        {
          label: "Quantized",
          data: quantizedData,
          borderColor: colors.quantized,
          stepped: "before",
          pointRadius: (ctx) => ((quantizedData?.length || 0) < 60 ? 2.5 : 0), // Show points if few
          pointBackgroundColor: colors.quantized,
          backgroundColor: "transparent",
        },
      ],
    },
    {
      id: "reconstructedChart",
      instance: reconstructedChartInstance,
      options: createChartOptions(
        "Reconstructed Amp.",
        "Reconstructed Signal (ZOH)",
        data
      ),
      datasets: [
        {
          label: "Reconstructed",
          data: reconstructedData,
          borderColor: colors.reconstructed,
          stepped: "before",
          fill: false,
        },
      ],
    },
    {
      id: "errorChart",
      instance: errorChartInstance,
      options: createChartOptions(
        "Quantization Error",
        "Quantization Error",
        data
      ),
      datasets: [
        {
          label: "Error",
          data: errorData,
          borderColor: colors.error,
          backgroundColor: colors.error,
          showLine: false,
        },
      ],
    },
  ];

  // Update or create each chart
  chartConfigs.forEach((config, index) => {
    const ctx = document.getElementById(config.id)?.getContext("2d");
    if (!ctx) return;

    // Destroy previous instance if it exists
    let chartInstance = window[`${config.id}Instance`]; // Access global instance variable
    if (chartInstance) {
      chartInstance.destroy();
    }

    // Create new chart instance
    chartInstance = new Chart(ctx, {
      // Determine chart type (scatter if multiple dataset types, else line)
      type:
        config.datasets.length > 1 &&
        config.datasets.some((ds) => ds.type === "scatter")
          ? "scatter"
          : "line",
      data: { datasets: config.datasets },
      options: config.options,
    });
    window[`${config.id}Instance`] = chartInstance; // Store new instance globally
  });
}

// Function to update chart colors/options when theme changes
function updateChartThemes() {
  const chartInstances = [
    window.analogSampledChartInstance,
    window.quantizedChartInstance,
    window.reconstructedChartInstance,
    window.errorChartInstance,
  ];
  // Titles and Y-labels are now set directly within createChartOptions based on data,
  // but we still need identifiers or context if logic depended on index here.
  // For simplicity, we'll assume createChartOptions handles titles correctly based on context.
  // Example titles/labels for context:
  const yLabels = [
    "Amplitude",
    "Quantized Amp.",
    "Reconstructed Amp.",
    "Quantization Error",
  ];
  const titles = [
    "Original Wave & Samples",
    "Quantized Signal",
    "Reconstructed Signal (ZOH)",
    "Quantization Error",
  ];

  chartInstances.forEach((chart, index) => {
    // Check if chart exists AND if we have data to base options on
    if (chart && currentChartData && currentChartData.amplitude) {
      // 1. Generate completely new options based on the current theme and data
      // Pass the appropriate label/title for context if needed by createChartOptions internal logic
      const newOptions = createChartOptions(
        yLabels[index],
        titles[index],
        currentChartData
      );

      // *** KEY CHANGE: Replace the entire options object ***
      chart.options = newOptions;

      // 2. Update dataset colors directly (optional but good practice for reinforcement)
      // This ensures dataset-specific colors also match the theme if not covered by general options
      const colors = getChartColors();
      const colorKeys = [
        // Match dataset order in updateCharts
        [colors.analog, colors.sampled],
        [colors.quantized],
        [colors.reconstructed],
        [colors.error],
      ];
      chart.data.datasets.forEach((dataset, dsIndex) => {
        if (colorKeys[index] && colorKeys[index][dsIndex]) {
          const color = colorKeys[index][dsIndex];
          dataset.borderColor = color;
          // Only set backgroundColor for non-line datasets or if explicitly needed
          if (
            dataset.type === "scatter" ||
            dataset.label?.includes("Sampled") ||
            dataset.label?.includes("Error")
          ) {
            dataset.backgroundColor = color;
          } else {
            // Ensure line charts don't get filled unexpectedly unless desired
            // dataset.backgroundColor = 'transparent'; // Or remove if not needed
          }
          if (dataset.pointBackgroundColor) {
            // Check if property exists
            dataset.pointBackgroundColor = color;
          }
        }
      });

      // 3. Update the chart to apply the new options and colors
      chart.update("none"); // Use 'none' to avoid distracting animation during theme switch
    }
  });
}

// --- Output Displays (SNR, Table, PCM Code) --- - Minor updates for safety/formatting

function displayPcmOutput(pcmCodes) {
  if (!pcmCodes) {
    pcmOutputElement.textContent = "";
    return;
  }
  pcmOutputElement.textContent = pcmCodes.join(" "); // Use single space for wrapping
}

function displaySNR(sampled, quantized) {
  // ... (SNR calculation remains largely the same, ensure safety checks)
  if (
    !sampled ||
    sampled.length === 0 ||
    !quantized ||
    quantized.length !== sampled.length
  ) {
    snrDisplayElement.textContent = "SNR: N/A";
    return;
  }
  let signalPower = 0;
  let noisePower = 0;
  const n = sampled.length;
  if (n === 0) {
    snrDisplayElement.textContent = "SNR: N/A";
    return;
  }

  for (let i = 0; i < n; i++) {
    const signalVal = sampled[i].y;
    const errorVal = signalVal - (quantized[i]?.y ?? 0);
    signalPower += signalVal * signalVal;
    noisePower += errorVal * errorVal;
  }
  signalPower /= n;
  noisePower /= n;
  // ... (Rest of SNR formatting logic remains the same) ...
  let snrDb;
  const epsilon = 1e-12;
  if (noisePower < epsilon) {
    snrDb = Infinity;
  } else if (signalPower < epsilon) {
    snrDb = -Infinity;
  } else {
    snrDb = 10 * Math.log10(signalPower / noisePower);
  }

  if (isFinite(snrDb)) {
    snrDisplayElement.textContent = `SNR: ${snrDb.toFixed(2)} dB`;
  } else if (snrDb === Infinity) {
    snrDisplayElement.textContent = "SNR: ∞ dB";
  } else {
    snrDisplayElement.textContent = "SNR: N/A";
  }
}

function populatePcmTable(data) {
  const { sampledData, quantizedData, errorData, pcmCodes } = data;
  pcmTableBody.innerHTML = "";
  if (!sampledData || sampledData.length === 0) return;

  sampledData.forEach((sample, index) => {
    const row = pcmTableBody.insertRow();
    const createCell = (text, isMono = false) => {
      const cell = row.insertCell();
      cell.textContent = text;
      if (isMono) cell.style.fontFamily = "monospace";
      return cell;
    };
    createCell(index);
    createCell(sample.x.toFixed(4));
    createCell(sample.y.toFixed(4));
    createCell(quantizedData[index]?.y?.toFixed(4) ?? "-");
    createCell(errorData[index]?.y?.toFixed(4) ?? "-");
    createCell(pcmCodes[index] ?? "-", true);
  });
}

// Make instances accessible globally (alternative to passing them around constantly)
window.analogSampledChartInstance = analogSampledChartInstance;
window.quantizedChartInstance = quantizedChartInstance;
window.reconstructedChartInstance = reconstructedChartInstance;
window.errorChartInstance = errorChartInstance;
