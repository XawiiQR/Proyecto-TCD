// Configuración inicial del mapa (sin cambios)
const map = L.map("map").setView([37.0902, -95.7129], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Variables globales
let geojsonLayer;
const createdCharts = new Set();
const FIPS_deseados = [5, 9, 19, 20, 28, 32, 40, 41, 49];
window.weekMonthMap = createWeekMonthMap(2021); // Asegura que sea global y antes de cualquier uso
let currentSelectedFips = null;
const flowDataCache = new Map(); // Caché para datos de la API

// Reemplazar variable de selección única por un Set para selección múltiple
globalThis.selectedFipsSet = new Set();

// Diccionario FIPS->nombre de estado
const FIPS_TO_STATE = {
  "01": "Alabama",
  "02": "Alaska",
  "04": "Arizona",
  "05": "Arkansas",
  "06": "California",
  "08": "Colorado",
  "09": "Connecticut",
  10: "Delaware",
  11: "District of Columbia",
  12: "Florida",
  13: "Georgia",
  15: "Hawaii",
  16: "Idaho",
  17: "Illinois",
  18: "Indiana",
  19: "Iowa",
  20: "Kansas",
  21: "Kentucky",
  22: "Louisiana",
  23: "Maine",
  24: "Maryland",
  25: "Massachusetts",
  26: "Michigan",
  27: "Minnesota",
  28: "Mississippi",
  29: "Missouri",
  30: "Montana",
  31: "Nebraska",
  32: "Nevada",
  33: "New Hampshire",
  34: "New Jersey",
  35: "New Mexico",
  36: "New York",
  37: "North Carolina",
  38: "North Dakota",
  39: "Ohio",
  40: "Oklahoma",
  41: "Oregon",
  42: "Pennsylvania",
  44: "Rhode Island",
  45: "South Carolina",
  46: "South Dakota",
  47: "Tennessee",
  48: "Texas",
  49: "Utah",
  50: "Vermont",
  51: "Virginia",
  53: "Washington",
  54: "West Virginia",
  55: "Wisconsin",
  56: "Wyoming",
};

// Función para cargar el GeoJSON (sin cambios)
function loadGeoJSON() {
  fetch("http://127.0.0.1:5050/get_geojson_data")
    .then((response) => response.json())
    .then((data) => {
      geojsonLayer = L.geoJSON(data, {
        style: getFeatureStyle,
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          layer.bindPopup(createPopupContent(props));

          layer.on({
            mouseover: (e) => highlightFeature(e),
            mouseout: (e) => resetHighlight(e),
            click: (e) => {
              const fips = String(e.target.feature.properties.id).padStart(
                2,
                "0"
              );
              window.lastFlowFips = fips; // Guardar el último FIPS seleccionado
              if (selectedFipsSet.has(fips)) {
                selectedFipsSet.delete(fips);
                highlightCountyByFips(fips, false);
                removeCountyPanel(fips);
              } else {
                selectedFipsSet.add(fips);
                highlightCountyByFips(fips, true);
                // showCountyData(fips); // Comentado según la solicitud
                createRadialChart(
                  "radial-chart-container",
                  "radial-tooltip",
                  parseInt(fips)
                );
                loadFlowDiagram(fips, window.lastFlowWeek || 1);
                printTrendForState(fips);
                renderDoubleLineChart(fips); // Grafica el gráfico de líneas doble al seleccionar un estado
              }
            },
          });
        },
      }).addTo(map);
    })
    .catch(handleFetchError);
}

// Función debounce para limitar actualizaciones rápidas
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Función optimizada para cargar el diagrama de flujo
function loadFlowDiagram(fips, week) {
  const container = d3.select("#flow-diagram-container");
  container.html(""); // Limpiar contenedor

  // Solo crear el contenedor del SVG
  container.html(`
    <div id="flow-viz"><div id="loading-message" style="text-align: center;">Cargando...</div></div>
  `);

  // Usar el contenedor de week-buttons global
  const weekButtonsContainer = document.getElementById("week-buttons");
  weekButtonsContainer.innerHTML = "";
  for (let i = 1; i <= 52; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "week-btn" + (i === week ? " selected" : "");
    btn.setAttribute("data-week", i);
    btn.style.margin = "0 2px";
    btn.style.padding = "4px 0";
    btn.style.minWidth = "28px";
    btn.style.fontSize = "0.95rem";
    btn.style.borderRadius = "5px";
    btn.style.border = "1px solid #ccc";
    btn.style.background = i === week ? "#2c3e50" : "#f8f9fa";
    btn.style.color = i === week ? "#fff" : "#2c3e50";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", function () {
      // Quitar selección previa
      weekButtonsContainer.querySelectorAll(".week-btn").forEach((b) => {
        b.classList.remove("selected");
        b.style.background = "#f8f9fa";
        b.style.color = "#2c3e50";
      });
      btn.classList.add("selected");
      btn.style.background = "#2c3e50";
      btn.style.color = "#fff";
      filterByWeek(i); // Llamar a filterByWeek
      updateFlowDiagramSVG(fips, i);
    });
    weekButtonsContainer.appendChild(btn);
  }

  // Resaltar semanas del mes seleccionado
  highlightWeeksOfSelectedMonth();

  updateFlowDiagramSVG(fips, week);
}

// Función para resaltar semanas del mes seleccionado
function highlightWeeksOfSelectedMonth() {
  // Buscar el mes seleccionado
  const selectedMonthBtn = document.querySelector(".month-btn.selected");
  let selectedMonth = 0;
  if (selectedMonthBtn) {
    selectedMonth = parseInt(selectedMonthBtn.getAttribute("data-month"));
  }
  // Resaltar semanas del mes
  document.querySelectorAll(".week-btn").forEach((btn) => {
    const week = parseInt(btn.getAttribute("data-week"));
    const weekInfo = weekMonthMap[week - 1];
    if (selectedMonth === 0) {
      btn.style.opacity = 1;
      btn.style.outline = "none";
    } else if (weekInfo && weekInfo.month === selectedMonth) {
      btn.style.opacity = 1;
      btn.style.outline = "2px solid #2c3e50";
    } else {
      btn.style.opacity = 0.4;
      btn.style.outline = "none";
    }
  });
}

