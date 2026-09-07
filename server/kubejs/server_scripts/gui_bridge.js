// priority: 50
// =============================================================================
// NationGlory Server Script - Pont Commandes & GUI FancyMenu
// NeoForge 1.21.1 / KubeJS 7 (Rhino Engine)
// Permet de relier les boutons d'interfaces FancyMenu à des commandes serveur
// =============================================================================

// Chargement des classes Java nécessaires
const FTBChunksAPI = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI')
const FTBTeamsAPI = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI')
const BankAPI = Java.loadClass('io.github.lightman314.lightmanscurrency.api.money.bank.BankAPI')

/**
 * Récupère l'équipe / nation d'un joueur
 */
function getPlayerTeam(player) {
    try {
        const teamManager = FTBTeamsAPI.api().getManager()
        return teamManager.getTeamForPlayer(player).orElse(null)
    } catch (e) {
        return null
    }
}

/**
 * Récupère le compte bancaire associé à la nation
 */
function getTeamBank(team) {
    if (!team) return null
    try {
        const allAccounts = BankAPI.getApi().GetAllBankAccounts(false)
        const teamName = team.getName().getString().toLowerCase().trim()
        const teamShort = team.getShortName().toLowerCase().trim()
        const ownerUUID = team.getOwner() ? team.getOwner().toString() : null

        for (let i = 0; i < allAccounts.size(); i++) {
            const acc = allAccounts.get(i)
            const accName = acc.getName().getString().toLowerCase().trim()
            if (accName === teamName || accName === teamShort || accName.includes(teamShort)) {
                return acc
            }
        }

        if (ownerUUID) {
            for (let i = 0; i < allAccounts.size(); i++) {
                const acc = allAccounts.get(i)
                const ownerName = acc.getOwnerName()
                if (ownerName && ownerName.toString() === ownerUUID) {
                    return acc
                }
            }
        }
        return null
    } catch (e) {
        return null
    }
}

/**
 * Envoie un message système formaté au joueur
 */
function sendPlayerMsg(player, text) {
    player.sendSystemMessage(Component.literal(text))
}

// -----------------------------------------------------------------------------
// Handlers des sous-commandes /nation
// -----------------------------------------------------------------------------

function handleNationMenu(ctx) {
    const player = ctx.source.player
    if (!player) return 0

    const team = getPlayerTeam(player)

    sendPlayerMsg(player, '§6╔════════════════════════════════════════╗')
    sendPlayerMsg(player, '§6║     §e§lRÉPUBLIQUE GÉOPOLITIQUE NATIONGLORY   §6║')
    sendPlayerMsg(player, '§6╠════════════════════════════════════════╝')

    if (!team) {
        sendPlayerMsg(player, '§c Statut : §7Vous êtes actuellement sans nation.')
        sendPlayerMsg(player, '§e [1] Créer une nation : §f/ftbteams party create <nom>')
        sendPlayerMsg(player, '§e [2] Rejoindre une nation : §f/ftbteams party join <nom>')
        sendPlayerMsg(player, '§6╚════════════════════════════════════════')
        return 1
    }

    const chunkData = FTBChunksAPI.api().getManager().getOrCreateData(team)
    const chunkCount = chunkData ? chunkData.getClaimedChunks().size() : 0
    const onlineCount = team.getOnlineMembers().size()
    const bankAccount = getTeamBank(team)
    const bankBalance = bankAccount ? bankAccount.getMoneyStorage().getCoreValue() : 0

    sendPlayerMsg(player, `§a Nation : §e§l${team.getName().getString()} §7(${team.getShortName()})`)
    sendPlayerMsg(player, `§b Citoyens en ligne : §f${onlineCount} membre(s)`)
    sendPlayerMsg(player, `§2 Trésor Fédéral : §a${bankBalance}$`)
    sendPlayerMsg(player, `§d Territoire revendiqué : §f${chunkCount} chunk(s) §7(Coût/h: ${chunkCount * 5}$)`)
    sendPlayerMsg(player, '§6────────────────────────────────────────')
    sendPlayerMsg(player, '§7 Actions rapides :')
    sendPlayerMsg(player, '§e • /nation banque   §7➔ Gestion financière')
    sendPlayerMsg(player, '§e • /nation chunk    §7➔ Carte & Revendications')
    sendPlayerMsg(player, '§e • /nation membres  §7➔ Liste du gouvernement')
    sendPlayerMsg(player, '§e • /nation guerre   §7➔ Statut géopolitique & DEFCON')
    sendPlayerMsg(player, '§6╚════════════════════════════════════════╝')
    return 1
}

