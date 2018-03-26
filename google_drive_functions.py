
CLIENT_ID = '460021580483-q7fibho9j73gsgmaloujle7eoat6m9b3.apps.googleusercontent.com'
CLIENT_SECRET = 'hvCN89Iw0XzidPH3bekx69vR'

# Check https://developers.google.com/drive/scopes for all available scopes
OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive'

# Redirect URI for installed apps
REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'

ALL_SCOPES = (
	'https://www.googleapis.com/auth/drive.file '
	'https://www.googleapis.com/auth/userinfo.email '
	'https://www.googleapis.com/auth/userinfo.profile'
)


def GetCodeCredentials(self):
	"""Create OAuth 2.0 credentials by extracting a code and performing OAuth2.0.

	The authorization code is extracted form the URI parameters. If it is absent,
	None is returned immediately. Otherwise, if it is present, it is used to
	perform step 2 of the OAuth 2.0 web server flow.

	Once a token is received, the user information is fetched from the userinfo
	service and stored in the session. The token is saved in the datastore against
	the user ID received from the userinfo service.

	Args:
		request: HTTP request used for extracting an authorization code and the session information.
	Returns:
		OAuth2.0 credentials suitable for authorizing clients or None if
		Authorization could not take place.
	"""
	code = self.request.get('code')
	if not code: # returns None to indicate that no code was passed from Google Drive.
		return None
	oauth_flow = self.CreateOAuthFlow()
	try:
		creds = oauth_flow.step2_exchange(code)
	except FlowExchangeError:
		return None
	users_service = CreateService('oauth2', 'v2', creds)
	userid = users_service.userinfo().get().execute().get('id')
	session = sessions.LilCookies(self, SESSION_SECRET)
	session.set_secure_cookie(name='userid', value=userid)
	StorageByKeyName(Credentials, userid, 'credentials').put(creds)
	return creds

def GetSessionCredentials(self):
	"""Get OAuth 2.0 credentials for an HTTP session.

	If the user has a user id stored in their cookie session, extract that value
	and use it to load that user's credentials from the data store.

	Args:
		request: HTTP request to use session from.
	Returns:
		OAuth2.0 credentials suitable for authorizing clients.
	"""
	# Try to load  the user id from the session
	session = sessions.LilCookies(self, SESSION_SECRET)
	userid = session.get_secure_cookie(name='userid')
	if not userid: # return None to indicate that no credentials could be loaded from the session.
		return None
	# Load the credentials from the data store, using the userid as a key.
	creds = StorageByKeyName(Credentials, userid, 'credentials').get()
	# if the credentials are invalid, return None to indicate that the credentials
	# cannot be used.
	if creds and creds.invalid:
		return None
	return creds

def RedirectAuth(self):
	"""Redirect a handler to an authorization page.

	Used when a handler fails to fetch credentials suitable for making Drive API
	requests. The request is redirected to an OAuth 2.0 authorization approval
	page and on approval, are returned to application.

	Args:
		handler: webapp.RequestHandler to redirect.
	"""
	flow = self.CreateOAuthFlow()

	# Manually add the required scopes. Since this redirect does not originate
	# from the Google Drive UI, which authomatically sets the scopes that are
	# listed in the API Console.
	flow.scope = ALL_SCOPES

	# Create the redirect URI by performing step 1 of the OAuth 2.0 web server
	# flow.
	uri = flow.step1_get_authorize_url(flow.redirect_uri)

	# Perform the redirect.
	self.redirect(uri)

def CreateService(service, version, creds):
	"""Create a Google API service.

	Load an API service from the Discovery API and authorize it with the
	provided credentials.
	
	Args:
		service: Request service (e.g 'drive', 'oauth2').
		version: Version of the service (e.g 'v2').
		creds: Credentials used to authorize service.
		Returns:
			Authorized Google API service.
	"""
def CreateService(service, version, creds):
  """Create a Google API service.

  Load an API service from the Discovery API and authorize it with the
  provided credentials.

  Args:
    service: Request service (e.g 'drive', 'oauth2').
    version: Version of the service (e.g 'v2').
    creds: Credentials used to authorize service.
  Returns:
    Authorized Google API service.
  """
	# Instantiate an Http instance
	http = httplib2.Http()

	# Authorize the Http instance with the passed credentials
	creds.authorize(http)

	# Build a named service from the Discovery API
	return build(service, version, http=http)# Instantiate an Http instance
	http = httplib2.Http()

	# Authorize the Http instance with the passed credentials
	creds.authorize(http)

	# Build a named service from the Discovery API
	return build(service, version, http=http)

def CreateOAuthFlow(self):
	"""Create OAuth2.0 flow controller

	This controller can be used to perform all parts of the OAuth 2.0 dance
	including exchanging an Authorization code.

	Args:
		request: HTTP request to create OAuth2.0 flow for
	Returns:
		OAuth2.0 Flow instance suitable for performing OAuth2.0.
	"""
	flow = flow_from_clientsecrets('client-debug.json', scope='')
	# Dynamically set the redirect_uri based on the request URL. This is extremely
	# convenient for debugging to an alternative host without manually setting the
	# redirect URI.
	flow.redirect_uri = self.request.url.split('?', 1)[0].rsplit('/', 1)[0]
	return flow

class DriveState(object):
	"""Store state provided by Drive."""

	def __init__(self, state):
	"""Create a new instance of drive state.

	Parse and load the JSON state parameter.

	Args:
	  state: State query parameter as a string.
	"""
	state_data = json.loads(state)
	self.action = state_data['action']
	self.ids = map(str, state_data.get('ids', []))

	@classmethod
	def FromRequest(cls, request):
	"""Create a Drive State instance from an HTTP request.

	Args:
		cls: Type this class method is called against.
		request: HTTP request.
	"""
	return DriveState(request.get('state'))

	