function updateFlowDiagramSVG(fips, week) {
  const cacheKey = `${fips}-${week}`;
  const vizContainer = d3.select("#flow-viz");
  const loadingMessage = vizContainer.select("#loading-message");

  // Usar datos del caché si existen
  if (flowDataCache.has(cacheKey)) {
    renderFlowDiagram(vizContainer, flowDataCache.get(cacheKey), week);
    return;
  }

  // Fetch datos y almacenar en caché
  fetch(`http://localhost:5050/api/flujos/${fips}/${week}`)
    .then((response) => response.json())
    .then((data) => {
      flowDataCache.set(cacheKey, data);
      renderFlowDiagram(vizContainer, data, week);
    })
    .catch((error) => {
      console.error("Error loading flow diagram:", error);
      loadingMessage.text(
        "Error al cargar el diagrama de flujo. Intente nuevamente."
      );
    });
}

function renderFlowDiagram(vizContainer, data, week) {
  // Limpiar mensaje de carga
  vizContainer.select("#loading-message").remove();

  // Calcular movilidad neta en porcentaje
  const inflowPercent = (data.flujos_in || []).reduce(
    (sum, d) => sum + (d.Porcentaje || 0),
    0
  );
  const outflowPercent = (data.flujos_out || []).reduce(
    (sum, d) => sum + (d.Porcentaje || 0),
    0
  );
  const netaPercent = outflowPercent - inflowPercent;

  // Mostrar movilidad neta en la parte superior (en porcentaje)
  vizContainer.select(".net-mobility-info").remove(); // Elimina el resumen anterior si existe
  vizContainer
    .insert("div", ":first-child")
    .attr("class", "net-mobility-info")
    .style("text-align", "center")
    .style("font-weight", "bold")
    .style("font-size", "16px")
    .style("margin-bottom", "8px")
    .html(
      `Movilidad neta semana ${week}: <span style='color:#8E44AD'>${(
        netaPercent * 100
      ).toFixed(2)}%</span> (Entraron: <span style='color:#27ae60'>${(
        inflowPercent * 100
      ).toFixed(2)}%</span>, Salieron: <span style='color:#c0392b'>${(
        outflowPercent * 100
      ).toFixed(2)}%</span> de la población)`
    );

  // Configuración del SVG
  const width = vizContainer.node().clientWidth; // Quitar Math.min(1400, ...)
  const height = 500; // Reducir altura para menos espacio en blanco
  let svg = vizContainer.select("svg");
  if (svg.empty()) {
    svg = vizContainer
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
  }

  // Limpiar TODOS los elementos SVG (enlaces, nodos, etiquetas) para evitar acumulación
  svg.selectAll("*").remove();

  // Márgenes mínimos
  const margin = {
    top: 10,
    left: 40,
    bottom: 10,
    right: 40,
  };

  const strokeWidths = {
    "0-20%": 1,
    "20-40%": 2,
    "40-60%": 3,
    "60-80%": 4,
    "80-100%": 5,
    ">100%": 6,
  };

  const strokeOpacities = {
    "0-20%": 0.3,
    "20-40%": 0.4,
    "40-60%": 0.5,
    "60-80%": 0.6,
    "80-100%": 0.7,
    ">100%": 0.8,
  };

  // Filtrar datos para reducir carga (opcional)
  const minPorcentaje = 0.1; // Ajusta según necesidad
  data.flujos_in = data.flujos_in.filter((d) => d.Porcentaje >= minPorcentaje);
  data.flujos_out = data.flujos_out.filter(
    (d) => d.Porcentaje >= minPorcentaje
  );

  // Ordenar datos
  data.flujos_in.sort((a, b) => a.Porcentaje - b.Porcentaje);
  data.flujos_out.sort((a, b) => a.Porcentaje - b.Porcentaje);

  // Definir rangos de porcentaje
  const percentRanges = [
    { id: "in_0_1", label: "0-20%", min: 0, max: 0.2, type: "in_percent" },
    { id: "in_1_20", label: "20-40%", min: 0.2, max: 0.4, type: "in_percent" },
    { id: "in_21_90", label: "40-60%", min: 0.4, max: 0.6, type: "in_percent" },
    {
      id: "in_91_100",
      label: "60-80%",
      min: 0.6,
      max: 0.8,
      type: "in_percent",
    },
    {
      id: "in_91_100_higher",
      label: "80-100%",
      min: 0.8,
      max: 1,
      type: "in_percent",
    },
    {
      id: "in_over_100",
      label: ">100%",
      min: 1,
      max: Infinity,
      type: "in_percent",
    },
    { id: "out_0_1", label: "0-20%", min: 0, max: 0.2, type: "out_percent" },
    {
      id: "out_1_20",
      label: "20-40%",
      min: 0.2,
      max: 0.4,
      type: "out_percent",
    },
    {
      id: "out_21_90",
      label: "40-60%",
      min: 0.4,
      max: 0.6,
      type: "out_percent",
    },
    {
      id: "out_91_100",
      label: "60-80%",
      min: 0.6,
      max: 0.8,
      type: "out_percent",
    },
    {
      id: "out_91_100_higher",
      label: "80-100%",
      min: 0.8,
      max: 1,
      type: "out_percent",
    },
    {
      id: "out_over_100",
      label: ">100%",
      min: 1,
      max: Infinity,
      type: "out_percent",
    },
  ];

  function getLocalPercentage(value, range) {
    const { min, max } = range;
    const rangeSize = max - min;
    const offset = value - min;
    if (!isFinite(rangeSize)) return 1;
    const result = offset / rangeSize;
    return result > 1 ? 1 : result;
  }

  function getIntervalProgress(value, ranges) {
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (
        (value >= r.min && value < r.max) ||
        (r.max === Infinity && value >= r.min)
      ) {
        const local = getLocalPercentage(value, r);
        return {
          index: i,
          label: r.label,
          percentInInterval: local,
          globalPosition: (i + local) / ranges.length,
        };
      }
    }
    return null;
  }

  // Filtrar rangos usados
  const usedPercentRanges = new Set();
  const inputAssignments = new Map();
  const outputAssignments = new Map();

  data.flujos_in.forEach((d, index) => {
    const range = percentRanges.find(
      (r) =>
        r.type === "in_percent" && d.Porcentaje >= r.min && d.Porcentaje < r.max
    );
    if (range) {
      usedPercentRanges.add(range.id);
      inputAssignments.set(`in_${d.FIPS_O}`, {
        rangeId: range.id,
        index,
        rangeLabel: range.label,
      });
    }
  });

  data.flujos_out.forEach((d, index) => {
    const range = percentRanges.find(
      (r) =>
        r.type === "out_percent" &&
        d.Porcentaje >= r.min &&
        d.Porcentaje < r.max
    );
    if (range) {
      usedPercentRanges.add(range.id);
      outputAssignments.set(`out_${d.FIPS_D}`, {
        rangeId: range.id,
        index,
        rangeLabel: range.label,
      });
    }
  });

  const filteredPercentRanges = percentRanges.filter((r) =>
    usedPercentRanges.has(r.id)
  );

  // Crear nodos
  const nodeData = [
    ...data.flujos_in.map((d) => ({
      id: `in_${d.FIPS_O}`,
      type: "input",
      fips: d.FIPS_O,
      porcentaje: d.Porcentaje,
    })),
    ...data.flujos_in.map((d) => ({
      id: `in_intermediate_${d.FIPS_O}`,
      type: "input_intermediate",
      fips: d.FIPS_O,
      porcentaje: d.Porcentaje,
    })),
    { id: `mid_${data.fips}`, type: "middle", fips: data.fips },
    ...data.flujos_out.map((d) => ({
      id: `out_${d.FIPS_D}`,
      type: "output",
      fips: d.FIPS_D,
      porcentaje: d.Porcentaje,
    })),
    ...data.flujos_out.map((d) => ({
      id: `out_intermediate_${d.FIPS_D}`,
      type: "output_intermediate",
      fips: d.FIPS_D,
      porcentaje: d.Porcentaje,
    })),
    ...filteredPercentRanges,
  ];

  // Crear enlaces
  const links = [
    ...data.flujos_in.map((d, i) => {
      const range = filteredPercentRanges.find(
        (r) =>
          r.type === "in_percent" &&
          d.Porcentaje >= r.min &&
          d.Porcentaje < r.max
      );
      return {
        source: `mid_${data.fips}`,
        target: range.id,
        width: strokeWidths[range.label],
        opacity: strokeOpacities[range.label],
        class: "link-in",
      };
    }),
    ...data.flujos_out.map((d, i) => {
      const range = filteredPercentRanges.find(
        (r) =>
          r.type === "out_percent" &&
          d.Porcentaje >= r.min &&
          d.Porcentaje < r.max
      );
      return {
        source: `mid_${data.fips}`,
        target: range.id,
        width: strokeWidths[range.label],
        opacity: strokeOpacities[range.label],
        class: "link-out",
      };
    }),
    ...data.flujos_in.map((d, i) => {
      const range = filteredPercentRanges.find(
        (r) =>
          r.type === "in_percent" &&
          d.Porcentaje >= r.min &&
          d.Porcentaje < r.max
      );
      return {
        source: range.id,
        target: `in_intermediate_${d.FIPS_O}`,
        width: strokeWidths[range.label],
        opacity: strokeOpacities[range.label],
        class: "link-in",
      };
    }),
    ...data.flujos_in.map((d, i) => {
      const range = filteredPercentRanges.find(
        (r) =>
          r.type === "in_percent" &&
          d.Porcentaje >= r.min &&
          d.Porcentaje < r.max
      );
      return {
        source: `in_intermediate_${d.FIPS_O}`,
        target: `in_${d.FIPS_O}`,
        width: strokeWidths[range.label],
        opacity: strokeOpacities[range.label],
        class: "link-in",
      };
    }),
    ...data.flujos_out.map((d, i) => {
      const range = filteredPercentRanges.find(
        (r) =>
          r.type === "out_percent" &&
          d.Porcentaje >= r.min &&
          d.Porcentaje < r.max
      );
      return {
        source: range.id,
        target: `out_intermediate_${d.FIPS_D}`,
        width: strokeWidths[range.label],
        opacity: strokeOpacities[range.label],
        class: "link-out",
      };
    }),
    ...data.flujos_out.map((d, i) => {
      const range = filteredPercentRanges.find(
        (r) =>
          r.type === "out_percent" &&
          d.Porcentaje >= r.min &&
          d.Porcentaje < r.max
      );
      return {
        source: `out_intermediate_${d.FIPS_D}`,
        target: `out_${d.FIPS_D}`,
        width: strokeWidths[range.label],
        opacity: strokeOpacities[range.label],
        class: "link-out",
      };
    }),
  ].filter((d) => d.target);

  // Calcular posiciones
  const inputs = nodeData.filter((d) => d.type === "input");
  const inputIntermediates = nodeData.filter(
    (d) => d.type === "input_intermediate"
  );
  const outputs = nodeData.filter((d) => d.type === "output");
  const outputIntermediates = nodeData.filter(
    (d) => d.type === "output_intermediate"
  );
  const inPercentNodes = nodeData.filter((d) => d.type === "in_percent");
  const outPercentNodes = nodeData.filter((d) => d.type === "out_percent");

  const inputSpacing =
    (height - margin.top - margin.bottom) / (inputs.length + 1);
  const outputSpacing =
    (height - margin.top - margin.bottom) / (outputs.length + 1);
  const middleY = height / 2;
  const offsetFactor = (width - margin.left - margin.right) / 3;

  const nodes = nodeData.map((d) => {
    let x, y;
    if (d.type === "input") {
      const info = getIntervalProgress(
        d.porcentaje,
        percentRanges.filter((r) => r.type === "in_percent")
      );
      const offset = info ? offsetFactor * info.percentInInterval : 0;
      x = margin.left + 50 - offset;
      y =
        margin.top +
        (inputs.length === 1
          ? (height - margin.top - margin.bottom) / 2
          : inputSpacing * (inputs.findIndex((i) => i.id === d.id) + 1));
    } else if (d.type === "input_intermediate") {
      x = margin.left + 50;
      y =
        margin.top +
        (inputs.length === 1
          ? (height - margin.top - margin.bottom) / 2
          : inputSpacing *
            (inputs.findIndex((i) => i.id === `in_${d.fips}`) + 1));
    } else if (d.type === "middle") {
      x = width / 2;
      y = height / 2;
    } else if (d.type === "output") {
      const info = getIntervalProgress(
        d.porcentaje,
        percentRanges.filter((r) => r.type === "out_percent")
      );
      const offset = info ? offsetFactor * info.percentInInterval : 0;
      x = width - margin.right - 50 + offset;
      y =
        margin.top +
        (outputs.length === 1
          ? (height - margin.top - margin.bottom) / 2
          : outputSpacing * (outputs.findIndex((o) => o.id === d.id) + 1));
    } else if (d.type === "output_intermediate") {
      x = width - margin.right - 50;
      y =
        margin.top +
        (outputs.length === 1
          ? (height - margin.top - margin.bottom) / 2
          : outputSpacing *
            (outputs.findIndex((o) => o.id === `out_${d.fips}`) + 1));
    } else if (d.type === "in_percent") {
      x = width / 2 - 100;
      const connectedFips = [...inputAssignments.entries()]
        .filter(([_, assignment]) => assignment.rangeId === d.id)
        .map(
          ([_, assignment]) =>
            margin.top +
            (inputs.length === 1
              ? (height - margin.top - margin.bottom) / 2
              : inputSpacing * (assignment.index + 1))
        );
      y = connectedFips.length > 0 ? d3.mean(connectedFips) : height / 2;
    } else if (d.type === "out_percent") {
      x = width / 2 + 100;
      const connectedFips = [...outputAssignments.entries()]
        .filter(([_, assignment]) => assignment.rangeId === d.id)
        .map(
          ([_, assignment]) =>
            margin.top +
            (outputs.length === 1
              ? (height - margin.top - margin.bottom) / 2
              : outputSpacing * (assignment.index + 1))
        );
      y = connectedFips.length > 0 ? d3.mean(connectedFips) : height / 2;
    }
    return { ...d, x, y };
  });

  const nodeMap = new Map(nodes.map((d) => [d.id, d]));

  // Usar curva suave
  const line = d3
    .line()
    .curve(d3.curveBundle.beta(0.85))
    .x((d) => d.x)
    .y((d) => d.y);

  // Crear enlaces
  const linkSelection = svg
    .selectAll(".link")
    .data(links, (d, i) => `${d.source}-${d.target}-${week}-${i}`);
  linkSelection
    .enter()
    .append("path")
    .attr("class", (d) => d.class)
    .attr("stroke-width", (d) => d.width)
    .attr("stroke-opacity", (d) => d.opacity)
    .attr("d", (d) => {
      const s = nodeMap.get(d.source);
      const t = nodeMap.get(d.target);
      const midX = (s.x + t.x) / 2;
      return line([s, { x: midX, y: s.y }, { x: midX, y: t.y }, t]);
    });

  // Crear nodos FIPS (cuadrados)
  const fipsNodeSelection = svg.selectAll(".fips-node").data(
    nodes.filter(
      (d) =>
        d.type === "input" ||
        d.type === "middle" ||
        d.type === "output" ||
        d.type === "input_intermediate" ||
        d.type === "output_intermediate"
    ),
    (d) => d.id
  );
  fipsNodeSelection
    .enter()
    .append("rect")
    .attr("class", "fips-node")
    .attr("x", (d) => d.x - 8)
    .attr("y", (d) => d.y - 8)
    .attr("width", 16)
    .attr("height", 16);

  // Para los nodos de transición, dibuja un rectángulo ancho y el texto del porcentaje encima
  const transitionNodes = nodes.filter(
    (d) => d.type === "input_intermediate" || d.type === "output_intermediate"
  );
  svg
    .selectAll(".transition-bg")
    .data(transitionNodes, (d) => d.id)
    .enter()
    .append("rect")
    .attr("class", "transition-bg")
    .attr("x", (d) => d.x - 22)
    .attr("y", (d) => d.y - 12)
    .attr("width", 44)
    .attr("height", 24)
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("fill", "#f5f5f5")
    .attr("stroke", "#bbb")
    .attr("stroke-width", 1.2);
  svg
    .selectAll(".transition-percent")
    .data(transitionNodes, (d) => d.id)
    .enter()
    .append("text")
    .attr("class", "transition-percent")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y + 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text((d) => {
      let porcentaje = null;
      if (d.type === "input_intermediate") {
        const match = data.flujos_in.find(
          (f) => String(f.FIPS_O) === String(d.fips)
        );
        if (match) porcentaje = match.Porcentaje;
      } else if (d.type === "output_intermediate") {
        const match = data.flujos_out.find(
          (f) => String(f.FIPS_D) === String(d.fips)
        );
        if (match) porcentaje = match.Porcentaje;
      }
      return porcentaje !== null ? `${(porcentaje * 100).toFixed(1)}%` : "";
    });

  // Crear nodos de porcentaje (círculos)
  const percentNodeSelection = svg.selectAll(".percent-node").data(
    nodes.filter((d) => d.type === "in_percent" || d.type === "out_percent"),
    (d) => d.id
  );
  percentNodeSelection
    .enter()
    .append("circle")
    .attr("class", "percent-node")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", 12);

  // Elimina el bloque que agrega el texto de porcentaje a los círculos (percent-value)

  // Crear etiquetas
  const labelSelection = svg.selectAll(".label").data(nodes, (d) => d.id);
  labelSelection
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y - 20)
    .text((d) =>
      d.type === "in_percent" || d.type === "out_percent"
        ? d.label
        : d.type === "input" || d.type === "output" || d.type === "middle"
        ? FIPS_TO_STATE[String(d.fips).padStart(2, "0")] || `FIPS ${d.fips}`
        : ""
    );

  // Depuración: log para verificar el número de elementos
  console.log(
    `Semana: ${week}, Enlaces creados: ${links.length}, Nodos: ${nodes.length}`
  );
}

