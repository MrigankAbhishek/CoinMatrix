// auth.js

function openSignupModal() {
  document.getElementById('signupModal').style.display = 'flex';
}

function closeSignupModal() {
  document.getElementById('signupModal').style.display = 'none';
}

function openLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'toast show';
  if (isError) {
    toast.classList.add('error');
  }

  setTimeout(() => {
    toast.className = toast.className.replace('show', '');
  }, 3000);
}

// --- USER STATE MANAGEMENT ---

function showLoggedInState(username) {
  document.querySelector('.auth-area').style.display = 'none';
  const userInfo = document.getElementById('user-info');
  userInfo.style.display = 'flex';
  document.getElementById('username-display').textContent = username;
}

function showLoggedOutState() {
  document.querySelector('.auth-area').style.display = 'flex';
  document.getElementById('user-info').style.display = 'none';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('loggedInUser');
  showLoggedOutState(); 
  window.location.reload(); 
}

function checkLoginState() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('loggedInUser');
  if (token && username) {
    showLoggedInState(username);
  } else {
    showLoggedOutState();
  }
}

async function submitSignup(event) {
  event.preventDefault();
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  try {
    const response = await fetch('http://localhost:8080/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An unknown error occurred.');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('loggedInUser', data.username);
    showToast('Signup successful! You are now logged in.');
    closeSignupModal();
    showLoggedInState(data.username);

    if (typeof initializeStars === 'function') initializeStars();

  } catch (err) {
    showToast(`Signup failed: ${err.message}`, true);
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch('http://localhost:8080/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Invalid credentials.');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('loggedInUser', data.username);
    showToast('Login successful!');
    closeLoginModal();
    showLoggedInState(data.username);

    if (typeof initializeStars === 'function') initializeStars();
    if (window.location.pathname.includes('bookmarked.html')) {
      window.location.reload();
    }

  } catch (err) {
    showToast(`Login failed: ${err.message}`, true);
  }
}

document.addEventListener('DOMContentLoaded', checkLoginState);

