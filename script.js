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
let selectedAgeGroup = null; // Track the selected age group

function updatePieChart(data) {
    const raceCounts = d3.rollups(
        data,
        v => v.length,
        d => d.race_ethnicity_combined
    );

    const total = d3.sum(raceCounts, d => d[1]);
    const radius = 150;
    const color = d3.scaleOrdinal(d3.schemeSet3);

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
            const isSelected = selectedRace === clickedRace;

            selectedRace = isSelected ? null : clickedRace;

            // Highlight or reset slice
            svg.selectAll("path")
                .attr("fill", d => (selectedRace === d.data[0] ? "#1e3a5f" : color(d.data[0])));

            updateHeatmap(data);
        });
}

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
        .attr("fill", d => (selectedAgeGroup === d[0] ? "#1e3a5f" : "#42a5f5"))
        .on("mouseover", (event, d) => {
            const percentage = ((d[1] / total) * 100).toFixed(2);
            tooltip.style("visibility", "visible")
                   .text(`${d[0]}: ${d[1]} (${percentage}%)`);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY + 10) + "px")
                   .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"))
        .on("click", function (event, d) {
            selectedAgeGroup = selectedAgeGroup === d[0] ? null : d[0];

            // Highlight or reset bar
            svg.selectAll(".bar")
                .attr("fill", d => (selectedAgeGroup === d[0] ? "#1e3a5f" : "#42a5f5"));

            updateHeatmap(data);
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

function updateHeatmap(data) {
    const filteredData = data.filter(d => {
        return (!selectedRace || d.race_ethnicity_combined === selectedRace) &&
               (!selectedAgeGroup || d.age_group === selectedAgeGroup);
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
    const color = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, maxCount]);

    const svg = d3.select("#heatmap")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

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
}
