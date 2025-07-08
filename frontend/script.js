// Configuración inicial del mapa
const map = L.map("map").setView([37.0902, -95.7129], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// Variables globales
let geojsonLayer;
const createdCharts = new Set();
const FIPS_deseados = [5, 9, 19, 20, 28, 32, 40, 41, 49];
const weekMonthMap = createWeekMonthMap(2021); // Mapa de semanas a meses para 2021

// Función para cargar el GeoJSON
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
              resetHighlight(e);
              const fips = String(e.target.feature.properties.id).padStart(
                2,
                "0"
              );
              showCountyData(fips);
            },
          });
        },
      }).addTo(map);
    })
    .catch(handleFetchError);
}

// Función para crear el gráfico de barras apiladas
function createStackedBarChart(data) {
  d3.select("#stacked-chart").remove();

  const container = d3
    .select("#charts-panel")
    .append("div")
    .attr("id", "stacked-chart")
    .style("margin-top", "30px")
    .style("padding", "20px")
    .style("background", "white")
    .style("border-radius", "8px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

  container
    .append("h3")
    .text("Indicadores por Población (Apilados)")
    .style("text-align", "center")
    .style("margin-bottom", "20px")
    .style("color", "#333");

  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = 500 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const indicators = [
    {
      key: "Susceptible_por_Population",
      name: "Susceptibles",
      color: "#839192 ",
    },
    { key: "New_case_por_Population", name: "Nuevos Casos", color: "#5499C7" },
    {
      key: "New_death_por_Population",
      name: "Nuevas Muertes",
      color: "#E74C3C",
    },
  ];

  data.sort((a, b) => a.FIPS - b.FIPS);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.FIPS))
    .rangeRound([0, width])
    .padding(0.2);

  const y = d3.scaleLinear().domain([0, 1.0]).rangeRound([height, 0]);

  const stack = d3
    .stack()
    .keys(indicators.map((d) => d.key))
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const stackedData = stack(data);

  const stateGroups = svg
    .selectAll(".state-group")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("class", "state-group")
    .attr("fill", (d) => indicators.find((ind) => ind.key === d.key).color);

  stateGroups
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.data.FIPS))
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .attr("rx", 3)
    .attr("ry", 3)
    .on("mouseover", function (event, d) {
      highlightCountyByFips(d.data.FIPS, true);
      const indicator = indicators.find(
        (ind) => ind.key === event.target.parentNode.__data__.key
      );
      const percentage = (d[1] - d[0]).toFixed(4) * 100;

      d3.select(this)
        .attr("opacity", 0.8)
        .attr("stroke", "#333")
        .attr("stroke-width", 2);

      svg
        .append("text")
        .attr("class", "temp-tooltip")
        .attr("x", x(d.data.FIPS) + x.bandwidth() / 2)
        .attr("y", y(d[1]) - 5)
        .attr("text-anchor", "middle")
        .text(`${indicator.name}: ${percentage.toFixed(2)}%`);
    })
    .on("mouseout", function (event, d) {
      highlightCountyByFips(d.data.FIPS, false);
      d3.select(this).attr("opacity", 1).attr("stroke", "none");
      svg.selectAll(".temp-tooltip").remove();
    });

  svg
    .append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  svg
    .append("g")
    .attr("class", "axis axis--y")
    .call(
      d3
        .axisLeft(y)
        .ticks(5)
        .tickFormat((d) => (d * 100).toFixed(0) + "%")
    )
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .text("Porcentaje de la Población");

  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${width / 2 - 100}, ${height + margin.bottom - 30})`
    );

  let cumulativeWidth = 0;
  indicators.forEach((indicator, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(${cumulativeWidth}, 0)`);

    legendItem
      .append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", indicator.color);

    legendItem
      .append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .text(indicator.name);

    cumulativeWidth += legendItem.node().getBBox().width + 20;
  });
}

// Función principal para crear los gráficos compactos
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
                showCountyData(fips);
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

  fetch("http://127.0.0.1:5050/get_porPer")
    .then((response) => response.json())
    .then((data) => {
      createStackedBarChart(data);
    })
    .catch((error) => {
      console.error("Error al cargar datos para el gráfico apilado:", error);
    });
}

