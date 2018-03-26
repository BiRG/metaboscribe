
import os
import urllib

from google.appengine.api import users
#from google.appengine.ext import ndb

from oauth2client.client import OAuth2WebServerFlow

import jinja2
import webapp2

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'])

def handle_404(request, response, exception):
    """
    This doesn't work
    """
    logging.exception(exception)
    template = JINJA_ENVIRONMENT.get_template('/static/404.html')
    template_values = {}
    response.set_status(404)
    self.response.write(template.render(template_values))

class MainPage(webapp2.RequestHandler):
    def get(self):
        template = JINJA_ENVIRONMENT.get_template('index.html')
        template_values = {}
        self.response.write(template.render(template_values))

class UpdateAnnotation(webapp2.RequestHandler):
	def get(self):
		flow = OAuth2WebServerFlow(CLIENT_ID, CLIENT_SECRET, OAUTH_SCOPE, REDIRECT_URI)
		authorize_url = flow.step1_get_authorize_url()


application = webapp2.WSGIApplication([
    ('/', MainPage),
], debug=True)
#application.error_handlers[404] = handle_404
