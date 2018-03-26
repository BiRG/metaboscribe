// js/router.js

var metaboscribe = metaboscribe || {};

var MetaboScribe = Backbone.Router.extend({
    routes: {
        "": "index"
    }, 
    initialize: function () {
        console.log('initializing router');
        this.appView = new metaboscribe.AppView();
        this.spectrumView = new metaboscribe.SpectrumView();
        this.spectraView = new metaboscribe.SpectraView();
        this.spectraGraph = new metaboscribe.SpectraGraph();
        this.annotations = new metaboscribe.AnnotationList();
		this.annotationsView = new metaboscribe.AnnotationsView({collection: this.annotations});
		this.annotationsView.render();
    },
    index: function () {
        console.log('index');
    }
});

