// priority: 45
// =============================================================================
// Third World Server Script - Contrôle des Claims FTB Chunks & Dégâts de Siège
// =============================================================================

var warBypassedPlayers = {} // { [playerUuidStr]: true }

/**
 * Vérifie si le joueur est un administrateur en mode Créatif (bâtisseur/staff)
 */
function isCreativeAdmin(player) {
    if (!player) return false
    try {
        if (player.isCreative && player.isCreative()) return true
    } catch (e) {}
    return false
}

/**
 * Récupère la dimension Level sous forme de ResourceKey sécurisée
 */
function getLevelDimKey(level) {
    if (!level) {
        var LevelClass = Java.loadClass('net.minecraft.world.level.Level')
        return LevelClass.OVERWORLD
    }
    try {
        if (typeof level.dimension === 'function') return level.dimension()
        if (level.dimension) return level.dimension
    } catch (e) {}
    var LevelClass = Java.loadClass('net.minecraft.world.level.Level')
    return LevelClass.OVERWORLD
}

/**
 * Vérifie si le monde courant est l'Overworld de façon sécurisée
 */
function isLevelOverworld(level) {
    if (!level) return true
    try {
        var dimKey = (typeof level.dimension === 'function') ? level.dimension() : level.dimension
        if (dimKey) {
            var loc = null
            if (typeof dimKey.location === 'function') loc = String(dimKey.location())
            else if (dimKey.location) loc = String(dimKey.location)
            else loc = String(dimKey)
            return loc.toLowerCase().indexOf('overworld') !== -1
        }
    } catch (e) {}
    return true
}

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
        var dimKey = getLevelDimKey(level)

        var ChunkDimPosClass = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
        var chunkDimPos = new ChunkDimPosClass(dimKey, chunkX, chunkZ)
        var claimedChunk = chunkMgr.getChunk(chunkDimPos)
        if (!claimedChunk || !claimedChunk.getTeamData()) return null

        return claimedChunk.getTeamData().getTeam()
    } catch (e) {
        return null
    }
}

/**
 * Active ou désactive le contournement FTB Chunks accordé temporairement par le système de guerre
 */
function setPlayerWarBypass(player, enable) {
    if (!player) return
    try {
        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        if (!chunksApi || !chunksApi.isManagerLoaded()) return
        var chunkMgr = chunksApi.getManager()
        if (!chunkMgr) return

        var pUuid = (typeof getPlayerUUID === 'function') ? getPlayerUUID(player) : (player.getUUID ? player.getUUID() : player.getUuid())
        if (!pUuid) return
        var uuidStr = pUuid.toString()

        if (enable) {
            if (!chunkMgr.getBypassProtection(pUuid)) {
                chunkMgr.setBypassProtection(pUuid, true)
            }
            warBypassedPlayers[uuidStr] = true
        } else {
            delete warBypassedPlayers[uuidStr]
            // Ne conserve le bypass que si le joueur est un administrateur en Créatif
            if (!isCreativeAdmin(player)) {
                chunkMgr.setBypassProtection(pUuid, false)
            }
        }
    } catch (e) {
        console.error('[WarClaimsHook] Erreur setPlayerWarBypass : ' + e)
    }
}

/**
 * Détermine si une action de guerre (minage / pose / interaction) est autorisée sur ce bloc
 */
function shouldAllowWarAction(player, level, blockX, blockZ) {
    if (!player || !level) return false
    var server = level.server
    if (!server) return false

    // 1. Zone du Hub ONU : Protection absolue et inviolable
    if (isLevelOverworld(level)) {
        if (typeof isPositionInOnuClaim === 'function' && isPositionInOnuClaim(level, blockX, blockZ)) {
            return false
        }
    }

    var defendingTeam = getChunkOwningTeam(level, blockX, blockZ)
    if (!defendingTeam) return false // Zone sauvage libre

    // Si c'est le territoire officiel de l'ONU : invulnérabilité absolue
    var sName = defendingTeam.getShortName() ? String(defendingTeam.getShortName()).toLowerCase() : ''
    if (sName === 'onu' || String(defendingTeam.getId()) === 'cb440140-1d45-4eff-9b10-2bab3d457d63') {
        return false
    }

    // 2. Vérifier si l'attaquant appartient à une nation ennemie
    var attackingTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
    if (!attackingTeam) return false

    if (String(attackingTeam.getId()) === String(defendingTeam.getId())) {
        return false // Même équipe (géré par les droits internes de la nation)
    }

    if (typeof isNationAtWarWith !== 'function' || !isNationAtWarWith(server, attackingTeam.getId(), defendingTeam.getId())) {
        return false // Pas en guerre
    }

    // 3. Période de raid obligatoire (18h-22h) - autoriser bypass uniquement en créatif
    if (typeof isRaidHourActive === 'function' && !isRaidHourActive()) {
        if (!isCreativeAdmin(player)) {
            return false // Hors Raid Hours pour les joueurs en survie (même OP)
        }
    }

    return true
}

