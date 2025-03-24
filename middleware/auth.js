// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Token aus dem Header holen
    const token = req.header('x-auth-token');

    // Prüfen, ob Token existiert
    if (!token) {
        return res.status(401).json({ message: 'Kein Token, Authentifizierung verweigert' });
    }

    try {
        // Token verifizieren
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // User-ID zum Request hinzufügen
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token ist ungültig' });
    }
};