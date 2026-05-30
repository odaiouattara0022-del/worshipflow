/**
 * Script complet — TOUS les chants connus des 12 artistes.
 * Run: node scripts/add-songs-complete.js
 */

const BASE = "http://localhost:3000";

const songs = [
  // ============================================================
  //  APÔTRE MOHAMMED SANOGO
  // ============================================================
  {
    title: "Ça va changer",
    author: "Mohammed Sanogo",
    defaultKey: "Mi",
    tempo: 120,
    tags: "louange,combat spirituel",
    lyrics: `Ça va changer, ça va changer
Ça va changer au nom de Jésus

Toute situation va changer
Au nom de Jésus

Ma vie va changer
Ma famille va changer
Mon travail va changer
Au nom de Jésus

Ça va changer, ça va changer
Par la puissance du Saint-Esprit
Ça va changer

Il n'y a rien d'impossible
À celui qui croit
Ça va changer au nom de Jésus`
  },
  {
    title: "Mon bouclier",
    author: "Mohammed Sanogo",
    defaultKey: "Ré",
    tempo: 80,
    tags: "adoration,protection",
    lyrics: `Mon bouclier c'est Toi Seigneur
Mon refuge c'est Toi Seigneur

Tu es ma forteresse
Tu es ma délivrance

Mon bouclier c'est Toi Seigneur

Quand l'ennemi viendra
Comme un fleuve débordé
L'Esprit de l'Éternel
Le mettra en fuite

Mon bouclier c'est Toi
Ma force c'est Toi
Mon rocher c'est Toi Seigneur`
  },
  {
    title: "Dieu est au contrôle",
    author: "Mohammed Sanogo",
    defaultKey: "Sol",
    tempo: 75,
    tags: "adoration,confiance",
    lyrics: `Dieu est au contrôle
Dieu est au contrôle

Il est le Maître de l'univers
Rien ne Lui échappe

Dieu est au contrôle
De toutes choses
Il est au contrôle
De ma vie

Je me confie en Toi
Car Tu es fidèle
Dieu est au contrôle
De toutes choses

Même quand je ne comprends pas
Même quand tout semble perdu
Dieu est au contrôle`
  },
  {
    title: "Je suis vainqueur",
    author: "Mohammed Sanogo",
    defaultKey: "La",
    tempo: 130,
    tags: "louange,victoire",
    lyrics: `Je suis vainqueur
Plus que vainqueur
Par Celui qui m'a aimé

Je suis vainqueur
En Jésus-Christ
Je suis vainqueur

Aucune arme forgée contre moi
Ne prospérera
Car je suis vainqueur

Je suis la tête et non la queue
Je suis en haut et non en bas
Car je suis vainqueur

Par le sang de Jésus
Je suis vainqueur`
  },
  {
    title: "Merci Seigneur pour Ta grâce",
    author: "Mohammed Sanogo",
    defaultKey: "Do",
    tempo: 72,
    tags: "adoration,gratitude",
    lyrics: `Merci Seigneur pour Ta grâce
Merci Seigneur pour Ton amour

Ta grâce me suffit
Ta grâce me relève
Ta grâce me fortifie

Merci Seigneur pour Ta grâce

Sans Toi je ne suis rien
Sans Toi je ne peux rien
Mais par Ta grâce
Je suis ce que je suis

Merci Seigneur
Merci Seigneur pour Ta grâce`
  },
  {
    title: "Le sang de Jésus",
    author: "Mohammed Sanogo",
    defaultKey: "Fa",
    tempo: 90,
    tags: "louange,combat spirituel",
    lyrics: `Le sang de Jésus est puissant
Le sang de Jésus est victorieux

Il y a la puissance
Dans le sang de l'Agneau

Le sang de Jésus
Couvre ma vie
Couvre ma famille
Couvre ma maison

Le sang de Jésus est puissant
Rien ne peut résister
Au sang de Jésus

Le sang de l'Agneau
Nous donne la victoire`
  },
  {
    title: "L'Éternel est mon berger",
    author: "Mohammed Sanogo",
    defaultKey: "Ré",
    tempo: 68,
    tags: "adoration,psaume",
    lyrics: `L'Éternel est mon berger
Je ne manquerai de rien

Il me fait reposer
Dans de verts pâturages
Il me dirige
Près des eaux paisibles

L'Éternel est mon berger

Quand je marche
Dans la vallée de l'ombre de la mort
Je ne crains aucun mal
Car Tu es avec moi

Ta houlette et Ton bâton
Me rassurent

L'Éternel est mon berger
Je ne manquerai de rien`
  },
  {
    title: "Saint est le Seigneur",
    author: "Mohammed Sanogo",
    defaultKey: "Mi",
    tempo: 70,
    tags: "adoration,sainteté",
    lyrics: `Saint est le Seigneur
Saint est le Seigneur
Le Dieu Tout-Puissant

Qui était, qui est
Et qui vient

Saint, Saint, Saint
Est le Seigneur

Toute la terre est remplie
De Sa gloire

Saint est le Seigneur
Le Dieu Tout-Puissant

Les cieux et la terre
Proclament Ta sainteté

Saint, Saint, Saint
Est le Seigneur`
  },
  {
    title: "Ton nom est puissant",
    author: "Mohammed Sanogo",
    defaultKey: "Sol",
    tempo: 110,
    tags: "louange,déclaration",
    lyrics: `Ton nom est puissant
Ton nom est puissant
Le nom de Jésus est puissant

Au-dessus de tout nom
Au-dessus de toute principauté
Ton nom est puissant

Tout genou fléchira
Toute langue confessera
Que Jésus-Christ est Seigneur

Ton nom est puissant
Le nom de Jésus
Ton nom est puissant`
  },
  {
    title: "Il est le Roi des rois",
    author: "Mohammed Sanogo",
    defaultKey: "La",
    tempo: 95,
    tags: "louange,royauté",
    lyrics: `Il est le Roi des rois
Il est le Seigneur des seigneurs

Son nom est au-dessus
De tout autre nom

Il est le Roi des rois
Il est le Seigneur des seigneurs

Prosternons-nous devant Lui
Adorons-Le
Car Il est digne

Il est le Roi des rois
Le Lion de Juda
Le Rejeton de David

Il est le Roi des rois`
  },

  // ============================================================
  //  DEREK JONES
  // ============================================================
  {
    title: "We Worship You",
    author: "Derek Jones",
    defaultKey: "G",
    tempo: 72,
    tags: "worship,adoration",
    lyrics: `We worship You
We worship You
Lord we worship You

You are holy
You are worthy
You are faithful
You are mighty

We worship You
We worship You

With all of our hearts
With all of our minds
With all of our strength
We worship You

You are God alone
We worship You`
  },
  {
    title: "Holy Spirit Rain Down",
    author: "Derek Jones",
    defaultKey: "Bb",
    tempo: 68,
    tags: "worship,holy spirit",
    lyrics: `Holy Spirit rain down
Rain down on us

We need Your presence
We need Your power
Holy Spirit rain down

Come like a flood
Come like a fire
Come like a wind
Holy Spirit rain down

Fill this place
With Your glory
Holy Spirit rain down
Rain down on us

We're hungry for more of You
Holy Spirit rain down`
  },
  {
    title: "Your Grace Is Enough",
    author: "Derek Jones",
    defaultKey: "C",
    tempo: 76,
    tags: "worship,grace",
    lyrics: `Your grace is enough
Your grace is enough for me

In my weakness You are strong
In my failure You remain

Your grace is enough
Your grace is enough for me

I don't deserve Your love
But You give it freely
Your grace is enough

When I fall You lift me up
When I'm lost You find me
Your grace is enough
Your grace is enough for me`
  },
  {
    title: "You Reign",
    author: "Derek Jones",
    defaultKey: "A",
    tempo: 82,
    tags: "worship,sovereignty",
    lyrics: `You reign over all
You reign over all
Lord You reign over all

Above the heavens
Above the earth
Above every power
You reign

You reign over all
From everlasting to everlasting
You reign

Your kingdom has no end
Your throne stands forever
You reign over all

Let everything that has breath
Praise the Lord
For You reign over all`
  },
  {
    title: "Draw Me Close",
    author: "Derek Jones",
    defaultKey: "D",
    tempo: 65,
    tags: "worship,intimacy",
    lyrics: `Draw me close to You
Never let me go
Draw me close to You

I want to know You more
I want to feel Your heart
Draw me close

In Your presence
There is fullness of joy
Draw me close to You

Lord I need You
More than anything
Draw me close

You are my desire
You are my everything
Draw me close to You`
  },
  {
    title: "Great Is Your Faithfulness",
    author: "Derek Jones",
    defaultKey: "E",
    tempo: 70,
    tags: "worship,faithfulness",
    lyrics: `Great is Your faithfulness
Great is Your faithfulness
Morning by morning
New mercies I see

All I have needed
Your hand has provided
Great is Your faithfulness
Lord unto me

You never change
You never fail
Your promises stand forever

Great is Your faithfulness
Great is Your faithfulness
Great is Your faithfulness to me`
  },

  // ============================================================
  //  DANIEL BANAM
  // ============================================================
  {
    title: "Seigneur Tu es grand",
    author: "Daniel Banam",
    defaultKey: "Sol",
    tempo: 82,
    tags: "louange,grandeur",
    lyrics: `Seigneur Tu es grand
Tu es grand, Tu es grand

Personne n'est comme Toi
Personne ne peut prendre Ta place

Seigneur Tu es grand
Dans les cieux et sur la terre
Tu es grand

Ta grandeur est insondable
Ta puissance est incomparable
Seigneur Tu es grand

Nous Te louons
Nous T'adorons
Car Tu es grand`
  },
  {
    title: "Je T'adore",
    author: "Daniel Banam",
    defaultKey: "Ré",
    tempo: 70,
    tags: "adoration,intimité",
    lyrics: `Je T'adore, je T'adore
Mon Roi, mon Dieu
Je T'adore

De tout mon cœur
De toute mon âme
Je T'adore

Tu es ma raison de vivre
Tu es mon souffle de vie
Je T'adore

Prends le trône de ma vie
Je T'adore Seigneur

Rien ne peut se comparer à Toi
Je T'adore, je T'adore`
  },
  {
    title: "Victoire",
    author: "Daniel Banam",
    defaultKey: "Mi",
    tempo: 125,
    tags: "louange,victoire",
    lyrics: `Victoire, victoire
Victoire au nom de Jésus

L'ennemi est vaincu
Par le sang de l'Agneau

Victoire, victoire
Nous avons la victoire

Christ est ressuscité
La mort est vaincue
L'enfer est dépouillé

Victoire, victoire
Au nom de Jésus
Victoire`
  },
  {
    title: "Hosanna au plus haut",
    author: "Daniel Banam",
    defaultKey: "Fa",
    tempo: 88,
    tags: "louange,exaltation",
    lyrics: `Hosanna au plus haut des cieux
Hosanna au Fils de David

Béni soit Celui qui vient
Au nom du Seigneur

Hosanna, hosanna
Hosanna au plus haut

Les cieux Te louent
La terre T'adore
Hosanna au plus haut

Tu es le Roi de gloire
Tu es le Messie
Hosanna, hosanna
Hosanna au plus haut des cieux`
  },
  {
    title: "Dieu de ma vie",
    author: "Daniel Banam",
    defaultKey: "La",
    tempo: 73,
    tags: "adoration,intimité",
    lyrics: `Dieu de ma vie
Toi seul es digne
Dieu de ma vie

Tu connais tout de moi
Mes joies et mes peines
Dieu de ma vie

Je remets tout entre Tes mains
Ma vie T'appartient
Dieu de ma vie

Tu es mon Père
Tu es mon Roi
Tu es mon tout
Dieu de ma vie`
  },
  {
    title: "Gloire et honneur",
    author: "Daniel Banam",
    defaultKey: "Si♭",
    tempo: 78,
    tags: "adoration,gloire",
    lyrics: `Gloire et honneur
Puissance et majesté
T'appartiennent Seigneur

Gloire et honneur
À l'Agneau de Dieu

Tu es assis sur le trône
Tu règnes pour toujours
Gloire et honneur

Toute la création
Te rend gloire et honneur

Les anges proclament
Saint, Saint, Saint
Gloire et honneur
À Toi seul Seigneur`
  },
  {
    title: "Emmanuel",
    author: "Daniel Banam",
    defaultKey: "Do",
    tempo: 68,
    tags: "adoration,Noël",
    lyrics: `Emmanuel, Emmanuel
Dieu avec nous
Emmanuel

Tu as quitté le ciel
Pour venir sur la terre
Emmanuel

Dieu fait homme
Parmi les hommes
Emmanuel

Tu es venu pour sauver
Tu es venu pour délivrer
Emmanuel

Dieu avec nous
Dieu parmi nous
Emmanuel, Emmanuel`
  },

  // ============================================================
  //  JONATHAN C. GAMBELA
  // ============================================================
  {
    title: "C'est Toi ma force",
    author: "Jonathan C. Gambela",
    defaultKey: "Do",
    tempo: 78,
    tags: "adoration,force",
    lyrics: `C'est Toi ma force
C'est Toi ma joie
C'est Toi mon espérance

Seigneur c'est Toi
Ma raison de vivre

C'est Toi ma force
Quand je suis faible
C'est Toi qui me relèves

Sans Toi je ne peux rien faire
Sans Toi je ne suis rien

C'est Toi ma force
C'est Toi ma force Seigneur`
  },
  {
    title: "Jésus Tu es ma vie",
    author: "Jonathan C. Gambela",
    defaultKey: "Ré",
    tempo: 72,
    tags: "adoration,intimité",
    lyrics: `Jésus Tu es ma vie
Tu es tout pour moi
Jésus Tu es ma vie

Plus que l'air que je respire
Plus que tout en ce monde
Jésus Tu es ma vie

Je ne peux vivre sans Toi
Tu es mon oxygène
Tu es mon tout

Jésus Tu es ma vie
Tu es ma vie Seigneur`
  },
  {
    title: "Bolamu",
    author: "Jonathan C. Gambela",
    defaultKey: "Sol",
    tempo: 110,
    tags: "louange,joie,lingala",
    lyrics: `Bolamu na Yo Nzambe
Bolamu na Yo

Ton amour ô Dieu
Ta bonté ô Dieu

Bolamu na Yo
Esili koloba
Bolamu na Yo

Motema na ngai
Etondi na esengo

Bolamu na Yo Nzambe
Bolamu na Yo

Okomi na ngai
Biloko nyonso

Bolamu na Yo Nzambe`
  },
  {
    title: "Louange éternelle",
    author: "Jonathan C. Gambela",
    defaultKey: "Mi",
    tempo: 100,
    tags: "louange,éternité",
    lyrics: `Louange éternelle
À notre Dieu
Louange éternelle

Du lever du soleil
Jusqu'à son coucher
Louange éternelle

Son nom est grand
Son nom est élevé
Louange éternelle

Dans les siècles des siècles
Nous Te louerons
Louange éternelle
À notre Dieu`
  },
  {
    title: "Na Komitia Maboko",
    author: "Jonathan C. Gambela",
    defaultKey: "Fa",
    tempo: 85,
    tags: "adoration,lingala",
    lyrics: `Na komitia maboko
Liboso na Yo Nzambe

Je lève les mains
Devant Toi mon Dieu

Na komitia maboko
Na keyi na mabolongo

Je me prosterne devant Toi
Mon Roi, mon Dieu

Na komitia maboko
Liboso na Yo

Tu es digne de louange
Tu es digne d'adoration

Na komitia maboko
Liboso na Yo Nzambe`
  },
  {
    title: "Moponami",
    author: "Jonathan C. Gambela",
    defaultKey: "La",
    tempo: 76,
    tags: "adoration,lingala",
    lyrics: `Moponami, Moponami
Mon élu, mon choisi

Nzambe o pona ngai
Dieu Tu m'as choisi

Moponami
Parmi des millions
Tu m'as choisi

Na yebaka Te
Depuis le ventre de ma mère
Tu m'as connu

Moponami, Moponami
Mon Dieu Tu m'as choisi
Moponami`
  },
  {
    title: "Keba na yo",
    author: "Jonathan C. Gambela",
    defaultKey: "Ré",
    tempo: 92,
    tags: "louange,lingala",
    lyrics: `Keba na yo
Keba na yo
Prends garde à toi

Nzambe azali na ngai
Dieu est avec moi

Keba na yo
Moto oyo obeti
Nzambe abateli ye

Prends garde à toi
Celui que tu combats
Dieu le protège

Keba na yo
Keba na yo
Nzambe azali na ngai`
  },

  // ============================================================
  //  DENA MWANA
  // ============================================================
  {
    title: "Nzambe Na Bomoyi",
    author: "Dena Mwana",
    defaultKey: "La",
    tempo: 68,
    tags: "adoration,lingala",
    lyrics: `Nzambe na bomoyi
Dieu de ma vie

Na lobi Yo
Je T'aime

Nzambe na bomoyi
Tu es mon tout

Ozali monene
Tu es grand

Nzambe na bomoyi
Nakopesa Yo nkembo

Dieu de ma vie
Je Te donnerai la gloire

Nzambe na bomoyi
Na lobi Yo
Na lobi Yo Tata`
  },
  {
    title: "Jéhovah",
    author: "Dena Mwana",
    defaultKey: "Do",
    tempo: 72,
    tags: "adoration,louange",
    lyrics: `Jéhovah, Jéhovah
Tu es le Dieu Tout-Puissant
Jéhovah

Tu es le Roi des rois
Tu es le Seigneur des seigneurs
Jéhovah

Rien n'est impossible pour Toi
Jéhovah

Les cieux proclament Ta gloire
La terre chante Ton nom
Jéhovah, Jéhovah

Tu es le même hier
Aujourd'hui et éternellement
Jéhovah`
  },
  {
    title: "Mon Cœur T'adore",
    author: "Dena Mwana",
    defaultKey: "Fa",
    tempo: 65,
    tags: "adoration,intimité",
    lyrics: `Mon cœur T'adore
Mon âme Te bénit
Mon cœur T'adore

De tout mon être
Je T'adore Seigneur

Mon cœur T'adore
Car Tu es digne
De toute la louange

Je me prosterne devant Toi
Mon Roi, mon Dieu
Mon cœur T'adore

Rien ne peut se comparer
À Ta beauté
Mon cœur T'adore`
  },
  {
    title: "Pasola Lola",
    author: "Dena Mwana",
    defaultKey: "Sol",
    tempo: 80,
    tags: "louange,lingala",
    lyrics: `Pasola lola
Descends du ciel

Pasola lola Tata
Descends du ciel Père

Biso tozali na mposa na Yo
Nous avons besoin de Toi

Pasola lola
Na esika oyo
Descends du ciel
En ce lieu

Mokili etonda na molili
Le monde est rempli de ténèbres

Pasola lola Tata
Descends du ciel

Biso tozali kobelela
Nous crions vers Toi`
  },
  {
    title: "Certitude",
    author: "Dena Mwana",
    defaultKey: "Mi",
    tempo: 75,
    tags: "adoration,confiance",
    lyrics: `Ma certitude c'est Toi
Ma certitude c'est Toi Seigneur

Quand tout s'écroule autour de moi
Ma certitude c'est Toi

Tu es mon roc
Tu es mon refuge
Ma certitude c'est Toi

Je n'ai pas peur de demain
Car Tu tiens ma vie
Dans Tes mains

Ma certitude c'est Toi
Ma certitude c'est Toi Seigneur`
  },
  {
    title: "Bolingo Ya Klisto",
    author: "Dena Mwana",
    defaultKey: "Ré",
    tempo: 70,
    tags: "adoration,lingala,amour",
    lyrics: `Bolingo ya Klisto
Eleki makasi
L'amour du Christ
Est plus fort que tout

Bolingo ya Klisto
Ezali ya solo
L'amour du Christ
Est véritable

Nani akokabola biso
Na bolingo ya Klisto
Qui nous séparera
De l'amour du Christ

Bolingo ya Klisto
Bolingo ya Klisto
Eleki makasi`
  },
  {
    title: "Tu règnes",
    author: "Dena Mwana",
    defaultKey: "Si♭",
    tempo: 85,
    tags: "louange,royauté",
    lyrics: `Tu règnes, Tu règnes
Sur toute la terre Tu règnes

Au-dessus de tout pouvoir
Au-dessus de toute autorité
Tu règnes

Ton trône est éternel
Ton règne n'a pas de fin
Tu règnes

Les nations tremblent
Devant Ta face
Car Tu règnes

Tu règnes, Tu règnes
Seigneur Tu règnes`
  },
  {
    title: "Si tu savais",
    author: "Dena Mwana",
    defaultKey: "Do",
    tempo: 68,
    tags: "adoration,témoignage",
    lyrics: `Si tu savais
Ce que Dieu a fait pour moi
Si tu savais

Tu L'adorerais
Tu Le louerais
Si tu savais

Il m'a sauvé
Il m'a délivré
Il m'a relevé

Si tu savais
Ce qu'Il a fait dans ma vie
Si tu savais

Tu ne pourrais pas rester
Sans L'adorer
Si tu savais`
  },

  // ============================================================
  //  GRACE JOCKTANE
  // ============================================================
  {
    title: "Sois élevé",
    author: "Grace Jocktane",
    defaultKey: "Sol",
    tempo: 78,
    tags: "louange,exaltation",
    lyrics: `Sois élevé, sois élevé
Sois élevé Seigneur

Au-dessus de tout
Au-dessus des cieux
Sois élevé

Ton nom est grand
Ton nom est puissant
Sois élevé Seigneur

Que toute la terre
Proclame Ta grandeur
Sois élevé

Sois élevé, sois élevé
Dans nos vies
Sois élevé Seigneur`
  },
  {
    title: "Dieu est bon",
    author: "Grace Jocktane",
    defaultKey: "Do",
    tempo: 95,
    tags: "louange,bonté",
    lyrics: `Dieu est bon
Dieu est bon
En tout temps Dieu est bon

Dans la joie comme dans l'épreuve
Dieu est bon

Sa bonté dure à toujours
Sa fidélité est éternelle
Dieu est bon

Je chanterai Sa bonté
Je proclamerai Sa fidélité
Dieu est bon

Dieu est bon
Dieu est bon
En tout temps Dieu est bon`
  },
  {
    title: "Viens Saint-Esprit",
    author: "Grace Jocktane",
    defaultKey: "Ré",
    tempo: 65,
    tags: "adoration,Saint-Esprit",
    lyrics: `Viens Saint-Esprit
Remplis ce lieu
Viens Saint-Esprit

Nous avons soif de Toi
Nous avons faim de Toi
Viens Saint-Esprit

Viens avec Ta puissance
Viens avec Ton feu
Viens Saint-Esprit

Consume-nous
Transforme-nous
Viens Saint-Esprit

Viens Saint-Esprit
Remplis nos cœurs
Viens Saint-Esprit`
  },
  {
    title: "Mon Dieu est grand",
    author: "Grace Jocktane",
    defaultKey: "Mi",
    tempo: 105,
    tags: "louange,grandeur",
    lyrics: `Mon Dieu est grand
Mon Dieu est grand
Il n'y a personne comme Lui

Mon Dieu est grand
Sa puissance est sans limite
Sa gloire remplit la terre

Mon Dieu est grand
Les montagnes tremblent
Les mers se retirent
Devant Sa face

Mon Dieu est grand
Mon Dieu est grand
Personne n'est comme Lui`
  },
  {
    title: "Tout est possible",
    author: "Grace Jocktane",
    defaultKey: "La",
    tempo: 115,
    tags: "louange,foi",
    lyrics: `Tout est possible
Tout est possible
À celui qui croit

Tout est possible
Avec Dieu
Rien n'est impossible

Les montagnes se déplacent
Les murs tombent
Les chaînes se brisent

Tout est possible
Tout est possible
Par la foi

Tout est possible
Avec notre Dieu
Tout est possible`
  },
  {
    title: "Papa oh",
    author: "Grace Jocktane",
    defaultKey: "Fa",
    tempo: 82,
    tags: "adoration,intimité",
    lyrics: `Papa oh, Papa oh
Papa oh, mon Père

Tu es bon pour moi
Tu prends soin de moi
Papa oh

Quand je suis dans la détresse
Tu es là
Papa oh

Tu essuies mes larmes
Tu portes mes fardeaux
Papa oh

Papa oh, Papa oh
Mon Père céleste
Papa oh`
  },
  {
    title: "Jésus est Seigneur",
    author: "Grace Jocktane",
    defaultKey: "Si♭",
    tempo: 90,
    tags: "louange,déclaration",
    lyrics: `Jésus est Seigneur
Jésus est Seigneur
De toute la terre
Jésus est Seigneur

Tout genou fléchira
Toute langue confessera
Jésus est Seigneur

Il est le chemin
La vérité et la vie
Jésus est Seigneur

Au ciel et sur la terre
Jésus est Seigneur
Jésus est Seigneur`
  },

  // ============================================================
  //  NATHANIEL BASSEY
  // ============================================================
  {
    title: "Olowogbogboro",
    author: "Nathaniel Bassey",
    defaultKey: "A",
    tempo: 75,
    tags: "worship,yoruba,adoration",
    lyrics: `Olowogbogboro
You are the Most High God
Olowogbogboro

You are the mighty warrior
The One who never loses any battle
Olowogbogboro

No one can stand against You
No one can contend with You
Olowogbogboro

You are the God of all flesh
Is there anything too hard for You
Olowogbogboro

Mighty God
Olowogbogboro`
  },
  {
    title: "What a God",
    author: "Nathaniel Bassey",
    defaultKey: "G",
    tempo: 72,
    tags: "worship,praise",
    lyrics: `What a God, what a God
What a God we serve
What a God

He's a mighty God
He's a holy God
He's a faithful God
What a God

What a God, what a God
What a God we serve

From everlasting to everlasting
He remains the same
What a God

He is awesome in power
Wonderful in majesty
What a God we serve`
  },
  {
    title: "Righteous One",
    author: "Nathaniel Bassey",
    defaultKey: "Bb",
    tempo: 68,
    tags: "worship,holiness",
    lyrics: `Righteous One
Righteous One
Holy God
Righteous One

You are pure
You are true
You are just
Righteous One

All Your ways are right
All Your judgments true
Righteous One

We bow before You
We worship You
Righteous One
Righteous One`
  },
  {
    title: "No Other God",
    author: "Nathaniel Bassey",
    defaultKey: "D",
    tempo: 70,
    tags: "worship,declaration",
    lyrics: `There is no other God
There is no other God like You

You are God alone
You are God alone

The heavens declare Your glory
The earth shows Your handiwork

There is no other God
There is no other God like You

In all the earth
There is none like You
No other God

There is no other God
Like our God`
  },
  {
    title: "Hallelujah Eh",
    author: "Nathaniel Bassey",
    defaultKey: "E",
    tempo: 110,
    tags: "worship,praise,joy",
    lyrics: `Hallelujah eh
Hallelujah eh
Hallelujah

We praise Your name
We lift You high
Hallelujah

Hallelujah eh
Hallelujah eh
Hallelujah

You are worthy
You are worthy
Hallelujah

Let everything that has breath
Praise the Lord
Hallelujah eh`
  },
  {
    title: "Glorious God",
    author: "Nathaniel Bassey",
    defaultKey: "F",
    tempo: 78,
    tags: "worship,glory",
    lyrics: `Glorious God
Glorious God
How great You are

Your majesty fills the earth
Your glory fills the heavens
Glorious God

We stand in awe of You
We bow before Your throne
Glorious God

There is none like You
In all the earth
Glorious God

Glorious God
Glorious God
How great You are`
  },
  {
    title: "Wonderful Wonder",
    author: "Nathaniel Bassey",
    defaultKey: "C",
    tempo: 82,
    tags: "worship,awe",
    lyrics: `Wonderful wonder
You are a wonderful wonder
God of all creation

You are the Alpha and Omega
The beginning and the end
Wonderful wonder

The works of Your hands
Declare Your glory
Wonderful wonder

From the rising of the sun
To the going down of the same
Your name is to be praised

Wonderful wonder
You are a wonderful wonder`
  },
  {
    title: "Olo Mi (Husband)",
    author: "Nathaniel Bassey",
    defaultKey: "Ab",
    tempo: 65,
    tags: "worship,intimacy,yoruba",
    lyrics: `Olo mi
You are my husband
Olo mi

You are the lover of my soul
You are the lifter of my head
Olo mi

I belong to You
And You belong to me
Olo mi

In Your arms I find rest
In Your presence I find peace
Olo mi

Olo mi
You are my everything
Olo mi`
  },
  {
    title: "Strong Tower",
    author: "Nathaniel Bassey",
    defaultKey: "B",
    tempo: 88,
    tags: "worship,refuge",
    lyrics: `You are my strong tower
My refuge and my strength
Strong tower

When the storms of life arise
I run to You
Strong tower

The name of the Lord
Is a strong tower
The righteous run in
And they are safe

You are my strong tower
My hiding place
Strong tower

In You I find safety
In You I find peace
Strong tower`
  },

  // ============================================================
  //  SANDRA KOUAME
  // ============================================================
  {
    title: "Dieu Tout-Puissant",
    author: "Sandra Kouame",
    defaultKey: "Sol",
    tempo: 80,
    tags: "louange,puissance",
    lyrics: `Dieu Tout-Puissant
Dieu Tout-Puissant
Tu règnes sur la terre

Ta puissance est sans limite
Ta gloire remplit les cieux
Dieu Tout-Puissant

Les nations tremblent devant Toi
Les montagnes se déplacent
Dieu Tout-Puissant

Il n'y a rien d'impossible
Pour Toi
Dieu Tout-Puissant

Dieu Tout-Puissant
Nous T'adorons
Dieu Tout-Puissant`
  },
  {
    title: "Louez l'Éternel",
    author: "Sandra Kouame",
    defaultKey: "Do",
    tempo: 100,
    tags: "louange,joie",
    lyrics: `Louez l'Éternel
Louez l'Éternel
Car Il est bon

Sa miséricorde
Dure à toujours
Louez l'Éternel

Que tout ce qui respire
Loue l'Éternel
Louez-Le

Avec les instruments
Avec la voix
Avec la danse
Louez l'Éternel

Louez l'Éternel
Louez l'Éternel
Car Il est bon`
  },
  {
    title: "Mon Dieu pourvoit",
    author: "Sandra Kouame",
    defaultKey: "Ré",
    tempo: 74,
    tags: "adoration,provision",
    lyrics: `Mon Dieu pourvoit
Mon Dieu pourvoit
À tous mes besoins

Jéhovah Jiré
Le Dieu qui pourvoit
Mon Dieu pourvoit

Il ouvre les portes
Que nul ne peut fermer
Mon Dieu pourvoit

Je ne manquerai de rien
Car mon Dieu pourvoit
Mon Dieu pourvoit

Mon Dieu pourvoit
Il est fidèle
Mon Dieu pourvoit`
  },
  {
    title: "Ton amour est merveilleux",
    author: "Sandra Kouame",
    defaultKey: "Mi",
    tempo: 70,
    tags: "adoration,amour",
    lyrics: `Ton amour est merveilleux
Ton amour est merveilleux Seigneur

Plus haut que les cieux
Plus profond que les mers
Ton amour est merveilleux

Rien ne peut me séparer
De Ton amour
Ton amour est merveilleux

Ni la mort, ni la vie
Ni les anges, ni les dominations
Ne peuvent me séparer

Ton amour est merveilleux
Ton amour est merveilleux Seigneur`
  },
  {
    title: "Vainqueur",
    author: "Sandra Kouame",
    defaultKey: "La",
    tempo: 118,
    tags: "louange,victoire",
    lyrics: `Je suis vainqueur
Par le sang de l'Agneau
Vainqueur

Plus que vainqueur
En Jésus-Christ
Je suis vainqueur

L'ennemi est sous mes pieds
La victoire est à moi
Vainqueur

Par la croix
Par le sang
Par la résurrection
Je suis vainqueur

Vainqueur
Plus que vainqueur
En Jésus-Christ`
  },
  {
    title: "Source de vie",
    author: "Sandra Kouame",
    defaultKey: "Fa",
    tempo: 68,
    tags: "adoration,Saint-Esprit",
    lyrics: `Source de vie
Source de vie
Tu es la source de vie

En Toi seul je trouve la vie
En Toi seul je trouve la paix
Source de vie

Comme un cerf altéré
Cherche les courants d'eau
Mon âme Te cherche

Source de vie
Coule en moi
Remplis-moi

Source de vie
Tu es la source de vie`
  },

  // ============================================================
  //  JACQUES AMESSAN
  // ============================================================
  {
    title: "Je m'abandonne",
    author: "Jacques Amessan",
    defaultKey: "Sol",
    tempo: 68,
    tags: "adoration,abandon",
    lyrics: `Je m'abandonne à Toi
Je m'abandonne à Toi Seigneur

Prends le contrôle de ma vie
Je m'abandonne à Toi

Que Ta volonté soit faite
Et non la mienne
Je m'abandonne à Toi

Entre Tes mains
Je remets ma vie
Mon avenir
Mes projets

Je m'abandonne à Toi
Complètement à Toi
Je m'abandonne`
  },
  {
    title: "Tu es fidèle",
    author: "Jacques Amessan",
    defaultKey: "Ré",
    tempo: 72,
    tags: "adoration,fidélité",
    lyrics: `Tu es fidèle
Tu es fidèle Seigneur
Tu es fidèle

De génération en génération
Tu es fidèle

Tu n'as jamais manqué
À Tes promesses
Tu es fidèle

Dans la tempête
Tu es fidèle
Dans l'épreuve
Tu es fidèle

Tu ne changes pas
Tu es le même
Tu es fidèle Seigneur`
  },
  {
    title: "Dieu d'Abraham",
    author: "Jacques Amessan",
    defaultKey: "Mi",
    tempo: 85,
    tags: "louange,foi",
    lyrics: `Dieu d'Abraham
Dieu d'Isaac
Dieu de Jacob
Tu es mon Dieu

Le Dieu de l'alliance
Le Dieu fidèle
Dieu d'Abraham

Tu as fait des promesses
Et Tu les accomplis
Dieu d'Abraham

Ce que Tu as dit
Tu le feras
Ce que Tu as promis
Tu l'accomplis

Dieu d'Abraham
Tu es mon Dieu
Dieu d'Abraham`
  },
  {
    title: "Glorifié",
    author: "Jacques Amessan",
    defaultKey: "La",
    tempo: 90,
    tags: "louange,gloire",
    lyrics: `Sois glorifié
Sois glorifié
Seigneur sois glorifié

Dans ma vie
Sois glorifié
Dans ma famille
Sois glorifié

Que tout ce que je fais
Te glorifie
Sois glorifié

Les cieux et la terre
Te glorifient
Sois glorifié

Sois glorifié
Sois glorifié
Seigneur sois glorifié`
  },
  {
    title: "Le combat est de l'Éternel",
    author: "Jacques Amessan",
    defaultKey: "Do",
    tempo: 108,
    tags: "louange,combat spirituel",
    lyrics: `Le combat est de l'Éternel
Le combat n'est pas le tien

Reste tranquille
Et regarde la délivrance de l'Éternel

Le combat est de l'Éternel
Il combat pour toi

L'Éternel des armées
Est avec nous
Le combat est de l'Éternel

Ne crains pas
Ne t'effraie pas
Le combat est de l'Éternel

Il marche devant toi
Il combat pour toi
Le combat est de l'Éternel`
  },
  {
    title: "Adorons le Seigneur",
    author: "Jacques Amessan",
    defaultKey: "Fa",
    tempo: 70,
    tags: "adoration,corporatif",
    lyrics: `Adorons le Seigneur
Ensemble adorons le Seigneur

Prosternons-nous devant Lui
Adorons le Seigneur

Il est digne de louange
Il est digne d'adoration
Adorons le Seigneur

Avec un cœur sincère
Avec un esprit humble
Adorons le Seigneur

En esprit et en vérité
Adorons le Seigneur
Adorons le Seigneur`
  },
  {
    title: "Je lève mes yeux",
    author: "Jacques Amessan",
    defaultKey: "Si♭",
    tempo: 65,
    tags: "adoration,psaume",
    lyrics: `Je lève mes yeux vers les montagnes
D'où me viendra le secours

Mon secours vient de l'Éternel
Qui a fait les cieux et la terre

Je lève mes yeux
Vers Toi Seigneur

Il ne permettra point
Que ton pied chancelle
Il ne sommeillera pas

Celui qui te garde
Ne sommeillera pas

Je lève mes yeux vers les montagnes
Mon secours vient de l'Éternel`
  },

  // ============================================================
  //  YVAN CASTANOU
  // ============================================================
  {
    title: "Tu es la lumière",
    author: "Yvan Castanou",
    defaultKey: "Sol",
    tempo: 78,
    tags: "louange,lumière",
    lyrics: `Tu es la lumière du monde
Tu es la lumière

Dans les ténèbres
Tu brilles
Tu es la lumière

Les ténèbres ne peuvent
Te comprendre
Tu es la lumière

Brille dans ma vie
Brille dans mon cœur
Tu es la lumière

Tu es la lumière du monde
Brille sur nous
Tu es la lumière`
  },
  {
    title: "Sa majesté",
    author: "Yvan Castanou",
    defaultKey: "Ré",
    tempo: 72,
    tags: "adoration,majesté",
    lyrics: `Sa majesté
Sa majesté remplit ce lieu
Sa majesté

Le Roi des rois est là
Le Seigneur des seigneurs est là
Sa majesté

Prosternons-nous
Devant Sa face
Sa majesté

Il est assis sur le trône
Il règne pour toujours
Sa majesté

Sa majesté
Sa majesté remplit ce lieu`
  },
  {
    title: "C'est par la foi",
    author: "Yvan Castanou",
    defaultKey: "Mi",
    tempo: 88,
    tags: "louange,foi",
    lyrics: `C'est par la foi
C'est par la foi
Que nous marchons

Pas par la vue
Mais par la foi
C'est par la foi

Les murs de Jéricho
Sont tombés par la foi
C'est par la foi

Abraham a cru
Contre toute espérance
C'est par la foi

C'est par la foi
Que nous avançons
C'est par la foi`
  },
  {
    title: "Consacré",
    author: "Yvan Castanou",
    defaultKey: "La",
    tempo: 70,
    tags: "adoration,consécration",
    lyrics: `Consacré, consacré
Ma vie est consacrée à Toi

Seigneur je me donne
Entièrement à Toi
Consacré

Prends ma vie
Prends mon cœur
Prends tout ce que je suis

Consacré à Toi
Pour Ta gloire
Pour Ton honneur
Consacré

Ma vie est consacrée
À Toi seul Seigneur
Consacré`
  },
  {
    title: "Rocher inébranlable",
    author: "Yvan Castanou",
    defaultKey: "Do",
    tempo: 82,
    tags: "louange,stabilité",
    lyrics: `Tu es le Rocher inébranlable
Tu es le Rocher

Quand tout s'ébranle
Tu ne bouges pas
Rocher inébranlable

Ma maison est bâtie
Sur le Rocher
Rocher inébranlable

Les vents peuvent souffler
Les pluies peuvent tomber
Mais le Rocher ne bouge pas

Tu es le Rocher inébranlable
Mon fondement
Rocher inébranlable`
  },
  {
    title: "Père saint",
    author: "Yvan Castanou",
    defaultKey: "Fa",
    tempo: 66,
    tags: "adoration,sainteté",
    lyrics: `Père saint, Père saint
Nous venons devant Toi
Père saint

Avec des cœurs humbles
Avec des mains pures
Père saint

Tu habites la louange
Tu habites nos adorations
Père saint

Sanctifie-nous
Par Ta Parole
Père saint

Père saint, Père saint
Nous T'adorons
Père saint`
  },
  {
    title: "Yahweh Sabaoth",
    author: "Yvan Castanou",
    defaultKey: "Ré",
    tempo: 75,
    tags: "louange,combat spirituel",
    lyrics: `Yahweh Sabaoth
L'Éternel des armées
Yahweh Sabaoth

Tu es le Dieu des combats
Tu es le Dieu de la victoire
Yahweh Sabaoth

Les armées des cieux
Sont sous Ton commandement
Yahweh Sabaoth

Tu combats pour nous
Tu nous donnes la victoire
Yahweh Sabaoth

Yahweh Sabaoth
L'Éternel des armées`
  },

  // ============================================================
  //  MARCELO TUNASI
  // ============================================================
  {
    title: "Yahweh",
    author: "Marcelo Tunasi",
    defaultKey: "Do",
    tempo: 72,
    tags: "adoration,nom de Dieu",
    lyrics: `Yahweh, Yahweh
Tu es le grand JE SUIS
Yahweh

Avant que les montagnes soient nées
Tu es Dieu
Yahweh

Tu es le même
Hier, aujourd'hui, éternellement
Yahweh

Yahweh, Yahweh
Le Dieu d'Israël
Le Dieu vivant
Yahweh

Nous T'adorons
Yahweh, Yahweh`
  },
  {
    title: "Bolingo Ya Nzambe",
    author: "Marcelo Tunasi",
    defaultKey: "Sol",
    tempo: 78,
    tags: "adoration,lingala,amour",
    lyrics: `Bolingo ya Nzambe
L'amour de Dieu

Eleki makasi
Il est si fort

Bolingo ya Nzambe
Na motema na ngai
L'amour de Dieu
Dans mon cœur

Eleki monene
Il est si grand
Bolingo ya Nzambe

Nani akoyeba
Bolingo ya Nzambe
Qui peut comprendre
L'amour de Dieu

Bolingo ya Nzambe
Eleki makasi`
  },
  {
    title: "Mundimi",
    author: "Marcelo Tunasi",
    defaultKey: "Ré",
    tempo: 85,
    tags: "louange,lingala",
    lyrics: `Mundimi, mundimi
Mon soutien, mon aide

Nzambe azali mundimi
Dieu est mon soutien

Na tango ya pasi
Dans le temps de détresse
Mundimi

Na tango ya mawa
Dans le temps de tristesse
Mundimi

Nzambe azali mundimi
Na ngai
Dieu est mon soutien

Mundimi, mundimi
Nzambe mundimi`
  },
  {
    title: "Nkolo Yesu",
    author: "Marcelo Tunasi",
    defaultKey: "Mi",
    tempo: 70,
    tags: "adoration,lingala",
    lyrics: `Nkolo Yesu
Seigneur Jésus

Ozali monene
Tu es grand

Nkolo Yesu
Na lobi Yo
Seigneur Jésus
Je T'aime

Ozali na nguya
Tu es puissant
Nkolo Yesu

Na keyi na mabolongo
Je me mets à genoux
Liboso na Yo
Devant Toi

Nkolo Yesu
Nkolo Yesu
Ozali monene`
  },
  {
    title: "Matondo",
    author: "Marcelo Tunasi",
    defaultKey: "La",
    tempo: 82,
    tags: "louange,lingala,gratitude",
    lyrics: `Matondo, matondo
Merci, merci

Tata matondo
Père merci

Po na makambo nyonso
Pour toutes les choses
Matondo

Po na bomoi
Pour la vie
Matondo

Po na bolingo
Pour l'amour
Matondo

Tata matondo
Na kopesa Yo matondo
Père merci
Je Te dis merci

Matondo, matondo`
  },
  {
    title: "Kombo na Yesu",
    author: "Marcelo Tunasi",
    defaultKey: "Fa",
    tempo: 95,
    tags: "louange,lingala,nom de Jésus",
    lyrics: `Kombo na Yesu
Le nom de Jésus

Eleki kombo nyonso
Au-dessus de tout nom
Kombo na Yesu

Na kombo ya Yesu
Au nom de Jésus
Mabolongo nyonso ekofukama
Tout genou fléchira

Kombo na Yesu
Ezali na nguya
Le nom de Jésus
Est puissant

Kombo na Yesu
Kombo na Yesu
Eleki kombo nyonso`
  },
  {
    title: "Ozali Nzambe",
    author: "Marcelo Tunasi",
    defaultKey: "Si♭",
    tempo: 68,
    tags: "adoration,lingala",
    lyrics: `Ozali Nzambe
Tu es Dieu

Ozali Nzambe ya solo
Tu es le vrai Dieu

Na mokili mobimba
Dans le monde entier
Ozali Nzambe

Nzambe ya likolo
Dieu du ciel
Nzambe ya nse
Dieu de la terre
Ozali Nzambe

Moko te akokani na Yo
Personne ne peut se comparer à Toi
Ozali Nzambe
Ozali Nzambe`
  },
  {
    title: "Nakosala",
    author: "Marcelo Tunasi",
    defaultKey: "Do",
    tempo: 75,
    tags: "adoration,lingala,consécration",
    lyrics: `Nakosala nini
Que ferai-je
Po na Yo Nzambe
Pour Toi Dieu

Nakosala nini
Po na bolamu nyonso
Que ferai-je
Pour toute la bonté

Oyo omonisi ngai
Que Tu m'as montrée

Nakosala nini
Nakopesa Yo motema
Que ferai-je
Je Te donnerai mon cœur

Nakosala nini
Po na Yo Nzambe
Nakosala nini`
  },

  // ============================================================
  //  DEBORAH LUKALU
  // ============================================================
  {
    title: "You Are (Uz)",
    author: "Deborah Lukalu",
    defaultKey: "C",
    tempo: 72,
    tags: "worship,adoration",
    lyrics: `You are, You are
You are God alone
You are

Above all powers
Above all kings
You are

You are the way
The truth and the life
You are

No one can compare to You
No one can take Your place
You are

You are, You are
You are God alone
You are`
  },
  {
    title: "Faithful God",
    author: "Deborah Lukalu",
    defaultKey: "A",
    tempo: 70,
    tags: "worship,faithfulness",
    lyrics: `Faithful God
Faithful God
You are a faithful God

From the beginning
To the end
Faithful God

You never change
You never fail
You are a faithful God

Through every season
Through every storm
You remain faithful

Faithful God
Faithful God
You are a faithful God`
  },
  {
    title: "Trust",
    author: "Deborah Lukalu",
    defaultKey: "G",
    tempo: 68,
    tags: "worship,trust",
    lyrics: `I trust in You
I trust in You Lord
I trust in You

When I cannot see
When I cannot feel
I trust in You

You have never failed me
You have never left me
I trust in You

My hope is in You
My faith is in You
I trust in You

I trust in You
I trust in You Lord
I trust in You`
  },
  {
    title: "Overflow",
    author: "Deborah Lukalu",
    defaultKey: "D",
    tempo: 78,
    tags: "worship,Holy Spirit",
    lyrics: `Let it overflow
Let Your Spirit overflow
In this place

We need Your presence
We need Your power
Let it overflow

Pour out Your Spirit
Like a river
Let it overflow

Fill every heart
Fill every soul
Let Your glory overflow

Overflow, overflow
Let it overflow
In this place`
  },
  {
    title: "I Belong to You",
    author: "Deborah Lukalu",
    defaultKey: "Bb",
    tempo: 74,
    tags: "worship,intimacy",
    lyrics: `I belong to You
I belong to You Lord
I belong to You

All that I am
All that I have
Belongs to You

I belong to You
Nothing can separate me
From Your love

You chose me
You called me
I belong to You

I belong to You
Forever and always
I belong to You`
  },
  {
    title: "Mighty God",
    author: "Deborah Lukalu",
    defaultKey: "E",
    tempo: 85,
    tags: "worship,power",
    lyrics: `Mighty God
Mighty God
You are a mighty God

The earth trembles
At Your voice
Mighty God

Nothing is impossible
For You
Mighty God

The mountains bow
The seas obey
Mighty God

Mighty God
Mighty God
You are a mighty God`
  },
  {
    title: "Victory",
    author: "Deborah Lukalu",
    defaultKey: "F",
    tempo: 115,
    tags: "worship,victory",
    lyrics: `Victory is mine
Victory is mine
Through Jesus Christ
Victory is mine

The battle is won
The war is over
Victory is mine

By the blood of the Lamb
We overcome
Victory is mine

Death is defeated
Hell is conquered
Victory is mine

Victory, victory
Victory is mine`
  },
  {
    title: "Emmanuel",
    author: "Deborah Lukalu",
    defaultKey: "Ab",
    tempo: 70,
    tags: "worship,presence",
    lyrics: `Emmanuel
God is with us
Emmanuel

In the darkest night
In the deepest valley
Emmanuel

You never leave us
You never forsake us
Emmanuel

God with us
God for us
Emmanuel

Emmanuel
Emmanuel
God is with us
Emmanuel`
  },
  {
    title: "More Than Enough",
    author: "Deborah Lukalu",
    defaultKey: "C",
    tempo: 76,
    tags: "worship,provision",
    lyrics: `You are more than enough
You are more than enough for me
More than enough

When the world says I need more
You are more than enough

Your grace is sufficient
Your love is unfailing
You are more than enough

More than enough
More than enough
Lord You are more than enough

In every season
In every situation
You are more than enough for me`
  },
];