function handleNationBanque(ctx) {
    const player = ctx.source.player
    if (!player) return 0

    const team = getPlayerTeam(player)
    if (!team) {
        sendPlayerMsg(player, "§c[Banque] Vous devez appartenir à une nation pour consulter son compte bancaire.")
        return 0
    }

    const bankAccount = getTeamBank(team)
    sendPlayerMsg(player, '§2╔════════════ §a§lTRÉSORERIE NATIONALE §2════════════╗')
    sendPlayerMsg(player, `§2║ §fNation : §e${team.getName().getString()}`)
    
    if (bankAccount) {
        const balance = bankAccount.getMoneyStorage().getCoreValue()
        sendPlayerMsg(player, `§2║ §fSolde disponible : §a§l${balance}$`)
        sendPlayerMsg(player, `§2║ §fTitulaire du compte : §7${bankAccount.getName().getString()}`)
    } else {
        sendPlayerMsg(player, '§2║ §cCompte bancaire non enregistré. Déposez des fonds dans un ATM.')
    }
    
    sendPlayerMsg(player, '§2║ §7Pour ouvrir votre guichet ou ATM personnel, utilisez un terminal bancaire.')
    sendPlayerMsg(player, '§2╚════════════════════════════════════════╝')
    return 1
}

function handleNationGuerre(ctx) {
    const player = ctx.source.player
    if (!player) return 0

    const team = getPlayerTeam(player)
    if (!team) {
        sendPlayerMsg(player, "§c[Défense] Aucune nation affiliée.")
        return 0
    }

    sendPlayerMsg(player, '§4╔════════════ §c§lMINISTÈRE DES ARMÉES §4════════════╗')
    sendPlayerMsg(player, `§4║ §fÉtat de préparation de : §e${team.getName().getString()}`)
    sendPlayerMsg(player, '§4║ §cStatut Défense : §e§lDEFCON 3 §7(Tensions modérées)')
    sendPlayerMsg(player, '§4║ §cTechnologies autorisées :')
    sendPlayerMsg(player, '§4║  §7• Missiles balistiques tactiques (Ballistix)')
    sendPlayerMsg(player, '§4║  §7• Canons d\'artillerie lourde (Create Big Cannons)')
    sendPlayerMsg(player, '§4║  §7• Ogives sous contrôle fédéral strict')
    sendPlayerMsg(player, '§4║ §7Règle de combat : Tout raid extérieur nécessite une déclaration préalable.')
    sendPlayerMsg(player, '§4╚════════════════════════════════════════╝')
    return 1
}

function handleNationChunk(ctx) {
    const player = ctx.source.player
    if (!player) return 0

    const team = getPlayerTeam(player)
    if (!team) {
        sendPlayerMsg(player, "§c[Territoire] Vous n'avez pas de nation pour gérer des chunks.")
        return 0
    }

    const chunkData = FTBChunksAPI.api().getManager().getOrCreateData(team)
    const claimedCount = chunkData ? chunkData.getClaimedChunks().size() : 0
    const maxClaims = chunkData ? chunkData.getMaxClaimChunks() : 0

    sendPlayerMsg(player, '§9╔════════════ §b§lCADASTRE & CLAIMS §9════════════╗')
    sendPlayerMsg(player, `§9║ §fChunks actuels : §e${claimedCount} §7/ §b${maxClaims}`)
    sendPlayerMsg(player, `§9║ §fTaxe d'entretien : §e${claimedCount * 5}$ / heure`)
    sendPlayerMsg(player, '§9║ §7Pour ouvrir la carte interactive en plein écran : §eTouche M')
    sendPlayerMsg(player, '§9╚════════════════════════════════════════╝')

    // Tente d'ouvrir l'interface FTB Chunks pour le joueur
    try {
        player.runCommandSilent('ftbchunks open_gui')
    } catch (e) {}
    return 1
}

function handleNationMembres(ctx) {
    const player = ctx.source.player
    if (!player) return 0

    const team = getPlayerTeam(player)
    if (!team) {
        sendPlayerMsg(player, "§c[Gouvernement] Aucune nation affiliée.")
        return 0
    }

    sendPlayerMsg(player, `§3=== Citoyens de ${team.getName().getString()} ===`)
    const members = team.getMembers()
    const online = team.getOnlineMembers()

    sendPlayerMsg(player, `§7Population totale : §f${members.size()} habitant(s) §7(§a${online.size()} connectés§7)`)
    sendPlayerMsg(player, '§7Pour ouvrir le panneau de gestion de la nation : §eTouche O')

    // Tente d'ouvrir l'interface FTB Teams pour le joueur
    try {
        player.runCommandSilent('ftbteams my_team')
    } catch (e) {}
    return 1
}

// -----------------------------------------------------------------------------
// Enregistrement des commandes KubeJS
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(event => {
    const { commands: Commands } = event

    event.register(
        Commands.literal('nation')
            .then(Commands.literal('menu').executes(ctx => handleNationMenu(ctx)))
            .then(Commands.literal('banque').executes(ctx => handleNationBanque(ctx)))
            .then(Commands.literal('guerre').executes(ctx => handleNationGuerre(ctx)))
            .then(Commands.literal('chunk').executes(ctx => handleNationChunk(ctx)))
            .then(Commands.literal('claim').executes(ctx => handleNationChunk(ctx)))
            .then(Commands.literal('membres').executes(ctx => handleNationMembres(ctx)))
            .executes(ctx => handleNationMenu(ctx))
    )
})
