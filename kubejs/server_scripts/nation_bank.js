// priority: 50
// =============================================================================
// Third World Server Script - Banque Nationale & Intégration Lightman's Currency
// =============================================================================

/**
 * Synchronise et récupère le compte bancaire Lightman's Currency d'une Nation FTB Teams
 */
function getOrCreateNationBank(team, player) {
    if (!team) return null
    try {
        var TeamAPIClass = Java.loadClass('io.github.lightman314.lightmanscurrency.api.teams.TeamAPI')
        if (!TeamAPIClass) return null
        var teamApi = TeamAPIClass.getApi()
        if (!teamApi) return null

        var teamName = team.getName().getString()
        var teamIdStr = team.getId().toString()
        var server = player ? player.server : null

        // 1. Recherche par nom ou ID enregistré
        var allTeams = teamApi.GetAllTeams(false)
        var matchedLcTeam = null

        if (allTeams) {
            for (var i = 0; i < allTeams.size(); i++) {
                var t = allTeams.get(i)
                if (t && t.getName() === teamName) {
                    matchedLcTeam = t
                    break
                }
            }
        }

        // 2. Si aucune équipe LC n'existe pour cette nation, la créer
        if (!matchedLcTeam) {
            var activePlayer = player
            if (!activePlayer && server) {
                var onlineMembers = team.getOnlineMembers()
                if (onlineMembers && !onlineMembers.isEmpty()) {
                    activePlayer = onlineMembers.get(0)
                }
            }

            if (activePlayer) {
                try {
                    matchedLcTeam = teamApi.CreateTeam(activePlayer, teamName)
                    console.info('[Banque] Équipe Lightman créée pour ' + teamName)
                } catch (ce) {
                    console.error('[Banque] Impossible de créer l\'équipe Lightman : ' + ce)
                }
            }
        }

        if (!matchedLcTeam) return null

        // 3. Vérifier et créer le compte bancaire de l'équipe LC s'il n'existe pas encore
        if (!matchedLcTeam.hasBankAccount()) {
            var execPlayer = player
            if (!execPlayer && server) {
                var online = team.getOnlineMembers()
                if (online && !online.isEmpty()) execPlayer = online.get(0)
            }
            if (execPlayer) {
                matchedLcTeam.createBankAccount(execPlayer)
                console.info('[Banque] Compte bancaire créé pour ' + teamName)
            }
        }

        // 4. Synchroniser les droits : restreindre l'accès ATM aux Admins/Officiers et Leader
        try {
            var PlayerRefClass = Java.loadClass('io.github.lightman314.lightmanscurrency.api.misc.player.PlayerReference')
            var ftbMembers = team.getMembers()

            if (PlayerRefClass && ftbMembers) {
                var lcAdmins = matchedLcTeam.getAdmins()
                var lcMembers = matchedLcTeam.getMembers()

                var it = ftbMembers.iterator()
                while (it.hasNext()) {
                    var mUuid = it.next()
                    var pRef = PlayerRefClass.of(mUuid, mUuid.toString())

                    // Vérifier si le joueur est officier ou owner dans FTB Teams
                    var rank = 'member'
                    if (team.getOwner && team.getOwner().equals(mUuid)) {
                        rank = 'owner'
                    } else if (team.getOfficers && team.getOfficers().contains(mUuid)) {
                        rank = 'officer'
                    }

                    if (rank === 'owner' || rank === 'officer') {
                        if (!PlayerRefClass.isInList(lcAdmins, pRef)) {
                            PlayerRefClass.addToList(lcAdmins, pRef)
                        }
                    } else {
                        if (!PlayerRefClass.isInList(lcMembers, pRef)) {
                            PlayerRefClass.addToList(lcMembers, pRef)
                        }
                    }
                }

                // Définir la limite bancaire à 1 : Seuls les Admins (Officiers) et l'Owner peuvent accéder/retirer à l'ATM
                // (0 = tous les membres, 1 = admins+owner, 2 = owner seul)
                if (matchedLcTeam.changeBankLimit && player) {
                    matchedLcTeam.changeBankLimit(player, 1)
                }
            }
        } catch (syncErr) {
            // Ignorer si échec partiel de sync des rôles
        }

        return matchedLcTeam.getBankAccount()
    } catch (err) {
        console.error('[Banque] Erreur getOrCreateNationBank : ' + err)
    }
    return null
}

