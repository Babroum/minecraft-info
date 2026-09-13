// priority: 30
// =============================================================================
// Third World Server Script - Suivi des Kills & Morts PvP pour les Leaderboards
// =============================================================================

EntityEvents.death(function(event) {
    try {
        var entity = event.entity
        if (!entity || !entity.isPlayer() || entity.isFake()) return

        var source = event.source
        if (!source) return

        var killer = source.actual || source.entity
        if (!killer || !killer.isPlayer() || killer.isFake()) {
            // Mort PVE ou accidentelle (chute, lave, monstre)
            if (typeof TW_RecordPvPKill === 'function') {
                var vUuid = entity.getUuid ? entity.getUuid() : (entity.uuid ? entity.uuid : null)
                TW_RecordPvPKill(null, null, vUuid ? vUuid.toString() : null, entity.getName().getString())
            }
            return
        }

        // Mort PvP confirmée
        var vUuid2 = entity.getUuid ? entity.getUuid() : (entity.uuid ? entity.uuid : null)
        var kUuid = killer.getUuid ? killer.getUuid() : (killer.uuid ? killer.uuid : null)

        // Ne pas compter le suicide
        if (vUuid2 && kUuid && vUuid2.toString() === kUuid.toString()) return

        if (typeof TW_RecordPvPKill === 'function') {
            TW_RecordPvPKill(
                kUuid ? kUuid.toString() : null,
                killer.getName().getString(),
                vUuid2 ? vUuid2.toString() : null,
                entity.getName().getString()
            )
        }
    } catch (e) {
        console.error('[PvP Tracker] Erreur enregistrement kill : ' + e)
    }
})
