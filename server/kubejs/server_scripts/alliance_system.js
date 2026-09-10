// priority: 60
// =============================================================================
// Third World Server Script - Système d'Alliances Géopolitiques & Appel aux Armes
// =============================================================================

var ALLIANCE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes pour répondre à l'appel aux armes

/**
 * Charge les alliances depuis persistentData
 */
function loadAlliances(server) {
    if (!server) return {}
    try {
        if (server.persistentData) {
            var raw = server.persistentData.getString('nation_alliances')
            if (raw && raw.length > 0) {
                var data = JSON.parse(raw)
                if (data && typeof data === 'object') return data
            }
        }
    } catch (e) {
        console.error('[Alliance] Erreur lecture alliances : ' + e)
    }
    return {}
}

/**
 * Sauvegarde les alliances dans persistentData
 */
function saveAlliances(server, alliances) {
    if (!server) return
    try {
        if (server.persistentData) {
            server.persistentData.putString('nation_alliances', JSON.stringify(alliances))
        }
    } catch (e) {
        console.error('[Alliance] Erreur sauvegarde alliances : ' + e)
    }
}

/**
 * Vérifie si deux équipes sont alliées
 */
function isAllied(server, teamAId, teamBId) {
    if (!teamAId || !teamBId || !server) return false
    var aStr = teamAId.toString()
    var bStr = teamBId.toString()
    if (aStr === bStr) return false
    var all = loadAlliances(server)
    var list = all[aStr]
    return (list && Array.isArray(list) && list.indexOf(bStr) !== -1)
}

/**
 * Récupère la liste des UUIDs des nations alliées
 */
function getTeamAllies(server, teamId) {
    if (!teamId || !server) return []
    var all = loadAlliances(server)
    var list = all[teamId.toString()]
    return (list && Array.isArray(list)) ? list : []
}

/**
 * Enregistre une nouvelle alliance bilatérale
 */
function addAlliance(server, teamAId, teamBId) {
    if (!teamAId || !teamBId || !server) return false
    var aStr = teamAId.toString()
    var bStr = teamBId.toString()
    if (aStr === bStr) return false

    var all = loadAlliances(server)
    if (!all[aStr]) all[aStr] = []
    if (!all[bStr]) all[bStr] = []

    if (all[aStr].indexOf(bStr) === -1) all[aStr].push(bStr)
    if (all[bStr].indexOf(aStr) === -1) all[bStr].push(aStr)

    saveAlliances(server, all)
    return true
}

/**
 * Rompt une alliance bilatérale avec motif
 */
function breakAlliance(server, teamAId, teamBId, reason) {
    if (!teamAId || !teamBId || !server) return false
    var aStr = teamAId.toString()
    var bStr = teamBId.toString()

    var all = loadAlliances(server)
    var wasAllied = false

    if (all[aStr]) {
        var idxA = all[aStr].indexOf(bStr)
        if (idxA !== -1) {
            all[aStr].splice(idxA, 1)
            wasAllied = true
        }
    }
    if (all[bStr]) {
        var idxB = all[bStr].indexOf(aStr)
        if (idxB !== -1) {
            all[bStr].splice(idxB, 1)
            wasAllied = true
        }
    }

    if (wasAllied) {
        saveAlliances(server, all)
        var nameA = getTeamDisplayName(server, aStr)
        var nameB = getTeamDisplayName(server, bStr)

        if (reason === 'defection') {
            broadcastMsg(server, 'Diplomatie', 'La nation §e' + nameB + ' §fa refusé l\'appel aux armes de §e' + nameA + '§f. Le traité d\'alliance est rompu.', '§c')
        } else {
            broadcastMsg(server, 'Diplomatie', 'Le traité d\'alliance entre §e' + nameA + ' §fet §e' + nameB + ' §fest rompu.', '§e')
        }
    }
    return wasAllied
}

// -----------------------------------------------------------------------------
// GESTION DES REQUÊTES D'ALLIANCE EN ATTENTE
// -----------------------------------------------------------------------------
var pendingAllianceRequests = {} // { targetTeamId: { fromTeamId, requestedAt } }