/**
 * Débite un montant directement sur le compte bancaire de la nation
 */
function withdrawNationMoney(team, player, amount) {
    if (!team || amount <= 0) return false
    try {
        var bankAccount = getOrCreateNationBank(team, player)
        if (!bankAccount) return false

        var CoinValue = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.value.builtin.CoinValue')
        var cost = CoinValue.fromNumber('lightmanscurrency:coins', amount)

        if (bankAccount.getMoneyStorage().containsValue(cost)) {
            var BankAPI = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.bank.BankAPI').getApi()
            if (BankAPI) {
                BankAPI.BankWithdrawFromServer(bankAccount, cost, false)
                return true
            }
        }
    } catch (e) {
        console.error('[Banque] Erreur withdrawNationMoney : ' + e)
    }
    return false
}

/**
 * Dépose directement de l'argent sur le compte bancaire de la nation
 */
function depositNationMoneyDirect(team, amount) {
    if (!team || amount <= 0) return false
    try {
        var bankAccount = getOrCreateNationBank(team, null)
        if (!bankAccount) return false

        var CoinValue = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.value.builtin.CoinValue')
        var val = CoinValue.fromNumber('lightmanscurrency:coins', amount)
        if (bankAccount.depositMoney) {
            bankAccount.depositMoney(val)
        } else if (bankAccount.depositCoins) {
            bankAccount.depositCoins(val)
        }
        return true
    } catch (e) {
        console.error('[Banque] Erreur depositNationMoneyDirect : ' + e)
    }
    return false
}

var NOTE_VALUES = {
    'kubejs:billet_1': 1,
    'kubejs:billet_5': 5,
    'kubejs:billet_20': 20,
    'kubejs:billet_100': 100
}

/**
 * Dépôt de billets KubeJS par un citoyen sur le compte de sa Nation
 */
function handleNationDeposit(player, amountStr) {
    if (!player) return 0
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Banque', 'Vous devez faire partie d\'une nation pour déposer.', '§c')
        return 0
    }

    var bankAccount = getOrCreateNationBank(team, player)
    if (!bankAccount) {
        sendMsg(player, 'Banque', 'Compte bancaire national introuvable ou en cours de création. Réessayez.', '§c')
        return 0
    }

    var depositMode = (amountStr || 'held').toLowerCase().trim()
    var totalDeposited = 0

    if (depositMode === 'held') {
        var mainHandItem = player.getMainHandItem()
        var val = NOTE_VALUES[mainHandItem.getId()]
        if (!val) {
            sendMsg(player, 'Banque', 'Vous ne tenez aucun billet en main (1 R, 5 R, 20 R ou 100 R). Tapez /nation deposer all', '§e')
            return 0
        }
        var count = mainHandItem.getCount()
        totalDeposited = count * val
        mainHandItem.shrink(count)
    } else if (depositMode === 'all') {
        var inv = player.getInventory()
        for (var i = 0; i < 36; i++) {
            var item = inv.getItem(i)
            if (item && !item.isEmpty()) {
                var v = NOTE_VALUES[item.getId()]
                if (v) {
                    var c = item.getCount()
                    totalDeposited += c * v
                    item.shrink(c)
                }
            }
        }
        if (totalDeposited === 0) {
            sendMsg(player, 'Banque', 'Aucun billet trouvé dans votre inventaire.', '§e')
            return 0
        }
    } else {
        var targetAmount = parseInt(depositMode, 10)
        if (isNaN(targetAmount) || targetAmount <= 0) {
            sendMsg(player, 'Banque', 'Montant invalide. Utilisez un nombre, "held" ou "all".', '§c')
            return 0
        }

        var availableTotal = 0
        var inventory = player.getInventory()
        for (var s = 0; s < 36; s++) {
            var stItem = inventory.getItem(s)
            if (stItem && !stItem.isEmpty()) {
                var sv = NOTE_VALUES[stItem.getId()]
                if (sv) availableTotal += stItem.getCount() * sv
            }
        }

        if (availableTotal < targetAmount) {
            sendMsg(player, 'Banque', 'Fonds insuffisants. Vous possédez ' + availableTotal + ' R sur vous.', '§c')
            return 0
        }

        var needed = targetAmount
        var order = [100, 20, 5, 1]
        for (var o = 0; o < order.length && needed > 0; o++) {
            var curVal = order[o]
            for (var k = 0; k < 36 && needed >= curVal; k++) {
                var itk = inventory.getItem(k)
                if (itk && !itk.isEmpty() && NOTE_VALUES[itk.getId()] === curVal) {
                    while (itk.getCount() > 0 && needed >= curVal) {
                        itk.shrink(1)
                        needed -= curVal
                        totalDeposited += curVal
                    }
                }
            }
        }
    }

    depositNationMoneyDirect(team, totalDeposited)
    var newBalance = '0 R'
    try {
        if (bankAccount.getBalanceText) newBalance = bankAccount.getBalanceText().getString()
    } catch (e) {}

    sendMsg(player, 'Banque', 'Dépôt réussi de §e' + totalDeposited + ' R §fsur le Trésor de §6' + team.getName().getString() + '§f. (Nouveau solde: §a' + newBalance + '§f)', '§a')
    return 1
}

