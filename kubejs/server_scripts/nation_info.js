// priority: 40
// =============================================================================
// Third World Server Script - Panneau Central /nation (Ergonomie Sobre)
// =============================================================================

function showNationOverview(player) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)

    if (!team) {
        sendMsg(player, 'Nation', 'Statut : Citoyen Indépendant (sans nation).', '§e')
        sendMsg(player, 'Aide', 'Fonder : §e/ftbteams party create <nom> §7| Rejoindre : §e/ftbteams party join <nom> §7| Carte : §eM', '§7')
        player.sendData('open_nation_dashboard', { json: JSON.stringify({ hasNation: false }) })
        return 1
    }

    var teamName = team.getName().getString()
    var rank = getPlayerTeamRank(team, player)
    var rankLabel = (rank === 'owner') ? '§6Leader' : ((rank === 'officer') ? '§bMinistre' : '§7Citoyen')

    var activeWars = (typeof getTeamActiveWars === 'function') ? getTeamActiveWars(server, team.getId()) : []
    var warStatus = activeWars.length > 0 ? ('§cEN GUERRE (' + activeWars.length + ' front(s))') : '§aEn Paix'

    var bankAccount = (typeof getOrCreateNationBank === 'function') ? getOrCreateNationBank(team, player) : null
    var balanceText = '0 R'
    try {
        if (bankAccount && bankAccount.getBalanceText) balanceText = bankAccount.getBalanceText().getString()
    } catch (e) {}

    var allyIds = (typeof getTeamAllies === 'function') ? getTeamAllies(server, team.getId()) : []
    var allyNames = []
    for (var a = 0; a < allyIds.length; a++) {
        var aName = (typeof getTeamDisplayName === 'function') ? getTeamDisplayName(server, allyIds[a]) : null
        if (aName) {
            allyNames.push(aName)
        }
    }
    var alliesText = allyNames.length > 0 ? ('§b' + allyNames.join('§7, §b') + ' §a(' + allyNames.length + ')') : '§7Aucune'

    sendMsg(player, 'Nation', '§6' + teamName + ' §7| Rang : ' + rankLabel + ' §7| Statut : ' + warStatus, '§6')
    sendMsg(player, 'Alliances', alliesText, '§b')
    sendMsg(player, 'Trésor', 'Solde National : §a' + balanceText, '§2')
    sendMsg(player, 'Raccourcis', '§f/nation home §7| §f/nation tax §7| §f/ally list §7| §f/ally <nation>', '§7')

    try {
        var membersList = []
        var memUuids = team.getMembers()
        if (memUuids) {
            var itM = memUuids.iterator()
            while (itM.hasNext()) {
                var u = itM.next()
                var pOnline = server.getPlayerList().getPlayer(u)
                var pName = pOnline ? pOnline.getName().getString() : u.toString().substring(0, 8)
                var mRank = 'Citoyen'
                if (team.getOwner && team.getOwner().equals(u)) mRank = 'Leader'
                else if (team.getOfficers && team.getOfficers().contains(u)) mRank = 'Ministre'
                membersList.push({
                    name: pName,
                    rank: mRank,
                    online: pOnline !== null
                })
            }
        }
        var nationPayload = {
            hasNation: true,
            nationName: teamName,
            rank: rankLabel,
            isOfficer: (rank === 'owner' || rank === 'officer'),
            bankBalance: balanceText,
            warStatus: warStatus,
            chunkCount: 0,
            allies: allyNames,
            members: membersList
        }
        player.sendData('open_nation_dashboard', { json: JSON.stringify(nationPayload) })
    } catch (ne) {
        console.error('[Nation Info] Erreur payload open_nation_dashboard: ' + ne)
    }

    return 1
}

