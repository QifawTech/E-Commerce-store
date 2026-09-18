document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const alertBox = document.getElementById('alert-box');

  try {
    const response = await fetch('http://localhost:5000/api/login', { // Unga backend URL & port
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      alertBox.className = 'alert alert-success';
      alertBox.textContent = 'Login successful!';
      alertBox.classList.remove('d-none');
      
      // Token store panni redirect panna:
      localStorage.setItem('token', data.token);
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } else {
      alertBox.className = 'alert alert-danger';
      alertBox.textContent = data.message || 'Login failed!';
      alertBox.classList.remove('d-none');
    }
  } catch (error) {
    console.error('Error:', error);
    alertBox.className = 'alert alert-danger';
    alertBox.textContent = 'Cannot connect to the server!';
    alertBox.classList.remove('d-none');
  }
});