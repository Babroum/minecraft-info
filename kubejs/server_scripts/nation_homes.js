// priority: 70
// =============================================================================
// Third World Server Script - Homes de Nation et Ambassades d'Alliances
// =============================================================================

function loadNationHomes() {
    return readJsonData('nation_homes.json') || {}
}

function saveNationHomes(data) {
    writeJsonData('nation_homes.json', data)
}

function canManageNation(team, player) {
    var rank = getPlayerTeamRank(team, player)
    return rank === 'owner' || rank === 'officer'
}

function checkClaimForHome(team, player) {
    if (!team || !player) return { allowed: false, reason: 'Équipe ou joueur introuvable.' }
    try {
        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        var ChunkDimPosClass = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
        if (!chunksApi || !ChunkDimPosClass) return { allowed: false, reason: 'API FTB Chunks introuvable.' }
        var chunkMgr = chunksApi.getManager()
        if (!chunkMgr) return { allowed: false, reason: 'Gestionnaire de chunks FTB indisponible.' }

        var pos = new ChunkDimPosClass(player)
        var chunk = chunkMgr.getChunk(pos)
        if (chunk && chunk.getTeamData()) {
            var claimTeamId = chunk.getTeamData().getTeamId()
            if (claimTeamId && claimTeamId.equals(team.getId())) {
                return { allowed: true, inOwnClaim: true }
            } else if (claimTeamId) {
                var otherTeam = (typeof getTeamDisplayName === 'function') 
                    ? getTeamDisplayName(player.server, claimTeamId.toString()) 
                    : 'une autre nation'
                return { 
                    allowed: false, 
                    reason: 'Ce territoire appartient à la nation §6' + otherTeam + '§c !' 
                }
            }
        }
    } catch (e) {
        console.error('[Homes] Erreur checkClaimForHome : ' + e)
    }
    // Strict : autoriser UNIQUEMENT si le chunk est revendiqué par la nation du joueur
    return { 
        allowed: false, 
        reason: 'Vous devez obligatoirement vous trouver dans un chunk revendiqué (claim) par votre nation ! (Ouvrez la carte avec M pour claim).' 
    }
}

function getNationHome(team) {
    if (!team) return null
    var homes = loadNationHomes()
    var teamIdStr = team.getId().toString()
    return (homes[teamIdStr] && homes[teamIdStr].home) ? homes[teamIdStr].home : null
}

function getNationAllyHome(team) {
    if (!team) return null
    var homes = loadNationHomes()
    var teamIdStr = team.getId().toString()
    return (homes[teamIdStr] && homes[teamIdStr].ally_home) ? homes[teamIdStr].ally_home : null
}

function getPlayerYaw(player) {
    try {
        if (player.getYRot) return player.getYRot()
        if (player.yaw !== undefined) return player.yaw
    } catch (e) {}
    return 0.0
}

function getPlayerPitch(player) {
    try {
        if (player.getXRot) return player.getXRot()
        if (player.pitch !== undefined) return player.pitch
    } catch (e) {}
    return 0.0
}

function setNationHome(team, player) {
    if (!player) return 0
    try {
        if (!team) {
            sendMsg(player, 'Nation', 'Vous devez faire partie d\'une nation pour définir son Home.', '§c')
            return 0
        }
        if (!canManageNation(team, player)) {
            sendMsg(player, 'Nation', 'Seuls les Leaders et Ministres peuvent définir le Home de la nation.', '§c')
            return 0
        }

        var dimStr = getEntityDimensionId(player) || 'minecraft:overworld'
        var px = Math.round(Number(player.getX ? player.getX() : player.x) * 10) / 10
        var py = Math.round(Number(player.getY ? player.getY() : player.y) * 10) / 10
        var pz = Math.round(Number(player.getZ ? player.getZ() : player.z) * 10) / 10

        if (isPlayerInOnuZone(player) || isCoordsInOnuZone(dimStr, px, pz)) {
            sendMsg(player, 'ONU', 'Zone Internationale : Il est strictement INTERDIT de poser un Home de nation dans le sanctuaire de l\'ONU (rayon de 200 blocs autour de -204, -172).', '§c')
            try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
            return 0
        }

        var claimCheck = checkClaimForHome(team, player)
        if (!claimCheck.allowed) {
            sendMsg(player, 'Sécurité', claimCheck.reason || 'Impossible de poser le Home ici.', '§c')
            return 0
        }

        var homes = loadNationHomes() || {}
        var teamIdStr = team.getId().toString()
        if (!homes[teamIdStr]) homes[teamIdStr] = {}

        var pyaw = Math.round(getPlayerYaw(player) * 10) / 10
        var ppitch = Math.round(getPlayerPitch(player) * 10) / 10

        homes[teamIdStr].home = {
            dim: dimStr,
            x: px,
            y: py,
            z: pz,
            yaw: pyaw,
            pitch: ppitch,
            setBy: player.getName().getString(),
            setAt: Date.now()
        }
        saveNationHomes(homes)

        sendMsg(player, 'Nation', 'Home de la nation défini avec succès !', '§a')
        if (claimCheck.inWilderness) {
            sendMsg(player, 'Conseil', 'Pensez à claim ce chunk (touche M) pour protéger votre QG des attaques.', '§7')
        }
        notifyTeam(team, 'QG', 'Le Home de la nation a été mis à jour par §e' + player.getName().getString() + ' §f(§eX: ' + px + ', Y: ' + py + ', Z: ' + pz + '§f).', '§6')
        return 1
    } catch (err) {
        console.error('[Homes] Erreur setNationHome : ' + err)
        sendMsg(player, 'Erreur', 'Impossible de définir le Home : ' + err, '§c')
        return 0
    }
}

