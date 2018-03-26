// js/config.js

var metaboscribe = metaboscribe || {};

metaboscribe.config = {
    'debug': true,
    'local': true
};

if (metaboscribe.config.local) {
    metaboscribe.CLIENT_ID = '1015223624366-23a743ammg85bssqieltkgahv20pvrvg.apps.googleusercontent.com';
} else { // deployment settings
    metaboscribe.CLIENT_ID = '1015223624366.apps.googleusercontent.com';
}
// settings applying to local and deployment
metaboscribe.SCOPES = 'https://www.googleapis.com/auth/drive';

// app setup
google.load('picker', '1');

