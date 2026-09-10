// priority: 50
// =============================================================================
// Third World Server Script - Entretien Territorial & Taxe sur Temps d'Activité
// Concept 1 : Le temps fiscal ne s'écoule que lorsque la nation est active
// =============================================================================

var TAX_CONFIG = {
    PLAYTIME_CYCLE_MINUTES: 60,      // Cycle fiscal : 60 minutes de présence active cumulée d'au moins 1 membre
    GRACE_PLAYTIME_MINUTES: 120,     // Délai de grâce actif : 120 minutes de jeu actif avant saisie
    UNCLAIM_PERCENT_ON_DEBT: 0.15,   // Saisie de 15% des chunks extérieurs en cas d'expiration de la grâce
    MIN_CHUNKS_EXEMPT: 4             // Les 4 premiers chunks (cœur de base) sont exemptés d'impôt
}

/**
 * Calcul de la taxe progressive par heure de jeu actif selon les chunks
 */
function calculateProgressiveTax(chunkCount) {
    if (chunkCount <= TAX_CONFIG.MIN_CHUNKS_EXEMPT) return 0
    var total = 0
    var taxableChunks = chunkCount - TAX_CONFIG.MIN_CHUNKS_EXEMPT
    for (var i = 1; i <= taxableChunks; i++) {
        if (i <= 10) total += 1        // 1$ par chunk pour les 10 premiers (1 à 10)
        else if (i <= 30) total += 2   // 2$ par chunk de 11 à 30
        else if (i <= 60) total += 5   // 5$ par chunk de 31 à 60
        else total += 10               // 10$ par chunk au-delà de 60
    }
    return total
}

function loadTaxData() {
    return readJsonData('nation_taxes.json') || {}
}

function saveTaxData(data) {
    writeJsonData('nation_taxes.json', data)
}

/**
 * Saisie intelligente des chunks périphériques les plus éloignés du QG/Home
 */
function revokePeripheryChunks(server, team, claimedChunks, quota) {
    if (!claimedChunks || claimedChunks.isEmpty() || quota <= 0) return 0

    var homes = readJsonData('nation_homes.json') || {}
    var teamIdStr = team.getId().toString()
    var centerChunkX = 0
    var centerChunkZ = 0
    var hasHome = false

    if (homes[teamIdStr] && homes[teamIdStr].home) {
        centerChunkX = Math.floor(homes[teamIdStr].home.x / 16)
        centerChunkZ = Math.floor(homes[teamIdStr].home.z / 16)
        hasHome = true
    }

    var chunkList = []
    var sumX = 0, sumZ = 0
    var it = claimedChunks.iterator()
    while (it.hasNext()) {
        var ch = it.next()
        var pos = ch.getPos()
        chunkList.push({ chunk: ch, x: pos.x(), z: pos.z() })
        sumX += pos.x()
        sumZ += pos.z()
    }

    // Si pas de home, calculer le barycentre de tous les chunks
    if (!hasHome && chunkList.length > 0) {
        centerChunkX = Math.round(sumX / chunkList.length)
        centerChunkZ = Math.round(sumZ / chunkList.length)
    }

    // Calculer la distance au carré par rapport au centre
    for (var i = 0; i < chunkList.length; i++) {
        var dx = chunkList[i].x - centerChunkX
        var dz = chunkList[i].z - centerChunkZ
        chunkList[i].distSq = dx * dx + dz * dz
    }

    // Trier du plus lointain au plus proche (les frontières extérieures en premier)
    chunkList.sort(function(a, b) {
        return b.distSq - a.distSq
    })

    var cmdSrc = server.createCommandSourceStack()
    var revoked = 0
    for (var j = 0; j < chunkList.length && revoked < quota; j++) {
        try {
            chunkList[j].chunk.unclaim(cmdSrc, false)
            revoked++
        } catch (e) {
            console.error('[Taxes] Erreur unclaim chunk : ' + e)
        }
    }
    return revoked
}

/**
 * Exécute le prélèvement pour une équipe spécifique
 */
