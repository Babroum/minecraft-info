// priority: 40
// =============================================================================
// Third World Server Script - Panneau Central /nation (Ergonomie Sobre)
// =============================================================================

function showNationOverview(player) {
    if (!player) return 0
    var server = player.server
    var team = getPlayerNationTeam(player)

    if (!team) {
        sendMsg(player, 'Nation', 'Statut : Citoyen Indépendant (sans nation).', '§e')
        sendMsg(player, 'Aide', 'Fonder : §e/ftbteams party create <nom> §7| Rejoindre : §e/ftbteams party join <nom> §7| Carte : §eM', '§7')
        player.sendData('open_nation_dashboard', { json: JSON.stringify({ hasNation: false }) })
        return 1
    }

    var teamName = team.getName().getString()
    var rank = getPlayerTeamRank(team, player)
    var rankLabel = (rank === 'owner') ? '§6Leader' : ((rank === 'officer') ? '§bMinistre' : '§7Citoyen')

    var activeWars = (typeof getTeamActiveWars === 'function') ? getTeamActiveWars(server, team.getId()) : []
    var warStatus = activeWars.length > 0 ? ('§cEN GUERRE (' + activeWars.length + ' front(s))') : '§aEn Paix'

    // Formatage garanti du solde : jamais "Nothing", toujours "0 R" par défaut
    var balanceText = (typeof getFormattedNationBalance === 'function') 
        ? getFormattedNationBalance(team, player) 
        : '0 R'

    var allyIds = (typeof getTeamAllies === 'function') ? getTeamAllies(server, team.getId()) : []
    var allyNames = []
    for (var a = 0; a < allyIds.length; a++) {
        var aName = (typeof getTeamDisplayName === 'function') ? getTeamDisplayName(server, allyIds[a]) : null
        if (aName) {
            allyNames.push(aName)
        }
    }
    var alliesText = allyNames.length > 0 ? ('§b' + allyNames.join('§7, §b') + ' §a(' + allyNames.length + ')') : '§7Aucune'

    sendMsg(player, 'Nation', '§6' + teamName + ' §7| Rang : ' + rankLabel + ' §7| Statut : ' + warStatus, '§6')
    sendMsg(player, 'Alliances', alliesText, '§b')
    sendMsg(player, 'Trésor', 'Solde National : §a' + balanceText, '§2')
    sendMsg(player, 'Raccourcis', '§f/nation home §7| §f/nation tax §7| §f/ally list §7| §f/ally <nation>', '§7')

    try {
        var membersList = []
        var memUuids = team.getMembers()
        if (memUuids) {
            var itM = memUuids.iterator()
            while (itM.hasNext()) {
                var u = itM.next()
                var pOnline = server.getPlayerList().getPlayer(u)
                var pName = pOnline ? pOnline.getName().getString() : u.toString().substring(0, 8)
                var mRank = 'Citoyen'
                if (team.getOwner && team.getOwner().equals(u)) mRank = 'Leader'
                else if (team.getOfficers && team.getOfficers().contains(u)) mRank = 'Ministre'
                membersList.push({
                    name: pName,
                    rank: mRank,
                    online: pOnline !== null
                })
            }
        }
        var nationPayload = {
            hasNation: true,
            nationName: teamName,
            rank: rankLabel,
            isOfficer: (rank === 'owner' || rank === 'officer'),
            bankBalance: balanceText,
            warStatus: warStatus,
            chunkCount: 0,
            allies: allyNames,
            members: membersList
        }
        player.sendData('open_nation_dashboard', { json: JSON.stringify(nationPayload) })
    } catch (ne) {
        console.error('[Nation Info] Erreur payload open_nation_dashboard: ' + ne)
    }

    return 1
}

NetworkEvents.dataReceived('action_nation', function(event) {
    try {
        var player = event.player || event.getEntity()
        if (!player) return
        var data = event.data || event.getData()
        var raw = data.getString ? data.getString('json') : String(data.get('json'))
        if (!raw) return
        var action = JSON.parse(raw)
        if (action.action === 'home') {
            var fnHome = (typeof handleNationHomeTeleport === 'function') ? handleNationHomeTeleport : null
            if (fnHome) fnHome(player, false)
        } else if (action.action === 'sethome') {
            var fnSet = (typeof handleNationSetHome === 'function') ? handleNationSetHome : null
            if (fnSet) fnSet(player, false)
        }
    } catch (e) {}
})


/**
 * Liste toutes les nations enregistrées sur le serveur
 */
function showNationList(player) {
    if (!player) return 0
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) {
            sendMsg(player, 'Nation', 'Gestionnaire de nations indisponible.', '§c')
            return 0
        }
        var mgr = teamsApi.getManager()
        var allTeams = mgr.getTeams()
        var partyTeams = []
        if (allTeams) {
            var it = allTeams.iterator()
            while (it.hasNext()) {
                var t = it.next()
                if (t && t.isPartyTeam && t.isPartyTeam()) {
                    partyTeams.push(t)
                }
            }
        }

        if (partyTeams.length === 0) {
            sendMsg(player, 'Nations', 'Aucune nation fondée pour le moment.', '§7')
            sendMsg(player, 'Aide', 'Pour fonder votre nation : §e/ftbteams party create <nom>', '§7')
            return 1
        }

        sendMsg(player, 'Nations', 'Nations enregistrées (' + partyTeams.length + ') :', '§6')
        for (var i = 0; i < partyTeams.length; i++) {
            var team = partyTeams[i]
            var tName = team.getName().getString()
            var memCount = team.getMembers() ? team.getMembers().size() : 0
            var onlineCount = team.getOnlineMembers() ? team.getOnlineMembers().size() : 0
            sendMsg(player, '•', '§6' + tName + ' §7- Membres : §f' + memCount + ' §7(§a' + onlineCount + ' en ligne§7)', '§e')
        }
        return 1
    } catch (e) {
        console.error('[Nation List] Erreur : ' + e)
        sendMsg(player, 'Erreur', 'Impossible de récupérer la liste des nations : ' + e, '§c')
        return 0
    }
}

var showNationInfo = showNationOverview;
