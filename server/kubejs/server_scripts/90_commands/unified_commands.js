// priority: 1
// =============================================================================
// Third World Server Script - Routeur Unifié des Commandes Joueurs & Staff
// =============================================================================
// Centralise l'enregistrement Brigadier pour éliminer les collisions et alias flous :
// - /nation : informations, liste, banque, taxes, QG, ambassades et autel
// - /war    : déclarations, escarmouches, CTF, cessez-le-feu, raidhours, fiches de guerre
// - /onu    : bourse AMM, contrats d'approvisionnement, téléportation, administration
// - /ally   : pactes diplomatiques, ambassades alliées et gestion des alliances (alias /alliance)
// - /n, /nc : canal privé de nation et bascule rapide
// - /waradmin : modération des conflits et sanctuaires
// =============================================================================

ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
    var IntegerArgumentType = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType')

    // Helper d'extraction du joueur avec message si console
    var getPlayer = function(ctx) {
        var p = ctx.source.player
        if (!p) {
            console.warn('[Commandes] Cette commande nécessite d\'être un joueur en jeu.')
            return null
        }
        return p
    }

    // =========================================================================
    // 1. COMMANDE PRINCIPALE : /nation (avec alias /nations)
    // =========================================================================
    var registerNationBranch = function(literalName) {
        event.register(
            Commands.literal(literalName)
                // /nation info [cible]
                .then(Commands.literal('info')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof showNationOverview === 'function') return showNationOverview(p)
                            sendMsg(p, 'Nation', 'Module nation_info indisponible.', '§c')
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof showNationOverview === 'function') return showNationOverview(p)
                        sendMsg(p, 'Nation', 'Module nation_info indisponible.', '§c')
                        return 0
                    })
                )
                // /nation list
                .then(Commands.literal('list')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof showNationList === 'function') return showNationList(p)
                        sendMsg(p, 'Nation', 'Module nation_info indisponible.', '§c')
                        return 0
                    })
                )
                // /nation bank / /nation banque
                .then(Commands.literal('bank')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof showNationBankStatus === 'function') return showNationBankStatus(p)
                        if (typeof showNationOverview === 'function') return showNationOverview(p)
                        return 0
                    })
                )
                // /nation deposit / /nation deposer
                .then(Commands.literal('deposit')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) {
                            sendMsg(p, 'Banque', 'Les dépôts se font désormais exclusivement via les Distributeurs Automatiques (ATMs).', '§e')
                            sendMsg(p, 'ATM', 'Interagissez avec un bloc ATM pour alimenter le Trésor de votre Nation.', '§7')
                        }
                        return 1
                    })
                )
                // /nation withdraw / /nation retirer
                .then(Commands.literal('withdraw')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) {
                            sendMsg(p, 'Banque', 'Les retraits se font désormais exclusivement via les Distributeurs Automatiques (ATMs).', '§e')
                            sendMsg(p, 'ATM', 'Interagissez avec un bloc ATM pour retirer des fonds (réservé aux Leaders et Ministres).', '§7')
                        }
                        return 1
                    })
                )
                // /nation tax / /nation taxes
                .then(Commands.literal('tax')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof showNationTaxOverview === 'function') return showNationTaxOverview(p)
                        sendMsg(p, 'Taxes', 'Module territory_tax indisponible.', '§c')
                        return 0
                    })
                )
                // /nation home
                .then(Commands.literal('home')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof teleportToNationHome === 'function') return teleportToNationHome(p)
                        sendMsg(p, 'Nation', 'Module nation_homes indisponible.', '§c')
                        return 0
                    })
                )
                // /nation sethome
                .then(Commands.literal('sethome')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof setNationHome === 'function') return setNationHome(p)
                        sendMsg(p, 'Nation', 'Module nation_homes indisponible.', '§c')
                        return 0
                    })
                )
                // /nation delhome
                .then(Commands.literal('delhome')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof deleteNationHome === 'function') return deleteNationHome(p)
                        sendMsg(p, 'Nation', 'Module nation_homes indisponible.', '§c')
                        return 0
                    })
                )
                // /nation allyhome <nation>
                .then(Commands.literal('allyhome')
                    .then(Commands.argument('nation', StringArgumentType.string())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof teleportToAllyHome === 'function') {
                                return teleportToAllyHome(p, StringArgumentType.getString(ctx, 'nation'))
                            }
                            sendMsg(p, 'Alliance', 'Module nation_homes indisponible.', '§c')
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Aide', 'Usage : §e/nation allyhome <nom_nation>', '§7')
                        return 0
                    })
                )
                // /nation setallyhome
                .then(Commands.literal('setallyhome')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof setNationAllyHome === 'function') return setNationAllyHome(null, p)
                        sendMsg(p, 'Alliance', 'Module nation_homes indisponible.', '§c')
                        return 0
                    })
                )
                // /nation delallyhome
                .then(Commands.literal('delallyhome')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof deleteNationAllyHome === 'function') return deleteNationAllyHome(null, p)
                        sendMsg(p, 'Alliance', 'Module nation_homes indisponible.', '§c')
                        return 0
                    })
                )
                // /nation altar [set|info]
                .then(Commands.literal('altar')
                    .then(Commands.literal('set')
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof handleNationSetAltar === 'function') return handleNationSetAltar(p) ? 1 : 0
                            return 0
                        })
                    )
                    .then(Commands.literal('info')
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof handleNationAltarInfo === 'function') return handleNationAltarInfo(p) ? 1 : 0
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof handleNationAltarInfo === 'function') return handleNationAltarInfo(p) ? 1 : 0
                        return 0
                    })
                )
                // /nation (sans argument) -> Tableau de bord de la nation
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof showNationOverview === 'function') return showNationOverview(p)
                    sendMsg(p, 'Nation', 'Module nation_info indisponible.', '§c')
                    return 0
                })
        )
    }

    registerNationBranch('nation')

    // Raccourcis autonomes de confort
    event.register(
        Commands.literal('home').executes(function(ctx) {
            var p = getPlayer(ctx)
            if (!p) return 0
            if (typeof teleportToNationHome === 'function') return teleportToNationHome(p)
            return 0
        })
    )

    // =========================================================================
    // 2. COMMANDE PRINCIPALE : /war (avec alias /guerre)
    // =========================================================================
    var registerWarBranch = function(literalName) {
        event.register(
            Commands.literal(literalName)
                // /war declare <cible>
                .then(Commands.literal('declare')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof requestWarDeclaration === 'function') {
                                return requestWarDeclaration(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Guerre', 'Usage : §e/war declare <nom_nation>', '§c')
                        return 0
                    })
                )
                // /war conflict <cible>
                .then(Commands.literal('conflict')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof requestConflict === 'function') {
                                return requestConflict(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Guerre', 'Usage : §e/war conflict <nom_nation>', '§c')
                        return 0
                    })
                )
                // /war capture
                .then(Commands.literal('capture')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof handleFlagCaptureAtOnu === 'function') {
                            return handleFlagCaptureAtOnu(p) ? 1 : 0
                        }
                        return 0
                    })
                )
                // /war peace [cible] / /war ceasefire [cible]
                .then(Commands.literal('peace')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof handleWarPeace === 'function') {
                                return handleWarPeace(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof handleWarPeace === 'function') return handleWarPeace(p, null)
                        return 0
                    })
                )
                .then(Commands.literal('ceasefire')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof handleWarPeace === 'function') {
                                return handleWarPeace(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof handleWarPeace === 'function') return handleWarPeace(p, null)
                        return 0
                    })
                )
                // /war accept [cible] & /war approve [cible]
                .then(Commands.literal('accept')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = ctx.source.player
                            var s = ctx.source.server
                            var query = StringArgumentType.getString(ctx, 'cible')
                            if (typeof approveWar === 'function') {
                                var ok = approveWar(s, query)
                                if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente trouvée pour : ' + query, '§c')
                                return ok ? 1 : 0
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = ctx.source.player
                        var s = ctx.source.server
                        if (typeof approveWar === 'function') {
                            var ok = approveWar(s, null)
                            if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente.', '§c')
                            return ok ? 1 : 0
                        }
                        return 0
                    })
                )
                .then(Commands.literal('approve')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = ctx.source.player
                            var s = ctx.source.server
                            var query = StringArgumentType.getString(ctx, 'cible')
                            if (typeof approveWar === 'function') {
                                var ok = approveWar(s, query)
                                if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente trouvée pour : ' + query, '§c')
                                return ok ? 1 : 0
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = ctx.source.player
                        var s = ctx.source.server
                        if (typeof approveWar === 'function') {
                            var ok = approveWar(s, null)
                            if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente.', '§c')
                            return ok ? 1 : 0
                        }
                        return 0
                    })
                )
                // /war decline [cible] / /war reject [cible]
                .then(Commands.literal('decline')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = ctx.source.player
                            var s = ctx.source.server
                            var query = StringArgumentType.getString(ctx, 'cible')
                            if (typeof rejectWar === 'function') {
                                var ok = rejectWar(s, query)
                                if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente trouvée pour : ' + query, '§c')
                                return ok ? 1 : 0
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = ctx.source.player
                        var s = ctx.source.server
                        if (typeof rejectWar === 'function') {
                            var ok = rejectWar(s, null)
                            if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente.', '§c')
                            return ok ? 1 : 0
                        }
                        return 0
                    })
                )
                .then(Commands.literal('reject')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = ctx.source.player
                            var s = ctx.source.server
                            var query = StringArgumentType.getString(ctx, 'cible')
                            if (typeof rejectWar === 'function') {
                                var ok = rejectWar(s, query)
                                if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente trouvée pour : ' + query, '§c')
                                return ok ? 1 : 0
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = ctx.source.player
                        var s = ctx.source.server
                        if (typeof rejectWar === 'function') {
                            var ok = rejectWar(s, null)
                            if (p && !ok) sendMsg(p, 'Staff', 'Aucune demande de guerre en attente.', '§c')
                            return ok ? 1 : 0
                        }
                        return 0
                    })
                )
                // /war list
                .then(Commands.literal('list')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof listActiveWars === 'function') return listActiveWars(p)
                        sendMsg(p, 'Guerre', 'Module war_engine indisponible.', '§c')
                        return 0
                    })
                )
                // /war info [id]
                .then(Commands.literal('info')
                    .then(Commands.argument('id', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof showWarInfo === 'function') {
                                return showWarInfo(p, StringArgumentType.getString(ctx, 'id'))
                            }
                            return 1
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof showWarInfo === 'function') return showWarInfo(p, null)
                        return 1
                    })
                )
                // /war raidhours
                .then(Commands.literal('raidhours')
                    .then(Commands.literal('on')
                        .requires(function(source) { return source.hasPermission(2) })
                        .executes(function(ctx) {
                            if (typeof setForcedRaidHoursState === 'function') setForcedRaidHoursState(true, ctx.source.server)
                            broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été ACTIVÉES par le Staff ! Les claims ennemis sont vulnérables au minage/siège.', '§c')
                            return 1
                        })
                    )
                    .then(Commands.literal('off')
                        .requires(function(source) { return source.hasPermission(2) })
                        .executes(function(ctx) {
                            if (typeof setForcedRaidHoursState === 'function') setForcedRaidHoursState(false, ctx.source.server)
                            broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été DÉSACTIVÉES par le Staff. Claims sécurisés.', '§a')
                            return 1
                        })
                    )
                    .then(Commands.literal('auto')
                        .requires(function(source) { return source.hasPermission(2) })
                        .executes(function(ctx) {
                            if (typeof setForcedRaidHoursState === 'function') setForcedRaidHoursState(null, ctx.source.server)
                            var p = getPlayer(ctx)
                            if (p) sendMsg(p, 'Raid Hours', 'Mode automatique rétabli (selon les horaires configurés).', '§a')
                            return 1
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        var txt = (typeof getRaidHoursStatusText === 'function') ? getRaidHoursStatusText() : 'Horaire habituel : 18h00 - 22h00.'
                        sendMsg(p, 'Raid Hours', txt, '§6')
                        if (p.hasPermissions && p.hasPermissions(2)) {
                            sendMsg(p, 'Staff', 'Contrôle : §e/war raidhours on §7| §eoff §7| §eauto', '§7')
                        }
                        return 1
                    })
                )
                // Commande intelligente directe /war <cible>
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof handleSmartWarCommand === 'function') {
                            return handleSmartWarCommand(p, StringArgumentType.getString(ctx, 'cible'))
                        }
                        return 0
                    })
                )
                // /war (sans argument) -> Liste des guerres actives
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof listActiveWars === 'function') return listActiveWars(p)
                    return 0
                })
        )
    }

    registerWarBranch('war')

    // =========================================================================
    // 3. COMMANDE PRINCIPALE : /onu
    // =========================================================================
    event.register(
        Commands.literal('onu')
            // /onu market
            .then(Commands.literal('market')
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof openMarketGUI === 'function') return openMarketGUI(p) ? 1 : 0
                    sendMsg(p, 'Bourse', 'Bourse indisponible.', '§c')
                    return 0
                })
            )
            // /onu contract
            .then(Commands.literal('contract')
                .then(Commands.literal('deliver')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof deliverOnuContract === 'function') return deliverOnuContract(p)
                        return 0
                    })
                )
                .then(Commands.literal('deposit')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof depositWeeklyContract === 'function') return depositWeeklyContract(p, null)
                        return 0
                    })
                )
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof showCurrentOnuContract === 'function') showCurrentOnuContract(p)
                    if (typeof showWeeklyContractStatus === 'function') showWeeklyContractStatus(p)
                    return 1
                })
            )
            .then(Commands.literal('contracts')
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof showCurrentOnuContract === 'function') showCurrentOnuContract(p)
                    if (typeof showWeeklyContractStatus === 'function') showWeeklyContractStatus(p)
                    return 1
                })
            )
            // /onu regular & /onu objectif (Appel d'offres régulier 3h uniquement)
            .then(Commands.literal('regular')
                .then(Commands.literal('deliver')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof deliverOnuContract === 'function') return deliverOnuContract(p)
                        return 0
                    })
                )
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof showCurrentOnuContract === 'function') return showCurrentOnuContract(p)
                    return 0
                })
            )
            .then(Commands.literal('weekly')
                .then(Commands.literal('deliver')
                    .then(Commands.argument('quantite', IntegerArgumentType.integer(1, 100000))
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof depositWeeklyContract === 'function') {
                                return depositWeeklyContract(p, IntegerArgumentType.getInteger(ctx, 'quantite'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof depositWeeklyContract === 'function') return depositWeeklyContract(p, null)
                        return 0
                    })
                )
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof showWeeklyContractStatus === 'function') return showWeeklyContractStatus(p)
                    return 1
                })
            )
            // /onu tp
            .then(Commands.literal('tp').executes(function(ctx) {
                var p = getPlayer(ctx)
                if (!p) return 0
                if (typeof teleportPlayerToOnu === 'function') return teleportPlayerToOnu(p)
                return 0
            }))
            // /onu admin ...
            .then(Commands.literal('admin')
                .requires(function(source) { return source.hasPermission(2) })
                .then(Commands.literal('rebalance').executes(function(ctx) {
                    if (typeof rebalanceMarketStocks === 'function') {
                        var ch = rebalanceMarketStocks(ctx.source.server, false)
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Bourse', 'Rééquilibrage exécuté (' + ch + ' articles).', '§a')
                    }
                    return 1
                }))
                .then(Commands.literal('toggle').executes(function(ctx) {
                    if (typeof toggleOnuPublicTeleport === 'function') return toggleOnuPublicTeleport(ctx.source)
                    return 1
                }))
                .then(Commands.literal('reload').executes(function(ctx) {
                    if (typeof TW_LoadAllConfigs === 'function') {
                        TW_LoadAllConfigs()
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'ONU', 'Toutes les configurations (general, market, contracts, taxes) ont été rechargées.', '§a')
                    }
                    return 1
                }))
            )
            // /onu (sans argument) -> Menu d'aide ONU
            .executes(function(ctx) {
                var p = getPlayer(ctx)
                if (!p) return 0
                sendMsg(p, 'ONU', 'Commandes du Hub International :', '§6')
                sendMsg(p, '•', '§e/onu market §7: Ouvrir la Bourse automatisée (AMM)', '§e')
                sendMsg(p, '•', '§e/onu contract §7: Voir les contrats d\'approvisionnement', '§e')
                sendMsg(p, '•', '§e/onu tp §7: Téléportation vers l\'Ambassade de l\'ONU', '§e')
                return 1
            })
    )

    // Alias Bourse / Marché autonomes
    event.register(
        Commands.literal('market').executes(function(ctx) {
            var p = getPlayer(ctx)
            if (!p) return 0
            if (typeof openMarketGUI === 'function') return openMarketGUI(p) ? 1 : 0
            return 0
        })
    )

    // =========================================================================
    // 4. COMMANDE PRINCIPALE : /ally (avec alias /alliance, /alliances)
    // =========================================================================
    var registerAllyBranch = function(literalName) {
        event.register(
            Commands.literal(literalName)
                // /ally list
                .then(Commands.literal('list')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof listAlliances === 'function') return listAlliances(p)
                        sendMsg(p, 'Alliance', 'Module alliance_engine indisponible.', '§c')
                        return 0
                    })
                )
                // /ally add <cible> / /ally invite <cible>
                .then(Commands.literal('add')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof requestAlliance === 'function') {
                                return requestAlliance(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Aide', 'Usage : §e/ally add <nom_nation>', '§7')
                        return 0
                    })
                )
                .then(Commands.literal('invite')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof requestAlliance === 'function') {
                                return requestAlliance(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Aide', 'Usage : §e/ally invite <nom_nation>', '§7')
                        return 0
                    })
                )
                // /ally accept [cible]
                .then(Commands.literal('accept')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof acceptAlliance === 'function') {
                                return acceptAlliance(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof acceptAlliance === 'function') return acceptAlliance(p, null)
                        return 0
                    })
                )
                // /ally decline [cible]
                .then(Commands.literal('decline')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof declineAlliance === 'function') {
                                return declineAlliance(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof declineAlliance === 'function') return declineAlliance(p, null)
                        return 0
                    })
                )
                // /ally break <cible>
                .then(Commands.literal('break')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            var targetName = StringArgumentType.getString(ctx, 'cible')
                            var team = getPlayerNationTeam(p)
                            if (!team || !isTeamOfficerOrOwner(team, p)) {
                                sendMsg(p, 'Alliance', 'Seul le Leader ou un Ministre peut rompre une alliance.', '§c')
                                return 0
                            }
                            var tgt = findTeamByNameOrPlayer(p.server, targetName)
                            if (!tgt) {
                                sendMsg(p, 'Alliance', 'Nation introuvable : "' + targetName + '".', '§c')
                                return 0
                            }
                            if (typeof breakAlliance === 'function' && breakAlliance(p.server, team.getId(), tgt.getId(), 'voluntary')) {
                                broadcastMsg(p.server, 'Diplomatie', 'Le pacte d\'alliance entre §6' + team.getName().getString() + ' §fet §6' + tgt.getName().getString() + ' §fa été dissous.', '§c')
                                return 1
                            } else {
                                sendMsg(p, 'Alliance', 'Votre nation n\'est pas alliée à ' + tgt.getName().getString() + '.', '§c')
                                return 0
                            }
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Aide', 'Usage : §e/ally break <nom_nation>', '§7')
                        return 0
                    })
                )
                // /ally home <cible>
                .then(Commands.literal('home')
                    .then(Commands.argument('cible', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            if (typeof teleportToAllyHome === 'function') {
                                return teleportToAllyHome(p, StringArgumentType.getString(ctx, 'cible'))
                            }
                            return 0
                        })
                    )
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (p) sendMsg(p, 'Aide', 'Usage : §e/ally home <nom_nation>', '§7')
                        return 0
                    })
                )
                // /ally sethome
                .then(Commands.literal('sethome')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof setNationAllyHome === 'function') return setNationAllyHome(null, p)
                        return 0
                    })
                )
                // /ally delhome
                .then(Commands.literal('delhome')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof deleteNationAllyHome === 'function') return deleteNationAllyHome(null, p)
                        return 0
                    })
                )
                // /ally cta [accept|decline] <nation>
                .then(Commands.literal('cta')
                    .then(Commands.literal('accept')
                        .then(Commands.argument('nation', StringArgumentType.greedyString())
                            .executes(function(ctx) {
                                var p = getPlayer(ctx)
                                if (!p) return 0
                                if (typeof handleCallToArmsResponse === 'function') {
                                    return handleCallToArmsResponse(p, StringArgumentType.getString(ctx, 'nation'), true) ? 1 : 0
                                }
                                return 0
                            })
                        )
                    )
                    .then(Commands.literal('decline')
                        .then(Commands.argument('nation', StringArgumentType.greedyString())
                            .executes(function(ctx) {
                                var p = getPlayer(ctx)
                                if (!p) return 0
                                if (typeof handleCallToArmsResponse === 'function') {
                                    return handleCallToArmsResponse(p, StringArgumentType.getString(ctx, 'nation'), false) ? 1 : 0
                                }
                                return 0
                            })
                        )
                    )
                )
                // /ally <cible> (smart command)
                .then(Commands.argument('cible', StringArgumentType.greedyString())
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        if (typeof handleSmartAllyCommand === 'function') {
                            return handleSmartAllyCommand(p, StringArgumentType.getString(ctx, 'cible'))
                        }
                        return 0
                    })
                )
                // /ally (sans argument) -> Liste des alliances
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof listAlliances === 'function') return listAlliances(p)
                    return 0
                })
        )
    }

    registerAllyBranch('ally')

    // =========================================================================
    // 5. CHAT RAPIDE DE NATION : /n, /nc
    // =========================================================================
    event.register(
        Commands.literal('n')
            .then(Commands.argument('message', StringArgumentType.greedyString())
                .executes(function(ctx) {
                    var p = getPlayer(ctx)
                    if (!p) return 0
                    if (typeof sendNationChatMessage === 'function') {
                        return sendNationChatMessage(p, StringArgumentType.getString(ctx, 'message')) ? 1 : 0
                    }
                    return 0
                })
            )
            .executes(function(ctx) {
                var p = getPlayer(ctx)
                if (p) sendMsg(p, 'Chat', 'Usage : §e/n <votre message privé de nation>', '§7')
                return 0
            })
    )

    event.register(
        Commands.literal('nc')
            .executes(function(ctx) {
                var p = getPlayer(ctx)
                if (!p) return 0
                if (typeof togglePlayerChatMode === 'function') {
                    togglePlayerChatMode(p)
                    return 1
                }
                return 0
            })
    )

    // =========================================================================
    // 6. ADMINISTRATION MILITAIRE : /waradmin
    // =========================================================================
    event.register(
        Commands.literal('waradmin')
            .requires(function(source) { return source.hasPermission(2) })
            // /waradmin sanctuary ...
            .then(Commands.literal('sanctuary')
                .then(Commands.literal('list')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (typeof listSanctuaryChunks === 'function') return listSanctuaryChunks(ctx.source.server, p)
                        return 1
                    })
                )
                .then(Commands.literal('add')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        var cx = Math.floor(p.x) >> 4
                        var cz = Math.floor(p.z) >> 4
                        var dim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld'
                        if (typeof addSanctuaryChunk === 'function') return addSanctuaryChunk(ctx.source.server, p, dim, cx, cz, '')
                        return 1
                    })
                    .then(Commands.argument('label', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = getPlayer(ctx)
                            if (!p) return 0
                            var cx = Math.floor(p.x) >> 4
                            var cz = Math.floor(p.z) >> 4
                            var dim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld'
                            var lbl = StringArgumentType.getString(ctx, 'label')
                            if (typeof addSanctuaryChunk === 'function') return addSanctuaryChunk(ctx.source.server, p, dim, cx, cz, lbl)
                            return 1
                        })
                    )
                )
                .then(Commands.literal('remove')
                    .executes(function(ctx) {
                        var p = getPlayer(ctx)
                        if (!p) return 0
                        var cx = Math.floor(p.x) >> 4
                        var cz = Math.floor(p.z) >> 4
                        var dim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld'
                        if (typeof removeSanctuaryChunk === 'function') return removeSanctuaryChunk(ctx.source.server, p, dim, cx, cz)
                        return 1
                    })
                )
            )
            // /waradmin forceend <id>
            .then(Commands.literal('forceend')
                .then(Commands.argument('id', StringArgumentType.string())
                    .executes(function(ctx) {
                        var warId = StringArgumentType.getString(ctx, 'id')
                        var s = ctx.source.server
                        var p = ctx.source.player
                        if (typeof forceStopWar === 'function') return forceStopWar(s, p, warId)
                        return 0
                    })
                )
            )
            // /waradmin raidhours force <on|off|auto>
            .then(Commands.literal('raidhours')
                .then(Commands.literal('on').executes(function(ctx) {
                    if (typeof setForcedRaidHoursState === 'function') setForcedRaidHoursState(true, ctx.source.server)
                    broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été ACTIVÉES par le Staff !', '§c')
                    return 1
                }))
                .then(Commands.literal('off').executes(function(ctx) {
                    if (typeof setForcedRaidHoursState === 'function') setForcedRaidHoursState(false, ctx.source.server)
                    broadcastMsg(ctx.source.server, 'Raid Hours', 'Les Raid Hours ont été DÉSACTIVÉES par le Staff.', '§a')
                    return 1
                }))
                .then(Commands.literal('auto').executes(function(ctx) {
                    if (typeof setForcedRaidHoursState === 'function') setForcedRaidHoursState(null, ctx.source.server)
                    var p = getPlayer(ctx)
                    if (p) sendMsg(p, 'Raid Hours', 'Mode automatique rétabli.', '§a')
                    return 1
                }))
            )
    )

    console.info('[UnifiedCommands] Routeur Brigadier centralisé enregistré avec succès.')
})
