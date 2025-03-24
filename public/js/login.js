// login.js - Login and registration functionality

document.addEventListener('DOMContentLoaded', function() {
  // Handle login form submission
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Handle registration form submission
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegistration);
  }

  // Handle form toggle if both forms are on the same page
  const formToggle = document.getElementById('form-toggle');
  if (formToggle) {
    formToggle.addEventListener('click', toggleForms);
  }

  // Check if user is already logged in
  if (localStorage.getItem('token')) {
    window.location.href = 'index.html';
  }
});

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    document.getElementById('login-spinner').classList.remove('d-none');
    document.getElementById('login-btn').disabled = true;

    const response = await API.login({ email, password });

    // Store token and user info
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));

    // Redirect to dashboard
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Login failed:', error);

    const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
    showLoginError(errorMessage);

    document.getElementById('login-spinner').classList.add('d-none');
    document.getElementById('login-btn').disabled = false;
  }
}

async function handleRegistration(event) {
  event.preventDefault();

  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  // Check if passwords match
  if (password !== confirmPassword) {
    showRegistrationError('Passwords do not match');
    return;
  }

  try {
    document.getElementById('register-spinner').classList.remove('d-none');
    document.getElementById('register-btn').disabled = true;

    const response = await API.register({ name, email, password });

    // Store token and user info
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));

    // Redirect to dashboard
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Registration failed:', error);

    const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
    showRegistrationError(errorMessage);

    document.getElementById('register-spinner').classList.add('d-none');
    document.getElementById('register-btn').disabled = false;
  }
}

function showLoginError(message) {
  const errorAlert = document.getElementById('login-error');
  errorAlert.textContent = message;
  errorAlert.classList.remove('d-none');

  // Hide error after 5 seconds
  setTimeout(() => {
    errorAlert.classList.add('d-none');
  }, 5000);
}

function showRegistrationError(message) {
  const errorAlert = document.getElementById('register-error');
  errorAlert.textContent = message;
  errorAlert.classList.remove('d-none');

  // Hide error after 5 seconds
  setTimeout(() => {
    errorAlert.classList.add('d-none');
  }, 5000);
}

function toggleForms() {
  const loginForm = document.getElementById('login-container');
  const registerForm = document.getElementById('register-container');

  if (loginForm.classList.contains('d-none')) {
    // Switch to login form
    loginForm.classList.remove('d-none');
    registerForm.classList.add('d-none');
    document.getElementById('form-toggle').textContent = 'Create an account';
  } else {
    // Switch to registration form
    loginForm.classList.add('d-none');
    registerForm.classList.remove('d-none');
    document.getElementById('form-toggle').textContent = 'Already have an account? Login';
  }
}