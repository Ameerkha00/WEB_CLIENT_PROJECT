const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

function showMsg(text, type = "danger") {
  msg.className = `alert alert-${type}`;
  msg.textContent = text;
  msg.classList.remove("d-none");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.classList.add("d-none");

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value
      })
    });

    const user = await res.json();
    if (!res.ok) throw new Error(user.message);

    sessionStorage.setItem("currentUser", JSON.stringify(user));
    location.href = "search.html";
  } catch (err) {
    showMsg(err.message);
  }
});