// Función para dibujar los cubitos compactos
function drawCompactBars(container, data, type) {
  const width = 300;
  const height = 40;
  const itemSize = 6;
  const spacing = 8;
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

// Función para crear el mapeo de semanas a meses
function createWeekMonthMap(year) {
  const weekMonthMap = [];
  const startDate = new Date(year, 0, 4); // Primer lunes de 2021

  for (let week = 1; week <= 52; week++) {
    const month = startDate.getMonth() + 1;
    weekMonthMap.push({ week, month });
    startDate.setDate(startDate.getDate() + 7); // Siguiente semana
  }

  return weekMonthMap;
}

// Función para filtrar los cubitos por mes
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

// Configuración del slider de meses
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

  const slider = document.getElementById("month-slider");
  const monthDisplay = document.getElementById("month-display");

  slider.addEventListener("input", function () {
    const monthValue = parseInt(this.value);
    monthDisplay.textContent = monthNames[monthValue];
    filterByMonth(monthValue);
  });
}

// Funciones auxiliares
function getColor(level, type) {
  const colors = {
    cases: { 1: "#512E5F", 2: "#8E44AD  ", 3: "#2471A3  ", 4: "#85C1E9  " },
    deaths: { 1: "#F4D03F", 2: "#E67E22  ", 3: "#CB4335", 4: "#641E16" },
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

// Función para mostrar datos del condado (solo al hacer click)
function showCountyData(fips) {
  fetch("http://localhost:5050/get_geojson_fip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fips: parseInt(fips) }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data || !data.features || data.features.length === 0) {
        console.error("No se encontraron datos para este FIPS:", fips);
        return;
      }

      const feature = data.features[0];
      const properties = feature.properties;

      if (!properties || !properties.name || !properties.id) {
        console.error("Faltan propiedades en los datos del condado:", feature);
        return;
      }

      // Obtener el contenedor
      const container = d3.select("#empty-container");

      // Verificar si ya existe un contenedor de estados
      if (!container.select(".states-container").node()) {
        container.html(""); // Limpiar el contenedor
        container
          .append("div")
          .attr("class", "states-container")
          .style("display", "flex")
          .style("flex-wrap", "nowrap") // Cambiado a nowrap para que no se apilen
          .style("gap", "20px")
          .style("overflow-x", "auto") // Para permitir desplazamiento horizontal
          .style("padding", "10px");
      }

      const statesContainer = container.select(".states-container");

      // Verificar si este estado ya está mostrado
      const existingState = statesContainer.select(`.state-${fips}`).node();
      if (existingState) {
        // Si ya existe, lo movemos al frente
        existingState.parentNode.appendChild(existingState);
        return;
      }

      // Crear un nuevo contenedor para este estado
      const stateDiv = statesContainer
        .append("div")
        .attr("class", `state-${fips} state-card`)
        .style("background", "white")
        .style("border-radius", "8px")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
        .style("padding", "15px")
        .style("flex", "0 0 auto") // Para que no se estiren
        .style("position", "relative");

      // Agregar título con el nombre del condado
      /*
      stateDiv
        .append("h4")
        .text(properties.name)
        .style("text-align", "center")
        .style("color", "#333")
        .style("margin-bottom", "10px")
        .style("font-size", "16px");
      */
      // Crear el gráfico SVG
      const width = 120;
      const height = 120;

      const svg = stateDiv
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      const projection = d3
        .geoAlbersUsa()
        .fitSize([width, height], feature.geometry);
      const path = d3.geoPath().projection(projection);

      svg
        .append("g")
        .selectAll("path")
        .data([feature])
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#2980B9")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

      // Agregar información adicional
      //stateDiv.append("div").style("margin-top", "10px");
      /*
        .style("font-size", "12px").html(`
          <p><strong>FIPS:</strong> ${properties.id}</p>
          <p><strong>Población:</strong> ${properties.population || "N/A"}</p>
        `)
        */

      // Botón para eliminar este estado
      stateDiv
        .append("button")
        .text("×")
        .style("position", "absolute")
        .style("top", "5px")
        .style("right", "5px")
        .style("background", "none")
        .style("border", "none")
        .style("cursor", "pointer")
        .style("font-size", "16px")
        .style("color", "#999")
        .on("click", function () {
          d3.select(this.parentNode).remove();
          highlightCountyByFips(fips, false);
        })
        .on("mouseover", function () {
          d3.select(this).style("color", "#e74c3c");
        })
        .on("mouseout", function () {
          d3.select(this).style("color", "#999");
        });

      // Limitar a 6 estados mostrados (elimina el más antiguo si hay más)
      const stateCards = statesContainer.selectAll(".state-card").nodes();
      if (stateCards.length > 6) {
        stateCards[0].remove();
      }
    })
    .catch((error) => {
      console.error("Error al cargar datos del condado:", error);
    });
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  loadGeoJSON();
  handleFeatureClick2();
  setupMonthSlider();

  // Añadir estilos CSS dinámicos
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
  `;
  document.head.appendChild(style);
});