// Resto de funciones (sin cambios significativos)
function handleFeatureClick2() {
  const chartsContainer = d3.select("#charts-panel .charts-container");
  chartsContainer.html("");

  const compactContainer = chartsContainer
    .append("div")
    .attr("class", "compact-container")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "5px");

  FIPS_deseados.forEach((fips) => {
    if (!fips || createdCharts.has(fips)) return;

    createdCharts.add(fips);

    fetch("http://localhost:5050/get_name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fips: fips }),
    })
      .then((response) => response.json())
      .then((name) => {
        const stateName = name || `Estado ${fips}`;

        fetchCountyData(fips)
          .then((data) => {
            if (data.error) {
              console.error(data.error);
              return;
            }

            const casesData = transformDataForChart(data.new_cases_category);
            const deathsData = transformDataForChart(data.new_deaths_category);

            const stateRow = compactContainer
              .append("div")
              .attr("class", "state-row")
              .attr("data-fips", String(fips).padStart(2, "0"))
              .style("display", "flex")
              .style("align-items", "center")
              .style("gap", "10px")
              .style("padding", "5px")
              .style("border-bottom", "1px solid #eee")
              .on("mouseover", () => highlightCountyByFips(fips, true))
              .on("mouseout", () => highlightCountyByFips(fips, false))
              .on("click", (event) => {
                event.stopPropagation();
                highlightCountyByFips(fips, true);
                // showCountyData(fips); // Comentado según la solicitud

                geojsonLayer.eachLayer((layer) => {
                  if (
                    layer.feature.properties.id ===
                    String(fips).padStart(2, "0")
                  ) {
                    map.fitBounds(layer.getBounds());
                  }
                });
              });

            stateRow
              .append("div")
              .attr("class", "state-name")
              .style("flex", "0 0 100px")
              .style("font-weight", "bold")
              .text(stateName);

            const casesContainer = stateRow
              .append("div")
              .attr("class", "cases-container")
              .style("flex", "1")
              .style("min-width", "150px");
            drawCompactBars(casesContainer, casesData, "cases");

            const deathsContainer = stateRow
              .append("div")
              .attr("class", "deaths-container")
              .style("flex", "1")
              .style("min-width", "150px");
            drawCompactBars(deathsContainer, deathsData, "deaths");

            stateRow
              .selectAll(".cases-container, .deaths-container")
              .on("mouseover", function () {
                highlightCountyByFips(fips, true);
              })
              .on("mouseout", function () {
                highlightCountyByFips(fips, false);
              });

            updateMapHighlight(fips);
          })
          .catch(handleFetchError);
      })
      .catch(handleFetchError);
  });
}

