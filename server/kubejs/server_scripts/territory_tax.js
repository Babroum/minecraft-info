// priority: 50
// =============================================================================
// NationGlory Server Script - Entretien Territorial & Taxe Progressive
// =============================================================================

var TAX_CONFIG = {
    TAX_INTERVAL_TICKS: 72000,      // Prélèvement toutes les heures (72 000 ticks)
    UNCLAIM_ON_DEBT: true,          // Révocation des claims en cas de défaut persistant
    GRACE_PERIOD_MS: 24 * 3600 * 1000 // 24h de grâce avant saisie territoriale
}

/**
 * Calcul de la taxe progressive selon le nombre de chunks
 */
function calculateProgressiveTax(chunkCount) {
    if (chunkCount <= 0) return 0
    var total = 0
    for (var i = 1; i <= chunkCount; i++) {
        if (i <= 10) total += 1        // 1$ par chunk pour les 10 premiers
        else if (i <= 30) total += 3   // 3$ de 11 à 30
        else if (i <= 60) total += 8   // 8$ de 31 à 60
        else total += 15               // 15$ au-delà de 60
    }
    return total
}

/**
 * Charge les impayés depuis persistentData
 */
function loadTaxDebts(server) {
    if (!server) return {}
    try {
        if (server.persistentData) {
            var raw = server.persistentData.getString('nation_tax_debts')
            if (raw && raw.length > 0) {
                var d = JSON.parse(raw)
                if (d && typeof d === 'object') return d
            }
        }
    } catch (e) {}
    return {}
}

function saveTaxDebts(server, debts) {
    if (!server) return
    try {
        if (server.persistentData) {
            server.persistentData.putString('nation_tax_debts', JSON.stringify(debts))
        }
    } catch (e) {}
}

/**
 * Prélèvement fiscal d'entretien territorial
 */
function collectTerritoryTaxes(server, commandSource) {
    console.info('[Taxes] Lancement du cycle fiscal territorial...')
    var totalCollected = 0
    var teamsProcessed = 0
    var chunksRevoked = 0

    try {
        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!chunksApi || !teamsApi) return

        var chunkMgr = chunksApi.getManager()
        var teamMgr = teamsApi.getManager()
        var teams = teamMgr.getTeams()
        var debts = loadTaxDebts(server)
        var now = Date.now()

        var it = teams.iterator()
        while (it.hasNext()) {
            var team = it.next()
            if (!team || !team.isValid() || !team.isPartyTeam()) continue

            var teamData = chunkMgr.getOrCreateData(team)
            if (!teamData) continue

            var claimedChunks = teamData.getClaimedChunks()
            if (!claimedChunks || claimedChunks.isEmpty()) continue

            var chunkCount = claimedChunks.size()
            var taxDue = calculateProgressiveTax(chunkCount)
            var teamIdStr = team.getId().toString()
            teamsProcessed++

            // Tenter le retrait sur le compte de la nation
            var paid = false
            if (typeof withdrawNationMoney === 'function') {
                paid = withdrawNationMoney(team, null, taxDue)
            }

            if (paid) {
                totalCollected += taxDue
                delete debts[teamIdStr]
                notifyTeam(team, 'Impôts', 'Taxe d\'entretien territorial acquittée : §e' + taxDue + '$ §fpour §e' + chunkCount + ' §fchunks.', '§a')
            } else {
                // Défaut de paiement
                if (!debts[teamIdStr]) {
                    debts[teamIdStr] = { firstFailedAt: now, chunkCount: chunkCount, taxDue: taxDue }
                    notifyTeam(team, 'Impôts', '§c⚠ Trésor insuffisant pour payer l\'entretien territorial (' + taxDue + '$ dus pour ' + chunkCount + ' chunks). Délai de grâce de 24h engagé !', '§c')
                } else {
                    var debtAge = now - debts[teamIdStr].firstFailedAt
                    if (debtAge >= TAX_CONFIG.GRACE_PERIOD_MS && TAX_CONFIG.UNCLAIM_ON_DEBT) {
                        // Saisie de 20% des chunks les plus vulnérables
                        var unclaimQuota = Math.max(1, Math.ceil(chunkCount * 0.2))
                        var revokedNow = 0
                        var chunkIt = claimedChunks.iterator()
                        var cmdSrc = server.createCommandSourceStack()

                        while (chunkIt.hasNext() && revokedNow < unclaimQuota) {
                            var ch = chunkIt.next()
                            ch.unclaim(cmdSrc, false)
                            revokedNow++
                        }

                        chunksRevoked += revokedNow
                        notifyTeam(team, 'Saisie', '§4' + revokedNow + ' chunk(s) saisis et libérés pour défaut de paiement prolongé !', '§4')
                        debts[teamIdStr].firstFailedAt = now // Réinitialiser le cycle de saisie
                    } else {
                        var remainingH = Math.max(0, Math.ceil((TAX_CONFIG.GRACE_PERIOD_MS - debtAge) / (3600 * 1000)))
                        notifyTeam(team, 'Alerte Fiscale', 'Défaut de paiement persistant ! Il reste ' + remainingH + 'h avant la saisie de vos chunks.', '§c')
                    }
                }
            }
        }

        saveTaxDebts(server, debts)
        var summary = 'Prélèvement territorial terminé : ' + totalCollected + '$ collectés sur ' + teamsProcessed + ' nation(s). (' + chunksRevoked + ' chunks saisis).'
        console.info('[Taxes] ' + summary)

        if (commandSource) {
            sendMsg(commandSource.player, 'Impôts', summary, '§a')
        }
    } catch (e) {
        console.error('[Taxes] Erreur cycle territorial : ' + e)
    }
}

// -----------------------------------------------------------------------------
// COMMANDE ADMIN /prelever_taxes & INTERVALLE AUTO
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    event.register(
        Commands.literal('prelever_taxes')
            .requires(function(source) { return source.hasPermission(2) })
            .executes(function(ctx) {
                collectTerritoryTaxes(ctx.source.server, ctx.source)
                return 1
            })
    )
})

var territoryTaxTimer = 0
ServerEvents.tick(function(event) {
    territoryTaxTimer++
    if (territoryTaxTimer >= TAX_CONFIG.TAX_INTERVAL_TICKS) {
        territoryTaxTimer = 0
        collectTerritoryTaxes(event.server, null)
    }
})
