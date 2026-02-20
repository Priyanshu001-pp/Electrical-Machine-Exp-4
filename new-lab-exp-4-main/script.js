jsPlumb.ready(function () {
 
 // ✅ GLOBAL showPopup so it works before jsPlumb.ready fires
window.showPopup = function(message, title = "Alert") {
  const modal = document.getElementById("warningModal");
  if (!modal) return;
  const box = modal.querySelector(".modal-box");
  const msg = document.getElementById("modalMessage");
  const ttl = document.getElementById("modalTitle");
  const sound = document.getElementById("alertSound");

if (ttl) ttl.textContent = title;
  if (msg) msg.innerHTML = message;
  if (box) box.classList.add("danger");
  modal.classList.add("show");

  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
};


  // =====================
  // 🔊 VOICE ENGINE (GLOBAL)
  // =====================
  window.labSpeech = {
    enabled: true,
 
    speak(text) {
      if (!this.enabled) return;
      if (!("speechSynthesis" in window)) return;
 
      speechSynthesis.cancel();
 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
 
      const voices = speechSynthesis.getVoices();
      utterance.voice =
        voices.find(v => v.lang.startsWith("en-IN")) ||
        voices.find(v => v.lang.startsWith("en")) ||
        voices[0];
 
      speechSynthesis.speak(utterance);
    },
 
    stop() {
      speechSynthesis.cancel();
    }
  };

  
 
 
  let mcbState = "OFF";   // 🔥 ADD THIS
  let mcbReady = false;
  const mcbImg = document.querySelector(".mcb-toggle");
 
  let currentVoltage = 0;
  let currentRPM = 0;
 
  let currentStepIndex = 0;
 
  let checkClickedAfterCompletion = false;
 
  let guideActive = false;
  let introSpoken = false;

  // =====================
// 🎯 HIGHLIGHT SYSTEM FOR SPEAKING
// =====================
const SPEAK_HIGHLIGHT_CLASS = "speak-glow";
const SPEAK_LINE_COLOR = "#f59e0b";
const SPEAK_LINE_WIDTH = 7;
const activeSpeakLabels = new Set();
const activeSpeakConnections = new Map();
 
  function speakCurrentStep() {
    if (!guideActive) return;
 
    // 1️⃣ Check clicked, DC OFF
    // 1️⃣ Check clicked, DC OFF - BUT verify connections still complete

if (checkClickedAfterCompletion && mcbState === "OFF") {
  // 🔍 RE-CHECK if all connections still exist
  const connections = jsPlumb.getAllConnections();
  const allStillConnected = requiredPairs.every(pair => {
    const [a, b] = pair.split("-");
    return isPairConnected(a, b, connections);
  });

  if (allStillConnected) {
    labSpeech.speak(
      "Connections are already verified. Now turn on the DC supply."
    );
    return;
  } else {
    // 🔄 Wire was removed, reset check state
    checkClickedAfterCompletion = false;
    currentStepIndex = getFirstMissingStepIndex();
    // Fall through to speak the missing step below
  }
}
    // 2️⃣ DC ON, starter OFF
    if (mcbState === "ON" && !starterEngaged) {
      labSpeech.speak(
        "DC supply is already on. Now turn on the starter by moving the handle from left to right."
      );
      return;
    }
 
    // 3️⃣ Starter ON, field NOT set
    if (starterEngaged && !fieldLocked) {
      labSpeech.speak(
        "Starter is already on. Now set the field resistance."
      );
      return;
    }
 
    // 4️⃣ Field set (your required unified condition ✅)
    if (starterEngaged && fieldLocked) {
      labSpeech.speak(
        `Field resistance is already set. The armature voltage is ${currentVoltage} volts and the speed is ${currentRPM} RPM. Now adjust the armature rheostat to take readings.`
      );
      return;
    }
 
    // 5️⃣ Wiring complete but Check NOT clicked
  // 5️⃣ Wiring complete but Check NOT clicked
if (
  currentStepIndex >= requiredPairs.length &&
  !checkClickedAfterCompletion
) {
  // 🔍 RE-CHECK if all connections still exist
  const connections = jsPlumb.getAllConnections();
  const allStillConnected = requiredPairs.every(pair => {
    const [a, b] = pair.split("-");
    return isPairConnected(a, b, connections);
  });

  if (allStillConnected) {
    labSpeech.speak(
      "The connections are now complete. Click the Check button to confirm them."
    );
    return;
  } else {
    // 🔄 Something was removed, re-sync step index
    currentStepIndex = getFirstMissingStepIndex();
    // Fall through to speak the missing step below
  }
}
 
    // 6️⃣ Normal wiring steps
    const [a, b] = requiredPairs[currentStepIndex].split("-");
    const stepNo = currentStepIndex + 1;
 
    labSpeech.speak(
      `Step ${stepNo}. Please connect point ${a.replace("point", "")} to point ${b.replace("point", "")}.`
    );
  }
 
 
  // =====================
  // 🎧 VOICE GUIDE CONTROL
  // =====================
 
 
 
 
  const speakBtn = document.querySelector(".speak-btn");
 
 
  if (speakBtn) {
    speakBtn.addEventListener("click", () => {
 
      // ▶️ START GUIDE
      if (!guideActive) {
 
        guideActive = true;
        speakBtn.setAttribute("aria-pressed", "true");
        speakBtn.querySelector(".speak-btn__label").textContent = "GUIDING. . .";
 
 
        // 🔥 🔥 🔥 KEY LINE (SYNC WITH REALITY)
        currentStepIndex = getFirstMissingStepIndex();
 
        // ✅ ALL CONNECTIONS ALREADY DONE
        if (currentStepIndex >= requiredPairs.length) {
          speakCurrentStep(); // will say "Click Check"
          return;
        }
 
        // 🔊 INTRO (ONLY ONCE, ONLY IF NOT AUTO-CONNECT)
        if (!introSpoken && !completedByAutoConnect) {
          labSpeech.speak("Let's connect the components.");
          introSpoken = true;
 
          setTimeout(() => {
            if (guideActive) speakCurrentStep();
          }, 2000);
        } else {
          speakCurrentStep();
        }
 
        return;
      }
 
      // ⏹ STOP GUIDE
      guideActive = false;
      labSpeech.stop();
      speakBtn.setAttribute("aria-pressed", "false");
      speakBtn.querySelector(".speak-btn__label").textContent = "TAP TO LISTEN";
 
    });
 
  }
 
  window.isGuideActive = () => guideActive;
 
  // ================== VOICE FLOW AFTER ARMATURE ==================
  let voiceStage = "idle";
 
  // Helper: speak only if guide is active
  function guidedSpeak(text) {
    if (window.isGuideActive && window.isGuideActive()) {
      labSpeech.speak(text);
    }
  }
 
  // ---- FIELD RHEOSTAT GUIDANCE ----
  function onFieldResistanceSet(current, rpm) {
 
    guidedSpeak(
      `Field resistance is set.
     The current is ${current.toFixed(2)} ampere
     and the speed is ${rpm} R P M.
     Now click on Add to Table button.`
    );
 
    voiceStage = "field_set";
  }
 
  // ---- AFTER ADD TO TABLE ----
function onReadingAdded(total) {
   // ✅ Show popup ONLY for the first reading
  if (total === 1) {
    showPopup(
      "Reading added to the observation table.",
      "Observation"
    );
  }
  if (total < 5) {
    guidedSpeak(
      "Reading added successfully. Now vary the armature rheostat to take the next reading."
    );
    voiceStage = "reading_added";
  }

  if (total === 5) {
    // ✅ SHOW ALERT POPUP
    showPopup(
      "You have added five readings. Now you can plot the graph.<br> by clicking on the graph button or add more readings to the table.",
      "Graph Ready"
    );

    guidedSpeak(
      "Five readings are completed. Now click on the Graph button to plot the graph."
    );

    voiceStage = "five_completed";
  }
   // ✅ Show popup when 7 readings are added
  if (total === 7) {
    showPopup(
      "You can add a maximum of 7 readings to the table. Now, click the Graph button.",
      "Maximum Readings Reached"
    );

    guidedSpeak(
      "You have added seven readings. Now click on the Graph button to plot the graph."
    );

    voiceStage = "seven_completed";
  }
}
 
  // ---- AFTER GRAPH ----
  function onGraphPlotted() {
    guidedSpeak(
      "Graph is plotted successfully. Now click on the Report button to generate the report."
    );
    voiceStage = "graph_done";
  }
 
  // ---- AFTER REPORT ----
  function onReportGenerated() {
    guidedSpeak(
      "Report is generated successfully. You can print it if required. Now click on the Reset button to repeat the experiment."
    );
    voiceStage = "report_done";
  }
 
  // ---- AFTER RESET ----
  function onExperimentReset() {
    guidedSpeak(
      "Experiment has been reset. You can start again by making the connections."
    );
    voiceStage = "idle";
  }
  // ================== END VOICE FLOW ==================
 
 
 
  // ===== GRAPH DATA STORE =====
  const graphReadings = [];
  const MIN_GRAPH_POINTS = 5;
 
 
  // ===== POPUP MODAL FUNCTION =====
  function showPopup(message, title = "Alert") {
    const modal = document.getElementById("warningModal");
    const box = modal.querySelector(".modal-box");
    const msg = document.getElementById("modalMessage");
    const ttl = document.getElementById("modalTitle");
    const sound = document.getElementById("alertSound");
 
    ttl.textContent = title;
  msg.innerHTML = message;
 
    box.classList.add("danger");
    modal.classList.add("show");
 
    if (sound) {
      sound.currentTime = 0;
      sound.play();
    }
  }
 
  // function closeModal() {
  //   const modal = document.getElementById("warningModal");
  //   const sound = document.getElementById("alertSound");
 
  //   modal.classList.remove("show");
  //   if (sound) sound.pause();
  // }
 
  function closeModal() {
    const modal = document.getElementById("warningModal");
    const box = modal.querySelector(".modal-box");
    const sound = document.getElementById("alertSound");
 
    box.classList.add("closing");
 
    setTimeout(() => {
      modal.classList.remove("show");
      box.classList.remove("closing");
    }, 500);
 
    if (sound) sound.pause();
  }
 
  function isModalOpen() {
    const modal = document.getElementById("warningModal");
    return modal && modal.classList.contains("show");
  }
 
  function waitForWarningModalAcknowledgement() {
    return new Promise((resolve) => {
      const modal = document.getElementById("warningModal");
      if (!modal) {
        resolve();
        return;
      }

      const closeBtn = modal.querySelector("[data-modal-close]");
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        closeBtn?.removeEventListener("click", onClose);
        modal.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onEsc);
        resolve();
      };

      const onClose = () => cleanup();
      const onBackdrop = (event) => {
        if (event.target === modal) cleanup();
      };
      const onEsc = (event) => {
        if (event.key === "Escape") cleanup();
      };

      closeBtn?.addEventListener("click", onClose, { once: true });
      modal.addEventListener("click", onBackdrop, { once: true });
      document.addEventListener("keydown", onEsc, { once: true });
    });
  }
 
 
  window.closeModal = closeModal;

  // ===============================