function drawCompactBars(container, data, type) {
  const width = 150;
  const height = 24;
  const itemSize = 4;
  const spacing = 6;
  const itemsPerColumn = 4;
  const margin = { top: 5, right: 5, bottom: 5, left: 5 };

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const totalItems = data.reduce((sum, item) => sum + item.count, 0);
  let currentWeekIndex = 0;
  let itemsDrawn = 0;

  let xPos = margin.left;
  const centerY = height / 2;

  data.forEach((item) => {
    let remaining = item.count;
    while (remaining > 0) {
      const itemsInCol = Math.min(remaining, itemsPerColumn);

      const positions = [];
      if (itemsInCol % 2 === 1) {
        const middleIndex = Math.floor(itemsInCol / 2);
        positions.push(centerY - middleIndex * spacing);
        for (let i = 1; i <= middleIndex; i++) {
          positions.unshift(centerY - (middleIndex - i) * spacing);
          positions.push(centerY + i * spacing);
        }
      } else {
        const half = itemsInCol / 2;
        for (let i = 0; i < half; i++) {
          positions.unshift(centerY - (i + 0.5) * spacing);
          positions.push(centerY + (i + 0.5) * spacing);
        }
      }

      for (let i = 0; i < itemsInCol; i++) {
        const weekInfo = weekMonthMap[currentWeekIndex];
        svg
          .append("rect")
          .attr("x", xPos)
          .attr("y", positions[i] - itemSize / 2)
          .attr("width", itemSize)
          .attr("height", itemSize)
          .attr("fill", getColor(item.level, type))
          .attr("rx", 2)
          .attr("ry", 2)
          .attr("class", "cube")
          .attr("data-week", weekInfo.week)
          .attr("data-month", weekInfo.month);

        itemsDrawn++;
        if (itemsDrawn < weekMonthMap.length) {
          currentWeekIndex++;
        }
      }

      remaining -= itemsInCol;
      xPos += spacing;
    }
  });
}

