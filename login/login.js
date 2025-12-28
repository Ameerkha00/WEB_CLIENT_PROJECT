const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function showMessage(text, type = "danger") {
  msg.className = `alert alert-${type}`;
  msg.textContent = text;
  msg.classList.remove("d-none");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  msg.classList.add("d-none");

  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");

  usernameEl.classList.remove("is-invalid");
  passwordEl.classList.remove("is-invalid");

  const username = usernameEl.value.trim();
  const password = passwordEl.value;

  let ok = true;
  if (!username) { usernameEl.classList.add("is-invalid"); ok = false; }
  if (!password) { passwordEl.classList.add("is-invalid"); ok = false; }
  if (!ok) return;

  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || user.password !== password) {
    showMessage("Invalid username or password.");
    return;
  }

  // ✅ required by spec: store currentUser in SESSION storage
  sessionStorage.setItem("currentUser", JSON.stringify({
    username: user.username,
    firstName: user.firstName,
    imageUrl: user.imageUrl
  }));

  showMessage("Login successful! Redirecting...", "success");

  // ✅ required by spec: redirect to search page after login
  setTimeout(() => {
    window.location.href = "../search/search.html";
  }, 500);
});