// ✅ WARNING MODAL OK BUTTON FIX
// ===============================
document.addEventListener("click", function (e) {

  // Detect OK button click
  if (e.target.matches("[data-modal-close]")) {
    e.stopPropagation();   // ⛔ stop blocked clicks
    closeModal();
  }

});

 
 
  /* =====================================
   OBSERVATION TABLE (JS GENERATED)
   ===================================== */
 
  const observationContainer = document.getElementById("observation-container");
 
  let observationBody;
  // let observationCount = 0;
 
  function createObservationTable() {
 
    observationContainer.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>S No.</th>
          <th>Armature Voltage (V)</th>
          <th>Speed (RPM)</th>
        </tr>
      </thead>
      <tbody id="observationBody">
</tbody>
    </table>
  `;
 
    observationBody = document.getElementById("observationBody");
  }
 
 
  function addObservationRow() {
 
 
    if (currentVoltage === 0 || currentRPM === 0) {
      showPopup(
        "First, set the field rheostat. ",
        "Step Required"
      );
 
      return;
    }
 
    // 🔒 Duplicate check
    const rows = observationBody.querySelectorAll("tr");
 
    for (let row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length === 3) {
        const v = parseInt(cells[1].textContent);
        const r = parseInt(cells[2].textContent);
 
        if (v === currentVoltage && r === currentRPM) {
          showPopup(
            "This reading is already added to the table.",
            "Duplicate Entry"
          );
          return;
        }
      }
    }
 
    // Placeholder remove
    const placeholder = observationBody.querySelector(".placeholder-row");
    if (placeholder) placeholder.remove();
 
    const serial = observationBody.querySelectorAll("tr").length + 1;
 
    const tr = document.createElement("tr");
    tr.innerHTML = `
    <td>${serial}</td>
    <td>${currentVoltage}</td>
    <td>${currentRPM}</td>
  `;
 
    observationBody.appendChild(tr);
 
    // ===== STORE DATA FOR GRAPH =====
    graphReadings.push({
      voltage: currentVoltage,
      rpm: currentRPM
    });
 
    // 🔊 VOICE AFTER ADD TO TABLE
    onReadingAdded(graphReadings.length);
 
    // Enable graph button if minimum readings reached
    updateGraphButtonState();
 
  }
 
 function updateGraphButtonState() {
  const plotGraphBtn = document.getElementById("plotGraphBtn");
  if (!plotGraphBtn) return;

  const shouldDisable = graphReadings.length < MIN_GRAPH_POINTS;

  plotGraphBtn.disabled = shouldDisable;
  plotGraphBtn.style.opacity = shouldDisable ? "0.5" : "1";
  plotGraphBtn.style.cursor = shouldDisable ? "not-allowed" : "pointer";
  plotGraphBtn.style.pointerEvents = shouldDisable ? "none" : "auto";
}

 
 
  // ===== GRAPH DRAW FUNCTION =====
 
  function drawGraph() {
 
    if (graphReadings.length < MIN_GRAPH_POINTS) {
      showPopup(
        "⚠️ Please add at least 5 readings to plot the graph.",
        "Insufficient Data"
      );
      return;
    }
 
    // Sort readings by voltage
    const sorted = [...graphReadings].sort((a, b) => a.voltage - b.voltage);
 
    const xValues = sorted.map(r => r.voltage);
    const yValues = sorted.map(r => r.rpm);
 
    // Hide SVG container
    const graphBars = document.getElementById("graphBars");
    if (graphBars) graphBars.style.display = "none";
 
    const graphCanvas = document.querySelector(".graph-canvas");
if (graphCanvas) {
  graphCanvas.classList.add("is-plotting");
}
 
    // Show Plotly container
    const graphPlot = document.getElementById("graphPlot");
    if (!graphPlot) return;
    graphPlot.style.display = "block";
 
    // Load Plotly dynamically
    function loadPlotly() {
      if (window.Plotly) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.plot.ly/plotly-3.0.1.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
 
    loadPlotly().then(() => {
 
      const trace = {
        x: xValues,
        y: yValues,
        mode: "lines+markers",
        type: "scatter",
        marker: { color: "#1b6fb8", size: 8 },
        line: { color: "#1b6fb8", width: 3 }
      };
 
 
      const layout = {
        title: {
          text: "<b>Speed (RPM) vs Armature Voltage (V)</b>",
          font: { size: 16 }
        },
 
        margin: { l: 120, r: 30, t: 60, b: 100 },
 
        //margin: { l: 80, r: 30, t: 50, b: 70 },
 
 
        xaxis: {
          title: {
            text: "Armature Voltage (V)",
            standoff: 40,
            font: {
              color: "#2c1a0a",
              size: 14,
              family: "Arial Black"
            }
          },
          type: "category",
          categoryarray: xValues.map(String),
 
           showgrid: true,
          gridcolor: "rgba(0, 0, 0, 0.07)",
          zeroline: false
        },
 
        yaxis: {
          title: {
            text: "Speed (RPM)",
            standoff: 50,
            font: {
              color: "#2c1a0a",
              size: 14,
              family: "Arial Black"
            }
          },
          type: "category",
          categoryarray: yValues.map(String),
 
          showgrid: true,
          gridcolor: "rgba(0, 0, 0, 0.07)",
          zeroline: false
        },
 
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)"
 
      };
 
 
     Plotly.newPlot(graphPlot, [trace], layout, {
        responsive: true,
        displaylogo: false
      }).then(() => {
        Plotly.Plots.resize(graphPlot);

        if (reportBtn) {
          reportBtn.disabled = false;
          reportBtn.style.opacity = "1";
          reportBtn.style.cursor = "pointer";
          reportBtn.style.pointerEvents = "auto";
        }

        // ✅ GRAPH READY ALERT
        showPopup(
          "Graph plotted successfully. You can now generate the report.",
          "Graph Ready"
        );

        // 🔊 VOICE AFTER GRAPH PLOT
        onGraphPlotted();
      });
    });
  }
 
 
 
  // ===== STARTER HANDLE STATE =====
  const starterHandle = document.querySelector(".starter-handle");
 
  // ===== FIELD RESISTANCE STATE =====
  let fieldLocked = false;
  let fieldDragging = false;
  let fieldStartX = 0;
 
  // percentage based position
  let fieldCurrentPercent = 15;   // start position = 15%
 
  const FIELD_MIN = 15;   // left limit
  const FIELD_MAX = 85;   // 🔥 center se pehle auto-lock
 
  const fieldKnob = document.querySelector(".nob1");
 
 
  // ===== STARTER FLAGS =====
 
  let starterDragging = false;
  let starterEngaged = false;
 
  let startMouseX = 0;
 
  // starter movement limits
  const START_X = 0;        // left start
  const END_X = 90;        // right end
  const CURVE_HEIGHT = 25; // curve depth
 
 
 
  // ===== STEP-4: ARMATURE RESISTANCE / SPEED SLIDER LOGIC =====
  const armatureKnob = document.querySelector(".nob2");
  const voltNeedle = document.querySelector(".meter-needle1");
  const ampNeedle = document.querySelector(".meter-needle3");
  const rotor = document.getElementById("gr");
  const rpmDisplay = document.getElementById("rpmDisplay");
 
 
  if (voltNeedle) {
    voltNeedle.style.transition = "transform 0.8s ease-in-out";
  }
 
  if (ampNeedle) {
    ampNeedle.style.transition = "transform 0.6s ease-in-out";
  }
 
 
  // ===== CONTINUOUS ROTOR STATE =====
  let rotorAngle = 0;
  let rotorRunning = false;
  let lastFrameTime = null;
 
  // ===== ROTOR VISUAL SPEED (NOT RPM) =====
  let rotorSpeed = 0;
 
  // 🔬 EXACT LAB OBSERVATION TABLE
  const armatureTable = [
    { voltage: 132, rpm: 1085 },
    { voltage: 139, rpm: 1170 },
    { voltage: 152, rpm: 1301 },
    { voltage: 166, rpm: 1400 },
    { voltage: 176, rpm: 1507 },
    { voltage: 198, rpm: 1690 },
    { voltage: 220, rpm: 1889 }
  ];

      function updateVoltmeterByArmature(stepIndex) {
  const row = armatureTable[stepIndex];
  
  // Display values
  currentVoltage = row.voltage;
  currentRPM = row.rpm;
  
    // ✅ ROTOR VISUAL SPEED (REAL CONTROL)
    rotorSpeed = ARMATURE_ROTATION_SPEED[stepIndex];

  // ✅ SIMPLE: Direct angle for each step
  const needleAngles = [
    -35,    // Step 1 (132V)
    -30,    // Step 2 (139V)
    -24.5,    // Step 3 (152V)
    -21.5,  // Step 4 (166V)
    -17.5,  // Step 5 (176V)
    -8,   // Step 6 (198V)
    -1    // Step 7 (220V)
  ];
  
  const voltAngle = needleAngles[stepIndex];
  
  voltNeedle.style.transform = 
    `translate(-75%, -82%) rotate(${voltAngle}deg)`;
 
    // 🔥 RPM DIGITAL DISPLAY UPDATE
    if (rpmDisplay) {
      rpmDisplay.textContent = currentRPM;
    }
 
    if (isGuideActive()) {
      labSpeech.speak(
        `Voltage is ${currentVoltage} volts and speed is ${currentRPM} RPM. now click on add to table button to add readings in observation table`
      );
    }
 
    // 🔊 NEW VOICE FLOW AFTER ARMATURE SET
    if (voiceStage === "idle") {
      onFieldResistanceSet(7.4, currentRPM);
    }
 
 
 
  }
 
 
 
  const ARMATURE_ROTATION_SPEED = [
    3,   // Step 1
    5,   // Step 2
    7,   // Step 3
    9,   // Step 4
    11,  // Step 5
    15,  // Step 6
    17   // Step 7
  ];
 
 
  // ===== ROTOR SPEED STATES =====
  // let fieldRPM = 1085;      // 🔥 Base speed from field resistance
  // let armatureRPM = 0;     // 🔧 Extra speed from armature resistance
 
 
  function runRotor() {
    if (!rotorRunning) return;
 
    rotorAngle += rotorSpeed; // 🔥 STEP BASED VISUAL SPEED
 
    rotor.style.transform =
      `translate(-50%, -50%) rotate(${rotorAngle}deg)`;
 
    requestAnimationFrame(runRotor);
  }
 
 
 
  function setFieldDefaultMeters() {
    const ampAngle = -70 + (7.7 / 10) * 140;
    ampNeedle.style.transform =
      `translate(-30%, -90%) rotate(${ampAngle}deg)`;
  }
 
 
  // `translate(-60%, -90%) rotate(${voltAngle}deg)`;
 
  const KNOB_START_X = 28;   // CSS me .nob2 ka left
  let armatureX = KNOB_START_X;
 
  let isDragging = false;
 
  const MIN_X = 28;
  const MAX_X = 252;
 
  const TOTAL_STEPS = armatureTable.length;   // = 7
  const STEP_WIDTH = (MAX_X - MIN_X) / (TOTAL_STEPS - 1);
 
 
  let startX = 0;       // mouse start position
  let knobStartX = 0;  // knob ki position jab mouse dabaya
 
  if (starterHandle) {
    starterHandle.style.cursor = "not-allowed";
  }
 
 
  if (armatureKnob) {
 
    armatureKnob.style.cursor = "not-allowed";
 
    armatureKnob.addEventListener("mousedown", (e) => {
      if (mcbState !== "ON" || !starterEngaged || !fieldLocked) {
        showPopup(
          "First turn ON DC Supply"
        );
        return;
      }
 
 
      isDragging = true;
 
      // 🔒 mouse aur knob ki starting position save karo
      startX = e.clientX;
      knobStartX = armatureX;
 
      armatureKnob.style.cursor = "grabbing";
      e.preventDefault();
    });
 
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
 
      isDragging = false;
      armatureKnob.style.cursor = "grab";
 
      // 🔒 SNAP TO NEAREST STEP
      const rawStep = (armatureX - MIN_X) / STEP_WIDTH;
      const stepIndex = Math.round(rawStep);
 
      const safeIndex = Math.max(
        0,
        Math.min(stepIndex, armatureTable.length - 1)
      );
 
      // 🎯 exact X position
      armatureX = MIN_X + safeIndex * STEP_WIDTH;
 
      armatureKnob.style.transform =
        `translateX(${armatureX - KNOB_START_X}px)`;
 
      updateVoltmeterByArmature(safeIndex);
 
      // 🔄 START ROTOR FROM ARMATURE STEP
      if (!rotorRunning && mcbState === "ON" && starterEngaged) {
        rotorRunning = true;
        requestAnimationFrame(runRotor);
      }
 
 
    });
 
 
    document.addEventListener("mousemove", (e) => {
      if (!isDragging || mcbState !== "ON") return;
 
      const deltaX = e.clientX - startX;
      armatureX = knobStartX + deltaX;
 
      armatureX = Math.max(MIN_X, Math.min(MAX_X, armatureX));
 
      armatureKnob.style.transform =
        `translateX(${armatureX - KNOB_START_X}px)`;
    });
 
  }
  function turnMCBOff(reason = "") {
 
    completedByAutoConnect = false;   // ✅ RESET AUTO CONNECT STATE
 
    // 🔥 RESET RPM DISPLAY
    currentRPM = 0;
    if (rpmDisplay) {
      rpmDisplay.textContent = "0";
    }
 
    const fieldKnob = document.querySelector(".nob1");
    if (mcbState === "OFF") return;
 
 
    mcbState = "OFF";
    mcbReady = false;
 
    if (mcbImg) {
      mcbImg.src = "images/mcb-off.png";
    }

   // ✅ RE-ENABLE CHECK & AUTO CONNECT BUTTONS
    enableCheckAndAutoConnect();

 
    // 🔥 RESET ARMATURE RHEOSTAT (STEP-4)
    armatureX = KNOB_START_X;
    isDragging = false;
 
    if (armatureKnob) {
      armatureKnob.style.transform = "translateX(0px)";
      armatureKnob.style.cursor = "not-allowed";
    }
 
    if (ampNeedle) {
      ampNeedle.style.transform =
        "translate(-30%, -90%) rotate(-70deg)";
    }
 
    if (voltNeedle) {
      voltNeedle.style.transform =
        "translate(-75%, -82%) rotate(-75deg)";
    }
 
    if (rotor) {
 
 
      rotorRunning = false;
      rotorAngle = 0;
      rotorSpeed = 0;
      lastFrameTime = null;
 
 
 
 
      rotor.style.transform =
        "translate(-50%, -50%) rotate(0deg)";
 
 
    }
 
    // ===== RESET STARTER HANDLE =====
    starterEngaged = false;
    starterDragging = false;
 
    if (starterHandle) {
      starterHandle.style.transform = "translate(0px, 0px)";
      starterHandle.style.cursor = "not-allowed";
    }
 
    // ===== RESET FIELD RESISTANCE (nob1) =====
    if (fieldKnob) {
 
      fieldLocked = false;
      fieldDragging = false;
      fieldCurrentPercent = FIELD_MIN;
 
      fieldKnob.style.left = "15%";   // same as CSS start
      fieldKnob.style.transform = "translate(-50%, -50%)";
      fieldKnob.style.cursor = "not-allowed";
    }
 
 
    console.log("MCB OFF", reason);
 
    if (reason) {
      showPopup(
        "⚠️ DC SUPPLY TURNED OFF!\n\nReason: " + reason,
        "MCB OFF"
      );
    }
 
    // 🔁 Reset observation table on MCB OFF
    createObservationTable();
 
    // 🔁 Reset auto-connect & guided check state
    autoConnectUsed = false;
 
    // 🔥 Reset guided steps ONLY on full reset / manual MCB OFF
    if (
      reason === "" ||
      reason === "Reset pressed"
    ) {
      currentStepIndex = 0;
    }
 
  }


  // ==============================
  // 🔒 DISABLE CHECK & AUTO CONNECT BUTTONS
  // ==============================
  function disableCheckAndAutoConnect() {
    const checkBtn = document.getElementById("checkBtn");
    const autoBtn = document.getElementById("auto");

    if (checkBtn) {
      checkBtn.disabled = true;
      checkBtn.style.opacity = "0.5";
      checkBtn.style.cursor = "not-allowed";
      checkBtn.style.pointerEvents = "none";
    }

    if (autoBtn) {
      autoBtn.disabled = true;
      autoBtn.style.opacity = "0.5";
      autoBtn.style.cursor = "not-allowed";
      autoBtn.style.pointerEvents = "none";
    }
  }

  // ==============================
  // ✅ RE-ENABLE CHECK & AUTO CONNECT BUTTONS
  // ==============================
  function enableCheckAndAutoConnect() {
    const checkBtn = document.getElementById("checkBtn");
    const autoBtn = document.getElementById("auto");

    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.style.opacity = "1";
      checkBtn.style.cursor = "pointer";
      checkBtn.style.pointerEvents = "auto";
    }

    if (autoBtn) {
      autoBtn.disabled = false;
      autoBtn.style.opacity = "1";
      autoBtn.style.cursor = "pointer";
      autoBtn.style.pointerEvents = "auto";
    }
  }

 
 
  if (mcbImg) {
    mcbImg.style.cursor = "pointer";
 
    mcbImg.addEventListener("click", function () {
 
 
 
      // 🔁 TOGGLE OFF IF MCB IS ALREADY ON
      if (mcbState === "ON") {
        turnMCBOff("MCB turned OFF manually");
        showPopup(
          "You turned off the DC Supply.<br>Turn it back on to continue the simulation.");

          // ✅ RE-ENABLE CHECK & AUTO CONNECT BUTTONS
        enableCheckAndAutoConnect();
        return;
      }
 
 
     if (!checkClickedAfterCompletion || !areAllConnectionsCorrect()) {
  showPopup(
    "Make and check the connections before turning ON the DC Supply."
  );
  return;
}
 
      mcbState = "ON";
      mcbReady = true;
 
 
 
      this.src = "images/mcb-on.png";

        // 🔒 DISABLE CHECK & AUTO CONNECT BUTTONS
      disableCheckAndAutoConnect();
 
      if (starterHandle) {
        starterHandle.style.cursor = "grab";
      }
 
 
      showPopup(" DC supply has been turned ON.<br> Now move the starter handle from left to right.");
      console.log("MCB ON");
      if (isGuideActive()) {
        labSpeech.speak(
          "DC SUPPLY is turned on. Now turn on the starter by moving the handle from left to right."
        );
      }
 
    });
  }
 
  // ===== STARTER HANDLE DRAG (CURVE PATH) =====
  if (starterHandle) {
 
    starterHandle.addEventListener("mousedown", (e) => {
      if (mcbState !== "ON" || starterEngaged) return;
 
      starterDragging = true;
      startMouseX = e.clientX;
 
      starterHandle.style.cursor = "grabbing";
      e.preventDefault();
    });
 
    document.addEventListener("mouseup", () => {
      starterDragging = false;
      if (!starterEngaged) {
        starterHandle.style.cursor = "grab";
      }
    });
 
    document.addEventListener("mousemove", (e) => {
      if (!starterDragging || starterEngaged) return;
 
      const deltaX = e.clientX - startMouseX;
 
      let moveX = Math.max(START_X, Math.min(END_X, deltaX));
 
      const progress = moveX / END_X;
      const curveY = Math.sin(progress * Math.PI) * CURVE_HEIGHT;
 
      starterHandle.style.transform =
        `translate(${moveX}px, ${-curveY}px)`;
 
      // 🔥 END POSITION → starter ON
      if (moveX >= END_X - 2) {
        engageStarter();
      }
    });
 
  }
 
  // ===== FIELD RESISTANCE DRAG START =====
  if (fieldKnob) {
    fieldKnob.addEventListener("mousedown", (e) => {
 
      if (mcbState !== "ON" || !starterEngaged || fieldLocked) return;
 
      fieldDragging = true;
      fieldStartX = e.clientX;
 
      fieldKnob.style.cursor = "grabbing";
      e.preventDefault();
    });
  }
 
  document.addEventListener("mousemove", (e) => {
    if (!fieldDragging || fieldLocked) return;
 
 
    const deltaX = e.clientX - fieldStartX;
 
    let percentMove = (deltaX / 300) * 100;
    let newPercent = fieldCurrentPercent + percentMove;
 
    newPercent = Math.max(FIELD_MIN, Math.min(FIELD_MAX, newPercent));
 
    fieldKnob.style.left = `${newPercent}%`;
 
    // 🔥 FIELD → BASE RPM (default ≈1085)
    const fieldPercent =
      (newPercent - FIELD_MIN) / (FIELD_MAX - FIELD_MIN);
 
    // Field RPM range: 900 → 1085
    // fieldRPM = 900 + fieldPercent * 185;
 
 
    // // existing meter behavior
    // setFieldDefaultMeters();
 
    // if (mcbState === "ON") {
    //   updateVoltmeterByArmature(0);
    // }
 
 
 
 
  });
 
 
  document.addEventListener("mouseup", () => {
    if (!fieldDragging || fieldLocked) return;
 
    fieldDragging = false;
 
    // 🔒 jahan user chhoda wahi fix
    fieldCurrentPercent =
      parseFloat(fieldKnob.style.left) || FIELD_MIN;
 
    fieldLocked = true;
    fieldKnob.style.cursor = "not-allowed";
 
    if (isGuideActive()) {
      labSpeech.speak(
        "Field resistance is set. You can now adjust the armature rheostat."
      );
    }
 
 
    if (armatureKnob) {
      armatureKnob.style.cursor = "grab";
    }
 
    setFieldDefaultMeters();
 
    // 🔥 INITIAL ARMATURE STEP = STEP 1
    updateVoltmeterByArmature(0);
 
    // 🔄 START ROTOR IF READY
    if (!rotorRunning && mcbState === "ON" && starterEngaged) {
      rotorRunning = true;
      requestAnimationFrame(runRotor);
    }
 
    console.log("Field resistance fixed at:", fieldCurrentPercent + "%");
  });
 
 
 
  function engageStarter() {
    starterEngaged = true;
    starterDragging = false;
 
    starterHandle.style.transform =
      `translate(${END_X}px, 0px)`;
    starterHandle.style.cursor = "default";
 
 
  // ✅ FIX (always set fresh time when starter is engaged):
localStorage.setItem("experimentStartTime", Date.now());
 
    console.log("✅ Starter ON");
 
    if (isGuideActive()) {
      labSpeech.speak(
        "Starter is on. Now set the field rheostat."
      );
    }
 
 
    unlockFieldResistance();
 
 
  }
 
 
  function unlockFieldResistance() {
    const fieldKnob = document.querySelector(".nob1");
    if (!fieldKnob) return;
 
    fieldLocked = false;
    fieldKnob.style.cursor = "grab";
 
    console.log("🔓 Field resistance unlocked");
  }
 
 
  function lockFieldResistance() {
    const fieldKnob = document.querySelector(".nob1");
    if (!fieldKnob) return;
 
    fieldLocked = true;                 // 🔒 lock
    fieldKnob.style.cursor = "not-allowed";
 
    if (isGuideActive()) {
      labSpeech.speak(
        "Field resistance is set. You can now adjust the armature rheostat."
      );
    }
 
    console.log("🔒 Field resistance locked at user position");
  }
 
 
  // Wire curviness (higher = more curved).
  // Change this to adjust the default curve for all wires.
  const WIRE_CURVINESS = 80;
 
  // Wire curve shape:
  // - "u": U-shaped curves (go down by default; negative curviness goes up)
  // - "side": original side-curves (uses each point's anchor direction)
  const WIRE_CURVE_SHAPE = "u";
 
  function getWireAnchorForShape(anchor) {
    if (!anchor || !Array.isArray(anchor)) return anchor;
    if (WIRE_CURVE_SHAPE !== "u") return anchor;
 
    const uAnchor = anchor.slice();
    uAnchor[2] = 0; // dx
    uAnchor[3] = 1; // dy (screen coordinates: +y is down)
    return uAnchor;
  }
 
  const ringSvg =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
        <circle cx="13" cy="13" r="12" fill="black"/>
        <circle cx="13" cy="13" r="9" fill="#C38055"/>
        <circle cx="13" cy="13" r="6" fill="black"/>
      </svg>
    `);
  // Base endpoint options (no connectorStyle here; we'll set per-endpoint dynamically)
  const baseEndpointOptions = {
    endpoint: ["Image", { url: ringSvg, width: 26, height: 26 }],
    isSource: true,
    isTarget: true,
    maxConnections: -1,
    connector: ["Bezier", { curviness: WIRE_CURVINESS }]
  };
  const container = document.querySelector(".top-row");
  if (container) {
    jsPlumb.setContainer(container);
  } else {
    console.warn('jsPlumb: container ".top-row" not found.');
  }
  // anchors for each point (you can tweak these)
  const anchors = {
    pointR: [1, 0.5, 1, 0], // right side
    pointB: [0, 0.5, -1, 0], // left side
    pointL: [1, 0.5, 1, 0], // right
    pointF: [0, 0.5, -1, 0], // left
    pointA: [1, 0.5, 1, 0], // right
    pointC: [0, 0.5, -1, 0],
    pointD: [1, 0.5, 1, 0],
    pointE: [0, 0.5, -1, 0],
    pointG: [1, 0.5, 1, 0],
    pointH: [0.5, 0.5, 0, 0],
    pointI: [0.5, 0.5, 0, 0],  /* Center */
    // pointH: [0, 0.5, -1, 0],
    // pointI: [1, 0.5, 1, 0],
    pointJ: [0, 0.5, -1, 0],
    pointK: [1, 0.5, 1, 0],
    pointA1: [0, 0.5, -1, 0],
    pointZ1: [1, 0.5, 1, 0],
    pointA3: [0, 0.5, -1, 0],
    pointZ3: [1, 0.5, 1, 0],
    pointA2: [0, 0.5, -1, 0],
    pointZ2: [1, 0.5, 1, 0],
    pointA4: [0, 0.5, -1, 0],
    pointZ4: [1, 0.5, 1, 0],
    pointL1: [0, 0.5, -1, 0],
    pointF2: [1, 0.5, 1, 0],
    pointF1: [1, 0.5, -1, 0]
 
  };
  const endpointsById = new Map();
  const loopbackTargets = new Map();
 
  function mirrorAnchor(anchor) {
    if (!anchor || !Array.isArray(anchor)) return null;
    const mirrored = anchor.slice();
    if (mirrored.length > 2) mirrored[2] = -mirrored[2];
    if (mirrored.length > 3) mirrored[3] = -mirrored[3];
    return mirrored;
  }
 
  function getLoopbackEndpoint(id) {
    if (loopbackTargets.has(id)) return loopbackTargets.get(id);
 
    const el = document.getElementById(id);
    if (!el) {
      console.warn("jsPlumb: element not found for loopback:", id);
      return null;
    }
 
    const baseAnchor = getWireAnchorForShape(anchors[id]);
    const loopAnchor = mirrorAnchor(baseAnchor) || baseAnchor || [0.5, 0.5, 0, 0];
 
    const ep = jsPlumb.addEndpoint(el, {
      anchor: loopAnchor,
      uuid: `${id}-loopback`,
      endpoint: "Blank",
      isSource: false,
      isTarget: true,
      maxConnections: -1
    });
 
    loopbackTargets.set(id, ep);
    return ep;
  }
  // helper to safely add endpoint if element exists
  function addEndpointIfExists(id, anchor) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn("jsPlumb: element not found:", id);
      return;
    }
    // raise z-index so endpoint image stays visible above other elements
    el.style.zIndex = 2000;
    // Determine color based on anchor side (left: blue, right: red)
    const isLeftSide = anchor[0] === 0; // x=0 is left side
    const wireColor = isLeftSide ? "blue" : "red";
    const endpointAnchor = getWireAnchorForShape(anchor);
    // Create per-endpoint options with connectorStyle for drag preview
    const endpointOptions = { ...baseEndpointOptions };
    endpointOptions.connectorStyle = {
      stroke: wireColor,
      strokeWidth: 4
    };
    // Use a stable uuid so Auto Connect can reuse the same styled endpoint
    const ep = jsPlumb.addEndpoint(el, { anchor: endpointAnchor, uuid: id }, endpointOptions);
    endpointsById.set(id, ep);
    return ep;
  }
  // add endpoints for the points
  Object.keys(anchors).forEach(id => addEndpointIfExists(id, anchors[id]));
 
  function getOrCreateEndpoint(id) {
    let ep = endpointsById.get(id);
    if (!ep && typeof jsPlumb.getEndpoint === "function") {
      ep = jsPlumb.getEndpoint(id);
      if (ep) endpointsById.set(id, ep);
    }
    if (!ep && anchors[id]) {
      ep = addEndpointIfExists(id, anchors[id]);
    }
    return ep || null;
  }
 
  function connectionKey(a, b) {
    return [a, b].sort().join("-");
  }
 
