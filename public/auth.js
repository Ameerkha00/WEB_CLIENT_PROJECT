// public/auth.js
export function getCurrentUser() {
  const raw = sessionStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

export function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

export function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "login.html";
}
