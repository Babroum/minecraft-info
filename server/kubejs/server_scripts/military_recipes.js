// priority: 50
// =============================================================================
// NationGlory Server Script - Verrouillage Industriel et Militaire
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

ServerEvents.recipes(event => {
    // -------------------------------------------------------------------------
    // 1. Suppression des recettes militaires basiques (Ballistix & Big Cannons)
    // -------------------------------------------------------------------------

    // Suppression des recettes de base des missiles et ogives Ballistix
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

    ballistixToRemove.forEach(recipeId => {
        event.remove({ id: recipeId })
    })

    // Suppression des obus lourds et culasses de Create Big Cannons
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

    bigCannonsToRemove.forEach(recipeId => {
        event.remove({ id: recipeId })
    })

    // -------------------------------------------------------------------------
    // 2. Interdiction des machines de minage intensif (Protection Anti-Lag)
    // -------------------------------------------------------------------------

    // Suppression du Digital Miner (Mekanism) et de la foreuse mécanique (Create)
    event.remove({ output: 'mekanism:digital_miner' })
    event.remove({ output: 'create:mechanical_drill' })

    // -------------------------------------------------------------------------
    // 2b. Désactivation de l'ancienne monnaie Lightman's Currency (Pièces/Coins)
    // -------------------------------------------------------------------------
    event.remove({ output: /lightmanscurrency:coin_/ })
    event.remove({ output: /lightmanscurrency:coinpile_/ })
    event.remove({ output: /lightmanscurrency:coinblock_/ })

    // -------------------------------------------------------------------------
    // 2c. Suppression des crafts basiques de Point Blank (Imprimante & Armes majeures)
    // -------------------------------------------------------------------------
    event.remove({ id: 'pointblank:printer' })
    event.remove({ id: 'pointblank:ak47' })
    event.remove({ id: 'pointblank:m4a1' })
    event.remove({ id: 'pointblank:hk416' })
    event.remove({ id: 'pointblank:gm6lynx' })
    event.remove({ id: 'pointblank:m134minigun' })
    event.remove({ id: 'pointblank:m249' })
    event.remove({ id: 'pointblank:at4' })
    event.remove({ id: 'pointblank:javelin' })

    // -------------------------------------------------------------------------
    // 3. Réingénierie : Missiles Stratégiques Ballistix
    // -------------------------------------------------------------------------

    // Missile Tier 1 (Tactique courte portée)
    // Exige précision Create + électronique de base Mekanism
    event.shaped('ballistix:missiletier1', [
        ' P ',
        'ACA',
        'SGS'
    ], {
        P: 'create:precision_mechanism',
        A: 'mekanism:alloy_infused',
        C: 'mekanism:basic_control_circuit',
        S: 'mekanism:ingot_steel',
        G: 'minecraft:gunpowder'
    })

    // Missile Tier 2 (Portée intermédiaire)
    // Intègre le premier niveau d'enrichissement militaire
    event.shaped('ballistix:missiletier2', [
        ' U ',
        'RMR',
        'ECE'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        R: 'mekanism:alloy_reinforced',
        M: 'ballistix:missiletier1',
        C: 'mekanism:advanced_control_circuit',
        E: 'create:electron_tube'
    })

    // Missile Tier 3 (Intercontinental ICBM)
    // Complexe militaro-industriel complet
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

    // -------------------------------------------------------------------------
    // 3. Réingénierie : Ogives de Destruction Massive Ballistix
    // -------------------------------------------------------------------------

    // Ogive Nucléaire (Enrichissement militaire massif)
    event.shaped('ballistix:nuclear', [
        'ACA',
        'UXU',
        'ACA'
    ], {
        A: 'mekanism:alloy_reinforced',
        C: 'mekanism:elite_control_circuit',
        U: 'kubejs:lingot_uranium_militaire',
        X: 'mekanism:steel_casing'
    })

    // Ogive Antimatière (Ultime technologie géopolitique)
    event.shaped('ballistix:antimatter', [
        'ACA',
        'UXU',
        'ACA'
    ], {
        A: 'mekanism:alloy_atomic',
        C: 'mekanism:ultimate_control_circuit',
        U: 'kubejs:lingot_uranium_militaire',
        X: 'minecraft:nether_star'
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

    // -------------------------------------------------------------------------
    // 4. Réingénierie : Artillerie Lourde Create Big Cannons
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // 5. Réingénierie : Imprimante 3D et Armes Point Blank Industrielles
    // -------------------------------------------------------------------------

    // Imprimante 3D Militaire (Nécessite châssis Mekanism + déployeur Create)
    event.shaped('pointblank:printer', [
        'CMC',
        'PDP',
        'SAS'
    ], {
        C: 'mekanism:advanced_control_circuit',
        M: 'create:precision_mechanism',
        P: 'pointblank:gunmetal_ingot',
        D: 'create:deployer',
        S: 'mekanism:ingot_steel',
        A: 'mekanism:steel_casing'
    })

    // AK-47 Réingéniéré (Industrie lourde fiable)
    event.shaped('pointblank:ak47', [
        '  M',
        'SPS',
        'W S'
    ], {
        S: 'mekanism:ingot_steel',
        P: 'create:precision_mechanism',
        M: 'pointblank:gunmetal_ingot',
        W: 'minecraft:oak_planks'
    })

    // M4A1 Réingéniéré (Technologie occidentale de précision)
    event.shaped('pointblank:m4a1', [
        '  M',
        'CPC',
        'S P'
    ], {
        S: 'mekanism:ingot_steel',
        P: 'create:precision_mechanism',
        C: 'mekanism:basic_control_circuit',
        M: 'pointblank:gunmetal_ingot'
    })

    // HK416 Réingéniéré (Haute fiabilité)
    event.shaped('pointblank:hk416', [
        '  M',
        'APA',
        'S C'
    ], {
        S: 'mekanism:ingot_steel',
        A: 'mekanism:alloy_infused',
        P: 'create:precision_mechanism',
        C: 'mekanism:advanced_control_circuit',
        M: 'pointblank:gunmetal_ingot'
    })

    // GM6 Lynx (.50 BMG Sniper Anti-Matériel Lourd)
    event.shaped('pointblank:gm6lynx', [
        ' UA',
        'CPC',
        'S S'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_reinforced',
        C: 'mekanism:advanced_control_circuit',
        P: 'create:precision_mechanism',
        S: 'mekanism:ingot_steel'
    })

    // M134 Minigun (Gatling d'appui à saturation)
    event.shaped('pointblank:m134minigun', [
        ' S ',
        'CPC',
        'SMS'
    ], {
        S: 'mekanism:ingot_steel',
        P: 'create:precision_mechanism',
        C: 'mekanism:elite_control_circuit',
        M: 'pointblank:gunmetal_ingot'
    })

    // -------------------------------------------------------------------------
    // 6. Usinage Industriel des Munitions Point Blank
    // -------------------------------------------------------------------------

    // 9mm (Pistolets & SMG légers) - 16 cartouches
    event.shaped('16x pointblank:ammo9mm', [
        ' L ',
        ' P ',
        ' B '
    ], {
        L: 'mekanism:ingot_lead',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // .45 ACP - 16 cartouches
    event.shaped('16x pointblank:ammo45acp', [
        ' L ',
        ' P ',
        ' S '
    ], {
        L: 'mekanism:ingot_lead',
        P: 'minecraft:gunpowder',
        S: 'mekanism:ingot_steel'
    })

    // 5.56x45mm (Fusils d'assaut standard : M4, HK416, AUG...) - 16 cartouches
    event.shaped('16x pointblank:ammo556', [
        ' N ',
        ' P ',
        ' B '
    ], {
        N: 'mekanism:nugget_steel',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // 7.62x39mm (Fusils d'assaut lourds : AK-47...) - 16 cartouches
    event.shaped('16x pointblank:ammo762', [
        ' S ',
        ' P ',
        ' B '
    ], {
        S: 'mekanism:ingot_steel',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // 7.62x51mm NATO (Fusils de combat lourd : SCAR, G3, M14...) - 12 cartouches
    event.shaped('12x pointblank:ammo762x51', [
        ' S ',
        'APA',
        ' B '
    ], {
        S: 'mekanism:ingot_steel',
        A: 'mekanism:alloy_infused',
        P: 'minecraft:gunpowder',
        B: 'create:brass_sheet'
    })

    // .338 Lapua Magnum (Snipers de haute précision) - 8 cartouches
    event.shaped('8x pointblank:ammo338lapua', [
        ' S ',
        'RPR',
        ' S '
    ], {
        S: 'mekanism:ingot_steel',
        R: 'mekanism:alloy_reinforced',
        P: 'minecraft:gunpowder'
    })

    // .50 BMG (Munition perforante anti-matériel avec noyau en Uranium Militaire !) - 4 cartouches
    event.shaped('4x pointblank:ammo50bmg', [
        ' U ',
        'APA',
        ' S '
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_atomic',
        P: 'minecraft:gunpowder',
        S: 'mekanism:ingot_steel'
    })

    // 12 Gauge (Fusils à pompe : M870, SPAS12...) - 12 cartouches
    event.shaped('12x pointblank:ammo12gauge', [
        ' S ',
        ' P ',
        ' C '
    ], {
        S: 'mekanism:nugget_lead',
        P: 'minecraft:gunpowder',
        C: 'minecraft:copper_ingot'
    })

    // -------------------------------------------------------------------------
    // 7. Chaîne de Raffinage Lourd : Lingot d'Uranium Militaire
    // -------------------------------------------------------------------------

    // Assemblage séquentiel lourd Create :
    // Support : Plaque / Lingot d'Acier Mekanism
    // Étape 1 : Déploiement de Yellow Cake Uranium (enrichi depuis l'uranium brut Mekanism)
    // Étape 2 : Déploiement d'Alliage Atomique Mekanism
    // Étape 3 : Pressage mécanique lourd
    // 3 boucles complètes requises (consommation industrielle massive)
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

    // -------------------------------------------------------------------------
    // 8. Plaques de Blindage et Armures Supérieures au Diamant
    // -------------------------------------------------------------------------

    // Plaque Composite Balistique (Kevlar/Cuir traité + Acier trempé pressé)
    event.shaped('kubejs:plaque_composite_balistique', [
        'SIS',
        'LAL',
        'SIS'
    ], {
        S: 'mekanism:ingot_steel',
        I: 'minecraft:iron_ingot',
        L: 'minecraft:leather',
        A: 'mekanism:alloy_infused'
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

    // --- Set 1 : Armure Tactique Composite (Supérieure au Diamant : Armure 24, Toughness 14) ---
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

    // --- Set 2 : Exo-Armure Juggernaut en Uranium Blindé (Ultime : Armure 30, Toughness 20, KB 80%) ---
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
