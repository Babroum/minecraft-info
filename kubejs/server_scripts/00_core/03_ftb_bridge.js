// priority: 103
// =============================================================================
// Third World Server Script - Core 03 : Passerelle FTB Teams, Chunks & Standardisation
// =============================================================================

var UUID = Java.loadClass('java.util.UUID')

// -----------------------------------------------------------------------------
// 1. HELPERS ENTITÉS & DIMENSIONS
// -----------------------------------------------------------------------------
function getPlayerUUID(player) {
    if (!player) return null
    try {
        if (player.getUUID) return player.getUUID()
        if (player.getUuid) return player.getUuid()
        if (player.uuid) return (typeof player.uuid === 'string' ? UUID.fromString(player.uuid) : player.uuid)
        if (player.getStringUuid) return UUID.fromString(player.getStringUuid())
    } catch (e) {}
    return null
}

function getEntityDimensionId(entity) {
    if (!entity) return 'minecraft:overworld'
    try {
        var lvl = null
        if (typeof entity.level === 'function') lvl = entity.level()
        else if (entity.level) lvl = entity.level
        else if (typeof entity.getLevel === 'function') lvl = entity.getLevel()

        if (lvl) {
            var d = null
            if (typeof lvl.dimension === 'function') d = lvl.dimension()
            else if (lvl.dimension) d = lvl.dimension

            if (d) {
                if (typeof d.location === 'function') return String(d.location())
                if (d.location) return String(d.location)
                var str = String(d)
                if (str.indexOf('overworld') !== -1) return 'minecraft:overworld'
                if (str.indexOf('the_nether') !== -1) return 'minecraft:the_nether'
                if (str.indexOf('the_end') !== -1) return 'minecraft:the_end'
                return str
            }
        }
    } catch (e) {
        console.error('[Bridge] Erreur extraction dimension : ' + e)
    }
    return 'minecraft:overworld'
}

function getEntityX(entity) {
    if (!entity) return 0
    try {
        if (typeof entity.getX === 'function') return Number(entity.getX())
        if (entity.getX) return Number(entity.getX())
        if (entity.x !== undefined) return Number(entity.x)
    } catch (e) {}
    return 0
}

function getEntityZ(entity) {
    if (!entity) return 0
    try {
        if (typeof entity.getZ === 'function') return Number(entity.getZ())
        if (entity.getZ) return Number(entity.getZ())
        if (entity.z !== undefined) return Number(entity.z)
    } catch (e) {}
    return 0
}

// -----------------------------------------------------------------------------
// 2. INTÉGRATION FTB TEAMS
// -----------------------------------------------------------------------------
function getPlayerNationTeam(player) {
    if (!player) return null
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) return null
        
        var mgr = teamsApi.getManager()
        var playerUUID = getPlayerUUID(player)
        if (!playerUUID) return null
        var uuidStr = playerUUID.toString()

        // Recherche par ID
        try {
            var teamOpt = mgr.getTeamForPlayerID(playerUUID)
            if (teamOpt && teamOpt.isPresent()) {
                var foundTeam = teamOpt.get()
                if (foundTeam) {
                    if (foundTeam.isPartyTeam && foundTeam.isPartyTeam()) return foundTeam
                    if (foundTeam.getEffectiveTeam && foundTeam.getEffectiveTeam().isPartyTeam()) return foundTeam.getEffectiveTeam()
                }
            }
        } catch (e1) {}

        // Recherche par joueur
        try {
            var optByPlayer = mgr.getTeamForPlayer(player)
            if (optByPlayer && optByPlayer.isPresent()) {
                var foundTeam2 = optByPlayer.get()
                if (foundTeam2) {
                    if (foundTeam2.isPartyTeam && foundTeam2.isPartyTeam()) return foundTeam2
                    if (foundTeam2.getEffectiveTeam && foundTeam2.getEffectiveTeam().isPartyTeam()) return foundTeam2.getEffectiveTeam()
                }
            }
        } catch (e2) {}

        // Parcours de la liste des équipes
        try {
            var allTeams = mgr.getTeams()
            if (allTeams) {
                var it = allTeams.iterator()
                while (it.hasNext()) {
                    var t = it.next()
                    if (t && t.isPartyTeam && t.isPartyTeam()) {
                        var owner = t.getOwner ? t.getOwner() : null
                        if (owner && (owner.equals(playerUUID) || owner.toString() === uuidStr)) {
                            return t
                        }
                        var members = t.getMembers ? t.getMembers() : null
                        if (members) {
                            var itMem = members.iterator()
                            while (itMem.hasNext()) {
                                var m = itMem.next()
                                if (m && (m.equals(playerUUID) || m.toString() === uuidStr)) {
                                    return t
                                }
                            }
                        }
                    }
                }
            }
        } catch (e3) {}
    } catch (err) {
        console.error('[Bridge] Erreur getPlayerNationTeam : ' + err)
    }
    return null
}

