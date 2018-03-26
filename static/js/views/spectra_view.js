// js/views/spectra_view.js

var metaboscribe = metaboscribe || {};

metaboscribe.SpectraView = Backbone.View.extend({
	el: '#spectra',
	events: {
	    'click #load_spectra': 'create_picker'
	},
	initialize: function () {
	    console.log('initializing spectra view');
	},
	create_picker: function () {
	    var folders_view, docs_view, picker;
	    
	    folders_view = new google.picker.View(google.picker.ViewId.FOLDERS).setParent("root");
	    docs_view = new google.picker.View(google.picker.ViewId.DOCS);
	    docs_view.setMimeTypes('text/plain, text/html, application/vnd.google-apps.folder, text/csv');
	    
	    picker = new google.picker.PickerBuilder();
	    picker.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
	    picker = picker.setAppId(metaboscribe.CLIENT_ID).setSelectableMimeTypes(
	            'text/plain, text/html, application/vnd.google-apps.folder, text/csv')
			    .addView(folders_view).addView(docs_view).setCallback(this.picker_selected).build();
	    picker.setVisible(true);
	},
	picker_selected: function (data) {
	    var spectrum;
        if (data.action === 'picked') {
            for (i in data.docs) {
                // create a new spectrum
                spectrum = new metaboscribe.Spectrum(data.docs[i].id);
            }
        }
	},
	addOne: function (spectrum) {
		//var view, parent_height, ul;
		//view = new metaboscribe.AnnotationView({ model: annotation });
		//ul = $('ul', this.$el); 
		//ul.append(view.render().el);
		//parent_height = this.$el.parent().height();
		//this.$el.height(parent_height*0.8);
	},
	addAll: function () {
		//this.$el.html('');
		//metaboscribe.Annotations.each(this.addOne, this);
	}
});

