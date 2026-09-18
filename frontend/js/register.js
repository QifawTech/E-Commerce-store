document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const category = document.getElementById('category').value;
  const alertBox = document.getElementById('alert-box');

  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, category })
    });

    const data = await res.json();

    if (res.ok) {
      alertBox.className = 'alert alert-success';
      alertBox.textContent = 'Registration successful! Redirecting to login...';
      alertBox.classList.remove('d-none');
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } else {
      alertBox.className = 'alert alert-danger';
      alertBox.textContent = data.message || 'Registration failed';
      alertBox.classList.remove('d-none');
    }
  } catch (err) {
    alertBox.className = 'alert alert-danger';
    alertBox.textContent = 'Server connection error';
    alertBox.classList.remove('d-none');
  }
});