// priority: 50
// =============================================================================
// Third World Server Script - Moteur de Conflits Multi-Guerres & Coalitions
// =============================================================================

var WAR_COST = 2500 // Coût de déclaration en Robert Coins (R)
var WARS_CACHE = null

/**
 * Récupère une entrée de guerre de façon sécurisée (supporte Map Java et Objet JS)
 */
function getWar(wars, id) {
    if (!wars || id === null || id === undefined) return null
    var sId = String(id)
    if (typeof wars.get === 'function') {
        try {
            var item = wars.get(sId)
            if (item) return item
            var num = parseInt(sId, 10)
            if (!isNaN(num)) {
                item = wars.get(num)
                if (item) return item
            }
        } catch (me) {}
    }
    try {
        if (wars[sId]) return wars[sId]
    } catch (e) {}
    return null
}

/**
 * Enregistre ou met à jour une guerre
 */
function setWar(wars, id, warObj) {
    if (!wars || id === null || id === undefined) return
    var sId = String(id)
    if (typeof wars.put === 'function') {
        try { wars.put(sId, warObj) } catch (pe) {}
    }
    try {
        wars[sId] = warObj
    } catch (e) {}
}

/**
 * Supprime une guerre du registre
 */
function deleteWar(wars, id) {
    if (!wars || id === null || id === undefined) return
    var sId = String(id)
    if (typeof wars.remove === 'function') {
        try { wars.remove(sId) } catch (re) {}
    }
    try {
        delete wars[sId]
    } catch (e) {}
}

/**
 * Charge le registre des guerres depuis le cache mémoire et le fichier wars.json
 */
function loadWarsRegistry(server) {
    if (WARS_CACHE !== null) return WARS_CACHE
    var fileData = readJsonData('wars.json')
    if (fileData) {
        WARS_CACHE = (typeof toJsObject === 'function') ? toJsObject(fileData) : fileData
        return WARS_CACHE
    }
    WARS_CACHE = {}
    return WARS_CACHE
}

/**
 * Sauvegarde le registre des guerres en mémoire vive et sur disque
 */
function saveWarsRegistry(server, wars) {
    WARS_CACHE = wars || {}
    writeJsonData('wars.json', WARS_CACHE)
}

/**
 * Génère un ID de guerre court et séquentiel (#1, #2, #3...)
 */
function getNextWarId(server) {
    var wars = loadWarsRegistry(server)
    var count = 0
    for (var k in wars) {
        var n = parseInt(k, 10)
        if (!isNaN(n) && n > count) count = n
    }
    count++
    return count.toString()
}

/**
 * Recherche intelligente d'une guerre (par ID court, ID complet, ou nom de nation)
 */
function findWarQuery(server, query, requirePending) {
    if (!server) return null
    var wars = loadWarsRegistry(server)

    // 1. Si aucun argument : sélectionne la dernière guerre en attente
    if (!query || query.trim() === '') {
        var lastPending = null
        for (var id in wars) {
            var w = getWar(wars, id)
            if (!w) continue
            if (!requirePending || w.status === 'PENDING_ADMIN') {
                lastPending = w
            }
        }
        return lastPending
    }

    var q = query.toLowerCase().trim()
    if (q.startsWith('#')) q = q.substring(1)

    // 2. Recherche directe par clé exacte
    var direct = getWar(wars, q) || getWar(wars, 'war_' + q)
    if (direct) {
        if (!requirePending || direct.status === 'PENDING_ADMIN') return direct
    }

    // 3. Recherche par belligérants ou ID partiel
    for (var wId in wars) {
        var w = getWar(wars, wId)
        if (!w) continue
        if (requirePending && w.status !== 'PENDING_ADMIN') continue

        var nameA = (w.attackerName || getTeamDisplayName(server, w.attackerLeader)).toLowerCase()
        var nameB = (w.defenderName || getTeamDisplayName(server, w.defenderLeader)).toLowerCase()
        if (nameA === q || nameB === q || nameA.includes(q) || nameB.includes(q) || String(w.id).toLowerCase() === q || String(w.id).toLowerCase().includes(q)) {
            return w
        }
    }

    // 4. Deuxième passe sans filtre de statut si non trouvé
    if (requirePending) {
        return findWarQuery(server, query, false)
    }

    return null
}

/**
 * Vérifie si deux équipes sont ennemies dans une guerre ACTIVE
 */
