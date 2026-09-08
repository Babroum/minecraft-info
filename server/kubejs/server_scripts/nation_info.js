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

    var activeWars = getTeamActiveWars(server, team.getId())
    var warStatus = activeWars.length > 0 ? ('§cEN GUERRE (' + activeWars.length + ' front(s))') : '§aEn Paix'

    var bankAccount = getOrCreateNationBank(team, player)
    var balanceText = '0$'
    try {
        if (bankAccount && bankAccount.getBalanceText) balanceText = bankAccount.getBalanceText().getString()
    } catch (e) {}

    sendMsg(player, 'Nation', '§6' + teamName + ' §7| Rang : ' + rankLabel + ' §7| Statut : ' + warStatus, '§6')
    sendMsg(player, 'Trésor', 'Solde National : §a' + balanceText, '§2')
    sendMsg(player, 'Raccourcis', '§f/nation deposer §7| §f/nation retirer §7| §f/ally list §7| §f/war list', '§7')
    return 1
}

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

    event.register(
        Commands.literal('nation')
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
            .then(Commands.literal('info').executes(function(ctx) {
                return showNationOverview(ctx.source.player)
            }))
            .executes(function(ctx) {
                return showNationOverview(ctx.source.player)
            })
    )
})
