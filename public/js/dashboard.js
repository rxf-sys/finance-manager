// dashboard.js - Dashboard functions for the Budget App

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }

  // Initialize dashboard
  initDashboard();
});

async function initDashboard() {
  try {
    // Show loading spinner
    document.getElementById('loading-spinner').classList.remove('d-none');

    // Fetch account data
    const accounts = await API.getAccounts();

    // Fetch recent transactions
    const transactions = await API.getRecentTransactions();

    // Fetch goals if feature is enabled
    let goals = [];
    if (document.getElementById('goals-section')) {
      goals = await API.getGoals();
    }

    // Update UI with fetched data
    updateAccountsDisplay(accounts);
    updateBalanceDisplay(accounts);
    updateTransactionsDisplay(transactions);

    // Update goals if feature is enabled
    if (document.getElementById('goals-section')) {
      updateGoalsDisplay(goals);
    }

    // Setup refresh button
    document.getElementById('refresh-data').addEventListener('click', refreshDashboardData);

    // Setup transaction form
    document.getElementById('add-transaction-form').addEventListener('submit', handleAddTransaction);

    // Hide loading spinner
    document.getElementById('loading-spinner').classList.add('d-none');
  } catch (error) {
    console.error('Dashboard initialization failed:', error);
    showNotification('Failed to load dashboard data', 'danger');
    document.getElementById('loading-spinner').classList.add('d-none');
  }
}

function updateAccountsDisplay(accounts) {
  const accountsContainer = document.getElementById('accounts-list');
  accountsContainer.innerHTML = '';

  accounts.forEach(account => {
    const accountCard = document.createElement('div');
    accountCard.className = 'card mb-3 account-card';
    accountCard.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${account.name}</h5>
        <h6 class="card-subtitle mb-2 text-muted">${account.type}</h6>
        <p class="card-text balance ${account.balance >= 0 ? 'text-success' : 'text-danger'}">
          ${formatCurrency(account.balance)}
        </p>
        <button class="btn btn-sm btn-outline-primary view-transactions" data-account-id="${account._id}">
          View Transactions
        </button>
      </div>
    `;
    accountsContainer.appendChild(accountCard);
  });

  // Add event listeners to view transaction buttons
  document.querySelectorAll('.view-transactions').forEach(button => {
    button.addEventListener('click', function() {
      const accountId = this.getAttribute('data-account-id');
      showAccountTransactions(accountId);
    });
  });
}

function updateBalanceDisplay(accounts) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const balanceElement = document.getElementById('total-balance');

  balanceElement.textContent = formatCurrency(totalBalance);
  balanceElement.className = totalBalance >= 0 ? 'text-success' : 'text-danger';

  // Update the balance chart
  updateBalanceChart(accounts);
}

function updateTransactionsDisplay(transactions) {
  const transactionsContainer = document.getElementById('recent-transactions');
  transactionsContainer.innerHTML = '';

  if (transactions.length === 0) {
    transactionsContainer.innerHTML = '<p class="text-muted">No recent transactions</p>';
    return;
  }

  const transactionsList = document.createElement('div');
  transactionsList.className = 'list-group';

  transactions.forEach(transaction => {
    const transactionItem = document.createElement('div');
    transactionItem.className = 'list-group-item list-group-item-action';
    transactionItem.innerHTML = `
      <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">${transaction.description}</h5>
        <small>${new Date(transaction.date).toLocaleDateString()}</small>
      </div>
      <p class="mb-1 ${transaction.amount >= 0 ? 'text-success' : 'text-danger'}">
        ${formatCurrency(transaction.amount)}
      </p>
      <small class="text-muted">Category: ${transaction.category}</small>
    `;
    transactionsList.appendChild(transactionItem);
  });

  transactionsContainer.appendChild(transactionsList);
}

function updateBalanceChart(accounts) {
  const ctx = document.getElementById('balance-chart').getContext('2d');

  // Prepare data for the chart
  const labels = accounts.map(account => account.name);
  const data = accounts.map(account => account.balance);
  const backgroundColor = accounts.map((_, index) =>
    `hsl(${index * (360 / accounts.length)}, 70%, 60%)`
  );

  // Create or update chart
  if (window.balanceChart) {
    window.balanceChart.data.labels = labels;
    window.balanceChart.data.datasets[0].data = data;
    window.balanceChart.data.datasets[0].backgroundColor = backgroundColor;
    window.balanceChart.update();
  } else {
    window.balanceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          position: 'bottom',
          labels: {
            fontColor: document.body.classList.contains('dark-mode') ? '#fff' : '#666'
          }
        }
      }
    });
  }
}

function updateGoalsDisplay(goals) {
  const goalsContainer = document.getElementById('goals-list');
  goalsContainer.innerHTML = '';

  goals.forEach(goal => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;

    const goalCard = document.createElement('div');
    goalCard.className = 'card mb-3 goal-card';
    goalCard.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${goal.name}</h5>
        <p class="card-text">${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)}</p>
        <div class="progress mb-2">
          <div class="progress-bar" role="progressbar" style="width: ${progress}%"
               aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <p class="card-text text-muted">
          Target date: ${new Date(goal.targetDate).toLocaleDateString()}
        </p>
      </div>
    `;
    goalsContainer.appendChild(goalCard);
  });
}

