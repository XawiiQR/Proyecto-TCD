// radialChart.js

// Variable para almacenar la instancia actual del gráfico
var currentChart = null;

// Función para limpiar el gráfico anterior
function cleanupChart() {
  if (currentChart) {
    d3.select("#radial-chart-container").html("");
    d3.select("#radial-tooltip")
      .classed("fixed-tooltip", false)
      .style("opacity", 0);
  }
}

// Configuración del gráfico radial (versión original con solo la mejora de actualización)
function createRadialChart(containerId, tooltipId, fipsCode) {
  // Limpiar el gráfico anterior si existe
  cleanupChart();

  // set the dimensions and margins of the graph
  var margin = { top: 24, right: 0, bottom: 0, left: 0 },
    width = 220 - margin.left - margin.right,
    height = 220 - margin.top - margin.bottom,
    innerRadius = 36,
    outerRadius = Math.min(width, height) / 2;

  // Color schemes (MANTENIENDO TUS COLORES ORIGINALES)
  var colorSchemes = {
    cases: {
      1: "#85C1E9",
      2: "#2471A3",
      3: "#8E44AD",
      4: "#512E5F",
      5: "#2E1B47",
    },
    deaths: {
      1: "#F4D03F",
      2: "#E67E22",
      3: "#CB4335",
      4: "#641E16",
      5: "#4A0E0E",
    },
  };

  // Function to determine color based on value (ROBUSTA PARA 5 NIVELES)
  function getColor(value, type) {
    if (!value || isNaN(value)) return colorSchemes[type][1]; // Usar nivel 1 en lugar de gris
    if (value <= 0.2) return colorSchemes[type][1];
    if (value <= 0.4) return colorSchemes[type][2];
    if (value <= 0.6) return colorSchemes[type][3];
    if (value <= 0.8) return colorSchemes[type][4];
    return colorSchemes[type][5];
  }

  // append the svg object (ORIGINAL)
  var svg = d3
    .select("#" + containerId)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr(
      "transform",
      "translate(" +
        (width / 2 + margin.left) +
        "," +
        (height / 2 + margin.top) +
        ")"
    );

  // Guardar la instancia actual
  currentChart = {
    svg: svg,
    containerId: containerId,
    tooltipId: tooltipId,
  };

  // Fetch data from API (ORIGINAL)
  function fetchData() {
    return fetch(`http://localhost:5050/get_covid_week_fips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fips: fipsCode }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }

  // Process the data and create the chart (ORIGINAL CON COLORES BELLOS)
  function processData(data) {
    // Clear previous chart if any
    svg.selectAll("*").remove();

    // Asegurar que cada dato tenga d.Month
    data.forEach(function (d) {
      if (!("Month" in d)) {
        // Si no existe, calcularlo a partir de la semana (asume weekMonthMap global)
        if (window.weekMonthMap) {
          const info = window.weekMonthMap[d.Week - 1];
          d.Month = info ? info.month : 0;
        }
      }
    });

    // X scale
    var x = d3
      .scaleBand()
      .range([0, 2 * Math.PI])
      .align(0)
      .domain(
        data.map(function (d) {
          return d.Week;
        })
      );

    // Y scale for New_Cases_Normalized
    var y = d3.scaleRadial().range([innerRadius, outerRadius]).domain([0, 1]);

    // Y scale for New_Deaths_Normalized
    var ybis = d3.scaleRadial().range([innerRadius, 5]).domain([0, 1]);

    // Add prominent reference circles (black)
    var referenceValues = [0.2, 0.4, 0.6, 0.8, 1];
    var referenceCircles = svg.append("g").attr("class", "reference-circles");

    referenceCircles
      .selectAll("circle")
      .data(referenceValues)
      .enter()
      .append("circle")
      .attr("r", function (d) {
        return y(d);
      })
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", "1px")
      .attr("stroke-dasharray", "3,2")
      .attr("opacity", "0.7");

    // Add reference labels
    referenceCircles
      .selectAll(".refLabel")
      .data(referenceValues)
      .enter()
      .append("text")
      .attr("class", "refLabel")
      .attr("y", function (d) {
        return -y(d) - 5;
      })
      .attr("text-anchor", "middle")
      .text(function (d) {
        return d.toFixed(2);
      })
      .style("font-size", "10px")
      .style("fill", "black")
      .style("font-weight", "bold");

    // Elimina la línea y el texto roja de 'Semana 1' en el gráfico radial

    // Add the bars for New_Cases_Normalized with color coding (COLORES ORIGINALES)
    svg
      .append("g")
      .selectAll("path")
      .data(data)
      .enter()
      .append("path")
      .attr("fill", function (d) {
        return getColor(d.New_Cases_Normalized, "cases");
      })
      .attr("class", "yo")
      .attr(
        "d",
        d3
          .arc()
          .innerRadius(innerRadius)
          .outerRadius(function (d) {
            return y(d["New_Cases_Normalized"]);
          })
          .startAngle(function (d) {
            return x(d.Week);
          })
          .endAngle(function (d) {
            return x(d.Week) + x.bandwidth();
          })
          .padAngle(0.01)
          .padRadius(innerRadius)
      )
      // Eliminar mouseover/mouseout
      // .on("mouseover", function (event, d) {
      //   showTooltip(event, d);
      //   d3.select(this).attr("opacity", 0.7);
      // })
      // .on("mouseout", function () {
      //   hideTooltip();
      //   d3.select(this).attr("opacity", 1);
      // })
      .on("click", function (event, d) {
        const selectedWeek = d.Week || d.data?.week;
        window.lastFlowWeek = selectedWeek;
        // Actualiza los botones de semana
        if (typeof createWeekButtons === "function") {
          createWeekButtons(selectedWeek);
        }
        // Actualiza el diagrama de flujo
        if (window.lastFlowFips) {
          loadFlowDiagram(window.lastFlowFips, selectedWeek);
        }
        // Actualiza los cubos
        if (typeof filterByWeek === "function") {
          filterByWeek(selectedWeek);
        }
        // (Opcional) Resalta la semana en el radial
        if (typeof window.highlightRadialWeek === "function") {
          window.highlightRadialWeek(selectedWeek);
        }
        // --- NUEVO: Sincroniza el gráfico de líneas doble ---
        if (typeof updateLineChartHighlights === "function") {
          updateLineChartHighlights();
        }
      });

    // Add the second series (New_Deaths_Normalized) with color coding (COLORES ORIGINALES)
    svg
      .append("g")
      .selectAll("path")
      .data(data)
      .enter()
      .append("path")
      .attr("fill", function (d) {
        return getColor(d.New_Deaths_Normalized, "deaths");
      })
      .attr(
        "d",
        d3
          .arc()
          .innerRadius(function (d) {
            return ybis(0);
          })
          .outerRadius(function (d) {
            return ybis(d["New_Deaths_Normalized"]);
          })
          .startAngle(function (d) {
            return x(d.Week);
          })
          .endAngle(function (d) {
            return x(d.Week) + x.bandwidth();
          })
          .padAngle(0.01)
          .padRadius(innerRadius)
      )
      // Eliminar mouseover/mouseout
      // .on("mouseover", function (event, d) {
      //   showTooltip(event, d);
      //   d3.select(this).attr("opacity", 0.7);
      // })
      // .on("mouseout", function () {
      //   hideTooltip();
      //   d3.select(this).attr("opacity", 1);
      // })
      .on("click", function (event, d) {
        const selectedWeek = d.Week || d.data?.week;
        window.lastFlowWeek = selectedWeek;
        if (typeof createWeekButtons === "function") {
          createWeekButtons(selectedWeek);
        }
        if (window.lastFlowFips) {
          loadFlowDiagram(window.lastFlowFips, selectedWeek);
        }
        if (typeof filterByWeek === "function") {
          filterByWeek(selectedWeek);
        }
        if (typeof window.highlightRadialWeek === "function") {
          window.highlightRadialWeek(selectedWeek);
        }
      });

    // Tooltip functions (ORIGINAL)
    function showTooltip(event, d, isClick = false) {
      const tooltip = d3.select("#" + tooltipId);
      tooltip
        .html(
          `
          <strong>Semana ${d.Week}</strong><br/>
          Casos: ${
            d.New_Cases_Normalized ? d.New_Cases_Normalized.toFixed(4) : "N/A"
          }<br/>
          Muertes: ${
            d.New_Deaths_Normalized ? d.New_Deaths_Normalized.toFixed(4) : "N/A"
          }
        `
        )
        .style("opacity", 1)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");

      if (isClick) {
        tooltip.classed("fixed-tooltip", true);
      }
    }

    function hideTooltip() {
      if (!d3.select("#" + tooltipId).classed("fixed-tooltip")) {
        d3.select("#" + tooltipId).style("opacity", 0);
      }
    }

    // Click anywhere to hide fixed tooltip (ORIGINAL)
    d3.select("body").on("click", function (event) {
      if (
        !event.target.closest("path") &&
        !event.target.closest("#" + tooltipId)
      ) {
        d3.select("#" + tooltipId)
          .classed("fixed-tooltip", false)
          .style("opacity", 0);
      }
    });

    // Elimina leyenda lateral y crea dos leyendas horizontales: arriba y abajo del SVG
    const containerDiv = d3.select("#" + containerId);
    containerDiv.selectAll(".radial-legend-side").remove();
    containerDiv.selectAll(".radial-legend-top").remove();
    containerDiv.selectAll(".radial-legend-bottom").remove();

    // Envuelve todo el contenido del radar (leyenda arriba, SVG, leyenda abajo) en un div .radial-content-flex
    const contentFlex = containerDiv
      .append("div")
      .attr("class", "radial-content-flex")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("width", "100%")
      .style("max-width", "420px")
      .style("margin", "0 auto")
      .style("padding", "10px 0");
    // Leyenda superior (Nuevos contagios)
    const legendCases = [
      { label: "Bajo", color: colorSchemes.cases[1] },
      { label: "Bajo-medio", color: colorSchemes.cases[2] },
      { label: "Medio-alto", color: colorSchemes.cases[3] },
      { label: "Alto", color: colorSchemes.cases[4] },
    ];
    const legendTop = contentFlex
      .append("div")
      .attr("class", "radial-legend-top")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("gap", "16px")
      .style("margin", "0 0 8px 0")
      .style("width", "100%");
    legendTop
      .selectAll("div.legend-item")
      .data(legendCases)
      .enter()
      .append("div")
      .attr("class", "legend-item")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "4px")
      .html(
        (d) =>
          `<span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${d.color};margin-right:4px;"></span><span style="font-size:12px;">${d.label}</span>`
      );
    // SVG del radar
    const svgNode = svg.node().parentNode;
    contentFlex.node().appendChild(svgNode);
    d3.select(svgNode)
      .style("display", "block")
      .style("margin", "0 auto")
      .style("max-width", "100%");
    // Leyenda inferior (Nuevas muertes)
    const legendDeaths = [
      { label: "Bajo", color: colorSchemes.deaths[1] },
      { label: "Bajo-medio", color: colorSchemes.deaths[2] },
      { label: "Medio-alto", color: colorSchemes.deaths[3] },
      { label: "Alto", color: colorSchemes.deaths[4] },
    ];
    const legendBottom = contentFlex
      .append("div")
      .attr("class", "radial-legend-bottom")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("gap", "16px")
      .style("margin", "8px 0 0 0")
      .style("width", "100%");
    legendBottom
      .selectAll("div.legend-item")
      .data(legendDeaths)
      .enter()
      .append("div")
      .attr("class", "legend-item")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "4px")
      .html(
        (d) =>
          `<span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${d.color};margin-right:4px;"></span><span style="font-size:12px;">${d.label}</span>`
      );
  }

  // Fetch data and create chart
  fetchData().then((data) => {
    if (data) {
      processData(data);
    }
  });
}

