
var glims = glims || {};

glims.Annotation = Backbone.Model.extend({
	defaults: {
		left: 0,
		right: 0,
		label: ''
	}
});

glims.AnnotationList = Backbone.Collection.extend({
	model: glims.Annotation,
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

glims.AnnotationView = Backbone.View.extend({
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
		glims.View.prototype.myplot.setSelection(binranges);
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
		//this.$el.html(this.template(this.model.attributes));
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
		glims.View.prototype.zoom_to_selection();
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
		glims.AnnotationsApp.annotations.remove(this.model);
		this.remove();
	}
});

glims.AnnotationsView = Backbone.View.extend({
	el: '#annotations_panel',
	initialize: function () {
		this.collection.on('add', this.addOne, this);
	},
	addOne: function (annotation) {
		var view, parent_height, ul;
		view = new glims.AnnotationView({ model: annotation });
		ul = $('ul', this.$el); 
		ul.append(view.render().el);
		parent_height = this.$el.parent().height();
		this.$el.height(parent_height*0.8);
	},
	addAll: function () {
		this.$el.html('');
		glims.Annotations.each(this.addOne, this);
	}
});

glims.AnnotationsApp = new (Backbone.Router.extend({
	initialize: function () {
		this.annotations = new glims.AnnotationList();
		this.annotationsView = new glims.AnnotationsView({collection: this.annotations});
		this.annotationsView.render();
	},
	start: function () {
		Backbone.history.start();
	}
}));

glims.new_file_counter = 0;
var google = google || {};
if (typeof google !== "undefined") google.load('picker', '1');
//var CLIENT_ID = '460021580483-d2ndt0eajv6evoh9dqgnrpmmno8e5umj.apps.googleusercontent.com'; //devel https
var CLIENT_ID = '460021580483-agiou1hsdo08qjqs2bkovaak8etvm103.apps.googleusercontent.com' // devel http
//var CLIENT_ID = '460021580483.apps.googleusercontent.com'; //deploy http
//var CLIENT_ID = '460021580483-q7fibho9j73gsgmaloujle7eoat6m9b3.apps.googleusercontent.com' // deploy https
var SCOPES = 'https://www.googleapis.com/auth/drive';

// should not be in the global scope
function downloadFile(file, callback) {
	if (file.downloadUrl) {
		var accessToken, xhr; 
		accessToken = gapi.auth.getToken().access_token;
	    xhr = new XMLHttpRequest();
	    xhr.open('GET', file.downloadUrl);
	    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
	    xhr.onload = function () {
	    	callback(xhr.responseText);
	    };
	    xhr.onerror = function () {
	    	callback(null);
	    };
	    xhr.send();
	} else {
		callback(null);
	}
}

/**
 * Update an existing file's metadata and content.
 *
 * @param {String} fileId ID of the file to update.
 * @param {Object} fileMetadata existing Drive file's metadata.
 * @param {File} fileData File object to read data from.
 * @param {Function} callback Callback function to call when the request is complete.
 */
function updateFile(fileId, fileMetadata, fileData, callback) {
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  var reader = new FileReader();
  reader.readAsBinaryString(fileData);
  
  reader.onload = function(e) {
    var contentType = fileData.type || 'text/plain';//'application/octet-stream';
    // Updating the metadata is optional and you can instead use the value from drive.files.get.
    var base64Data = btoa(reader.result);
    var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        base64Data +
        close_delim;

    var request = gapi.client.request({
        'path': '/upload/drive/v2/files/' + fileId,
        'method': 'PUT',
        'params': {'uploadType': 'multipart', 'alt': 'json'},
        'headers': {
          'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody});
    if (!callback) {
      callback = function(file) {
        console.log(file)
      };
    }
    request.execute(callback);
  }
  reader.readAsText(fileData);
}

glims.selection_strat_x;
glims.selection_stop_x;

/**
 * User interface controller class.
 * 
 * @constructor
 */
glims.View = function(config) {
	this.config = config || {};
	this.spectra = {};
	this.metabolites = {};
	this.bin = {};
};

glims.View.prototype.addGraphControls = function () {
	
	// add zoom out button
	$('<div class="button" style="right:20px;top:10px">zoom out</div>')
			.appendTo(placeholder).click(function(e) {
				e.preventDefault();
				glims.View.prototype.myplot.zoomOut();
			});
	// add lock y axis button
	$('<div class="button" style="right:78px;top:20px">Lock Y</div>')
	.appendTo(placeholder).click(function (e) {
		e.preventDefault();
		glims.View.prototype.lockYClick(this);
	});
	// add lock x axis button
	$('<div class="button" style="right:78px;top:52px">Lock X</div>')
	.appendTo(placeholder).click(function (e) {
		e.preventDefault();
		glims.View.prototype.lockXClick(this);
	});
	function addArrow(direction, right, top, offset) {
        $('<img class="button" src="js/vendor/flot/arrow-' + direction + '.gif" style="right:' + 
        		right + 'px;top:' + top + 'px">').appendTo(placeholder).click(
        				function (e) {
        					e.preventDefault();
        					glims.View.prototype.myplot.pan(offset);
        				});
    }
    addArrow('left', 45, 52, { left: -50 });
    addArrow('right', 15, 52, { left: 50 });
    addArrow('up', 30, 37, { top: -50 });
    addArrow('down', 30, 67, { top: 50 });
}

/**
 * Creates the user interface of the view.
 */
glims.View.prototype.CreateUi = function() {
	var flotdata;

	this.saver = new glims.SaveNotification();

	$('#graph').click($.proxy(this.CreatePicker, this));
	$('.load_sample_data').click($.proxy(this.CreateSamplePicker, this));
	$('#graph_metabolite').click($.proxy(this.CreateMetabolitePicker, this));
	//$('#process_file').click($.proxy(this.CreateProcessFilePicker, this));
	//$('#upload').change($.proxy(this.UploadFile, this));

	$("#zoom-in").click(glims.View.prototype.scaleMetUpClick);
	$("#zoom-out").click(glims.View.prototype.scaleMetDownClick);
	//$("#save-image").click(glims.SaveImage);
	
	$('#load_annotations').click($.proxy(this.CreateBinPicker, this));
	$('#save_annotations').click($.proxy(this.saveAnnotations, this));
	$('#zoom_to_selection').click($.proxy(glims.View.prototype.zoom_to_selection, this));
	
	var options = {
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
	};
	
	var placeholder = $("#placeholder");
	glims.View.prototype.fixSize();
	
	glims.View.prototype.set_up_selection(placeholder);
	
	flotdata = [];
	glims.View.prototype.myplot = $.plot(placeholder, flotdata, options);
	glims.View.prototype.addGraphControls();
}

glims.View.prototype.set_up_selection = function (placeholder) {
	placeholder.bind("plotselected", function (event, ranges) {
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
}

/**
 * Make the graph the correct size
 */
glims.View.prototype.fixSize = function () {
	'use strict';
	var placeholder, parent_width, good_height, thirds;
	placeholder = $('#placeholder');
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
}

/**
 * Called when the Upload is clicked
 */
glims.View.prototype.UploadFile = function (evt) {
	// evt.target is $(<input type="file" id="upload">) 
	var files = evt.target.files; // FileList object
	
	for (var i=0, f; f=files[i]; i++) { // for each file selected		
		var reader = new FileReader();
		// closure to capture the file information
		reader.onload = (function(theFile) {
			return function(e) {
				var text = e.target.result;
				var lines = text.split("\n");
				var metadataKey = lines[0].split("\t");
				for (var i=0; i < metadataKey.length; i++) {
					metadataKey[i] = metadataKey[i].trim();
				}
				var metadata = {};
				var dataStart = 0;
				for (var i=0; i<metadataKey.length; i++) {
					metadata[metadataKey[i]] = {};
					if (metadataKey[i+1]==="X") {
						dataStart = i+1;
						break;
					}
				}
				var datamap = {};
				defaultLine = lines[1].split("\t");
				var data = {};
				for (var i=1; i<lines.length; i++) { // for-each line
					var line = lines[i].split("\t");
					for (var j=0; j<dataStart; j++) { // for-each data item
						var folder;
						if (line[j] !== "") {
							folder = metadata[metadataKey[j]][line[j]] = [];
						} else {
							folder = metadata[metadataKey[j]][defaultLine[j]];
						}
						if (folder.indexOf(line[dataStart]) < 0) {
							folder.push(line[dataStart]);
						}
					}
					var y_val = line[dataStart];
					data[y_val] = metadataKey[dataStart] + "\t" + y_val;
					for (var j=dataStart+1; j<defaultLine.length; j++) {
						//TODO make this more efficient
						data[y_val] += "\n" + metadataKey[j] + "\t" + line[j];
					}
				}
				glims.View.prototype.CreateFolder(JSON.stringify(metadata), JSON.stringify(data));
				
			};
		})(f);
		reader.readAsText(f);
	}
}

/**
 * Creates a spectrum for a file ID.
 * 
 * @param {string}
 *            File's ID or an empty string for a new file.
 */
glims.View.prototype.CreateSpectrum = function(file_id) {
	console.log('creating specturm');
	$('#graph').addClass('disabled').html('<i class="icon-spinner icon-spin"></i> Loading...');
	var spectrum = new glims.Spectrum(this);
	spectrum.Load(file_id);
	this.spectra[spectrum.tab_id] = spectrum;
}

glims.View.prototype.CreateBin = function(file_id) {
	$('#annotation_actions').addClass('disabled').html('<i class="icon-spinner icon-spin"></i> Loading...');
	var bin = new glims.Bin(this);
	bin.Load(file_id);
	this.bin[bin.tab_id] = bin;
}

/**
 * makes the ajax call to create folders on drive
 * there is nothing on the other end of this anymore
 * there is no /createfolder
 * if this functionality is still needed, it should be 
 * implemented diretly through the js api
 */
glims.View.prototype.CreateFolder = function(metadata, data) {
	//console.log('metadata: \n' + metadata);
	console.log('method CreateFolder doesnt work');
	$.ajax({
		type : 'post',
		url : '/createfolder',
		data : {'metadata': metadata, 'data': data},
		success : this.CreateFolderSuccess,
		error : this.ServiceError
	});
}

glims.View.prototype.CreateFolderSuccess = function(data, result, xhr) {
	console.log('create folder success')
}

glims.View.prototype.scale_to_y = function () {
	var placeholder = $('#placeholder');
	
}

glims.View.prototype.zoom_to_selection = function () {
	var selection = glims.View.prototype.myplot.getSelection(),
		graphdata, options, ymin, ymax, placeholder;
	
	if (!selection)
		return;
	
	graphdata = glims.View.prototype.generateGraphData();
	placeholder = $('#placeholder');
	
	//get the y-min and y-max for the selected x range
	var plotdata = glims.View.prototype.myplot.getData();
	$.each(plotdata, function (e, val) {
		$.each(val.data, function (e1, val1) {
			if ((val1[0] >= selection.xaxis.from) && (val1[0] <= selection.xaxis.to)) {
				if (ymax == null || val1[1] > ymax)
					ymax = val1[1];
				if (ymin == null || val1[1] < ymin)
					ymin = val1[1];
			}
		})
	});
	ymax = ymax * 1.1;
	ymin = ymin < 0 ? ymin * 1.1 : ymin * 0.9;
	
	options = {
		series : {
			shadowSize : 0
		},
		yaxes : [ { position : 'left' } ], // removed min: 0
		zoom : { interactive : true },
		selection: { mode: "x" },
		legend: {
			show: true,
			position: 'nw'
		},
		xaxis: {
			min: selection.xaxis.from,
			max: selection.xaxis.to
		},
		yaxis: {
			min: ymin,
			max: ymax
		}
	};
	
	glims.View.prototype.myplot = $.plot(placeholder, graphdata, options);
	//placeholder.unbind("plotselected");
	//glims.View.prototype.myplot.setSelection(selection);
	glims.View.prototype.addGraphControls();
	//glims.View.prototype.set_up_selection(placeholder);
}

/**
 * create a metabolite for a fileId
 * Load 
 */
glims.View.prototype.CreateMetabolite = function(file_id) {
	$('#graph_metabolite').addClass('disabled').html('<i class="icon-spinner icon-spin"></i> Loading...');
	var metabolite = new glims.Metabolite(this);
	console.log('creating metabolie...');
	metabolite.Load(file_id);
	metabolite.file_id = file_id
	metabolite.tab_id = file_id
	this.metabolites[file_id] = metabolite;	
}

/**
 * Takes a tab delimited file on drive and turns it into gLIMS format
 */
glims.View.prototype.ProcessFile = function(file_id) {
	$.ajax({
		url : '/write?file_id=' + file_id,
		success : glims.prototype.ProcessFileSuccess,
		error : glims.prototype.ProcessFileError,
		context : this
	});
}

glims.View.prototype.PickerSelected = function(data) {
	if (data.action === 'picked') {
		for (i in data.docs) {
			this.CreateSpectrum(data.docs[i].id);
		}
	}
}

glims.View.prototype.BinSelected = function(data) {
	if (data.action === 'picked') {
		for (i in data.docs) {
			this.CreateBin(data.docs[i].id);
		}
	}
}

glims.View.prototype.MetabolitePickerSelected = function(data) {
	if (data.action === 'picked') {
		for (i in data.docs) {
			this.CreateMetabolite(data.docs[i].id);
		}
	}
}

glims.View.prototype.ProcessFilePickerSelected = function(data) {
	if (data.action === 'picked') {
		for (i in data.docs) {
			this.ProcessFile(data.docs[i].id);
		}
	}
}

/**
 * Create a picker for load spectra
 */
glims.View.prototype.CreatePicker = function() {
	var view = new google.picker.View(google.picker.ViewId.FOLDERS);
	view.setParent("root");
	var view2 = new google.picker.View(google.picker.ViewId.FOLDERS);
	view2.setParent("root");
	var view3 = new google.picker.View(google.picker.ViewId.DOCS);
	view3.setMimeTypes('text/plain, text/html, application/vnd.google-apps.folder, text/csv');
	pickleBuilder = new google.picker.PickerBuilder();
	pickleBuilder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
	picker = pickleBuilder.setAppId(glims.CLIENT_ID).setSelectableMimeTypes(
			'text/plain, text/html, application/vnd.google-apps.folder, text/csv')
			.addView(view).addView(view2).addView(view3).setCallback(
					$.proxy(this.PickerSelected, this)).build();
	picker.setVisible(true);
}

/**
 * Create a picker for the left-right bins (annotations)
 */
glims.View.prototype.CreateBinPicker = function () {
	
	var view = new google.picker.View(google.picker.ViewId.FOLDERS);
	view.setParent('root');
	
	var picker = new google.picker.PickerBuilder()
	.setAppId(glims.CLIENT_ID)
	.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
	.addView(view)
	.setCallback($.proxy(this.BinSelected, this))
	.build();
	picker.setVisible(true);
}

glims.View.prototype.saveAnnotations = function () {
	var doc_str, annotation_data;
	doc_str = 'left, right, annotation\n';
	glims.AnnotationsApp.annotations.each(
			function (a) {
				doc_str += a.get('left')+','+a.get('right')+','+a.get('label')+'\n';
			}
	);
	annotation_data = "{'content': '" + doc_str + "', 'title': '" + glims.Bin.prototype.active_annotation_file.title + "', "
		+ "'description': 'annotation', 'mimeType': 'text/plain', "
		+ "'resource_id': '" + glims.Bin.prototype.active_annotation_file.resource_id + "'}";
	// $.ajax({
	// 	type : 'PUT',
	// 	url : '/actual',
	// 	data : annotation_data,
	// 	success : this.saveAnnotationsSuccess,
	// 	error : this.saveAnnotationsError,
	// 	//dataType: 'text',
	// 	//contentType: 'text/plain',
	// 	context : this
	// });
	
	updateFile(glims.Bin.prototype.active_annotation_file.title, {}, doc_str, glims.View.prototype.saveAnnotationsCallback);
}

glims.View.prototype.saveAnnotationsCallback = function () {
	console.log('here we are in the saveAnnotationsCallback');
}

glims.View.prototype.saveAnnotationsSuccess = function (data, result, xhr) {
	console.log('annotations saved');
}

glims.View.prototype.saveAnnotationsError = function (xhr, text_status, error) {
	console.log(error);
}

/**
 * Create a picker for the sample data picker
 */
glims.View.prototype.CreateSamplePicker = function() {
	var view = new google.picker.View(google.picker.ViewId.FOLDERS);
	view.setParent("0B7Jfx3RRVE5Yc3YyeVFlX1E5X3c");
	var view3 = new google.picker.View(google.picker.ViewId.DOCS);
	view3.setMimeTypes('text/plain, text/html, application/vnd.google-apps.folder, text/csv');
	pickerBuilder = new google.picker.PickerBuilder();
	pickerBuilder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
	picker = pickerBuilder.setAppId(glims.CLIENT_ID).setSelectableMimeTypes(
			'text/plain, text/html, application/vnd.google-apps.folder, text/csv')
			.addView(view).addView(view3).setCallback(
					$.proxy(this.PickerSelected, this)).build();
	picker.setVisible(true);
}

/**
 * Create a picker for load metabolite
 * taiwan data still hard-coded
 */
glims.View.prototype.CreateMetabolitePicker = function() {
	var view = new google.picker.View(google.picker.ViewId.DOCS);
	view.setParent("0B7Jfx3RRVE5YMHJGRlk3eWlDN0k");

	pickleBuilder = new google.picker.PickerBuilder();
	pickleBuilder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
	picker = pickleBuilder.setAppId(glims.CLIENT_ID).addView(view).setCallback(
			$.proxy(this.MetabolitePickerSelected, this)).build();
	picker.setVisible(true);
}

/**
 * create picker for process file
 * pick a file to turn into gLIMS format
 */
glims.View.prototype.CreateProcessFilePicker = function() {
	var view = new google.picker.View(google.picker.ViewId.FOLDERS);
	view.setParent("root");
	pickleBuilder = new google.picker.PickerBuilder();
	picker = pickleBuilder.setAppId(glims.CLIENT_ID).addView(view).setCallback(
			$.proxy(this.ProcessFilePickerSelected, this)).build();
	picker.setVisible(true);
}

/**
 * plot all the active spectra on the spectra flot graph
 */
glims.View.prototype.drawGraph = function (graphdata) {
	
	this.myplot.setData(graphdata);
	this.myplot.setupGrid();
	this.myplot.draw();
}

glims.View.prototype.generateGraphData = function() {
	var graphdata = [];
	for (id in glims.main.view.active_spectra) {
		var entry = {};
		entry.yaxis = 1;
		entry.label = glims.main.view.spectra[id].title;
		entry.data = glims.main.view.spectra[id].formatted;
		var line = {};
		line.show = true;
		entry.lines = line;
		graphdata.push(entry); // this needs to be a page and a metabolite
	}
	for (id in glims.main.view.active_metabolites) {
		var entry = {};
		entry.yaxis = 2;
		entry.label = glims.main.view.metabolites[id].title;
		var met_json = glims.main.view.metabolites[id].content;
		entry.data = [];
		var i = 0;
		for (i = 0; i < met_json.locations.length; i++) {
			for (j = 0; j < met_json.locations[i].length; j++) {
				entry.data.push([eval(met_json.locations[i][j]),eval(met_json.intensities[i][j])]);
			}
		}
		var bar = {};
		bar.show = true;
		bar.barWidth = 0.001;
		entry.bars = bar;
		graphdata.push(entry); // this needs to be a page and a metabolite
	}
	return graphdata;
}

/**
 * add a spectrum to the list of active spectra
 */
glims.View.prototype.addSpectrum = function(spectrum) {
	glims.main.view.active_spectra = glims.main.view.active_spectra || {};
	glims.main.view.active_spectra[spectrum.file_id] = spectrum;
}

/**
 * remove a spectrum from the list of active spectra
 */
glims.View.prototype.removeSpectrum = function(spectrum) {
	delete glims.main.view.active_spectra[spectrum.file_id];
}

/**
 * add a metabolite to the list of active metabolites
 */
glims.View.prototype.addMetabolite = function(metabolite) {
	glims.main.view.active_metabolites = glims.main.view.active_metabolites || {};
	glims.main.view.active_metabolites[metabolite.file_id] = metabolite;
}

/**
 * remove a metabolite from the list of active metabolites
 */
glims.View.prototype.removeMetabolite = function(metabolite) {
	delete glims.main.view.active_metabolites[metabolite.file_id];
}

/**
 * Model for an individual spectrum.
 * 
 * @constructor
 */
glims.Spectrum = function(view) {
	this.file_id = null;
	this.title = null;
	this.description = null;
	this.content = null;
	this.position = null;
	this.view = view;
	this.parents = null;
}

glims.Bin = function(view) {
	this.file_id = null;
	this.title = null;
	this.description = null;
	this.content = null;
	this.position = null;
	this.view = view;
	this.parents = null;
}

/**
 * Model for an individual metabolite.
 * 
 * @constructor
 */
glims.Metabolite = function(view) {
	this.file_id = null;
	this.title = null;
	this.description = null;
	this.content = null;
	this.position = null;
	this.view = view;
	this.parents = null;
}

/**
 * Load a file from the server.
 * 
 * @param {string}
 *            file ID to load or an empty string for a new file.
 */
glims.Spectrum.prototype.Load = function(file_id) {
	console.log('Spectrum Loading...');
	if (!file_id) {
		this.tab_id = glims.new_file_counter++ + "";
		this.Empty();
	} else {
		this.file_id = file_id;
		this.tab_id = file_id;
		this.Get();
	}
}

glims.Metabolite.prototype.Load = function(file_id) {
	if (!file_id) {
		this.tab_id = glims.new_file_counter++ + "";
		this.Empty();
	} else {
		this.file_id = file_id;
		this.tab_id = file_id;
		this.Get();
	}
}

glims.Bin.prototype.Load = function(file_id) {
	if (!file_id) {
		this.tab_id = glims.new_file_counter++ + "";
		this.Empty();
	} else {
		this.file_id = file_id;
		this.tab_id = file_id;
		this.Get();
	}
}

glims.Spectrum.prototype.Empty = function(file_id) {
	this.GetSuccess({
		'title' : 'untitled.html',
		'content' : '',
		'mimeType' : 'text/html',
		'description' : '',
		'parents' : ''
	});
}

glims.prototype.ProcessFileSuccess = function (data, result, xhr) {
	if (data.redirect) {
		window.location.href = data.redirect;
	} else {
		console.log('File successfully parsed by gLIMs!');
	}
}

glims.prototype.ProcessFileError = function (xhr, text_status, error) {
	console.log('there was an error processing the file for glims');
}

/**
 * Used as the callback for the ajax call
 */
glims.Bin.prototype.GetSuccess = function (data, result, xhr) {
	//glims.Bin.prototype.addBin(data);
}

glims.Bin.prototype.addBin = function (data, file_id) {
	var i, j, split_data, fields, left, right, label;
	glims.Bin.prototype.active_annotation_file = {};
	glims.Bin.prototype.active_annotation_file.title = file_id;
	//glims.Bin.prototype.active_annotation_file.resource_id = data.resource_id; 
	// what's the difference between resource_id and file_id?
	data_lines = data.split('\n');
	console.log(data_lines);
	// ignore first line: "left right"
	for (i=1; i<data_lines.length; i++) {
		fields = data_lines[i].split(',');
		for (j=0; j<fields.length; j++) {
			fields[j] = fields[j].trim();
		}
		if (fields.length != 0) {			
			left = fields[0];
			right = fields[1];
			label = fields[2];
			if (left !== '') {
				var new_bin = new glims.Annotation({'left': left, 'right': right, 'label': label});
				glims.AnnotationsApp.annotations.add(new_bin);
			}
		}
	}
	$('#annotation_actions').removeClass('disabled').html('Actions <icon class="icon-caret-down"></icon>');
}

//glims.Spectrum.prototype.GetSuccess = function(data, result, xhr) {
//	"use strict";
//	var start, end, line, i, ul, li, a;
//	if (data.redirect) {
//		window.location.href = data.redirect;
//	} else {
//		this.title = data.title;
//		this.content = data.content;
//		this.mimetype = data.mimeType;
//		this.description = data.description;
//		this.parents = data.parents;
//		
//		start = this.content.indexOf('Y');
//		end = this.content.indexOf('\n', start);
//		this.y = this.content.substring(start, end);
//		
//		// format the data for flot
//		this.lines = this.content.split('\n');
//		line = this.lines[1].split("\t");
//		this.formatted = [];
//		this.formatted.push([JSON.parse(line[0]),JSON.parse(line[1])]);
//		for ( i = 2; i < this.lines.length - 1; i++) {
//			line = this.lines[i].split("\t");
//			this.formatted.push([eval(line[0]),eval(line[1])]);
//		}
//		
//		ul = $('#spectra_panel ul');
//		if (ul.find('li:first').text() === 'No spectra loaded') {
//			ul.html('');
//		}
//		a = $('<a href="#">').append(this.title).click(this.fileClicked);
//		a.attr("spectrumId", this.file_id).attr("active", true);
//		li = $('<li>').append(a);
//		ul.append(li);
//		
//		$.proxy(glims.Spectrum.prototype.fileClicked, a)();
//	}
//}

/*
glims.Spectrum.prototype.GetSuccess = function(data, result, xhr) {
	"use strict";
//	if (this.view.spectra.hasOwnProperty(data.resource_id)) // check to see if already loaded this file
//		return;
	if (data.redirect) {
		window.location.href = data.redirect;
	} else {
		this.title = data.title;
		this.content = data.content;
		this.mimetype = data.mimeType;
		this.description = data.description;
		this.parents = data.parents;
		
		var start = this.content.indexOf('Y');
		var end = this.content.indexOf('\n', start);
		this.y = this.content.substring(start, end);
		
		// format the data for flot
		this.lines = this.content.split('\n');
		var line = this.lines[1].split("\t");
		this.formatted = [];
		this.formatted.push([JSON.parse(line[0]),JSON.parse(line[1])]);
		//this.formatted.push([eval(line[0]),eval(line[1])]);
		for ( var i = 2; i < this.lines.length - 1; i++) {
			var line = this.lines[i].split("\t");
			this.formatted.push([eval(line[0]),eval(line[1])]);
		}

				
		if (this.parents) {
			this.parents = JSON.parse(this.parents);
			// get at all the data in the spectra
			glims.View.prototype.metadata = glims.View.prototype.metadata || {};
			var metadata = glims.View.prototype.metadata;

			var buttons = $('#parents');

			// this loop does two things: updates the js metadata tree and adds
			// buttons for metadata and files to the tree
			for (metaKey in this.parents) {
				var metaVal = this.parents[metaKey];
				if (!metadata[metaKey]) { // this metadata category is not already in the tree
					metadata[metaKey] = new Object();
					metadata[metaKey][metaVal] = new Array();

					// add metakey, metaval, and file buttons
					var keyDiv = $('<div>').attr('id', metaKey);
					var keyButton = $('<button>' + metaKey + '</button>')
							.addClass('btn');
					keyDiv.append(keyButton);
					var valDiv = $('<div>').attr('id', metaVal).addClass("val");
					var valButton = $('<button>' + metaVal + '</button>')
							.addClass("btn");
					valDiv.append(valButton);
					keyDiv.append(valDiv);
					var fileBtnDiv = $('<div>').attr('id', this.title)
							.addClass("file");
					var fileBtn = $('<button>' + this.title + '</button>')
							.addClass('btn').click(this.fileClicked);
					fileBtn.attr("spectrumId", this.file_id);
					fileBtnDiv.append(fileBtn);
					valDiv.append(fileBtnDiv);
					buttons.append(keyDiv);
				} else { // metadata catetory in the tree
					if (!metadata[metaKey][metaVal]) { // metadata value not in tree
						metadata[metaKey][metaVal] = new Array();

						// add metaval and file buttons to tree
						var keyDiv = $('div').filter(function() {
							return this.id == metaKey
						});
						var valDiv = $('<div>').attr('id', metaVal).addClass(
								"val");
						var valButton = $('<button>' + metaVal + '</button>')
								.addClass("btn");
						valDiv.append(valButton);
						keyDiv.append(valDiv);
						var fileBtnDiv = $('<div>').attr('id', this.title)
								.addClass("file");
						var fileBtn = $('<button>' + this.title + '</button>')
								.addClass('btn').click(this.fileClicked);
						fileBtn.attr("spectrumId", this.file_id);
						fileBtnDiv.append(fileBtn);
						valDiv.append(fileBtnDiv);
						buttons.append(keyDiv);
					} else { // metadata key and value already in tree

						// add a file button
						var valDiv = $('div').filter(function() {
							return this.id == metaVal
						});
						var fileBtnDiv = $('<div>').attr('id', this.title)
								.addClass("val");
						var fileBtn = $('<button>' + this.title + '</button>')
								.addClass('btn').click(this.fileClicked);
						fileBtn.attr("spectrumId", this.file_id);
						fileBtnDiv.append(fileBtn);
						valDiv.append(fileBtnDiv);
						buttons.append(keyDiv);
					}
				}
				metadata[metaKey][metaVal].push(this);
			}
		} else { // data did not come with parent information
			glims.View.prototype.graphables = glims.View.prototype.graphables || {};
			var metadata = glims.View.prototype.graphables;
			var fileBtn = $('<button>' + this.title + '</button>')
					.addClass('btn').click(this.fileClicked);
			fileBtn.attr("spectrumId", this.file_id);
			$('#graphable-pane').append(fileBtn);
		}
	} // not redirected
} //GetSuccess
*/

/**
 * called when the ajax call succeeds
 * adds metabolite data to the tree
 */
glims.Metabolite.prototype.GetMetaboliteSuccess = function(data, result, xhr) {
	var ul, a, li;
	if (data.redirect) {
		window.location.href = data.redirect;
	} else {
		this.title = data['title'];
		this.content = data['content'];
		this.mimetype = data['mimeType'];
		this.description = data['description'];
//		this.parents = data['parents'];
//
//		this.parents = JSON.parse(this.parents);
		this.content = JSON.parse(this.content);
		
		// get at all the data in the spectra
		glims.View.prototype.metabolite_metadata = glims.View.prototype.metabolite_metadata || {};
		var metadata = glims.View.prototype.metabolite_metadata;
		
		ul = $('#metabolites_panel ul');
		if (ul.find('li:first').text() === 'No metabolites loaded') {
			ul.html('');
		}
		a = $('<a href="#" class="label">').append(this.title).click(this.fileClicked);
		a.attr("metaboliteId", this.file_id).attr("active", true);
		li = $('<li>').append(a);
		ul.append(li);
		
		$('#graph_metabolite').removeClass('disabled').html('<i class="icon-cloud-download icon"></i> Load');
		
		$.proxy(glims.Metabolite.prototype.fileClicked, a)();

		/*
		var buttons = $('#metabolites_parents');
		// this loop does two things: updates the js metadata tree and adds buttons for metadata and files to the tree
		for (metaKey in this.parents) {
			var metaVal = this.parents[metaKey];
			if (!metadata[metaKey]) { // this metadata category is not already in the tree
				metadata[metaKey] = new Object();
				metadata[metaKey][metaVal] = new Array();
				
				// add metakey, metaval, and file buttons
				var keyDiv = $('<div>').attr('id', metaKey);
				var keyButton = $('<button>' + metaKey + '</button>').addClass('btn');
				keyDiv.append(keyButton);
				var valDiv = $('<div>').attr('id', metaVal).addClass("val");
				var valButton = $('<button>' + metaVal + '</button>').addClass("btn");
				valDiv.append(valButton);
				keyDiv.append(valDiv);
				var fileBtnDiv = $('<div>').attr('id', this.title).addClass("file");
				var fileBtn = $('<button>' + this.title + '</button>').addClass('btn').click(this.fileClicked);
				fileBtn.attr("metaboliteId", this.file_id);
				fileBtnDiv.append(fileBtn);
				valDiv.append(fileBtnDiv);
				buttons.append(keyDiv);

			} else { // metadata catetory in the tree
				if (!metadata[metaKey][metaVal]) { // metadata value not in tree
					metadata[metaKey][metaVal] = new Array();
					
					// add metaval and file buttons to tree
					var keyDiv = $('div').filter(function(){ return this.id == metaKey});
					var valDiv = $('<div>').attr('id', metaVal).addClass("val");
					var valButton = $('<button>' + metaVal + '</button>').addClass("btn");
					valDiv.append(valButton);
					keyDiv.append(valDiv);
					var fileBtnDiv = $('<div>').attr('id', this.title).addClass("file");
					var fileBtn = $('<button>' + this.title + '</button>').addClass('btn').click(this.fileClicked);
					fileBtn.attr("metaboliteId", this.file_id);
					fileBtnDiv.append(fileBtn);
					valDiv.append(fileBtnDiv);
					buttons.append(keyDiv);
					
				} else { // metadata key and value already in tree
					
					// add a file button
					var valDiv = $('div').filter(function(){ return this.id == metaVal});
					var fileBtnDiv = $('<div>').attr('id', this.title).addClass("val");
					var fileBtn = $('<button>' + this.title + '</button>').addClass('btn').click(this.fileClicked);
					fileBtn.attr("metaboliteId", this.file_id);
					fileBtnDiv.append(fileBtn);
					valDiv.append(fileBtnDiv);
					buttons.append(keyDiv);
				}
			}
			metadata[metaKey][metaVal].push(this);
		}
		*/
	}
}

/**
 * increase the metabolites' relative size
 */
glims.View.prototype.scaleMetUpClick = function() {
	axes = glims.View.prototype.myplot.getAxes();
	axes.y2axis.options.max = axes.y2axis.max*0.9;
	fracToZero = axes.yaxis.min/(axes.yaxis.max - axes.yaxis.min);
	axes.y2axis.options.min = axes.y2axis.options.max/(1/fracToZero + 1); 
	glims.View.prototype.myplot.setupGrid();
	glims.View.prototype.myplot.draw();
}

/**
 * shrink the metabolites' relative size
 */
glims.View.prototype.scaleMetDownClick = function() {
	axes = glims.View.prototype.myplot.getAxes();
	axes.y2axis.options.max = axes.y2axis.max*1.1;
	fracToZero = axes.yaxis.min/(axes.yaxis.max - axes.yaxis.min);
	axes.y2axis.options.min = axes.y2axis.options.max/(1/fracToZero + 1); 
	glims.View.prototype.myplot.setupGrid();
	glims.View.prototype.myplot.draw();
}

/**
 * Lock and unlock the xaxis zoom
 */
glims.View.prototype.lockXClick = function (btn) {
	// if you set the zoom range, this will cause you a problem
	var xAxis = glims.View.prototype.myplot.getAxes().xaxis;
	if (xAxis.options.zoomRange === false) {
		xAxis.options.zoomRange = null;
		$(btn).html('Lock X');
	} else {
		xAxis.options.zoomRange = false;
		$(btn).html('Unlock X');
	}
}

/**
 * Lock and unlock the yaxis zoom
 */
glims.View.prototype.lockYClick = function (btn) {
	var yAxis = glims.View.prototype.myplot.getAxes().yaxis;
	var y2Axis = glims.View.prototype.myplot.getAxes().y2axis;
	if (yAxis.options.zoomRange === false) {
		yAxis.options.zoomRange = null;
		if (y2Axis)
			y2Axis.options.zoomRange = null;
		$(btn).html('Lock Y');
	} else {
		yAxis.options.zoomRange = false;
		if (y2Axis)
			y2Axis.options.zoomRange = false;
		$(btn).html('Unlock Y');
	}
}

/**
 * graphs or clears a spectra on click
 */
glims.Spectrum.prototype.fileClicked = function() {
	var spectrumId = $(this).attr('spectrumId');
	var clickedPage = glims.main.view.spectra[spectrumId];
	if ($(this).hasClass('label-success')) {
		glims.View.prototype.removeSpectrum(clickedPage);
	} else {
		glims.View.prototype.addSpectrum(clickedPage);
	}
	var graphdata = glims.View.prototype.generateGraphData();
	glims.View.prototype.drawGraph(graphdata);
	$("[spectrumId="+spectrumId+"]").toggleClass('label-success');
}

/**
 * graphs or clears a metabolite on click
 */
glims.Metabolite.prototype.fileClicked = function () {
	'use strict';
	var metaboliteId, clickedMetabolite, graphdata;
	metaboliteId = $(this).attr('metaboliteId');
	clickedMetabolite = glims.main.view.metabolites[metaboliteId];
	if ($(this).hasClass('label-success')) {
		glims.View.prototype.removeMetabolite(clickedMetabolite);
	} else {
		glims.View.prototype.addMetabolite(clickedMetabolite);
	}
	graphdata = glims.View.prototype.generateGraphData();
	glims.View.prototype.drawGraph(graphdata);
	$("[metaboliteId="+metaboliteId+"]").toggleClass('label-success');
}


glims.Spectrum.prototype.metaCatClicked = function() {
	console.log("clicked: " + this.innerHTML);
}

glims.Spectrum.prototype.metaValClicked = function() {
	console.log("clicked: " + this.innerHTML);
}

glims.Spectrum.prototype.ServiceError = function(xhr, text_status, error) {
	console.log(error);
}

glims.Bin.prototype.ServiceError = function(xhr, text_status, error) {
	var error_div = $('<div class="alert alert-error">').text(error);
	$('#annotation_actions').removeClass('disabled').html('Actions <icon class="icon-caret-down"></icon>');
	$('#annotations_panel').append(error_div);
}

glims.View.prototype.ServiceError = function(xhr, text_status, error) {
	console.log(error);
}

glims.prototype.format_for_flot = function (flot_data) {
	
	var lines = flot_data.split('\n'),
		line,
		formatted = [],
		split_symbol = '\t';
	
	if (lines[1].split(split_symbol).length === 1) {
		split_symbol = ',';
	}
	
	for (i = 1; i < lines.length-1; i++) {
		line = lines[i].split(split_symbol);
		formatted.push([parseFloat(line[0]), parseFloat(line[1])]);
	}
	return formatted;
}

glims.Spectrum.prototype.Get = function () {
	var that = this;
	gapi.auth.authorize(
			{ 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true },
			function (authResp) {
				// should check authResp
				console.log('authoization respone revieved...');
				if (authResp === null) {
				    alert('failed to authorize');
				    return;
				}
				var request = gapi.client.drive.files.get({ 'fileId': that.file_id });
				request.execute(
						function (resp) {
							that.title = resp.title;
							that.content = resp.content;
							that.mimetype = resp.mimeType;
							that.description = resp.description;
							that.parents = resp.parents;
							downloadFile(resp, function (fileContent) {
								
								that.formatted = glims.prototype.format_for_flot(fileContent);
								
								ul = $('#spectra_panel ul');
								if (ul.find('li:first').text() === 'No spectra loaded') {
									ul.html('');
								}
								a = $('<a href="#" class="label">').append(that.title).click(that.fileClicked);
								a.attr("spectrumId", that.file_id).attr("active", true);
								li = $('<li>').append(a);
								ul.append(li);
								
								$('#graph').removeClass('disabled').html('<i class="icon-cloud-download icon"></i> Load');
								
								$.proxy(glims.Spectrum.prototype.fileClicked, a)();
							});
						});
			});
}

glims.Metabolite.prototype.Get = function () {
	console.log('getting metabolite...');
	var that = this;
	gapi.auth.authorize(
		{ 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true },
		function (authResp) {
			if (authResp === null) {
				alert('failed to authorize');
				return;
			}
			var request = gapi.client.drive.files.get({ 'fileId': that.file_id });
			request.execute(
				function (resp) {
					that.title = resp.title;
					//that.content = resp.content;
					that.mimetype = resp.mimeType;
					//that.description = resp.description;
					that.parents = resp.parents;
					downloadFile(resp, function (fileContent) {
						
						// that.formatted = glims.prototype.format_for_flot(fileContent);
						that.content = JSON.parse(fileContent);
						ul = $('#metabolites_panel ul');
						if (ul.find('li:first').text() === 'No metabolites loaded') {
							ul.html('');
						}
						a = $('<a href="#" class="label">').append(that.title).click(that.fileClicked);
						a.attr("metaboliteId", that.file_id).attr("active", true);
						li = $('<li>').append(a);
						ul.append(li);
						
						$('#graph_metabolite').removeClass('disabled').html('<i class="icon-cloud-download icon"></i> Load');
						
						$.proxy(glims.Metabolite.prototype.fileClicked, a)();
					});
				});
		});
	console.log('done.');
}

glims.Bin.prototype.Get = function() {
	console.log('getting bin...');
	var that = this;
	gapi.auth.authorize(
		{ 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true },
		function (authResp) {
			if (authResp === null) {
				alert('failed to authorize');
				return;
			}
			var request = gapi.client.drive.files.get({ 'fileId': that.file_id });
			request.execute(
				function (resp) {
					console.log(resp);
					downloadFile(resp, function (fileContent) {
						console.log('adding bin...');
						glims.Bin.prototype.addBin(fileContent, resp.id);
						console.log('done.');
					});
				});
		});
	console.log('done.');
}

/**
 * show/hide the talking to glims message
 */
glims.SaveNotification = function () {
	$('#saving').hide() // hide it initially
	.ajaxStart(function() {
		$(this).show();
		glims.blocked = true;
	}).ajaxStop(function() {
		$(this).hide();
		glims.blocked = false;
	});
}

function glims () {
	this.view = new glims.View();
	this.view.CreateUi();
}

$(document).ready(function () {
	glims.main = new glims();
	$(window).resize(function () {
		glims.View.prototype.fixSize();
	});
	glims.AnnotationsApp.start();
	console.log('loading drive api...');
	gapi.client.load('drive', 'v2');
	console.log('done.');
});
