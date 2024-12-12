// Add a styled tooltip element
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background-color", "rgba(0, 0, 0, 0.7)")
    .style("color", "white")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("box-shadow", "0px 2px 5px rgba(0, 0, 0, 0.5)")
    .style("font-size", "12px")
    .style("visibility", "hidden");

let selectedRace = null; // Track the selected race

function updatePieChart(data) {
    const raceCounts = d3.rollups(
        data,
        v => v.length,
        d => d.race_ethnicity_combined
    );

    const total = d3.sum(raceCounts, d => d[1]);
    const radius = 150;
    const color = d3.scaleOrdinal(d3.schemeSet3); // Updated color palette
    const svg = d3.select("#pieChart")
        .attr("width", 400)
        .attr("height", 600)
        .append("g")
        .attr("transform", `translate(${radius}, ${radius})`);

    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    svg.selectAll("path")
        .data(pie(raceCounts))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data[0]))
        .style("stroke", "#fff")
        .style("stroke-width", "2px")
        .on("mouseover", (event, d) => {
            const percentage = ((d.data[1] / total) * 100).toFixed(2);
            tooltip.style("visibility", "visible")
                .text(`${d.data[0]}: ${d.data[1]} (${percentage}%)`);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"))
        .on("click", function (event, d) {
            const clickedRace = d.data[0];
            const isSelected = d3.select(this).classed("selected");

            // Reset all slices
            svg.selectAll("path")
                .classed("selected", false)
                .attr("fill", d => color(d.data[0]));

            if (!isSelected) {
                // Highlight selected slice
                d3.select(this)
                    .classed("selected", true)
                    .attr("fill", "#1e3a5f");

                selectedRace = clickedRace;
                updateHeatmap({ race: clickedRace }, data);
            } else {
                // Deselect if already selected
                selectedRace = null;
                updateHeatmap({}, data);
            }
        });

    // Add legend
    const legend = d3.select("#pieChart")
        .append("g")
        .attr("transform", `translate(10, ${2 * radius + 20})`);

    legend.selectAll("rect")
        .data(raceCounts)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25)
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => color(d[0]));

    legend.selectAll("text")
        .data(raceCounts)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 25 + 12)
        .text(d => d[0])
        .style("font-size", "14px")
        .style("fill", "#333");
}


let selectedAgeGroup = null; // Track the selected age group

function updateBarChart(data) {
    const ageCounts = d3.rollups(
        data,
        v => v.length,
        d => d.age_group
    ).sort((a, b) => b[1] - a[1]);

    const total = d3.sum(ageCounts, d => d[1]);
    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .domain(ageCounts.map(d => d[0]))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(ageCounts, d => d[1])])
        .nice()
        .range([height, 0]);

    const svg = d3.select("#barChart")
        .attr("width", 700)
        .attr("height", 400)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    svg.selectAll(".bar")
        .data(ageCounts)
        .enter()
        .append("rect")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d[1]))
        .attr("fill", "#42a5f5")
        .style("transition", "0.3s")
        .on("mouseover", (event, d) => {
            const percentage = ((d[1] / total) * 100).toFixed(2);
            tooltip.style("visibility", "visible")
                   .text(`${d[0]}: ${d[1]} (${percentage}%)`);
            d3.select(event.target).attr("fill", "#1e88e5");
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY + 10) + "px")
                   .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", (event) => {
            tooltip.style("visibility", "hidden");
            if (selectedAgeGroup !== event.target.__data__[0]) {
                d3.select(event.target).attr("fill", "#42a5f5");
            }
        })
        .on("click", (event, d) => {
            // Toggle selection
            const clickedAgeGroup = d[0];
            if (selectedAgeGroup === clickedAgeGroup) {
                selectedAgeGroup = null; // Deselect if already selected
                updateHeatmap({}, data);
                d3.select(event.target).attr("fill", "#42a5f5");
            } else {
                selectedAgeGroup = clickedAgeGroup;
                updateHeatmap({ ageGroup: clickedAgeGroup }, data);
                d3.selectAll(".bar").attr("fill", "#42a5f5"); // Reset other bars
                d3.select(event.target).attr("fill", "#1e3a5f"); // Highlight selected bar
            }
        });

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(6))
        .style("font-size", "12px");
}

function updateHeatmap(filter = {}, data = []) {
    const filteredData = data.filter(d => {
        return (!filter.race || d.race_ethnicity_combined === filter.race) &&
               (!filter.ageGroup || d.age_group === filter.ageGroup);
    });

    const heatmapData = d3.rollup(
        filteredData,
        v => v.length,
        d => d.age_group,
        d => d.race_ethnicity_combined
    );

    const ageGroups = Array.from(new Set(data.map(d => d.age_group)));
    const races = Array.from(new Set(data.map(d => d.race_ethnicity_combined)));

    const margin = { top: 30, right: 100, bottom: 100, left: 300 };
    const width = 500;
    const height = 500;

    const x = d3.scaleBand()
        .domain(ageGroups)
        .range([0, width])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(races)
        .range([0, height])
        .padding(0.05);

    const maxCount = d3.max(heatmapData.values(), d => d3.max(d.values()));
    const color = d3.scaleSequential(d3.interpolateViridis).domain([0, maxCount]);

    const svg = d3.select("#heatmap")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Clear the heatmap and re-render
    svg.selectAll("*").remove();

    const heatmapGroup = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    heatmapGroup.selectAll(".heatmap-rect")
        .data([...heatmapData.entries()].flatMap(([ageGroup, raceData]) =>
            [...raceData.entries()].map(([race, count]) => ({ ageGroup, race, count }))))
        .enter()
        .append("rect")
        .attr("x", d => x(d.ageGroup))
        .attr("y", d => y(d.race))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.count))
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .text(`${d.ageGroup} - ${d.race}: ${d.count}`);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

    heatmapGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    heatmapGroup.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "12px");

    // Add Legend
    const legendWidth = 300, legendHeight = 20;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${margin.left + width + 20}, ${margin.top})`);

    const legendScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".0f"));

    // Create gradient
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient");

    linearGradient.selectAll("stop")
        .data(color.ticks(10).map((t, i, arr) => ({
            offset: `${(i / (arr.length - 1)) * 100}%`,
            color: color(t)
        })))
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // Draw legend
    legendGroup.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmap-gradient)");

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .style("font-size", "12px");
}

