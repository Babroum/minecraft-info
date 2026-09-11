// priority: 100
// =============================================================================
// Third World Server Script - Helpers FTB Teams, Chunks & Standardisation Chat
// =============================================================================

var UUID = Java.loadClass('java.util.UUID')

/**
 * Convertit récursivement les structures Java (Map, List) en Objets et Tableaux JavaScript purs
 */
function toJsObject(val) {
    if (val === null || val === undefined) return val
    if (typeof val !== 'object') return val

    if (Array.isArray(val)) {
        for (var a = 0; a < val.length; a++) {
            val[a] = toJsObject(val[a])
        }
        return val
    }

    try {
        if (typeof val.keySet === 'function' && typeof val.get === 'function') {
            var obj = {}
            var it = val.keySet().iterator()
            while (it.hasNext()) {
                var k = it.next()
                var keyStr = (k !== null && k !== undefined) ? String(k) : ''
                obj[keyStr] = toJsObject(val.get(k))
            }
            return obj
        }

        if (typeof val.size === 'function' && typeof val.get === 'function') {
            var arr = []
            var len = val.size()
            for (var i = 0; i < len; i++) {
                arr.push(toJsObject(val.get(i)))
            }
            return arr
        }
    } catch (e) {}

    return val
}

/**
 * Persistance JSON native KubeJS & Java NIO (retourne un objet JavaScript pur)
 */
function readJsonData(filename) {
    try {
        var FileClass = Java.loadClass('java.io.File')
        var f = new FileClass('kubejs/data/' + filename)
        if (f.exists()) {
            var FilesClass = Java.loadClass('java.nio.file.Files')
            var raw = String(FilesClass.readString(f.toPath()))
            if (raw && raw.trim() !== '') {
                return toJsObject(JSON.parse(raw))
            }
        }
    } catch (fe) {}
    try {
        var data = JsonIO.read('kubejs/data/' + filename)
        if (data) {
            return toJsObject(data)
        }
    } catch (e) {
        console.error('[Storage] Erreur lecture ' + filename + ' : ' + e)
    }
    return null
}

function writeJsonData(filename, data) {
    try {
        var FileClass = Java.loadClass('java.io.File')
        var f = new FileClass('kubejs/data/' + filename)
        var parent = f.getParentFile()
        if (parent && !parent.exists()) {
            parent.mkdirs()
        }
        var FilesClass = Java.loadClass('java.nio.file.Files')
        var jsonStr = JSON.stringify(data || {}, null, 2)
        FilesClass.writeString(f.toPath(), jsonStr, [])
        return
    } catch (fe) {}
    try {
        JsonIO.write('kubejs/data/' + filename, data)
    } catch (e) {
        console.error('[Storage] Erreur ecriture ' + filename + ' : ' + e)
    }
}

/**
 * Accès sécurisé aux guerres (évite les bugs d'indexation numérique sur Map Java ou Objet JS)
 */
function getWar(wars, id) {
    if (!wars || id === null || id === undefined) return null
    var sId = String(id)
    if (typeof wars.get === 'function') {
        try {
            var item = wars.get(sId)
            if (item) return item
        } catch (e) {}
        try {
            var num = parseInt(sId, 10)
            if (!isNaN(num)) {
                var item2 = wars.get(num)
                if (item2) return item2
            }
        } catch (e) {}
    }
    try {
        if (wars[sId] !== undefined) return wars[sId]
    } catch (e) {}
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

/**
 * Récupère l'identifiant de dimension d'une entité ou joueur de manière robuste
 */
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
        console.error('[Dimension] Erreur extraction dimension: ' + e)
    }
    return 'minecraft:overworld'
}

function getEntityX(entity) {
    if (!entity) return 0
    try {
        if (typeof entity.getX === 'function') return Number(entity.getX())
        if (entity.getX) return Number(entity.getX())
        if (entity.x !== undefined) return Number(entity.x)
        if (entity.position) {
            var pos = typeof entity.position === 'function' ? entity.position() : entity.position
            if (pos && pos.x !== undefined) return Number(pos.x)
        }
    } catch (e) {}
    return 0
}

function getEntityZ(entity) {
    if (!entity) return 0
    try {
        if (typeof entity.getZ === 'function') return Number(entity.getZ())
        if (entity.getZ) return Number(entity.getZ())
        if (entity.z !== undefined) return Number(entity.z)
        if (entity.position) {
            var pos = typeof entity.position === 'function' ? entity.position() : entity.position
            if (pos && pos.z !== undefined) return Number(pos.z)
        }
    } catch (e) {}
    return 0
}

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

/**
 * Récupère l'équipe Party (Nation) d'un joueur
 */
function getPlayerNationTeam(player) {
    if (!player) return null
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) return null
        
        var mgr = teamsApi.getManager()
        var playerUUID = getPlayerUUID(player)
        if (!playerUUID) return null
        var uuidStr = playerUUID.toString()

        // 1. Recherche directe via getTeamForPlayerID
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

        // 2. Recherche directe via getTeamForPlayer
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

        // 3. Recherche dans les équipes de type Party
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
                        // Vérification additionnelle via getRank
                        if (t.getRank) {
                            try {
                                var rankObj = t.getRank(playerUUID)
                                if (rankObj && String(rankObj).toLowerCase().indexOf('none') === -1) {
                                    return t
                                }
                            } catch (rErr) {}
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