// -----------------------------------------------------------------------------
// 1. DÉTECTION & BYPASS DYNAMIQUE EN TEMPS DE GUERRE
// -----------------------------------------------------------------------------

// Dès que le joueur donne un coup ou commence à casser un bloc ennemi
BlockEvents.leftClicked(function(event) {
    try {
        var player = event.player
        if (!player || player.isFake()) return
        var level = event.level
        if (!level || level.isClientSide()) return
        var pos = event.block.getPos()
        var bx = pos.getX()
        var bz = pos.getZ()

        if (shouldAllowWarAction(player, level, bx, bz)) {
            setPlayerWarBypass(player, true)
        }
    } catch (e) {}
})

// Vérification continue pour les joueurs en zone ennemie pendant les Raid Hours
ServerEvents.tick(function(event) {
    try {
        var server = event.server
        if (!server || server.getTickCount() % 20 !== 0) return

        var players = server.getPlayerList().getPlayers()
        for (var i = 0; i < players.size(); i++) {
            var p = players.get(i)
            if (!p || p.isFake()) continue
            var lvl = p.level
            if (!lvl) continue
            var px = Math.floor(p.x)
            var pz = Math.floor(p.z)

            var pUuid = (typeof getPlayerUUID === 'function') ? getPlayerUUID(p) : (p.getUUID ? p.getUUID() : p.getUuid())
            var uuidStr = pUuid ? pUuid.toString() : null

            if (shouldAllowWarAction(p, lvl, px, pz)) {
                setPlayerWarBypass(p, true)
            } else {
                if (uuidStr && warBypassedPlayers[uuidStr]) {
                    setPlayerWarBypass(p, false)
                }
                // Si le joueur est en Survie et n'est pas dans une action de guerre autorisée,
                // s'assurer que le bypass FTB Chunks est bien désactivé (notamment pour les OPs)
                if (!isCreativeAdmin(p)) {
                    try {
                        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
                        if (chunksApi && chunksApi.isManagerLoaded()) {
                            var chunkMgr = chunksApi.getManager()
                            if (chunkMgr && pUuid && chunkMgr.getBypassProtection(pUuid)) {
                                chunkMgr.setBypassProtection(pUuid, false)
                            }
                        }
                    } catch (be) {}
                }
            }
        }
    } catch (te) {}
})

