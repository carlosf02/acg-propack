import urllib.request
import urllib.parse
from http.cookiejar import MozillaCookieJar

jar = MozillaCookieJar('cookies.txt')
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

r1 = opener.open('http://127.0.0.1:8000/admin/login/')
csrf_token = ''
for cookie in jar:
    if cookie.name == 'csrftoken':
        csrf_token = cookie.value

data = urllib.parse.urlencode({
    'username': 'admin',
    'password': 'admin',
    'csrfmiddlewaretoken': csrf_token,
    'next': '/admin/'
}).encode('utf-8')

req = urllib.request.Request('http://127.0.0.1:8000/admin/login/', data=data)
req.add_header('Referer', 'http://127.0.0.1:8000/admin/login/')
req.add_header('Origin', 'http://127.0.0.1:8000')

r2 = opener.open(req)
has_session = False
for cookie in jar:
    if cookie.name == 'sessionid':
        has_session = True

if has_session:
    jar.save()
    print("Login successful")
else:
    print("Login failed")
