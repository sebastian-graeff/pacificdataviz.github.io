// Set the dimensions and margins of the graph
const container = d3.select("#my_dataviz");
const containerWidth = container.node().getBoundingClientRect().width;
const containerHeight = container.node().getBoundingClientRect().height;

// Define a color scale for commodities
const colorScale = d3.scaleOrdinal()
  .domain([
    'Fish, crustaceans, molluscs, aquatic invertebrates ne',
    'Coffee, tea, mate and spices',
    'Tobacco and manufactured tobacco substitutes',
    'Cereal, flour, starch, milk preparations and products',
    'Milling products, malt, starches, inulin, wheat glute',
    'Vegetable, fruit, nut, etc food preparations',
    'Animal,vegetable fats and oils, cleavage products, et',
    'Edible vegetables and certain roots and tubers',
    'Dairy products, eggs, honey, edible animal product nes',
    'Cereals', 'Sugars and sugar confectionery',
    'Beverages, spirits and vinegar', 'Cocoa and cocoa preparations',
    'Edible fruit, nuts, peel of citrus fruit, melons',
    'Oil seed, oleagic fruits, grain, seed, fruit, etc, ne',
    'Meat, fish and seafood food preparations nes',
    'Miscellaneous edible preparations', 'Meat and edible meat offal'
  ])
  .range([
    "#6A4000", "#8A5500", "#B36E00", "#FF9D00",
    "#C07820", "#FFAF40", "#D88A30", "#FFC270",
    "#E49C60", "#FFD9A0", "#FFEAD0", "#6A4001",
    "#8A5501", "#B36E01", "#FF9D01", "#C07821",
    "#FFAF41", "#D88A31"
  ]);

// Define the hint text
const hintText = "Hint: You can click on, and move bubbles to create a clearer overview.";

// Append the SVG object to the body of the page
const svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", containerWidth)
  .attr("height", containerHeight);

const selectedYearText = svg.append("text")
  .attr("class", "selected-year")
  .attr("x", containerWidth / 2)
  .attr("y", containerHeight / 2)
  .attr("text-anchor", "middle")
  .attr("alignment-baseline", "middle")
  .style("font-size", "50px")
  .style("fill", "white")
  .text("1995");

// Add the hint text to the bottom right region
const hint = svg.append("text")
  .attr("class", "hint-text")
  .attr("x", containerWidth - 100) // Adjust the x-coordinate for proper alignment
  .attr("y", containerHeight - 100) // Adjust the y-coordinate for proper alignment
  .attr("text-anchor", "end") // Align the text to the end (right)
  .attr("alignment-baseline", "baseline") // Align the text to the baseline
  .style("font-size", "14px")
  .style("fill", "white")
  .text(hintText);