function getPlayerTeamRank(team, player) {
    if (!team || !player) return 'none'
    var pUuid = getPlayerUUID(player)
    if (!pUuid) return 'none'
    var uuidStr = pUuid.toString()

    try {
        var owner = team.getOwner()
        if (owner && (owner.equals(pUuid) || owner.toString() === uuidStr)) {
            return 'owner'
        }
    } catch (e) {}

    try {
        if (team.getOfficers && team.getOfficers().contains(pUuid)) {
            return 'officer'
        }
        if (team.getRankForPlayer) {
            var rank = team.getRankForPlayer(pUuid)
            if (rank) {
                var rankStr = rank.toString().toLowerCase()
                if (rankStr.includes('owner')) return 'owner'
                if (rankStr.includes('officer')) return 'officer'
                if (rankStr.includes('member')) return 'member'
            }
        }
    } catch (e2) {}

    try {
        var members = team.getMembers()
        if (members && members.contains(pUuid)) {
            return 'member'
        }
    } catch (e3) {}

    return 'none'
}

function isTeamOwner(team, player) {
    return getPlayerTeamRank(team, player) === 'owner'
}

function isTeamOfficerOrOwner(team, player) {
    var r = getPlayerTeamRank(team, player)
    return r === 'owner' || r === 'officer'
}

function findTeamByNameOrPlayer(server, query) {
    if (!query || !server) return null
    var q = query.toLowerCase().trim()
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) return null
        var mgr = teamsApi.getManager()
        var allTeams = mgr.getTeams()
        if (allTeams) {
            var it = allTeams.iterator()
            while (it.hasNext()) {
                var t = it.next()
                if (!t || !t.isPartyTeam()) continue
                var tName = t.getName().getString().toLowerCase().trim()
                var tShort = t.getShortName() ? t.getShortName().toLowerCase().trim() : ''
                if (tName === q || tShort === q) return t
            }
        }

        var playerTarget = server.getPlayer(query)
        if (playerTarget) {
            var pTeam = getPlayerNationTeam(playerTarget)
            if (pTeam && pTeam.isPartyTeam()) return pTeam
        }
    } catch (e) {
        console.error('[Bridge] Erreur findTeamByNameOrPlayer : ' + e)
    }
    return null
}

function getTeamById(server, teamIdStr) {
    if (!teamIdStr) return null
    var str = teamIdStr.toString().trim()
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) return null
        var mgr = teamsApi.getManager()

        try {
            var uuid = UUID.fromString(str)
            var opt = mgr.getTeamByID(uuid)
            if (opt && opt.isPresent()) return opt.get()
        } catch (ue) {}

        var allTeams = mgr.getTeams()
        if (allTeams) {
            var it = allTeams.iterator()
            while (it.hasNext()) {
                var t = it.next()
                if (t && t.getId().toString() === str) return t
            }
        }
    } catch (e) {
        console.error('[Bridge] Erreur getTeamById : ' + e)
    }
    return null
}

function getTeamDisplayName(server, teamIdStr) {
    if (!teamIdStr) return 'Nation inconnue'
    var t = getTeamById(server, teamIdStr)
    if (t) {
        try { return t.getName().getString() } catch (e) { return t.getName().toString() }
    }
    var str = teamIdStr.toString().trim()
    if (str.length !== 36 || str.indexOf('-') === -1) {
        return str
    }
    return 'Nation (' + str.substring(0, 8) + '...)'
}

// -----------------------------------------------------------------------------
// 3. ENVOI STANDARDISÉ DE MESSAGES (CHAT SOBRE THIRD WORLD)
// -----------------------------------------------------------------------------
function sendMsg(target, prefix, text, colorCode) {
    if (!target) return
    var pCol = colorCode || '§6'
    var fullMsg = '§7[' + pCol + prefix + '§7] §f' + text
    try {
        if (target.sendSystemMessage) target.sendSystemMessage(Component.literal(fullMsg))
        else if (target.tell) target.tell(Component.literal(fullMsg))
    } catch (e) {}
}

function sendPlayerMsg(player, msg) {
    if (!player || !msg) return
    try {
        if (player.sendSystemMessage) player.sendSystemMessage(Component.literal(msg))
        else if (player.tell) player.tell(Component.literal(msg))
    } catch (e) {}
}

