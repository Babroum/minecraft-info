// priority: 45
// =============================================================================
// Third World Server Script - Chat & Menu TAB par Nation (/n, /nc)
// =============================================================================
// 1. Affiche le préfixe de la nation du joueur dans le chat et le menu TAB.
//    Si le joueur n'a aucune nation, STRICTEMENT aucun préfixe n'est affiché.
// 2. Synchronisation native Scoreboard Minecraft pour affichage TAB & nametag.
// 3. Commandes de discussion interne de nation (/n <message> et /nc [global|nation]).
// =============================================================================

var playerChatModes = {} // UUID string -> 'nation' ou 'global'

/**
 * Récupère le nom de la nation du joueur, ou null s'il n'en a pas
 */
function getPlayerNationName(player) {
    if (!player) return null
    try {
        if (typeof getPlayerNationTeam === 'function') {
            var team = getPlayerNationTeam(player)
            if (team) {
                var nameComp = team.getName()
                var nameStr = nameComp ? (nameComp.getString ? nameComp.getString() : String(nameComp)) : null
                if (nameStr && String(nameStr).trim().length > 0) return String(nameStr).trim()
            }
        }
    } catch (e) {
        console.error('[Nation Chat] Erreur getPlayerNationName : ' + e)
    }
    return null
}

/**
 * Synchronise l'affichage TAB et nametag du joueur via le Scoreboard Vanilla de Minecraft.
 */
function updatePlayerNationTab(player) {
    if (!player) return
    try {
        var server = player.server || (player.getServer ? player.getServer() : null)
        if (!server) return

        var pName = player.getName().getString()
        var team = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null

        if (team) {
            var nationName = team.getName().getString()
            var cleanNationName = String(nationName).split('"').join('').split('\\').join('')
            var rawId = String(team.getId()).split('-').join('').substring(0, 12)
            var sbTeamId = 'n_' + rawId

            // Scoreboard Vanilla (Nametag + TAB)
            try {
                var sb = server.getScoreboard()
                if (sb) {
                    var sbTeam = sb.getPlayerTeam(sbTeamId)
                    if (!sbTeam) {
                        sbTeam = sb.addPlayerTeam(sbTeamId)
                    }
                    if (sbTeam) {
                        var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component')
                        sbTeam.setPlayerPrefix(ComponentClass.literal('§8[§6' + cleanNationName + '§8] §f'))
                        sb.addPlayerToTeam(pName, sbTeam)
                    }
                }
            } catch (sbErr) {
                server.runCommandSilent('team add ' + sbTeamId + ' "' + cleanNationName + '"')
                server.runCommandSilent('team modify ' + sbTeamId + ' prefix "[§6' + cleanNationName + '§f] "')
                server.runCommandSilent('team join ' + sbTeamId + ' ' + pName)
            }
        } else {
            // Joueur sans nation : le retirer de l'équipe scoreboard pour ne laisser aucun préfixe
            try {
                var sb2 = server.getScoreboard()
                if (sb2) {
                    sb2.removePlayerFromTeams(pName)
                }
            } catch (sbErr2) {}
            server.runCommandSilent('team leave ' + pName)
        }

        if (player.refreshTabListName) player.refreshTabListName()
    } catch (e) {
        console.error('[Nation Tab] Erreur updatePlayerNationTab : ' + e)
    }
}

/**
 * Envoie un message au canal privé de la nation du joueur
 */
