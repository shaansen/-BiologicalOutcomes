// Code to toggle Active Accordions

var acc = document.getElementsByClassName("accordion");
var i;

for (i = 0; i < acc.length; i++) {
    acc[i].onclick = function(){
        /* Toggle between adding and removing the "active" class,
        to highlight the button that controls the panel */
        this.classList.toggle("active");

        /* Toggle between hiding and showing the active panel */
        var panel = this.nextElementSibling;
        if (panel.style.display === "block") {
            panel.style.display = "none";
        } else {
            panel.style.display = "block";
        }
    }
}

//D3 Variables Section

var width = document.body.clientWidth-300,
  height = d3.max([document.body.clientHeight-20, 240]);

var svg,
  m = [40, 0, 10, 30],
  w = width - m[1] - m[3],
  h = height - m[0] - m[2],
  xscale = d3.scale.ordinal().rangePoints([0, w], 1),
  yscale = {},
  dragging = {},
  line = d3.svg.line(),
  axis = d3.svg.axis().orient("left").ticks(1+height/50),
  foreground,
  background,
  highlighted,
  dimensions,
  allDimensions,
  legend,
  render_speed = 50,
  brush_count = 0,
  dispatcher;

var colors = {
  "AIPV_Tumor": [220,60,50],
  "AIP_Tumor": [12,85,47],
  "AIV_Tumor": [36,100,50],
  "IPV_Tumor": [124,81,33],
  "APV_Tumor": [300,100,30],
  "untreated_Tumor": [194,100,39],
  "AIPV_Lymph": [340, 69, 57],
  "AIP_Lymph": [84, 100, 33],
  "AIV_Lymph": [0, 60, 45],
  "IPV_Lymph": [210, 51, 39],
  "APV_Lymph": [300, 38, 43],
  "untreated_Lymph": [173, 67, 40],
};

//State Variables Section
var ticks = true,
  theme = "light",
  currentScale = "linear",
  dataSource,
  excluded_groups = [],
  excluded_columns = [],
  inverted_columns = [],
  searchQuery = "";

//Functions for Initializing State Section:
//Parse the Url!
function parseQueryString() {
  var query = (window.location.search || '?').substr(1),
      map   = {};
  query.replace(/([^&=]+)=?([^&]*)(?:&+|$)/g, function(match, key, value) {
      (map[key] = map[key] || []).push(value);
  });
  return map;
}

//Create Column control section based on dimensions from csv file
//This is called in update() because the csv needs to be loaded before this can be created
function createColumns() {
  //Create the shown columns
  var table = d3.select("#columnControl")
  .html("")
  .selectAll(".row")
    .data(dimensions)
    .enter().append("li")
    .attr("class", "ui-state-default")
    .attr("id", "column")
    .attr("value", function(d) {
      return d; 
    })
    .text(function(d) {
      return d; 
    });
    excluded_columns = allDimensions.filter(function(item) {
      return dimensions.indexOf(item) === -1;
    });
    console.log("excluded");
    console.log(excluded_columns);
    
  //Create the previously removed columns
  for(val in excluded_columns){
    console.log("val: " + excluded_columns[val]);
    var e = $('<li class="ui-state-default checked" id="column" value="' + excluded_columns[val] + '">' + excluded_columns[val] + '</li>');
    $('#columnControl').append(e);
  }
  d3.selectAll("#column").on("click", toggleColumns);
}

//set the dark theme without touching url or state
function init_dark_theme() {
  d3.select("body").attr("class", "dark");
  d3.selectAll("#dark-theme").attr("disabled", "disabled");
  d3.selectAll("#light-theme").attr("disabled", null);
  theme = "dark";
}

//set the light theme without touching url or state
function init_light_theme() {
  d3.select("body").attr("class", null);
  d3.selectAll("#light-theme").attr("disabled", "disabled");
  d3.selectAll("#dark-theme").attr("disabled", null);
  theme = "light";
}

//set the log scale without touching url or state.
//The currentScale will actually be used in update()
function init_log_scale() {
  currentScale = "log";
  d3.selectAll("#linear-scale").attr("disabled", null);
  d3.selectAll("#log-scale").attr("disabled", true);
}

//set the linear scale without touching url or state.
//The currentScale will actually be used in update()
function init_linear_scale() {
  currentScale = "linear";
  d3.selectAll("#log-scale").attr("disabled", null);
  d3.selectAll("#linear-scale").attr("disabled", true);
}

//Change the data source without touching url or state.
//This is used in many places to update the visualization
//because it calls update() with the currently selected data source.
function init_changeDataSource(){
  dataSource = $('#dataSources option:selected').text();
  if(dataSource =="Loading"){
    return;
  }
  var data1 = "data/" + dataSource;
  update(data1);
}

