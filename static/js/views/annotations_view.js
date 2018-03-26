// js/views/annotations_view.js

var metaboscribe = metaboscribe || {};

metaboscribe.AnnotationsView = Backbone.View.extend({
	el: '#annotations_panel',
	initialize: function () {
		this.collection.on('add', this.addOne, this);
	},
	addOne: function (annotation) {
		var view, parent_height, ul;
		view = new metaboscribe.AnnotationView({ model: annotation });
		ul = $('ul', this.$el); 
		ul.append(view.render().el);
		parent_height = this.$el.parent().height();
		this.$el.height(parent_height*0.8);
	},
	addAll: function () {
		this.$el.html('');
		metaboscribe.Annotations.each(this.addOne, this);
	}
});