d3.csv("https://raw.githubusercontent.com/sebastian-graeff/pacificdataviz.github.io/main/data/FinalPlot.csv")
  .then(function(data) {

    // Convert date strings to date objects and numbers to actual numbers
    data.forEach(d => {
      d.date = new Date(d.date);
      d.value = +d.value;
      d.color = colorScale(d.commodity); // Add a color attribute
    });

    const data2018 = data.filter(d => d.date.getFullYear() === 1995);

    const tooltip = d3.select("#tooltip3");

    // Create scales for circle sizes and colors:
    const valueScale = d3.scaleSqrt()
      .domain([0, d3.max(data2018, d => d.value)])
      .range([5, 80]);

    // Draw the circles:
    const node = svg.append("g")
      .selectAll("circle")
      .data(data2018)
      .join("circle")
      .attr("r", d => valueScale(d.value))
      .attr("cx", containerWidth / 2)
      .attr("cy", containerHeight / 2)
      .style("fill", d => d.color) // Use the color attribute for filling
      .style("fill-opacity", 0.9)
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
        .on("mouseover", function(event, d) {
          tooltip.style("display", "inline");
          tooltip.html(`<b>Commodity:</b> ${d.commodity}<br><b>Country:</b> ${d.name}<br><b>Value:</b> ${d.value} tons`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        
          d3.select(this)
            .style("stroke", "white")
            .style("stroke-width", "2px");
        })
        
      .on("mouseout", function(d) {
        tooltip.style("display", "none");
        d3.select(this)
          .style("stroke", "none")
          .style("stroke-width", "0px");
      })
      .on("click", function(event, d) {
        // Remove the tooltip on click
        tooltip.style("display", "none");
      });

    const angleIncrement = 2 * Math.PI / data.length;

    data.forEach((d, i) => {
      const angle = i * angleIncrement;
      const radialDistance = Math.min(containerWidth, containerHeight) / 3;  // Radius of the donut
      d.x = d.initialX = containerWidth / 2 + radialDistance * Math.cos(angle);  // Store initial position in initialX
      d.y = d.initialY = containerHeight / 2 + radialDistance * Math.sin(angle);  // Store initial position in initialY
    });

    // Eliminate other forces; only use the gentleDonutForce and collision
    const simulation = d3.forceSimulation(data)
      .force("center", d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force("collide", d3.forceCollide().strength(1).radius(d => valueScale(d.value) + 5).iterations(1))
      .force("radial", radialForce)
      .alpha(1)
      .alphaDecay(0.02);

    function radialForce(d) {
      const cx = containerWidth / 2;
      const cy = containerHeight / 2;

      const dx = d.x - cx;
      const dy = d.y - cy;
      const angle = Math.atan2(dy, dx);

      const radialDistance = Math.min(containerWidth, containerHeight) / 3;
      const targetX = cx + radialDistance * Math.cos(angle);
      const targetY = cy + radialDistance * Math.sin(angle);

      const ax = targetX - d.x;
      const ay = targetY - d.y;

      d.vx += ax * 0.1;
      d.vy += ay * 0.1;
    }

    // Define a gravitational force
    function gravitationalForce(strength) {
      return function() {
        for (const d of data) {
          const cx = containerWidth / 2;
          const cy = containerHeight / 2;
          const dx = d.x - cx;
          const dy = d.y - cy;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Apply a force towards the center of the donut shape
          const forceX = -dx * strength / distance;
          const forceY = -dy * strength / distance;

          // Update velocity with the gravitational force
          d.vx += forceX;
          d.vy += forceY;
        }
      };
    }

    // Add the gravitational force to the simulation
    const gravityStrength = 0.1; // Adjust the strength as needed
    simulation.force("gravity", gravitationalForce(gravityStrength));

    simulation
      .nodes(data2018)
      .on("tick", function() {
        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
      });

    // Functions to handle dragging:
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0.1);
      d.fx = null;  // Release the fixed position
      d.fy = null;  // So nodes can gently move towards their intended positions
    }

    // Define a function to update the visualization with new data
    function updateVisualization(newData) {
      // Update your D3 code to use the newData variable instead of data2018
      // For example, replace references to data2018 with newData in your code.

      // Create scales for circle sizes and colors:
      const valueScale = d3.scaleSqrt()
        .domain([0, d3.max(newData, d => d.value)])
        .range([5, 80]);

      // Update the circles with the new data
      const node = svg.selectAll("circle")
        .data(newData);

      // Exit any old circles
      node.exit().remove();

      // Enter new circles
      node.enter().append("circle")
        .attr("r", d => valueScale(d.value))
        .style("fill-opacity", 0.9)
        .merge(node) // Merge enter and update selections
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .style("fill", d => d.color)
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
          .on("mouseover", function(event, d) {
            tooltip.style("display", "inline");
            tooltip.html(`<b>Commodity:</b> ${d.commodity}<br><b>Country:</b> ${d.name}<br><b>Value:</b> ${d.value} tons`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 10) + "px");
          
            d3.select(this)
              .style("stroke", "white")
              .style("stroke-width", "2px");
          })
          
        .on("mouseout", function(d) {
          tooltip.style("display", "none");
          d3.select(this)
            .style("stroke", "none")
            .style("stroke-width", "0px");
        })
        .on("click", function(event, d) {
          // Remove the tooltip on click
          tooltip.style("display", "none");
        });

      // Update the simulation with the new data
      simulation.nodes(newData);

      // Restart the simulation
      simulation.alpha(1).restart();
    }

    // Add an event listener for changes in the year selector
    const yearSelector = document.getElementById("dateSlider2");
    yearSelector.addEventListener("input", function () {
      const selectedYear = parseInt(yearSelector.value);

      // Filter the data based on the selected year
      const filteredData = data.filter(d => d.date.getFullYear() === selectedYear);

      // Update the visualization with the filtered data
      updateVisualization(filteredData);

      // Update the selected year text
      selectedYearText.text(`${selectedYear}`);
    });

    window.addEventListener("resize", function() {
      // Get new width and height
      const newWidth = container.node().getBoundingClientRect().width;
      const newHeight = container.node().getBoundingClientRect().height;

      // Resize the SVG
      svg.attr("width", newWidth).attr("height", newHeight);

      // Optional: restart the simulation if you want the nodes to re-adjust immediately after resizing
      simulation.restart();
    });
  });
