// priority: 60
// =============================================================================
// Third World Server Script - Système d'Alliances Géopolitiques & Diplomatie
// =============================================================================
// 1. Stockage permanent des traités d'alliance sur disque (alliances.json).
// 2. Synchronisation bidirectionnelle avec les rangs FTB Teams (TeamRank.ALLY).
// 3. Commandes souples et intuitives (/ally, /ally add, /ally accept, etc.).
// 4. Système d'appel aux armes automatique en cas de déclaration de guerre.
// =============================================================================

var ALLIANCE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes pour répondre à l'appel aux armes
var ALLIANCES_CACHE = null

/**
 * Charge les alliances depuis le fichier permanent alliances.json sur disque
 */
function loadAlliances(server) {
    if (ALLIANCES_CACHE !== null) return ALLIANCES_CACHE
    try {
        var fileData = readJsonData('alliances.json')
        if (fileData && typeof fileData === 'object' && !Array.isArray(fileData)) {
            ALLIANCES_CACHE = fileData
            return ALLIANCES_CACHE
        }
    } catch (e) {
        console.error('[Alliance] Erreur lecture alliances.json : ' + e)
    }
    ALLIANCES_CACHE = {}
    return ALLIANCES_CACHE
}

/**
 * Sauvegarde les alliances dans alliances.json sur disque
 */
