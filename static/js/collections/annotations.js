// js/collections/annotations.js

var metaboscribe = metaboscribe || {};

metaboscribe.AnnotationList = Backbone.Collection.extend({
	model: metaboscribe.Annotation,
	nextOrder: function () {    
		if (!this.length) {
			return 1;
		}
		return this.last().get('order') + 1;
	},
	comparator: function (annotation) {
		return annotation.get('order');
	}
});

