/**
 * Hilfsfunktionen für die Finanzmanager-App
 */

// API-Basis-URL - Passe diese an deine Backend-URL an
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * HTTP-Anfrage mit Authentifizierung
 * @param {string} endpoint - API-Endpunkt
 * @param {string} method - HTTP-Methode (GET, POST, PUT, DELETE)
 * @param {object} body - Request-Body (optional)
 * @returns {Promise} - Antwort vom Server
 */
async function fetchWithAuth(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['x-auth-token'] = token;
    }

    const options = {
        method,
        headers
    };

    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        // Wenn Token abgelaufen ist oder ungültig
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            showMessage('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.', 'warning');
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ein Fehler ist aufgetreten');
        }

        return data;
    } catch (error) {
        console.error('API-Fehler:', error);
        showMessage(error.message, 'danger');
        return null;
    }
}

/**
 * Zeigt eine Nachricht für den Benutzer an
 * @param {string} message - Anzuzeigende Nachricht
 * @param {string} type - Nachrichtentyp (success, danger, warning, info)
 */
function showMessage(message, type = 'info') {
    // Prüfe, ob bereits ein Alert existiert und entferne es
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Erstelle neues Alert-Element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schließen"></button>
    `;

    // Füge das Alert am Anfang des Hauptcontainers ein
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);

    // Automatisches Ausblenden nach 5 Sekunden
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Formatiert einen Geldbetrag als Euro
 * @param {number} amount - Zu formatierender Betrag
 * @param {boolean} colorize - Positiv/Negativ-Färbung anwenden
 * @returns {string} - Formatierter Betrag
 */
function formatCurrency(amount, colorize = false) {
    const formatted = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);

    if (colorize) {
        if (amount > 0) {
            return `<span class="amount-positive">${formatted}</span>`;
        } else if (amount < 0) {
            return `<span class="amount-negative">${formatted}</span>`;
        }
    }

    return formatted;
}

/**
 * Formatiert ein Datum
 * @param {string} dateString - ISO-Datumsstring
 * @returns {string} - Formatiertes Datum
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

/**
 * Wechselt zwischen Light und Dark Mode
 * @param {boolean} isDark - Dark Mode aktivieren
 */
function toggleDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
}

/**
 * Prüft, ob der Benutzer eingeloggt ist
 * @returns {boolean} - Eingeloggt-Status
 */
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

/**
 * Berechnet den Fortschritt eines Sparziels in Prozent
 * @param {number} current - Aktueller Betrag
 * @param {number} target - Zielbetrag
 * @returns {number} - Prozentsatz (0-100)
 */
function calculateGoalProgress(current, target) {
    const progress = (current / target) * 100;
    return Math.min(Math.max(progress, 0), 100);
}

/**
 * Berechnet die verbleibenden Tage bis zu einem Zieldatum
 * @param {string} deadlineString - Zieldatum als ISO-String
 * @returns {number} - Anzahl der verbleibenden Tage
 */
function calculateDaysRemaining(deadlineString) {
    const today = new Date();
    const deadline = new Date(deadlineString);

    // Berechne die Differenz in Millisekunden
    const diffTime = deadline - today;

    // Umrechnung in Tage
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Wenn das Datum in der Vergangenheit liegt, gebe 0 zurück
    return Math.max(diffDays, 0);
}