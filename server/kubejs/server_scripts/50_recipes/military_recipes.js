// priority: 50
// =============================================================================
// Third World Server Script - Verrouillage Industriel, Militaire et Équilibrage
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

ServerEvents.recipes(event => {

    // =========================================================================
    // 1. SUPPRESSION DES RECETTES MILITAIRES BASIQUES (BALLISTIX & BIG CANNONS)
    // =========================================================================

    const ballistixToRemove = [
        'ballistix:missile_tier1_electro',
        'ballistix:missile_tier1_noelectro',
        'ballistix:missile_tier2_electro',
        'ballistix:missile_tier2_noelectro',
        'ballistix:missile_tier3_electro',
        'ballistix:missile_tier3_noelectro',
        'ballistix:explosive_nuclear_electro',
        'ballistix:explosive_nuclear_noelectro',
        'ballistix:explosive_antimatter_electro',
        'ballistix:explosive_antimatter_noelectro',
        'ballistix:explosive_antimatterlarge_electro',
        'ballistix:explosive_antimatterlarge_noelectro',
        'ballistix:explosive_darkmatter_electro',
        'ballistix:explosive_darkmatter_noelectro',
        'ballistix:explosive_thermobaric',
        'ballistix:explosive_hypersonic',
        'ballistix:explosive_emp_electro',
        'ballistix:explosive_emp_noelectro'
    ]
    ballistixToRemove.forEach(recipeId => event.remove({ id: recipeId }))

    const bigCannonsToRemove = [
        'createbigcannons:he_shell',
        'createbigcannons:shrapnel_shell',
        'createbigcannons:drop_mortar_shell',
        'createbigcannons:fluid_shell',
        'createbigcannons:solid_shot',
        'createbigcannons:steel_screw_lock',
        'createbigcannons:steel_sliding_breechblock',
        'createbigcannons:nethersteel_screw_lock'
    ]
    bigCannonsToRemove.forEach(recipeId => event.remove({ id: recipeId }))


    // =========================================================================
    // 2. SUPPRESSION DES ITEMS SURPUISSANTS / CHEATÉS & MINAGE INTENSIF
    // =========================================================================

    // 2a. Minage intensif anti-lag
    event.remove({ output: 'mekanism:digital_miner' })
    event.remove({ output: 'create:mechanical_drill' })

    // 2b. Équipements "Godmode" & Outils abusifs Mekanism (Suppression totale)
    event.remove({ output: 'mekanism:atomic_disassembler' })
    event.remove({ output: 'mekanism:meka_tool' })
    event.remove({ output: 'mekanism:mekasuit_helmet' })
    event.remove({ output: 'mekanism:mekasuit_bodyarmor' })
    event.remove({ output: 'mekanism:mekasuit_pants' })
    event.remove({ output: 'mekanism:mekasuit_boots' })
    event.remove({ output: 'mekanism:free_runners' })
    event.remove({ output: 'mekanism:free_runners_armored' })

    // 2c. Jetpacks Mekanism (Interdiction de vol pour forcer véhicules et trains)
    event.remove({ output: 'mekanism:jetpack' })
    event.remove({ output: 'mekanism:jetpack_armored' })

    // 2d. Désactivation de l'ancienne monnaie Lightman's Currency (Pièces/Coins)
    event.remove({ output: /lightmanscurrency:coin_/ })
    event.remove({ output: /lightmanscurrency:coinpile_/ })
    event.remove({ output: /lightmanscurrency:coinblock_/ })

    // 2e. Suppression des crafts de base bon marché de Point Blank
    event.remove({ id: 'pointblank:printer' })
    event.remove({ id: 'pointblank:gunmetal_mesh' })
    event.remove({ output: 'pointblank:gunmetal_mesh' })
    event.remove({ id: 'pointblank:gunmetal_ingot_from_blasting_gunmetal_mesh' })
    event.remove({ id: 'pointblank:gunmetal_ingot_from_smelting_gunmetal_mesh' })
    event.remove({ id: 'pointblank:guninternals' })
    event.remove({ output: 'pointblank:guninternals' })
    event.remove({ id: 'pointblank:ak47' })
    event.remove({ id: 'pointblank:m4a1' })
    event.remove({ id: 'pointblank:hk416' })
    event.remove({ id: 'pointblank:gm6lynx' })
    event.remove({ id: 'pointblank:m134minigun' })
    event.remove({ id: 'pointblank:m249' })
    event.remove({ id: 'pointblank:at4' })
    event.remove({ id: 'pointblank:javelin' })


    // =========================================================================
    // 3. MATIÈRES PREMIÈRES MILITAIRES POINT BLANK (GUNMETAL & INTERNALS)
    // =========================================================================

    // Lingot de Gunmetal : Véritable alliage industriel lourd (Acier + Laiton + Poudre)
    event.shaped('pointblank:gunmetal_ingot', [
        ' S ',
        ' P ',
        ' B '
    ], {
        S: 'mekanism:ingot_steel',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // Alternative compacteur Create chauffé pour Gunmetal
    event.custom({
        type: 'create:compacting',
        ingredients: [
            { item: 'mekanism:ingot_steel' },
            { item: 'create:brass_ingot' },
            { item: 'minecraft:gunpowder', count: 2 }
        ],
        results: [{ id: 'pointblank:gunmetal_ingot', count: 1 }],
        heat_requirement: 'heated'
    })

    // Pièces internes d'armes (Guninternals) : Usinage séquentiel de haute précision Create
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: 'pointblank:gunmetal_ingot' },
        transitional_item: { id: 'pointblank:gunmetal_ingot' },
        sequence: [
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'pointblank:gunmetal_ingot' },
                    { item: 'create:precision_mechanism' }
                ],
                results: [{ id: 'pointblank:gunmetal_ingot' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'pointblank:gunmetal_ingot' },
                    { item: 'mekanism:alloy_infused' }
                ],
                results: [{ id: 'pointblank:gunmetal_ingot' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'pointblank:gunmetal_ingot' }],
                results: [{ id: 'pointblank:gunmetal_ingot' }]
            }
        ],
        results: [{ id: 'pointblank:guninternals', count: 1 }],
        loops: 2
    })

    // Craft d'appoint pour Guninternals
    event.shaped('pointblank:guninternals', [
        ' G ',
        'MPM',
        ' G '
    ], {
        G: 'pointblank:gunmetal_ingot',
        M: 'mekanism:alloy_infused',
        P: 'create:precision_mechanism'
    })


    // =========================================================================
    // 4. RÉINGÉNIERIE : IMPRIMANTE 3D ET RECETTES DE L'IMPRIMANTE POINT BLANK
    // =========================================================================

    // Imprimante 3D Militaire (Station CNC lourde - Nécessite investissement industriel majeur)
    event.shaped('pointblank:printer', [
        'EME',
        'CDC',
        'SAS'
    ], {
        E: 'mekanism:elite_control_circuit',
        M: 'create:precision_mechanism',
        C: 'kubejs:plaque_composite_balistique',
        D: 'create:deployer',
        S: 'pointblank:gunmetal_ingot',
        A: 'mekanism:steel_casing'
    })

    // Configuration directe des recettes dans l'interface de l'Imprimante 3D Point Blank
    const printerGuns = [
        // --- 1. SNIPERS LOURDS ANTI-MATÉRIEL & TIREURS D'ÉLITE (.50 BMG) ---
        {
            id: 'pointblank:gm6lynx',
            ingredients: [
                { count: 2, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'kubejs:plaque_composite_balistique' },
                { count: 1, item: 'mekanism:elite_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 25, item: 'pointblank:gunmetal_ingot' },
                { count: 8, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:ballista',
            ingredients: [
                { count: 2, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'kubejs:plaque_composite_balistique' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 20, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:c14',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'mekanism:alloy_reinforced' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 20, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:l96a1',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'kubejs:plaque_composite_balistique' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 18, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:wa2000',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 20, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },

        // --- 2. MITRAILLEUSES LOURDES & GATLINGS ---
        {
            id: 'pointblank:m134minigun',
            ingredients: [
                { count: 4, item: 'kubejs:lingot_uranium_militaire' },
                { count: 4, item: 'kubejs:plaque_composite_balistique' },
                { count: 2, item: 'mekanism:elite_control_circuit' },
                { count: 4, item: 'create:precision_mechanism' },
                { count: 1, item: 'create:rotation_speed_controller' },
                { count: 35, item: 'pointblank:gunmetal_ingot' },
                { count: 12, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:m249',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'kubejs:plaque_composite_balistique' },
                { count: 1, item: 'mekanism:elite_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 25, item: 'pointblank:gunmetal_ingot' },
                { count: 8, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:mk48',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'kubejs:plaque_composite_balistique' },
                { count: 1, item: 'mekanism:elite_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 28, item: 'pointblank:gunmetal_ingot' },
                { count: 8, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:lamg',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'kubejs:plaque_composite_balistique' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 25, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },

        // --- 3. LANCE-ROQUETTES, CANONS & MISSILES GUIDÉS ---
        {
            id: 'pointblank:javelin',
            ingredients: [
                { count: 2, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'ballistix:missiletier2' },
                { count: 2, item: 'mekanism:elite_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 25, item: 'pointblank:gunmetal_ingot' },
                { count: 8, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:at4',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'ballistix:missiletier1' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 20, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:smaw',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'ballistix:missiletier1' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 20, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:m32mgl',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'kubejs:plaque_composite_balistique' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 25, item: 'pointblank:gunmetal_ingot' },
                { count: 8, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:at4_rocket',
            ingredients: [
                { count: 1, item: 'ballistix:thermobaric' },
                { count: 4, item: 'pointblank:gunmetal_ingot' },
                { count: 2, item: 'minecraft:gunpowder' }
            ]
        },
        {
            id: 'pointblank:javelin_rocket',
            ingredients: [
                { count: 1, item: 'ballistix:missiletier1' },
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'mekanism:advanced_control_circuit' }
            ]
        },
        {
            id: 'pointblank:smaw_rocket',
            ingredients: [
                { count: 2, item: 'minecraft:tnt' },
                { count: 4, item: 'pointblank:gunmetal_ingot' },
                { count: 2, item: 'mekanism:ingot_steel' }
            ]
        },

        // --- 4. FUSILS AUTOMATIQUES LOURDS, SHOTGUNS & ARMES SPÉCIALES ---
        {
            id: 'pointblank:aa12',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'kubejs:plaque_composite_balistique' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 30, item: 'pointblank:gunmetal_ingot' },
                { count: 8, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:xm29',
            ingredients: [
                { count: 2, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'mekanism:elite_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 28, item: 'pointblank:gunmetal_ingot' },
                { count: 8, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:vector',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 2, item: 'mekanism:alloy_infused' },
                { count: 1, item: 'create:precision_mechanism' },
                { count: 20, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:xm7',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'mekanism:alloy_reinforced' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 22, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:spear',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'mekanism:alloy_reinforced' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 22, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },
        {
            id: 'pointblank:spearblack',
            ingredients: [
                { count: 1, item: 'kubejs:lingot_uranium_militaire' },
                { count: 1, item: 'mekanism:alloy_reinforced' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 22, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' }
            ]
        },

        // --- 5. FUSILS D'ASSAUT POPULAIRES (AK47, M4A1, HK416, SCAR-L) ---
        {
            id: 'pointblank:ak47',
            ingredients: [
                { count: 18, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' },
                { count: 1, item: 'create:precision_mechanism' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 6, item: 'mekanism:ingot_steel' },
                { count: 4, item: 'minecraft:oak_planks' }
            ]
        },
        {
            id: 'pointblank:m4a1',
            ingredients: [
                { count: 20, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' },
                { count: 1, item: 'create:precision_mechanism' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'mekanism:alloy_infused' },
                { count: 4, item: 'mekanism:ingot_steel' }
            ]
        },
        {
            id: 'pointblank:hk416',
            ingredients: [
                { count: 22, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'mekanism:alloy_reinforced' }
            ]
        },
        {
            id: 'pointblank:scarl',
            ingredients: [
                { count: 22, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'mekanism:alloy_reinforced' }
            ]
        },
        {
            id: 'pointblank:scarl_iss',
            ingredients: [
                { count: 22, item: 'pointblank:gunmetal_ingot' },
                { count: 6, item: 'pointblank:guninternals' },
                { count: 2, item: 'create:precision_mechanism' },
                { count: 1, item: 'mekanism:advanced_control_circuit' },
                { count: 2, item: 'mekanism:alloy_reinforced' }
            ]
        }
    ]

    printerGuns.forEach(g => {
        event.remove({ id: g.id })
        event.custom({
            type: 'pointblank:default',
            ingredients: g.ingredients,
            result: {
                item: g.id
            }
        })
    })


    // =========================================================================
    // 5. USINAGE DES MUNITIONS POINT BLANK (RENDEMENTS RÉDUITS & COÛT EN PLOMB)
    // =========================================================================

    // 9mm (Pistolets & SMG légers) - 8 cartouches
    event.shaped('8x pointblank:ammo9mm', [
        ' L ',
        ' P ',
        ' B '
    ], {
        L: 'mekanism:ingot_lead',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // .45 ACP - 8 cartouches
    event.shaped('8x pointblank:ammo45acp', [
        ' L ',
        ' P ',
        ' S '
    ], {
        L: 'mekanism:ingot_lead',
        P: 'minecraft:gunpowder',
        S: 'mekanism:ingot_steel'
    })

    // 5.56x45mm (Fusils d'assaut standard : M4, HK416, AUG...) - 8 cartouches
    event.shaped('8x pointblank:ammo556', [
        ' N ',
        ' P ',
        ' B '
    ], {
        N: 'mekanism:ingot_lead',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // 7.62x39mm (Fusils d'assaut lourds : AK-47...) - 8 cartouches
    event.shaped('8x pointblank:ammo762', [
        ' L ',
        ' P ',
        ' S '
    ], {
        L: 'mekanism:ingot_lead',
        P: 'minecraft:gunpowder',
        S: 'mekanism:ingot_steel'
    })

    // 7.62x51mm NATO (Fusils de combat lourd : SCAR, G3, M14...) - 6 cartouches
    event.shaped('6x pointblank:ammo762x51', [
        ' L ',
        'APA',
        ' B '
    ], {
        L: 'mekanism:ingot_lead',
        A: 'mekanism:alloy_infused',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // .338 Lapua Magnum (Snipers de précision) - 4 cartouches
    event.shaped('4x pointblank:ammo338lapua', [
        ' L ',
        'RPR',
        ' S '
    ], {
        L: 'mekanism:ingot_lead',
        R: 'mekanism:alloy_reinforced',
        P: 'minecraft:gunpowder',
        S: 'mekanism:ingot_steel'
    })

    // .50 BMG (Munition perforante anti-matériel lourd) - 2 cartouches
    event.shaped('2x pointblank:ammo50bmg', [
        ' U ',
        'APA',
        ' S '
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_atomic',
        P: 'minecraft:gunpowder',
        S: 'mekanism:ingot_steel'
    })

    // 12 Gauge (Fusils à pompe) - 6 cartouches
    event.shaped('6x pointblank:ammo12gauge', [
        ' L ',
        ' P ',
        ' C '
    ], {
        L: 'mekanism:ingot_lead',
        P: 'minecraft:gunpowder',
        C: 'minecraft:copper_ingot'
    })


    // =========================================================================
    // 6. RÉINGÉNIERIE : MISSILES STRATÉGIQUES & OGIVES BALLISTIX
    // =========================================================================

    // Missile Tier 1 (Tactique courte portée - Exige réservoir de propulsion)
    event.shaped('ballistix:missiletier1', [
        ' P ',
        'ACA',
        'STS'
    ], {
        P: 'create:precision_mechanism',
        A: 'mekanism:alloy_infused',
        C: 'mekanism:basic_control_circuit',
        S: 'mekanism:ingot_steel',
        T: 'create:fluid_tank'
    })

    // Missile Tier 2 (Portée intermédiaire - Enrichissement atomique)
    event.shaped('ballistix:missiletier2', [
        ' U ',
        'RMR',
        'TCT'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        R: 'mekanism:alloy_reinforced',
        M: 'ballistix:missiletier1',
        T: 'create:fluid_tank',
        C: 'mekanism:advanced_control_circuit'
    })

    // Missile Tier 3 (Intercontinental ICBM - Haute technologie géopolitique)
    event.shaped('ballistix:missiletier3', [
        ' U ',
        'AMA',
        'CPC'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_atomic',
        M: 'ballistix:missiletier2',
        C: 'mekanism:elite_control_circuit',
        P: 'create:precision_mechanism'
    })

    // Ogive Nucléaire (Arme de dissuasion massive - Coût atomique réel : 6 lingots d'uranium militaire)
    event.shaped('ballistix:nuclear', [
        'UUU',
        'AXA',
        'UCU'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_reinforced',
        X: 'mekanism:steel_casing',
        C: 'mekanism:elite_control_circuit'
    })

    // Ogive Antimatière (Ultime technologie géopolitique - 6 lingots d'uranium + Étoile du Nether)
    event.shaped('ballistix:antimatter', [
        'UUU',
        'AXA',
        'UCU'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_atomic',
        X: 'minecraft:nether_star',
        C: 'mekanism:ultimate_control_circuit'
    })

    // Ogive Thermobarique (Pression mécanique Create + circuits avancés)
    event.shaped('ballistix:thermobaric', [
        ' P ',
        'CFC',
        'APA'
    ], {
        P: 'create:precision_mechanism',
        C: 'mekanism:advanced_control_circuit',
        F: 'minecraft:tnt',
        A: 'mekanism:alloy_reinforced'
    })

    // Ogive IEM / EMP (Brouillage électronique Mekanism)
    event.shaped('ballistix:emp', [
        ' C ',
        'RXR',
        ' C '
    ], {
        C: 'mekanism:advanced_control_circuit',
        R: 'create:electron_tube',
        X: 'mekanism:steel_casing'
    })


    // =========================================================================
    // 7. ARTILLERIE LOURDE CREATE BIG CANNONS
    // =========================================================================

    // Obus Explosif Lourd (HE Shell - Haute performance)
    event.shaped('createbigcannons:he_shell', [
        ' P ',
        'AUA',
        ' S '
    ], {
        P: 'create:precision_mechanism',
        A: 'mekanism:alloy_infused',
        U: 'kubejs:lingot_uranium_militaire',
        S: 'createbigcannons:solid_shot'
    })

    // Obus Perforant Blindé (Solid Shot Militaire)
    event.shaped('createbigcannons:solid_shot', [
        ' S ',
        'SUS',
        ' S '
    ], {
        S: 'mekanism:ingot_steel',
        U: 'kubejs:lingot_uranium_militaire'
    })

    // Obus Shrapnel Avancé
    event.shaped('createbigcannons:shrapnel_shell', [
        ' P ',
        'ASA',
        ' T '
    ], {
        P: 'create:precision_mechanism',
        A: 'createbigcannons:shot_balls',
        S: 'mekanism:steel_casing',
        T: 'minecraft:tnt'
    })

    // Culasses de précision en acier pour canons lourds
    event.shaped('createbigcannons:steel_screw_lock', [
        ' S ',
        'MPM',
        ' S '
    ], {
        S: 'mekanism:ingot_steel',
        M: 'mekanism:alloy_reinforced',
        P: 'create:precision_mechanism'
    })

    event.shaped('createbigcannons:steel_sliding_breechblock', [
        'SMS',
        ' P ',
        'SMS'
    ], {
        S: 'mekanism:ingot_steel',
        M: 'mekanism:alloy_reinforced',
        P: 'create:precision_mechanism'
    })


    // =========================================================================
    // 8. CHAÎNE DE RAFFINAGE LOURD : LINGOT D'URANIUM MILITAIRE
    // =========================================================================

    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: 'mekanism:ingot_steel' },
        transitional_item: { id: 'mekanism:ingot_steel' },
        sequence: [
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'mekanism:ingot_steel' },
                    { item: 'mekanism:yellow_cake_uranium' }
                ],
                results: [{ id: 'mekanism:ingot_steel' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'mekanism:ingot_steel' },
                    { item: 'mekanism:alloy_atomic' }
                ],
                results: [{ id: 'mekanism:ingot_steel' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'mekanism:ingot_steel' }],
                results: [{ id: 'mekanism:ingot_steel' }]
            }
        ],
        results: [{ id: 'kubejs:lingot_uranium_militaire', count: 1 }],
        loops: 3
    })


    // =========================================================================
    // 9. PLAQUES DE BLINDAGE ET ARMURES
    // =========================================================================

    // Plaque Composite Balistique : Assemblage séquentiel Create (Acier + Cuir + Alliage Renforcé + Gunmetal)
    event.custom({
        type: 'create:sequenced_assembly',
        ingredient: { item: 'mekanism:ingot_steel' },
        transitional_item: { id: 'mekanism:ingot_steel' },
        sequence: [
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'mekanism:ingot_steel' },
                    { item: 'minecraft:leather' }
                ],
                results: [{ id: 'mekanism:ingot_steel' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'mekanism:ingot_steel' },
                    { item: 'mekanism:alloy_reinforced' }
                ],
                results: [{ id: 'mekanism:ingot_steel' }]
            },
            {
                type: 'create:deploying',
                ingredients: [
                    { item: 'mekanism:ingot_steel' },
                    { item: 'pointblank:gunmetal_ingot' }
                ],
                results: [{ id: 'mekanism:ingot_steel' }]
            },
            {
                type: 'create:pressing',
                ingredients: [{ item: 'mekanism:ingot_steel' }],
                results: [{ id: 'mekanism:ingot_steel' }]
            }
        ],
        results: [{ id: 'kubejs:plaque_composite_balistique', count: 1 }],
        loops: 2
    })

    // Craft d'appoint pour Plaque Composite Balistique
    event.shaped('kubejs:plaque_composite_balistique', [
        'SGS',
        'LAL',
        'SGS'
    ], {
        S: 'mekanism:ingot_steel',
        G: 'pointblank:gunmetal_ingot',
        L: 'minecraft:leather',
        A: 'mekanism:alloy_reinforced'
    })

    // Plaque d'Uranium Blindé (Uranium militaire + Acier + Alliage atomique)
    event.shaped('kubejs:plaque_uranium_blinde', [
        'SUS',
        'UAU',
        'SUS'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_atomic',
        S: 'mekanism:ingot_steel'
    })

    // --- Set 1 : Armure Tactique Composite (Armure 24, Toughness 14) ---
    event.shaped('kubejs:composite_helmet', [
        'PPP',
        'P P'
    ], {
        P: 'kubejs:plaque_composite_balistique'
    })

    event.shaped('kubejs:composite_chestplate', [
        'P P',
        'PPP',
        'PPP'
    ], {
        P: 'kubejs:plaque_composite_balistique'
    })

    event.shaped('kubejs:composite_leggings', [
        'PPP',
        'P P',
        'P P'
    ], {
        P: 'kubejs:plaque_composite_balistique'
    })

    event.shaped('kubejs:composite_boots', [
        'P P',
        'P P'
    ], {
        P: 'kubejs:plaque_composite_balistique'
    })

    // --- Set 2 : Exo-Armure Juggernaut en Uranium Blindé (Armure 30, Toughness 20, KB 80%) ---
    event.shaped('kubejs:uranium_juggernaut_helmet', [
        'UPU',
        'UHU',
        ' M '
    ], {
        U: 'kubejs:plaque_uranium_blinde',
        P: 'create:precision_mechanism',
        H: 'kubejs:composite_helmet',
        M: 'mekanism:alloy_atomic'
    })

    event.shaped('kubejs:uranium_juggernaut_chestplate', [
        'UPU',
        'UCU',
        'UMU'
    ], {
        U: 'kubejs:plaque_uranium_blinde',
        P: 'create:precision_mechanism',
        C: 'kubejs:composite_chestplate',
        M: 'mekanism:alloy_atomic'
    })

    event.shaped('kubejs:uranium_juggernaut_leggings', [
        'UPU',
        'ULU',
        'U U'
    ], {
        U: 'kubejs:plaque_uranium_blinde',
        P: 'create:precision_mechanism',
        L: 'kubejs:composite_leggings'
    })

    event.shaped('kubejs:uranium_juggernaut_boots', [
        'U U',
        'UBU',
        ' P '
    ], {
        U: 'kubejs:plaque_uranium_blinde',
        B: 'kubejs:composite_boots',
        P: 'create:precision_mechanism'
    })
})