function sendNationChatMessage(sender, messageText) {
    if (!sender) return 0
    if (!messageText || String(messageText).trim().length === 0) {
        sendMsg(sender, 'Chat Nation', 'Message vide.', '§c')
        return 0
    }

    var team = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(sender) : null
    if (!team) {
        sendMsg(sender, 'Chat Nation', 'Vous ne faites partie d\'aucune nation. Rejoignez-en une avec la touche §eO§c.', '§c')
        try { sender.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
        return 0
    }

    var server = sender.server || (sender.getServer ? sender.getServer() : null)
    var teamName = team.getName().getString()
    var senderName = sender.getName().getString()

    var rank = (typeof getPlayerTeamRank === 'function') ? getPlayerTeamRank(team, sender) : 'member'
    var rankColor = (rank === 'owner') ? '§6' : ((rank === 'officer') ? '§b' : '§7')
    var rankLabel = (rank === 'owner') ? 'Leader' : ((rank === 'officer') ? 'Ministre' : 'Citoyen')

    var cleanText = String(messageText).trim()
    var formattedMsg = Text.of('§8[§6Nation§8] §8[' + rankColor + rankLabel + '§8] §f' + senderName + '§7: §e' + cleanText)

    var memberUuids = team.getMembers()
    var sentCount = 0

    if (memberUuids && server) {
        var it = memberUuids.iterator()
        while (it.hasNext()) {
            var memUuid = it.next()
            var pOnline = server.getPlayerList().getPlayer(memUuid)
            if (pOnline) {
                pOnline.tell(formattedMsg)
                try {
                    pOnline.playSound('minecraft:block.note_block.bell', 0.8, 1.2)
                } catch (se) {}
                sentCount++
            }
        }
    }

    console.info('[Chat Nation - ' + teamName + '] ' + senderName + ': ' + cleanText)
    return sentCount
}

/**
 * Définit ou alterne le mode de discussion du joueur (Global <-> Nation)
 */
function setPlayerChatMode(player, explicitMode) {
    if (!player) return
    var team = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
    var uuidStr = player.getUUID ? player.getUUID().toString() : String(player.uuid)

    var targetMode = explicitMode
    if (!targetMode) {
        var currentMode = playerChatModes[uuidStr] || 'global'
        targetMode = (currentMode === 'nation') ? 'global' : 'nation'
    }

    if (targetMode === 'nation') {
        if (!team) {
            sendMsg(player, 'Chat', 'Vous devez appartenir à une nation pour parler dans le canal de nation.', '§c')
            try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
            return
        }
        playerChatModes[uuidStr] = 'nation'
        sendMsg(player, 'Chat', 'Canal de discussion actif : §6Nation (' + team.getName().getString() + ') §f(messages envoyés à votre nation). Tapez §e/nc §fpour revenir au chat global.', '§6')
        return
    }

    // Mode global
    playerChatModes[uuidStr] = 'global'
    sendMsg(player, 'Chat', 'Canal de discussion actif : §aGlobal §f(visible par tous les joueurs). Tapez §e/nc §fpour parler à votre nation.', '§a')
}

function togglePlayerChatMode(player) {
    if (!player) return
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'Chat', 'Vous devez appartenir à une nation pour basculer en mode nation.', '§c')
        return
    }
    var pUuid = getPlayerUUID(player)
    var uuidStr = pUuid ? pUuid.toString() : ''
    var cur = playerChatModes[uuidStr] || 'global'
    var next = (cur === 'nation') ? 'global' : 'nation'
    setPlayerChatMode(player, next)
}

// -----------------------------------------------------------------------------
// 1. FORMATAGE DU MENU TAB (PlayerEvent.TabListNameFormat)
// -----------------------------------------------------------------------------
try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerEvent$TabListNameFormat'), function(event) {
        try {
            var player = event.getEntity()
            if (!player) return

            var nationName = getPlayerNationName(player)
            if (nationName) {
                var rawName = player.getName().getString()
                var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component')
                event.setDisplayName(ComponentClass.literal('§8[§6' + nationName + '§8] §f' + rawName))
            } else {
                event.setDisplayName(null)
            }
        } catch (te) {}
    })
} catch (tabErr) {
    console.warn('[Nation Chat] Impossible d\'enregistrer TabListNameFormat : ' + tabErr)
}

// -----------------------------------------------------------------------------
// 2. INTERCEPTION & FORMATAGE PROPRE DU CHAT SERVEUR (ServerChatEvent)
// -----------------------------------------------------------------------------
try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.ServerChatEvent'), function(event) {
        try {
            var player = event.getPlayer()
            if (!player) return

            var rawText = event.getRawText ? event.getRawText() : ''
            if (!rawText) return

            var server = player.server || (player.getServer ? player.getServer() : null)
            if (!server) return

            var uuidStr = player.getUUID ? player.getUUID().toString() : String(player.uuid)

            // Mode Chat de Nation activé via /nc
            if (playerChatModes[uuidStr] === 'nation') {
                event.setCanceled(true)
                sendNationChatMessage(player, rawText)
                return
            }

            // Chat Global : annuler le formatage vanilla pour diffuser le message propre
            event.setCanceled(true)

            var nationName = getPlayerNationName(player)
            var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component')
            var pName = player.getName().getString()

            if (nationName) {
                var formattedChat = '§8[§6' + nationName + '§8] §f' + pName + '§7: §f' + rawText
                server.getPlayerList().broadcastSystemMessage(ComponentClass.literal(formattedChat), false)
                console.info('[Chat Global] [' + nationName + '] ' + pName + ': ' + rawText)
                return
            }

            // Joueur sans nation : format sobre sans aucun préfixe
            var formattedSolo = '§f' + pName + '§7: §f' + rawText
            server.getPlayerList().broadcastSystemMessage(ComponentClass.literal(formattedSolo), false)
            console.info('[Chat Global] ' + pName + ': ' + rawText)
        } catch (ce) {
            console.error('[Nation Chat] Erreur ServerChatEvent : ' + ce)
        }
    })
} catch (chatErr) {
    console.warn('[Nation Chat] Impossible d\'enregistrer ServerChatEvent : ' + chatErr)
}

// -----------------------------------------------------------------------------
// 4. SYNCHRONISATION DU MENU TAB LORS DES CONNEXIONS ET CHANGEMENTS
// -----------------------------------------------------------------------------
PlayerEvents.loggedIn(function(event) {
    updatePlayerNationTab(event.player)
})

// Vérification périodique légère toutes les 10 secondes (200 ticks) via Master Scheduler
if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('nation_tab_sync', 200, function(server) {
        try {
            var players = server.getPlayerList().getPlayers()
            if (players) {
                var it = players.iterator()
                while (it.hasNext()) {
                    var p = it.next()
                    if (p) updatePlayerNationTab(p)
                }
            }
        } catch (e) {}
    })
}