//Set up the Search by Sample Number current list of filters.
//Assumes searchQuery has been initialized because it's only called from initialize()
function init_search(){
  var arr = searchQuery.split('|');
  for(str in arr){
    var e = $('<div id="' + arr[str] + '">' + arr[str] + '<i id="removeSearch" class="fa fa-minus-square-o" style="padding-left: 5px;" aria-hidden="true"></i></div>');
    $('#query-list').append(e);
  }
  d3.selectAll("#removeSearch").on("click", removeSearch);
}

// initialization function to activate on load
function initialize() {
  //parse url and call control methods to set the state.
  state = parseQueryString();
  // if("excluded_groups" in state){
  //   excluded_groups = decodeURIComponent(state.excluded_groups).split(",");
  // }
  //set dimensions to be used for columns
  if("dimensions" in state){
    var decoded = decodeURIComponent(state.dimensions);
    if(decoded.length > 0){
      dimensions = decoded.split(",");
    }
  }
  else{
    dimensions = null;
  }
  if("inverted_columns"in state){
    var decoded = decodeURIComponent(state.inverted_columns);
    if(decoded.length > 0){
      inverted_columns = decoded.split(",");
    }
  }
  //set dataSource to load data from
  if("dataSource" in state){
    dataSource = state.dataSource;
  }
  //set currentScale log or linear
  if("currentScale" in state){
    // currentScale = state.currentScale;
    if(state.currentScale == "log") {
      init_log_scale();
    }
    if(state.currentScale == "linear"){
      init_linear_scale();
    }
  }
  else{
    init_linear_scale();
  }
  //set ticks visiable or not
  if("ticks" in state){
    if(state.ticks == "false") {
      ticks = false;
    }
    if(state.ticks == "true"){
      ticks = true;
    }
  }
  else{
    ticks = true;
  }
  //load the visualization with the variables set above
  init_changeDataSource();
  //set the theme, default to light
  if("theme" in state){
    // theme = state.theme;
    if(state.theme == "dark") {
      init_dark_theme();
    }
    if(state.theme == "light"){
      init_light_theme();
    }
  }
  else{
    init_light_theme();
  }
  //set the search query
  if("searchQuery" in state){
    searchQuery = decodeURIComponent(state.searchQuery);
    if(searchQuery.length > 0){
      init_search();
    }
  }
}