function isNationAtWarWith(server, teamAId, teamBId) {
    if (!teamAId || !teamBId || !server) return false
    var aStr = teamAId.toString()
    var bStr = teamBId.toString()
    if (aStr === bStr) return false

    var wars = loadWarsRegistry(server)
    for (var id in wars) {
        var w = getWar(wars, id)
        if (!w || w.status !== 'ACTIVE') continue

        var inAtk = w.attackers && w.attackers.indexOf(aStr) !== -1
        var inDef = w.defenders && w.defenders.indexOf(bStr) !== -1
        if (inAtk && inDef) return true

        var inAtk2 = w.attackers && w.attackers.indexOf(bStr) !== -1
        var inDef2 = w.defenders && w.defenders.indexOf(aStr) !== -1
        if (inAtk2 && inDef2) return true
    }
    return false
}

/**
 * Récupère la liste des guerres actives d'une équipe
 */
function getTeamActiveWars(server, teamId) {
    if (!teamId || !server) return []
    var idStr = teamId.toString()
    var wars = loadWarsRegistry(server)
    var result = []
    for (var id in wars) {
        var w = getWar(wars, id)
        if (w && w.status === 'ACTIVE') {
            if ((w.attackers && w.attackers.indexOf(idStr) !== -1) || (w.defenders && w.defenders.indexOf(idStr) !== -1)) {
                result.push(w)
            }
        }
    }
    return result
}

/**
 * Trouve une guerre active entre deux équipes
 */
function findActiveWarBetween(server, teamAId, teamBId) {
    if (!teamAId || !teamBId || !server) return null
    var aStr = teamAId.toString()
    var bStr = teamBId.toString()
    var wars = loadWarsRegistry(server)
    for (var id in wars) {
        var w = getWar(wars, id)
        if (!w || w.status !== 'ACTIVE') continue
        var hasA = (w.attackers.indexOf(aStr) !== -1 || w.defenders.indexOf(aStr) !== -1)
        var hasB = (w.attackers.indexOf(bStr) !== -1 || w.defenders.indexOf(bStr) !== -1)
        if (hasA && hasB) return w
    }
    return null
}

/**
 * Intègre une équipe alliée à une coalition
 */
function joinWarCoalition(server, warId, allyTeamId, callingTeamIdStr) {
    if (!server || !warId || !allyTeamId) return false
    var wars = loadWarsRegistry(server)
    var w = getWar(wars, warId)
    if (!w || w.status !== 'ACTIVE') return false

    var allyStr = allyTeamId.toString()
    var allyName = getTeamDisplayName(server, allyStr)

    if (w.attackers.indexOf(callingTeamIdStr) !== -1) {
        if (w.attackers.indexOf(allyStr) === -1) {
            w.attackers.push(allyStr)
            if (!w.attackerNames) w.attackerNames = []
            if (w.attackerNames.indexOf(allyName) === -1) w.attackerNames.push(allyName)
        }
    } else if (w.defenders.indexOf(callingTeamIdStr) !== -1) {
        if (w.defenders.indexOf(allyStr) === -1) {
            w.defenders.push(allyStr)
            if (!w.defenderNames) w.defenderNames = []
            if (w.defenderNames.indexOf(allyName) === -1) w.defenderNames.push(allyName)
        }
    }

    saveWarsRegistry(server, wars)
    return true
}

/**
 * Déclaration de guerre soumise par un Leader ou un Staff (nécessite validation staff pour les joueurs normaux)
 */
