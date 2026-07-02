// Default environment configuration (dev)
// override in files env.[env].ts
namespace Config {
  // same-origin as the page that served the client, so the auth cookie is sent
  // and there's no localhost/127.0.0.1 origin mismatch. Works over http and https.
  var apiUrl = window.location.protocol + '//' + window.location.host + '/api';
  var socketUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;

  var html5Mode: boolean = false;

  export var environment = {
    production: true,
    apiUrl: apiUrl,
    html5Mode: html5Mode,
    socketUrl: socketUrl,
    badwords: /(shit|fuck)/gi,
    logins: [
      {
        url: apiUrl + '/account/login?provider=Google',
        label: "Sign in with Google",
        icon: 'google'
      },
      {
        url: apiUrl + '/account/login?provider=Facebook',
        label: "Sign in with Facebook",
        icon: 'facebook'
      }],
  };
}
