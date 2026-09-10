// priority: 40
// =============================================================================
// Third World Server Script - Recettes Alternatives du Nether et de l'End
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

ServerEvents.recipes(function(event) {

    // -------------------------------------------------------------------------
    // 0. Protection des Modèles de Forge (Smithing Templates) & Élytres
    // -------------------------------------------------------------------------
    // Les smithing templates ne sont PAS craftables (Réservés à la boutique ONU)
    event.remove({ output: 'minecraft:netherite_upgrade_smithing_template' })
    event.remove({ id: 'minecraft:netherite_upgrade_smithing_template' })

    // Les élytres sont totalement désactivées
    event.remove({ output: 'minecraft:elytra' })
    event.remove({ id: 'minecraft:elytra' })


    // =========================================================================
    // SECTION 1 : RESSOURCES DU NETHER
    // =========================================================================

    // -------------------------------------------------------------------------
    // 1.1 Chaîne Industrielle : Débris Antiques (Netherite à la chaîne)
    // -------------------------------------------------------------------------
    // Assemblage séquentiel lourd Create :
    // Support : Obsidienne
    // Étape 1 : Déploiement d'un Diamant
    // Étape 2 : Déploiement d'un Lingot d'Or
    // Étape 3 : Déploiement d'un Alliage Infusé Mekanism
    // Étape 4 : Pressage mécanique lourd
    // Étape 5 : Déploiement d'une Obsidienne Pleureuse
    // Étape 6 : Pressage mécanique lourd
    // Exige 3 cycles complets pour synthétiser 1 Débris Antique.
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: 'minecraft:obsidian' },
        transitional_item: { id: 'minecraft:obsidian' },
        sequence: [
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'minecraft:obsidian' },
                    { item: 'minecraft:diamond' }
                ],
                results: [{ id: 'minecraft:obsidian' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'minecraft:obsidian' },
                    { item: 'minecraft:gold_ingot' }
                ],
                results: [{ id: 'minecraft:obsidian' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'minecraft:obsidian' },
                    { item: 'mekanism:alloy_infused' }
                ],
                results: [{ id: 'minecraft:obsidian' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'minecraft:obsidian' }],
                results: [{ id: 'minecraft:obsidian' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'minecraft:obsidian' },
                    { item: 'minecraft:crying_obsidian' }
                ],
                results: [{ id: 'minecraft:obsidian' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'minecraft:obsidian' }],
                results: [{ id: 'minecraft:obsidian' }]
            }
        ],
        results: [{ id: 'minecraft:ancient_debris', count: 1 }],
        loops: 3
    })

    // Alternative métallurgique Mekanism (Combiner)
    event.custom({
        type: 'mekanism:combining',
        main_input: { count: 8, item: 'minecraft:obsidian' },
        extra_input: { count: 1, item: 'minecraft:diamond_block' },
        output: { id: 'minecraft:ancient_debris', count: 1 }
    })


    // -------------------------------------------------------------------------
    // 1.2 Bâton de Blaze & Brûleur Create (Blaze Burner)
    // -------------------------------------------------------------------------
    // Bâton de Blaze : Compactage thermique sous pression Create
    event.custom({
        type: 'create:compacting',
        ingredients: [
            { item: 'minecraft:iron_ingot' },
            { item: 'minecraft:gunpowder', count: 2 },
            { type: 'neoforge:single', amount: 250, fluid: 'minecraft:lava' }
        ],
        results: [{ id: 'minecraft:blaze_rod', count: 1 }],
        heat_requirement: 'heated'
    })

    // Bâton de Blaze : Recette d'appoint manuelle
    event.shaped('minecraft:blaze_rod', [
        ' G ',
        ' M ',
        ' I '
    ], {
        G: 'minecraft:gunpowder',
        M: 'minecraft:magma_block',
        I: 'minecraft:iron_ingot'
    })

    // Brûleur de Blaze actif (Create) : Craft direct
    event.shaped('create:blaze_burner', [
        ' P ',
        'PBP',
        'SMS'
    ], {
        P: 'create:iron_sheet',
        B: 'create:empty_blaze_burner',
        S: 'minecraft:blaze_powder',
        M: 'minecraft:magma_block'
    })

    // Broyage Create de Bâton de Blaze
    event.custom({
        type: 'create:crushing',
        ingredients: [{ item: 'minecraft:blaze_rod' }],
        results: [
            { id: 'minecraft:blaze_powder', count: 3 },
            { id: 'minecraft:blaze_powder', count: 1, chance: 0.5 },
            { id: 'minecraft:gunpowder', count: 1, chance: 0.25 }
        ]
    })


    // -------------------------------------------------------------------------
    // 1.3 Terres des Âmes, Netherrack & Basalte
    // -------------------------------------------------------------------------
    // Sable des Âmes (Kickstart)
    event.shaped('4x minecraft:soul_sand', [
        'SRS',
        'RBR',
        'SRS'
    ], {
        S: 'minecraft:sand',
        R: 'minecraft:rotten_flesh',
        B: 'minecraft:bone_meal'
    })

    // Terre des Âmes (Kickstart)
    event.shaped('4x minecraft:soul_soil', [
        'DRD',
        'RBR',
        'DRD'
    ], {
        D: 'minecraft:dirt',
        R: 'minecraft:rotten_flesh',
        B: 'minecraft:bone_meal'
    })

    // Netherrack
    event.shaped('4x minecraft:netherrack', [
        'CRC',
        'RMR',
        'CRC'
    ], {
        C: 'minecraft:cobblestone',
        R: 'minecraft:red_dye',
        M: 'minecraft:magma_cream'
    })

    // Blackstone & Basalte
    event.shaped('4x minecraft:blackstone', [
        'CC',
        'BB'
    ], {
        C: 'minecraft:cobblestone',
        B: 'minecraft:coal'
    })

    event.shaped('4x minecraft:basalt', [
        'CC',
        'SS'
    ], {
        C: 'minecraft:cobblestone',
        S: 'minecraft:soul_soil'
    })


    // -------------------------------------------------------------------------
    // 1.4 Verrue du Nether & Alchimie
    // -------------------------------------------------------------------------
    // Synthèse initiale de Verrue du Nether (se reproduit ensuite sur Soul Sand)
    event.shaped('2x minecraft:nether_wart', [
        ' P ',
        'ESE',
        ' F '
    ], {
        P: 'minecraft:red_dye',
        E: 'minecraft:fermented_spider_eye',
        S: 'minecraft:wheat_seeds',
        F: 'minecraft:rotten_flesh'
    })

    // Larme de Ghast
    event.shaped('minecraft:ghast_tear', [
        ' M ',
        'SGS',
        ' S '
    ], {
        M: 'minecraft:phantom_membrane',
        S: 'minecraft:sugar',
        G: 'minecraft:glistering_melon_slice'
    })

    // Crâne de Wither Squelette (Ingénierie militaire lourde)
    event.shaped('minecraft:wither_skeleton_skull', [
        'CCC',
        'BSB',
        'SMS'
    ], {
        C: 'minecraft:coal_block',
        B: 'minecraft:blaze_powder',
        S: 'minecraft:soul_sand',
        M: 'minecraft:skeleton_skull'
    })

    // Obsidienne Pleureuse
    event.shaped('minecraft:crying_obsidian', [
        ' L ',
        'LOL',
        ' G '
    ], {
        L: 'minecraft:lapis_lazuli',
        O: 'minecraft:obsidian',
        G: 'minecraft:glowstone_dust'
    })


    // -------------------------------------------------------------------------
    // 1.5 Quartz & Glowstone
    // -------------------------------------------------------------------------
    // Quartz : Broyage Mekanism de Diorite
    event.custom({
        type: 'mekanism:crushing',
        input: { count: 1, item: 'minecraft:diorite' },
        output: { count: 2, id: 'minecraft:quartz' }
    })

    // Quartz : Craft d'atelier
    event.shaped('2x minecraft:quartz', [
        ' D ',
        'DSD',
        ' D '
    ], {
        D: 'minecraft:diorite',
        S: 'minecraft:sand'
    })

    // Glowstone : Brassage thermique Create
    event.custom({
        type: 'create:mixing',
        ingredients: [
            { item: 'minecraft:redstone', count: 2 },
            { item: 'minecraft:gold_nugget', count: 2 },
            { item: 'minecraft:yellow_dye', count: 1 }
        ],
        results: [{ id: 'minecraft:glowstone_dust', count: 2 }],
        heat_requirement: 'heated'
    })

    // Glowstone : Craft d'appoint
    event.shaped('2x minecraft:glowstone_dust', [
        ' R ',
        'NYN',
        ' R '
    ], {
        R: 'minecraft:redstone',
        N: 'minecraft:gold_nugget',
        Y: 'minecraft:yellow_dye'
    })


    // -------------------------------------------------------------------------
    // 1.6 Végétation & Champignons du Nether
    // -------------------------------------------------------------------------
    event.shapeless('minecraft:crimson_fungus', ['minecraft:red_mushroom', 'minecraft:nether_wart'])
    event.shapeless('minecraft:warped_fungus', ['minecraft:brown_mushroom', 'minecraft:nether_wart', 'minecraft:lapis_lazuli'])
    event.shapeless('minecraft:crimson_nylium', ['minecraft:netherrack', 'minecraft:crimson_fungus'])
    event.shapeless('minecraft:warped_nylium', ['minecraft:netherrack', 'minecraft:warped_fungus'])
    event.shapeless('2x minecraft:weeping_vines', ['minecraft:vine', 'minecraft:crimson_fungus'])
    event.shapeless('2x minecraft:twisting_vines', ['minecraft:vine', 'minecraft:warped_fungus'])


    // =========================================================================
    // SECTION 2 : RESSOURCES DE L'END
    // =========================================================================

    // -------------------------------------------------------------------------
    // 2.1 Coquilles de Shulker (Automatisation Create & Craft Manuel)
    // -------------------------------------------------------------------------
    // Assemblage séquentiel Create :
    // Support : Cuir
    // Étape 1 : Déploiement d'Éclat d'Améthyste
    // Étape 2 : Déploiement d'une Perle de l'End
    // Étape 3 : Déploiement d'un Fruit de Chorus Éclaté
    // Étape 4 : Pressage mécanique
    // 2 boucles complètes.
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: 'minecraft:leather' },
        transitional_item: { id: 'minecraft:leather' },
        sequence: [
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'minecraft:leather' },
                    { item: 'minecraft:amethyst_shard' }
                ],
                results: [{ id: 'minecraft:leather' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'minecraft:leather' },
                    { item: 'minecraft:ender_pearl' }
                ],
                results: [{ id: 'minecraft:leather' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'minecraft:leather' },
                    { item: 'minecraft:popped_chorus_fruit' }
                ],
                results: [{ id: 'minecraft:leather' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'minecraft:leather' }],
                results: [{ id: 'minecraft:leather' }]
            }
        ],
        results: [{ id: 'minecraft:shulker_shell', count: 1 }],
        loops: 2
    })

    // Coquille de Shulker : Craft manuel
    event.shaped('2x minecraft:shulker_shell', [
        'AAA',
        'PEP',
        'LLL'
    ], {
        A: 'minecraft:amethyst_shard',
        P: 'minecraft:popped_chorus_fruit',
        E: 'minecraft:ender_pearl',
        L: 'minecraft:leather'
    })


    // -------------------------------------------------------------------------
    // 2.2 Botanique de l'End (Chorus Fruit & Flower)
    // -------------------------------------------------------------------------
    // Fruit de Chorus (se cuit ensuite au four pour donner le Popped Chorus Fruit)
    event.shaped('4x minecraft:chorus_fruit', [
        ' A ',
        'PEP',
        ' A '
    ], {
        A: 'minecraft:amethyst_shard',
        P: 'minecraft:sweet_berries',
        E: 'minecraft:ender_pearl'
    })

    // Fleur de Chorus (pour planter et cultiver le chorus sur End Stone)
    event.shaped('minecraft:chorus_flower', [
        'CCC',
        'CSC',
        'CCC'
    ], {
        C: 'minecraft:chorus_fruit',
        S: 'minecraft:oak_sapling'
    })


    // -------------------------------------------------------------------------
    // 2.3 Matériaux de l'End (End Stone & End Rod)
    // -------------------------------------------------------------------------
    // Pierre de l'End (Create Mixing)
    event.custom({
        type: 'create:mixing',
        ingredients: [
            { item: 'minecraft:sandstone', count: 2 },
            { item: 'minecraft:ender_pearl', count: 1 },
            { type: 'neoforge:single', amount: 250, fluid: 'minecraft:lava' }
        ],
        results: [{ id: 'minecraft:end_stone', count: 4 }]
    })

    // Pierre de l'End (Craft d'atelier)
    event.shaped('4x minecraft:end_stone', [
        'SGS',
        'GEG',
        'SGS'
    ], {
        S: 'minecraft:sandstone',
        G: 'minecraft:glowstone_dust',
        E: 'minecraft:ender_pearl'
    })


    // -------------------------------------------------------------------------
    // 2.4 Souffle de Dragon & Trophée de l'Œuf de Dragon
    // -------------------------------------------------------------------------
    // Souffle de Dragon (Brassage thermique Create)
    event.custom({
        type: 'create:mixing',
        ingredients: [
            { item: 'minecraft:glass_bottle' },
            { item: 'minecraft:ender_pearl' },
            { item: 'minecraft:blaze_powder' },
            { item: 'minecraft:ghast_tear' }
        ],
        results: [{ id: 'minecraft:dragon_breath', count: 1 }],
        heat_requirement: 'heated'
    })

    // Souffle de Dragon (Craft d'atelier)
    event.shaped('minecraft:dragon_breath', [
        ' T ',
        'EBE',
        ' P '
    ], {
        T: 'minecraft:ghast_tear',
        E: 'minecraft:ender_pearl',
        B: 'minecraft:glass_bottle',
        P: 'minecraft:blaze_powder'
    })

    // Œuf de Dragon (Trophée géopolitique et industriel suprême)
    event.shaped('minecraft:dragon_egg', [
        'OCO',
        'ENE',
        'OUO'
    ], {
        O: 'minecraft:crying_obsidian',
        C: 'minecraft:end_crystal',
        N: 'minecraft:nether_star',
        E: 'minecraft:netherite_block',
        U: 'kubejs:lingot_uranium_militaire'
    })
})