function requestWarDeclaration(player, targetQuery) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Guerre', 'Vous devez appartenir à une nation.', '§c')
        return 0
    }
    var isOp = player.hasPermissions(2)
    if (!isTeamOwner(team, player) && !isOp) {
        sendMsg(player, 'Guerre', 'Seul le Leader de la nation peut déclarer une guerre.', '§c')
        return 0
    }

    var targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    if (!targetTeam) {
        sendMsg(player, 'Guerre', 'Nation introuvable : "' + targetQuery + '".', '§c')
        return 0
    }

    if (targetTeam.getId().equals(team.getId())) {
        sendMsg(player, 'Guerre', 'Vous ne pouvez pas déclarer la guerre à votre propre nation.', '§c')
        return 0
    }

    if (isNationAtWarWith(server, team.getId(), targetTeam.getId())) {
        sendMsg(player, 'Guerre', 'Vous êtes déjà en guerre contre cette nation.', '§c')
        return 0
    }

    // Trahison / rupture automatique de l'alliance si les deux nations étaient alliées
    if (typeof isAllied === 'function' && isAllied(server, team.getId(), targetTeam.getId())) {
        if (typeof breakAlliance === 'function') {
            breakAlliance(server, team.getId(), targetTeam.getId(), 'war_declaration')
        }
    }

    // Débit des frais de déclaration de guerre (gratuit pour les admins/OP en test)
    if (!isOp && typeof withdrawNationMoney === 'function') {
        var success = withdrawNationMoney(team, player, WAR_COST)
        if (!success) {
            sendMsg(player, 'Guerre', 'Fonds insuffisants ! La déclaration de guerre coûte ' + WAR_COST + ' R au Trésor national.', '§c')
            return 0
        }
    }

    var warId = getNextWarId(server)
    var wars = loadWarsRegistry(server)
    var atkName = team.getName().getString()
    var defName = targetTeam.getName().getString()

    var newWar = {
        id: warId,
        status: isOp ? 'ACTIVE' : 'PENDING_ADMIN',
        requesterUuid: player.getStringUuid ? player.getStringUuid() : player.uuid.toString(),
        attackerName: atkName,
        defenderName: defName,
        attackerLeader: team.getId().toString(),
        defenderLeader: targetTeam.getId().toString(),
        attackers: [team.getId().toString()],
        defenders: [targetTeam.getId().toString()],
        attackerNames: [atkName],
        defenderNames: [defName],
        costPaid: isOp ? 0 : WAR_COST,
        createdAt: Date.now(),
        startedAt: isOp ? Date.now() : null,
        peaceRequestedBy: null
    }
    setWar(wars, warId, newWar)

    saveWarsRegistry(server, wars)

    if (isOp) {
        broadcastMsg(server, 'Guerre', 'Guerre déclarée (# ' + warId + ') : §e' + atkName + ' §fcontre §e' + defName + ' §f! Les hostilités sont immédiatement ouvertes.', '§c')
        if (typeof triggerCallToArms === 'function') {
            var wEntry = getWar(wars, warId)
            if (wEntry) {
                var aTeam = getTeamById(server, wEntry.attackerLeader)
                var bTeam = getTeamById(server, wEntry.defenderLeader)
                if (aTeam && bTeam) {
                    triggerCallToArms(server, warId, aTeam.getId(), bTeam.getId())
                    triggerCallToArms(server, warId, bTeam.getId(), aTeam.getId())
                }
            }
        }
        return 1
    }

    sendMsg(player, 'Guerre', 'Demande de guerre #' + warId + ' contre §e' + defName + ' §fsoumise au Staff (' + WAR_COST + ' R débités).', '§a')

    // Diffusion de l'alerte Staff avec boutons cliquables
    var staffMsg = Component.literal('§7[§6Staff§7] §fDemande de guerre §e#' + warId + ' §f: §e' + atkName + ' §fVS §e' + defName + ' §7| ')
    try {
        var btnApprove = Component.literal('§a§l[ACCEPTER]')
            .clickRunCommand('/war approve ' + warId)
            .hover(Component.literal('§aCliquer pour valider la guerre #' + warId))
        var btnReject = Component.literal('§c§l[REFUSER]')
            .clickRunCommand('/war reject ' + warId)
            .hover(Component.literal('§cCliquer pour refuser la guerre #' + warId))

        staffMsg = staffMsg.append(btnApprove).append(Component.literal(' ')).append(btnReject)
    } catch (e) {
        staffMsg = Component.literal('§7[§6Staff§7] §fDemande de guerre #' + warId + ' : §e' + atkName + ' §fVS §e' + defName + ' §f(Tapez §a/war approve ' + warId + '§f)')
    }

    server.tell(staffMsg)
    return 1
}

/**
 * Lance immédiatement une guerre active (admin/OP ou test)
 */
