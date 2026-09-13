// priority: 100
// =============================================================================
// Third World Server Script - UI Bridge & Toast Dispatcher
// =============================================================================

var ThirdWorldServerUI = ThirdWorldServerUI || {};

(function() {
    /**
     * Envoie un toast visuel au joueur
     */
    function sendToast(player, title, message, isError) {
        if (!player) return;
        try {
            var payload = {
                title: title || 'Third World',
                message: message || '',
                type: isError ? 'error' : 'info'
            };
            player.sendData('show_toast', { json: JSON.stringify(payload) });
        } catch (e) {
            console.error('[UI Bridge] Erreur envoi toast: ' + e);
        }
    }

    /**
     * Envoie un paquet d'écran ou de mise à jour d'état à un joueur
     */
    function sendScreenData(player, channel, payload) {
        if (!player) return;
        try {
            player.sendData(channel, { json: JSON.stringify(payload || {}) });
        } catch (e) {
            console.error('[UI Bridge] Erreur envoi screen data (' + channel + '): ' + e);
        }
    }

    ThirdWorldServerUI.sendToast = sendToast;
    ThirdWorldServerUI.sendScreenData = sendScreenData;

    console.info('[ThirdWorld Server] UI Bridge initialisé.');
})();
