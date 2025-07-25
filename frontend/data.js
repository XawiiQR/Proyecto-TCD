// Datos de ejemplo: puedes reemplazar estos datos con los de tu archivo JSON o base de datos
const covidData = [
  { month: 1, New_Cases: 1500, New_Deaths: 30 },
  { month: 2, New_Cases: 2000, New_Deaths: 50 },
  { month: 3, New_Cases: 1800, New_Deaths: 40 },
  { month: 4, New_Cases: 2200, New_Deaths: 60 },
  { month: 5, New_Cases: 3000, New_Deaths: 80 },
  { month: 6, New_Cases: 3500, New_Deaths: 90 },
  { month: 7, New_Cases: 4000, New_Deaths: 120 },
  { month: 8, New_Cases: 4500, New_Deaths: 150 },
  { month: 9, New_Cases: 5000, New_Deaths: 200 },
  { month: 10, New_Cases: 5500, New_Deaths: 220 },
  { month: 11, New_Cases: 6000, New_Deaths: 250 },
  { month: 12, New_Cases: 6500, New_Deaths: 300 },
];

// Selección del contenedor para el gráfico
const svg = d3.select("#covid-chart svg");

// Escala para el eje Y (para los valores de casos y muertes)
const yScale = d3.scaleLinear().domain([0, 7000]).range([400, 0]);

// Escala para el eje X (meses)
const xScale = d3
  .scaleBand()
  .domain(covidData.map((d) => d.month))
  .range([0, 600])
  .padding(0.1);

