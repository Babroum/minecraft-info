// priority: 40
// =============================================================================
// NationGlory Server Script - Panneau Central /nation (Ergonomie Sobre)
// =============================================================================

function showNationOverview(player) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)

    if (!team) {
        sendMsg(player, 'Nation', 'Statut : Citoyen Indépendant (sans nation).', '§e')
        sendMsg(player, 'Aide', 'Appuyez sur §eO §fpour fonder/rejoindre une nation, et §eM §fpour la carte des chunks.', '§7')
        return 1
    }

    var teamName = team.getName().getString()
    var rank = getPlayerTeamRank(team, player)
    var rankLabel = (rank === 'owner') ? '§6Leader' : ((rank === 'officer') ? '§bMinistre' : '§7Citoyen')

    var activeWars = (typeof getTeamActiveWars === 'function') ? getTeamActiveWars(server, team.getId()) : []
    var warStatus = activeWars.length > 0 ? ('§cEN GUERRE (' + activeWars.length + ' front(s))') : '§aEn Paix'

    var bankAccount = (typeof getOrCreateNationBank === 'function') ? getOrCreateNationBank(team, player) : null
    var balanceText = '0$'
    try {
        if (bankAccount && bankAccount.getBalanceText) balanceText = bankAccount.getBalanceText().getString()
    } catch (e) {}

    sendMsg(player, 'Nation', '§6' + teamName + ' §7| Rang : ' + rankLabel + ' §7| Statut : ' + warStatus, '§6')
    sendMsg(player, 'Trésor', 'Solde National : §a' + balanceText, '§2')
    sendMsg(player, 'Raccourcis', '§f/nation home §7| §f/nation sethome §7| §f/nation tax §7| §f/ally list', '§7')
    return 1
}

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
                var balance = '0$'
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
            // Vue d'ensemble
            .then(Commands.literal('info').executes(function(ctx) {
                return showNationOverview(ctx.source.player)
            }))
            .executes(function(ctx) {
                return showNationOverview(ctx.source.player)
            })
    )

    // Raccourci direct /nationhome
    event.register(
        Commands.literal('nationhome').executes(function(ctx) {
            return (typeof teleportToNationHome === 'function') ? teleportToNationHome(ctx.source.player) : 0
        })
    )
})