//D3 Function Section
function update(dataString){
  // Load the data and visualization
  d3.csv(dataString, function(raw_data) {
    // Convert quantitative scales to floats
    data = raw_data.map(function(d) {
      for (var k in d) {
        if (!_.isNaN(raw_data[0][k] - 0) && k != 'id' && k != 'index') {
          d[k] = parseFloat(d[k]) || 0;
        }
      };
      return d;
    });

    //remove previous visualization
    svg.selectAll("g").remove();

    // Extract the list of numerical dimensions and create a scale for each.
    if(dimensions == null){
      if(currentScale == "linear"){
        xscale.domain(dimensions = d3.keys(data[0]).filter(function(k) {
          if(inverted_columns.includes(k)){
            return (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.linear()
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([0, h])) && (yscale[k].inverted = true);
          }
          else{
            return (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.linear()
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([h, 0]));
          }
        }).sort());
      }
      else{
        xscale.domain(dimensions = d3.keys(data[0]).filter(function(k) {
          if(inverted_columns.includes(k)){
            return (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.log().base(2)
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([0, h])) && (yscale[k].inverted = true);
          }
          else{
            return (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.log().base(2)
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([h, 0]));
          }
        }).sort());
      }
      allDimensions = dimensions;
    }
    else{
      if(currentScale == "linear"){
        var oldDimensions = $.extend(true, [], dimensions);
        xscale.domain(dimensions = d3.keys(data[0]).filter(function(k) {
          if(inverted_columns.includes(k)){
            return (dimensions.includes(k)) && (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.linear()
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([0, h])) && (yscale[k].inverted = true);
          }
          else{
            return (dimensions.includes(k)) && (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.linear()
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([h, 0]));
          }
        }).sort(function(a, b){
          return oldDimensions.indexOf(a)-oldDimensions.indexOf(b);
      }));
      }
      else{
        var oldDimensions = $.extend(true, [], dimensions);
        xscale.domain(dimensions = d3.keys(data[0]).filter(function(k) {
          if(inverted_columns.includes(k)){
            return (dimensions.includes(k)) && (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.log().base(2)
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([0, h])) && (yscale[k].inverted = true);
          }
          else{
            return (dimensions.includes(k)) && (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.log().base(2)
              .domain(d3.extent(data, function(d) { return +d[k]; }))
              .range([h, 0]));
          }
        }).sort(function(a, b){
          return oldDimensions.indexOf(a)-oldDimensions.indexOf(b);
      }));
      }
      allDimensions = d3.keys(data[0]).filter(function(k) {
        return (_.isNumber(data[0][k]));
      })
    }

    // Add a group element for each dimension.
    var g = svg.selectAll(".dimension")
      .data(dimensions)
      .enter().append("svg:g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + xscale(d) + ")"; })
      .call(d3.behavior.drag()
        .on("dragstart", function(d) {
          dragging[d] = this.__origin__ = xscale(d);
          this.__dragged__ = false;
          d3.select("#foreground").style("opacity", "0.35");
        })
        .on("drag", function(d) {
          dragging[d] = Math.min(w, Math.max(0, this.__origin__ += d3.event.dx));
          dimensions.sort(function(a, b) { return position(a) - position(b); });
          xscale.domain(dimensions);
          g.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
          brush_count++;
          this.__dragged__ = true;

          // Feedback for axis deletion if dropped
          if (dragging[d] < 12 || dragging[d] > w-12) {
            d3.select(this).select(".background").style("fill", "#b00");
          } else {
            d3.select(this).select(".background").style("fill", null);
          }
        })
        .on("dragend", function(d) {
          if (!this.__dragged__) {
            // no movement, invert axis
            var extent = invert_axis(d);

          } else {
            // reorder axes
            d3.select(this).transition().attr("transform", "translate(" + xscale(d) + ")");
            var extent = yscale[d].brush.extent();
            //after drag and drop, update url
            insertParam("dimensions", dimensions.join(","));
            //and remake column control
            createColumns();
          }

          // remove axis if dragged all the way left
          if (dragging[d] < 12 || dragging[d] > w-12) {
            remove_axis(d);
          }

          // TODO required to avoid a bug
          xscale.domain(dimensions);
          
          //update ticks
          update_ticks(d, extent);

          // rerender
          d3.select("#foreground").style("opacity", null);
          brush();
          delete this.__dragged__;
          delete this.__origin__;
          delete dragging[d];
        }))

    // Add an axis and title.
    g.append("svg:g")
      .attr("class", "axis")
      .attr("transform", "translate(0,0)")
      .each(function(d) { d3.select(this).call(axis.scale(yscale[d])); })
      .append("svg:text")
      .attr("text-anchor", "middle")
      .attr("y", function(d,i) { return i%2 == 0 ? -14 : -30 } )
      .attr("x", 0)
      .attr("class", "label")
      .text(String)
      .append("title")
      .text("Click to invert. Drag to reorder");

    // Add and store a brush for each axis.
    g.append("svg:g")
      .attr("class", "brush")
      .each(function(d) {d3.select(this).call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brushstart", brushstart).on("brush", brush)); })
      .selectAll("rect")
      .style("visibility", null)
      .attr("x", -23)
      .attr("width", 36)
      .append("title")
      .text("Drag up or down to brush along this axis");

    g.selectAll(".extent")
      .append("title")
      .text("Drag or resize this filter");

    legend = create_legend(colors,brush);
    
    createColumns();

    if(ticks == false){
      d3.selectAll(".axis g").style("display", "none");
      //d3.selectAll(".axis path").style("display", "none");
      d3.selectAll(".background").style("visibility", "hidden");
      d3.selectAll("#hide-ticks").attr("disabled", "disabled");
      d3.selectAll("#show-ticks").attr("disabled", null);
    }
    else{
      d3.selectAll(".axis g").style("display", null);
      //d3.selectAll(".axis path").style("display", null);
      d3.selectAll(".background").style("visibility", null);
      d3.selectAll("#show-ticks").attr("disabled", "disabled");
      d3.selectAll("#hide-ticks").attr("disabled", null);
    }

    // Render full foreground
    brush();

  });

}

function brushstart() {
  d3.event.sourceEvent.stopPropagation();
}

// copy one canvas to another, grayscale
function gray_copy(source, target) {
  var pixels = source.getImageData(0,0,w,h);
  target.putImageData(grayscale(pixels),0,0);
}

// http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
function grayscale(pixels, args) {
  var d = pixels.data;
  for (var i=0; i<d.length; i+=4) {
    var r = d[i];
    var g = d[i+1];
    var b = d[i+2];
    // CIE luminance for the RGB
    // The human eye is bad at seeing red and blue, so we de-emphasize them.
    var v = 0.2126*r + 0.7152*g + 0.0722*b;
    d[i] = d[i+1] = d[i+2] = v
  }
  return pixels;
};

function create_legend(colors,brush) {
  // create legend

  var legend_data = d3.select("#legend")
    .html("")
    .selectAll(".row")
    .data( _.keys(colors).sort() )

  // filter by group
  var legend = legend_data
    .enter().append("div")
    .attr("title", "Hide group")
    .on("click", function(d) {
      // toggle food group
      if (_.contains(excluded_groups, d)) {
        d3.select(this).attr("title", "Hide group")
        excluded_groups = _.difference(excluded_groups,[d]);
        insertParam("excluded_groups", excluded_groups.join(","));
        brush();
      } else {
        d3.select(this).attr("title", "Show group")
        excluded_groups.push(d);
        insertParam("excluded_groups", excluded_groups.join(","));
        brush();
      }
    });

    //Select All
    d3.select("#select").on("click", function(){
      d3.selectAll('[title="Show group"]').each(function(d){
        d3.select(this).attr("title", "Hide group")
        excluded_groups = _.difference(excluded_groups,[d]);
        insertParam("excluded_groups", excluded_groups.join(","));
        brush();
      });
    });

    //Deselect all
    d3.select("#deselect").on("click", function(){
      d3.selectAll('[title="Hide group"]').each(function(d){
        d3.select(this).attr("title", "Show group")
        excluded_groups.push(d);
        insertParam("excluded_groups", excluded_groups.join(","));
        brush();
      });
    });

  legend
    .append("span")
    .style("background", function(d,i) { return color(d,0.85)})
    .attr("class", "color-bar");

  legend
    .append("span")
    .attr("class", "tally")
    .text(function(d,i) { return 0});

  legend
    .append("span")
    .text(function(d,i) { return " " + d});

  return legend;
}

// render polylines i to i+render_speed
function render_range(selection, i, max, opacity) {
  selection.slice(i,max).forEach(function(d) {
    path(d, foreground, color(d.Treatment+"_"+d.Tissue_Type,opacity));
  });
};

// simple data table
function data_table(sample) {
  // sort by first column
  var sample = sample.sort(function(a,b) {
    var col = d3.keys(a)[0];
    return a[col] < b[col] ? -1 : 1;
  });

  var table = d3.select("#sample-list")
    .html("")
    .selectAll(".row")
      .data(sample)
      .enter().append("div")
      .style("width","50%")
      .style("float",function(d,i) {return i%2===1 ? "right" : "left"})
      .on("mouseover", highlight)
      .on("mouseout", unhighlight);

  table
    .append("span")
    .attr("class", "color-block")
    .style("background", function(d) { return color(d.Treatment+"_"+d.Tissue_Type,0.85) })

  table
    .append("span")
    .text(function(d) { return d.mouse_sample; })
}

// Adjusts rendering speed
function optimize(timer) {
  var delta = (new Date()).getTime() - timer;
  render_speed = Math.max(Math.ceil(render_speed * 30 / delta), 8);
  render_speed = Math.min(render_speed, 300);
  return (new Date()).getTime();
}

// Feedback on rendering progress
function render_stats(i,n,render_speed) {
  d3.select("#rendered-count").text(i);
  d3.select("#rendered-bar")
    .style("width", (100*i/n) + "%");
  d3.select("#render-speed").text(render_speed);
}

// Feedback on selection
function selection_stats(opacity, n, total) {
  d3.select("#data-count").text(total);
  d3.select("#selected-count").text(n);
  d3.select("#selected-bar").style("width", (100*n/total) + "%");
  d3.select("#opacity").text((""+(opacity*100)).slice(0,4) + "%");
}

// Highlight single polyline
function highlight(d) {
  d3.select("#foreground").style("opacity", "0.25");
  d3.selectAll(".row").style("opacity", function(p) { return (d.Treatment+"_"+d.Tissue_Type == p) ? null : "0.3" });
  path(d, highlighted, color(d.Treatment+"_"+d.Tissue_Type,1));
}

// Remove highlight
function unhighlight() {
  d3.select("#foreground").style("opacity", null);
  d3.selectAll(".row").style("opacity", null);
  highlighted.clearRect(0,0,w,h);
}

function invert_axis(d) {
  // save extent before inverting
  if (!yscale[d].brush.empty()) {
    var extent = yscale[d].brush.extent();
  }
  if (yscale[d].inverted == true) {
    yscale[d].range([h, 0]);
    d3.selectAll('.label')
      .filter(function(p) { return p == d; })
      .style("text-decoration", null);
    yscale[d].inverted = false;
    //set inverted_columns
    inverted_columns = _.difference(inverted_columns, [d]);
  } else {
    yscale[d].range([0, h]);
    d3.selectAll('.label')
      .filter(function(p) { return p == d; })
      .style("text-decoration", "underline");
    yscale[d].inverted = true;
    //set inverted_columns
    inverted_columns.push(d);
  }
  //insert into url and state
  insertParam("inverted_columns", inverted_columns.join(","));
  return extent;
}

function path(d, ctx, color) {
  if (color) ctx.strokeStyle = color;
  ctx.beginPath();
  var x0 = xscale(0)-15,
      y0 = yscale[dimensions[0]](d[dimensions[0]]);   // left edge
  ctx.moveTo(x0,y0);
  dimensions.map(function(p,i) {
    var x = xscale(p),
        y = yscale[p](d[p]);
    var cp1x = x - 0.88*(x-x0);
    var cp1y = y0;
    var cp2x = x - 0.12*(x-x0);
    var cp2y = y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    x0 = x;
    y0 = y;
  });
  ctx.lineTo(x0+15, y0);                               // right edge
  ctx.stroke();
};

function color(d,a) {
  var c = colors[d];
  return ["hsla(",c[0],",",c[1],"%,",c[2],"%,",a,")"].join("");
}

function position(d) {
  var v = dragging[d];
  return v == null ? xscale(d) : v;
}

// Handles a brush event, toggling the display of foreground lines.
// TODO refactor
function brush() {
  brush_count++;
  var actives = dimensions.filter(function(p) { return !yscale[p].brush.empty(); }),
      extents = actives.map(function(p) { return yscale[p].brush.extent(); });

  // hack to hide ticks beyond extent
  var b = d3.selectAll('.dimension')[0]
    .forEach(function(element, i) {
      var dimension = d3.select(element).data()[0];
      if (_.include(actives, dimension)) {
        var extent = extents[actives.indexOf(dimension)];
        d3.select(element)
          .selectAll('text')
          .style('font-weight', 'bold')
          .style('font-size', '13px')
          .style('display', function() {
            var value = d3.select(this).data();
            return extent[0] <= value && value <= extent[1] ? null : "none"
          });
      } else {
        d3.select(element)
          .selectAll('text')
          .style('font-size', null)
          .style('font-weight', null)
          .style('display', null);
      }
      d3.select(element)
        .selectAll('.label')
        .style('display', null);
    });
    ;

  // bold dimensions with label
  d3.selectAll('.label')
    .style("font-weight", function(dimension) {
      if (_.include(actives, dimension)) return "bold";
      return null;
    });

  // Get lines within extents
  var selected = [];
  data
    .filter(function(d) {
      return !_.contains(excluded_groups, d.Treatment+"_"+d.Tissue_Type);
    })
    .map(function(d) {
      return actives.every(function(p, dimension) {
        return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
      }) ? selected.push(d) : null;
    });

  // free text search
  var query = d3.select("#search")[0][0].value;
  // if (query.length > 0) {
  selected = search(selected, query);
  // }

  if (selected.length < data.length && selected.length > 0) {
    d3.select("#keep-data").attr("disabled", null);
    d3.select("#exclude-data").attr("disabled", null);
  } else {
    d3.select("#keep-data").attr("disabled", "disabled");
    d3.select("#exclude-data").attr("disabled", "disabled");
  };


  // total by food group
  var tallies = _(selected)
    .groupBy(function(d) { return d.Treatment+"_"+d.Tissue_Type; })

  // include empty groups
  _(colors).each(function(v,k) { tallies[k] = tallies[k] || []; });

  legend
    .style("text-decoration", function(d) { return _.contains(excluded_groups,d) ? "line-through" : null; })
    .attr("class", function(d) {
      return (tallies[d].length > 0)
           ? "row"
           : "row off";
    });

  legend.selectAll(".color-bar")
    .style("width", function(d) {
      return Math.ceil(500*tallies[d].length/data.length) + "px"
    });

  legend.selectAll(".tally")
    .text(function(d,i) { return tallies[d].length });

  // Render selected
  paths(selected, foreground, brush_count, true);
}

// render a set of polylines on a canvas
function paths(selected, ctx, count) {
  var n = selected.length,
      i = 0,
      opacity = d3.min([2/Math.pow(n,0.3),1]),
      timer = (new Date()).getTime();

  selection_stats(opacity, n, data.length)

  shuffled_data = _.shuffle(selected);

  data_table(shuffled_data);

  ctx.clearRect(0,0,w+1,h+1);

  // render all lines until finished or a new brush event
  function animloop(){
    if (i >= n || count < brush_count) return true;
    var max = d3.min([i+render_speed, n]);
    render_range(shuffled_data, i, max, opacity);
    render_stats(max,n,render_speed);
    i = max;
    timer = optimize(timer);  // adjusts render_speed
  };

  d3.timer(animloop);
}

// transition ticks for reordering, rescaling and inverting
function update_ticks(d, extent) {
  // update brushes
  if (d) {
    var brush_el = d3.selectAll(".brush")
        .filter(function(key) { return key == d; });
    // single tick
    if (extent) {
      // restore previous extent
      brush_el.call(yscale[d].brush = d3.svg.brush().y(yscale[d]).extent(extent).on("brush", brush));
    } else {
      brush_el.call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush));
    }
  } else {
    // all ticks
    d3.selectAll(".brush")
      .each(function(d) { d3.select(this).call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush)); })
  }

  brush_count++;

  // if(ticks){
  //   init_show_ticks();
  // }
  // else{
  //   init_hide_ticks();
  // }

  // update axes
  d3.selectAll(".axis")
    .each(function(d,i) {
      // hide lines for better performance
      d3.select(this).selectAll('line').style("display", "none");

      // transition axis numbers
      d3.select(this)
        .transition()
        .duration(720)
        .call(axis.scale(yscale[d]));

      // bring lines back
      d3.select(this).selectAll('line').transition().delay(800).style("display", null);

      d3.select(this)
        .selectAll('text')
        .style('font-weight', null)
        .style('font-size', null)
        .style('display', null);
    });
}