// Función para actualizar el gráfico según el mes seleccionado
function updateFlowDiagram(fips, week) {
  const container = d3.select("#flow-diagram-container");
  container.html("");

  // Título claro y descriptivo
  container
    .append("h2")
    .style("text-align", "center")
    .style("margin", "10px 0")
    .style("color", "#2c3e50")
    .html(
      `<strong>TOP 5 FLUJOS DE MOVILIDAD</strong><br>${
        stateNames[fips] || `Estado ${fips}`
      } - Semana ${week}`
    );

  // Contenedor principal con diseño flexible
  const mainContent = container
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  // Controles simplificados
  const controls = mainContent.append("div").style("margin", "10px 0 20px");

  controls
    .append("label")
    .text("Seleccionar semana: ")
    .style("margin-right", "10px");

  controls
    .append("input")
    .attr("type", "range")
    .attr("min", "1")
    .attr("max", "52")
    .attr("value", week)
    .style("width", "300px")
    .style("cursor", "pointer")
    .on("input", function () {
      updateFlowDiagram(fips, +this.value);
    });

  // Contenedor SVG más grande y con fondo claro
  const svg = mainContent
    .append("svg")
    .attr("width", "900")
    .attr("height", "600")
    .style("background", "#f8f9fa")
    .style("border-radius", "8px")
    .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)");

  // Tooltip mejorado
  const tooltip = container
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("border-radius", "6px")
    .style("padding", "12px")
    .style("box-shadow", "0 3px 14px rgba(0,0,0,0.15)")
    .style("font-family", "Arial, sans-serif")
    .style("pointer-events", "none")
    .style("z-index", "100");

  // Cargar datos
  fetch(`http://localhost:5050/api/flujos/${fips}/${week}`)
    .then((response) => {
      if (!response.ok) throw new Error("Error en la respuesta");
      return response.json();
    })
    .then((data) => {
      // Procesar datos para top 5
      const processFlows = (flows, isIncoming) => {
        return flows
          .map((flow) => ({
            ...flow,
            state: isIncoming ? flow.FIPS_O : flow.FIPS_D,
            name:
              stateNames[isIncoming ? flow.FIPS_O : flow.FIPS_D] ||
              `Estado ${isIncoming ? flow.FIPS_O : flow.FIPS_D}`,
            type: isIncoming ? "in" : "out",
          }))
          .sort((a, b) => b.Pop_flows - a.Pop_flows)
          .slice(0, 5)
          .map((flow, index) => ({
            ...flow,
            rank: index + 1,
          }));
      };

      const topIn = processFlows(data.flujos_in, true);
      const topOut = processFlows(data.flujos_out, false);

      // Configuración de visualización
      const centerX = 450;
      const centerY = 300;
      const nodeRadius = 24;
      const centerRadius = 32;
      const leftX = 150;
      const rightX = 750;
      const verticalSpacing = 100;

      // Escalas
      const maxFlow = Math.max(
        ...topIn.map((d) => d.Pop_flows),
        ...topOut.map((d) => d.Pop_flows)
      );

      const flowScale = d3.scaleLinear().domain([0, maxFlow]).range([3, 20]);

      // Dibujar flujos entrantes (izquierda)
      topIn.forEach((flow, i) => {
        const y = 150 + i * verticalSpacing;

        // Línea de flujo
        svg
          .append("path")
          .attr("class", "flow-line")
          .attr("stroke", "#3498db")
          .attr("stroke-width", flowScale(flow.Pop_flows))
          .attr("stroke-opacity", 0.8)
          .attr("fill", "none")
          .attr(
            "d",
            `M${leftX},${y} Q${centerX - 100},${y} ${
              centerX - centerRadius
            },${centerY}`
          )
          .on("mouseover", (event) => {
            tooltip
              .style("visibility", "visible")
              .html(
                `
                <div style="color:#3498db; font-weight:bold; margin-bottom:8px">
                  #${flow.rank} Flujo Entrante
                </div>
                <div style="margin-bottom:6px">
                  <strong>${flow.name} → ${
                  stateNames[fips] || `Estado ${fips}`
                }</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px">
                  <span>Personas:</span>
                  <span><strong>${flow.Pop_flows.toLocaleString()}</strong></span>
                </div>
                <div style="display:flex; justify-content:space-between">
                  <span>Porcentaje:</span>
                  <span><strong>${flow.Porcentaje.toFixed(2)}%</strong></span>
                </div>
              `
              )
              .style("left", `${event.pageX + 15}px`)
              .style("top", `${event.pageY + 15}px`);
          })
          .on("mouseout", () => tooltip.style("visibility", "hidden"));

        // Nodo origen
        svg
          .append("circle")
          .attr("cx", leftX)
          .attr("cy", y)
          .attr("r", nodeRadius)
          .attr("fill", "#3498db")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .on("mouseover", function () {
            d3.select(this).attr("r", nodeRadius + 4);
          })
          .on("mouseout", function () {
            d3.select(this).attr("r", nodeRadius);
          });

        // Número de ranking
        svg
          .append("text")
          .attr("x", leftX)
          .attr("y", y + 5)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .attr("font-weight", "bold")
          .text(flow.rank);

        // Nombre del estado
        svg
          .append("text")
          .attr("x", leftX)
          .attr("y", y - nodeRadius - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", "13px")
          .attr("font-weight", "bold")
          .text(flow.name);
      });

      // Dibujar flujos salientes (derecha)
      topOut.forEach((flow, i) => {
        const y = 150 + i * verticalSpacing;

        // Línea de flujo
        svg
          .append("path")
          .attr("class", "flow-line")
          .attr("stroke", "#2ecc71")
          .attr("stroke-width", flowScale(flow.Pop_flows))
          .attr("stroke-opacity", 0.8)
          .attr("fill", "none")
          .attr(
            "d",
            `M${centerX + centerRadius},${centerY} Q${
              centerX + 100
            },${y} ${rightX},${y}`
          )
          .on("mouseover", (event) => {
            tooltip
              .style("visibility", "visible")
              .html(
                `
                <div style="color:#2ecc71; font-weight:bold; margin-bottom:8px">
                  #${flow.rank} Flujo Saliente
                </div>
                <div style="margin-bottom:6px">
                  <strong>${stateNames[fips] || `Estado ${fips}`} → ${
                  flow.name
                }</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px">
                  <span>Personas:</span>
                  <span><strong>${flow.Pop_flows.toLocaleString()}</strong></span>
                </div>
                <div style="display:flex; justify-content:space-between">
                  <span>Porcentaje:</span>
                  <span><strong>${flow.Porcentaje.toFixed(2)}%</strong></span>
                </div>
              `
              )
              .style("left", `${event.pageX + 15}px`)
              .style("top", `${event.pageY + 15}px`);
          })
          .on("mouseout", () => tooltip.style("visibility", "hidden"));

        // Nodo destino
        svg
          .append("circle")
          .attr("cx", rightX)
          .attr("cy", y)
          .attr("r", nodeRadius)
          .attr("fill", "#2ecc71")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .on("mouseover", function () {
            d3.select(this).attr("r", nodeRadius + 4);
          })
          .on("mouseout", function () {
            d3.select(this).attr("r", nodeRadius);
          });

        // Número de ranking
        svg
          .append("text")
          .attr("x", rightX)
          .attr("y", y + 5)
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .attr("font-weight", "bold")
          .text(flow.rank);

        // Nombre del estado
        svg
          .append("text")
          .attr("x", rightX)
          .attr("y", y - nodeRadius - 10)
          .attr("text-anchor", "middle")
          .attr("font-size", "13px")
          .attr("font-weight", "bold")
          .text(flow.name);
      });

      // Nodo central (estado seleccionado)
      svg
        .append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", centerRadius)
        .attr("fill", "#e67e22")
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .on("mouseover", function () {
          d3.select(this).attr("r", centerRadius + 5);
          tooltip
            .style("visibility", "visible")
            .html(
              `
              <div style="color:#e67e22; font-weight:bold; margin-bottom:8px">
                Estado Seleccionado
              </div>
              <div style="margin-bottom:6px">
                <strong>${stateNames[fips] || `Estado ${fips}`}</strong>
              </div>
              <div style="display:flex; justify-content:space-between">
                <span>Población:</span>
                <span><strong>${data.poblacion.toLocaleString()}</strong></span>
              </div>
            `
            )
            .style("left", `${d3.event.pageX + 15}px`)
            .style("top", `${d3.event.pageY + 15}px`);
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", centerRadius);
          tooltip.style("visibility", "hidden");
        });

      // Nombre del estado central
      svg
        .append("text")
        .attr("x", centerX)
        .attr("y", centerY - centerRadius - 15)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "#e67e22")
        .text(stateNames[fips] || `Estado ${fips}`);

      // Leyenda mejorada
      const legend = svg.append("g").attr("transform", "translate(50, 550)");

      // Flujos entrantes
      legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 8)
        .attr("fill", "#3498db");

      legend
        .append("text")
        .attr("x", 15)
        .attr("y", 5)
        .attr("font-size", "14px")
        .text("Top 5 Flujos Entrantes");

      // Flujos salientes
      legend
        .append("circle")
        .attr("cx", 200)
        .attr("cy", 0)
        .attr("r", 8)
        .attr("fill", "#2ecc71");

      legend
        .append("text")
        .attr("x", 15)
        .attr("y", 5)
        .attr("transform", "translate(200, 0)")
        .attr("font-size", "14px")
        .text("Top 5 Flujos Salientes");

      // Estado central
      legend
        .append("circle")
        .attr("cx", 400)
        .attr("cy", 0)
        .attr("r", 10)
        .attr("fill", "#e67e22");

      legend
        .append("text")
        .attr("x", 15)
        .attr("y", 5)
        .attr("transform", "translate(400, 0)")
        .attr("font-size", "14px")
        .text("Estado Central");
    })
    .catch((error) => {
      console.error("Error al cargar datos:", error);
      container
        .append("div")
        .style("text-align", "center")
        .style("padding", "20px")
        .style("color", "#e74c3c").html(`
          <h3>Error al cargar los datos</h3>
          <p>No se pudieron cargar los flujos de movilidad</p>
          <button onclick="updateFlowDiagram(${fips}, ${week})" 
            style="background:#3498db; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer">
            Reintentar
          </button>
        `);
    });
}

// Control deslizante para seleccionar el mes
const slider = document.getElementById("month-slider");
const monthDisplay = document.getElementById("month-display");

// Mostrar mes seleccionado
slider.oninput = function () {
  let selectedMonth = parseInt(slider.value);
  monthDisplay.innerText = selectedMonth
    ? `Mes ${selectedMonth}`
    : "Todos los meses";

  // Actualizar el gráfico
  updateChart(selectedMonth);
};