function requestAlliance(player, targetQuery) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Alliance', 'Vous devez faire partie d\'une nation.', '§c')
        return 0
    }
    if (!isTeamOwner(team, player)) {
        sendMsg(player, 'Alliance', 'Seul le Leader (président) de la nation peut signer des traités d\'alliance.', '§c')
        return 0
    }

    var targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    if (!targetTeam) {
        sendMsg(player, 'Alliance', 'Nation introuvable : "' + targetQuery + '".', '§c')
        return 0
    }

    if (targetTeam.getId().equals(team.getId())) {
        sendMsg(player, 'Alliance', 'Vous ne pouvez pas vous allier à vous-même.', '§c')
        return 0
    }

    if (isAllied(server, team.getId(), targetTeam.getId())) {
        sendMsg(player, 'Alliance', 'Vous êtes déjà allié à ' + targetTeam.getName().getString() + '.', '§e')
        return 0
    }

    var targetIdStr = targetTeam.getId().toString()
    pendingAllianceRequests[targetIdStr] = {
        fromTeamId: team.getId().toString(),
        fromTeamName: team.getName().getString(),
        requestedAt: Date.now()
    }

    sendMsg(player, 'Alliance', 'Proposition d\'alliance transmise à §e' + targetTeam.getName().getString() + '§f.', '§a')
    notifyTeam(targetTeam, 'Alliance', 'La nation §e' + team.getName().getString() + ' §fvous propose une alliance. Tapez §a/ally accept ' + team.getName().getString() + ' §fou §c/ally decline', '§6')
    return 1
}

function acceptAlliance(player, targetQuery) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team || !isTeamOwner(team, player)) {
        sendMsg(player, 'Alliance', 'Seul le Leader peut accepter une alliance.', '§c')
        return 0
    }

    var targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    if (!targetTeam) {
        sendMsg(player, 'Alliance', 'Nation introuvable : "' + targetQuery + '".', '§c')
        return 0
    }

    var myIdStr = team.getId().toString()
    var req = pendingAllianceRequests[myIdStr]
    if (!req || req.fromTeamId !== targetTeam.getId().toString()) {
        sendMsg(player, 'Alliance', 'Aucune demande d\'alliance en attente venant de ' + targetTeam.getName().getString() + '.', '§c')
        return 0
    }

    delete pendingAllianceRequests[myIdStr]
    addAlliance(server, team.getId(), targetTeam.getId())

    broadcastMsg(server, 'Diplomatie', 'Un pacte d\'alliance a été signé entre §e' + team.getName().getString() + ' §fet §e' + targetTeam.getName().getString() + ' §f!', '§a')
    return 1
}

function declineAlliance(player, targetQuery) {
    if (!player) return 0
    var team = getPlayerNationTeam(player)
    if (!team) return 0
    var myIdStr = team.getId().toString()
    var req = pendingAllianceRequests[myIdStr]
    if (req) {
        delete pendingAllianceRequests[myIdStr]
        sendMsg(player, 'Alliance', 'Demande d\'alliance refusée.', '§7')
        return 1
    }
    sendMsg(player, 'Alliance', 'Aucune demande en attente.', '§7')
    return 0
}

function listAlliances(player) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Alliance', 'Vous devez faire partie d\'une nation.', '§c')
        return 0
    }

    var allies = getTeamAllies(server, team.getId())
    if (allies.length === 0) {
        sendMsg(player, 'Alliance', 'Votre nation n\'a aucun allié officiel.', '§7')
    } else {
        var names = []
        for (var i = 0; i < allies.length; i++) {
            names.push(getTeamDisplayName(server, allies[i]))
        }
        sendMsg(player, 'Alliance', 'Alliés officiels (' + names.length + ') : §e' + names.join('§f, §e'), '§a')
    }
    return 1
}

// -----------------------------------------------------------------------------
// APPELS AUX ARMES EN TEMPS DE GUERRE
// -----------------------------------------------------------------------------
var pendingCallsToArms = {} // { allyTeamIdStr: { warId, callingTeamId, enemyTeamId, expiresAt } }

/**
 * Déclenche un appel aux armes automatique à tous les alliés d'une nation qui entre en guerre
 */
function triggerCallToArms(server, warId, callingTeamId, enemyTeamId) {
    if (!server || !warId || !callingTeamId) return
    var allies = getTeamAllies(server, callingTeamId)
    if (allies.length === 0) return

    var callingName = getTeamDisplayName(server, callingTeamId.toString())
    var enemyName = getTeamDisplayName(server, enemyTeamId.toString())

    for (var i = 0; i < allies.length; i++) {
        var allyIdStr = allies[i]
        var allyTeam = getTeamById(server, allyIdStr)
        if (!allyTeam) continue

        pendingCallsToArms[allyIdStr] = {
            warId: warId,
            callingTeamId: callingTeamId.toString(),
            enemyTeamId: enemyTeamId.toString(),
            expiresAt: Date.now() + ALLIANCE_TIMEOUT_MS
        }

        notifyTeam(allyTeam, 'Appel aux Armes', '§c⚠ Votre allié §e' + callingName + ' §cest en guerre contre §e' + enemyName + ' §c!', '§4')
        notifyTeam(allyTeam, 'Appel aux Armes', 'Honorez le pacte : §a/war join ' + warId + ' §fou refusez : §c/war decline ' + warId + ' §7(Refuser brisera l\'alliance).', '§e')
    }
}