function createWeekMonthMap(year) {
  const weekMonthMap = [];
  const startDate = new Date(year, 0, 4); // Primer lunes de 2021

  for (let week = 1; week <= 52; week++) {
    const month = startDate.getMonth() + 1;
    weekMonthMap.push({ week, month });
    startDate.setDate(startDate.getDate() + 7);
  }

  return weekMonthMap;
}

function filterByMonth(selectedMonth) {
  d3.selectAll(".cube").each(function () {
    const cube = d3.select(this);
    const cubeMonth = parseInt(cube.attr("data-month"));

    if (selectedMonth === 0 || cubeMonth === selectedMonth) {
      cube.style("opacity", 1).style("filter", "none");
    } else {
      cube.style("opacity", 0.3).style("filter", "grayscale(80%)");
    }
  });
}

function filterByWeek(selectedWeek) {
  d3.selectAll(".cube").each(function () {
    const cube = d3.select(this);
    const cubeWeek = parseInt(cube.attr("data-week"));
    if (!selectedWeek || cubeWeek === selectedWeek) {
      cube.style("opacity", 1).style("filter", "none");
    } else {
      cube.style("opacity", 0.3).style("filter", "grayscale(80%)");
    }
  });
}

function setupMonthSlider() {
  const monthNames = [
    "Todos los meses",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const buttonsContainer = document.getElementById("month-buttons");
  buttonsContainer.innerHTML = "";

  monthNames.forEach((name, idx) => {
    const btn = document.createElement("button");
    btn.textContent = name;
    btn.className = "month-btn" + (idx === 0 ? " selected" : "");
    btn.setAttribute("data-month", idx);
    btn.addEventListener("click", function () {
      // Quitar selección previa
      buttonsContainer.querySelectorAll(".month-btn").forEach((b) => {
        b.classList.remove("selected");
      });
      // Seleccionar actual
      btn.classList.add("selected");
      filterByMonth(idx);
      highlightWeeksOfSelectedMonth();
      if (window.highlightRadialMonth) {
        if (idx === 0 && window.clearRadialHighlight) {
          window.clearRadialHighlight();
        } else {
          window.highlightRadialMonth(idx);
        }
      }
    });
    buttonsContainer.appendChild(btn);
  });
}

function getColor(level, type) {
  const colors = {
    cases: { 1: "#85C1E9", 2: "#2471A3", 3: "#8E44AD", 4: "#512E5F" },
    deaths: { 1: "#F4D03F", 2: "#E67E22", 3: "#CB4335", 4: "#641E16" },
  };
  return colors[type][level] || "#999";
}

function transformDataForChart(categoryData) {
  return categoryData.map((item) => {
    const [level, count] = item.split("_").map(Number);
    return { level, count };
  });
}

function highlightCountyByFips(fips, highlight = true) {
  geojsonLayer.eachLayer(function (layer) {
    const layerFips = String(layer.feature.properties.id).padStart(2, "0");
    const fipsString = String(fips).padStart(2, "0");

    if (layerFips === fipsString) {
      layer.setStyle({
        weight: highlight ? 3 : 1,
        color: highlight ? "#4EAC95" : "white",
        fillOpacity: highlight ? 0.7 : 0.7,
        fillColor: highlight ? "#42CFAD" : "#37EDC1",
      });
      if (highlight) layer.bringToFront();
    }
  });
}

function fetchCountyData(fips) {
  return fetch("http://127.0.0.1:5050/get_categorized_data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fips: parseInt(fips) }),
  }).then((response) => response.json());
}