function saveAlliances(server, alliances) {
    ALLIANCES_CACHE = alliances || {}
    try {
        writeJsonData('alliances.json', ALLIANCES_CACHE)
    } catch (e) {
        console.error('[Alliance] Erreur sauvegarde alliances.json : ' + e)
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
 * Synchronise les membres de deux équipes alliées dans FTB Teams avec le rang ALLY
 */
function syncAllianceWithFTBTeams(server, teamAId, teamBId, isAlly) {
    try {
        if (!server || !teamAId || !teamBId) return
        var aStr = teamAId.toString()
        var bStr = teamBId.toString()
        var teamA = getTeamById(server, aStr)
        var teamB = getTeamById(server, bStr)
        if (!teamA || !teamB) return

        var TeamRankClass = Java.loadClass('dev.ftb.mods.ftbteams.api.TeamRank')
        if (!TeamRankClass) return

        var allyRank = TeamRankClass.ALLY

        // Ajouter/retirer les membres de B dans A
        var memB = teamB.getMembers ? teamB.getMembers() : null
        if (memB) {
            var itB = memB.iterator()
            while (itB.hasNext()) {
                var uB = itB.next()
                try {
                    if (isAlly) {
                        if (teamA.addMember) teamA.addMember(uB, allyRank)
                    } else {
                        if (teamA.removeMember) teamA.removeMember(uB)
                    }
                } catch (eB) {}
            }
        }

        // Ajouter/retirer les membres de A dans B
        var memA = teamA.getMembers ? teamA.getMembers() : null
        if (memA) {
            var itA = memA.iterator()
            while (itA.hasNext()) {
                var uA = itA.next()
                try {
                    if (isAlly) {
                        if (teamB.addMember) teamB.addMember(uA, allyRank)
                    } else {
                        if (teamB.removeMember) teamB.removeMember(uA)
                    }
                } catch (eA) {}
            }
        }

        if (teamA.markDirty) teamA.markDirty()
        if (teamB.markDirty) teamB.markDirty()
    } catch (e) {
        console.error('[Alliance] Erreur syncAllianceWithFTBTeams : ' + e)
    }
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
    syncAllianceWithFTBTeams(server, teamAId, teamBId, true)
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
        syncAllianceWithFTBTeams(server, teamAId, teamBId, false)
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
var pendingAllianceRequests = {} // { targetTeamIdStr: { fromTeamId, fromTeamName, requestedAt } }

function requestAlliance(player, targetQuery) {
    if (!player) return 0
    var server = player.server || (player.getServer ? player.getServer() : null)
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Alliance', 'Vous devez faire partie d\'une nation.', '§c')
        return 0
    }
    if (!isTeamOfficerOrOwner(team, player)) {
        sendMsg(player, 'Alliance', 'Seul le Leader ou un Ministre peut proposer un traité d\'alliance.', '§c')
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
        sendMsg(player, 'Alliance', 'Vous êtes déjà allié avec §6' + targetTeam.getName().getString() + '§f.', '§e')
        return 0
    }

    var myIdStr = team.getId().toString()
    var targetIdStr = targetTeam.getId().toString()

    // Si la nation cible nous avait déjà envoyé une demande, l'accepter immédiatement
    var existingReq = pendingAllianceRequests[myIdStr]
    if (existingReq && existingReq.fromTeamId === targetIdStr) {
        return acceptAlliance(player, targetTeam.getName().getString())
    }

    pendingAllianceRequests[targetIdStr] = {
        fromTeamId: myIdStr,
        fromTeamName: team.getName().getString(),
        requestedAt: Date.now()
    }

    sendMsg(player, 'Alliance', 'Proposition d\'alliance transmise à §6' + targetTeam.getName().getString() + '§f.', '§a')
    notifyTeam(targetTeam, 'Alliance', 'La nation §6' + team.getName().getString() + ' §fvous propose un pacte d\'alliance ! Tapez §a/ally accept ' + team.getName().getString() + ' §fou §c/ally decline', '§6')
    return 1
}

function acceptAlliance(player, targetQuery) {
    if (!player) return 0
    var server = player.server || (player.getServer ? player.getServer() : null)
    var team = getPlayerNationTeam(player)
    if (!team || !isTeamOfficerOrOwner(team, player)) {
        sendMsg(player, 'Alliance', 'Seul le Leader ou un Ministre peut accepter une alliance.', '§c')
        return 0
    }

    var myIdStr = team.getId().toString()
    var req = pendingAllianceRequests[myIdStr]

    var targetTeam = null
    if (targetQuery && targetQuery.trim().length > 0) {
        targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    } else if (req) {
        targetTeam = getTeamById(server, req.fromTeamId)
    }

    if (!targetTeam) {
        sendMsg(player, 'Alliance', 'Aucune demande d\'alliance ciblée en attente.', '§c')
        return 0
    }

    var targetIdStr = targetTeam.getId().toString()
    if (!req || req.fromTeamId !== targetIdStr) {
        sendMsg(player, 'Alliance', 'Aucune demande d\'alliance en attente venant de §6' + targetTeam.getName().getString() + '§c.', '§c')
        return 0
    }

    delete pendingAllianceRequests[myIdStr]
    addAlliance(server, team.getId(), targetTeam.getId())

    broadcastMsg(server, 'Diplomatie', 'Un pacte d\'alliance officiel a été signé entre §6' + team.getName().getString() + ' §fet §6' + targetTeam.getName().getString() + ' §f!', '§a')
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

function handleSmartAllyCommand(player, targetQuery) {
    if (!targetQuery || targetQuery.trim() === '') {
        return listAlliances(player)
    }
    var server = player.server || (player.getServer ? player.getServer() : null)
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Alliance', 'Vous devez faire partie d\'une nation.', '§c')
        return 0
    }

    var targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    if (!targetTeam) {
        sendMsg(player, 'Alliance', 'Nation introuvable : "' + targetQuery + '".', '§c')
        return 0
    }

    if (isAllied(server, team.getId(), targetTeam.getId())) {
        sendMsg(player, 'Alliance', 'Votre nation est déjà alliée avec §6' + targetTeam.getName().getString() + '§f.', '§a')
        sendMsg(player, 'Aide', 'Pour visiter leur ambassade : §e/ally home ' + targetTeam.getName().getString(), '§7')
        sendMsg(player, 'Aide', 'Pour rompre l\'alliance : §c/ally break ' + targetTeam.getName().getString(), '§7')
        return 1
    }

    var myIdStr = team.getId().toString()
    var req = pendingAllianceRequests[myIdStr]
    if (req && req.fromTeamId === targetTeam.getId().toString()) {
        return acceptAlliance(player, targetTeam.getName().getString())
    }

    return requestAlliance(player, targetQuery)
}

function listAlliances(player) {
    if (!player) return 0
    var server = player.server || (player.getServer ? player.getServer() : null)
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Alliance', 'Vous devez faire partie d\'une nation.', '§c')
        return 0
    }

    var allies = getTeamAllies(server, team.getId())
    if (!allies || allies.length === 0) {
        sendMsg(player, 'Alliance', 'Votre nation n\'a aucun traité d\'alliance actif.', '§7')
        sendMsg(player, 'Aide', 'Pour proposer une alliance : §e/ally add <nom_nation>', '§7')
    } else {
        var names = []
        for (var i = 0; i < allies.length; i++) {
            names.push(getTeamDisplayName(server, allies[i]))
        }
        sendMsg(player, 'Alliance', 'Nations alliées officielles (' + names.length + ') : §a' + names.join('§7, §a'), '§a')
        sendMsg(player, 'Raccourci', 'Ambassade alliée : §e/ally home <nom_nation>', '§7')
    }
    return 1
}