// Rescale to new dataset domain
function rescale() {
  // reset yscales, preserving inverted state
  dimensions.forEach(function(d,i) {
    if (yscale[d].inverted) {
      if(currentScale == "linear"){
        yscale[d] = d3.scale.linear()
            .domain(d3.extent(data, function(p) { return +p[d]; }))
            .range([0, h]);
      }
      else{
        yscale[d] = d3.scale.log().base(2)
            .domain(d3.extent(data, function(p) { return +p[d]; }))
            .range([0, h]);
      }
      yscale[d].inverted = true;
    } else {
      if(currentScale == "linear"){
        yscale[d] = d3.scale.linear()
            .domain(d3.extent(data, function(p) { return +p[d]; }))
            .range([h, 0]);
      }
      else{
        yscale[d] = d3.scale.log().base(2)
            .domain(d3.extent(data, function(p) { return +p[d]; }))
            .range([h, 0]);
      }
    }
  });

  update_ticks();

  // Render selected data
  paths(data, foreground, brush_count);
}

// Get polylines within extents
function actives() {
  var actives = dimensions.filter(function(p) { return !yscale[p].brush.empty(); }),
      extents = actives.map(function(p) { return yscale[p].brush.extent(); });

  // filter extents and excluded groups
  var selected = [];
  data
    .filter(function(d) {
      return !_.contains(excluded_groups, d.Treatment+"_"+d.Tissue_Type);
    })
    .map(function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? selected.push(d) : null;
  });

  // free text search
  var query = d3.select("#search")[0][0].value;
  // if (query > 0) {
  selected = search(selected, query);
  // }

  return selected;
}