function deleteNationHome(team, player) {
    if (!player) return 0
    try {
        if (!team) {
            sendMsg(player, 'Nation', 'Vous devez faire partie d\'une nation.', '§c')
            return 0
        }
        if (!canManageNation(team, player)) {
            sendMsg(player, 'Nation', 'Seuls les Leaders et Ministres peuvent supprimer le Home de la nation.', '§c')
            return 0
        }
        var homes = loadNationHomes() || {}
        var teamIdStr = team.getId().toString()
        if (homes[teamIdStr] && homes[teamIdStr].home) {
            delete homes[teamIdStr].home
            saveNationHomes(homes)
            sendMsg(player, 'Nation', 'Home de la nation supprimé.', '§e')
            notifyTeam(team, 'QG', 'Le Home de la nation a été supprimé par §e' + player.getName().getString() + '§f.', '§6')
            return 1
        }
        sendMsg(player, 'Nation', 'Aucun Home n\'était défini.', '§c')
    } catch (e) {
        console.error('[Homes] Erreur deleteNationHome : ' + e)
    }
    return 0
}

function setNationAllyHome(team, player) {
    if (!player) return 0
    try {
        if (!team) {
            sendMsg(player, 'Alliance', 'Vous devez faire partie d\'une nation pour établir une Ambassade.', '§c')
            return 0
        }
        if (!canManageNation(team, player)) {
            sendMsg(player, 'Alliance', 'Seuls les Leaders et Ministres peuvent définir l\'Ambassade des alliés.', '§c')
            return 0
        }

        var dimStr = getEntityDimensionId(player) || 'minecraft:overworld'
        var px = Math.round(Number(player.getX ? player.getX() : player.x) * 10) / 10
        var py = Math.round(Number(player.getY ? player.getY() : player.y) * 10) / 10
        var pz = Math.round(Number(player.getZ ? player.getZ() : player.z) * 10) / 10

        if (isPlayerInOnuZone(player) || isCoordsInOnuZone(dimStr, px, pz)) {
            sendMsg(player, 'ONU', 'Zone Internationale : Il est strictement INTERDIT de poser une Ambassade dans le sanctuaire de l\'ONU (rayon de 200 blocs autour de -204, -172).', '§c')
            try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
            return 0
        }

        var claimCheck = checkClaimForHome(team, player)
        if (!claimCheck.allowed) {
            sendMsg(player, 'Sécurité', claimCheck.reason || 'Impossible d\'établir l\'Ambassade ici.', '§c')
            return 0
        }

        var homes = loadNationHomes() || {}
        var teamIdStr = team.getId().toString()
        if (!homes[teamIdStr]) homes[teamIdStr] = {}

        var pyaw = Math.round(getPlayerYaw(player) * 10) / 10
        var ppitch = Math.round(getPlayerPitch(player) * 10) / 10

        homes[teamIdStr].ally_home = {
            dim: dimStr,
            x: px,
            y: py,
            z: pz,
            yaw: pyaw,
            pitch: ppitch,
            setBy: player.getName().getString(),
            setAt: Date.now()
        }
        saveNationHomes(homes)

        sendMsg(player, 'Alliance', 'Ambassade / Point de ralliement des Alliés établi !', '§a')
        if (claimCheck.inWilderness) {
            sendMsg(player, 'Conseil', 'Pensez à claim ce chunk (touche M) pour sécuriser l\'accès à vos alliés.', '§7')
        }
        notifyTeam(team, 'Diplomatie', 'Une Ambassade pour vos nations alliées a été établie par §e' + player.getName().getString() + ' §f(§eX: ' + px + ', Z: ' + pz + '§f). Vos alliés peuvent s\'y téléporter avec §b/ally home ' + team.getName().getString() + '§f.', '§b')
        return 1
    } catch (err) {
        console.error('[Homes] Erreur setNationAllyHome : ' + err)
        sendMsg(player, 'Erreur', 'Impossible d\'établir l\'Ambassade : ' + err, '§c')
        return 0
    }
}

