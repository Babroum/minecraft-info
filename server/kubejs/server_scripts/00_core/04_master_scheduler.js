// priority: 102
// =============================================================================
// Third World Server Script - Core 04 : Master Scheduler (Ordonnanceur Unique)
// =============================================================================
// Remplace la multiplication anarchique des ServerEvents.tick par une boucle
// centrale unique cadencée et sécurisée.
// =============================================================================

var TW_Scheduler = {
    tasks: [],

    /**
     * Enregistre une tâche cadencée
     * @param {string} name - Nom unique de la tâche pour le débogage
     * @param {number} intervalTicks - Intervalle d'exécution en ticks (20 ticks = 1 seconde)
     * @param {function(server)} callback - Fonction à exécuter
     */
    register: function(name, intervalTicks, callback) {
        if (!name || typeof callback !== 'function' || intervalTicks <= 0) return
        // Éviter les doublons
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i].name === name) {
                this.tasks[i].interval = intervalTicks
                this.tasks[i].callback = callback
                return
            }
        }
        this.tasks.push({
            name: name,
            interval: intervalTicks,
            callback: callback
        })
        console.info('[MasterScheduler] Tâche enregistrée : ' + name + ' (toutes les ' + intervalTicks + ' ticks)')
    }
}

// -----------------------------------------------------------------------------
// BOUCLE PRINCIPALE UNIQUE DE TICK DU SERVEUR
// -----------------------------------------------------------------------------
ServerEvents.tick(function(event) {
    var server = event.server
    if (!server) return
    var tickCount = server.getTickCount()

    var taskList = TW_Scheduler.tasks
    for (var i = 0; i < taskList.length; i++) {
        var t = taskList[i]
        if (tickCount % t.interval === 0) {
            try {
                t.callback(server)
            } catch (err) {
                console.error('[MasterScheduler] Erreur exécution tâche "' + t.name + '" : ' + err)
            }
        }
    }
})

console.info('[MasterScheduler] Ordonnanceur maître initialisé avec succès.')