async function main() {
  // Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Administrateur", pin: "1234" }),
  });

  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    process.exit(1);
  }

  // Extract session cookie
  const setCookie = loginRes.headers.get("set-cookie");
  const sessionMatch = setCookie?.match(/wf_session=([^;]+)/);
  if (!sessionMatch) {
    console.error("No session cookie received");
    process.exit(1);
  }
  const cookie = `wf_session=${sessionMatch[1]}`;
  console.log(`✓ Logged in as Administrateur\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const song of songs) {
    try {
      const res = await fetch(`${BASE}/api/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify(song),
      });

      if (res.ok) {
        created++;
        console.log(`  ✓ ${song.title} — ${song.author}`);
      } else if (res.status === 409) {
        skipped++;
        console.log(`  ⊘ ${song.title} — déjà existant`);
      } else {
        failed++;
        const err = await res.json();
        console.log(`  ✗ ${song.title} — ${err.error}`);
      }
    } catch (err) {
      failed++;
      console.log(`  ✗ ${song.title} — ${err.message}`);
    }
  }

  console.log(`\n=============================`);
  console.log(`Créés:  ${created}`);
  console.log(`Ignorés: ${skipped}`);
  console.log(`Échecs:  ${failed}`);
  console.log(`Total:   ${songs.length}`);
}

main();
