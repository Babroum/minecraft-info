// priority: 50
// =============================================================================
// Third World Server Script - Commandes d'Administration de Guerre (/waradmin)
// =============================================================================

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
    var IntegerArgumentType = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType')

    event.register(
        Commands.literal('waradmin')
            .requires(function(source) { return source.hasPermission(2) })
            .then(Commands.literal('approve')
                .executes(function(ctx) {
                    var success = approveWar(ctx.source.server, null)
                    if (success) {
                        sendMsg(ctx.source.player, 'WarAdmin', 'Dernière demande de guerre approuvée avec succès.', '§a')
                    } else {
                        sendMsg(ctx.source.player, 'WarAdmin', 'Aucune guerre en attente d\'approbation. Tapez /waradmin list', '§c')
                    }
                    return success ? 1 : 0
                })
                .then(Commands.argument('cible', StringArgumentType.string())
                    .executes(function(ctx) {
                        var target = StringArgumentType.getString(ctx, 'cible')
                        var success = approveWar(ctx.source.server, target)
                        if (success) {
                            sendMsg(ctx.source.player, 'WarAdmin', 'Guerre approuvée avec succès.', '§a')
                        } else {
                            sendMsg(ctx.source.player, 'WarAdmin', 'Guerre introuvable : "' + target + '". Tapez /waradmin list', '§c')
                        }
                        return success ? 1 : 0
                    })
                )
            )
            .then(Commands.literal('reject')
                .executes(function(ctx) {
                    var success = rejectWar(ctx.source.server, null, 'Refusé par administrateur')
                    if (success) {
                        sendMsg(ctx.source.player, 'WarAdmin', 'Dernière demande de guerre rejetée.', '§e')
                    } else {
                        sendMsg(ctx.source.player, 'WarAdmin', 'Aucune guerre en attente.', '§c')
                    }
                    return success ? 1 : 0
                })
                .then(Commands.argument('cible', StringArgumentType.string())
                    .executes(function(ctx) {
                        var target = StringArgumentType.getString(ctx, 'cible')
                        var success = rejectWar(ctx.source.server, target, 'Refusé par administrateur')
                        if (success) {
                            sendMsg(ctx.source.player, 'WarAdmin', 'Guerre rejetée avec succès.', '§e')
                        } else {
                            sendMsg(ctx.source.player, 'WarAdmin', 'Guerre introuvable.', '§c')
                        }
                        return success ? 1 : 0
                    })
                )
            )
            .then(Commands.literal('forcestop')
                .then(Commands.argument('cible', StringArgumentType.string())
                    .executes(function(ctx) {
                        var target = StringArgumentType.getString(ctx, 'cible')
                        var server = ctx.source.server
                        var w = findWarQuery(server, target, false)
                        if (w) {
                            w.status = 'ENDED'
                            var wars = loadWarsRegistry(server)
                            setWar(wars, w.id, w)
                            saveWarsRegistry(server, wars)
                            broadcastMsg(server, 'WarAdmin', 'Le conflit #' + w.id + ' a été arrêté de force par les arbitres fédéraux.', '§6')
                            return 1
                        }
                        sendMsg(ctx.source.player, 'WarAdmin', 'Guerre introuvable.', '§c')
                        return 0
                    })
                )
            )
            .then(Commands.literal('list').executes(function(ctx) {
                var server = ctx.source.server
                var wars = loadWarsRegistry(server)
                var p = ctx.source.player
                sendMsg(p, 'WarAdmin', 'Registre des conflits :', '§6')
                var count = 0
                for (var id in wars) {
                    if (!wars.hasOwnProperty(id)) continue
                    var w = getWar(wars, id)
                    if (!w) continue
                    count++
                    var nameA = w.attackerName || getTeamDisplayName(server, w.attackerLeader)
                    var nameB = w.defenderName || getTeamDisplayName(server, w.defenderLeader)
                    var statusLabel = (w.status === 'ACTIVE') ? '§c[ACTIF]' : ((w.status === 'PENDING_ADMIN') ? '§e[EN ATTENTE]' : '§7[TERMINÉE]')
                    sendMsg(p, 'Guerre #' + id, statusLabel + ' §e' + nameA + ' §fcontre §9' + nameB, '§7')
                }
                if (count === 0) sendMsg(p, 'WarAdmin', 'Aucun enregistrement de guerre.', '§7')
                return 1
            }))
            .then(Commands.literal('raidhours')
                .then(Commands.literal('status').executes(function(ctx) {
                    sendMsg(ctx.source.player, 'WarAdmin', 'État Raid Hours: ' + getRaidHoursStatusText(), '§b')
                    return 1
                }))
                .then(Commands.literal('force')
                    .then(Commands.literal('on').executes(function(ctx) {
                        RAID_CONFIG.forceState = true
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été ACTIVÉES par le Staff ! Les claims ennemis sont vulnérables.', '§c')
                        return 1
                    }))
                    .then(Commands.literal('off').executes(function(ctx) {
                        RAID_CONFIG.forceState = false
                        broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été DÉSACTIVÉES par le Staff. Claims sécurisés.', '§a')
                        return 1
                    }))
                    .then(Commands.literal('auto').executes(function(ctx) {
                        RAID_CONFIG.forceState = null
                        sendMsg(ctx.source.player, 'WarAdmin', 'Mode automatique rétabli (' + RAID_CONFIG.startHour + 'h - ' + RAID_CONFIG.endHour + 'h).', '§a')
                        return 1
                    }))
                )
                .then(Commands.literal('set')
                    .then(Commands.argument('debut', IntegerArgumentType.integer(0, 23))
                        .then(Commands.argument('fin', IntegerArgumentType.integer(0, 23))
                            .executes(function(ctx) {
                                var s = IntegerArgumentType.getInteger(ctx, 'debut')
                                var e = IntegerArgumentType.getInteger(ctx, 'fin')
                                RAID_CONFIG.startHour = s
                                RAID_CONFIG.endHour = e
                                sendMsg(ctx.source.player, 'WarAdmin', 'Plage horaire configurée : ' + s + 'h00 - ' + e + 'h00.', '§a')
                                return 1
                            })
                        )
                    )
                )
                .executes(function(ctx) {
                    sendMsg(ctx.source.player, 'WarAdmin', 'État Raid Hours: ' + getRaidHoursStatusText(), '§b')
                    return 1
                })
            )
    )
})
