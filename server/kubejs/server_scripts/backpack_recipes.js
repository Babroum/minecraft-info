// priority: 50
// =============================================================================
// Third World Server Script - Équilibrage Sophisticated Backpacks & Synergie Create
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

ServerEvents.recipes(event => {

    // -------------------------------------------------------------------------
    // 1. SUPPRESSION DES RECETTES TROP PUISSANTES (PRÉSERVATION DU RÔLE DES TRAINS)
    // -------------------------------------------------------------------------
    const recipesToRemove = [
        // Retrait des sacs surdimensionnés (les trains restent rois pour le fret)
        'sophisticatedbackpacks:diamond_backpack',
        'sophisticatedbackpacks:netherite_backpack',

        // Retrait du cuivre pour une progression claire : Andésite -> Fer -> Laiton
        'sophisticatedbackpacks:copper_backpack',
        'sophisticatedbackpacks:iron_backpack_from_copper',

        // Retrait des Stack Upgrades abusives (Tier 3 x8, Tier 4 x16, Omega x32)
        'sophisticatedbackpacks:stack_upgrade_tier_3',
        'sophisticatedbackpacks:stack_upgrade_tier_4',
        'sophisticatedbackpacks:stack_upgrade_omega_tier',
        'sophisticatedbackpacks:stack_upgrade_tier_1_to_tier_3_conversion',
        'sophisticatedbackpacks:stack_upgrade_tier_1_to_tier_4_conversion',
        'sophisticatedbackpacks:stack_upgrade_tier_2_to_tier_3_conversion',
        'sophisticatedbackpacks:stack_upgrade_tier_2_to_tier_4_conversion',
        'sophisticatedbackpacks:stack_upgrade_tier_3_to_tier_4_conversion',
        'sophisticatedbackpacks:stack_upgrade_starter_tier_to_tier_3_conversion',
        'sophisticatedbackpacks:stack_upgrade_starter_tier_to_tier_4_conversion',

        // Retrait de l'Inception Upgrade (sacs dans les sacs -> crash NBT & stockage infini)
        'sophisticatedbackpacks:inception_upgrade',

        // Remplacement des crafts vanille originaux
        'sophisticatedbackpacks:backpack',
        'sophisticatedbackpacks:iron_backpack',
        'sophisticatedbackpacks:gold_backpack',
        'sophisticatedbackpacks:upgrade_base',
        'sophisticatedbackpacks:stack_upgrade_tier_1',
        'sophisticatedbackpacks:stack_upgrade_tier_1_from_starter',
        'sophisticatedbackpacks:stack_upgrade_tier_2',
        'sophisticatedbackpacks:stack_upgrade_tier_1_to_tier_2_conversion',
        'sophisticatedbackpacks:restock_upgrade',
        'sophisticatedbackpacks:tool_swapper_upgrade'
    ]

    recipesToRemove.forEach(id => {
        event.remove({ id: id })
    })

    // -------------------------------------------------------------------------
    // 2. UPGRADE BASE (Le socle d'amélioration lié à l'Alliage d'Andésite)
    // -------------------------------------------------------------------------
    event.custom({
        type: 'minecraft:crafting_shaped',
        category: 'misc',
        key: {
            S: { tag: 'c:strings' },
            A: { item: 'create:andesite_alloy' },
            L: { tag: 'c:leathers' }
        },
        pattern: [
            ' S ',
            'ALA',
            ' S '
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:upgrade_base'
        }
    })

    // -------------------------------------------------------------------------
    // 3. RECETTES DES SACS PROGRESSIFS CREATE (Préservation NBT & Custom Serializers)
    // -------------------------------------------------------------------------

    // A. Sac de Chantier (Tier Cuir - 27 slots / 1 coffre)
    // 4 Cuirs + 2 Alliages d'Andésite + 1 Coffre + 2 Ficelles
    event.custom({
        type: 'sophisticatedbackpacks:basic_backpack',
        category: 'misc',
        key: {
            S: { tag: 'c:strings' },
            L: { tag: 'c:leathers' },
            A: { item: 'create:andesite_alloy' },
            C: { tag: 'c:chests/wooden' }
        },
        pattern: [
            'SLS',
            'ACA',
            'LLL'
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:backpack'
        }
    })

    // B. Sac du Contremaître (Tier Fer - 54 slots / 1 double-coffre)
    // 4 Plaques de fer + 2 Boîtiers Andésite + 1 Engrenage + Sac précédent
    event.custom({
        type: 'sophisticatedbackpacks:backpack_upgrade',
        category: 'misc',
        key: {
            B: { item: 'sophisticatedbackpacks:backpack' },
            P: { item: 'create:iron_sheet' },
            C: { item: 'create:andesite_casing' },
            G: { item: 'create:cogwheel' }
        },
        pattern: [
            'PGP',
            'CBC',
            'PPP'
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:iron_backpack'
        }
    })

    // C. Sac Ferroviaire & Grandes Lignes (Tier Laiton/Or - 81 slots / 3 coffres)
    // 4 Plaques Laiton + 2 Mécanismes de Précision + 2 Boîtiers Laiton + Sac Fer
    event.custom({
        type: 'sophisticatedbackpacks:backpack_upgrade',
        category: 'misc',
        key: {
            B: { item: 'sophisticatedbackpacks:iron_backpack' },
            P: { item: 'create:brass_sheet' },
            M: { item: 'create:precision_mechanism' },
            C: { item: 'create:brass_casing' }
        },
        pattern: [
            'PMP',
            'CBC',
            'PMP'
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:gold_backpack'
        }
    })

    // -------------------------------------------------------------------------
    // 4. STACK UPGRADES ÉQUILIBRÉES (Tier 1 & Tier 2 autorisés pour la construction)
    // -------------------------------------------------------------------------

    // Stack Upgrade Tier 1 (x2 -> stacks de 128 pour blocs/rails)
    event.custom({
        type: 'minecraft:crafting_shaped',
        category: 'misc',
        key: {
            B: { item: 'sophisticatedbackpacks:upgrade_base' },
            P: { item: 'create:iron_sheet' },
            G: { item: 'create:cogwheel' }
        },
        pattern: [
            ' P ',
            'PBP',
            ' G '
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:stack_upgrade_tier_1'
        }
    })

    // Stack Upgrade Tier 2 (x4 -> stacks de 256)
    event.custom({
        type: 'minecraft:crafting_shaped',
        category: 'misc',
        key: {
            B: { item: 'sophisticatedbackpacks:stack_upgrade_tier_1' },
            P: { item: 'create:brass_sheet' },
            M: { item: 'create:precision_mechanism' }
        },
        pattern: [
            ' P ',
            'MBM',
            ' P '
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:stack_upgrade_tier_2'
        }
    })

    // -------------------------------------------------------------------------
    // 5. UPGRADES DE CONFORT CHANTIER (Restock & Tool Swapper)
    // -------------------------------------------------------------------------

    // Restock Upgrade (remplit automatiquement la main pour poser voies ferrées & blocs)
    event.custom({
        type: 'minecraft:crafting_shaped',
        category: 'misc',
        key: {
            B: { item: 'sophisticatedbackpacks:upgrade_base' },
            C: { tag: 'c:chests/wooden' },
            P: { item: 'create:andesite_casing' },
            R: { tag: 'c:dusts/redstone' }
        },
        pattern: [
            ' P ',
            'CBC',
            ' R '
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:restock_upgrade'
        }
    })

    // Tool Swapper Upgrade (sélection dynamique de l'outil avec la clé Create)
    event.custom({
        type: 'minecraft:crafting_shaped',
        category: 'misc',
        key: {
            B: { item: 'sophisticatedbackpacks:upgrade_base' },
            W: { item: 'create:wrench' },
            I: { item: 'create:iron_sheet' },
            L: { tag: 'c:leathers' }
        },
        pattern: [
            ' W ',
            'IBI',
            ' L '
        ],
        result: {
            count: 1,
            id: 'sophisticatedbackpacks:tool_swapper_upgrade'
        }
    })

})
