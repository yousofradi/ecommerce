/** Admin auth helpers */
function requireAdmin() {
  if (!sessionStorage.getItem('adminKey')) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}
function logout() {
  sessionStorage.removeItem('adminKey');
  window.location.href = 'login.html';
}