// ===============================
// 🎯 WIRE CURVINESS LOGIC 
// ===============================
 
const WIRE_CURVE_OVERRIDES = new Map([
  [connectionKey("pointR", "pointL"), -70],
  [connectionKey("pointB", "pointD"), -70],
  [connectionKey("pointB", "pointA2"), 80],
  [connectionKey("pointB", "pointF2"), -160],
  [connectionKey("pointA", "pointJ"), 160],
  [connectionKey("pointG", "pointH"), 150],
  [connectionKey("pointF", "pointE"), -60],
  [connectionKey("pointI", "pointF1"), 100],
  [connectionKey("pointC", "pointA1"), 20],
  [connectionKey("pointA1", "pointK"), -120],
  [connectionKey("pointK", "pointC"), -140]
]);
 
function getWireCurvinessForConnection(sourceId, targetId) {
  const key = connectionKey(sourceId, targetId);
  const override = WIRE_CURVE_OVERRIDES.get(key);
 
  if (typeof override === "number") return override;
  return WIRE_CURVINESS;
}
 
  function getSeenConnectionKeys() {
    const seen = new Set();
    jsPlumb.getAllConnections().forEach(conn => {
      seen.add(connectionKey(conn.sourceId, conn.targetId));
    });
    return seen;
  }
 
  function isPairConnected(a, b, connections) {
    return connections.some(conn => {
      const src = conn.sourceId;
      const tgt = conn.targetId;
 
      return (
        (src === a && tgt === b) ||
        (src === b && tgt === a)
      );
    });
  }
 
  // Check if connection between src and tgt is allowed up to the given index in requiredPairs
  function isConnectionAllowed(src, tgt, uptoIndex) {
    const key = [src, tgt].sort().join("-");
    for (let i = 0; i <= uptoIndex; i++) {
      const [a, b] = requiredPairs[i].split("-");
      if ([a, b].sort().join("-") === key) {
        return true;
      }
    }
    return false;
  }
 
 
 
  let autoConnectUsed = false;
 
  // 🔥 remembers user-removed wire
  let completedByAutoConnect = false;
 
  // Required connections: unsorted list for iteration order in auto-connect, sorted Set for checking
 
  const requiredPairs = [
    "pointR-pointL",
    "pointB-pointD",
    "pointB-pointA2",
    "pointB-pointF2",
    "pointF-pointE",
    "pointA-pointJ",
    "pointG-pointH",
    "pointI-pointF1",
    "pointC-pointA1",
    "pointA1-pointK",
    "pointK-pointC",
  ];
 
 
  // Auto-connect all required pairs
 
  function areAllConnectionsCorrect() {
    const connections = jsPlumb.getAllConnections();
    return requiredPairs.every(pair => {
      const [a, b] = pair.split("-");
      return isPairConnected(a, b, connections);
    });
  }
 
 
