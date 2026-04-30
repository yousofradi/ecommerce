/** Admin auth helpers */
function requireAdmin() {
  if (!localStorage.getItem('adminKey')) {
    window.location.href = 'login';
    return false;
  }
  return true;
}
function logout() {
  localStorage.removeItem('adminKey');
  window.location.href = 'login';
}
