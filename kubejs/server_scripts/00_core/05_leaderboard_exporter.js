// priority: 101
// =============================================================================
// Third World Server Script - Core 05 : Exportateur & Moteur de Leaderboards
// =============================================================================
// Collecte, calcule et exporte périodiquement les classements des Nations
// et des Joueurs vers 'kubejs/data/leaderboards.json' pour l'API Web et le Launcher.
// =============================================================================

var LEADERBOARD_CACHE = null

/**
 * Charge l'état actuel des classements
 */
function loadLeaderboardData() {
    if (LEADERBOARD_CACHE !== null) return LEADERBOARD_CACHE
    var fileData = (typeof TW_ReadState === 'function') ? TW_ReadState('leaderboards.json') : null
    if (fileData && typeof fileData === 'object') {
        LEADERBOARD_CACHE = fileData
        return LEADERBOARD_CACHE
    }
    LEADERBOARD_CACHE = {
        lastUpdated: 0,
        accumulatedNations: {},
        accumulatedPlayers: {},
        nations: [],
        players: [],
        categories: {
            power: [],
            wealth: [],
            military: [],
            territory: [],
            onu: []
        }
    }
    return LEADERBOARD_CACHE
}

/**
 * Sauvegarde l'état des classements
 */
function saveLeaderboardData(data) {
    LEADERBOARD_CACHE = data || {}
    if (typeof TW_WriteState === 'function') {
        TW_WriteState('leaderboards.json', LEADERBOARD_CACHE)
    }
}

/**
 * Enregistre une livraison réussie de contrat ONU
 */
function TW_RecordOnuDelivery(teamId, playerUuid, playerName, reward) {
    if (!teamId) return
    var data = loadLeaderboardData()
    data.accumulatedNations = data.accumulatedNations || {}
    data.accumulatedPlayers = data.accumulatedPlayers || {}

    var tStr = String(teamId)
    data.accumulatedNations[tStr] = data.accumulatedNations[tStr] || { onuDeliveriesCount: 0, onuDeliveriesValue: 0 }
    data.accumulatedNations[tStr].onuDeliveriesCount = (data.accumulatedNations[tStr].onuDeliveriesCount || 0) + 1
    data.accumulatedNations[tStr].onuDeliveriesValue = (data.accumulatedNations[tStr].onuDeliveriesValue || 0) + (reward || 0)

    if (playerUuid) {
        var pStr = String(playerUuid)
        data.accumulatedPlayers[pStr] = data.accumulatedPlayers[pStr] || {
            name: playerName || 'Inconnu',
            onuDeliveriesCount: 0,
            onuDeliveriesValue: 0,
            flagsCaptured: 0,
            kills: 0,
            deaths: 0
        }
        data.accumulatedPlayers[pStr].name = playerName || data.accumulatedPlayers[pStr].name
        data.accumulatedPlayers[pStr].onuDeliveriesCount = (data.accumulatedPlayers[pStr].onuDeliveriesCount || 0) + 1
        data.accumulatedPlayers[pStr].onuDeliveriesValue = (data.accumulatedPlayers[pStr].onuDeliveriesValue || 0) + (reward || 0)
    }

    saveLeaderboardData(data)
}

/**
 * Enregistre une capture réussie d'étendard CTF
 */
function TW_RecordCtfCapture(winnerTeamId, playerUuid, playerName) {
    if (!winnerTeamId) return
    var data = loadLeaderboardData()
    data.accumulatedPlayers = data.accumulatedPlayers || {}

    if (playerUuid) {
        var pStr = String(playerUuid)
        data.accumulatedPlayers[pStr] = data.accumulatedPlayers[pStr] || {
            name: playerName || 'Inconnu',
            onuDeliveriesCount: 0,
            onuDeliveriesValue: 0,
            flagsCaptured: 0,
            kills: 0,
            deaths: 0
        }
        data.accumulatedPlayers[pStr].name = playerName || data.accumulatedPlayers[pStr].name
        data.accumulatedPlayers[pStr].flagsCaptured = (data.accumulatedPlayers[pStr].flagsCaptured || 0) + 1
    }

    saveLeaderboardData(data)
}