function handleFetchError(error) {
  console.error("Error:", error);
}

function getFeatureStyle() {
  return {
    fillColor: "#37EDC1",
    weight: 1,
    opacity: 1,
    color: "white",
    fillOpacity: 0.7,
  };
}

function createPopupContent(props) {
  return `<b>${props.name || "N/A"}</b><br>FIPS: ${props.id || "N/A"}`;
}

function highlightFeature(e) {
  const layer = e.target;
  const fips = String(layer.feature.properties.id).padStart(2, "0");

  layer.setStyle({
    weight: 3,
    color: "#4EAC95",
    fillOpacity: 0.7,
  });
  layer.bringToFront();

  d3.selectAll(".state-row")
    .filter(function () {
      return d3.select(this).attr("data-fips") === fips;
    })
    .style("background-color", "#F4E7E1");
}

function resetHighlight(e) {
  const layer = e.target;
  geojsonLayer.resetStyle(e.target);
  d3.selectAll(".state-row").style("background-color", "transparent");
}

function updateMapHighlight(fips) {
  geojsonLayer.eachLayer(function (layer) {
    if (layer.feature.properties.id === fips) {
      layer.setStyle({
        weight: 3,
        color: "#FF5722",
        fillOpacity: 0.9,
      });
      layer.bringToFront();
    }
  });
}

// --- FIN: Comentar función showCountyData y sus llamadas ---
// function showCountyData(fips) {
//   fetch("http://localhost:5050/get_geojson_fip", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ fips: parseInt(fips) }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       if (!data || !data.features || data.features.length === 0) {
//         console.error("No se encontraron datos para este FIPS:", fips);
//         return;
//       }

//       const feature = data.features[0];
//       const properties = feature.properties;

//       if (!properties || !properties.name || !properties.id) {
//         console.error("Faltan propiedades en los datos del condado:", feature);
//         return;
//       }

//       const container = d3.select("#empty-container");

//       if (!container.select(".states-container").node()) {
//         container.html("");
//         container
//           .append("div")
//           .attr("class", "states-container")
//           .style("display", "flex")
//           .style("flex-wrap", "nowrap")
//           .style("gap", "20px")
//           .style("overflow-x", "auto")
//           .style("padding", "10px");
//       }

//       const statesContainer = container.select(".states-container");

//       const existingState = statesContainer.select(`.state-${fips}`).node();
//       if (existingState) {
//         existingState.parentNode.appendChild(existingState);
//         return;
//       }

//       const stateDiv = statesContainer
//         .append("div")
//         .attr("class", `state-${fips} state-card`)
//         .style("background", "white")
//         .style("border-radius", "8px")
//         .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
//         .style("padding", "15px")
//         .style("flex", "0 0 auto")
//         .style("position", "relative");

//       const width = 120;
//       const height = 120;

//       const svg = stateDiv
//         .append("svg")
//         .attr("width", width)
//         .attr("height", height);

//       const projection = d3
//         .geoAlbersUsa()
//         .fitSize([width, height], feature.geometry);
//       const path = d3.geoPath().projection(projection);

//       svg
//         .append("g")
//         .selectAll("path")
//         .data([feature])
//         .enter()
//         .append("path")
//         .attr("d", path)
//         .attr("fill", "#2980B9")
//         .attr("stroke", "#fff")
//         .attr("stroke-width", 1.5);

//       stateDiv
//         .append("button")
//         .text("×")
//         .style("position", "absolute")
//         .style("top", "5px")
//         .style("right", "5px")
//         .style("background", "none")
//         .style("border", "none")
//         .style("cursor", "pointer")
//         .style("font-size", "16px")
//         .style("color", "#999")
//         .on("click", function () {
//           d3.select(this.parentNode).remove();
//           highlightCountyByFips(fips, false);
//         })
//         .on("mouseover", function () {
//           d3.select(this).style("color", "#e74c3c");
//         })
//         .on("mouseout", function () {
//           d3.select(this).style("color", "#999");
//         });

//       const stateCards = statesContainer.selectAll(".state-card").nodes();
//       if (stateCards.length > 6) {
//         stateCards[0].remove();
//       }
//     })
//     .catch((error) => {
//       console.error("Error al cargar datos del condado:", error);
//     });
// }

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  loadGeoJSON();
  // handleFeatureClick2(); // Eliminar o comentar para que no imprima la lista de tendencias al inicio
  setupMonthSlider();
  // Inicializar week-buttons con semana 1 seleccionada
  if (document.getElementById("week-buttons")) {
    createWeekButtons(1);
    highlightWeeksOfSelectedMonth();
  }

  const style = document.createElement("style");
  style.textContent = `
    .compact-container {
      padding: 5px;
    }
    .state-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .state-row:hover {
      background-color: #f5f5f5;
    }
    .state-name {
      color: #2c3e50;
      font-size: 14px;
    }
    .cases-container, .deaths-container {
      height: 50px;
    }
    #controls {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    #month-slider {
      width: 60%;
      margin: 0 15px;
    }
    #month-display {
      font-weight: bold;
      color: #2c3e50;
    }
    #empty-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 15px;
      overflow-y: auto;
    }
    .states-container {
      width: 100%;
      overflow-x: auto;
      white-space: nowrap;
    }
    .state-card {
      display: inline-block;
      vertical-align: top;
      margin-right: 15px;
      transition: transform 0.2s;
    }
    .state-card:hover {
      transform: translateY(-3px);
    }
    .state-card h4 {
      white-space: normal;
      word-break: break-word;
    }
    #flow-diagram-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
      margin-top: 20px;
    }
    #week-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      margin-bottom: 20px;
    }
    #week-slider {
      width: 300px;
    }
    #flow-viz {
      width: 100%;
      overflow: auto;
    }
    #flow-viz svg {
      display: block;
      margin: 0 auto;
    }
    .fips-node {
      fill: #ffffff;
      stroke: #333333;
      stroke-width: 2px;
    }
    .percent-node {
      fill: #e0e0e0;
      stroke: #444444;
      stroke-width: 2px;
    }
    .link-in {
      fill: none;
      stroke: #1f77b4;
    }
    .link-out {
      fill: none;
      stroke: #ff7f0e;
    }
    .label {
      font-size: 14px;
      text-anchor: middle;
      font-family: Arial, sans-serif;
    }
    .error-message {
      font-size: 16px;
      text-anchor: middle;
      fill: red;
    }
    #loading-message {
      font-size: 16px;
      color: #555;
      text-align: center;
      padding: 20px;
    }
  `;
  document.head.appendChild(style);
});

