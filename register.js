// register.js (FULL) — works on PC/mobile, compresses image to avoid localStorage quota,
// shows messages, checks username uniqueness, redirects to login on success.

const msg = document.getElementById("msg");
const form = document.getElementById("registerForm");

const imageInput = document.getElementById("imageFile");
const preview = document.getElementById("preview");

const usernameEl = document.getElementById("username");
const firstNameEl = document.getElementById("firstName");
const passwordEl = document.getElementById("password");
const confirmEl = document.getElementById("confirmPassword");

let imageBase64 = null;

/* ------------------ helpers ------------------ */
function showMessage(text, type = "danger") {
  msg.className = `alert alert-${type}`;
  msg.textContent = text;
  msg.classList.remove("d-none");
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem("users")) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem("users", JSON.stringify(users));
    return true;
  } catch (e) {
    console.error("saveUsers failed:", e);
    return false;
  }
}

function isValidPassword(pw) {
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return pw.length >= 6 && hasLetter && hasNumber && hasSpecial;
}

function setInvalid(el, isInvalid) {
  if (!el) return;
  el.classList.toggle("is-invalid", !!isInvalid);
}

/* ------------------ sanity checks ------------------ */
if (!msg || !form || !imageInput || !preview || !usernameEl || !firstNameEl || !passwordEl || !confirmEl) {
  console.error("Missing required elements. Check IDs in register.html.");
  alert("Register page is missing required element IDs. Open Console (F12).");
}

/* ------------------ image handling (resize + compress) ------------------ */
imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];

  if (!file) {
    imageBase64 = null;
    preview.classList.add("d-none");
    return;
  }

  // Optional: reject extremely large files early (prevents slow browser)
  const maxFileMB = 5;
  if (file.size > maxFileMB * 1024 * 1024) {
    imageBase64 = null;
    preview.classList.add("d-none");
    imageInput.value = "";
    showMessage(`Image is too large. Please choose an image under ${maxFileMB}MB.`, "danger");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();

    img.onload = () => {
      const maxSize = 256; // px (good for avatar + small storage)
      let w = img.width;
      let h = img.height;

      // Keep aspect ratio, shrink if needed
      if (w > h) {
        if (w > maxSize) {
          h = Math.round((h * maxSize) / w);
          w = maxSize;
        }
      } else {
        if (h > maxSize) {
          w = Math.round((w * maxSize) / h);
          h = maxSize;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      // Compress to JPEG to reduce size (quality 0.7 is usually enough)
      imageBase64 = canvas.toDataURL("image/jpeg", 0.7);

      preview.src = imageBase64;
      preview.classList.remove("d-none");

      setInvalid(imageInput, false);
    };

    img.onerror = () => {
      imageBase64 = null;
      preview.classList.add("d-none");
      imageInput.value = "";
      showMessage("Could not read image. Try a different file.", "danger");
    };

    img.src = reader.result;
  };

  reader.onerror = () => {
    imageBase64 = null;
    preview.classList.add("d-none");
    imageInput.value = "";
    showMessage("Failed to load image file.", "danger");
  };

  reader.readAsDataURL(file);
});

/* ------------------ submit ------------------ */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  msg.classList.add("d-none");

  // reset invalid states
  [usernameEl, firstNameEl, imageInput, passwordEl, confirmEl].forEach(el => setInvalid(el, false));

  const username = usernameEl.value.trim();
  const firstName = firstNameEl.value.trim();
  const password = passwordEl.value;
  const confirmPassword = confirmEl.value;

  // Required checks
  let ok = true;
  if (!username) { setInvalid(usernameEl, true); ok = false; }
  if (!firstName) { setInvalid(firstNameEl, true); ok = false; }
  if (!imageBase64) { setInvalid(imageInput, true); ok = false; }
  if (!password) { setInvalid(passwordEl, true); ok = false; }
  if (!confirmPassword) { setInvalid(confirmEl, true); ok = false; }

  if (!ok) {
    showMessage("Please fill all required fields (including choosing an image).");
    return;
  }

  // Username unique
  const users = getUsers();
  const exists = users.some(u => (u.username || "").toLowerCase() === username.toLowerCase());
  if (exists) {
    setInvalid(usernameEl, true);
    showMessage("This username has already been used. Choose another one.");
    return;
  }

  // Password rules
  if (!isValidPassword(password)) {
    setInvalid(passwordEl, true);
    showMessage("Password must be at least 6 characters and include a letter, a number, and a special character.");
    return;
  }

  // Confirm matches
  if (password !== confirmPassword) {
    setInvalid(confirmEl, true);
    showMessage("Passwords do not match.");
    return;
  }

  // Save user
  users.push({
    username,
    firstName,
    imageUrl: imageBase64, // compressed base64 image
    password
  });

  const saved = saveUsers(users);
  if (!saved) {
    showMessage("Storage is full. Try a smaller image or clear site storage and try again.", "danger");
    return;
  }

  showMessage("Account created successfully! Redirecting to login...", "success");

  setTimeout(() => {
    window.location.assign("login.html");
  }, 900);
});