/**
 * Enregistre un kill PvP
 */
function TW_RecordPvPKill(killerUuid, killerName, victimUuid, victimName) {
    var data = loadLeaderboardData()
    data.accumulatedPlayers = data.accumulatedPlayers || {}

    if (killerUuid) {
        var kStr = String(killerUuid)
        data.accumulatedPlayers[kStr] = data.accumulatedPlayers[kStr] || {
            name: killerName || 'Inconnu',
            onuDeliveriesCount: 0,
            onuDeliveriesValue: 0,
            flagsCaptured: 0,
            kills: 0,
            deaths: 0
        }
        data.accumulatedPlayers[kStr].name = killerName || data.accumulatedPlayers[kStr].name
        data.accumulatedPlayers[kStr].kills = (data.accumulatedPlayers[kStr].kills || 0) + 1
    }

    if (victimUuid) {
        var vStr = String(victimUuid)
        data.accumulatedPlayers[vStr] = data.accumulatedPlayers[vStr] || {
            name: victimName || 'Inconnu',
            onuDeliveriesCount: 0,
            onuDeliveriesValue: 0,
            flagsCaptured: 0,
            kills: 0,
            deaths: 0
        }
        data.accumulatedPlayers[vStr].name = victimName || data.accumulatedPlayers[vStr].name
        data.accumulatedPlayers[vStr].deaths = (data.accumulatedPlayers[vStr].deaths || 0) + 1
    }

    saveLeaderboardData(data)
}

/**
 * Recalcule complètement tous les classements et exporte le fichier JSON
 */