// Export data
function export_csv() {
  var keys = d3.keys(data[0]);
  var rows = actives().map(function(row) {
    return keys.map(function(k) { return row[k]; })
  });
  var csv = d3.csv.format([keys].concat(rows)).replace(/\n/g,"<br/>\n");
  var styles = "<style>body { font-family: sans-serif; font-size: 12px; }</style>";
  window.open("text/csv").document.write(styles + csv);
}

// scale to window size
window.onresize = function() {
  width = document.body.clientWidth-300,
  height = d3.max([document.body.clientHeight-20, 240]);

  w = width - m[1] - m[3],
  h = height - m[0] - m[2];

  d3.select("#chart")
      .style("height", (h + m[0] + m[2]) + "px")

  d3.selectAll("canvas")
      .attr("width", w)
      .attr("height", h)
      .style("padding", m.join("px ") + "px");

  d3.select("svg")
      .attr("width", w + m[1] + m[3])
      .attr("height", h + m[0] + m[2])
      .select("g")
      .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

  xscale = d3.scale.ordinal().rangePoints([0, w], 1).domain(dimensions);
  dimensions.forEach(function(d) {
    yscale[d].range([h, 0]);
  });

  d3.selectAll(".dimension")
    .attr("transform", function(d) { return "translate(" + xscale(d) + ")"; })
  // update brush placement
  d3.selectAll(".brush")
    .each(function(d) { d3.select(this).call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush)); })
  brush_count++;

  // update axis placement
  axis = axis.ticks(1+height/50),
  d3.selectAll(".axis")
    .each(function(d) { d3.select(this).call(axis.scale(yscale[d])); });

  // render data
  brush();
};