function deleteNationAllyHome(team, player) {
    if (!team || !player) return 0
    if (!canManageNation(team, player)) {
        sendMsg(player, 'Alliance', 'Seuls les Leaders et Ministres peuvent supprimer l\'Ambassade des alliés.', '§c')
        return 0
    }
    var homes = loadNationHomes()
    var teamIdStr = team.getId().toString()
    if (homes[teamIdStr] && homes[teamIdStr].ally_home) {
        delete homes[teamIdStr].ally_home
        saveNationHomes(homes)
        sendMsg(player, 'Alliance', 'Ambassade des alliés supprimée.', '§e')
        notifyTeam(team, 'Diplomatie', 'L\'Ambassade des alliés a été révoquée par §e' + player.getName().getString() + '§f.', '§b')
        return 1
    }
    sendMsg(player, 'Alliance', 'Aucune Ambassade n\'était définie.', '§c')
    return 0
}

var ONU_HUB_X = -204
var ONU_HUB_Z = -172

function isCoordsInOnuZone(dimStr, x, z) {
    if (x === undefined || z === undefined || x === null || z === null) return false
    var dim = String(dimStr || 'minecraft:overworld').toLowerCase()
    if (dim.indexOf('overworld') === -1) return false
    var nx = Number(x)
    var nz = Number(z)
    if (isNaN(nx) || isNaN(nz)) return false

    // 1. Rayon de 200 blocs autour du Hub ONU (-204, -172)
    var dx = nx - ONU_HUB_X
    var dz = nz - ONU_HUB_Z
    var distSq = dx * dx + dz * dz
    if (distSq <= 40000) return true
    if (Math.abs(dx) <= 200 && Math.abs(dz) <= 200) return true

    // 2. Chunks officiellement revendiqués par l'ONU (89 chunks)
    var chunkX = Math.floor(nx / 16)
    var chunkZ = Math.floor(nz / 16)
    if (chunkX >= -18 && chunkX <= -11 && chunkZ >= -16 && chunkZ <= -6) return true
    if (chunkX === 1 && chunkZ === 1) return true

    // 3. API FTB Chunks dynamique si disponible
    if (typeof isPositionInOnuClaim === 'function') {
        try {
            if (isPositionInOnuClaim(null, nx, nz)) return true
        } catch (e) {}
    }

    return false
}

function isPlayerInOnuZone(player) {
    if (!player) return false
    try {
        var px = Number(player.getX ? player.getX() : player.x)
        var pz = Number(player.getZ ? player.getZ() : player.z)
        var dimStr = String(getEntityDimensionId(player) || 'minecraft:overworld')
        var inZone = isCoordsInOnuZone(dimStr, px, pz)
        if (inZone) {
            console.info('[ONU Zone] Joueur ' + player.getName().getString() + ' détecté dans la zone ONU (X=' + px + ', Z=' + pz + ')')
        }
        return inZone
    } catch (e) {
        console.error('[ONU Zone] Erreur isPlayerInOnuZone: ' + e)
    }
    return false
}