function processTeamTaxCycle(server, team, teamData, taxRecord, now) {
    var claimedChunks = teamData.getClaimedChunks()
    if (!claimedChunks || claimedChunks.isEmpty()) return

    var chunkCount = claimedChunks.size()
    var taxDue = calculateProgressiveTax(chunkCount)
    var teamName = team.getName().getString()

    if (taxDue <= 0) {
        taxRecord.active_minutes = 0
        return
    }

    var paid = false
    if (typeof withdrawNationMoney === 'function') {
        paid = withdrawNationMoney(team, null, taxDue)
    }

    if (paid) {
        taxRecord.active_minutes = 0
        taxRecord.in_debt = false
        taxRecord.debt_active_minutes = 0
        taxRecord.last_cycle_paid_at = now
        taxRecord.last_tax_amount = taxDue
        notifyTeam(team, 'Impôts', 'Taxe d\'entretien territorial acquittée : §e' + taxDue + ' R §fpour §e' + chunkCount + ' chunks §f(1h d\'activité écoulée).', '§a')
    } else {
        // Trésor insuffisant
        taxRecord.in_debt = true
        taxRecord.last_tax_amount = taxDue
        var remainingMins = Math.max(0, TAX_CONFIG.GRACE_PLAYTIME_MINUTES - (taxRecord.debt_active_minutes || 0))
        var remainingH = (remainingMins / 60).toFixed(1)

        notifyTeam(team, 'Alerte Fiscale', '§cTrésor insuffisant pour payer l\'entretien territorial (' + taxDue + ' R dus pour ' + chunkCount + ' chunks). Il vous reste §e' + remainingH + 'h de jeu actif §cpour approvisionner la banque avant saisie périphérique !', '§c')
    }
}

/**
 * Tick chaque minute (1200 ticks de jeu) : accumulation de temps d'activité
 */
var taxTickCounter = 0

ServerEvents.tick(function(event) {
    taxTickCounter++
    if (taxTickCounter < 1200) return
    taxTickCounter = 0

    var server = event.server
    var onlinePlayers = server.getPlayerList().getPlayers()
    if (!onlinePlayers || onlinePlayers.isEmpty()) return

    try {
        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!chunksApi || !teamsApi) return

        var chunkMgr = chunksApi.getManager()
        var teamMgr = teamsApi.getManager()
        var taxData = loadTaxData()
        var now = Date.now()
        var changed = false

        // 1. Identifier les nations actives (au moins 1 joueur en ligne)
        var activeTeams = {}
        for (var p = 0; p < onlinePlayers.size(); p++) {
            var player = onlinePlayers.get(p)
            if (!player || player.isSpectator()) continue
            var team = getPlayerNationTeam(player)
            if (team && team.isPartyTeam()) {
                activeTeams[team.getId().toString()] = team
            }
        }

        // 2. Traiter chaque nation active
        for (var teamIdStr in activeTeams) {
            var teamObj = activeTeams[teamIdStr]
            var teamData = chunkMgr.getOrCreateData(teamObj)
            if (!teamData) continue

            var claimedChunks = teamData.getClaimedChunks()
            if (!claimedChunks || claimedChunks.isEmpty()) continue

            if (!taxData[teamIdStr]) {
                taxData[teamIdStr] = {
                    active_minutes: 0,
                    in_debt: false,
                    debt_active_minutes: 0,
                    last_cycle_paid_at: now,
                    last_tax_amount: 0
                }
            }

            var record = taxData[teamIdStr]
            record.active_minutes = (record.active_minutes || 0) + 1
            changed = true

            // Gestion de la dette active
            if (record.in_debt) {
                record.debt_active_minutes = (record.debt_active_minutes || 0) + 1

                // Rappel toutes les 30 minutes de dette
                if (record.debt_active_minutes % 30 === 0) {
                    var chunkCount = claimedChunks.size()
                    var taxDue = calculateProgressiveTax(chunkCount)
                    var leftM = Math.max(0, TAX_CONFIG.GRACE_PLAYTIME_MINUTES - record.debt_active_minutes)
                    notifyTeam(teamObj, 'Défaut Fiscal', 'Rappel : ' + taxDue + ' R d\'entretien territorial impayés ! Délai de grâce restant : §e' + leftM + ' min de jeu actif§f.', '§c')
                }

                // Expiration de la période de grâce active : saisie périphérique !
                if (record.debt_active_minutes >= TAX_CONFIG.GRACE_PLAYTIME_MINUTES) {
                    var unclaimQuota = Math.max(1, Math.ceil(claimedChunks.size() * TAX_CONFIG.UNCLAIM_PERCENT_ON_DEBT))
                    var revoked = revokePeripheryChunks(server, teamObj, claimedChunks, unclaimQuota)
                    if (revoked > 0) {
                        notifyTeam(teamObj, 'Saisie Territoriale', '§4Défaut de paiement prolongé : ' + revoked + ' chunk(s) périphérique(s) ont été saisis et libérés ! Protégez votre cœur de base en approvisionnant la banque.', '§4')
                    }
                    record.debt_active_minutes = 0 // Réinitialise le délai pour le prochain avertissement
                }
            }

            // Déclenchement du cycle fiscal régulier
            if (record.active_minutes >= TAX_CONFIG.PLAYTIME_CYCLE_MINUTES) {
                processTeamTaxCycle(server, teamObj, teamData, record, now)
            }
        }

        if (changed) {
            saveTaxData(taxData)
        }
    } catch (e) {
        console.error('[Taxes] Erreur tick actif : ' + e)
    }
})

