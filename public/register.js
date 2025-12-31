const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");
const imageInput = document.getElementById("imageFile");
const preview = document.getElementById("preview");

let imageBase64 = null;

function showMsg(text, type = "danger") {
  msg.className = `alert alert-${type}`;
  msg.textContent = text;
  msg.classList.remove("d-none");
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    imageBase64 = reader.result;
    preview.src = imageBase64;
    preview.classList.remove("d-none");
  };
  reader.readAsDataURL(file);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.classList.add("d-none");

  const data = {
    username: username.value.trim(),
    firstName: firstName.value.trim(),
    password: password.value,
    imageUrl: imageBase64
  };

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const out = await res.json();
    if (!res.ok) throw new Error(out.message);

    showMsg("Account created! Redirecting to login…", "success");
    setTimeout(() => location.href = "login.html", 800);
  } catch (err) {
    showMsg(err.message);
  }
});