// Remove all but selected from the dataset
function keep_data() {
  new_data = actives();
  if (new_data.length == 0) {
    alert("I don't mean to be rude, but I can't let you remove all the data.\n\nTry removing some brushes to get your data back. Then click 'Keep' when you've selected data you want to look closer at.");
    return false;
  }
  data = new_data;
  rescale();
};

// Exclude selected from the dataset
function exclude_data() {
  new_data = _.difference(data, actives());
  if (new_data.length == 0) {
    alert("I don't mean to be rude, but I can't let you remove all the data.\n\nTry selecting just a few data points then clicking 'Exclude'.");
    return false;
  }
  data = new_data;
  rescale();
};

//Util Function Section
//Insert key value pair into Url
//This function is what adds it to the state and url
function insertParam(key, value) {
  key = escape(key); value = escape(value);

  var kvp = document.location.search.substr(1).split('&');
  if (kvp == '') {
      var url = '?' + key + '=' + value;
      if (window && window.history) {
        window.history.pushState(null, null, url);
      }
  }
  else {

    var i = kvp.length; var x; while (i--) {
        x = kvp[i].split('=');

        if (x[0] == key) {
            x[1] = value;
            kvp[i] = x.join('=');
            break;
        }
    }

    if (i < 0) { kvp[kvp.length] = [key, value].join('='); }

    var url = '?' + kvp.join('&');
    if (window && window.history) {
      window.history.pushState(null, null, url);
    }
  }
};

