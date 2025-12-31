jsPlumb.ready(function () {
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
    const srcId = conn.source && conn.source.id;
    const tgtId = conn.target && conn.target.id;

    return (
      (srcId === a && tgtId === b) ||
      (srcId === b && tgtId === a)
    );
  });
}

/*ends*/

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
  });
});

    
  // document.querySelectorAll(".point").forEach(p => {
  //   p.style.cursor = "pointer";
  //   p.addEventListener("click", function () {
  //     const id = this.id;
  //     jsPlumb.getConnections({ source: id }).concat(jsPlumb.getConnections({ target: id }))
  //       .forEach(c => jsPlumb.deleteConnection(c));
  //     jsPlumb.repaintEverything();
  //   });
  // });

  // Check button - Robust selection by text content (no ID needed)
  let guideStepIndex = 0;
  const checkBtns = document.querySelectorAll('.pill-btn');
  const checkBtn = Array.from(checkBtns).find(btn => btn.textContent.trim() === 'Check Connections');
  if (checkBtn) {
    console.log("Check button found and wired."); // Debug log
    
   checkBtn.addEventListener("click", function () {
  const connections = jsPlumb.getAllConnections();

  // 🔍 find first missing step IN ORDER
  const nextMissing = requiredPairs.find(pair => {
    const [a, b] = pair.split("-");
    return !isPairConnected(a, b, connections);
  });

  // ✅ sab complete
  if (!nextMissing) {
    alert("✅ Connections are correct");
    return;
  }

  const [a, b] = nextMissing.split("-");
  const stepNumber = requiredPairs.indexOf(nextMissing) + 1;

  alert(
    `Step ${stepNumber}:\n` +
    `Connect → ${a} ↔ ${b}`
  );
});



//    checkBtn.addEventListener("click", function () {
//   const connections = jsPlumb.getAllConnections();

//   /* 🟡 CASE 1: Ek bhi wire nahi */
//   if (connections.length === 0) {

//     if (guideStepIndex >= requiredPairs.length) {
//       alert("ℹ️ All steps shown.\nNow start connecting the wires.");
//       guideStepIndex = 0;
//       return;
//     }

//     const pair = requiredPairs[guideStepIndex];
//     const [a, b] = pair.split("-");

//     alert(
//       `⚠️ No connections found!\n\n` +
//       `Step ${guideStepIndex + 1}:\n` +
//       `Connect → ${a} ↔ ${b}`
//     );

//     guideStepIndex++;
//     return;
//   }

//   /* 🟢 CASE 2: Kuch wire lagi hui hain → existing logic */
//   const seenKeys = new Set();
//   connections.forEach(conn => {
//     const key = [conn.sourceId, conn.targetId].sort().join("-");
//     seenKeys.add(key);
//   });

//   const missing = [];
//   requiredConnections.forEach(req => {
//     if (!seenKeys.has(req)) missing.push(req);
//   });

//   if (!missing.length) {
//     alert("✅ Connection is correct");
//     guideStepIndex = 0; // reset guide when correct
//     return;
//   }

//   let message = "❌ Connections not correct\n\nMissing connections:\n";
//   missing.forEach(pair => {
//     const [a, b] = pair.split("-");
//     message += `• ${a} ↔ ${b}\n`;
//   });

//   alert(message);
// });

  } else {
    console.error("Check button not found! Looking for '.pill-btn' with text 'Check Connections'. Add it or check HTML.");
  }

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

    console.log("Reset: all connections removed");
  });
} else {
  console.error("Reset button not found!");
}

  // Pin endpoints and knobs with percentage offsets so zoom/resize cannot push them out of view
  const pinnedSelectors = [
    ".point",
    ".point-R", ".point-B", ".point-L", ".point-F", ".point-A",
    ".point-C", ".point-D", ".point-E", ".point-G", ".point-H", ".point-I", ".point-J", ".point-K",
    ".point-A1", ".point-F1", ".point-A2", ".point-F2", ".point-A3", ".point-Z3", ".point-A4", ".point-Z4",
    ".point-L1", ".point-L2",
    ".nob1", ".nob2"
  ];
  const pinContainerSelector = ".rheostat, .meters, .meter-panel, .mcb-starter-section, .motor-box, .generator-box, .workspace, .left-column, .center-column, .top-row, .panel";
  const pinnedElements = [];

  function findPinContainer(el) {
    return el.closest(pinContainerSelector) || document.querySelector(".panel") || document.body;
  }

  function pinElementToPercent(el) {
    const container = findPinContainer(el);
    const containerRect = container.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return;

    if (container !== document.body && getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const leftPct = ((rect.left - containerRect.left) / containerRect.width) * 100;
    const topPct = ((rect.top - containerRect.top) / containerRect.height) * 100;

    el.style.left = `${leftPct}%`;
    el.style.top = `${topPct}%`;
    el.style.right = "auto";
    el.style.bottom = "auto";

    pinnedElements.push(el);
  }

  function pinAllElements() {
    pinnedElements.length = 0;
    const seen = new Set();
    document.querySelectorAll(pinnedSelectors.join(", ")).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      pinElementToPercent(el);
    });

    if (window.jsPlumb) {
      jsPlumb.repaintEverything();
    }
  }

  const repaintConnections = () => {
    if (window.jsPlumb) {
      jsPlumb.repaintEverything();
    }
  };

  if (document.readyState === "complete") {
    pinAllElements();
  } else {
    window.addEventListener("load", pinAllElements);
  }
  window.addEventListener("resize", repaintConnections);
});