PlayerEvents.loggedOut(function(event) {
    try {
        var player = event.player
        if (player) setPlayerWarBypass(player, false)
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// 2. CONTRÔLE STRICT DU MINAGE (BlockEvents.broken)
// -----------------------------------------------------------------------------
BlockEvents.broken(function(event) {
    try {
        var player = event.player
        if (!player || player.isFake()) return
        var level = event.level
        if (!level || level.isClientSide()) return
        var server = level.server

        var pos = event.block.getPos()
        var bx = pos.getX()
        var bz = pos.getZ()

        // Protection inviolable de l'ONU
        if (isLevelOverworld(level)) {
            if (typeof isPositionInOnuClaim === 'function' && isPositionInOnuClaim(level, bx, bz)) {
                if (!isCreativeAdmin(player)) {
                    event.cancel()
                }
                return
            }
        }

        var defendingTeam = getChunkOwningTeam(level, bx, bz)
        if (!defendingTeam) return // Zone sauvage libre

        var sName = defendingTeam.getShortName() ? String(defendingTeam.getShortName()).toLowerCase() : ''
        if (sName === 'onu' || String(defendingTeam.getId()) === 'cb440140-1d45-4eff-9b10-2bab3d457d63') {
            if (!isCreativeAdmin(player)) {
                event.cancel()
            }
            return
        }

        var attackingTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
        if (attackingTeam && String(attackingTeam.getId()) === String(defendingTeam.getId())) {
            return // Membre de sa propre nation
        }

        // Vérification de guerre déclarée
        if (attackingTeam && typeof isNationAtWarWith === 'function' && isNationAtWarWith(server, attackingTeam.getId(), defendingTeam.getId())) {
            if ((typeof isRaidHourActive === 'function' && isRaidHourActive()) || isCreativeAdmin(player)) {
                // MINAGE AUTORISÉ DANS LES CHUNKS ENNEMIS PENDANT LES RAID HOURS (OU ADMIN EN CRÉATIF) !
                return
            } else {
                sendMsg(player, 'Guerre', 'Le minage en territoire ennemi n\'est autorisé que pendant les Raid Hours (18h-22h) ! Tapez §e/war raidhours force §cpour tester en tant que Staff.', '§c')
                event.cancel()
                return
            }
        }

        // Si le joueur n'est pas en guerre contre cette nation, annulation ferme
        if (!isCreativeAdmin(player)) {
            sendMsg(player, 'Territoire', 'Ce territoire appartient à §6' + defendingTeam.getName().getString() + '§c. Vous n\'êtes pas en guerre !', '§c')
            event.cancel()
        }
    } catch (err) {
        if (String(err).indexOf('EventExit') === -1) {
            console.error('[WarClaimsHook] Erreur broken : ' + err)
        }
    }
})

// -----------------------------------------------------------------------------
// 3. CONTRÔLE DE LA CONSTRUCTION (BlockEvents.placed)
// -----------------------------------------------------------------------------
BlockEvents.placed(function(event) {
    try {
        var player = event.player
        if (!player || player.isFake()) return
        var level = event.level
        if (!level || level.isClientSide()) return
        var server = level.server

        var pos = event.block.getPos()
        var bx = pos.getX()
        var bz = pos.getZ()

        // Protection inviolable de l'ONU
        if (isLevelOverworld(level)) {
            if (typeof isPositionInOnuClaim === 'function' && isPositionInOnuClaim(level, bx, bz)) {
                if (!isCreativeAdmin(player)) {
                    event.cancel()
                }
                return
            }
        }

        var defendingTeam = getChunkOwningTeam(level, bx, bz)
        if (!defendingTeam) return // Zone sauvage libre

        var sName = defendingTeam.getShortName() ? String(defendingTeam.getShortName()).toLowerCase() : ''
        if (sName === 'onu' || String(defendingTeam.getId()) === 'cb440140-1d45-4eff-9b10-2bab3d457d63') {
            if (!isCreativeAdmin(player)) {
                event.cancel()
            }
            return
        }

        var attackingTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
        if (attackingTeam && String(attackingTeam.getId()) === String(defendingTeam.getId())) {
            return // Membre de sa propre nation
        }

        // Vérification de guerre déclarée
        if (attackingTeam && typeof isNationAtWarWith === 'function' && isNationAtWarWith(server, attackingTeam.getId(), defendingTeam.getId())) {
            if ((typeof isRaidHourActive === 'function' && isRaidHourActive()) || isCreativeAdmin(player)) {
                // Pose autorisée en Raid Hours pour le siège (ou test admin en créatif)
                return
            } else {
                sendMsg(player, 'Guerre', 'La pose de blocs en territoire ennemi n\'est autorisée qu\'en Raid Hours (18h-22h) ! Tapez §e/war raidhours force §cpour tester en tant que Staff.', '§c')
                event.cancel()
                return
            }
        }

        // Non allié et non ennemi : refus catégorique
        if (!isCreativeAdmin(player)) {
            event.cancel()
        }
    } catch (err) {
        if (String(err).indexOf('EventExit') === -1) {
            console.error('[WarClaimsHook] Erreur placed : ' + err)
        }
    }
})

// -----------------------------------------------------------------------------
// 4. CONTRÔLE DES EXPLOSIONS (Canons Create Big Cannons, Missiles Ballistix, TNT)
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
        if (isLevelOverworld(level)) {
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

        var isRaid = (typeof isRaidHourActive === 'function' && isRaidHourActive())
        var isCreative = attackingPlayer && isCreativeAdmin(attackingPlayer)

        if (!isRaid && !isCreative) {
            event.cancel()
            return
        }

        if (attackingPlayer) {
            var attackingTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(attackingPlayer) : null
            if (!attackingTeam || !isNationAtWarWith(server, attackingTeam.getId(), defendingTeam.getId())) {
                if (!isCreative) {
                    sendMsg(attackingPlayer, 'Défense', 'Cette nation n\'est pas votre ennemie de guerre déclarée ! Dégâts impossibles.', '§c')
                    event.cancel()
                    return
                }
            }
            // Ennemi confirmé en période de Raid Hours : DÉGÂTS D'EXPLOSION AUTORISÉS !
        }
    } catch (err) {
        console.error('[WarClaimsHook] Erreur beforeExplosion : ' + err)
    }
})

// -----------------------------------------------------------------------------
// 5. CONTRÔLE DES INTERACTIONS (Portes, Trappes, Leviers) EN GUERRE
// -----------------------------------------------------------------------------
BlockEvents.rightClicked(function(event) {
    try {
        var player = event.player
        if (!player || player.isFake()) return
        var level = event.level
        if (!level || level.isClientSide()) return
        var server = level.server

        var blockPos = event.block.getPos()
        var bx = blockPos.getX()
        var bz = blockPos.getZ()

        if (shouldAllowWarAction(player, level, bx, bz)) {
            setPlayerWarBypass(player, true)
        }

        var defendingTeam = getChunkOwningTeam(level, bx, bz)
        if (!defendingTeam) return

        var attackingTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
        if (!attackingTeam) return

        if (typeof isNationAtWarWith === 'function' && isNationAtWarWith(server, attackingTeam.getId(), defendingTeam.getId())) {
            if ((typeof isRaidHourActive === 'function' && isRaidHourActive()) || isCreativeAdmin(player)) {
                var blockId = event.block.getId()
                // Autoriser l'ouverture des portes, trappes, boutons et leviers ennemis en Raid Hours
                if (blockId.includes('door') || blockId.includes('trapdoor') || blockId.includes('button') || blockId.includes('lever') || blockId.includes('gate')) {
                    return
                }
            }
        }
    } catch (e) {}
})