/**
 * Répond à un appel aux armes (acceptation ou refus)
 */
function handleCallToArmsResponse(player, warId, accept) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team) return 0
    if (!isTeamOwner(team, player)) {
        sendMsg(player, 'Guerre', 'Seul le Leader peut engager sa nation dans une guerre alliée.', '§c')
        return 0
    }

    var teamIdStr = team.getId().toString()
    var call = pendingCallsToArms[teamIdStr]

    if (!call || call.warId !== warId) {
        sendMsg(player, 'Guerre', 'Aucun appel aux armes actif pour ce conflit.', '§c')
        return 0
    }

    delete pendingCallsToArms[teamIdStr]

    if (accept) {
        // Intégrer l'équipe à la coalition
        if (typeof joinWarCoalition === 'function') {
            joinWarCoalition(server, warId, team.getId(), call.callingTeamId)
        }
        broadcastMsg(server, 'Guerre', 'La nation alliée §e' + team.getName().getString() + ' §frejoint le conflit aux côtés de ses alliés !', '§c')
        return 1
    } else {
        // Refus : Rupture immédiate de l'alliance pour défection
        breakAlliance(server, UUID.fromString(call.callingTeamId), team.getId(), 'defection')
        return 1
    }
}

/**
 * Vérifie périodiquement l'expiration des appels aux armes
 */
function checkCallsToArmsExpiration(server) {
    if (!server) return
    var now = Date.now()
    var expiredKeys = []
    for (var k in pendingCallsToArms) {
        if (pendingCallsToArms.hasOwnProperty(k)) {
            if (pendingCallsToArms[k].expiresAt <= now) {
                expiredKeys.push(k)
            }
        }
    }

    for (var j = 0; j < expiredKeys.length; j++) {
        var aId = expiredKeys[j]
        var item = pendingCallsToArms[aId]
        delete pendingCallsToArms[aId]
        // Expiration = refus automatique et rupture
        breakAlliance(server, UUID.fromString(item.callingTeamId), UUID.fromString(aId), 'defection')
    }
}

// -----------------------------------------------------------------------------
// COMMANDES CLI /ally
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

    event.register(
        Commands.literal('ally')
            .then(Commands.literal('request')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return requestAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation'))
                    })
                )
            )
            .then(Commands.literal('accept')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return acceptAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation'))
                    })
                )
            )
            .then(Commands.literal('decline')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return declineAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation'))
                    })
                )
                .executes(function(ctx) {
                    return declineAlliance(ctx.source.player, null)
                })
            )
            .then(Commands.literal('break')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        var player = ctx.source.player
                        if (!player) return 0
                        var team = getPlayerNationTeam(player)
                        if (!team || !isTeamOwner(team, player)) {
                            sendMsg(player, 'Alliance', 'Seul le Leader peut rompre une alliance.', '§c')
                            return 0
                        }
                        var target = findTeamByNameOrPlayer(player.server, StringArgumentType.getString(ctx, 'nation'))
                        if (!target) {
                            sendMsg(player, 'Alliance', 'Nation introuvable.', '§c')
                            return 0
                        }
                        if (breakAlliance(player.server, team.getId(), target.getId(), 'voluntary')) {
                            sendMsg(player, 'Alliance', 'Traité d\'alliance dissous avec succès.', '§a')
                        } else {
                            sendMsg(player, 'Alliance', 'Vous n\'étiez pas allié à cette nation.', '§c')
                        }
                        return 1
                    })
                )
            )
            .then(Commands.literal('list').executes(function(ctx) {
                return listAlliances(ctx.source.player)
            }))
            // Téléportation vers l'Ambassade d'une nation alliée (/ally home <nation>)
            .then(Commands.literal('home')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return (typeof teleportToAllyHome === 'function') ? teleportToAllyHome(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                    })
                )
            )
            // Téléportation inversée demandée (/ally <nom_alliée> home)
            .then(Commands.argument('targetNation', StringArgumentType.string())
                .then(Commands.literal('home')
                    .executes(function(ctx) {
                        return (typeof teleportToAllyHome === 'function') ? teleportToAllyHome(ctx.source.player, StringArgumentType.getString(ctx, 'targetNation')) : 0
                    })
                )
            )
            .executes(function(ctx) {
                return listAlliances(ctx.source.player)
            })
    )

    // Raccourci direct pratique: /allyhome <nom_alliée>
    event.register(
        Commands.literal('allyhome')
            .then(Commands.argument('nation', StringArgumentType.string())
                .executes(function(ctx) {
                    return (typeof teleportToAllyHome === 'function') ? teleportToAllyHome(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                })
            )
    )
})