function teleportPlayerToCoords(player, homeData, label) {
    if (!player || !homeData) return 0
    try {
        // 1. Interdiction de départ depuis la zone ONU (voulu RP)
        if (isPlayerInOnuZone(player)) {
            sendMsg(player, 'ONU', 'Zone Internationale : Les téléportations sont STRICTEMENT INTERDITES depuis les territoires de l\'ONU. Repartez par train ou par la route !', '§c')
            try {
                player.playSound('minecraft:entity.villager.no', 1.0, 1.0)
            } catch (ve) {}
            return 0
        }

        // 2. Interdiction d'arrivée vers un Home situé dans la zone ONU
        if (isCoordsInOnuZone(homeData.dim, homeData.x, homeData.z)) {
            sendMsg(player, 'ONU', 'Zone Internationale : Destination refusée. Votre Home est situé dans les territoires de l\'ONU.', '§c')
            try {
                player.playSound('minecraft:entity.villager.no', 1.0, 1.0)
            } catch (ve) {}
            return 0
        }

        var server = player.server
        var dimStr = homeData.dim || 'minecraft:overworld'
        var yaw = (typeof homeData.yaw === 'number') ? homeData.yaw : 0.0
        var pitch = (typeof homeData.pitch === 'number') ? homeData.pitch : 0.0

        var pName = player.getName().getString()
        var cmd = 'execute in ' + dimStr + ' run tp ' + pName + ' ' + homeData.x + ' ' + homeData.y + ' ' + homeData.z + ' ' + yaw + ' ' + pitch
        server.runCommandSilent(cmd)

        sendMsg(player, label || 'Téléportation', 'Téléportation effectuée avec succès !', '§a')
        
        try {
            player.playSound('minecraft:entity.enderman.teleport', 1.0, 1.0)
        } catch (se) {}
        return 1
    } catch (err) {
        console.error('[Homes] Erreur téléportation : ' + err)
        sendMsg(player, 'Erreur', 'Impossible de procéder à la téléportation : ' + err, '§c')
    }
    return 0
}

function teleportToNationHome(player) {
    if (!player) return 0
    if (isPlayerInOnuZone(player)) {
        sendMsg(player, 'ONU', 'Zone Internationale : Les téléportations sont STRICTEMENT INTERDITES dans un rayon de 200 blocs autour de l\'ONU (-204, -172). Repartez par train ou par la route !', '§c')
        try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
        return 0
    }
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Nation', 'Vous devez faire partie d\'une nation pour utiliser cette commande.', '§c')
        return 0
    }
    var home = getNationHome(team)
    if (!home) {
        sendMsg(player, 'Nation', 'Aucun Home n\'a encore été défini pour votre nation.', '§c')
        if (canManageNation(team, player)) {
            sendMsg(player, 'Aide', 'Placez-vous dans votre territoire et tapez : §e/nation sethome', '§7')
        }
        return 0
    }
    return teleportPlayerToCoords(player, home, 'Nation')
}

function teleportToAllyHome(player, targetNationName) {
    if (!player) return 0
    if (isPlayerInOnuZone(player)) {
        sendMsg(player, 'ONU', 'Zone Internationale : Les téléportations sont STRICTEMENT INTERDITES dans un rayon de 200 blocs autour de l\'ONU (-204, -172). Repartez par train ou par la route !', '§c')
        try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
        return 0
    }
    if (!targetNationName || targetNationName.trim().length === 0) {
        sendMsg(player, 'Aide', 'Usage : §e/ally home <nom_nation_alliée>', '§c')
        return 0
    }

    var myTeam = getPlayerNationTeam(player)
    if (!myTeam) {
        sendMsg(player, 'Alliance', 'Vous devez faire partie d\'une nation pour visiter une nation alliée.', '§c')
        return 0
    }

    var server = player.server
    var allyTeam = findTeamByNameOrPlayer(server, targetNationName)
    if (!allyTeam) {
        sendMsg(player, 'Alliance', 'La nation "§e' + targetNationName + '§c" est introuvable.', '§c')
        return 0
    }

    if (allyTeam.getId().equals(myTeam.getId())) {
        sendMsg(player, 'Alliance', 'Pour rejoindre votre propre nation, utilisez : §e/nation home', '§e')
        return 0
    }

    // Vérification de l'alliance bilatérale officielle
    if (typeof isAllied === 'function' && !isAllied(server, myTeam.getId(), allyTeam.getId())) {
        sendMsg(player, 'Diplomatie', 'Votre nation n\'a pas de traité d\'alliance actif avec §6' + allyTeam.getName().getString() + '§c.', '§c')
        return 0
    }

    var allyHome = getNationAllyHome(allyTeam)
    if (!allyHome) {
        sendMsg(player, 'Alliance', 'La nation §6' + allyTeam.getName().getString() + ' §cn\'a pas encore défini d\'Ambassade pour ses alliés.', '§c')
        sendMsg(player, 'Conseil', 'Leur dirigeant doit se placer dans leur base et taper : §e/nation setallyhome', '§7')
        return 0
    }

    var allyName = allyTeam.getName().getString()
    var success = teleportPlayerToCoords(player, allyHome, 'Ambassade')
    if (success) {
        sendMsg(player, 'Diplomatie', '§aBienvenue sur le territoire allié de §6' + allyName + ' §a!', '§a')
        notifyTeam(allyTeam, 'Visite Diplomatique', 'Le citoyen allié §e' + player.getName().getString() + ' §f(§b' + myTeam.getName().getString() + '§f) est arrivé à votre ambassade.', '§b')
    }
    return success
}
