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

let selectedRaces = []; // Track the selected races
let selectedAgeGroups = []; // Track the selected age groups

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
            const isSelected = selectedRaces.includes(clickedRace);

            if (isSelected) {
                // Deselect if already selected
                selectedRaces = selectedRaces.filter(race => race !== clickedRace);
                d3.select(this).attr("fill", color(clickedRace));
            } else {
                // Add to selected races
                selectedRaces.push(clickedRace);
                d3.select(this).attr("fill", "#1e3a5f");
            }

            // Update heatmap based on selected races and age groups
            updateHeatmap({ races: selectedRaces, ageGroups: selectedAgeGroups }, data);
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


function updateBarChart(data) {
    // Roll up age group counts without sorting
    const ageCounts = d3.rollups(
        data,
        v => v.length,
        d => d.age_group
    );

    const total = d3.sum(ageCounts, d => d[1]);
    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Sort the age groups alphabetically by name
    const sortedAgeGroups = ageCounts
        .map(d => d[0])
        .sort((a, b) => a.localeCompare(b));

    const x = d3.scaleBand()
        .domain(sortedAgeGroups)
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(ageCounts, d => d[1])])
        .nice()
        .range([height, 0]);

    // Create the SVG container
    const svg = d3.select("#barChart")
        .attr("width", 700)
        .attr("height", 400)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Draw bars
    svg.selectAll(".bar")
        .data(ageCounts)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d[1]))
        .attr("fill", "#42a5f5")
        .style("cursor", "pointer")
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
            if (!selectedAgeGroups.includes(event.target.__data__[0])) {
                d3.select(event.target).attr("fill", "#42a5f5");
            }
        })
        .on("click", (event, d) => {
            const clickedAgeGroup = d[0];

            if (selectedAgeGroups.includes(clickedAgeGroup)) {
                // Deselect if already selected
                selectedAgeGroups = selectedAgeGroups.filter(group => group !== clickedAgeGroup);
                d3.select(event.target).attr("fill", "#42a5f5");
            } else {
                // Add to selected
                selectedAgeGroups.push(clickedAgeGroup);
                d3.select(event.target).attr("fill", "#1e3a5f");
            }

            updateHeatmap({ races: selectedRaces, ageGroups: selectedAgeGroups }, data);
        });

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(6))
        .style("font-size", "12px");
}



function updateHeatmap(filter = {}, data = []) {
    // Filter the data based on selected races and age groups
    const filteredData = data.filter(d => {
        const isRaceMatch = !filter.races || filter.races.length === 0 || filter.races.includes(d.race_ethnicity_combined);
        const isAgeGroupMatch = !filter.ageGroups || filter.ageGroups.length === 0 || filter.ageGroups.includes(d.age_group);
        return isRaceMatch && isAgeGroupMatch;
    });

    // Roll up data for the heatmap
    const heatmapData = d3.rollup(
        filteredData,
        v => v.length,
        d => d.age_group,
        d => d.race_ethnicity_combined
    );

    const ageGroups = Array.from(new Set(data.map(d => d.age_group))).sort(d3.ascending);
    const races = Array.from(new Set(data.map(d => d.race_ethnicity_combined))).sort(d3.ascending);
    

    // Heatmap dimensions and scales
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

    const maxCount = d3.max([...heatmapData.values()].flatMap(raceData => [...raceData.values()]));
    const color = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, maxCount || 1]);

    const svg = d3.select("#heatmap")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Clear any previous heatmap
    svg.selectAll("*").remove();

    const heatmapGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Render heatmap rectangles
    heatmapGroup.selectAll(".heatmap-rect")
        .data([...heatmapData.entries()].flatMap(([ageGroup, raceData]) =>
            [...raceData.entries()].map(([race, count]) => ({
                ageGroup,
                race,
                count: count || 0 // Handle cases with no data
            }))))
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

    // Add X-axis (age groups)
    heatmapGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    // Add Y-axis (races)
    heatmapGroup.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "12px");

    // Add legend
    const legendHeight = 300, legendWidth = 20;

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${margin.left + width + 10}, ${margin.top})`);

    const legendScale = d3.scaleLinear()
        .domain([0, maxCount || 1])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".0f"));

    // Create gradient
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

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
        .attr("transform", `translate(${legendWidth + 10}, 0)`)
        .call(legendAxis)
        .style("font-size", "12px");
}
