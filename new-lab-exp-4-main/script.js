jsPlumb.ready(function () {
  let mcbState = "OFF";   // 🔥 ADD THIS
   let mcbReady = false;
  const mcbImg = document.querySelector(".mcb-toggle");

  function turnMCBOff(reason = "") {
  if (mcbState === "OFF") return;

  mcbState = "OFF";
  mcbReady = false;

  if (mcbImg) {
    mcbImg.src = "images/mcb-off.png";
  }

  console.log("MCB OFF", reason);

  if (reason) {
    alert("⚠️ MCB turned OFF!\n\nReason: " + reason);
  }
}


if (mcbImg) {
  mcbImg.style.cursor = "pointer";

  mcbImg.addEventListener("click", function () {

    if (mcbState === "ON") {
      alert("⚡ MCB is already ON");
      return;
    }

    if (!areAllConnectionsCorrect()) {
      alert("❌ Wiring incorrect!\n\nPlease complete all connections first.");
      return;
    }

    mcbState = "ON";
    mcbReady = true;

    this.src = "images/mcb-on.png";

    alert("✅ MCB turned ON.\nSupply is now available.");
    console.log("MCB ON");
  });
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
    connector: ["Bezier", { curviness: 200}]
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

    const baseAnchor = anchors[id];
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
    // Create per-endpoint options with connectorStyle for drag preview
    const endpointOptions = { ...baseEndpointOptions };
    endpointOptions.connectorStyle = {
      stroke: wireColor,
      strokeWidth: 4
    };
    // Use a stable uuid so Auto Connect can reuse the same styled endpoint
    const ep = jsPlumb.addEndpoint(el, { anchor, uuid: id }, endpointOptions);
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

  function getSeenConnectionKeys() {
    const seen = new Set();
    jsPlumb.getAllConnections().forEach(conn => {
      seen.add(connectionKey(conn.sourceId, conn.targetId));
    });
    return seen;
  }

function isPairConnected(a, b, connections) {
  return connections.some(conn => {
    const ids = [
      conn.sourceId,
      conn.targetId,
      conn.source?.id,
      conn.target?.id
    ].filter(Boolean);

    return ids.includes(a) && ids.includes(b);
  });
}



//   function isPairConnected(a, b, connections) {
//   return connections.some(conn => {
//     const srcId = conn.sourceId || conn.source?.id;
//     const tgtId = conn.targetId || conn.target?.id;

//     return (
//       (srcId === a && tgtId === b) ||
//       (srcId === b && tgtId === a)
//     );
//   });
// }

  

//  function isPairConnected(a, b, connections) {
//   return connections.some(conn => {
//     const srcId = conn.source && conn.source.id;
//     const tgtId = conn.target && conn.target.id;

//     return (
//       (srcId === a && tgtId === b) ||
//       (srcId === b && tgtId === a)
//     );
//   });
// }

function areAllConnectionsCorrect() {
  const connections = jsPlumb.getAllConnections();
  return requiredPairs.every(pair => {
    const [a, b] = pair.split("-");
    return isPairConnected(a, b, connections);
  });
}


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
      connector: ["Bezier", { curviness: 60 }],
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
  jsPlumb.bind("connection", function(info) {
    const sourceId = info.sourceId;
    const sourceAnchor = anchors[sourceId];
    const isLeftSide = sourceAnchor && sourceAnchor[0] === 0; // x=0 is left side
    const wireColor = isLeftSide ? "blue" : "red";
    info.connection.setPaintStyle({ stroke: wireColor, strokeWidth: 4 });
    console.log(`Wire from ${sourceId} set to ${wireColor}`); // Debug log (remove if not needed)
  });

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
    "pointA1-pointK"
  ];
  const requiredConnections = new Set(requiredPairs.map(pair => {
    const [a, b] = pair.split("-");
    return [a, b].sort().join("-");
  }));

  // Click on label buttons (e.g., .point-R) to remove connections from corresponding point
  document.querySelectorAll('[class^="point-"]').forEach(btn => {
    btn.style.cursor = "pointer"; // Ensure pointer cursor
    btn.addEventListener("click", function () {
      const className = this.className;
      const match = className.match(/point-([A-Za-z0-9]+)/);
      if (match) {
        const pointId = "point" + match[1];
        const pointEl = document.getElementById(pointId);
        if (pointEl) {
          // Remove all connections where this point is source or target
          jsPlumb.getConnections({ source: pointId }).concat(jsPlumb.getConnections({ target: pointId }))
            .forEach(c => jsPlumb.deleteConnection(c));
          jsPlumb.repaintEverything();
          turnMCBOff("Wire removed from " + pointId);
          
        }
      }
    });
  });

  // Existing: make clickable elements (endpoint divs) removable
    
      document.querySelectorAll(".point").forEach(p => {
  p.style.cursor = "pointer";

  p.addEventListener("click", function () {
    const id = this.id;

    // Get connections only related to this point
    const conns = jsPlumb.getAllConnections().filter(conn =>
      conn.sourceId === id || conn.targetId === id
    );

    if (conns.length === 0) return;

    // Remove only this point's connection
    jsPlumb.deleteConnection(conns[0]);
    jsPlumb.repaintEverything();
    turnMCBOff("Wire disconnected");

  });
});

    


  // Check button - Robust selection by text content (no ID needed)
  let guideStepIndex = 0;
  const checkBtns = document.querySelectorAll('.pill-btn');
  const checkBtn = Array.from(checkBtns).find(btn => btn.textContent.trim() === 'Check Connections');
  if (checkBtn) {
    console.log("Check button found and wired."); // Debug log


    // Replace your checkBtn.addEventListener with this DEBUG VERSION:

checkBtn.addEventListener("click", function () {
  const connections = jsPlumb.getAllConnections();

  // 🔍 DEBUG: Log all current connections
  console.log("=== ALL CONNECTIONS ===");
  connections.forEach(conn => {
    const srcId = conn.sourceId || (conn.source && conn.source.id);
    const tgtId = conn.targetId || (conn.target && conn.target.id);
    console.log(`${srcId} ↔ ${tgtId}`);
  });

  // Find all missing connections IN ORDER
  const missing = [];
  const completed = [];
  
  requiredPairs.forEach(pair => {
    const [a, b] = pair.split("-");
    const isConnected = isPairConnected(a, b, connections);
  
    if (!isConnected) {
      missing.push(pair);
      console.log(`❌ Missing: ${a} ↔ ${b}`);
    } else {
      completed.push(pair);
      console.log(`✅Connected: ${a} ↔ ${b}`);
    }
  });

  // ✅ All connections correct
  if (missing.length === 0) {
    alert("All connections are correct!\n\nCompleted all 10 steps!");
    return;
  }

  // ⚠️ Show the FIRST missing connection (in order)
  const nextMissing = missing[0];
  const [a, b] = nextMissing.split("-");
  const stepNumber = requiredPairs.indexOf(nextMissing) + 1;
  const completedCount = requiredPairs.length - missing.length;

  let message = `⚠️ Connection Required!\n\n`;
  message += `Step ${stepNumber} of ${requiredPairs.length}:\n`;
  message += `Connect → ${a} ↔ ${b}\n\n`;
  message += `Progress: ${completedCount}/${requiredPairs.length} completed\n`;
  message += `Remaining: ${missing.length}`;

  alert(message);
  
  // 🔍 Show debug info in console
  console.log("=== MISSING STEPS ===");
  missing.forEach((pair, idx) => {
    const step = requiredPairs.indexOf(pair) + 1;
    console.log(`Step ${step}: ${pair}`);
  });
});
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
  const autoConnectBtn = Array.from(checkBtns).find(btn => btn.textContent.trim() === 'Auto Connect');
  if (autoConnectBtn) {
    autoConnectBtn.addEventListener("click", function () {
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
      });
    });
  } else {
    console.error("Auto Connect button not found! Looking for '.pill-btn' with text 'Auto Connect'.");
  }


  // Reset button - remove ALL connections
const resetBtn = Array.from(document.querySelectorAll('.pill-btn'))
  .find(btn => btn.textContent.trim() === 'Reset');

if (resetBtn) {
  resetBtn.addEventListener('click', function () {

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
     turnMCBOff("Reset pressed");

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
});
