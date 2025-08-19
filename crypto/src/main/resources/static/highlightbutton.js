
const navItems = document.querySelectorAll('.subnav-item');

navItems.forEach(item => {
  item.addEventListener('click', function (e) {
    e.preventDefault(); // Optional: Prevent page jump
    document.querySelector('.subnav-item.active')?.classList.remove('active');
    this.classList.add('active');
  });
});

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
function showUser(username) {
  document.querySelector('.auth-area').style.display = 'none';
  document.getElementById('user-info').style.display = 'block';
  document.getElementById('username-display').textContent = username;

  // Optional: save to localStorage to persist
  localStorage.setItem('loggedInUser', username);
}
// Handle signup
function submitSignup(event) {
  event.preventDefault();
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  fetch('http://localhost:8080/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  })
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      closeSignupModal();
      showUser(username);
    })
    .catch(err => alert('Signup failed: ' + err));
}

// Handle login
function submitLogin(event) {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  fetch('http://localhost:8080/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(res => {
      if (!res.ok) throw new Error("Invalid credentials");
      return res.text();
    })
    .then(msg => {
      alert(msg);
      closeLoginModal();
      showUser(username); 
    })
    .catch(err => alert('Login failed: ' + err));
}