//control fucntions Section
//hide ticks and add it to state and url
function hide_ticks() {
  d3.selectAll(".axis g").style("display", "none");
  //d3.selectAll(".axis path").style("display", "none");
  d3.selectAll(".background").style("visibility", "hidden");
  d3.selectAll("#hide-ticks").attr("disabled", "disabled");
  d3.selectAll("#show-ticks").attr("disabled", null);
  ticks = false;
  insertParam("ticks", "false");
};

//show ticks and add it to state and url
function show_ticks() {
  d3.selectAll(".axis g").style("display", null);
  //d3.selectAll(".axis path").style("display", null);
  d3.selectAll(".background").style("visibility", null);
  d3.selectAll("#show-ticks").attr("disabled", "disabled");
  d3.selectAll("#hide-ticks").attr("disabled", null);
  ticks = true;
  insertParam("ticks", "true");
};

//turn on dark theme and add it to state and url
function dark_theme() {
  d3.select("body").attr("class", "dark");
  d3.selectAll("#dark-theme").attr("disabled", "disabled");
  d3.selectAll("#light-theme").attr("disabled", null);
  theme = "dark";
  insertParam("theme", theme);
};

//turn on dark theme and add it to state and url
function light_theme() {
  d3.select("body").attr("class", null);
  d3.selectAll("#light-theme").attr("disabled", "disabled");
  d3.selectAll("#dark-theme").attr("disabled", null);
  theme = "light";
  insertParam("theme", theme);
};

//change to log scale and add it to state and url
function log_scale() {
  currentScale = "log";
  d3.selectAll("#linear-scale").attr("disabled", null);
  d3.selectAll("#log-scale").attr("disabled", true);
  insertParam("currentScale", currentScale);
  //reload vis
  init_changeDataSource();
};

//change to linear scale and add it to state and url
function linear_scale() {
  currentScale = "linear";
  d3.selectAll("#log-scale").attr("disabled", null);
  d3.selectAll("#linear-scale").attr("disabled", true);
  insertParam("currentScale", currentScale);
  //reload vis
  init_changeDataSource();
};

//change data source and add it to state and url
function changeDataSource(){
  dataSource = $('#dataSources option:selected').text();
  if(dataSource =="Loading"){
    return;
  }
  var data1 = "data/" + dataSource;
  insertParam("dataSource", dataSource);
  update(data1);
};

//if a column on the Column Control is clicked, enable or disable it.
//This is only called for Column Control, not deleting on the vis
function toggleColumns() {
  //noclick is used because the column control dragging event triggers a click event,
  //so this prevents toggling columns that are actually being reordered.
  if($(this).hasClass('noclick')){
    $(this).removeClass('noclick');
  }
  else{
    //toggle the column
    if($(this).hasClass('checked')) { 
      $(this).removeClass('checked');
      //add clicked column to the url, state, and vis
      add_axis($(this).text());
    } else { 
      $(this).addClass('checked');
      //remove clicked column from the url, state, and vis
      remove_axis($(this).text());
    }
  }
};

//remove column from the vis, the url, and the state
function remove_axis(d) {
  var g = svg.selectAll(".dimension");
  excluded_columns.push(d);
  dimensions = _.difference(dimensions, [d]);
  xscale.domain(dimensions);
  g.attr("transform", function(p) { return "translate(" + position(p) + ")"; });
  g.filter(function(p) { return p == d; }).remove();
  // insertParam("excluded_columns", excluded_columns.join(","));
  insertParam("dimensions", dimensions.join(","));
  // update_ticks();
  init_changeDataSource();
};

//add column to the vis, the url, and the state
function add_axis(d) {
  var g = svg.selectAll(".dimension");
  excluded_columns = _.difference(excluded_columns, [d]);
  dimensions.push(d);
  xscale.domain(dimensions);
  g.attr("transform", function(p) { return "translate(" + position(p) + ")"; });
  g.filter(function(p) { return p == d; }).remove();
  // insertParam("excluded_columns", excluded_columns.join(","));
  insertParam("dimensions", dimensions.join(","));
  // update_ticks();
  init_changeDataSource();
};

//This is bound to the search bar in the Search by Sample Number
//This function does the regex search of the str on the selection,
//the str being the search query and the selection being the samples
//searchQuery is a previously added search, added by the query builder to the state and url. 
function search(selection,str) {
  var query = str;
  if(str.length > 0){
    if(searchQuery.length > 0){
      query = searchQuery + "|" + str;
    }
  }
  else{
    if(searchQuery.length > 0){
      query = searchQuery;
    }
  }
  pattern = new RegExp(query,"i")
  return _(selection).filter(function(d) { return pattern.exec(d.mouse_sample); });
};

