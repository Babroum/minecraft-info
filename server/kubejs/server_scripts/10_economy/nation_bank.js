// priority: 50
// =============================================================================
// Third World Server Script - Banque Nationale & Intégration Lightman's Currency
// =============================================================================

/**
 * Récupère le nom de la chaîne de monnaie principale enregistrée dans Lightman's Currency
 */
function getCoinChainName() {
    try {
        var CoinAPIClass = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.coins.CoinAPI')
        if (CoinAPIClass && CoinAPIClass.getApi) {
            var api = CoinAPIClass.getApi()
            if (api) {
                var allChains = api.AllChainData()
                if (allChains && !allChains.isEmpty()) {
                    var firstChain = allChains.get(0)
                    if (firstChain && firstChain.getChain) {
                        return String(firstChain.getChain())
                    }
                }
            }
        }
    } catch (e) {}
    return 'main'
}

/**
 * Crée un objet MoneyValue (CoinValue) valide pour un montant en Robert Coins (R)
 */
function createCoinValue(amount) {
    if (!amount || amount <= 0) return null
    var targetAmount = Math.floor(amount)
    try {
        var CoinValue = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.value.builtin.CoinValue')
        if (!CoinValue || !CoinValue.fromNumber) return null

        // 1. Essai avec le nom de chaîne détecté (ex: "main")
        var chain = getCoinChainName()
        var val = CoinValue.fromNumber(chain, targetAmount)
        if (val && !val.isEmpty()) return val

        // 2. Fallback explicite sur 'main'
        if (chain !== 'main') {
            val = CoinValue.fromNumber('main', targetAmount)
            if (val && !val.isEmpty()) return val
        }

        // 3. Fallback en parcourant toutes les chaînes enregistrées
        var CoinAPIClass = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.coins.CoinAPI')
        if (CoinAPIClass && CoinAPIClass.getApi) {
            var all = CoinAPIClass.getApi().AllChainData()
            if (all && !all.isEmpty()) {
                for (var i = 0; i < all.size(); i++) {
                    var ch = all.get(i)
                    var cVal = CoinValue.fromNumber(ch, targetAmount)
                    if (cVal && !cVal.isEmpty()) return cVal
                }
            }
        }
    } catch (e) {
        console.error('[Banque] Erreur createCoinValue : ' + e)
    }
    return null
}

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

        var teamName = String(team.getName().getString()).trim()
        var server = player ? player.server : null

        // 1. Recherche de l'équipe LC correspondante (comparaison stricte de chaînes)
        var allTeams = teamApi.GetAllTeams(false)
        var matchedLcTeam = null

        if (allTeams) {
            for (var i = 0; i < allTeams.size(); i++) {
                var t = allTeams.get(i)
                if (t && String(t.getName()).trim() === teamName) {
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

                if (matchedLcTeam.changeBankLimit && player) {
                    matchedLcTeam.changeBankLimit(player, 1)
                }
            }
        } catch (syncErr) {}

        return matchedLcTeam.getBankAccount()
    } catch (err) {
        console.error('[Banque] Erreur getOrCreateNationBank : ' + err)
    }
    return null
}

/**
 * Formate un nombre avec des espaces comme séparateurs de milliers (ex: 2 500, 100 000).
 */
