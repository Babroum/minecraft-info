// priority: 55
// =============================================================================
// Third World Server Script - Contrôleur des Horaires de Siège (Raid Hours)
// =============================================================================

var RAID_CONFIG = {
    startHour: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.general && TW_CONFIG.general.military && TW_CONFIG.general.military.raid_hours) ? TW_CONFIG.general.military.raid_hours.start : 18,
    endHour: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.general && TW_CONFIG.general.military && TW_CONFIG.general.military.raid_hours) ? TW_CONFIG.general.military.raid_hours.end : 22,
    forceState: null    // null = automatique selon l'heure, true = forcé ON, false = forcé OFF
}


/**
 * Vérifie si les Raid Hours sont actuellement actives
 */
function isRaidHourActive() {
    if (RAID_CONFIG.forceState !== null) {
        return RAID_CONFIG.forceState
    }
    try {
        var LocalTime = Java.loadClass('java.time.LocalTime')
        var currentHour = LocalTime.now().getHour()
        if (RAID_CONFIG.startHour <= RAID_CONFIG.endHour) {
            return currentHour >= RAID_CONFIG.startHour && currentHour < RAID_CONFIG.endHour
        } else {
            // Plage chevauchant minuit (ex: 20h à 2h)
            return currentHour >= RAID_CONFIG.startHour || currentHour < RAID_CONFIG.endHour
        }
    } catch (e) {
        return true // Fallback permissif en cas d'erreur
    }
}

/**
 * Statut textuel court
 */
function getRaidHoursStatusText() {
    var active = isRaidHourActive()
    var mode = RAID_CONFIG.forceState !== null ? ' (Forcé par Staff)' : ' (Automatique)'
    var status = active ? '§aACTIF' : '§cINACTIF'
    return status + '§f' + mode + ' [Créneau: ' + RAID_CONFIG.startHour + 'h00 - ' + RAID_CONFIG.endHour + 'h00]'
}

function setForcedRaidHoursState(state) {
    RAID_CONFIG.forceState = state
}
