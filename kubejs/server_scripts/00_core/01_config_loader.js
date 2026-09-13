// priority: 105
// =============================================================================
// Third World Server Script - Core 01 : Chargeur Universel de Configurations
// =============================================================================

var TW_CONFIG = {
    general: null,
    market: null,
    contracts: null,
    taxes: null
}

function TW_ReadRawJson(filePath) {
    try {
        if (typeof JsonIO !== 'undefined' && JsonIO.readJson) {
            var el = JsonIO.readJson(filePath)
            if (el && !el.isJsonNull()) {
                var raw = String(el.toString())
                if (raw && raw.trim() !== '' && raw !== 'null') {
                    return JSON.parse(raw)
                }
            }
        }
    } catch (e) {
        console.error('[TW_Config] Erreur lecture fichier ' + filePath + ' : ' + e)
    }
    return null
}

function TW_LoadAllConfigs() {
    console.info('[TW_Config] Chargement des configurations du serveur Third World...')

    // 1. Configuration Générale
    var gen = TW_ReadRawJson('kubejs/config/general.json')
    if (!gen) {
        console.warn('[TW_Config] general.json introuvable, utilisation des valeurs de secours.')
        gen = {
            server: { name: 'Third World' },
            onu: {
                team_uuid: 'cb440140-1d45-4eff-9b10-2bab3d457d63',
                hub: { dim: 'minecraft:overworld', x: -204, y: 76, z: -172, interaction_radius: 50, restricted_radius: 200 },
                teleport: { public_enabled: false, dim: 'minecraft:overworld', x: -204.5, y: 76.0, z: -172.5, yaw: 0.0, pitch: 0.0 }
            },
            military: {
                war_cost: 2500,
                conflict_cost: 250,
                conflict_warmup_ms: 300000,
                conflict_duration_ms: 3600000,
                raid_hours: { start: 18, end: 22, enabled: true }
            },
            currency: {
                notes: {
                    'kubejs:billet_1': 1,
                    'kubejs:billet_5': 5,
                    'kubejs:billet_20': 20,
                    'kubejs:billet_100': 100
                }
            }
        }
    }
    TW_CONFIG.general = gen

    // 2. Catalogue du Marché Mondial AMM
    var mkt = TW_ReadRawJson('kubejs/config/market_catalog.json')
    if (!mkt) {
        mkt = { market_settings: { rebalance_interval_ticks: 36000, spread_percent: 30, rebalance_rate: 0.15, max_distance: 200 }, catalog: [] }
    }
    TW_CONFIG.market = mkt

    // 3. Contrats ONU
    var ctc = TW_ReadRawJson('kubejs/config/onu_contracts.json')
    if (!ctc) {
        ctc = { regular: { cooldownMinutes: 180, interactionRadius: 50, pool: [] }, weekly: { pool: [] } }
    }
    TW_CONFIG.contracts = ctc

    // 4. Taxes Territoriales
    var tx = TW_ReadRawJson('kubejs/config/taxes.json')
    if (!tx) {
        tx = { playtime_cycle_minutes: 60, grace_playtime_minutes: 120, unclaim_percent_on_debt: 0.15, min_chunks_exempt: 4 }
    }
    TW_CONFIG.taxes = tx

    console.info('[TW_Config] Configurations Third World chargées avec succès.')
}

// Chargement immédiat lors du bootstrap KubeJS
TW_LoadAllConfigs()
