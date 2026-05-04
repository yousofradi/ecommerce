/** Admin auth helpers */
function requireAdmin() {
  const key = localStorage.getItem('adminKey');
  const timestamp = localStorage.getItem('loginTimestamp');
  
  if (!key) {
    window.location.href = 'login';
    return false;
  }

  // Check for 30-day timeout (30 * 24 * 60 * 60 * 1000)
  if (timestamp) {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(timestamp) > thirtyDays) {
      logout();
      return false;
    }
  }

  return true;
}
function logout() {
  localStorage.removeItem('adminKey');
  localStorage.removeItem('loginTimestamp');
  window.location.href = 'login';
}

// Global UI Helpers
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
});
