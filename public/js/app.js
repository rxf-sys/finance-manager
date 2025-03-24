// app.js - Main functionality for the Budget App

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the app
  initApp();

  // Set up event listeners
  setupEventListeners();

  // Register service worker for PWA functionality
  registerServiceWorker();
});

function initApp() {
  // Check for dark mode preference
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    document.getElementById('dark-mode-toggle').checked = true;
  }

  // Check authentication state
  updateAuthUI();
}

function setupEventListeners() {
  // Dark mode toggle
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', toggleDarkMode);
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Add account button
  const addAccountBtn = document.getElementById('add-account-btn');
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', showAddAccountModal);
  }

  // Add goal button (if goals feature is enabled)
  const addGoalBtn = document.getElementById('add-goal-btn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', showAddGoalModal);
  }
}

function toggleDarkMode(event) {
  if (event.target.checked) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');

    // Update chart colors if charts exist
    updateChartTheme(true);
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');

    // Update chart colors if charts exist
    updateChartTheme(false);
  }
}

function updateChartTheme(isDarkMode) {
  if (window.balanceChart) {
    window.balanceChart.options.legend.labels.fontColor = isDarkMode ? '#fff' : '#666';
    window.balanceChart.update();
  }
}

function updateAuthUI() {
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  document.querySelectorAll('.auth-required').forEach(el => {
    el.style.display = isLoggedIn ? 'block' : 'none';
  });

  document.querySelectorAll('.guest-only').forEach(el => {
    el.style.display = isLoggedIn ? 'none' : 'block';
  });

  // Update user info if logged in
  if (isLoggedIn) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userDisplayEl = document.getElementById('user-display');
    if (userDisplayEl && user.name) {
      userDisplayEl.textContent = user.name;
    }
  }
}

async function handleLogout() {
  try {
    // Call logout API if needed
    await API.logout();
  } catch (error) {
    console.warn('Logout API call failed:', error);
  } finally {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirect to login page
    window.location.href = 'login.html';
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js')
        .then(function(registration) {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(function(error) {
          console.log('ServiceWorker registration failed: ', error);
        });
    });
  }
}

function showAddAccountModal() {
  const modalHTML = `
    <div class="modal fade" id="add-account-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Account</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="add-account-form">
              <div class="mb-3">
                <label for="account-name" class="form-label">Account Name</label>
                <input type="text" class="form-control" id="account-name" required>
              </div>
              <div class="mb-3">
                <label for="account-type" class="form-label">Account Type</label>
                <select class="form-select" id="account-type" required>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit">Credit Card</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="account-balance" class="form-label">Initial Balance</label>
                <input type="number" class="form-control" id="account-balance" step="0.01" required>
              </div>
              <div class="mb-3">
                <label for="account-api-key" class="form-label">Bank API Key (Optional)</label>
                <input type="password" class="form-control" id="account-api-key">
                <div class="form-text">Only needed for automatic balance updates</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="save-account-btn">Save Account</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to DOM
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer.firstChild);

  // Initialize and show modal
  const modal = new bootstrap.Modal(document.getElementById('add-account-modal'));
  modal.show();

  // Add event listener for form submission
  document.getElementById('save-account-btn').addEventListener('click', async function() {
    const form = document.getElementById('add-account-form');

    // Basic validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const accountData = {
      name: document.getElementById('account-name').value,
      type: document.getElementById('account-type').value,
      balance: parseFloat(document.getElementById('account-balance').value),
      apiKey: document.getElementById('account-api-key').value || null
    };

    try {
      await API.addAccount(accountData);
      modal.hide();

      // Remove modal from DOM after hiding
      document.getElementById('add-account-modal').addEventListener('hidden.bs.modal', function() {
        this.remove();
      });

      // Refresh dashboard
      if (typeof refreshDashboardData === 'function') {
        refreshDashboardData();
      }

      showNotification('Account added successfully', 'success');
    } catch (error) {
      console.error('Failed to add account:', error);
      showNotification('Failed to add account', 'danger');
    }
  });
}

function showAddGoalModal() {
  const modalHTML = `
    <div class="modal fade" id="add-goal-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Savings Goal</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="add-goal-form">
              <div class="mb-3">
                <label for="goal-name" class="form-label">Goal Name</label>
                <input type="text" class="form-control" id="goal-name" required>
              </div>
              <div class="mb-3">
                <label for="goal-target-amount" class="form-label">Target Amount</label>
                <input type="number" class="form-control" id="goal-target-amount" step="0.01" required>
              </div>
              <div class="mb-3">
                <label for="goal-current-amount" class="form-label">Current Amount</label>
                <input type="number" class="form-control" id="goal-current-amount" step="0.01" value="0" required>
              </div>
              <div class="mb-3">
                <label for="goal-target-date" class="form-label">Target Date</label>
                <input type="date" class="form-control" id="goal-target-date" required>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="save-goal-btn">Save Goal</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal to DOM
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer.firstChild);

  // Initialize and show modal
  const modal = new bootstrap.Modal(document.getElementById('add-goal-modal'));
  modal.show();

  // Add event listener for form submission
  document.getElementById('save-goal-btn').addEventListener('click', async function() {
    const form = document.getElementById('add-goal-form');

    // Basic validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const goalData = {
      name: document.getElementById('goal-name').value,
      targetAmount: parseFloat(document.getElementById('goal-target-amount').value),
      currentAmount: parseFloat(document.getElementById('goal-current-amount').value),
      targetDate: document.getElementById('goal-target-date').value
    };

    try {
      await API.addGoal(goalData);
      modal.hide();

      // Remove modal from DOM after hiding
      document.getElementById('add-goal-modal').addEventListener('hidden.bs.modal', function() {
        this.remove();
      });

      // Refresh dashboard
      if (typeof refreshDashboardData === 'function') {
        refreshDashboardData();
      }

      showNotification('Goal added successfully', 'success');
    } catch (error) {
      console.error('Failed to add goal:', error);
      showNotification('Failed to add goal', 'danger');
    }
  });
}