function getFirstMissingStepIndex() {
  const connections = jsPlumb.getAllConnections();

  for (let i = 0; i < requiredPairs.length; i++) {
    const [a, b] = requiredPairs[i].split("-");
    if (!isPairConnected(a, b, connections)) {
      return i; // ✅ first real missing step
    }
  }

  return requiredPairs.length;
}

 
 
  // function getFirstMissingStepIndex() {
  //   const connections = jsPlumb.getAllConnections();
 
  //   for (let i = 0; i < requiredPairs.length; i++) {
  //     const [a, b] = requiredPairs[i].split("-");
  //     if (!isPairConnected(a, b, connections)) {
  //       return i;   // 🔥 FIRST missing step
  //     }
  //   }
  //   return requiredPairs.length;
  // }
 
 
 
  // function areAllConnectionsCorrect() {
  //   const connections = jsPlumb.getAllConnections();
 
  //   return requiredPairs.every(([a, b]) =>
  //     isPairConnected(a, b, connections)
  //   );
  // }
 
  function connectRequiredPair(req, seenKeys, index = -1) {
    const [a, b] = req.split("-");
    if (!a || !b) return false;
    const isSelfConnection = a === b;
 
    const normalizedKey = connectionKey(a, b);
    if (seenKeys && seenKeys.has(normalizedKey)) return true;
 
    const aEl = document.getElementById(a);
    const bEl = document.getElementById(b);
    if (!aEl || !bEl) {
      console.warn("Auto Connect: missing element(s) for", req);
      return false;
    }
 
    const aAnchor = anchors[a];
    const bAnchor = anchors[b];
    const aIsLeft = aAnchor ? aAnchor[0] === 0 : false;
    const bIsLeft = bAnchor ? bAnchor[0] === 0 : false;
 
    let sourceId, targetId;
    if (isSelfConnection) {
      sourceId = a;
      targetId = a;
    } else if (aIsLeft !== bIsLeft) {
      // Mixed sides: alternate preference for balance (even index: prefer right source -> red; odd: left -> blue)
      const preferRight = (index % 2 === 0) || (index < 0);
      if (preferRight) {
        sourceId = aIsLeft ? b : a; // Choose right as source
      } else {
        sourceId = bIsLeft ? b : a; // Choose left as source
      }
      targetId = sourceId === a ? b : a;
    } else {
      // Same side: default to a as source
      sourceId = a;
      targetId = b;
    }
 
    const sourceAnchorSide = anchors[sourceId];
    const sourceIsLeftSide = sourceAnchorSide ? sourceAnchorSide[0] === 0 : false;
    const wireColor = sourceIsLeftSide ? "blue" : "red";
 
    const sourceEndpoint = getOrCreateEndpoint(sourceId);
    const targetEndpoint = isSelfConnection ? getLoopbackEndpoint(targetId) : getOrCreateEndpoint(targetId);
    if (!sourceEndpoint || !targetEndpoint) {
      console.warn("Auto Connect: missing endpoint(s) for", req);
      return false;
    }
 
    // Connect using existing endpoints to keep point design unchanged.
    const connectionParams = {
      sourceEndpoint,
      targetEndpoint,
      connector: ["Bezier", { 
  curviness: getWireCurvinessForConnection(sourceId, targetId)
}],
 
      paintStyle: { stroke: wireColor, strokeWidth: 4 }
    };
 
    if (isSelfConnection) {
      const sourceAnchor = anchors[sourceId];
      const targetAnchor = mirrorAnchor(sourceAnchor) || sourceAnchor;
      if (sourceAnchor || targetAnchor) {
        connectionParams.anchors = [sourceAnchor || targetAnchor, targetAnchor];
      }
    }
 
    const conn = jsPlumb.connect(connectionParams);
 
    if (conn && seenKeys) {
      seenKeys.add(connectionKey(conn.sourceId, conn.targetId));
    }
 
    return !!conn;
  }
 
  // Dynamic wire color based on source anchor side (left: blue, right: red) - Now sets on connection for consistency