NetworkEvents.dataReceived('action_nation', function(event) {
    try {
        var player = event.player || event.getEntity()
        if (!player) return
        var data = event.data || event.getData()
        var raw = data.getString ? data.getString('json') : String(data.get('json'))
        if (!raw) return
        var action = JSON.parse(raw)
        if (action.action === 'home') {
            var fnHome = (typeof handleNationHomeTeleport === 'function') ? handleNationHomeTeleport : null
            if (fnHome) fnHome(player, false)
        } else if (action.action === 'sethome') {
            var fnSet = (typeof handleNationSetHome === 'function') ? handleNationSetHome : null
            if (fnSet) fnSet(player, false)
        }
    } catch (e) {}
})

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

    event.register(
        Commands.literal('nation')
            // Banque et trésor
            .then(Commands.literal('banque').executes(function(ctx) {
                var player = ctx.source.player
                if (!player) return 0
                var team = getPlayerNationTeam(player)
                if (!team) {
                    sendMsg(player, 'Banque', 'Vous devez faire partie d\'une nation.', '§c')
                    return 0
                }
                var bankAccount = getOrCreateNationBank(team, player)
                var balance = '0 R'
                try {
                    if (bankAccount && bankAccount.getBalanceText) balance = bankAccount.getBalanceText().getString()
                } catch (e) {}
                sendMsg(player, 'Trésor', 'Compte : §6' + team.getName().getString() + ' §f| Solde : §a' + balance, '§2')
                sendMsg(player, 'Actions', 'Déposer : §f/nation deposer <montant> §7| Retirer : §f/nation retirer <montant>', '§7')
                return 1
            }))
            .then(Commands.literal('deposer')
                .executes(function(ctx) {
                    return handleNationDeposit(ctx.source.player, 'held')
                })
                .then(Commands.argument('montant', StringArgumentType.string())
                    .executes(function(ctx) {
                        return handleNationDeposit(ctx.source.player, StringArgumentType.getString(ctx, 'montant'))
                    })
                )
            )
            .then(Commands.literal('retirer')
                .then(Commands.argument('montant', StringArgumentType.string())
                    .executes(function(ctx) {
                        return handleNationWithdraw(ctx.source.player, StringArgumentType.getString(ctx, 'montant'))
                    })
                )
            )
            // Fiscalité territoriale
            .then(Commands.literal('tax').executes(function(ctx) {
                return (typeof showNationTaxOverview === 'function') ? showNationTaxOverview(ctx.source.player) : 0
            }))
            .then(Commands.literal('impots').executes(function(ctx) {
                return (typeof showNationTaxOverview === 'function') ? showNationTaxOverview(ctx.source.player) : 0
            }))
            // Homes & Téléportation
            .then(Commands.literal('home').executes(function(ctx) {
                try {
                    return (typeof teleportToNationHome === 'function') ? teleportToNationHome(ctx.source.player) : 0
                } catch (err) {
                    console.error('[Command] /nation home : ' + err)
                    if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Impossible d\'exécuter /nation home : ' + err, '§c')
                    return 0
                }
            }))
            .then(Commands.literal('sethome').executes(function(ctx) {
                try {
                    var player = ctx.source.player
                    var team = getPlayerNationTeam(player)
                    return (typeof setNationHome === 'function') ? setNationHome(team, player) : 0
                } catch (err) {
                    console.error('[Command] /nation sethome : ' + err)
                    if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Impossible de poser le Home : ' + err, '§c')
                    return 0
                }
            }))
            .then(Commands.literal('delhome').executes(function(ctx) {
                try {
                    var player = ctx.source.player
                    var team = getPlayerNationTeam(player)
                    return (typeof deleteNationHome === 'function') ? deleteNationHome(team, player) : 0
                } catch (err) {
                    console.error('[Command] /nation delhome : ' + err)
                    if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Erreur : ' + err, '§c')
                    return 0
                }
            }))
            // Ambassade pour les alliés
            .then(Commands.literal('setallyhome').executes(function(ctx) {
                try {
                    var player = ctx.source.player
                    var team = getPlayerNationTeam(player)
                    return (typeof setNationAllyHome === 'function') ? setNationAllyHome(team, player) : 0
                } catch (err) {
                    console.error('[Command] /nation setallyhome : ' + err)
                    if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Erreur : ' + err, '§c')
                    return 0
                }
            }))
            .then(Commands.literal('delallyhome').executes(function(ctx) {
                try {
                    var player = ctx.source.player
                    var team = getPlayerNationTeam(player)
                    return (typeof deleteNationAllyHome === 'function') ? deleteNationAllyHome(team, player) : 0
                } catch (err) {
                    console.error('[Command] /nation delallyhome : ' + err)
                    if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Erreur : ' + err, '§c')
                    return 0
                }
            }))
            // Syntaxes composées /nation set ...
            .then(Commands.literal('set')
                .then(Commands.literal('home').executes(function(ctx) {
                    try {
                        var player = ctx.source.player
                        var team = getPlayerNationTeam(player)
                        return (typeof setNationHome === 'function') ? setNationHome(team, player) : 0
                    } catch (err) {
                        console.error('[Command] /nation set home : ' + err)
                        if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Erreur : ' + err, '§c')
                        return 0
                    }
                }))
                .then(Commands.literal('ally')
                    .then(Commands.literal('home').executes(function(ctx) {
                        try {
                            var player = ctx.source.player
                            var team = getPlayerNationTeam(player)
                            return (typeof setNationAllyHome === 'function') ? setNationAllyHome(team, player) : 0
                        } catch (err) {
                            console.error('[Command] /nation set ally home : ' + err)
                            if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Erreur : ' + err, '§c')
                            return 0
                        }
                    }))
                )
                .then(Commands.literal('allyhome').executes(function(ctx) {
                    try {
                        var player = ctx.source.player
                        var team = getPlayerNationTeam(player)
                        return (typeof setNationAllyHome === 'function') ? setNationAllyHome(team, player) : 0
                    } catch (err) {
                        console.error('[Command] /nation set allyhome : ' + err)
                        if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Erreur : ' + err, '§c')
                        return 0
                    }
                }))
            )
            // Visiter l'ambassade d'un allié via /nation allyhome <nation>
            .then(Commands.literal('allyhome')
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        try {
                            return (typeof teleportToAllyHome === 'function') ? teleportToAllyHome(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                        } catch (err) {
                            console.error('[Command] /nation allyhome : ' + err)
                            if (ctx.source.player) sendMsg(ctx.source.player, 'Erreur', 'Erreur : ' + err, '§c')
                            return 0
                        }
                    })
                )
            )
            // Alliances
            .then(Commands.literal('ally')
                .then(Commands.literal('list').executes(function(ctx) {
                    return (typeof listAlliances === 'function') ? listAlliances(ctx.source.player) : 0
                }))
                .then(Commands.literal('add')
                    .then(Commands.argument('nation', StringArgumentType.string())
                        .executes(function(ctx) {
                            return (typeof requestAlliance === 'function') ? requestAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                        })
                    )
                )
                .then(Commands.literal('accept')
                    .executes(function(ctx) {
                        return (typeof acceptAlliance === 'function') ? acceptAlliance(ctx.source.player, null) : 0
                    })
                    .then(Commands.argument('nation', StringArgumentType.string())
                        .executes(function(ctx) {
                            return (typeof acceptAlliance === 'function') ? acceptAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                        })
                    )
                )
                .then(Commands.literal('decline')
                    .executes(function(ctx) {
                        return (typeof declineAlliance === 'function') ? declineAlliance(ctx.source.player, null) : 0
                    })
                    .then(Commands.argument('nation', StringArgumentType.string())
                        .executes(function(ctx) {
                            return (typeof declineAlliance === 'function') ? declineAlliance(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                        })
                    )
                )
                .then(Commands.literal('break')
                    .then(Commands.argument('nation', StringArgumentType.string())
                        .executes(function(ctx) {
                            var p = ctx.source.player
                            if (!p) return 0
                            var t = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(p) : null
                            if (!t || !isTeamOfficerOrOwner(t, p)) {
                                sendMsg(p, 'Alliance', 'Seul le Leader ou un Ministre peut rompre une alliance.', '§c')
                                return 0
                            }
                            var tgt = (typeof findTeamByNameOrPlayer === 'function') ? findTeamByNameOrPlayer(p.server, StringArgumentType.getString(ctx, 'nation')) : null
                            if (!tgt) {
                                sendMsg(p, 'Alliance', 'Nation introuvable.', '§c')
                                return 0
                            }
                            if (typeof breakAlliance === 'function' && breakAlliance(p.server, t.getId(), tgt.getId(), 'voluntary')) {
                                sendMsg(p, 'Alliance', 'Traité d\'alliance dissous avec succès.', '§a')
                            } else {
                                sendMsg(p, 'Alliance', 'Vous n\'étiez pas allié à cette nation.', '§c')
                            }
                            return 1
                        })
                    )
                )
                .then(Commands.argument('nation', StringArgumentType.string())
                    .executes(function(ctx) {
                        return (typeof handleSmartAllyCommand === 'function') ? handleSmartAllyCommand(ctx.source.player, StringArgumentType.getString(ctx, 'nation')) : 0
                    })
                )
                .executes(function(ctx) {
                    return (typeof listAlliances === 'function') ? listAlliances(ctx.source.player) : 0
                })
            )
            .then(Commands.literal('allies').executes(function(ctx) {
                return (typeof listAlliances === 'function') ? listAlliances(ctx.source.player) : 0
            }))
            // Guerres & Conflits
            .then(Commands.literal('war')
                .then(Commands.literal('declare')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            return (typeof requestWarDeclaration === 'function') ? requestWarDeclaration(ctx.source.player, StringArgumentType.getString(ctx, 'cible')) : 0
                        })
                    )
                )
                .then(Commands.literal('peace')
                    .executes(function(ctx) {
                        return (typeof handleWarPeace === 'function') ? handleWarPeace(ctx.source.player, null) : 0
                    })
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            return (typeof handleWarPeace === 'function') ? handleWarPeace(ctx.source.player, StringArgumentType.getString(ctx, 'cible')) : 0
                        })
                    )
                )
                .then(Commands.literal('list').executes(function(ctx) {
                    return (typeof listActiveWars === 'function') ? listActiveWars(ctx.source.player) : 0
                }))
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return (typeof handleSmartWarCommand === 'function') ? handleSmartWarCommand(ctx.source.player, StringArgumentType.getString(ctx, 'cible')) : 0
                    })
                )
                .executes(function(ctx) {
                    return (typeof listActiveWars === 'function') ? listActiveWars(ctx.source.player) : 0
                })
            )
            .then(Commands.literal('guerre')
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        return (typeof handleSmartWarCommand === 'function') ? handleSmartWarCommand(ctx.source.player, StringArgumentType.getString(ctx, 'cible')) : 0
                    })
                )
                .executes(function(ctx) {
                    return (typeof listActiveWars === 'function') ? listActiveWars(ctx.source.player) : 0
                })
            )
            // Vue d'ensemble
            .then(Commands.literal('info').executes(function(ctx) {
                return showNationOverview(ctx.source.player)
            }))
            .executes(function(ctx) {
                return showNationOverview(ctx.source.player)
            })
    )

    // Raccourcis directs /nationhome, /home et /sethome
    event.register(
        Commands.literal('nationhome').executes(function(ctx) {
            return (typeof teleportToNationHome === 'function') ? teleportToNationHome(ctx.source.player) : 0
        })
    )
    event.register(
        Commands.literal('home').executes(function(ctx) {
            return (typeof teleportToNationHome === 'function') ? teleportToNationHome(ctx.source.player) : 0
        })
    )
    event.register(
        Commands.literal('sethome').executes(function(ctx) {
            var player = ctx.source.player
            var team = getPlayerNationTeam(player)
            return (typeof setNationHome === 'function') ? setNationHome(team, player) : 0
        })
    )
})
