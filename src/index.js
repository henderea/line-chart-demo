require('./index.scss');
const $ = require('jquery');
const _ = require('lodash');
const d3 = require('d3');
const d3Tip = require('d3-tip').default;

import registerServiceWorker from '@henderea/static-site-builder/registerServiceWorker';
registerServiceWorker();

const baseData = require('./data.json');

const processData = data => {
    return _.map(data, d => {
        return {
            date: d.description.replace(/^.*?(\d{1,2}[/]\d{1,2}[/]\d{4})\s+[-–]\s+.*$/, '$1').replace(/(^|[/])0(\d)(?=[/])/g, '$1$2'),
            description: d.description,
            overall: _.round((d.rawMetrics.amrCallQualityScore + d.rawMetrics.emeaCallQualityScore) / (d.rawMetrics.amrSampleSize + d.rawMetrics.emeaSampleSize), 2),
            amr: _.round(d.rawMetrics.amrCallQualityScore / d.rawMetrics.amrSampleSize, 2),
            emea: _.round(d.rawMetrics.emeaCallQualityScore / d.rawMetrics.emeaSampleSize, 2)
        }
    })
}

const data = processData(baseData);

class ChartSizing {
    constructor(fullWidth, fullHeight = 500, top = 20, right = 20, bottom = 60, left = 50) {
        this._fullWidth = fullWidth;
        this._fullHeight = fullHeight;
        this._top = top;
        this._right = right;
        this._bottom = bottom;
        this._left = left;
    }

    get top() { return this._top; }

    get right() { return this._right; }

    get bottom() { return this._bottom; }

    get left() { return this._left; }

    get fullWidth() { return this._fullWidth; }

    get fullHeight() { return this._fullHeight; }

    get width() { return this.fullWidth - this.left - this.right; }

    get height() { return this.fullHeight - this.top - this.bottom; }
}

function draw(data, field, sizes) {
    $('.d3-tip').remove();
    const svg = d3.create('svg')
        .attr('width', sizes.fullWidth)
        .attr('height', sizes.fullHeight);
    var tip = d3Tip()
        .attr('class', 'd3-tip')
        .offset([-20, 0])
        .html(d => `<p class="big">Score: <b>${d[field]}</b></p><p>${d.description}</p>`);
    var g = svg.append('g')
        .attr('transform', `translate(${sizes.left},${sizes.top})`);
    g.call(tip);
    var x = d3.scalePoint()
        .domain(_.map(data, 'date'))
        .rangeRound([0, sizes.width]);
    const fullRange = _.min(_.map(data, field)) < 2;
    var y = d3.scaleLinear()
        .domain([fullRange ? 1 : 2, 5])
        .range([sizes.height, 0]);

    g.append('g')
        .attr('class', 'axis x')
        .attr('transform', `translate(0,${sizes.height})`)
        .call(d3.axisBottom(x).ticks(data.length));

    g.append('g')
        .attr('class', 'axis y')
        .attr('transform', 'translate(0,0)')
        .call(d3.axisLeft(y).tickFormat(d3.format('.2f')).ticks(fullRange ? 10 : 8));

    g.selectAll('.y-line')
        .data(_.range(fullRange ? 1.5 : 2.5, 5.5, 0.5))
        .enter().append('line')
        .attr('x1', 0)
        .attr('x2', sizes.width)
        .attr('y1', d => y(d))
        .attr('y2', d => y(d))
        .attr('stroke', '#b8b8b8')
        .attr('stroke-width', 1);

    g.append('line')
        .attr('x1', 0)
        .attr('x2', sizes.width)
        .attr('y1', y(fullRange ? 1 : 2))
        .attr('y2', y(fullRange ? 1 : 2))
        .attr('stroke', '#000000')
        .attr('stroke-width', 1);

    var line = d3.line()
        .defined(d => !_.isNaN(d[field]))
        .x(d => {
            return x(d.date)
        })
        .y(d => {
            return y(d[field])
        });

    g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#7cc5ec')
        .attr('stroke-width', 6)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('d', line);

    const nodes = g.selectAll('.node')
        .data(data)
        .enter().append('circle')
        .attr('transform', d => `translate(${x(d.date)}, ${y(d[field])})`)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .attr('r', 9)
        .attr('fill', '#ffffff')
        .attr('stroke', '#1dafec')
        .attr('stroke-width', 8);

    d3.select('#chartDiv').append(() => svg.node());
}

$(function() {
    const sizes = new ChartSizing(1000);
    let mode = location.search.replace(/^.*mode=(\w+)$/, '$1').toLowerCase();
    if(!_.includes(['overall', 'amr', 'emea'], mode)) { mode = 'overall'; }
    draw(data, mode, sizes);
});