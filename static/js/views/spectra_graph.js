// js/views/spectra_graph.js

var metaboscribe = metaboscribe || {};

metaboscribe.SpectraGraph = Backbone.View.extend({
    el: '#placeholder',
    options: {
		series : {
			shadowSize : 0
		},
		// xaxis: { zoomRange: [0.1, 10], invert: true},
		yaxes : [ { min : 0, position : 'left' } ],
		zoom : { interactive : true },
		//pan : { interactive : true },
		selection: { mode: "x" },
		legend: {
			show: true,
			position: 'nw'
		}
	},
	add_graph_controls: function () {
	    // add zoom out button
	    $('<div class="button" style="right:20px;top:10px">zoom out</div>').appendTo(placeholder).click(
	        function(e) {
	            e.preventDefault();
	            //glims.View.prototype.myplot.zoomOut();
	        });
	    // add lock y axis button
	    $('<div class="button" style="right:78px;top:20px">Lock Y</div>').appendTo(placeholder).click(
	        function (e) {
		        e.preventDefault();
		        //glims.View.prototype.lockYClick(this);
		    });
	    // add lock x axis button
	    $('<div class="button" style="right:78px;top:52px">Lock X</div>').appendTo(placeholder).click(
	        function (e) {
		        e.preventDefault();
		        //glims.View.prototype.lockXClick(this);
    	    });
	    function addArrow(direction, right, top, offset) {
            $('<img class="button" src="js/vendor/flot/arrow-' 
                    + direction + '.gif" style="right:' 
                    + right + 'px;top:' + top + 'px">')
                    .appendTo(placeholder).click(
                function (e) {
                    e.preventDefault();
                    //glims.View.prototype.myplot.pan(offset);
                });
        }
        addArrow('left', 45, 52, { left: -50 });
        addArrow('right', 15, 52, { left: 50 });
        addArrow('up', 30, 37, { top: -50 });
        addArrow('down', 30, 67, { top: 50 });
	},
	set_up_selection: function () {
	// much of this function is now incorrect
	    $el.bind("plotselected", function (event, ranges) {
		    var checkbox = $('#zoom_to_selection_checkbox');
		    glims.selection_start_x = ranges.xaxis.from.toFixed(1);
		    glims.selection_stop_x = ranges.xaxis.to.toFixed(1);
            $("#selection").text(glims.selection_start_x + " to " + glims.selection_stop_x);
            if (checkbox.attr('checked')) {
            	glims.View.prototype.zoom_to_selection();
            }
        });
	
	    placeholder.bind("plotunselected", function (event) {
            $("#selection").text("");
        });
	},
	fix_size: function () {
	    'use strict';
	    var placeholder, parent_width, good_height, thirds;
	    placeholder = this.$el;
	    parent_width = placeholder.parent().width();
	    good_height = parent_width / 1.4;
	    if (good_height > innerHeight - 80)
		    good_height = innerHeight - 80;
	    thirds = good_height / 3;
	    placeholder.width(parent_width);
	    placeholder.height(good_height);
	    $('#spectra').height(thirds);
	    $('#metabolites').height(thirds);
	    $('#annotations').height(thirds);
	},
	initialize: function () {
	    this.myplot = $.plot(this.$el, [], this.options);
	    this.add_graph_controls();
	    this.fix_size();
	    //this.set_up_selection();
	}
});
