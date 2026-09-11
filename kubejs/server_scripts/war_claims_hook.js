// priority: 45
// =============================================================================
// Third World Server Script - Contrôle des Claims FTB Chunks & Dégâts de Siège
// =============================================================================

/**
 * Récupère l'équipe propriétaire du chunk à des coordonnées précises
 */
function getChunkOwningTeam(level, blockX, blockZ) {
    try {
        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        if (!chunksApi || !chunksApi.isManagerLoaded()) return null
        var chunkMgr = chunksApi.getManager()
        if (!chunkMgr) return null

        var chunkX = blockX >> 4
        var chunkZ = blockZ >> 4
        var dimKey = level.dimension()

        var ChunkDimPosClass = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
        var chunkDimPos = new ChunkDimPosClass(dimKey, chunkX, chunkZ)
        var claimedChunk = chunkMgr.getChunk(chunkDimPos)
        if (!claimedChunk) return null

        return claimedChunk.getTeamData().getTeam()
    } catch (e) {
        return null
    }
}

// -----------------------------------------------------------------------------
// 1. CONTRÔLE DES EXPLOSIONS (Canons Create Big Cannons, Missiles Ballistix, TNT)
// -----------------------------------------------------------------------------
LevelEvents.beforeExplosion(function(event) {
    try {
        var level = event.level
        if (!level || level.isClientSide()) return
        var server = level.server
        if (!server) return

        var blockX = Math.floor(event.x)
        var blockZ = Math.floor(event.z)

        // Neutralisation absolue de toute explosion dans les territoires revendiqués par l'ONU
        var dimStr = String(level.dimension().location()).toLowerCase()
        if (dimStr.indexOf('overworld') !== -1) {
            if (typeof isPositionInOnuClaim === 'function' && isPositionInOnuClaim(level, blockX, blockZ)) {
                event.cancel()
                return
            }
        }

        var defendingTeam = getChunkOwningTeam(level, blockX, blockZ)
        if (!defendingTeam) return // Zone neutre/sauvage : explosion autorisée normalement

        // Si c'est le territoire de l'ONU : invulnérabilité absolue aux explosions
        var sName = defendingTeam.getShortName() ? String(defendingTeam.getShortName()).toLowerCase() : ''
        if (sName === 'onu' || String(defendingTeam.getId()) === 'cb440140-1d45-4eff-9b10-2bab3d457d63') {
            event.cancel()
            return
        }

        // Si la nation cible n'est dans aucune guerre active : Invulnérabilité 100%
        var defWars = getTeamActiveWars(server, defendingTeam.getId())
        if (!defWars || defWars.length === 0) {
            event.cancel()
            return
        }

        // Si la nation est en guerre mais que nous sommes HORS RAID HOURS : protection absolue des blocs
        if (typeof isRaidHourActive === 'function' && !isRaidHourActive()) {
            event.cancel()
            return
        }

        // Pendant les Raid Hours : vérifier l'origine de l'explosion
        var exploder = event.exploder
        var attackingPlayer = null
        if (exploder) {
            if (exploder.isPlayer()) {
                attackingPlayer = exploder
            } else {
                try {
                    if (exploder.getOwner && exploder.getOwner() && exploder.getOwner().isPlayer()) {
                        attackingPlayer = exploder.getOwner()
                    }
                } catch (oe) {}
            }
        }

        if (attackingPlayer) {
            var attackingTeam = getPlayerNationTeam(attackingPlayer)
            if (!attackingTeam || !isNationAtWarWith(server, attackingTeam.getId(), defendingTeam.getId())) {
                sendMsg(attackingPlayer, 'Défense', 'Cette nation n\'est pas votre ennemie de guerre déclarée ! Dégâts impossibles.', '§c')
                event.cancel()
                return
            }
            // Ennemi confirmé en période de Raid Hours : DÉGÂTS D'EXPLOSION AUTORISÉS !
        }
    } catch (err) {
        console.error('[WarClaimsHook] Erreur beforeExplosion : ' + err)
    }
})

// -----------------------------------------------------------------------------
// 2. CONTRÔLE DES INTERACTIONS (Portes, Trappes, Leviers) EN GUERRE
// -----------------------------------------------------------------------------
BlockEvents.rightClicked(function(event) {
    try {
        var player = event.player
        if (!player || player.isFake()) return
        var level = event.level
        if (!level || level.isClientSide()) return
        var server = level.server

        var blockPos = event.block.getPos()
        var defendingTeam = getChunkOwningTeam(level, blockPos.getX(), blockPos.getZ())
        if (!defendingTeam) return

        var attackingTeam = getPlayerNationTeam(player)
        if (!attackingTeam) return

        if (isNationAtWarWith(server, attackingTeam.getId(), defendingTeam.getId())) {
            if (typeof isRaidHourActive === 'function' && isRaidHourActive()) {
                var blockId = event.block.getId()
                // Autoriser l'ouverture des portes, trappes, boutons et leviers ennemis en Raid Hours
                if (blockId.includes('door') || blockId.includes('trapdoor') || blockId.includes('button') || blockId.includes('lever') || blockId.includes('gate')) {
                    // Ne pas bloquer l'interaction
                    return
                }
            }
        }
    } catch (e) {}
})