function broadcastMsg(server, prefix, text, colorCode) {
    if (!server) return
    var pCol = colorCode || '§c'
    var fullMsg = '§7[' + pCol + prefix + '§7] §f' + text
    try {
        server.tell(Component.literal(fullMsg))
    } catch (e) {}
}

function notifyTeam(team, prefix, text, colorCode) {
    if (!team) return
    try {
        var online = team.getOnlineMembers()
        if (online) {
            var it = online.iterator()
            while (it.hasNext()) {
                var p = it.next()
                sendMsg(p, prefix, text, colorCode)
            }
        }
    } catch (e) {}
}

// -----------------------------------------------------------------------------
// 4. GESTIONNAIRE CENTRALISÉ DES GUERRES (WARS REGISTRY)
// -----------------------------------------------------------------------------
var WARS_CACHE = null

function loadWarsRegistry(server) {
    if (WARS_CACHE !== null) return WARS_CACHE
    var fileData = TW_ReadState('wars.json')
    if (fileData) {
        WARS_CACHE = toJsObject(fileData)
        return WARS_CACHE
    }
    WARS_CACHE = {}
    return WARS_CACHE
}

function saveWarsRegistry(server, wars) {
    WARS_CACHE = wars || {}
    TW_WriteState('wars.json', WARS_CACHE)
}

function getWar(wars, id) {
    if (!wars || id === null || id === undefined) return null
    var sId = String(id)
    if (typeof wars.get === 'function') {
        try {
            var item = wars.get(sId)
            if (item) return item
            var num = parseInt(sId, 10)
            if (!isNaN(num)) {
                var item2 = wars.get(num)
                if (item2) return item2
            }
        } catch (e) {}
    }
    try {
        if (wars[sId] !== undefined) return wars[sId]
    } catch (e2) {}
    return null
}

function setWar(wars, id, warObj) {
    if (!wars || id === null || id === undefined) return
    var sId = String(id)
    if (typeof wars.put === 'function') {
        try { wars.put(sId, warObj) } catch (pe) {}
    }
    try { wars[sId] = warObj } catch (e) {}
}

function deleteWar(wars, id) {
    if (!wars || id === null || id === undefined) return
    var sId = String(id)
    if (typeof wars.remove === 'function') {
        try { wars.remove(sId) } catch (re) {}
    }
    try { delete wars[sId] } catch (e) {}
}

function isAtLeastOneMemberOnline(server, teamId) {
    if (!server || !teamId) return false
    var teamIdStr = teamId.toString()
    try {
        var team = getTeamById(server, teamId)
        if (team && team.getOnlineMembers) {
            var online = team.getOnlineMembers()
            if (online && !online.isEmpty()) return true
        }
    } catch (e) {}
    try {
        var players = server.getPlayerList().getPlayers()
        for (var i = 0; i < players.size(); i++) {
            var p = players.get(i)
            if (p && !p.isFake()) {
                var pTeam = getPlayerNationTeam(p)
                if (pTeam && pTeam.getId().toString() === teamIdStr) {
                    return true
                }
            }
        }
    } catch (err) {}
    return false
}

function isNationInConflictWith(server, teamAId, teamBId) {
    if (!teamAId || !teamBId || !server) return false
    var aStr = teamAId.toString()
    var bStr = teamBId.toString()
    if (aStr === bStr) return false

    var wars = loadWarsRegistry(server)
    if (!wars) return false

    for (var id in wars) {
        var w = getWar(wars, id)
        if (!w) continue
        if (w.type !== 'CONFLICT') continue
        if (w.status !== 'ACTIVE' && w.status !== 'COUNTDOWN') continue

        var atkId = w.attackerTeamId || w.attackerLeader
        var defId = w.defenderTeamId || w.defenderLeader
        if ((atkId === aStr && defId === bStr) || (atkId === bStr && defId === aStr)) {
            return true
        }
    }
    return false
}

function getActiveConflictBetween(server, teamAId, teamBId) {
    if (!teamAId || !teamBId || !server) return null
    var aStr = teamAId.toString()
    var bStr = teamBId.toString()
    var wars = loadWarsRegistry(server)
    if (!wars) return null

    for (var id in wars) {
        var w = getWar(wars, id)
        if (!w) continue
        if (w.type !== 'CONFLICT') continue
        if (w.status !== 'ACTIVE' && w.status !== 'COUNTDOWN') continue

        var atkId = w.attackerTeamId || w.attackerLeader
        var defId = w.defenderTeamId || w.defenderLeader
        if ((atkId === aStr && defId === bStr) || (atkId === bStr && defId === aStr)) {
            return w
        }
    }
    return null
}
