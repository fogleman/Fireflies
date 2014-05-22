function f(x) {
    return 1 - Math.pow(Math.E, -x);
}

function g(y) {
    return y < 1 ? Math.log(1 / (1 - y)) : 50;
}

function gaussian(mu, sigma) {
    var x1, x2, rad;
    do {
        x1 = 2 * Math.random() - 1;
        x2 = 2 * Math.random() - 1;
        rad = x1 * x1 + x2 * x2;
    } while(rad >= 1 || rad == 0);
    var c = Math.sqrt(-2 * Math.log(rad) / rad);
    return mu + x1 * c * sigma;
};

var N = 24;
var count = N * N;
var period = 3;
var speed = 1;
var threshold = f(period);
var influence = 0.003;
var similarity = 0;
var scatter = false;
var lastUpdate = 0;
var values = [];
var weights = [];
var groups = [];
var px = [];
var py = [];

function setSize(x) {
    N = x;
    count = N * N;
    reset();
}

function setScatter(x) {
    scatter = x;
    reset();
}

function setInfluence(x) {
    influence = x / 1000;
    reset();
}

function setSimilarity(x) {
    if (x !== 0) {
        x = Math.pow(2, 10 - x);
    }
    similarity = x;
    reset();
}

function hideSidebar() {
    d3.select("#side").remove();
}

function reset() {
    values = [];
    weights = [];
    groups = [];
    px = [];
    py = [];
    d3.select("#view").selectAll("circle").remove();
    d3.select("#view").attr("viewBox", "0 0 " + N + " " + N);
    for (var i = 0; i < count; i++) {
        var value = f(Math.random() * g(threshold));
        var weight = similarity ? gaussian(1, 1 / similarity) : 1;
        values.push(value);
        weights.push(weight);
        var x = 0.5 + i % N;
        var y = 0.5 + Math.floor(i / N);
        if (scatter) {
            while (true) {
                x = Math.random() * N;
                y = Math.random() * N;
                var ok = true;
                for (var j = 0; j < i; j++) {
                    var dx = px[j] - x;
                    var dy = py[j] - y;
                    var d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 0.8) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    break;
                }
            }
        }
        px.push(x);
        py.push(y);
    }
}

function update(dt) {
    var result = [];
    while (dt > 0) {
        var d = dt;
        for (var i = 0; i < count; i++) {
            var e = (g(threshold) - g(values[i])) / weights[i];
            if (e < d) {
                d = e;
            }
        }
        dt -= d;
        for (var i = 0; i < count; i++) {
            values[i] = f(g(values[i]) + d * weights[i]);
        }
        var seen = {};
        while (true) {
            var done = 1;
            for (var i = 0; i < count; i++) {
                if (values[i] < threshold || i in seen) {
                    continue;
                }
                seen[i] = true;
                var x1 = px[i];
                var y1 = py[i];
                for (var j = 0; j < count; j++) {
                    if (values[j] >= threshold) {
                        continue;
                    }
                    done = 0;
                    var x2 = px[j];
                    var y2 = py[j];
                    var dx = x2 - x1;
                    var dy = y2 - y1;
                    var d2 = dx * dx + dy * dy;
                    values[j] += influence / d2;
                }
            }
            if (done) {
                break;
            }
        }
        for (var i = 0; i < count; i++) {
            if (values[i] >= threshold) {
                values[i] = 0;
                result.push(i);
            }
        }
    }
    return result;
}

function key(x) {
    return x;
}

function redraw(dt) {
    var result = update(dt);
    if (result.indexOf(0) >= 0) {
        groups.sort(function(a, b) { return b - a; });
        redrawGroups(groups);
        groups = [];
    }
    if (result.length > 0) {
        groups.push(result.length);
    }
    var view = d3.select("#view");
    var rect = view.selectAll("circle").data(result, key);
    rect.enter().append("circle")
        .attr("cx", function(d) { return px[d]; })
        .attr("cy", function(d) { return py[d]; })
        .attr("r", 0.4)
        .attr("fill", "#6fff00")
        .transition()
        .duration(500)
        .styleTween("fill", function(d) {
            return d3.interpolate('#6fff00', '#000000');
        })
        .remove()
        ;
}

function redrawGroups(groups) {
    var children = [];
    for (var i = 0; i < groups.length; i++) {
        children.push({
            value: groups[i]
        });
    }
    var data = {
        children: children
    }
    var bubble = d3.layout.pack()
        .sort(null)
        .size([250, 250])
        .padding(2);
    var svg = d3.select("#groups");
    var node = svg.selectAll("circle")
        .data(bubble.nodes(data).filter(function(d) {
            return !d.children;
        }));
    node.enter().append("circle")
        .style("fill", "#6fff00");
    node.exit().remove();
    node
        .transition()
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", function(d) { return d.r; })
        ;
}

function timer() {
    var now = (new Date()).getTime();
    var elapsed = now - lastUpdate;
    lastUpdate = now;
    if (elapsed < 500) {
        redraw(speed * elapsed / 1000.0);
    }
    setTimeout(timer, 10);
}

reset();
timer();