jsPlumb.bind("connection", function (info) {

  const curviness =
    getWireCurvinessForConnection(info.sourceId, info.targetId);

  info.connection.setConnector(
    ["Bezier", { curviness }]
  );

  // existing color logic
  const src = info.sourceId;
  const tgt = info.targetId;

  if (!guideActive) return;

  // 🔥 CHECK IF ALL CONNECTIONS ARE NOW COMPLETE
  const connections = jsPlumb.getAllConnections();
  const allConnected = requiredPairs.every(pair => {
    const [a, b] = pair.split("-");
    return isPairConnected(a, b, connections);
  });

  // ✅ IF ALL COMPLETE → SPEAK COMPLETE MESSAGE
  if (allConnected) {
    currentStepIndex = requiredPairs.length;
    speakCurrentStep();
    return;
  }

  // 🔍 OTHERWISE, CHECK IF THIS CONNECTION WAS CORRECT FOR CURRENT STEP
  const [expectedA, expectedB] =
    requiredPairs[currentStepIndex].split("-");

  const isCorrect =
    (src === expectedA && tgt === expectedB) ||
    (src === expectedB && tgt === expectedA);

  if (!isCorrect) {

    // 🧠 Extract readable point names
    const wrongFrom = src.replace("point", "");
    const wrongTo = tgt.replace("point", "");

    const rightFrom = expectedA.replace("point", "");
    const rightTo = expectedB.replace("point", "");

    // 🔊 Speak in 3 clear steps
    labSpeech.speak(
      `Wrong connection. You connected point ${wrongFrom} to point ${wrongTo}. Please connect point ${rightFrom} to point ${rightTo}.`
    );

    return;
  }
// 🔄 HAR CONNECTION KE BAAD REAL STATE SE CALCULATE KARO
currentStepIndex = getFirstMissingStepIndex();



  // 🔊 SPEAK NEXT STEP AUTOMATICALLY
  speakCurrentStep();
});
 
 
  const requiredConnections = new Set(requiredPairs.map(pair => {
    const [a, b] = pair.split("-");
    return [a, b].sort().join("-");
  }));
 
  // Click on label buttons (e.g., .point-R) to remove connections from corresponding point
  document.querySelectorAll('[class^="point-"]').forEach(btn => {
    btn.style.cursor = "pointer"; // Ensure pointer cursor
 
    btn.addEventListener("click", function () {
 
      if (isModalOpen()) return;   // 🛑 ADD THIS LINE
 
      const className = this.className;

      // 🔒 PREVENT REMOVAL WHEN MCB IS ON
      if (mcbState === "ON") {
        showPopup("Turn off the DC Supply before removing the connection");
        return;
      }
 
 
      const match = className.match(/point-([A-Za-z0-9]+)/);
      if (match) {
        const pointId = "point" + match[1];
        const pointEl = document.getElementById(pointId);
        if (pointEl) {
 
          // 🔥 Remove ONLY connections related to this point
          const relatedConnections = jsPlumb.getAllConnections().filter(c =>
            c.sourceId === pointId || c.targetId === pointId
          );
 
          if (relatedConnections.length === 0) return;
 
          // remove ONLY one connection (latest / first)
          const conn = relatedConnections[0];
 
      
          jsPlumb.deleteConnection(conn);

           jsPlumb.repaintEverything();

              autoConnectUsed = false;
                       currentStepIndex = getFirstMissingStepIndex();

                       checkClickedAfterCompletion = false;  // 🔥 ADD THIS LINE HERE

                   turnMCBOff("Wire removed from " + pointId);

// 🔊 SPEAK MISSING STEP AFTER WIRE REMOVAL
if (guideActive) {
  setTimeout(() => {
    speakCurrentStep();
  }, 500);
}
 
        }
      }
    });
  });
 
  // Existing: make clickable elements (endpoint divs) removable
 
  document.querySelectorAll(".point").forEach(p => {
    p.style.cursor = "pointer";
 
    p.addEventListener("click", function () {
 
      if (isModalOpen()) return;   // 🛑 ADD THIS LINE
 
      const id = this.id;
 
 // 🔒 PREVENT REMOVAL WHEN MCB IS ON
      if (mcbState === "ON") {
        showPopup("⚠️ Cannot remove wires while DC supply is ON.\n\nPlease turn OFF the MCB first.", "MCB Active");
        return;
      }
 
      // Get connections only related to this point
      const conns = jsPlumb.getAllConnections().filter(conn =>
        conn.sourceId === id || conn.targetId === id
      );
 
      if (conns.length === 0) return;
 
      // Remove only this point's connection
     
jsPlumb.deleteConnection(conns[0]);

jsPlumb.repaintEverything();

autoConnectUsed = false;
currentStepIndex = getFirstMissingStepIndex();

checkClickedAfterCompletion = false;  // 🔥 ADD THIS LINE HERE

turnMCBOff("Wire disconnected");

// 🔊 SPEAK MISSING STEP AFTER WIRE REMOVAL
if (guideActive) {
  setTimeout(() => {
    speakCurrentStep();
  }, 500);
}
 
    });
  });
 
 
 
 
  // Check button - Robust selection by text content (no ID needed)
  let guideStepIndex = 0;
  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) {
    console.log("Check button found and wired."); // Debug log
 
 
    // Replace your checkBtn.addEventListener with this DEBUG VERSION:
 // ============================================================
// ✅ CHECK BUTTON — FULL LOGIC (Reference Style for Doc-2 Lab)
// ============================================================
//
// BEHAVIOUR SUMMARY:
// ──────────────────
// Case 1 → No wires at all
//           Popup: "Please make all the connections first."
//           Speech (if guide active): same text
//
// Case 2 → Some wires exist, but wrong connections present
//           Popup: "Wrong connection(s): PointA - PointB [, ...]
//                   Missing connection(s): PointX - PointY [, ...]"
//           Speech: "Remove wrong connection point A to point B.
//                    Next missing connection: point X to point Y."
//
// Case 3 → Some wires exist, no wrong ones, but missing connections remain
//           Popup: "Missing connection(s): PointX - PointY  [, ...]"
//           Speech: "Next missing connection: point X to point Y."
//
// Case 4 → All required connections are present and correct
//           Popup: "Connections are correct. Click on the DC Supply to turn it ON."
//           Speech: "The connections are correct. Now turn on the DC supply."
//           Sets checkClickedAfterCompletion = true
//
// NOTE: Speech fires REGARDLESS of guide state for wrong/missing
//       (via speakOrAlert helper which picks voice or popup).
//       The popup fires ALWAYS for wrong/missing/empty cases.
// ============================================================

checkBtn.addEventListener("click", function () {

  // ── 0. Gather live state ──────────────────────────────────
  const connections      = jsPlumb.getAllConnections();
  const totalWiresMade   = connections.length;

  // Build a set of normalised keys for every wire currently on canvas
  const seenKeys = new Set();
  connections.forEach(conn => {
    seenKeys.add(connectionKey(conn.sourceId, conn.targetId));
  });

  // ── 1. ALLOWED connections set (same as requiredConnections) ─
  // Any wire NOT in allowedConnections is "illegal / wrong".
  // We reuse the existing `requiredConnections` Set which stores
  // sorted "a-b" keys built from requiredPairs.

  // ── 2. Classify every drawn wire as correct or wrong ─────────
  const illegalRaw = [];   // raw "sourceId-targetId" (unsorted) for display
  connections.forEach(conn => {
    const key = connectionKey(conn.sourceId, conn.targetId);
    if (!requiredConnections.has(key)) {
      // Keep original direction for readable display
      illegalRaw.push({ src: conn.sourceId, tgt: conn.targetId });
    }
  });

  // ── 3. Find missing connections (in requiredPairs ORDER) ─────
  const missingPairs = requiredPairs.filter(pair => {
    const [a, b] = pair.split("-");
    return !seenKeys.has(connectionKey(a, b));
  });

  // ── 4. Helper: human-readable point name ─────────────────────
  function toLabel(id) {
    return id.replace(/^point/i, "Point");         // "pointA1" → "PointA1"
  }
  function toSpeech(id) {
    // "pointA1" → "A 1" (space between letters and digits for TTS)
    return id
      .replace(/^point/i, "")
      .replace(/([A-Za-z]+)(\d+)/g, "$1 $2")       // "A1" → "A 1"
      .toUpperCase();
  }

  // ── 5. Helper: first entry only for speech focus ─────────────
  const firstIllegal = illegalRaw[0] || null;
  const firstMissing = missingPairs[0] || null;   // full "pointA-pointB" string


  // ════════════════════════════════════════════════════════════
  // CASE 1 — No wires drawn at all
  // ════════════════════════════════════════════════════════════
  if (totalWiresMade === 0) {
    const msg = "Please make all the connections first.";
    showPopup(msg);
    if (guideActive) labSpeech.speak(msg);
    // Reset check state just in case
    checkClickedAfterCompletion = false;
    currentStepIndex = 0;
    return;
  }


  // ════════════════════════════════════════════════════════════
  // CASE 2 + 3 — Wires exist but wrong / missing
  // ════════════════════════════════════════════════════════════
  if (illegalRaw.length > 0 || missingPairs.length > 0) {

    // ── Build POPUP message ──────────────────────────────────
    let popupMessage = "";

    // Wrong connections section (show up to 3, then "+ N more")
    if (illegalRaw.length > 0) {
      const wrongLabels = illegalRaw.map(
        ({ src, tgt }) => `${toLabel(src)} ↔ ${toLabel(tgt)}`
      );
      const preview   = wrongLabels.slice(0, 3).join(", ");
      const extraCount = Math.max(0, wrongLabels.length - 3);
      const extraText  = extraCount ? ` and ${extraCount} more` : "";
      popupMessage += `Wrong connection${illegalRaw.length > 1 ? "s" : ""}: ${preview}${extraText}.\n`;
    }

    // Missing connections section — in requiredPairs sequence (up to 3)
    if (missingPairs.length > 0) {
      const missingLabels = missingPairs.map(pair => {
        const [a, b] = pair.split("-");
        return `${toLabel(a)} ↔ ${toLabel(b)}`;
      });
      const preview    = missingLabels.slice(0, 3).join(", ");
      const extraCount = Math.max(0, missingLabels.length - 3);
      const extraText  = extraCount ? ` and ${extraCount} more` : "";
      popupMessage += `Missing connection${missingPairs.length > 1 ? "s" : ""}: ${preview}${extraText}.`;
    }

    // Trim any trailing whitespace / newlines
    popupMessage = popupMessage.trim();

    // ── Build SPEECH message ─────────────────────────────────
    let speechMessage = "";

    if (firstIllegal) {
      // Speak ONLY the first wrong connection to avoid overwhelming TTS
      speechMessage +=
        `Wrong connection: point ${toSpeech(firstIllegal.src)} to point ${toSpeech(firstIllegal.tgt)}. ` +
        `Please remove it. `;
    }

    if (firstMissing) {
      const [ma, mb] = firstMissing.split("-");
      const stepNo   = requiredPairs.indexOf(firstMissing) + 1;
      speechMessage +=
        `Next missing connection: step ${stepNo}, ` +
        `connect point ${toSpeech(ma)} to point ${toSpeech(mb)}.`;
    }

    // ── Show popup (always) ──────────────────────────────────
    const popupTitle = illegalRaw.length > 0 ? "Wiring Error" : "Connections Incomplete";
    showPopup(popupMessage, popupTitle);

    // ── Speak (always, if guide active) ─────────────────────
    if (guideActive && speechMessage) {
      labSpeech.speak(speechMessage);
    }

    // ── Reset verification state ─────────────────────────────
    checkClickedAfterCompletion = false;
    // Sync step index to the first real missing step
    currentStepIndex = getFirstMissingStepIndex();

    return;
  }


  // ════════════════════════════════════════════════════════════
  // CASE 4 — All connections correct ✅
  // ════════════════════════════════════════════════════════════
  checkClickedAfterCompletion = true;
  currentStepIndex = requiredPairs.length;

  const successMsg = "Connections are correct! Click on the DC Supply to turn it ON.";
  showPopup(successMsg);

  if (guideActive) {
    labSpeech.speak(
      "The connections are correct. Now turn on the DC supply."
    );
  }

});

// ============================================================
// END OF CHECK BUTTON LOGIC
// ============================================================
  }
 
  // Also add this helper function if it doesn't exist:
  // function isPairConnected(a, b, connections) {
  //   return connections.some(conn => {
  //     const srcId = conn.sourceId || (conn.source && conn.source.id);
  //     const tgtId = conn.targetId || (conn.target && conn.target.id);
 
  //     return (
  //       (srcId === a && tgtId === b) ||
  //       (srcId === b && tgtId === a)
  //     );
  //   });
  // }
  //   }
 
 
 
  // Auto Connect button - creates all required connections automatically
  const autoConnectBtn = document.getElementById("auto");
 
  if (autoConnectBtn) {
    autoConnectBtn.addEventListener("click", function () {
 
      autoConnectUsed = true;
      currentStepIndex = requiredPairs.length;
 
      checkClickedAfterCompletion = false;
 
 
      const runBatch = typeof jsPlumb.batch === "function" ? jsPlumb.batch.bind(jsPlumb) : (fn => fn());
 
      runBatch(function () {
        // Clear existing connections so the final wiring is always correct
        if (typeof jsPlumb.deleteEveryConnection === "function") {
          jsPlumb.deleteEveryConnection();
        } else {
          jsPlumb.getAllConnections().forEach(c => jsPlumb.deleteConnection(c));
        }
 
        const seenKeys = new Set();
        requiredPairs.forEach((req, index) => connectRequiredPair(req, seenKeys, index));
      });
 
      // Ensure rendering completes; retry any missing connections once.
      requestAnimationFrame(() => {
        jsPlumb.repaintEverything();
 
        const seenKeys = getSeenConnectionKeys();
        const missing = [];
        requiredConnections.forEach(req => {
          const [a, b] = req.split("-");
          const key = a && b ? connectionKey(a, b) : req;
          if (!seenKeys.has(key)) missing.push(req);
        });
 
        if (missing.length) {
          console.warn("Auto Connect: retrying missing connection(s):", missing);
 
          runBatch(() => {
            const seenNow = getSeenConnectionKeys();
            missing.forEach(req => connectRequiredPair(req, seenNow));
          });
          requestAnimationFrame(() => jsPlumb.repaintEverything());
        }
 
        console.log(`Auto Connect: required=${requiredConnections.size}, missing after retry=${missing.length}`);
 
        completedByAutoConnect = true;
        // 🔊 SPEAK AFTER AUTO CONNECT COMPLETES
        if (guideActive) {
          labSpeech.speak(
            "The connections are now complete. Click the Check button to confirm them."
          );
        }
 
      });
    });
  } else {
    console.error("Auto Connect button not found! Looking for '.pill-btn' with text 'Auto Connect'.");
  }
 
 
  // Reset button - remove ALL connections
  const resetBtn = document.getElementById("resetBtn");
 
  if (resetBtn) {
 
    resetBtn.addEventListener('click', function () {
 
      labSpeech.stop();
      guideActive = false;

      if (reportBtn) {
  reportBtn.disabled = true;
  reportBtn.style.opacity = "0.5";
  reportBtn.style.cursor = "not-allowed";
  reportBtn.style.pointerEvents = "none";
}

 
      if (speakBtn) {
        speakBtn.setAttribute("aria-pressed", "false");
        speakBtn.querySelector(".speak-btn__label").textContent = "TAP TO LISTEN";
      }

        // ✅ RE-ENABLE CHECK & AUTO CONNECT BUTTONS
      enableCheckAndAutoConnect();
 
      // Remove all connections safely
      if (typeof jsPlumb.deleteEveryConnection === "function") {
        jsPlumb.deleteEveryConnection();
      } else {
        jsPlumb.getAllConnections().forEach(conn => {
          jsPlumb.deleteConnection(conn);
        });
      }
 
 
      // Force repaint so no ghost wires remain
      jsPlumb.repaintEverything();
      turnMCBOff("");
      // ✅ Show new reset message
showPopup(
  "The Simulation has been reset.\n\nYou can start again.",
  "Simulation Reset"
);
      localStorage.removeItem("experimentStartTime");
      localStorage.removeItem("experimentEndTime");
      localStorage.removeItem("reportStartTime");
      localStorage.removeItem("reportEndTime");
      localStorage.removeItem("reportDuration");
 
 
      // Reset state variables
      autoConnectUsed = false;
      currentStepIndex = 0;
      checkClickedAfterCompletion = false;
      introSpoken = false;
      completedByAutoConnect = false;
 
 
      // ===== RESET GRAPH =====
      graphReadings.length = 0;
      updateGraphButtonState();
 
      const graphContainer = document.getElementById("graphBars");
      if (!graphContainer) return;
 
      graphContainer.innerHTML = "";
 
      const graphPlot = document.getElementById("graphPlot");
      if (graphPlot) {
        graphPlot.innerHTML = "";
        graphPlot.style.display = "none";
      }
 
      const graphBarsReset = document.getElementById("graphBars");
      if (graphBarsReset) {
        graphBarsReset.style.display = "block";
      }
 
      const graphCanvas = document.querySelector(".graph-canvas");
graphCanvas?.classList.remove("is-plotting");
 
      // 🔊 VOICE AFTER RESET
      onExperimentReset();
 
      console.log("Reset: all connections removed");
    });
  } else {
    console.error("Reset button not found!");
  }
 
  // Lock every point to its initial coordinates so resizing the window cannot drift them
  const pinnedSelectors = [
    ".point",
    ".point-R", ".point-B", ".point-L", ".point-F", ".point-A",
    ".point-C", ".point-D", ".point-E", ".point-G", ".point-H", ".point-I", ".point-J", ".point-K",
    ".point-A1", ".point-F1", ".point-A2", ".point-F2", ".point-A3", ".point-Z3", ".point-A4", ".point-Z4",
    ".point-L1", ".point-L2"
  ];
  const basePositions = new Map();
  function captureBasePositions() {
    basePositions.clear();
    document.querySelectorAll(pinnedSelectors.join(", ")).forEach(el => {
      const parent = el.offsetParent;
      if (!parent) return;
      basePositions.set(el, {
        left: el.offsetLeft,
        top: el.offsetTop
      });
    });
  }
  function lockPointsToBase(remeasure = false) {
    if (remeasure || !basePositions.size) {
      captureBasePositions();
    }
    basePositions.forEach((base, el) => {
      el.style.left = `${base.left}px`;
      el.style.top = `${base.top}px`;
    });
    if (window.jsPlumb) {
      jsPlumb.repaintEverything();
    }
  }
  const initPinnedPoints = () => {
    captureBasePositions();
    lockPointsToBase();
  };
  if (document.readyState === "complete") {
    initPinnedPoints();
  } else {
    window.addEventListener("load", initPinnedPoints);
  }
  window.addEventListener("resize", () => lockPointsToBase(true));

 

 
  createObservationTable();
  currentStepIndex = 0;   // 🔁 Reset guided steps

  updateGraphButtonState();   // 🔒 Graph disabled initially

 
 
  // ===== ADD TABLE BUTTON =====
  const addTableBtn = document.getElementById("addTableBtn");
 
  if (addTableBtn) {
    addTableBtn.addEventListener("click", addObservationRow);
  }
 
  // ===== GRAPH BUTTON =====
  const plotGraphBtn = document.getElementById("plotGraphBtn");
  if (plotGraphBtn) {
    plotGraphBtn.addEventListener("click", drawGraph);
  }
 
 
 
 
  // ===== REPORT BUTTON =====
 
  const reportBtn = document.getElementById("reportBtn");

  if (reportBtn) {
  reportBtn.disabled = true;
  reportBtn.style.opacity = "0.5";
  reportBtn.style.cursor = "not-allowed";
  reportBtn.style.pointerEvents = "none";
}

 
 
 reportBtn.addEventListener("click", () => {

    // 🚨 SAFETY CHECK: EXPERIMENT STARTED OR NOT
    const startTimeCheck = localStorage.getItem("experimentStartTime");
    if (!startTimeCheck) {
      showPopup(
        "⚠️ Experiment has not started yet.\nPlease start the motor before generating report.",
        "Report Error"
      );
      return;
    }

    if (graphReadings.length === 0) {
      showPopup("⚠️ No observation data available for report.", "Report Error");
      return;
    }

    // ✅ SHOW REPORT READY POPUP FIRST (reference style)
    showPopup(
      "Your report has been generated successfully. Click OK to view your report.",
      "Report Ready"
    );

    // 🔊 VOICE (only if guide is active)
    if (isGuideActive()) {
      labSpeech.speak("Your report has been generated successfully. Click OK to view your report.");
    }

    // ⏳ WAIT FOR USER TO CLICK OK, THEN OPEN REPORT
    waitForWarningModalAcknowledgement().then(() => {

      // ===== STORE EXPERIMENT END TIME =====
      const endTime = Date.now();
      localStorage.setItem("experimentEndTime", endTime);

      // ===== CALCULATE TOTAL DURATION =====
      const startTime = parseInt(localStorage.getItem("experimentStartTime"));
      const durationMs = endTime - startTime;
      const durationTotalSeconds = Math.floor(durationMs / 1000);
const durationMins = Math.floor(durationTotalSeconds / 60);
const durationSecs = durationTotalSeconds % 60;
const durationText = `${durationMins} min ${String(durationSecs).padStart(2, "0")} sec`;

      // ===== STORE READABLE VALUES FOR REPORT =====
      localStorage.setItem("reportStartTime", new Date(startTime).toLocaleTimeString());
      localStorage.setItem("reportEndTime", new Date(endTime).toLocaleTimeString());
      localStorage.setItem("reportDuration", durationText);

      // ===== DATA STORE =====
      localStorage.setItem("experimentReport", JSON.stringify(graphReadings));
      localStorage.setItem(
        "tableData",
        JSON.stringify(
          graphReadings.map((row, index) => ({
            count: index + 1,
            voltage: row.voltage,
            rpm: row.rpm
          }))
        )
      );

      // ✅ OPEN REPORT ONLY AFTER OK CLICKED
      window.open("report.html", "_blank");

      // 🔊 VOICE AFTER REPORT
      onReportGenerated();
    });

  });
 
});
 