function startActiveWar(server, player, targetQuery) {
    if (!server) return 0
    var team = player ? getPlayerNationTeam(player) : null
    if (!team) {
        if (player) sendMsg(player, 'Guerre', 'Vous devez appartenir à une nation.', '§c')
        return 0
    }
    var targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    if (!targetTeam) {
        if (player) sendMsg(player, 'Guerre', 'Nation introuvable : "' + targetQuery + '".', '§c')
        return 0
    }
    if (targetTeam.getId().equals(team.getId())) {
        if (player) sendMsg(player, 'Guerre', 'Vous ne pouvez pas déclarer la guerre à votre propre nation.', '§c')
        return 0
    }

    if (isNationAtWarWith(server, team.getId(), targetTeam.getId())) {
        if (player) sendMsg(player, 'Guerre', 'Votre nation est déjà en guerre active contre ' + targetTeam.getName().getString() + '.', '§c')
        return 0
    }

    // Trahison / rupture automatique de l'alliance si les deux nations étaient alliées
    if (typeof isAllied === 'function' && isAllied(server, team.getId(), targetTeam.getId())) {
        if (typeof breakAlliance === 'function') {
            breakAlliance(server, team.getId(), targetTeam.getId(), 'war_declaration')
        }
    }

    // Si une demande était en attente, on l'approuve
    var wars = loadWarsRegistry(server)
    for (var wid in wars) {
        if (!wars.hasOwnProperty(wid)) continue
        var w = getWar(wars, wid)
        if (w && w.status === 'PENDING_ADMIN') {
            var hasA = (w.attackers && w.attackers.indexOf(team.getId().toString()) !== -1) || (w.defenders && w.defenders.indexOf(team.getId().toString()) !== -1)
            var hasB = (w.attackers && w.attackers.indexOf(targetTeam.getId().toString()) !== -1) || (w.defenders && w.defenders.indexOf(targetTeam.getId().toString()) !== -1)
            if (hasA && hasB) {
                return approveWar(server, wid) ? 1 : 0
            }
        }
    }

    var warId = getNextWarId(server)
    var atkName = team.getName().getString()
    var defName = targetTeam.getName().getString()

    var newWarActive = {
        id: warId,
        status: 'ACTIVE',
        requesterUuid: player ? (player.getStringUuid ? player.getStringUuid() : player.uuid.toString()) : 'console',
        attackerName: atkName,
        defenderName: defName,
        attackerLeader: team.getId().toString(),
        defenderLeader: targetTeam.getId().toString(),
        attackers: [team.getId().toString()],
        defenders: [targetTeam.getId().toString()],
        attackerNames: [atkName],
        defenderNames: [defName],
        costPaid: 0,
        createdAt: Date.now(),
        startedAt: Date.now(),
        peaceRequestedBy: null
    }
    setWar(wars, warId, newWarActive)
    saveWarsRegistry(server, wars)

    broadcastMsg(server, 'Guerre', 'Guerre lancée (# ' + warId + ') : §e' + atkName + ' §fcontre §e' + defName + ' §f! Les hostilités sont ouvertes.', '§c')
    if (typeof triggerCallToArms === 'function') {
        var wActive = getWar(wars, warId)
        if (wActive) {
            var aTeam2 = getTeamById(server, wActive.attackerLeader)
            var bTeam2 = getTeamById(server, wActive.defenderLeader)
            if (aTeam2 && bTeam2) {
                triggerCallToArms(server, warId, aTeam2.getId(), bTeam2.getId())
                triggerCallToArms(server, warId, bTeam2.getId(), aTeam2.getId())
            }
        }
    }
    return 1
}

/**
 * Arrête de force une guerre
 */
function forceStopWar(server, player, targetQuery) {
    if (!server) return 0
    var w = findWarQuery(server, targetQuery, false)
    if (w) {
        w.status = 'ENDED'
        w.endedAt = Date.now()
        var wars = loadWarsRegistry(server)
        setWar(wars, w.id, w)
        saveWarsRegistry(server, wars)
        broadcastMsg(server, 'Guerre', 'Le conflit #' + w.id + ' a été arrêté par les arbitres fédéraux.', '§6')
        return 1
    }
    if (player) sendMsg(player, 'Guerre', 'Guerre introuvable : "' + targetQuery + '".', '§c')
    return 0
}

/**
 * Commande intelligente /war <cible>
 */
function handleSmartWarCommand(player, targetQuery) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Guerre', 'Vous devez appartenir à une nation.', '§c')
        return 0
    }

    var targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    if (!targetTeam) {
        sendMsg(player, 'Guerre', 'Nation introuvable : "' + targetQuery + '". Tapez §e/nation list §cpour voir les nations.', '§c')
        return 0
    }

    if (isNationAtWarWith(server, team.getId(), targetTeam.getId())) {
        var war = findActiveWarBetween(server, team.getId(), targetTeam.getId())
        var warId = war ? war.id : '?'
        sendMsg(player, 'Guerre #' + warId, 'Vous êtes en guerre §c§lACTIVE§f contre §e' + targetTeam.getName().getString() + '§f !', '§c')
        sendMsg(player, 'Raid Hours', getRaidHoursStatusText(), '§6')
        sendMsg(player, 'Paix', 'Pour négocier un traité de paix : §e/war peace ' + targetTeam.getName().getString(), '§a')
        return 1
    }

    return requestWarDeclaration(player, targetQuery)
}

/**
 * Validation d'une guerre par le Staff
 */
function approveWar(server, warQuery) {
    if (!server) return false
    var w = findWarQuery(server, warQuery, true)
    if (!w) return false

    w.status = 'ACTIVE'
    w.startedAt = Date.now()
    var wars = loadWarsRegistry(server)
    setWar(wars, w.id, w)
    saveWarsRegistry(server, wars)

    // Rupture automatique de l'alliance entre les belligérants s'ils étaient alliés
    if (typeof isAllied === 'function' && isAllied(server, w.attackerLeader, w.defenderLeader)) {
        if (typeof breakAlliance === 'function') {
            breakAlliance(server, w.attackerLeader, w.defenderLeader, 'war_declaration')
        }
    }

    var nameA = w.attackerName || getTeamDisplayName(server, w.attackerLeader)
    var nameB = w.defenderName || getTeamDisplayName(server, w.defenderLeader)

    broadcastMsg(server, 'Guerre', 'Guerre déclarée (# ' + w.id + ') : §e' + nameA + ' §fcontre §e' + nameB + ' §f! Les hostilités sont ouvertes.', '§c')

    // Déclenchement automatique des appels aux armes pour les alliés des deux camps
    if (typeof triggerCallToArms === 'function') {
        var aTeam = getTeamById(server, w.attackerLeader)
        var bTeam = getTeamById(server, w.defenderLeader)
        if (aTeam && bTeam) {
            triggerCallToArms(server, w.id, aTeam.getId(), bTeam.getId())
            triggerCallToArms(server, w.id, bTeam.getId(), aTeam.getId())
        }
    }
    return true
}