/**
 * Affiche l'état fiscal complet de la nation à un joueur
 */
function showNationTaxOverview(player) {
    if (!player) return 0
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Impôts', 'Vous devez faire partie d\'une nation pour consulter la fiscalité.', '§c')
        return 0
    }

    try {
        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        if (!chunksApi) return 0
        var chunkMgr = chunksApi.getManager()
        var teamData = chunkMgr.getOrCreateData(team)
        var claimedChunks = teamData ? teamData.getClaimedChunks() : null
        var count = claimedChunks ? claimedChunks.size() : 0

        var taxData = loadTaxData()
        var record = taxData[team.getId().toString()] || { active_minutes: 0, in_debt: false, debt_active_minutes: 0 }

        var taxPerHour = calculateProgressiveTax(count)
        var remainingMins = Math.max(0, TAX_CONFIG.PLAYTIME_CYCLE_MINUTES - (record.active_minutes || 0))

        var bankAccount = (typeof getOrCreateNationBank === 'function') ? getOrCreateNationBank(team, player) : null
        var balance = '0 R'
        try {
            if (bankAccount && bankAccount.getBalanceText) balance = bankAccount.getBalanceText().getString()
        } catch (be) {}

        sendMsg(player, 'Fiscalité', '=== Entretien Territorial : §6' + team.getName().getString() + ' §f===', '§6')
        sendMsg(player, 'Territoire', 'Chunks revendiqués : §e' + count + ' §7(4 premiers exemptés)', '§7')
        sendMsg(player, 'Tarif', 'Coût d\'entretien : §e' + taxPerHour + ' R §7par heure de jeu actif', '§7')
        sendMsg(player, 'Horloge', 'Prochain prélèvement dans : §b' + remainingMins + ' minute(s) de jeu active(s)', '§7')
        sendMsg(player, 'Trésorerie', 'Solde Banque Nationale : §a' + balance, '§7')

        if (record.in_debt) {
            var graceLeft = Math.max(0, TAX_CONFIG.GRACE_PLAYTIME_MINUTES - (record.debt_active_minutes || 0))
            sendMsg(player, 'Statut', '§c⚠ EN DÉFAUT DE PAIEMENT ! Grâce restante : ' + graceLeft + ' min de jeu actif avant saisie extérieure.', '§c')
        } else {
            sendMsg(player, 'Statut', '§aEn règle. Vos terres sont sécurisées.', '§a')
        }
        return 1
    } catch (e) {
        console.error('[Taxes] Erreur showNationTaxOverview : ' + e)
    }
    return 0
}

/**
 * Commande Admin pour forcer le prélèvement immédiat
 */
function forceCollectTaxes(server, commandSource) {
    try {
        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!chunksApi || !teamsApi) return

        var chunkMgr = chunksApi.getManager()
        var teamMgr = teamsApi.getManager()
        var taxData = loadTaxData()
        var teams = teamMgr.getTeams()
        var now = Date.now()
        var count = 0

        var it = teams.iterator()
        while (it.hasNext()) {
            var t = it.next()
            if (!t || !t.isPartyTeam()) continue
            var teamData = chunkMgr.getOrCreateData(t)
            if (!teamData) continue
            if (!taxData[t.getId().toString()]) {
                taxData[t.getId().toString()] = { active_minutes: 0, in_debt: false, debt_active_minutes: 0 }
            }
            processTeamTaxCycle(server, t, teamData, taxData[t.getId().toString()], now)
            count++
        }
        saveTaxData(taxData)
        if (commandSource) {
            sendMsg(commandSource.player, 'Admin', 'Cycle fiscal forcé avec succès sur ' + count + ' nation(s).', '§a')
        }
    } catch (e) {
        console.error('[Taxes] Erreur forceCollectTaxes : ' + e)
    }
}

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    event.register(
        Commands.literal('prelever_taxes')
            .requires(function(source) { return source.hasPermission(2) })
            .executes(function(ctx) {
                forceCollectTaxes(ctx.source.server, ctx.source)
                return 1
            })
    )
})