// ==============================
// COMPONENT WINDOW AUTO OPEN
// ==============================
 
// Storage keys (matching reference project)
const COMPONENTS_SEEN_KEY    = "vl_components_seen";
const COMPONENTS_ALERT_KEY   = "vl_components_alert_shown";

function hasSeenComponents() {
  try { return localStorage.getItem(COMPONENTS_SEEN_KEY) === "1"; } catch(e) { return false; }
}
function markComponentsSeen() {
  try { localStorage.setItem(COMPONENTS_SEEN_KEY, "1"); } catch(e) {}
}
function hasShownComponentsAlert() {
  try { return localStorage.getItem(COMPONENTS_ALERT_KEY) === "1"; } catch(e) { return false; }
}
function markComponentsAlertShown() {
  try { localStorage.setItem(COMPONENTS_ALERT_KEY, "1"); } catch(e) {}
}

function openComponentsWindow({ force = false, auto = false } = {}) {
  const modal = document.getElementById("componentsModal");
  if (!modal) return;

  // ✅ SKIP if already seen (unless force opened via icon)
  if (!force && auto && hasSeenComponents()) return;

  if (window.labSpeech) {
    labSpeech.enabled = false;
    labSpeech.stop();
  }

  modal.classList.remove("is-hidden");
  document.body.classList.add("is-modal-open");

  if (auto) markComponentsSeen(); // mark as seen on auto-open
}
 