// --- Agregar funciones de resaltado global para semanas y meses ---
window.highlightRadialWeek = function (week) {
  d3.selectAll(
    "#radial-chart-container path.yo, #radial-chart-container g:not(.reference-circles) path"
  ).each(function (d) {
    if (parseInt(d.Week) === week) {
      d3.select(this)
        .attr("stroke", null)
        .attr("stroke-width", null)
        .attr("opacity", 1);
    } else {
      d3.select(this)
        .attr("stroke", null)
        .attr("stroke-width", null)
        .attr("opacity", 0.3);
    }
  });
};
window.highlightRadialMonth = function (month) {
  d3.selectAll(
    "#radial-chart-container path.yo, #radial-chart-container g:not(.reference-circles) path"
  ).each(function (d) {
    if (parseInt(d.Month) === month) {
      d3.select(this)
        .attr("stroke", null)
        .attr("stroke-width", null)
        .attr("opacity", 1);
    } else {
      d3.select(this)
        .attr("stroke", null)
        .attr("stroke-width", null)
        .attr("opacity", 0.3);
    }
  });
};
window.clearRadialHighlight = function () {
  d3.selectAll(
    "#radial-chart-container path.yo, #radial-chart-container g:not(.reference-circles) path"
  )
    .attr("stroke", null)
    .attr("stroke-width", null)
    .attr("opacity", 1);
};
