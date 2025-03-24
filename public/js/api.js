/**
 * API-Modul für den Finanzmanager
 * Enthält alle Funktionen zur Kommunikation mit dem Backend
 */

const API = {
    // Basis-URL des Backends
    BASE_URL: '/api',

    // Token aus dem localStorage holen
    getToken() {
        return localStorage.getItem('auth_token');
    },

    // Standard-Anfrage-Header
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    },

    // API-Anfragen mit Offline-Unterstützung
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.BASE_URL}${endpoint}`;

        const options = {
            method,
            headers: this.getHeaders()
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            // Versuche eine normale Netzwerkanfrage
            const response = await fetch(url, options);

            // Prüfe auf Authentifizierungsfehler
            if (response.status === 401) {
                // Token ist ungültig, Benutzer abmelden
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
                window.location.href = '/index.html';
                return null;
            }

            // Erfolgreich?
            if (!response.ok) {
                throw new Error(`API Fehler: ${response.status} ${response.statusText}`);
            }

            // Leere Response bei 204 No Content
            if (response.status === 204) {
                return null;
            }

            // JSON-Antwort parsen
            return await response.json();
        } catch (error) {
            console.error('API Anfrage fehlgeschlagen:', error);

            // Prüfe, ob wir offline sind
            if (!navigator.onLine) {
                // Speichere die Anfrage für spätere Synchronisierung
                await this.saveOfflineRequest(endpoint, method, data);

                // Versuche, lokale Daten zu verwenden
                return await this.getOfflineData(endpoint);
            }

            throw error;
        }
    },

    // Offline-Anfrage für spätere Synchronisierung speichern
    async saveOfflineRequest(endpoint, method, data) {
        // Nur schreibende Operationen speichern
        if (method === 'GET') return;

        try {
            const db = await this.openOfflineDb();
            const transaction = db.transaction('pendingRequests', 'readwrite');
            const store = transaction.objectStore('pendingRequests');

            await store.add({
                url: endpoint,
                method,
                data,
                timestamp: new Date().toISOString()
            });

            // Hintergrund-Sync registrieren, wenn verfügbar
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-pending-changes');
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Offline-Anfrage:', error);
        }
    },

    // Lokale Daten aus dem Offline-Speicher abrufen
    async getOfflineData(endpoint) {
        try {
            const db = await this.openOfflineDb();
            const transaction = db.transaction('offlineData', 'readonly');
            const store = transaction.objectStore('offlineData');

            // Endpunkt als ID verwenden
            const data = await store.get(endpoint);

            if (data) {
                return data.value;
            }

            return null;
        } catch (error) {
            console.error('Fehler beim Abrufen der Offline-Daten:', error);
            return null;
        }
    },

    // Offline-Datenbank öffnen
    openOfflineDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('financeManagerDB', 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store für ausstehende Anfragen
                if (!db.objectStoreNames.contains('pendingRequests')) {
                    db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
                }

                // Store für Offline-Daten
                if (!db.objectStoreNames.contains('offlineData')) {
                    db.createObjectStore('offlineData', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    // Synchronisiert alle ausstehenden Änderungen mit dem Server
    async syncOfflineData() {
        if (!navigator.onLine) return;

        try {
            const db = await this.openOfflineDb();
            const transaction = db.transaction('pendingRequests', 'readwrite');
            const store = transaction.objectStore('pendingRequests');

            const requests = await store.getAll();

            for (const req of requests) {
                try {
                    await this.request(req.url, req.method, req.data);
                    await store.delete(req.id);
                } catch (error) {
                    console.error('Synchronisierungsfehler:', error);
                }
            }
        } catch (error) {
            console.error('Fehler bei der Offline-Synchronisierung:', error);
        }
    },

    // Offline-Daten im lokalen Speicher aktualisieren
    async updateOfflineData(endpoint, data) {
        try {
            const db = await this.openOfflineDb();
            const transaction = db.transaction('offlineData', 'readwrite');
            const store = transaction.objectStore('offlineData');

            await store.put({
                id: endpoint,
                value: data,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Offline-Daten:', error);
        }
    },

    // API-Funktionen für Authentifizierung
    auth: {
        async login(email, password) {
            return await API.request('/auth/login', 'POST', { email, password });
        },

        async register(userData) {
            return await API.request('/auth/register', 'POST', userData);
        },

        async getUserProfile() {
            return await API.request('/auth/me');
        },

        async updateProfile(userData) {
            return await API.request('/auth/profile', 'PUT', userData);
        },

        async changePassword(passwordData) {
            return await API.request('/auth/password', 'PUT', passwordData);
        }
    },

    // API-Funktionen für Konten
    accounts: {
        async getAll() {
            const accounts = await API.request('/accounts');
            // Speichere Konten für Offline-Zugriff
            await API.updateOfflineData('/accounts', accounts);
            return accounts;
        },

        async getById(id) {
            return await API.request(`/accounts/${id}`);
        },

        async create(accountData) {
            return await API.request('/accounts', 'POST', accountData);
        },

        async update(id, accountData) {
            return await API.request(`/accounts/${id}`, 'PUT', accountData);
        },

        async delete(id) {
            return await API.request(`/accounts/${id}`, 'DELETE');
        },

        // Kontostände aktualisieren (z.B. durch Bank-API)
        async refreshBalance(id) {
            return await API.request(`/accounts/${id}/refresh`, 'POST');
        }
    },

    // API-Funktionen für Transaktionen
    transactions: {
        async getAll(filters = {}) {
            // Konvertiere Filter in Query-Parameter
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value);
                }
            });

            const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const transactions = await API.request(`/transactions${query}`);

            // Speichere Transaktionen für Offline-Zugriff
            await API.updateOfflineData(`/transactions${query}`, transactions);

            return transactions;
        },

        async getById(id) {
            return await API.request(`/transactions/${id}`);
        },

        async create(transactionData) {
            return await API.request('/transactions', 'POST', transactionData);
        },

        async update(id, transactionData) {
            return await API.request(`/transactions/${id}`, 'PUT', transactionData);
        },

        async delete(id) {
            return await API.request(`/transactions/${id}`, 'DELETE');
        },

        async getMonthlyStats(year, month) {
            const stats = await API.request(`/transactions/stats/${year}/${month}`);
            await API.updateOfflineData(`/transactions/stats/${year}/${month}`, stats);
            return stats;
        }
    },

    // API-Funktionen für Kategorien
    categories: {
        async getAll() {
            const categories = await API.request('/categories');
            await API.updateOfflineData('/categories', categories);
            return categories;
        },

        async create(categoryData) {
            return await API.request('/categories', 'POST', categoryData);
        },

        async update(id, categoryData) {
            return await API.request(`/categories/${id}`, 'PUT', categoryData);
        },

        async delete(id) {
            return await API.request(`/categories/${id}`, 'DELETE');
        }
    },

    // API-Funktionen für Sparziele
    goals: {
        async getAll() {
            const goals = await API.request('/goals');
            await API.updateOfflineData('/goals', goals);
            return goals;
        },

        async getById(id) {
            return await API.request(`/goals/${id}`);
        },

        async create(goalData) {
            return await API.request('/goals', 'POST', goalData);
        },

        async update(id, goalData) {
            return await API.request(`/goals/${id}`, 'PUT', goalData);
        },

        async delete(id) {
            return await API.request(`/goals/${id}`, 'DELETE');
        },

        async addContribution(id, amount, date, note) {
            return await API.request(`/goals/${id}/contribute`, 'POST', {
                amount, date, note
            });
        }
    },

    // API-Funktionen für Bank-Integration (falls vorhanden)
    banking: {
        async getBanks() {
            return await API.request('/banking/banks');
        },

        async initiateConnection(bankId) {
            return await API.request('/banking/connect', 'POST', { bankId });
        },

        async disconnectBank(connectionId) {
            return await API.request(`/banking/disconnect/${connectionId}`, 'DELETE');
        },

        async syncAccounts() {
            return await API.request('/banking/sync', 'POST');
        }
    }
};

// Event-Listener für Online/Offline-Status
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    // Benachrichtigung anzeigen
    showToast('Du bist wieder online. Daten werden synchronisiert...', 'info');
    // Offline-Daten synchronisieren
    API.syncOfflineData().then(() => {
        showToast('Synchronisierung abgeschlossen', 'success');
        // Daten neu laden
        window.dispatchEvent(new CustomEvent('app:data-updated'));
    });
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
    showToast('Du bist offline. Änderungen werden gespeichert und später synchronisiert.', 'warning');
});

// Toast-Benachrichtigung anzeigen
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    // Verschiedene Stile je nach Typ
    const bgClass = type === 'success' ? 'bg-success' :
                    type === 'error' ? 'bg-danger' :
                    type === 'warning' ? 'bg-warning text-dark' :
                    'bg-info text-dark';

    toast.innerHTML = `
        <div class="toast-header ${bgClass} text-white">
            <strong class="me-auto">Finanzmanager</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Schließen"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toast);

    // Toast nach 5 Sekunden automatisch ausblenden
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 500);
    }, 5000);
}

// Toast-Container erstellen, wenn er noch nicht existiert
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// API exportieren
window.API = API;