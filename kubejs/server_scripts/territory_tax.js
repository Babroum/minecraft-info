// priority: 50
// =============================================================================
// NationGlory Server Script - Entretien Territorial et Taxe Bancaire
// NeoForge 1.21.1 / KubeJS 7 (Rhino Engine)
// Intégration FTB Chunks, FTB Teams et Lightman's Currency API
// =============================================================================

// Chargement des classes Java des APIs
const FTBChunksAPI = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI')
const FTBTeamsAPI = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI')
const BankAPI = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.bank.BankAPI')
const CoinValue = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.value.builtin.CoinValue')
// Note: Component est déjà fourni globalement par KubeJS

// Configuration économique géopolitique
const TAX_CONFIG = {
    TAX_PER_CHUNK: 5,               // Coût en dollars ($) par chunk réclamé
    TAX_INTERVAL_TICKS: 72000,      // Prélèvement automatique toutes les heures (72 000 ticks)
    UNCLAIM_ON_DEBT: true,          // Révocation des claims si solde insuffisant
    ANNOUNCE_TO_MEMBERS: true       // Envoi de notifications en jeu aux membres connectés
}

/**
 * Recherche le compte bancaire associé à une équipe FTB Teams
 * 1. Cherche un compte d'équipe dont le nom correspond au nom de la nation
 * 2. Repli : cherche le compte personnel du leader / propriétaire de l'équipe
 */
function resolveTeamBankAccount(team) {
    try {
        const bankApi = BankAPI.getApi()
        const allAccounts = bankApi.GetAllBankAccounts(false) // Comptes côté serveur
        const teamName = team.getName().getString().toLowerCase().trim()
        const teamShort = team.getShortName().toLowerCase().trim()
        const ownerUUID = team.getOwner() ? team.getOwner().toString() : null

        // 1. Recherche par nom d'équipe ou compte dédié
        for (let i = 0; i < allAccounts.size(); i++) {
            const acc = allAccounts.get(i)
            const accName = acc.getName().getString().toLowerCase().trim()
            if (accName === teamName || accName === teamShort || accName.includes(teamShort)) {
                return acc
            }
        }

        // 2. Repli sur le compte du propriétaire / chef d'État
        if (ownerUUID) {
            for (let i = 0; i < allAccounts.size(); i++) {
                const acc = allAccounts.get(i)
                const ownerName = acc.getOwnerName()
                if (ownerName && ownerName.toString() === ownerUUID) {
                    return acc
                }
            }
        }

        // Si aucun compte spécifique n'est trouvé, renvoyer null
        return null
    } catch (e) {
        console.error('[Taxes] Erreur lors de la résolution du compte bancaire : ' + e)
        return null
    }
}

/**
 * Envoie un message formaté à tous les membres connectés d'une équipe
 */
function notifyTeamMembers(team, message) {
    try {
        const onlinePlayers = team.getOnlineMembers()
        if (onlinePlayers && !onlinePlayers.isEmpty()) {
            for (let i = 0; i < onlinePlayers.size(); i++) {
                const player = onlinePlayers.get(i)
                player.sendSystemMessage(Component.literal(message))
            }
        }
    } catch (e) {
        console.error('[Taxes] Erreur lors de la notification des membres : ' + e)
    }
}

/**
 * Cycle principal de prélèvement de la taxe territoriale
 */