/**
 * Rejet d'une guerre par le Staff
 */
function rejectWar(server, warQuery, reason) {
    if (!server) return false
    var w = findWarQuery(server, warQuery, true)
    if (!w) return false

    var wars = loadWarsRegistry(server)
    var refund = Math.floor(w.costPaid * 0.8) // Remboursement partiel
    var aTeam = getTeamById(server, w.attackerLeader)
    if (aTeam && typeof depositNationMoneyDirect === 'function') {
        depositNationMoneyDirect(aTeam, refund)
    }

    deleteWar(wars, w.id)
    saveWarsRegistry(server, wars)

    var nameA = w.attackerName || getTeamDisplayName(server, w.attackerLeader)
    var nameB = w.defenderName || getTeamDisplayName(server, w.defenderLeader)
    broadcastMsg(server, 'Staff', 'La demande de guerre #' + w.id + ' de §e' + nameA + ' §fcontre §e' + nameB + ' §fa été rejetée (' + refund + ' R restitués).', '§e')
    return true
}

/**
 * Négociation et acceptation de paix bilatérale
 */
function handleWarPeace(player, targetQuery) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Diplomatie', 'Vous devez appartenir à une nation.', '§c')
        return 0
    }
    var isOp = player.hasPermissions(2)
    if (!isOp && !isTeamOfficerOrOwner(team, player)) {
        sendMsg(player, 'Diplomatie', 'Seuls le Leader et les Ministres peuvent négocier la paix.', '§c')
        return 0
    }

    var war = null

    // 1. Si une cible ou un ID de guerre est fourni
    if (targetQuery && targetQuery.trim() !== '') {
        var q = targetQuery.trim().toLowerCase()
        if (q === 'force' && isOp) {
            var activeWars = getTeamActiveWars(server, team.getId())
            if (activeWars.length > 0) war = activeWars[0]
        } else {
            war = findWarQuery(server, targetQuery, false)
            if (!war) {
                var tTeam = findTeamByNameOrPlayer(server, targetQuery)
                if (tTeam) {
                    war = findActiveWarBetween(server, team.getId(), tTeam.getId())
                }
            }
        }
    }

    // 2. Si aucune cible ou non trouvée, prend la guerre active de l'équipe
    if (!war) {
        var activeWars = getTeamActiveWars(server, team.getId())
        if (activeWars.length === 1) {
            war = activeWars[0]
        } else if (activeWars.length === 0) {
            sendMsg(player, 'Diplomatie', 'Votre nation n\'est engagée dans aucune guerre active.', '§a')
            return 0
        } else {
            sendMsg(player, 'Diplomatie', 'Plusieurs guerres actives ! Précisez la nation : /war peace <nation>', '§e')
            return 0
        }
    }

    if (!war || war.status !== 'ACTIVE') {
        sendMsg(player, 'Diplomatie', 'Aucun conflit actif correspondant trouvé.', '§c')
        return 0
    }

    var myTeamIdStr = team.getId().toString()
    var isAttackerCamp = (war.attackers && war.attackers.indexOf(myTeamIdStr) !== -1)
    var myCamp = isAttackerCamp ? 'attackers' : 'defenders'
    var opposingCamp = isAttackerCamp ? 'defenders' : 'attackers'

    // Si le camp adverse a déjà proposé la paix, OU si c'est un Admin/OP qui signe la paix
    if (war.peaceRequestedBy === opposingCamp || isOp) {
        war.status = 'ENDED'
        war.endedAt = Date.now()
        war.peaceRequestedBy = null
        var wars = loadWarsRegistry(server)
        setWar(wars, war.id, war)
        saveWarsRegistry(server, wars)

        var nameA = war.attackerName || getTeamDisplayName(server, war.attackerLeader)
        var nameB = war.defenderName || getTeamDisplayName(server, war.defenderLeader)
        broadcastMsg(server, 'Diplomatie', 'Le traité de paix entre §e' + nameA + ' §fet §e' + nameB + ' §fa été ratifié ! Fin des hostilités.', '§a')
        return 1
    } else if (war.peaceRequestedBy === myCamp) {
        sendMsg(player, 'Diplomatie', 'Votre camp a déjà proposé la paix. En attente de la ratification adverse.', '§e')
        return 1
    } else {
        // Initier la proposition de paix
        war.peaceRequestedBy = myCamp
        var wars2 = loadWarsRegistry(server)
        setWar(wars2, war.id, war)
        saveWarsRegistry(server, wars2)

        sendMsg(player, 'Diplomatie', 'Proposition de paix transmise au camp adverse.', '§a')
        var opposingLeaderId = isAttackerCamp ? war.defenderLeader : war.attackerLeader
        var oppTeam = getTeamById(server, opposingLeaderId)
        if (oppTeam) {
            notifyTeam(oppTeam, 'Diplomatie', '§aLe camp adverse propose un cessez-le-feu ! Tapez §e/war peace ' + team.getName().getString() + ' §apour signer le traité de paix.', '§a')
        }
        return 1
    }
}

