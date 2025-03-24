/**
 * Auth-Modul für den Finanzmanager
 * Enthält Funktionen für Benutzerauthentifizierung und -verwaltung
 */

const Auth = {
    // Überprüfen, ob der Benutzer angemeldet ist
    isLoggedIn() {
        return !!localStorage.getItem('auth_token');
    },

    // Benutzerdaten aus dem localStorage holen
    getCurrentUser() {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    },

    // Token und Benutzerdaten speichern
    setSession(token, userData) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));
    },

    // Sitzung beenden
    clearSession() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
    },

    // Benutzer anmelden
    async login(email, password) {
        try {
            const response = await API.auth.login(email, password);

            if (response && response.token) {
                this.setSession(response.token, response.user);
                return { success: true, user: response.user };
            }

            return { success: false, error: 'Ungültige Anmeldedaten' };
        } catch (error) {
            console.error('Anmeldefehler:', error);
            return {
                success: false,
                error: error.message || 'Bei der Anmeldung ist ein Fehler aufgetreten'
            };
        }
    },

    // Benutzer registrieren
    async register(userData) {
        try {
            const response = await API.auth.register(userData);

            if (response && response.token) {
                this.setSession(response.token, response.user);
                return { success: true, user: response.user };
            }

            return { success: false, error: 'Registrierung fehlgeschlagen' };
        } catch (error) {
            console.error('Registrierungsfehler:', error);
            return {
                success: false,
                error: error.message || 'Bei der Registrierung ist ein Fehler aufgetreten'
            };
        }
    },

    // Benutzer abmelden
    logout() {
        this.clearSession();
        // Zur Anmeldeseite weiterleiten
        window.location.href = '/index.html';
    },

    // Aktuellen Benutzer aus dem Backend abrufen
    async refreshUserData() {
        try {
            if (!this.isLoggedIn()) return null;

            const userData = await API.auth.getUserProfile();

            if (userData) {
                // Nur Benutzerdaten aktualisieren, Token beibehalten
                localStorage.setItem('user_data', JSON.stringify(userData));
                return userData;
            }

            return null;
        } catch (error) {
            console.error('Fehler beim Abrufen der Benutzerdaten:', error);

            // Bei Authentifizierungsfehlern abmelden
            if (error.message && error.message.includes('401')) {
                this.clearSession();
                window.location.href = '/index.html';
            }

            return null;
        }
    },

    // Benutzerprofil aktualisieren
    async updateProfile(userData) {
        try {
            const updatedUser = await API.auth.updateProfile(userData);

            if (updatedUser) {
                // Aktualisierte Daten im localStorage speichern
                const currentData = this.getCurrentUser();
                const newData = { ...currentData, ...updatedUser };
                localStorage.setItem('user_data', JSON.stringify(newData));

                return { success: true, user: newData };
            }

            return { success: false, error: 'Aktualisierung fehlgeschlagen' };
        } catch (error) {
            console.error('Fehler bei der Profilaktualisierung:', error);
            return {
                success: false,
                error: error.message || 'Bei der Aktualisierung ist ein Fehler aufgetreten'
            };
        }
    },

    // Passwort ändern
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await API.auth.changePassword({
                currentPassword,
                newPassword
            });

            return { success: true, message: 'Passwort erfolgreich geändert' };
        } catch (error) {
            console.error('Fehler bei der Passwortänderung:', error);
            return {
                success: false,
                error: error.message || 'Bei der Passwortänderung ist ein Fehler aufgetreten'
            };
        }
    },

    // Auth-Initialisierung und Zustandsprüfung
    init() {
        // Anmelde-Status überprüfen
        if (this.isLoggedIn()) {
            const currentUser = this.getCurrentUser();

            // Benutzernamen in der Benutzeroberfläche anzeigen
            const usernameElement = document.getElementById('username');
            if (usernameElement && currentUser) {
                usernameElement.textContent = currentUser.name || currentUser.email;
            }

            // Benutzerdaten aktualisieren
            this.refreshUserData();

            // Anwendung initialisieren
            this.initApp();
        } else {
            // Anmeldeformular anzeigen
            this.showLoginForm();
        }

        // Event-Listener für Abmelde-Button hinzufügen
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    },

    // Anwendung nach erfolgreicher Anmeldung initialisieren
    initApp() {
        // Hauptinhalt anzeigen
        document.querySelector('main').style.display = 'block';

        // Dashboard initialisieren und Daten laden
        if (typeof Dashboard !== 'undefined') {
            Dashboard.init();
        }

        // Floating Action Button für neue Transaktion hinzufügen
        this.addTransactionButton();
    },

    // Anmeldeformular anzeigen
    showLoginForm() {
        // Hauptinhalt ausblenden
        document.querySelector('main').style.display = 'none';

        // Login-Modal anzeigen
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();

        // Event-Listener für das Anmeldeformular
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            // Login-Button deaktivieren und Ladeindikator anzeigen
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Anmelden...';

            const result = await this.login(email, password);

            // Button wiederherstellen
            submitButton.disabled = false;
            submitButton.textContent = originalText;

            if (result.success) {
                // Modal schließen und App initialisieren
                loginModal.hide();
                this.initApp();
            } else {
                // Fehlermeldung anzeigen
                const errorAlert = document.createElement('div');
                errorAlert.className = 'alert alert-danger mt-3';
                errorAlert.textContent = result.error;

                // Vorherige Fehlermeldungen entfernen
                const previousAlert = loginForm.querySelector('.alert');
                if (previousAlert) {
                    previousAlert.remove();
                }

                loginForm.appendChild(errorAlert);
            }
        });

        // Event-Listener für Registrierungslink
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', () => {
                this.showRegisterForm();
            });
        }
    },

    // Registrierungsformular anzeigen
    showRegisterForm() {
        // Login-Modal ausblenden
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();

        // Registrierungs-Modal erstellen und anzeigen
        const registerModalHTML = `
        <div class="modal fade" id="registerModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Registrieren</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                    </div>
                    <div class="modal-body">
                        <form id="registerForm">
                            <div class="mb-3">
                                <label for="registerName" class="form-label">Name</label>
                                <input type="text" class="form-control" id="registerName" required>
                            </div>
                            <div class="mb-3">
                                <label for="registerEmail" class="form-label">E-Mail-Adresse</label>
                                <input type="email" class="form-control" id="registerEmail" required>
                            </div>
                            <div class="mb-3">
                                <label for="registerPassword" class="form-label">Passwort</label>
                                <input type="password" class="form-control" id="registerPassword" minlength="8" required>
                                <div class="form-text">Mindestens 8 Zeichen lang.</div>
                            </div>
                            <div class="mb-3">
                                <label for="registerPasswordConfirm" class="form-label">Passwort bestätigen</label>
                                <input type="password" class="form-control" id="registerPasswordConfirm" required>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <button type="submit" class="btn btn-primary">Registrieren</button>
                                <button type="button" class="btn btn-link" id="showLoginBtn">Zurück zur Anmeldung</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        `;

        // Modal zum DOM hinzufügen, falls nicht vorhanden
        if (!document.getElementById('registerModal')) {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = registerModalHTML;
            document.body.appendChild(modalContainer.firstChild);
        }

        // Modal anzeigen
        const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        registerModal.show();

        // Event-Listener für das Registrierungsformular
        const registerForm = document.getElementById('registerForm');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

            // Passwörter überprüfen
            if (password !== passwordConfirm) {
                const errorAlert = document.createElement('div');
                errorAlert.className = 'alert alert-danger mt-3';
                errorAlert.textContent = 'Die Passwörter stimmen nicht überein.';

                // Vorherige Fehlermeldungen entfernen
                const previousAlert = registerForm.querySelector('.alert');
                if (previousAlert) {
                    previousAlert.remove();
                }

                registerForm.appendChild(errorAlert);
                return;
            }

            // Registrierungs-Button deaktivieren und Ladeindikator anzeigen
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrieren...';

            const result = await this.register({ name, email, password });

            // Button wiederherstellen
            submitButton.disabled = false;
            submitButton.textContent = originalText;

            if (result.success) {
                // Modal schließen und App initialisieren
                registerModal.hide();
                this.initApp();
            } else {
                // Fehlermeldung anzeigen
                const errorAlert = document.createElement('div');
                errorAlert.className = 'alert alert-danger mt-3';
                errorAlert.textContent = result.error;

                // Vorherige Fehlermeldungen entfernen
                const previousAlert = registerForm.querySelector('.alert');
                if (previousAlert) {
                    previousAlert.remove();
                }

                registerForm.appendChild(errorAlert);
            }
        });

        // Event-Listener für Login-Link
        const showLoginBtn = document.getElementById('showLoginBtn');
        if (showLoginBtn) {
            showLoginBtn.addEventListener('click', () => {
                registerModal.hide();
                this.showLoginForm();
            });
        }
    },

    // Floating Action Button für neue Transaktionen hinzufügen
    addTransactionButton() {
        // Button erstellen, falls nicht vorhanden
        if (!document.querySelector('.fab')) {
            const fab = document.createElement('button');
            fab.className = 'fab';
            fab.setAttribute('data-bs-toggle', 'modal');
            fab.setAttribute('data-bs-target', '#newTransactionModal');
            fab.innerHTML = '<i class="fas fa-plus"></i>';

            // Button zum DOM hinzufügen
            document.body.appendChild(fab);
        }
    }
};

// DOM geladen - Auth initialisieren
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

// Auth-Modul exportieren
window.Auth = Auth;