// Nueva función para crear los botones de semana globalmente
function createWeekButtons(selectedWeek) {
  const weekButtonsContainer = document.getElementById("week-buttons");
  weekButtonsContainer.innerHTML = "";
  for (let i = 1; i <= 52; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "week-btn" + (i === selectedWeek ? " selected" : "");
    btn.setAttribute("data-week", i);
    btn.style.margin = "0 2px";
    btn.style.padding = "4px 0";
    btn.style.minWidth = "28px";
    btn.style.fontSize = "0.95rem";
    btn.style.borderRadius = "5px";
    btn.style.border = "1px solid #ccc";
    btn.style.background = i === selectedWeek ? "#2c3e50" : "#f8f9fa";
    btn.style.color = i === selectedWeek ? "#fff" : "#2c3e50";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", function () {
      weekButtonsContainer.querySelectorAll(".week-btn").forEach((b) => {
        b.classList.remove("selected");
        b.style.background = "#f8f9fa";
        b.style.color = "#2c3e50";
      });
      btn.classList.add("selected");
      btn.style.background = "#2c3e50";
      btn.style.color = "#fff";
      filterByWeek(i); // Llamar a filterByWeek
      window.lastFlowWeek = i;
      if (window.lastFlowFips) {
        loadFlowDiagram(window.lastFlowFips, i);
      }
      if (window.highlightRadialWeek) window.highlightRadialWeek(i);
    });
    weekButtonsContainer.appendChild(btn);
  }
}

// Modificar loadFlowDiagram para usar createWeekButtons
function loadFlowDiagram(fips, week) {
  const container = d3.select("#flow-diagram-container");
  container.html(""); // Limpiar contenedor
  container.html(`
    <div id="flow-viz"><div id="loading-message" style="text-align: center;">Cargando...</div></div>
  `);
  createWeekButtons(week);
  highlightWeeksOfSelectedMonth();
  updateFlowDiagramSVG(fips, week);
}

// Nueva función para eliminar el panel de estado seleccionado
function removeCountyPanel(fips) {
  const container = d3.select("#empty-container");
  const stateDiv = container.select(`.state-${fips}`);
  if (!stateDiv.empty()) {
    stateDiv.remove();
  }
}

// Modificar printTrendForState para soportar una matriz 2x2 FIFO en #empty-container
function printTrendForState(fips) {
  const container = d3.select("#empty-container");
  // Mantener un array global para el orden de los FIPS mostrados
  if (!window.trendFifo) window.trendFifo = [];
  // Si ya está, lo movemos al final (más reciente)
  window.trendFifo = window.trendFifo.filter((x) => x !== fips);
  window.trendFifo.push(fips);
  // Si hay más de 4, quitamos el más antiguo
  if (window.trendFifo.length > 4) window.trendFifo.shift();
  // Limpiar y crear la cuadrícula
  container.html("");
  const grid = container
    .append("div")
    .attr("class", "trend-grid")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr")
    .style("grid-template-rows", "1fr 1fr")
    .style("gap", "4px")
    .style("width", "100%")
    .style("height", "100%")
    .style("padding", "0");
  window.trendFifo.forEach((fipsItem) => {
    const trendBox = grid
      .append("div")
      .attr("class", "trend-box")
      .style("background", "white")
      .style("border-radius", "8px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("padding", "0")
      .style("margin", "0")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("height", "100%")
      .style("width", "100%")
      .style("cursor", "pointer")
      .on("click", function () {
        window.lastFlowFips = fipsItem;
        createRadialChart(
          "radial-chart-container",
          "radial-tooltip",
          parseInt(fipsItem)
        );
        loadFlowDiagram(fipsItem, window.lastFlowWeek || 1);
      });
    fetch("http://localhost:5050/get_name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fips: fipsItem }),
    })
      .then((response) => response.json())
      .then((name) => {
        const stateName =
          name ||
          FIPS_TO_STATE[fipsItem.padStart(2, "0")] ||
          `Estado ${fipsItem}`;
        fetchCountyData(fipsItem)
          .then((data) => {
            if (data.error) {
              console.error(data.error);
              return;
            }
            const casesData = transformDataForChart(data.new_cases_category);
            const deathsData = transformDataForChart(data.new_deaths_category);
            trendBox
              .append("div")
              .attr("class", "state-name")
              .style("font-weight", "bold")
              .style("margin-bottom", "2px")
              .style("font-size", "13px")
              .text(stateName);
            trendBox.append("div").attr("class", "cases-container");
            drawCompactBars(
              trendBox.select(".cases-container"),
              casesData,
              "cases"
            );
            trendBox
              .append("div")
              .attr("class", "deaths-container")
              .style("margin-top", "2px");
            drawCompactBars(
              trendBox.select(".deaths-container"),
              deathsData,
              "deaths"
            );
          })
          .catch(handleFetchError);
      })
      .catch(handleFetchError);
  });
}

// En el evento click del mapa, después de crear el radar y el diagrama, llama a printTrendForState(fips);

