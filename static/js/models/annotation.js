// js/models/annotation.js

var metaboscribe = metaboscribe || {};

// MetaboScribe Model
// ------------------
// An annotation has a spectra, start, end, and label

metaboscribe.Annotation = Backbone.Model.extend({
	defaults: {
		left: 0,
		right: 0,
		label: ''
	}
});