// -----------------------------------------------------------------------------
// APPELS AUX ARMES EN TEMPS DE GUERRE
// -----------------------------------------------------------------------------
var pendingCallsToArms = {} // { allyTeamIdStr: { warId, callingTeamId, enemyTeamId, expiresAt } }

function triggerCallToArms(server, warId, callingTeamId, enemyTeamId) {
    if (!server || !warId || !callingTeamId) return
    var allies = getTeamAllies(server, callingTeamId)
    if (!allies || allies.length === 0) return

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

function handleCallToArmsResponse(player, warId, accept) {
    if (!player) return 0
    var server = player.server || (player.getServer ? player.getServer() : null)
    var team = getPlayerNationTeam(player)
    if (!team) return 0
    if (!isTeamOfficerOrOwner(team, player)) {
        sendMsg(player, 'Guerre', 'Seul le Leader ou un Ministre peut engager sa nation dans une guerre alliée.', '§c')
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
        if (typeof joinWarCoalition === 'function') {
            joinWarCoalition(server, warId, team.getId(), call.callingTeamId)
        }
        broadcastMsg(server, 'Guerre', 'La nation alliée §e' + team.getName().getString() + ' §frejoint le conflit aux côtés de ses alliés !', '§c')
        return 1
    } else {
        breakAlliance(server, UUID.fromString(call.callingTeamId), team.getId(), 'defection')
        return 1
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
            // /ally add <nation> ou /ally request <nation>
            .then(Commands.literal('add')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return requestAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation'))
                    })
                )
            )
            .then(Commands.literal('request')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return requestAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation'))
                    })
                )
            )
            // /ally accept [nation]
            .then(Commands.literal('accept')
                .executes(function(ctx) {
                    return acceptAlliance(ctx.source.player, null)
                })
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return acceptAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation'))
                    })
                )
            )
            // /ally decline [nation]
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
            // /ally break <nation> ou /ally remove <nation>
            .then(Commands.literal('break')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        var player = ctx.source.player
                        if (!player) return 0
                        var team = getPlayerNationTeam(player)
                        if (!team || !isTeamOfficerOrOwner(team, player)) {
                            sendMsg(player, 'Alliance', 'Seul le Leader ou un Ministre peut rompre une alliance.', '§c')
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
            .then(Commands.literal('remove')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        var player = ctx.source.player
                        if (!player) return 0
                        var team = getPlayerNationTeam(player)
                        if (!team || !isTeamOfficerOrOwner(team, player)) {
                            sendMsg(player, 'Alliance', 'Seul le Leader ou un Ministre peut rompre une alliance.', '§c')
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
            // /ally list
            .then(Commands.literal('list').executes(function(ctx) {
                return listAlliances(ctx.source.player)
            }))
            // /ally home <nation>
            .then(Commands.literal('home')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return (typeof teleportToAllyHome === 'function') ? teleportToAllyHome(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                    })
                )
            )
            // /ally <nation> (commande intelligente)
            .then(Commands.argument('nation', StringArgumentType.string())
                .executes(function(ctx) {
                    var target = StringArgumentType.getString(ctx, 'nation')
                    return handleSmartAllyCommand(ctx.source.player, target)
                })
            )
            .executes(function(ctx) {
                return listAlliances(ctx.source.player)
            })
    )

    // Raccourci direct /allies
    event.register(
        Commands.literal('allies').executes(function(ctx) {
            return listAlliances(ctx.source.player)
        })
    )
})

// Synchronisation automatique des alliances au démarrage et lors des connexions
PlayerEvents.loggedIn(function(event) {
    try {
        var player = event.player
        var server = player.server || (player.getServer ? player.getServer() : null)
        var team = getPlayerNationTeam(player)
        if (server && team) {
            var allies = getTeamAllies(server, team.getId())
            if (allies && allies.length > 0) {
                for (var i = 0; i < allies.length; i++) {
                    syncAllianceWithFTBTeams(server, team.getId(), allies[i], true)
                }
            }
        }
    } catch (e) {}
})
