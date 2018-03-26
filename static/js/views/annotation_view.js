// js/views/annotation_view.js

var metaboscribe = metaboscribe || {};

metaboscribe.AnnotationView = Backbone.View.extend({
	tagName: 'li',
	template: _.template($('#annotation-template').html()),
	events: {
		'click label':	'edit',
		'contextmenu': 'right_click_menu',
		'keypress .edit':	'updateOnEnter',
		'mousedown .annotation_remove': 'clear',
		'blur .edit':		'close'
		//'click .annotation_change': 'edit'
	},
	set_selection: function () {
		var fields, binranges;
		fields = this.get_fields();
		binranges = { 'xaxis': { 'from': fields[0], 'to': fields[1] } };
		metaboscribe.View.prototype.myplot.setSelection(binranges);
	},
	right_click_menu: function (e) {
		e.preventDefault();
		
		console.log('right click');
	},
	initialize: function () {
		this.listenTo(this.model, 'change', this.render);
		this.listenTo(this.model, 'visible', this.toggleVisible);
	},
	render: function () {
		this.$el.html(this.template(this.model.toJSON()));
		this.$input = this.$('.edit');
		return this;
	},
	toggleVisible: function () {
		var view, edit;
		view = this.$('.annotation_view');
		edit = this.$('.annotation_edit');
		if (this.$el.hasClass('editing')) {
			view.css('display', 'none');
			edit.css('display', 'block');
		} else {
			edit.css('display', 'none');
			view.css('display', 'block');
		}
	},
	edit: function () {
		this.$el.addClass('editing');
		this.toggleVisible();
		this.$input.focus();
		this.set_selection();
		metaboscribe.View.prototype.zoom_to_selection();
	},
	get_fields: function () {
		var value, fields, i;
		value = this.$input.val().trim();
		fields = value.split(',');
		for (i=0; i<3; i++) {
			if (i > fields.length-1)
				fields[i] = '';
			else
				fields[i] = fields[i].trim();
		}
		return fields;
	},
	close: function () {
		var fields, len, left, right, label;
		fields = this.get_fields();
		this.$el.removeClass('editing');
		if (_.every(fields, function (a) {return a===''})) {
			this.clear();
			return;
		}
		this.model.set({ 'left': fields[0], 'right': fields[1], 'label': fields[2]});
		this.toggleVisible();
		this.$el.removeClass('editing');
	},
	updateOnEnter: function (e) {
		if (e.which === 13) { // 13 === enter key
			this.close();
		}
	},
	iconremove: function (e) {
		this.clear();
	},
	clear: function () {
		metaboscribe.AnnotationsApp.annotations.remove(this.model);
		this.remove();
	}
});