//Add a search for the Search by Sample Number to the state, url, and to the html list
function addSearch(){
  //do something about the html
  var str = d3.select("#search")[0][0].value;
  var e = $('<div id="' + str + '">' + str + '<i id="removeSearch" class="fa fa-minus-square-o" style="padding-left: 5px;" aria-hidden="true"></i></div>');
  $('#query-list').append(e);
  //Thisss could probably be better
  d3.selectAll("#removeSearch").on("click", removeSearch);
  d3.select("#search")[0][0].value = "";
  //now handle the array and the state.
  if(searchQuery.length > 0){
    searchQuery = searchQuery + "|" + str;
  }
  else{
    searchQuery = str;
  }
  insertParam("searchQuery", searchQuery);
};

//Remove a search for the Search by Sample Number from the state, url, and to the html list
function removeSearch(){
  //do something about the html
  var parent = $(this).parent(); 
  var str = parent.text();
  parent.remove();

  //now handle the array and the state.
  var arr = searchQuery.split("|");
  var index = arr.indexOf(str);
  if (index >= 0) {
    arr.splice( index, 1 );
  }
  searchQuery = arr.join("|");
  insertParam("searchQuery", searchQuery);
  brush();
};

//OnReady Section
$( document ).ready(function() {
  $.ajax({
    url : "/data",
    dataType: "html",
    success : function(result){

        $(".result").html(result);
        id = $(".result").find('.ntable');

        var row = [];

        $(".ntable a").each(function() {
            var substring = ".csv";
            if($(this).attr('href').indexOf(substring) !== -1){
              row.push($(this).attr('href'));
            }
        });
        var dropdown = $('#dataSources');
        dropdown.options = function (data) {
            var self = this;
            $.each(data, function (ix, val) {
                var option = $('<option>').text(val);
                data.push(option);
            });
            self.append(data)
        }
        dropdown.empty();
        dropdown.options(row);
        
        //set up sortable on the Column Control list
        $( function() {
          $( "#columnControl" ).sortable({
            // placeholder: "ui-state-highlight",
            delay: 150,
            // handle: ".handle",
            start: function(event, ui){
              ui.item.addClass('noclick');
            },
            stop: function(event, ui){
              var data = $(this).sortable('toArray', { attribute: 'value' });
              dimensions = data.filter(function(item) {
                return excluded_columns.indexOf(item) === -1;
              });
              insertParam("dimensions", dimensions.join(","));
              // update_ticks();
              init_changeDataSource();
            }
          });
          $( "#columnControl" ).disableSelection();
        } );
        // initialize state on page load
        initialize();
    }
  });


  // Scale chart and canvas height
  d3.select("#chart")
      .style("height", (h + m[0] + m[2]) + "px")

  d3.selectAll("canvas")
      .attr("width", w)
      .attr("height", h)
      .style("padding", m.join("px ") + "px");


  // Foreground canvas for primary view
  foreground = document.getElementById('foreground').getContext('2d');
  foreground.globalCompositeOperation = "destination-over";
  foreground.strokeStyle = "rgba(0,100,160,0.1)";
  foreground.lineWidth = 1.7;
  foreground.fillText("Loading...",w/2,h/2);

  // Highlight canvas for temporary interactions
  highlighted = document.getElementById('highlight').getContext('2d');
  highlighted.strokeStyle = "rgba(0,100,160,1)";
  highlighted.lineWidth = 4;

  // Background canvas
  background = document.getElementById('background').getContext('2d');
  background.strokeStyle = "rgba(0,100,160,0.1)";
  background.lineWidth = 1.7;

  // SVG for ticks, labels, and interactions
  svg = d3.select("svg")
      .attr("width", w + m[1] + m[3])
      .attr("height", h + m[0] + m[2])
      .append("svg:g")
      .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

  // create a d3.history dispatcher object with an "action" method
  dispatcher = d3.history('action');
  
  d3.select("#keep-data").on("click", keep_data);
  d3.select("#exclude-data").on("click", exclude_data);
  d3.select("#export-data").on("click", export_csv);
  d3.select("#search").on("keyup", brush);
  d3.selectAll("#dataSources").on("change",changeDataSource);
  // changeDataSource();

  // Appearance toggles
  d3.select("#hide-ticks").on("click", hide_ticks);
  d3.select("#show-ticks").on("click", show_ticks);
  d3.select("#dark-theme").on("click", dark_theme);
  d3.select("#light-theme").on("click", light_theme);
  d3.select("#log-scale").on("click", log_scale);
  d3.select("#linear-scale").on("click", linear_scale);
  d3.select("#reset").on("click", init_changeDataSource);
  d3.select("#addSearch").on("click", addSearch);
  d3.selectAll("#removeSearch").on("click", removeSearch);

  // initialize state for manual browsing actions
  window.addEventListener('popstate', function(event) {
    // reset()
    initialize()
    // the popstate event saves the data associated with the URL change
    // render the popstate value after running the initialization function,
    // since both will try to set the most recently bound data
    if (event.state && event.state[0]) {
        render_value(event.state[0])
    }
  })
});
