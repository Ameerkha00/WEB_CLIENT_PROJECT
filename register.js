document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("msg");

  const imageInput = document.getElementById("imageFile");
  const preview = document.getElementById("preview");

  let imageBase64 = null;

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem("users")) || [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
  }

  function isValidPassword(pw) {
    const hasLetter = /[A-Za-z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    return pw.length >= 6 && hasLetter && hasNumber && hasSpecial;
  }

  function showMessage(text, type = "danger") {
    msg.className = `alert alert-${type}`;
    msg.textContent = text;
    msg.classList.remove("d-none");
  }

  // Image -> Base64 + Preview
  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) {
      imageBase64 = null;
      preview.classList.add("d-none");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      imageBase64 = reader.result;
      preview.src = imageBase64;
      preview.classList.remove("d-none");
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.classList.add("d-none");

    const usernameEl = document.getElementById("username");
    const firstNameEl = document.getElementById("firstName");
    const passwordEl = document.getElementById("password");
    const confirmEl = document.getElementById("confirmPassword");

    // Reset errors
    [usernameEl, firstNameEl, imageInput, passwordEl, confirmEl].forEach(el => {
      el.classList.remove("is-invalid");
    });

    const username = usernameEl.value.trim();
    const firstName = firstNameEl.value.trim();
    const password = passwordEl.value;
    const confirmPassword = confirmEl.value;

    // Required fields
    let ok = true;
    if (!username) { usernameEl.classList.add("is-invalid"); ok = false; }
    if (!firstName) { firstNameEl.classList.add("is-invalid"); ok = false; }
    if (!imageBase64) { imageInput.classList.add("is-invalid"); ok = false; }
    if (!password) { passwordEl.classList.add("is-invalid"); ok = false; }
    if (!confirmPassword) { confirmEl.classList.add("is-invalid"); ok = false; }
    if (!ok) {
      showMessage("Please fill all required fields.");
      return;
    }

    // Username unique
    const users = getUsers();
    const exists = users.some(u => (u.username || "").toLowerCase() === username.toLowerCase());
    if (exists) {
      usernameEl.classList.add("is-invalid");
      showMessage("This username has already been used. Choose another one.");
      return;
    }

    // Password rules
    if (!isValidPassword(password)) {
      passwordEl.classList.add("is-invalid");
      showMessage("Password must be at least 6 characters and include a letter, a number, and a special character.");
      return;
    }

    // Confirm password
    if (password !== confirmPassword) {
      confirmEl.classList.add("is-invalid");
      showMessage("Passwords do not match.");
      return;
    }

    // Save user
    users.push({
      username,
      firstName,
      imageUrl: imageBase64,
      password
    });

    saveUsers(users);

    // Success notification + redirect
    showMessage("Account created successfully! Redirecting to login...", "success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
  });
});
