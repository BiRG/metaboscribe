// js/views/metaboscribe_view.js

var metaboscribe = metaboscribe || {};

(function ($) {
    'use strict';
    
	// The Application
	// ---------------

	// Our overall **AppView** is the top-level piece of UI.
	// this is not actually being used
	// left this here to think about good architecture
	metaboscribe.AppView = Backbone.View.extend({
	    el: '#graph-and-metabolites',
	    
	    initialize: function () {
	        console.log('initializing the top level view');
	    }
	});    
})(jQuery);