function listActiveWars(player) {
    if (!player) return 0
    var server = player.server
    var wars = loadWarsRegistry(server)
    var activeCount = 0

    sendMsg(player, 'Guerre', 'Liste des conflits :', '§4')
    for (var id in wars) {
        if (!wars.hasOwnProperty(id)) continue
        var w = getWar(wars, id)
        if (!w) continue

        // Récupération des noms complets des coalitions
        var atkNames = []
        if (w.attackerNames && w.attackerNames.length > 0) {
            atkNames = w.attackerNames
        } else if (w.attackers && w.attackers.length > 0) {
            for (var a = 0; a < w.attackers.length; a++) atkNames.push(getTeamDisplayName(server, w.attackers[a]))
        } else {
            atkNames.push(w.attackerName || 'Inconnu')
        }

        var defNames = []
        if (w.defenderNames && w.defenderNames.length > 0) {
            defNames = w.defenderNames
        } else if (w.defenders && w.defenders.length > 0) {
            for (var d = 0; d < w.defenders.length; d++) defNames.push(getTeamDisplayName(server, w.defenders[d]))
        } else {
            defNames.push(w.defenderName || 'Inconnu')
        }

        var statusLabel = (w.status === 'ACTIVE') ? '§c§lACTIF' : ((w.status === 'PENDING_ADMIN') ? '§e§lEN ATTENTE' : '§7TERMINÉE')
        sendMsg(player, 'Guerre #' + id, statusLabel + ' §7| §e' + atkNames.join('§7, §e') + ' §fcontre §9' + defNames.join('§7, §9'), '§6')
        if (w.status === 'ACTIVE') activeCount++
    }

    if (activeCount === 0) {
        sendMsg(player, 'Guerre', 'Aucune guerre active pour le moment.', '§a')
    }

    try {
        var warsList = []
        for (var wid in wars) {
            if (!wars.hasOwnProperty(wid)) continue
            var warObj = getWar(wars, wid)
            if (!warObj) continue
            if (warObj.status === 'ACTIVE' || warObj.status === 'PENDING_ADMIN') {
                warsList.push({
                    id: warObj.id,
                    attacker: warObj.attackerName || 'Attaquant',
                    defender: warObj.defenderName || 'Défenseur',
                    status: warObj.status,
                    coalitionCount: ((warObj.attackers ? warObj.attackers.length : 1) + (warObj.defenders ? warObj.defenders.length : 1))
                })
            }
        }
        var isRaidActive = false
        if (typeof isRaidHourActive === 'function') {
            isRaidActive = isRaidHourActive(server)
        }
        var warPayload = {
            raidHoursActive: isRaidActive,
            activeWars: warsList
        }
        player.sendData('open_war_registry', { json: JSON.stringify(warPayload) })
    } catch (we) {}

    return 1
}