async function refreshDashboardData() {
  try {
    document.getElementById('refresh-spinner').classList.remove('d-none');

    // Fetch fresh data
    const accounts = await API.getAccounts();
    const transactions = await API.getRecentTransactions();

    // Update UI
    updateAccountsDisplay(accounts);
    updateBalanceDisplay(accounts);
    updateTransactionsDisplay(transactions);

    // Fetch and update goals if feature is enabled
    if (document.getElementById('goals-section')) {
      const goals = await API.getGoals();
      updateGoalsDisplay(goals);
    }

    document.getElementById('refresh-spinner').classList.add('d-none');
    showNotification('Dashboard data refreshed', 'success');
  } catch (error) {
    console.error('Failed to refresh dashboard:', error);
    document.getElementById('refresh-spinner').classList.add('d-none');
    showNotification('Failed to refresh data', 'danger');
  }
}

async function handleAddTransaction(event) {
  event.preventDefault();

  const form = event.target;
  const transactionData = {
    account: form.elements['transaction-account'].value,
    amount: parseFloat(form.elements['transaction-amount'].value),
    description: form.elements['transaction-description'].value,
    category: form.elements['transaction-category'].value,
    date: form.elements['transaction-date'].value || new Date().toISOString().split('T')[0]
  };

  try {
    await API.addTransaction(transactionData);
    form.reset();

    // Refresh dashboard to show new transaction
    refreshDashboardData();
    showNotification('Transaction added successfully', 'success');
  } catch (error) {
    console.error('Failed to add transaction:', error);
    showNotification('Failed to add transaction', 'danger');
  }
}

async function showAccountTransactions(accountId) {
  try {
    const transactions = await API.getTransactionsByAccount(accountId);
    const account = (await API.getAccounts()).find(acc => acc._id === accountId);

    // Create modal for displaying transactions
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'account-transactions-modal';
    modal.setAttribute('tabindex', '-1');

    let transactionsHTML = '';
    if (transactions.length === 0) {
      transactionsHTML = '<p class="text-muted">No transactions for this account</p>';
    } else {
      transactionsHTML = `
        <div class="list-group">
          ${transactions.map(transaction => `
            <div class="list-group-item">
              <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${transaction.description}</h5>
                <small>${new Date(transaction.date).toLocaleDateString()}</small>
              </div>
              <p class="mb-1 ${transaction.amount >= 0 ? 'text-success' : 'text-danger'}">
                ${formatCurrency(transaction.amount)}
              </p>
              <small class="text-muted">Category: ${transaction.category}</small>
            </div>
          `).join('')}
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Transactions for ${account.name}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ${transactionsHTML}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Initialize and show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();

    // Clean up when modal is hidden
    modal.addEventListener('hidden.bs.modal', function() {
      document.body.removeChild(modal);
    });
  } catch (error) {
    console.error('Failed to fetch account transactions:', error);
    showNotification('Failed to load transactions', 'danger');
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

function showNotification(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show notification`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  document.getElementById('notifications-container').appendChild(alertDiv);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv);
    }
  }, 5000);
}