function TW_UpdateLeaderboards(server) {
    if (!server) return null

    try {
        var data = loadLeaderboardData()
        var accNations = data.accumulatedNations || {}
        var accPlayers = data.accumulatedPlayers || {}

        // 1. Récupération des FTB Teams
        var partyTeams = []
        try {
            var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
            if (teamsApi && teamsApi.isManagerLoaded()) {
                var mgr = teamsApi.getManager()
                var allTeams = mgr.getTeams()
                if (allTeams) {
                    var it = allTeams.iterator()
                    while (it.hasNext()) {
                        var t = it.next()
                        if (t && t.isPartyTeam && t.isPartyTeam()) {
                            partyTeams.push(t)
                        }
                    }
                }
            }
        } catch (eTeams) {
            console.error('[Leaderboards] Erreur lecture FTB Teams : ' + eTeams)
        }

        // 2. Récupération du registre des guerres
        var wars = {}
        try {
            if (typeof loadWarsRegistry === 'function') {
                wars = loadWarsRegistry(server) || {}
            } else if (typeof TW_ReadState === 'function') {
                wars = TW_ReadState('wars.json') || {}
            }
        } catch (eWars) {}

        // Compilation des statistiques militaires par Team
        var militaryStats = {}
        for (var wId in wars) {
            var w = wars[wId]
            if (!w) continue

            var atkId = String(w.attackerTeamId || w.attackerLeader || '')
            var defId = String(w.defenderTeamId || w.defenderLeader || '')

            if (atkId && !militaryStats[atkId]) militaryStats[atkId] = { ctfWins: 0, ctfDefenses: 0, warsWon: 0, warsLost: 0, activeWars: 0 }
            if (defId && !militaryStats[defId]) militaryStats[defId] = { ctfWins: 0, ctfDefenses: 0, warsWon: 0, warsLost: 0, activeWars: 0 }

            if (w.status === 'ACTIVE' || w.status === 'COUNTDOWN') {
                if (atkId) militaryStats[atkId].activeWars++
                if (defId) militaryStats[defId].activeWars++
            } else if (w.status === 'ENDED') {
                var winId = String(w.winnerTeamId || '')
                if (w.type === 'CONFLICT') {
                    if (w.endReason === 'VICTORY') {
                        if (winId && militaryStats[winId]) militaryStats[winId].ctfWins++
                    } else if (w.endReason === 'DEFENSIVE_VICTORY') {
                        if (winId && militaryStats[winId]) militaryStats[winId].ctfDefenses++
                    }
                } else if (w.type === 'WAR') {
                    if (winId && militaryStats[winId]) militaryStats[winId].warsWon++
                    var loserId = (winId === atkId) ? defId : atkId
                    if (loserId && militaryStats[loserId]) militaryStats[loserId].warsLost++
                }
            }
        }

        // 3. Données des chantiers hebdos ONU
        var weeklyData = {}
        try {
            if (typeof loadWeeklyData === 'function') {
                weeklyData = loadWeeklyData() || {}
            } else if (typeof TW_ReadState === 'function') {
                weeklyData = TW_ReadState('onu_weekly.json') || {}
            }
        } catch (eWeekly) {}
        var weeklyProgress = weeklyData.progress || {}

        // 4. API FTB Chunks
        var chunksMgr = null
        try {
            var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
            if (chunksApi && chunksApi.getManager) {
                chunksMgr = chunksApi.getManager()
            }
        } catch (eChunks) {}

        // 5. Construction de la liste des Nations
        var nationList = []

        for (var i = 0; i < partyTeams.length; i++) {
            var team = partyTeams[i]
            var tid = team.getId().toString()
            var tName = team.getName().getString()

            // Couleur
            var color = '#FFD700'
            try {
                var cProp = team.getProperty('ftbteams:color')
                if (cProp) color = String(cProp)
            } catch (ec) {}

            // Membres
            var membersCount = 0
            var onlineCount = 0
            var leaderUuid = null
            var leaderName = 'Inconnu'
            try {
                var mems = team.getMembers()
                if (mems) membersCount = mems.size()
                var onl = team.getOnlineMembers()
                if (onl) onlineCount = onl.size()
                if (team.getOwner) {
                    leaderUuid = team.getOwner().toString()
                    var pLeader = server.getPlayerList().getPlayer(team.getOwner())
                    if (pLeader) leaderName = pLeader.getName().getString()
                }
            } catch (em) {}

            // Trésorerie
            var treasury = 0
            if (typeof getNationBankBalance === 'function') {
                try {
                    treasury = getNationBankBalance(team, null) || 0
                } catch (eb) {}
            }

            // Chunks claimés
            var claimedChunks = 0
            if (chunksMgr) {
                try {
                    var tData = chunksMgr.getOrCreateData(team)
                    if (tData && tData.getClaimedChunks) {
                        var cList = tData.getClaimedChunks()
                        if (cList) claimedChunks = cList.size()
                    }
                } catch (ecc) {}
            }

            // Militaire
            var mStat = militaryStats[tid] || { ctfWins: 0, ctfDefenses: 0, warsWon: 0, warsLost: 0, activeWars: 0 }

            // ONU
            var accN = accNations[tid] || { onuDeliveriesCount: 0, onuDeliveriesValue: 0 }
            var wEntry = weeklyProgress[tid] || {}
            var weeklyStreak = wEntry.streak || 0
            var weeklyPoints = 0
            if (wEntry.itemsDelivered) {
                for (var itemKey in wEntry.itemsDelivered) {
                    weeklyPoints += Number(wEntry.itemsDelivered[itemKey] || 0)
                }
            }

            // Formule de Score de Puissance
            // Trésor (x0.05) + Conflits Gagnés (x150) + Défenses (x100) + Guerres (x500) + Livraisons ONU (x50) + Streak (x200) + Chunks (x20) + Membres (x25)
            var powerScore = Math.round(
                (treasury * 0.05) +
                (mStat.ctfWins * 150) +
                (mStat.ctfDefenses * 100) +
                (mStat.warsWon * 500) +
                (accN.onuDeliveriesCount * 50) +
                (weeklyStreak * 200) +
                (claimedChunks * 20) +
                (membersCount * 25)
            )

            // Formatage monétaire
            var formattedTreasury = String(Math.floor(treasury)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' R'

            nationList.push({
                id: tid,
                name: tName,
                color: color,
                leader: leaderName,
                leaderUuid: leaderUuid,
                membersCount: membersCount,
                onlineCount: onlineCount,
                treasury: treasury,
                formattedTreasury: formattedTreasury,
                claimedChunks: claimedChunks,
                ctfWins: mStat.ctfWins,
                ctfDefenses: mStat.ctfDefenses,
                warsWon: mStat.warsWon,
                warsLost: mStat.warsLost,
                activeWars: mStat.activeWars,
                onuDeliveriesCount: accN.onuDeliveriesCount,
                onuDeliveriesValue: accN.onuDeliveriesValue,
                weeklyStreak: weeklyStreak,
                weeklyPoints: weeklyPoints,
                powerScore: powerScore
            })
        }

        // 6. Construction de la liste des Joueurs
        var playerList = []
        for (var pUuid in accPlayers) {
            var pInfo = accPlayers[pUuid]
            if (!pInfo) continue
            var kills = pInfo.kills || 0
            var deaths = pInfo.deaths || 0
            var kd = deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills

            playerList.push({
                uuid: pUuid,
                name: pInfo.name || 'Inconnu',
                onuDeliveriesCount: pInfo.onuDeliveriesCount || 0,
                onuDeliveriesValue: pInfo.onuDeliveriesValue || 0,
                flagsCaptured: pInfo.flagsCaptured || 0,
                kills: kills,
                deaths: deaths,
                kdRatio: kd
            })
        }

        // 7. Catégories triées
        var sortCopy = function(arr, comparator) {
            var copy = arr.slice(0)
            copy.sort(comparator)
            return copy
        }

        var categories = {
            power: sortCopy(nationList, function(a, b) { return b.powerScore - a.powerScore }),
            wealth: sortCopy(nationList, function(a, b) { return b.treasury - a.treasury }),
            military: sortCopy(nationList, function(a, b) {
                var scoreB = (b.ctfWins * 3) + (b.ctfDefenses * 2) + (b.warsWon * 5)
                var scoreA = (a.ctfWins * 3) + (a.ctfDefenses * 2) + (a.warsWon * 5)
                return scoreB - scoreA
            }),
            territory: sortCopy(nationList, function(a, b) { return b.claimedChunks - a.claimedChunks }),
            onu: sortCopy(nationList, function(a, b) { return b.onuDeliveriesCount - a.onuDeliveriesCount }),
            players_onu: sortCopy(playerList, function(a, b) { return b.onuDeliveriesValue - a.onuDeliveriesValue }),
            players_pvp: sortCopy(playerList, function(a, b) { return b.kills - a.kills })
        }

        data.lastUpdated = Date.now()
        data.nations = categories.power
        data.players = categories.players_onu
        data.categories = categories

        saveLeaderboardData(data)
        console.info('[Leaderboards] Export terminé avec succès : ' + nationList.length + ' nation(s), ' + playerList.length + ' joueur(s).')
        return data
    } catch (err) {
        console.error('[Leaderboards] Erreur générale TW_UpdateLeaderboards : ' + err)
        return null
    }
}

// -----------------------------------------------------------------------------
// PLANIFICATION MASTER SCHEDULER & CHARGEMENT
// -----------------------------------------------------------------------------
// Exécution toutes les 5 minutes (6000 ticks)
if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('leaderboards_refresh', 6000, function(server) {
        TW_UpdateLeaderboards(server)
    })
}

// Exécution lors du démarrage du serveur
ServerEvents.loaded(function(event) {
    if (event.server) {
        // Petit délai de 100 ticks pour s'assurer que FTB Teams et LC soient chargés
        if (event.server.scheduleInTicks) {
            event.server.scheduleInTicks(100, function() {
                TW_UpdateLeaderboards(event.server)
            })
        } else {
            TW_UpdateLeaderboards(event.server)
        }
    }
})
