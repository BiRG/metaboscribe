// js/models/spectrum.js

var metaboscribe = metaboscribe || {};

// MetaboScribe Model
// ------------------
// A spectrum is ...

metaboscribe.Spectrum = Backbone.Model.extend({
	defaults: {
	    file_id: '',
		title: '',
		content: '',
		mimetype: '',
		description: '',
		parents: ''
	},
	initialize: function (file_id) {
	    // handed a file id by the picker, a spectrum needs to get its data
	    // from drive through the jsapi
	    console.log('creating a new spectrum with file id: ' + file_id);
	    
	},
	retrieve_from_drive: function () {
	    var that = this;
	    gapi.auth.authorize(
			    { 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true },
			    function (authResp) {
				    // should check authResp
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
});

