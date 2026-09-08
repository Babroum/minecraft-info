// priority: 50
// =============================================================================
// NationGlory Server Script - Moteur de Conflits Multi-Guerres & Coalitions
// =============================================================================

var WAR_COST = 2500 // Coût de déclaration en dollars ($)
var WARS_CACHE = null

/**
 * Charge le registre des guerres depuis le cache mémoire et le fichier wars.json
 */
function loadWarsRegistry(server) {
    if (WARS_CACHE !== null) return WARS_CACHE
    var fileData = readJsonData('wars.json')
    if (fileData && typeof fileData === 'object') {
        WARS_CACHE = fileData
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
        if (wars.hasOwnProperty(k)) {
            var n = parseInt(k, 10)
            if (!isNaN(n) && n > count) count = n
        }
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
            if (wars.hasOwnProperty(id)) {
                if (!requirePending || wars[id].status === 'PENDING_ADMIN') {
                    lastPending = wars[id]
                }
            }
        }
        return lastPending
    }

    var q = query.toLowerCase().trim()
    if (q.startsWith('#')) q = q.substring(1)

    // 2. Recherche directe par clé exacte
    if (wars[q]) {
        if (!requirePending || wars[q].status === 'PENDING_ADMIN') return wars[q]
    }
    if (wars['war_' + q]) {
        if (!requirePending || wars['war_' + q].status === 'PENDING_ADMIN') return wars['war_' + q]
    }

    // 3. Recherche par belligérants ou ID partiel
    for (var wId in wars) {
        if (!wars.hasOwnProperty(wId)) continue
        var w = wars[wId]
        if (requirePending && w.status !== 'PENDING_ADMIN') continue

        var nameA = (w.attackerName || getTeamDisplayName(server, w.attackerLeader)).toLowerCase()
        var nameB = (w.defenderName || getTeamDisplayName(server, w.defenderLeader)).toLowerCase()
        if (nameA === q || nameB === q || nameA.includes(q) || nameB.includes(q) || w.id.toLowerCase() === q || w.id.toLowerCase().includes(q)) {
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
        if (!wars.hasOwnProperty(id)) continue
        var w = wars[id]
        if (w.status !== 'ACTIVE') continue

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
        if (!wars.hasOwnProperty(id)) continue
        var w = wars[id]
        if (w.status === 'ACTIVE') {
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
        if (!wars.hasOwnProperty(id)) continue
        var w = wars[id]
        if (w.status !== 'ACTIVE') continue
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
    var w = wars[warId]
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
 * Déclaration de guerre soumise par un Leader (nécessite validation staff + frais)
 */
function requestWarDeclaration(player, targetQuery) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Guerre', 'Vous devez appartenir à une nation.', '§c')
        return 0
    }
    if (!isTeamOwner(team, player)) {
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

    // Débit des frais de déclaration de guerre
    if (typeof withdrawNationMoney === 'function') {
        var success = withdrawNationMoney(team, player, WAR_COST)
        if (!success) {
            sendMsg(player, 'Guerre', 'Fonds insuffisants ! La déclaration de guerre coûte ' + WAR_COST + '$ au Trésor national.', '§c')
            return 0
        }
    }

    var warId = getNextWarId(server)
    var wars = loadWarsRegistry(server)
    var atkName = team.getName().getString()
    var defName = targetTeam.getName().getString()

    wars[warId] = {
        id: warId,
        status: 'PENDING_ADMIN',
        requesterUuid: player.getStringUuid ? player.getStringUuid() : player.uuid.toString(),
        attackerName: atkName,
        defenderName: defName,
        attackerLeader: team.getId().toString(),
        defenderLeader: targetTeam.getId().toString(),
        attackers: [team.getId().toString()],
        defenders: [targetTeam.getId().toString()],
        attackerNames: [atkName],
        defenderNames: [defName],
        costPaid: WAR_COST,
        createdAt: Date.now(),
        peaceRequestedBy: null
    }

    saveWarsRegistry(server, wars)

    sendMsg(player, 'Guerre', 'Demande de guerre #' + warId + ' contre §e' + defName + ' §fsoumise au Staff (' + WAR_COST + '$ débités).', '§a')

    // Diffusion de l'alerte Staff avec boutons cliquables
    var staffMsg = Component.literal('§7[§6Staff§7] §fDemande de guerre §e#' + warId + ' §f: §e' + atkName + ' §fVS §e' + defName + ' §7| ')
    try {
        var btnApprove = Component.literal('§a§l[ACCEPTER]')
            .clickRunCommand('/waradmin approve ' + warId)
            .hover(Component.literal('§aCliquer pour valider la guerre #' + warId))
        var btnReject = Component.literal('§c§l[REFUSER]')
            .clickRunCommand('/waradmin reject ' + warId)
            .hover(Component.literal('§cCliquer pour refuser la guerre #' + warId))

        staffMsg = staffMsg.append(btnApprove).append(Component.literal(' ')).append(btnReject)
    } catch (e) {
        staffMsg = Component.literal('§7[§6Staff§7] §fDemande de guerre #' + warId + ' : §e' + atkName + ' §fVS §e' + defName + ' §f(Tapez §a/waradmin approve ' + warId + '§f)')
    }

    server.tell(staffMsg)
    return 1
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
    wars[w.id] = w
    saveWarsRegistry(server, wars)

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

    delete wars[w.id]
    saveWarsRegistry(server, wars)

    var nameA = w.attackerName || getTeamDisplayName(server, w.attackerLeader)
    var nameB = w.defenderName || getTeamDisplayName(server, w.defenderLeader)
    broadcastMsg(server, 'Staff', 'La demande de guerre #' + w.id + ' de §e' + nameA + ' §fcontre §e' + nameB + ' §fa été rejetée (' + refund + '$ restitués).', '§e')
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
    if (!isTeamOfficerOrOwner(team, player)) {
        sendMsg(player, 'Diplomatie', 'Seuls le Leader et les Ministres peuvent négocier la paix.', '§c')
        return 0
    }

    var targetTeam = findTeamByNameOrPlayer(server, targetQuery)
    if (!targetTeam) {
        sendMsg(player, 'Diplomatie', 'Nation introuvable : "' + targetQuery + '".', '§c')
        return 0
    }

    var war = findActiveWarBetween(server, team.getId(), targetTeam.getId())
    if (!war) {
        sendMsg(player, 'Diplomatie', 'Votre nation n\'est pas en guerre contre ' + targetTeam.getName().getString() + '.', '§c')
        return 0
    }

    var myTeamIdStr = team.getId().toString()
    var isAttackerCamp = (war.attackers.indexOf(myTeamIdStr) !== -1)
    var myCamp = isAttackerCamp ? 'attackers' : 'defenders'
    var opposingCamp = isAttackerCamp ? 'defenders' : 'attackers'

    if (war.peaceRequestedBy === opposingCamp) {
        // Paix acceptée mutuellement !
        war.status = 'ENDED'
        war.endedAt = Date.now()
        var wars = loadWarsRegistry(server)
        wars[war.id] = war
        saveWarsRegistry(server, wars)

        var nameA = war.attackerName || getTeamDisplayName(server, war.attackerLeader)
        var nameB = war.defenderName || getTeamDisplayName(server, war.defenderLeader)
        broadcastMsg(server, 'Diplomatie', 'Le traité de paix entre §e' + nameA + ' §fet §e' + nameB + ' §fa été ratifié. Fin des hostilités !', '§a')
        return 1
    } else if (war.peaceRequestedBy === myCamp) {
        sendMsg(player, 'Diplomatie', 'Votre camp a déjà proposé la paix. En attente de la ratification adverse.', '§e')
        return 1
    } else {
        // Initier la proposition de paix
        war.peaceRequestedBy = myCamp
        var wars2 = loadWarsRegistry(server)
        wars2[war.id] = war
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
        var w = wars[id]

        // Récupération des noms complets des coalitions
        var atkNames = []
        if (w.attackerNames && w.attackerNames.length > 0) {
            atkNames = w.attackerNames
        } else {
            for (var a = 0; a < w.attackers.length; a++) atkNames.push(getTeamDisplayName(server, w.attackers[a]))
        }

        var defNames = []
        if (w.defenderNames && w.defenderNames.length > 0) {
            defNames = w.defenderNames
        } else {
            for (var d = 0; d < w.defenders.length; d++) defNames.push(getTeamDisplayName(server, w.defenders[d]))
        }

        var statusLabel = (w.status === 'ACTIVE') ? '§c§lACTIF' : ((w.status === 'PENDING_ADMIN') ? '§e§lEN ATTENTE' : '§7TERMINÉE')
        sendMsg(player, 'Guerre #' + id, statusLabel + ' §7| §e' + atkNames.join('§7, §e') + ' §fcontre §9' + defNames.join('§7, §9'), '§6')
        if (w.status === 'ACTIVE') activeCount++
    }

    if (activeCount === 0) {
        sendMsg(player, 'Guerre', 'Aucune guerre active pour le moment.', '§a')
    }
    return 1
}

// -----------------------------------------------------------------------------
// COMMANDES CLI /war & /guerre
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

    event.register(
        Commands.literal('war')
            .then(Commands.literal('declare')
                .then(Commands.argument('cible', StringArgumentType.string())
                    .executes(function(ctx) {
                        return requestWarDeclaration(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            .then(Commands.literal('peace')
                .then(Commands.argument('cible', StringArgumentType.string())
                    .executes(function(ctx) {
                        return handleWarPeace(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
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
                .then(Commands.argument('cible', StringArgumentType.string())
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
            .then(Commands.literal('reject')
                .requires(function(source) { return source.hasPermission(2) })
                .executes(function(ctx) {
                    var success = rejectWar(ctx.source.server, null, 'Refusé par administrateur')
                    return success ? 1 : 0
                })
                .then(Commands.argument('cible', StringArgumentType.string())
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
            .then(Commands.literal('raidhours').executes(function(ctx) {
                if (ctx.source.player) {
                    sendMsg(ctx.source.player, 'Raid Hours', getRaidHoursStatusText(), '§6')
                }
                return 1
            }))
            .executes(function(ctx) {
                return listActiveWars(ctx.source.player)
            })
    )

    // Alias /guerre
    event.register(
        Commands.literal('guerre')
            .then(Commands.literal('declare')
                .then(Commands.argument('cible', StringArgumentType.string())
                    .executes(function(ctx) {
                        return requestWarDeclaration(ctx.source.player, StringArgumentType.getString(ctx, 'cible'))
                    })
                )
            )
            .then(Commands.literal('peace')
                .then(Commands.argument('cible', StringArgumentType.string())
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
                .then(Commands.argument('cible', StringArgumentType.string())
                    .executes(function(ctx) {
                        return approveWar(ctx.source.server, StringArgumentType.getString(ctx, 'cible')) ? 1 : 0
                    })
                )
            )
            .then(Commands.literal('list').executes(function(ctx) {
                return listActiveWars(ctx.source.player)
            }))
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
