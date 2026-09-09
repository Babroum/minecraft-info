// priority: 100
// =============================================================================
// NationGlory Server Script - Helpers FTB Teams, Chunks & Standardisation Chat
// =============================================================================

/**
 * Persistance JSON native KubeJS (JsonIO)
 */
function readJsonData(filename) {
    try {
        var data = JsonIO.read('kubejs/data/' + filename)
        if (data) return data
    } catch (e) {
        console.error('[Storage] Erreur lecture ' + filename + ' : ' + e)
    }
    return null
}

function writeJsonData(filename, data) {
    try {
        JsonIO.write('kubejs/data/' + filename, data)
    } catch (e) {
        console.error('[Storage] Erreur ecriture ' + filename + ' : ' + e)
    }
}

/**
 * Récupère l'équipe Party (Nation) d'un joueur
 */
function getPlayerNationTeam(player) {
    if (!player) return null
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) return null
        
        var mgr = teamsApi.getManager()
        var playerUUID = null
        try {
            if (player.getUUID) playerUUID = player.getUUID()
            else if (player.uuid) playerUUID = player.uuid
            else if (player.getStringUuid) playerUUID = UUID.fromString(player.getStringUuid())
        } catch (ue) {}

        if (!playerUUID) return null
        var uuidStr = playerUUID.toString()

        // 1. Recherche directe via getTeamForPlayerID
        try {
            var teamOpt = mgr.getTeamForPlayerID(playerUUID)
            if (teamOpt && teamOpt.isPresent()) {
                var foundTeam = teamOpt.get()
                if (foundTeam && foundTeam.isPartyTeam()) return foundTeam
            }
        } catch (e1) {}

        // 2. Recherche directe via getTeamForPlayer
        try {
            var optByPlayer = mgr.getTeamForPlayer(player)
            if (optByPlayer && optByPlayer.isPresent()) {
                var foundTeam2 = optByPlayer.get()
                if (foundTeam2 && foundTeam2.isPartyTeam()) return foundTeam2
            }
        } catch (e2) {}

        // 3. Recherche dans les équipes de type Party
        try {
            var allTeams = mgr.getTeams()
            if (allTeams) {
                var it = allTeams.iterator()
                while (it.hasNext()) {
                    var t = it.next()
                    if (t && t.isPartyTeam()) {
                        var owner = t.getOwner()
                        if (owner && (owner.equals(playerUUID) || owner.toString() === uuidStr)) {
                            return t
                        }
                        var members = t.getMembers()
                        if (members && members.contains(playerUUID)) {
                            return t
                        }
                    }
                }
            }
        } catch (e3) {}

    } catch (err) {
        console.error('[FTB] Erreur getPlayerNationTeam : ' + err)
    }
    return null
}

/**
 * Récupère l'UUID d'un joueur sous forme d'objet UUID
 */
function getPlayerUUID(player) {
    if (!player) return null
    try {
        if (player.getUUID) return player.getUUID()
        if (player.uuid) return player.uuid
        if (player.getStringUuid) return UUID.fromString(player.getStringUuid())
    } catch (e) {}
    return null
}

/**
 * Détermine le rang d'un joueur dans son équipe ('owner', 'officer', 'member', 'none')
 */
function getPlayerTeamRank(team, player) {
    if (!team || !player) return 'none'
    var pUuid = getPlayerUUID(player)
    if (!pUuid) return 'none'
    var uuidStr = pUuid.toString()

    // 1. Propriétaire (Leader)
    try {
        var owner = team.getOwner()
        if (owner && (owner.equals(pUuid) || owner.toString() === uuidStr)) {
            return 'owner'
        }
    } catch (e) {}

    // 2. Officier
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

    // 3. Membre ordinaire
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

/**
 * Trouve une équipe par nom ou joueur
 */
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
        console.error('[FTB] Erreur findTeamByNameOrPlayer : ' + e)
    }
    return null
}

/**
 * Recherche une équipe par son UUID string
 */
function getTeamById(server, teamIdStr) {
    if (!teamIdStr) return null
    var str = teamIdStr.toString().trim()
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) return null
        var mgr = teamsApi.getManager()

        // 1. Essai par getTeamByID
        try {
            var uuid = UUID.fromString(str)
            var opt = mgr.getTeamByID(uuid)
            if (opt && opt.isPresent()) return opt.get()
        } catch (ue) {}

        // 2. Recherche dans la collection complète
        var allTeams = mgr.getTeams()
        if (allTeams) {
            var it = allTeams.iterator()
            while (it.hasNext()) {
                var t = it.next()
                if (t && t.getId().toString() === str) {
                    return t
                }
            }
        }
    } catch (e) {
        console.error('[FTB] Erreur getTeamById : ' + e)
    }
    return null
}

/**
 * Renvoie TOUJOURS le vrai nom de la nation (jamais son UUID brut)
 */
function getTeamDisplayName(server, teamIdStr) {
    if (!teamIdStr) return 'Nation inconnue'
    var t = getTeamById(server, teamIdStr)
    if (t) {
        try {
            return t.getName().getString()
        } catch (e) {
            return t.getName().toString()
        }
    }

    var str = teamIdStr.toString().trim()
    // Si la chaîne n'est pas un UUID (ne fait pas 36 caractères avec 4 tirets)
    if (str.length !== 36 || str.indexOf('-') === -1) {
        return str
    }
    return 'Nation (' + str.substring(0, 8) + '...)'
}

// =============================================================================
// ENVOI DE MESSAGES SOBRES & RESPONSIVES (PAS DE BORDURES GÉANTES)
// =============================================================================

function sendMsg(target, prefix, text, colorCode) {
    if (!target) return
    var pCol = colorCode || '§6'
    var fullMsg = '§7[' + pCol + prefix + '§7] §f' + text
    try {
        if (target.sendSystemMessage) {
            target.sendSystemMessage(Component.literal(fullMsg))
        } else if (target.tell) {
            target.tell(Component.literal(fullMsg))
        }
    } catch (e) {}
}

function sendPlayerMsg(player, msg) {
    if (!player || !msg) return
    try {
        if (player.sendSystemMessage) {
            player.sendSystemMessage(Component.literal(msg))
        } else if (player.tell) {
            player.tell(Component.literal(msg))
        }
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
    } catch (e) {
        console.error('[FTB] Erreur notifyTeam: ' + e)
    }
}