/**
 * Retrait sécurisé réservé aux Leaders et Officiers
 */
function handleNationWithdraw(player, amountStr) {
    if (!player) return 0
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Banque', 'Vous devez faire partie d\'une nation.', '§c')
        return 0
    }

    if (!isTeamOfficerOrOwner(team, player)) {
        sendMsg(player, 'Banque', 'Accès refusé : Seuls le Leader et les Ministres peuvent retirer des fonds du Trésor national.', '§c')
        return 0
    }

    var targetAmount = parseInt(amountStr, 10)
    if (isNaN(targetAmount) || targetAmount <= 0) {
        sendMsg(player, 'Banque', 'Précisez un montant valide : /nation retirer <montant>', '§c')
        return 0
    }

    var success = withdrawNationMoney(team, player, targetAmount)
    if (!success) {
        sendMsg(player, 'Banque', 'Solde du Trésor insuffisant pour retirer ' + targetAmount + ' R.', '§c')
        return 0
    }

    // Donner les billets correspondants au joueur
    var rem = targetAmount
    var n100 = Math.floor(rem / 100)
    rem %= 100
    var n20 = Math.floor(rem / 20)
    rem %= 20
    var n5 = Math.floor(rem / 5)
    rem %= 5
    var n1 = rem

    if (n100 > 0) player.give(Item.of('kubejs:billet_100', n100))
    if (n20 > 0) player.give(Item.of('kubejs:billet_20', n20))
    if (n5 > 0) player.give(Item.of('kubejs:billet_5', n5))
    if (n1 > 0) player.give(Item.of('kubejs:billet_1', n1))

    sendMsg(player, 'Banque', 'Retrait réussi de §e' + targetAmount + ' R §fen billets depuis le Trésor national.', '§a')
    return 1
}

// -----------------------------------------------------------------------------
// COMMANDES CLI /deposer & /retirer
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

    event.register(
        Commands.literal('deposer')
            .executes(function(ctx) { return handleNationDeposit(ctx.source.player, 'held') })
            .then(Commands.argument('montant', StringArgumentType.string())
                .executes(function(ctx) {
                    return handleNationDeposit(ctx.source.player, StringArgumentType.getString(ctx, 'montant'))
                })
            )
    )

    event.register(
        Commands.literal('retirer')
            .then(Commands.argument('montant', StringArgumentType.string())
                .executes(function(ctx) {
                    return handleNationWithdraw(ctx.source.player, StringArgumentType.getString(ctx, 'montant'))
                })
            )
    )
})

NetworkEvents.dataReceived('action_nation_bank', function(event) {
    try {
        var player = event.player || event.getEntity()
        if (!player) return
        var data = event.data || event.getData()
        var raw = data.getString ? data.getString('json') : String(data.get('json'))
        if (!raw) return
        var action = JSON.parse(raw)
        if (action.action === 'deposit_held') {
            handleNationDeposit(player, 'held')
        } else if (action.action === 'deposit_all') {
            handleNationDeposit(player, 'all')
        } else if (action.action === 'withdraw') {
            handleNationWithdraw(player, String(action.amount))
        }
    } catch (e) {}
})
