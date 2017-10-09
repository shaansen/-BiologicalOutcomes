var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = 1920 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

var x = d3.scale.ordinal().rangePoints([0, width], 1),
    y = {};

var line = d3.svg.line(),
    axis = d3.svg.axis().orient("left"),
    background,
    foreground;

var svg = d3.select(".viz").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.selectAll("#TreatmentType").on("change",update);
      update();

d3.selectAll("#TissueType").on("change",update);
      update();


function update(){
  var treatmentChoices = [];
  var tissueChoices = [];
  let cb = []
  
  d3.selectAll("#TreatmentType").each(function(d){
    cb = d3.select(this);
    if(cb.property("checked")){
      treatmentChoices.push(cb.property("value"));
    } else {
    }
  });

  d3.selectAll("#TissueType").each(function(d){
    cb = d3.select(this);
    if(cb.property("checked")){
      tissueChoices.push(cb.property("value"));
    } else {
    }
  });
  
  d3.csv("data/data2016.csv", function(error, mfi) { 

    if(treatmentChoices.length !== 0 || tissueChoices.length !== 0) {
      let sampleArray = mfi.filter(d => {
        return treatmentChoices.includes(d["Treatment"]) && tissueChoices.includes(d["Tissue_Type"])
      })
      mfi = sampleArray
    } else {
      mfi = []
    }
    
  

    let avoidColumns = ["index","mouse_sample","Tissue_Type","Treatment"]
    x.domain(dimensions = d3.keys(mfi[0]).filter(function(d) {
      return (!avoidColumns.includes(d)) && (y[d] = d3.scale.linear()
          .domain(d3.extent(mfi, function(p) { return +p[d]; }))
          .range([height, 0]));
    }));

    background = svg.append("g")
      .attr("class", "background")
      .selectAll("path")
      .data(mfi)
      .enter().append("path")
      .attr("d", path);

    foreground = svg.append("g")
      .attr("class", "foreground")
      .selectAll("path")
      .data(mfi)

    foreground.exit().remove()

    foreground.enter().append("path")
      .attr("d", path)
      .attr("stroke", function(d) {
        let i = d["index"]
        console.log(d["Treatment"])
        if(d["Treatment"]==="AIP") {
          return "rgb(255,0,0)";
        } else if(d["Treatment"]==="AIPV") {
          return "rgb(0,255,0)";
        } else if(d["Treatment"]==="AIV") {
          return "rgb(0,0,255)";
        } else if(d["Treatment"]==="APV") {
          return "rgb(120,120,0)";
        } else if(d["Treatment"]==="IPV") {
          return "rgb(0,120,120)";
        } else {
          return "rgb(120,0,120)";
        } 
        
      })

    var g = svg.selectAll(".dimension")
      .data(dimensions)
      .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; });

    // Add an axis and title.
    g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
      .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; });

    // Add and store a brush for each axis.
    g.append("g")
      .attr("class", "brush")
      .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
      .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);

  });

}

// Returns the path for a given data point.
function path(d) {
  return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      extents = actives.map(function(p) { return y[p].brush.extent(); });
  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  });
}