NetworkEvents.dataReceived('action_war', function(event) {
    try {
        var player = event.player || event.getEntity()
        if (!player) return
        var data = event.data || event.getData()
        var raw = data.getString ? data.getString('json') : String(data.get('json'))
        if (!raw) return
        var action = JSON.parse(raw)
        if (action.action === 'peace' && action.warId) {
            var wars = loadWarsRegistry(player.server)
            var w = getWar(wars, action.warId)
            if (w) {
                handleWarPeace(player, w.attackerName || w.defenderName)
            }
        } else if (action.action === 'prompt_declare') {
            sendMsg(player, 'Guerre', 'Pour déclarer une guerre, tapez : §e/war declare <NomDeLaNation>', '§e')
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// COMMANDES CLI /war & /guerre
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

    event.register(
        Commands.literal('war')
            // Démarrage forcé direct d'une guerre (Staff / Tests)
            .then(Commands.literal('start')
                .requires(function(source) { return source.hasPermission(2) })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return startActiveWar(ctx.source.server, ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            // Arrêt forcé d'une guerre
            .then(Commands.literal('stop')
                .requires(function(source) { return source.hasPermission(2) })
                .executes(function(ctx) {
                    var wars = loadWarsRegistry(ctx.source.server)
                    var lastActive = null
                    for (var id in wars) {
                        var w = getWar(wars, id)
                        if (w && w.status === 'ACTIVE') lastActive = w
                    }
                    if (lastActive) {
                        return forceStopWar(ctx.source.server, ctx.source.player, lastActive.id)
                    }
                    if (ctx.source.player) sendMsg(ctx.source.player, 'Guerre', 'Aucune guerre active à arrêter.', '§c')
                    return 0
                })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return forceStopWar(ctx.source.server, ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            // Déclaration formelle
            .then(Commands.literal('declare')
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return requestWarDeclaration(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            // Traité de paix
            .then(Commands.literal('peace')
                .executes(function(ctx) {
                    return handleWarPeace(ctx.source.player, null)
                })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return handleWarPeace(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            // Validation staff
            .then(Commands.literal('approve')
                .requires(function(source) { return source.hasPermission(2) })
                .executes(function(ctx) {
                    var success = approveWar(ctx.source.server, null)
                    if (success) {
                        sendMsg(ctx.source.player, 'WarAdmin', 'Dernière demande de guerre approuvée avec succès.', '§a')
                    } else {
                        sendMsg(ctx.source.player, 'WarAdmin', 'Aucune guerre en attente d\'approbation. Tapez /war list', '§c')
                    }
                    return success ? 1 : 0
                })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        var q = StringArgumentType.getString(ctx, 'cible')
                        var success = approveWar(ctx.source.server, q)
                        if (success) {
                            sendMsg(ctx.source.player, 'WarAdmin', 'Guerre approuvée avec succès.', '§a')
                        } else {
                            sendMsg(ctx.source.player, 'WarAdmin', 'Guerre introuvable : "' + q + '". Tapez /war list', '§c')
                        }
                        return success ? 1 : 0
                    })
                )
            )
            // Refus staff
            .then(Commands.literal('reject')
                .requires(function(source) { return source.hasPermission(2) })
                .executes(function(ctx) {
                    var success = rejectWar(ctx.source.server, null, 'Refusé par administrateur')
                    return success ? 1 : 0
                })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        var q = StringArgumentType.getString(ctx, 'cible')
                        var success = rejectWar(ctx.source.server, q, 'Refusé par administrateur')
                        return success ? 1 : 0
                    })
                )
            )
            .then(Commands.literal('join')
                .then(Commands.argument('warId', StringArgumentType.string())
                    .executes(function(ctx) {
                        return handleCallToArmsResponse(ctx.source.player, StringArgumentType.getString(ctx, 'warId'), true)
                    })
                )
            )
            .then(Commands.literal('decline')
                .then(Commands.argument('warId', StringArgumentType.string())
                    .executes(function(ctx) {
                        return handleCallToArmsResponse(ctx.source.player, StringArgumentType.getString(ctx, 'warId'), false)
                    })
                )
            )
            .then(Commands.literal('list').executes(function(ctx) {
                return listActiveWars(ctx.source.player)
            }))
            // Contrôle des Raid Hours
            .then(Commands.literal('raidhours')
                .then(Commands.literal('force')
                    .requires(function(source) { return source.hasPermission(2) })
                    .executes(function(ctx) {
                        RAID_CONFIG.forceState = true
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été FORCÉES et ACTIVÉES par le Staff ! Les claims ennemis sont vulnérables au minage/siège.', '§c')
                        return 1
                    })
                    .then(Commands.literal('on').executes(function(ctx) {
                        RAID_CONFIG.forceState = true
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été ACTIVÉES par le Staff ! Les claims ennemis sont vulnérables au minage/siège.', '§c')
                        return 1
                    }))
                    .then(Commands.literal('off').executes(function(ctx) {
                        RAID_CONFIG.forceState = false
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été DÉSACTIVÉES par le Staff. Claims sécurisés.', '§a')
                        return 1
                    }))
                    .then(Commands.literal('auto').executes(function(ctx) {
                        RAID_CONFIG.forceState = null
                        if (ctx.source.player) sendMsg(ctx.source.player, 'Raid Hours', 'Mode automatique rétabli (' + RAID_CONFIG.startHour + 'h00 - ' + RAID_CONFIG.endHour + 'h00).', '§a')
                        return 1
                    }))
                )
                .then(Commands.literal('on')
                    .requires(function(source) { return source.hasPermission(2) })
                    .executes(function(ctx) {
                        RAID_CONFIG.forceState = true
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été ACTIVÉES par le Staff ! Les claims ennemis sont vulnérables au minage/siège.', '§c')
                        return 1
                    })
                )
                .then(Commands.literal('off')
                    .requires(function(source) { return source.hasPermission(2) })
                    .executes(function(ctx) {
                        RAID_CONFIG.forceState = false
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été DÉSACTIVÉES par le Staff. Claims sécurisés.', '§a')
                        return 1
                    })
                )
                .then(Commands.literal('auto')
                    .requires(function(source) { return source.hasPermission(2) })
                    .executes(function(ctx) {
                        RAID_CONFIG.forceState = null
                        if (ctx.source.player) sendMsg(ctx.source.player, 'Raid Hours', 'Mode automatique rétabli (' + RAID_CONFIG.startHour + 'h00 - ' + RAID_CONFIG.endHour + 'h00).', '§a')
                        return 1
                    })
                )
                .executes(function(ctx) {
                    if (ctx.source.player) {
                        sendMsg(ctx.source.player, 'Raid Hours', getRaidHoursStatusText(), '§6')
                        if (ctx.source.player.hasPermissions(2)) {
                            sendMsg(ctx.source.player, 'Raid Hours Staff', 'Contrôle : §e/war raidhours force §7(ou §eon§7/§eoff§7/§eauto§7)', '§7')
                        }
                    }
                    return 1
                })
            )
            // Commande intelligente directe /war <nation>
            .then(Commands.argument('cible', StringArgumentType.greedyString())
                .executes(function(ctx) {
                    return handleSmartWarCommand(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                })
            )
            .executes(function(ctx) {
                return listActiveWars(ctx.source.player)
            })
    )

    // Alias /guerre
    event.register(
        Commands.literal('guerre')
            .then(Commands.literal('start')
                .requires(function(source) { return source.hasPermission(2) })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return startActiveWar(ctx.source.server, ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            .then(Commands.literal('stop')
                .requires(function(source) { return source.hasPermission(2) })
                .executes(function(ctx) {
                    var wars2 = loadWarsRegistry(ctx.source.server)
                    var lastActive2 = null
                    for (var id2 in wars2) {
                        if (wars2[id2].status === 'ACTIVE') lastActive2 = wars2[id2]
                    }
                    if (lastActive2) {
                        return forceStopWar(ctx.source.server, ctx.source.player, lastActive2.id)
                    }
                    if (ctx.source.player) sendMsg(ctx.source.player, 'Guerre', 'Aucune guerre active à arrêter.', '§c')
                    return 0
                })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return forceStopWar(ctx.source.server, ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            .then(Commands.literal('declare')
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return requestWarDeclaration(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            .then(Commands.literal('peace')
                .executes(function(ctx) {
                    return handleWarPeace(ctx.source.player, null)
                })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return handleWarPeace(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            .then(Commands.literal('approve')
                .requires(function(source) { return source.hasPermission(2) })
                .executes(function(ctx) {
                    return approveWar(ctx.source.server, null) ? 1 : 0
                })
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return approveWar(ctx.source.server, StringArgumentType.getString(ctx, 'cible')) ? 1 : 0
                    })
                )
            )
            .then(Commands.literal('list').executes(function(ctx) {
                return listActiveWars(ctx.source.player)
            }))
            .then(Commands.literal('raidhours')
                .then(Commands.literal('on')
                    .requires(function(source) { return source.hasPermission(2) })
                    .executes(function(ctx) {
                        RAID_CONFIG.forceState = true
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été ACTIVÉES par le Staff !', '§c')
                        return 1
                    })
                )
                .then(Commands.literal('off')
                    .requires(function(source) { return source.hasPermission(2) })
                    .executes(function(ctx) {
                        RAID_CONFIG.forceState = false
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été DÉSACTIVÉES par le Staff.', '§a')
                        return 1
                    })
                )
                .then(Commands.literal('auto')
                    .requires(function(source) { return source.hasPermission(2) })
                    .executes(function(ctx) {
                        RAID_CONFIG.forceState = null
                        if (ctx.source.player) sendMsg(ctx.source.player, 'Raid Hours', 'Mode automatique rétabli.', '§a')
                        return 1
                    })
                )
                .executes(function(ctx) {
                    if (ctx.source.player) {
                        sendMsg(ctx.source.player, 'Raid Hours', getRaidHoursStatusText(), '§6')
                    }
                    return 1
                })
            )
            .then(Commands.argument('cible', StringArgumentType.greedyString())
                .executes(function(ctx) {
                    return handleSmartWarCommand(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                })
            )
            .executes(function(ctx) {
                return listActiveWars(ctx.source.player)
            })
    )
})

// Vérification d'expiration des appels aux armes chaque seconde (20 ticks)
ServerEvents.tick(function(event) {
    if (event.server.getTickCount() % 20 === 0) {
        if (typeof checkCallsToArmsExpiration === 'function') {
            checkCallsToArmsExpiration(event.server)
        }
    }
})