function collectTerritoryTaxes(server, commandSource) {
    console.info('[Taxes] Début du cycle de prélèvement des taxes territoriales...')
    
    let totalTaxCollected = 0
    let totalTeamsProcessed = 0
    let totalChunksRevoked = 0

    try {
        const chunksApi = FTBChunksAPI.api()
        const teamsApi = FTBTeamsAPI.api()
        const bankApi = BankAPI.getApi()

        const chunkManager = chunksApi.getManager()
        const teamManager = teamsApi.getManager()
        const teams = teamManager.getTeams()

        const cmdSource = server.createCommandSourceStack()

        teams.forEach(team => {
            if (!team.isValid()) return

            const teamData = chunkManager.getOrCreateData(team)
            if (!teamData) return

            const claimedChunks = teamData.getClaimedChunks()
            if (!claimedChunks || claimedChunks.isEmpty()) return

            const chunkCount = claimedChunks.size()
            const totalTax = chunkCount * TAX_CONFIG.TAX_PER_CHUNK
            totalTeamsProcessed++

            const bankAccount = resolveTeamBankAccount(team)
            const teamDisplayName = team.getName().getString()

            // Création de la valeur monétaire Lightman's Currency
            const taxCost = CoinValue.fromNumber('main', totalTax)

            if (bankAccount && bankAccount.getMoneyStorage().containsValue(taxCost)) {
                // Prélèvement réussi
                bankApi.BankWithdrawFromServer(bankAccount, taxCost, false)
                totalTaxCollected += totalTax

                if (TAX_CONFIG.ANNOUNCE_TO_MEMBERS) {
                    notifyTeamMembers(
                        team,
                        `§2[FINANCES D'ÉTAT] §aTaxe d'entretien territorial prélevée : §e${totalTax}$ §apour §e${chunkCount} §achunk(s).`
                    )
                }
                console.info(`[Taxes] ${teamDisplayName} : ${totalTax}$ prélevés avec succès pour ${chunkCount} chunks.`)
            } else {
                // Solde insuffisant ou compte introuvable : Alerte et révocation des claims
                const currentBalance = bankAccount ? bankAccount.getMoneyStorage().getCoreValue() : 0

                notifyTeamMembers(
                    team,
                    `§4[ALERTE TRÉSORERIE NATIONALE] §cSolde bancaire insuffisant ! Requis: §e${totalTax}$§c. L'État ne peut financer l'entretien territorial.`
                )

                if (TAX_CONFIG.UNCLAIM_ON_DEBT) {
                    // Calcul du nombre de chunks que l'équipe peut se payer
                    const affordableChunks = Math.floor(currentBalance / TAX_CONFIG.TAX_PER_CHUNK || 0)
                    const chunksToRevoke = chunkCount - affordableChunks
                    let revokedCount = 0

                    const chunkIterator = claimedChunks.iterator()
                    while (chunkIterator.hasNext() && revokedCount < chunksToRevoke) {
                        const chunk = chunkIterator.next()
                        // Révocation du claim via l'API FTB Chunks
                        chunk.unclaim(cmdSource, false)
                        revokedCount++
                    }

                    totalChunksRevoked += revokedCount

                    notifyTeamMembers(
                        team,
                        `§c[DÉFENSE NATIONALE] §4${revokedCount} §cchunk(s) territoriaux ont été révoqués et ouverts au pillage pour défaut de paiement !`
                    )

                    console.warn(`[Taxes] ${teamDisplayName} : ${revokedCount} chunks révoqués pour défaut de paiement de taxe.`)
                }
            }
        })

        const summary = `§6[Trésor Fédéral] §aPrélèvement terminé : §e${totalTaxCollected}$ §acollectés sur §e${totalTeamsProcessed} §anations. §c(${totalChunksRevoked} chunks révoqués).`
        console.info(`[Taxes] ${summary}`)

        if (commandSource) {
            commandSource.sendSuccess(() => Component.literal(summary), true)
        }

    } catch (err) {
        console.error('[Taxes] Erreur critique lors du cycle fiscal territorial : ' + err)
        if (commandSource) {
            commandSource.sendFailure(Component.literal('§cErreur lors du prélèvement des taxes : ' + err))
        }
    }
}

// -----------------------------------------------------------------------------
// 1. Commande Admin : /prelever_taxes
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event

    event.register(
        Commands.literal('prelever_taxes')
            .requires(source => source.hasPermission(2)) // Réservé aux OPs / Admins
            .executes(ctx => {
                const server = ctx.source.server
                ctx.source.sendSuccess(() => Component.literal("§e[Impôts] Lancement forcé du prélèvement des taxes..."), false)
                collectTerritoryTaxes(server, ctx.source)
                return 1
            })
    )
})

// -----------------------------------------------------------------------------
// 2. Tâche Périodique (Tick de Serveur)
// -----------------------------------------------------------------------------
let taxTimer = 0

ServerEvents.tick(event => {
    taxTimer++
    if (taxTimer >= TAX_CONFIG.TAX_INTERVAL_TICKS) {
        taxTimer = 0
        collectTerritoryTaxes(event.server, null)
    }
})