function formatMoneyNumber(num) {
    if (!num || isNaN(num) || num <= 0) return '0'
    return String(Math.floor(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Renvoie le solde formaté sous forme d'un nombre unique lisible (ex: "0 R", "2 500 R", "150 000 R")
 * au lieu d'une liste détaillée des coupures et pièces de monnaie.
 * Garantit formellement de NE JAMAIS afficher "Nothing" ou une valeur vide.
 */
function getFormattedNationBalance(team, player) {
    if (!team) return '0 R'
    try {
        var amount = getNationBankBalance(team, player)
        if (amount <= 0) return '0 R'
        return formatMoneyNumber(amount) + ' R'
    } catch (e) {
        console.error('[Banque] Erreur getFormattedNationBalance : ' + e)
    }
    return '0 R'
}

/**
 * Récupère le solde numérique exact en Robert Coins (R)
 */
function getNationBankBalance(team, player) {
    if (!team) return 0
    try {
        var bankAccount = getOrCreateNationBank(team, player)
        if (!bankAccount) return 0

        var storage = bankAccount.getMoneyStorage ? bankAccount.getMoneyStorage() : null
        if (!storage || storage.isEmpty()) return 0

        // 1. Somme exacte des core values (Lightman's Currency MoneyStorage)
        if (storage.allValues) {
            var all = storage.allValues()
            if (all && !all.isEmpty()) {
                var total = 0
                for (var i = 0; i < all.size(); i++) {
                    var mv = all.get(i)
                    if (mv && mv.getCoreValue) {
                        total += mv.getCoreValue()
                    }
                }
                return Math.max(0, total)
            }
        }
    } catch (e) {
        console.error('[Banque] Erreur getNationBankBalance : ' + e)
    }
    return 0
}

/**
 * Vérifie si la nation dispose d'un solde suffisant sur son compte
 */
function hasNationMoney(team, player, amount) {
    if (!team || amount <= 0) return true
    try {
        var bankAccount = getOrCreateNationBank(team, player)
        if (!bankAccount) return false

        var storage = bankAccount.getMoneyStorage ? bankAccount.getMoneyStorage() : null
        if (!storage || storage.isEmpty()) return false

        var cost = createCoinValue(amount)
        if (!cost || cost.isEmpty()) return false

        return storage.containsValue(cost)
    } catch (e) {
        console.error('[Banque] Erreur hasNationMoney : ' + e)
    }
    return false
}

/**
 * Débite un montant directement sur le compte bancaire de la nation (Guerres, Taxes, etc.)
 */
function withdrawNationMoney(team, player, amount) {
    if (!team || amount <= 0) return false
    try {
        var bankAccount = getOrCreateNationBank(team, player)
        if (!bankAccount) {
            console.error('[Banque] withdrawNationMoney: Compte bancaire introuvable pour ' + (team ? team.getName().getString() : 'null'))
            return false
        }

        var cost = createCoinValue(amount)
        if (!cost || cost.isEmpty()) {
            console.error('[Banque] withdrawNationMoney: Impossible de créer CoinValue pour ' + amount + ' R')
            return false
        }

        var storage = bankAccount.getMoneyStorage ? bankAccount.getMoneyStorage() : null
        if (!storage || storage.isEmpty()) {
            console.warn('[Banque] withdrawNationMoney: Trésor vide pour ' + team.getName().getString())
            return false
        }

        if (!storage.containsValue(cost)) {
            console.warn('[Banque] withdrawNationMoney: Solde insuffisant pour ' + team.getName().getString() + ' (demandé: ' + amount + ' R)')
            return false
        }

        // 1. Tenter le retrait via BankAPI
        try {
            var BankAPIClass = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.bank.BankAPI')
            var bankApi = BankAPIClass ? BankAPIClass.getApi() : null
            if (bankApi) {
                var pair = bankApi.BankWithdrawFromServer(bankAccount, cost, false)
                if (pair) {
                    var success = pair.getFirst ? pair.getFirst() : false
                    if (success === true) {
                        console.info('[Banque] withdrawNationMoney: ' + amount + ' R prélevés via BankAPI pour ' + team.getName().getString())
                        return true
                    }
                }
            }
        } catch (apiErr) {
            console.error('[Banque] withdrawNationMoney BankAPI error: ' + apiErr)
        }

        // 2. Retrait direct sur le compte bancaire
        if (bankAccount.withdrawMoney) {
            var res = bankAccount.withdrawMoney(cost)
            if (res && !res.isEmpty()) {
                console.info('[Banque] withdrawNationMoney: ' + amount + ' R prélevés via withdrawMoney pour ' + team.getName().getString())
                return true
            }
        }

        // 3. Retrait direct sur le storage
        if (storage.removeValue) {
            storage.removeValue(cost)
            console.info('[Banque] withdrawNationMoney: ' + amount + ' R retirés via storage.removeValue pour ' + team.getName().getString())
            return true
        }
    } catch (e) {
        console.error('[Banque] Erreur withdrawNationMoney : ' + e)
    }
    return false
}

/**
 * Dépose directement de l'argent sur le compte bancaire de la nation (Remboursements, Primes ONU)
 */
function depositNationMoneyDirect(team, amount) {
    if (!team || amount <= 0) return false
    try {
        var bankAccount = getOrCreateNationBank(team, null)
        if (!bankAccount) {
            console.error('[Banque] depositNationMoneyDirect: Compte bancaire introuvable pour ' + (team ? team.getName().getString() : 'null'))
            return false
        }

        var val = createCoinValue(amount)
        if (!val || val.isEmpty()) {
            console.error('[Banque] depositNationMoneyDirect: Impossible de créer CoinValue pour ' + amount + ' R')
            return false
        }

        // 1. Dépôt officiel via BankAPI
        try {
            var BankAPIClass = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.bank.BankAPI')
            var bankApi = BankAPIClass ? BankAPIClass.getApi() : null
            if (bankApi) {
                var success = bankApi.BankDepositFromServer(bankAccount, val, false)
                if (success) {
                    console.info('[Banque] depositNationMoneyDirect: ' + amount + ' R déposés via BankAPI pour ' + team.getName().getString())
                    return true
                }
            }
        } catch (apiErr) {
            console.error('[Banque] depositNationMoneyDirect BankAPI error: ' + apiErr)
        }

        // 2. Dépôt direct en fallback sur depositMoney
        if (bankAccount.depositMoney) {
            bankAccount.depositMoney(val)
            console.info('[Banque] depositNationMoneyDirect: ' + amount + ' R déposés via depositMoney pour ' + team.getName().getString())
            return true
        }

        // 3. Dépôt direct sur le storage
        var storage = bankAccount.getMoneyStorage ? bankAccount.getMoneyStorage() : null
        if (storage && storage.addValue) {
            storage.addValue(val)
            console.info('[Banque] depositNationMoneyDirect: ' + amount + ' R déposés via storage.addValue pour ' + team.getName().getString())
            return true
        }
    } catch (e) {
        console.error('[Banque] Erreur depositNationMoneyDirect : ' + e)
    }
    return false
}

// -----------------------------------------------------------------------------
// AFFICHAGE DU TRÉSOR NATIONAL & REDIRECTION DISTRIBUTEURS AUTOMATIQUES (ATMS)
// -----------------------------------------------------------------------------
/**
 * Affiche le solde du trésor national et rappelle l'utilisation de l'ATM
 */
function showNationBankStatus(player) {
    if (!player) return 0
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Banque', 'Vous devez faire partie d\'une nation pour consulter le trésor.', '§c')
        return 0
    }
    var balance = getFormattedNationBalance(team, player)
    sendMsg(player, 'Banque', 'Trésor National de §6' + team.getName().getString() + ' §f: §a' + balance, '§6')
    sendMsg(player, 'ATM', 'Pour déposer ou retirer des fonds, utilisez un Distributeur Automatique (ATM) avec le compte de votre Nation.', '§7')
    return 1
}

// Réception d'éventuels paquets réseau UI obsolètes : redirection claire vers l'ATM
NetworkEvents.dataReceived('action_nation_bank', function(event) {
    try {
        var player = event.player || event.getEntity()
        if (!player) return
        sendMsg(player, 'Banque', 'Les dépôts et retraits se font désormais exclusivement via les Distributeurs Automatiques (ATMs).', '§e')
        sendMsg(player, 'ATM', 'Interagissez avec un bloc ATM et sélectionnez le compte de votre Nation.', '§7')
    } catch (e) {}
})

// Synchronisation et rechargement des données de monnaie Lightman's Currency depuis MasterCoinList.json
try {
    var CoinAPIClass = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.coins.CoinAPI')
    if (CoinAPIClass && CoinAPIClass.getApi) {
        var cApi = CoinAPIClass.getApi()
        if (cApi && cApi.ReloadCoinDataFromFile) {
            cApi.ReloadCoinDataFromFile(true)
            console.info('[Banque] Configuration MasterCoinList rechargée avec succès dans Lightman\'s Currency.')
        }
    }
} catch (reloadErr) {
    console.error('[Banque] Impossible de recharger MasterCoinList : ' + reloadErr)
}