const COMPONENTS_EXIT_MESSAGE =
  "Now that you are familiar with all the components used in this experiment, " +
  "you may now start the simulation.<br><br>An AI guide is available to assist you at every step.";

function showComponentsExitAlert() {
  if (hasShownComponentsAlert()) return; // ✅ only once ever
  markComponentsAlertShown();

  // ✨ Highlight the speak button to draw attention
  const speakBtn = document.querySelector(".speak-btn");
  if (speakBtn) {
    speakBtn.classList.add("speak-attention");
    speakBtn.addEventListener("click", () => {
      speakBtn.classList.remove("speak-attention");
    }, { once: true });
  }

  showPopup(COMPONENTS_EXIT_MESSAGE, "Instruction");
}

function closeComponentsWindow({ showAlert = false } = {}) {
  const modal = document.getElementById("componentsModal");
  if (!modal) return;

  if (window.labSpeech) {
    labSpeech.enabled = true;
  }

  modal.classList.add("is-hidden");
  document.body.classList.remove("is-modal-open");

  // ✅ Show first-time instruction alert
  if (showAlert) {
    showComponentsExitAlert();
  }
}
 
// ==============================
// COMPONENT LAUNCHER ICON CLICK
// ==============================
document.addEventListener("click", (e) => {
  const launcher = e.target.closest("[data-open-components]");
  if (!launcher) return;
  openComponentsWindow({ force: true }); // always open from icon
});
 
 
// ==============================
// Auto open on load (skips if already seen)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => openComponentsWindow({ auto: true }));
} else {
  openComponentsWindow({ auto: true });
}
 
 
/* Close handlers */
document.addEventListener("click", (e) => {
  if (e.target.matches("[data-components-close]")) {
 
    // 🔴 STEP 1: tell iframe to stop audio HARD
    const iframe = document.querySelector("#componentsModal iframe");
    iframe?.contentWindow?.postMessage(
      { type: "component-audio-stop" },
      "*"
    );
 
    // 🔴 STEP 2: stop lab voice (safety)
    if (window.labSpeech) {
      labSpeech.stop();
    }
 
 
 
    // 🔴 STEP 3: close modal
    closeComponentsWindow({ showAlert: true });
  }
});
 
 
// ESC key closes chatbot panel
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && panel.classList.contains("open")) {
    closePanel();
  }
});
 