// Streamgraph de movilidad neta y casos de contagio
async function renderStreamgraph(fips) {
  // Asegura que el contenedor exista
  let container = d3.select("#streamgraph-container");
  if (container.empty()) {
    d3.select("body").append("div").attr("id", "streamgraph-container");
    container = d3.select("#streamgraph-container");
  }
  container.html("");
  if (!fips) return;
  // Obtén datos de casos
  const casesResp = await fetch("http://localhost:5050/get_covid_week_fips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fips: parseInt(fips) }),
  });
  const casesData = await casesResp.json();
  // Prepara array de semanas
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  // Obtén datos de movilidad neta por semana
  const mobilityData = await Promise.all(
    weeks.map(async (week) => {
      const resp = await fetch(
        `http://localhost:5050/api/flujos/${fips}/${week}`
      );
      const data = await resp.json();
      // Suma entradas y salidas
      const entradas = (data.flujos_in || []).reduce(
        (sum, d) => sum + (d.Cantidad || 0),
        0
      );
      const salidas = (data.flujos_out || []).reduce(
        (sum, d) => sum + (d.Cantidad || 0),
        0
      );
      return { week, neta: entradas - salidas };
    })
  );
  // Unir datos por semana
  const streamData = weeks.map((week) => {
    const casos =
      casesData.find((d) => parseInt(d.Week) === week)?.New_Cases_Normalized ||
      0;
    const neta = mobilityData[week - 1]?.neta || 0;
    return { week, casos, neta };
  });
  // Prepara datos para streamgraph
  const stackData = streamData.map((d) => ({
    week: d.week,
    "Movilidad neta": d.neta,
    Casos: d.casos,
  }));
  const keys = ["Movilidad neta", "Casos"];
  // Dimensiones
  const width = 340,
    height = 180,
    margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  // Escalas
  const x = d3
    .scaleLinear()
    .domain([1, 52])
    .range([0, width - margin.left - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([
      d3.min(stackData, (d) => Math.min(d["Movilidad neta"], d["Casos"])),
      d3.max(stackData, (d) => Math.max(d["Movilidad neta"], d["Casos"])),
    ])
    .nice()
    .range([height - margin.bottom, 0]);
  const color = d3.scaleOrdinal().domain(keys).range(["#8E44AD", "#F4D03F"]);
  // Stack
  const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle);
  const series = stack(stackData);
  // Area generator
  const area = d3
    .area()
    .x((d, i) => x(stackData[i].week))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveCatmullRom);
  // Dibuja las capas
  svg
    .selectAll("path.stream")
    .data(series)
    .enter()
    .append("path")
    .attr("class", "stream")
    .attr("d", area)
    .attr("fill", (d) => color(d.key))
    .attr("opacity", 0.85);
  // Eje X
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(12)
        .tickFormat((d) => `S${d}`)
    );
  // Eje Y
  svg.append("g").call(d3.axisLeft(y).ticks(5));
  // Leyenda
  const legend = container
    .append("div")
    .style("display", "flex")
    .style("gap", "18px")
    .style("justify-content", "center")
    .style("margin-top", "6px");
  keys.forEach((k) => {
    legend
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .html(
        `<span style="display:inline-block;width:16px;height:16px;background:${color(
          k
        )};margin-right:4px;"></span><span style="font-size:13px;">${k}</span>`
      );
  });
}
// Llama a renderStreamgraph(fips) al seleccionar un estado

// Gráfico de líneas doble para casos y movilidad neta
async function renderDoubleLineChart(fips) {
  let container = d3.select("#streamgraph-container");
  if (container.empty()) {
    d3.select("body").append("div").attr("id", "streamgraph-container");
    container = d3.select("#streamgraph-container");
  }
  container.html("");
  if (!fips) return;
  // Obtén datos de casos
  const casesResp = await fetch("http://localhost:5050/get_covid_week_fips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fips: parseInt(fips) }),
  });
  const casesData = await casesResp.json();
  // Prepara array de semanas
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  // Obtén datos de movilidad neta normalizada por semana
  const netMobilityData = await Promise.all(
    weeks.map(async (week) => {
      const resp = await fetch(
        `http://localhost:5050/api/flujos/${fips}/${week}`
      );
      const data = await resp.json();
      // Suma porcentajes de entrada y salida
      const inflowPercent = (data.flujos_in || []).reduce(
        (sum, d) => sum + (d.Porcentaje || 0),
        0
      );
      const outflowPercent = (data.flujos_out || []).reduce(
        (sum, d) => sum + (d.Porcentaje || 0),
        0
      );
      const netaPercent = outflowPercent - inflowPercent;
      return { week, netaPercent };
    })
  );
  // Unir datos por semana
  const lineData = weeks.map((week) => {
    const casos =
      casesData.find((d) => parseInt(d.Week) === week)?.New_Cases_Normalized ||
      0;
    const netaPercent = netMobilityData[week - 1]?.netaPercent || 0;
    return { week, casos, netaPercent };
  });
  // Dimensiones
  const width = 400,
    height = 220,
    margin = { top: 30, right: 50, bottom: 40, left: 50 };
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  // Escalas
  const x = d3
    .scaleLinear()
    .domain([1, 52])
    .range([margin.left, width - margin.right]);
  const yLeft = d3
    .scaleLinear()
    .domain([0, d3.max(lineData, (d) => d.casos) * 1.1])
    .nice()
    .range([height - margin.bottom, margin.top]);
  const yRight = d3
    .scaleLinear()
    .domain([
      d3.min(lineData, (d) => d.netaPercent) * 1.1,
      d3.max(lineData, (d) => d.netaPercent) * 1.1,
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);
  // Ejes
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(12)
        .tickFormat((d) => `S${d}`)
    );
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yLeft).ticks(6))
    .append("text")
    .attr("fill", "#8E44AD")
    .attr("x", -30)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "start")
    .attr("font-size", "13px")
    .text("Casos");
  svg
    .append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(
      d3
        .axisRight(yRight)
        .ticks(6)
        .tickFormat((d) => (d * 100).toFixed(2) + "%")
    )
    .append("text")
    .attr("fill", "#F4D03F")
    .attr("x", 30)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "end")
    .attr("font-size", "13px")
    .text("Movilidad neta (% población)");
  // Línea de casos
  svg
    .append("path")
    .datum(lineData)
    .attr("fill", "none")
    .attr("stroke", "#8E44AD")
    .attr("stroke-width", 2.5)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.week))
        .y((d) => yLeft(d.casos))
        .curve(d3.curveMonotoneX)
    );
  // Línea de movilidad neta normalizada
  svg
    .append("path")
    .datum(lineData)
    .attr("fill", "none")
    .attr("stroke", "#F4D03F")
    .attr("stroke-width", 2.5)
    .attr("stroke-dasharray", "5,3")
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.week))
        .y((d) => yRight(d.netaPercent))
        .curve(d3.curveMonotoneX)
    );
  // Leyenda
  const legend = container
    .append("div")
    .style("display", "flex")
    .style("gap", "18px")
    .style("justify-content", "center")
    .style("margin-top", "6px");
  legend
    .append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .html(
      `<span style=\"display:inline-block;width:16px;height:3px;background:#8E44AD;margin-right:4px;\"></span><span style=\"font-size:13px;\">Casos</span>`
    );
  legend
    .append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .html(
      `<span style=\"display:inline-block;width:16px;height:3px;background:#F4D03F;margin-right:4px;border-bottom:2px dashed #F4D03F;\"></span><span style=\"font-size:13px;\">Movilidad neta (% población)</span>`
    );
}
// Llama a drawTestCircle() al seleccionar un estado para probar el renderizado