// ==============================
// COMPONENT AUDIO BRIDGE (REFERENCE STYLE)
// ==============================
 
const iframe = document.querySelector("#componentsModal iframe");
const audioBtn = document.getElementById("componentsAudioBtn");
const skipBtn = document.getElementById("skipComponentsBtn");
 
if (audioBtn && iframe) {
 
  // 🔁 Audio button only SENDS TO IFRAME
 audioBtn.addEventListener("click", () => {
  const isPlaying =
    audioBtn.getAttribute("aria-pressed") === "true";
 
  iframe.contentWindow?.postMessage(
    {
      type: isPlaying
        ? "component-audio-pause"
        : "component-audio-play"
    },
    "*"
  );
});
 
 
  // 📩 LISTEN to iframe for REAL audio state
  window.addEventListener("message", (event) => {
    if (event.source !== iframe.contentWindow) return;
 
    const data = event.data || {};
 
    // ✅ Real audio state from iframe
    if (data.type === "component-audio-state") {
      const { playing, disabled, label } = data;
 
      audioBtn.setAttribute(
        "aria-pressed",
        playing ? "true" : "false"
      );
 
      if (label) {
        audioBtn.textContent = label;
      }
 
      audioBtn.disabled = !!disabled;
    }
 
    // 🚫 Autoplay blocked case
    if (data.type === "component-audio-blocked") {
      audioBtn.textContent = "Tap to enable audio";
      audioBtn.setAttribute("aria-pressed", "false");
    }
  });
 
  // 📤 Ask iframe current audio state on load
  iframe.addEventListener("load", () => {
    iframe.contentWindow?.postMessage(
      { type: "component-audio-request" },
      "*"
    );
  });
}
 
// ⏭️ SKIP BUTTON — EXACT REFERENCE BEHAVIOUR
if (skipBtn && iframe) {
  skipBtn.addEventListener("click", () => {
 
    // 1️⃣ Stop component audio (iframe side)
    iframe.contentWindow?.postMessage(
      { type: "component-audio-stop" },
      "*"
    );
 
    // 2️⃣ Stop lab voice if running
    if (window.labSpeech) {
      labSpeech.stop();
    }
 
 
 
    // 3️⃣ Close component modal
    closeComponentsWindow({ showAlert: true });
  });
}

// ==============================
// 🤖 CHATBOT PANEL (REFERENCE STYLE - FINAL)
// ==============================
(function initChatbotWidget() {
  function setup() {
    const widget = document.querySelector(".chatbot-widget");
    if (!widget) return;

    const toggleBtn = widget.querySelector(".chatbot-launcher");
    const panel = widget.querySelector(".chatbot-panel");
    const closeBtn = widget.querySelector(".chatbot-panel-close");
    const iframe = panel?.querySelector("iframe");
    const placeholder = panel?.querySelector(".chatbot-panel-placeholder");
    const chatUrl = (panel?.dataset?.chatUrl || "").trim();

    if (!toggleBtn || !panel || !iframe || !chatUrl) {
      console.warn("Chatbot widget incomplete");
      return;
    }

    let isLoaded = false;
    let notifiedOnce = false;

    function openPanel() {
      panel.classList.add("open");
      widget.classList.add("chatbot-open");
      toggleBtn.setAttribute("aria-expanded", "true");

      // 🔹 Lazy load iframe ONLY ONCE
      if (!isLoaded) {
        if (placeholder) placeholder.style.display = "flex";

        iframe.addEventListener(
          "load",
          () => {
            isLoaded = true;
            iframe.classList.add("chatbot-frame-visible");
            if (placeholder) placeholder.style.display = "none";

            // 🔔 Play notification sound ONCE
            const notifyAudio = document.getElementById(
              "chatbot-notification-audio"
            );
            if (notifyAudio && !notifiedOnce) {
              notifiedOnce = true;
              notifyAudio.currentTime = 0;
              notifyAudio.play().catch(() => {});
            }
          },
          { once: true }
        );

        iframe.src = chatUrl;
      }
    }

    function closePanel() {
      panel.classList.remove("open");
      widget.classList.remove("chatbot-open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }

    // Toggle button
    toggleBtn.addEventListener("click", () => {
      panel.classList.contains("open") ? closePanel() : openPanel();
    });

    // Close button
    closeBtn?.addEventListener("click", closePanel);

    // ESC key closes chatbot
    document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeComponentsWindow({ showAlert: true });
  }
});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();


/* ===============================
   🎯 COMPONENT TOOLTIP SYSTEM
   (REFERENCE-STYLE, CSS-MATCHED)
=============================== */
(function initComponentTooltips() {

  function setup() {

    /* ---------- 1. CREATE TOOLTIP ELEMENT (ONCE) ---------- */
    if (document.querySelector(".hover-tooltip")) return;

    const tooltip = document.createElement("div");
    tooltip.className = "hover-tooltip";
    tooltip.innerHTML = `
      <div class="hover-tooltip__body">
        <div class="hover-tooltip__accent"></div>
        <div class="hover-tooltip__text"></div>
      </div>
    `;
    document.body.appendChild(tooltip);

    const tooltipText = tooltip.querySelector(".hover-tooltip__text");

    let activeTarget = null;

    /* ---------- 2. TOOLTIP DEFINITIONS (REFERENCE STYLE) ---------- */
    const tooltips = [
      {
        id: "mcb",
        selector: ".mcb-label",
        text: "MCB: Main supply breaker for the setup; trips on overload/short-circuit to protect the circuit and users."
      },
      {
        id: "starter",
        selector: ".starter-body",
        text: "3-Point Starter: Limits the DC motor starting current and provides no-volt/overload protection; drag the handle after turning ON the MCB."
      },
      {
        id: "lamp-load",
        selector: ".lampboard-dropdown, #number, .lamp-board, .lamp-grid, .lamp-bulb, .lamp-load-label",
        text: "Lamp Load: Variable resistive bulb bank used to change load; select the number of bulbs to vary current and observe voltage regulation."
      },
      {
       id: "voltmeter",
        selector: ".meters > .meter-card:nth-of-type(1)",
        text: "Voltmeter: Measures the supply/line voltage (connected across the source)."
      },
      {
        id: "ammeter",
        selector: ".meters > .meter-card:nth-of-type(4)",
        text: "Ammeter: Measures the generator terminal voltage (connected across generator terminals)."
      },
      {
       id: "rpm-display",
       selector: ".rpm-image, .rpm-display, #rpmDisplay",
       text: "RPM Indicator: Displays the rotational speed of the DC motor in revolutions per minute. The speed increases as armature voltage is increased while field current remains constant."
      },
       {
        id: "field-rheostat",
        selector: ".rheostat-img-1, .nob1",
        text: "Field Rheostat: Controls the field current of the DC machine. Adjusting it changes the magnetic flux and hence affects the speed of the motor."
      },
      {
        id: "armature-rheostat",
        selector: ".rheostat-img-2, .nob2",
        text: "Armature Rheostat: Controls the armature voltage. Increasing armature voltage increases motor speed while field current remains constant."
      },
      {
  id: "motor-box",
  selector: ".motor-box, .motor-box img",
  text: "DC Shunt Motor: Converts electrical energy to mechanical energy. Speed varies with armature voltage while field current remains constant."
},
{
  id: "generator-box",
  selector: ".generator-box, .generator-body, .generator-rotor, #gr",
  text: "Rotor View: Visual representation of motor shaft rotation. Speed increases as armature voltage rises, shown by faster rotation and RPM display."
}
    ];

    /* ---------- 3. REMOVE DEFAULT BROWSER TOOLTIPS ---------- */
    tooltips.forEach(t => {
      document.querySelectorAll(t.selector).forEach(el => {
        el.removeAttribute("title");
      });
    });

    /* ---------- 4. FIND MATCHING TOOLTIP ---------- */
    function findTooltip(target) {
      for (const t of tooltips) {
        const match = target.closest(t.selector);
        if (match) {
          return { el: match, text: t.text, id: t.id };
        }
      }
      return null;
    }

    /* ---------- 5. POSITION NEAR CURSOR ---------- */
    function moveTooltip(e) {
      tooltip.style.left = e.clientX + 16 + "px";
      tooltip.style.top  = e.clientY + 16 + "px";
    }

    /* ---------- 6. SHOW / HIDE ---------- */
    function showTooltip(text, e) {
      tooltipText.textContent = text;
      moveTooltip(e);
      tooltip.classList.add("show");
    }

    function hideTooltip() {
      tooltip.classList.remove("show");
      activeTarget = null;
    }

    /* ---------- 7. CLICK HANDLER ---------- */
    document.addEventListener("click", (e) => {
      const found = findTooltip(e.target);

      if (!found) {
        hideTooltip();
        return;
      }

      if (activeTarget === found.el) {
        hideTooltip();
        return;
      }

      activeTarget = found.el;
      showTooltip(found.text, e);

       // 🔴 NEW: AUTO-HIDE WHEN MOUSE LEAVES THE ELEMENT
  activeTarget.addEventListener(
    "mouseleave",
    () => {
      hideTooltip();
    },
    { once: true }
  );
    });

    /* ---------- 8. FOLLOW MOUSE ---------- */
    document.addEventListener("mousemove", (e) => {
      if (tooltip.classList.contains("show")) {
        moveTooltip(e);
      }
    });

    /* ---------- 9. ESC KEY CLOSE ---------- */
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideTooltip();
      }
    });
  }

  /* ---------- SAFE DOM READY ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }

})();
