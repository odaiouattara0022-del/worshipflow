/**
 * Script to bulk-add worship songs to WorshipFlow.
 * Run: node scripts/add-songs.js
 */

const BASE = "http://localhost:3000";

const songs = [
  // ========== APÔTRE MOHAMMED SANOGO ==========
  {
    title: "Nous T'élevons",
    author: "Mohammed Sanogo",
    defaultKey: "Sol",
    tempo: 78,
    tags: "louange,adoration",
    lyrics: `Nous T'élevons, nous T'élevons
Nous T'élevons Seigneur

Plus haut que tout, plus haut que tout
Plus haut que tout Seigneur

Au-dessus de tout nom
Au-dessus de tout trône

Nous T'élevons
Nous T'élevons Seigneur

Car Tu es digne
Car Tu es saint

Nous T'élevons
Au plus haut des cieux`
  },
  {
    title: "Éternel Tu es bon",
    author: "Mohammed Sanogo",
    defaultKey: "Do",
    tempo: 85,
    tags: "louange,gratitude",
    lyrics: `Éternel Tu es bon
Et Ta miséricorde dure à toujours

Éternel Tu es bon
Et Ta miséricorde dure à toujours

Oui Tu es bon
Tu es bon pour nous

Ta bonté n'a pas de fin
Ta grâce nous suffit

Éternel Tu es bon
Et Ta miséricorde dure à toujours`
  },
  {
    title: "Saint-Esprit de Dieu",
    author: "Mohammed Sanogo",
    defaultKey: "La",
    tempo: 70,
    tags: "adoration,Saint-Esprit",
    lyrics: `Saint-Esprit de Dieu
Viens remplir ce lieu

Saint-Esprit de Dieu
Viens toucher nos cœurs

Souffle sur nous
Souffle sur nous

Que Ta présence
Inonde ce lieu

Saint-Esprit
Nous avons besoin de Toi

Viens avec Ta puissance
Viens avec Ton feu`
  },
  {
    title: "Je suis en guerre",
    author: "Mohammed Sanogo",
    defaultKey: "Ré",
    tempo: 120,
    tags: "combat spirituel,louange",
    lyrics: `Je suis en guerre
Contre l'ennemi

Je suis en guerre
Par la foi je vaincrai

Avec Jésus je suis plus que vainqueur
Aucune arme forgée contre moi ne prospérera

Je suis en guerre
Et la victoire est à moi

Car celui qui est en moi
Est plus grand que celui qui est dans le monde

Je combats le bon combat
Je garde la foi

La couronne de justice
M'est réservée`
  },

  // ========== DEREK JONES ==========
  {
    title: "Oh God We Praise You",
    author: "Derek Jones",
    defaultKey: "Sol",
    tempo: 75,
    tags: "worship,anglophone",
    lyrics: `Oh God we praise You
We lift our hands to You

Oh God we praise You
We give You all the glory

You are worthy
You are holy

Oh God we praise You
We lift our hands to You

Forever and ever
Your kingdom reigns

Oh God we praise You
We worship at Your feet`
  },
  {
    title: "I Will Follow You",
    author: "Derek Jones",
    defaultKey: "Mi",
    tempo: 82,
    tags: "worship,engagement",
    lyrics: `I will follow You
Wherever You lead me

I will follow You
Through the storm and the rain

You are my shepherd
I shall not want

I will follow You
All the days of my life

In green pastures
You make me lie down

Beside still waters
You restore my soul`
  },
  {
    title: "Throne Room",
    author: "Derek Jones",
    defaultKey: "La",
    tempo: 68,
    tags: "adoration,worship",
    lyrics: `Take me to the throne room
Where Your glory fills the space

Take me to the throne room
Where I see You face to face

Holy, holy, holy
Is the Lord God Almighty

Who was and is
And is to come

Take me to the throne room
I want to be with You`
  },

  // ========== DANIEL BANAM ==========
  {
    title: "Tu es ma force",
    author: "Daniel Banam",
    defaultKey: "Fa",
    tempo: 88,
    tags: "louange,force",
    lyrics: `Tu es ma force
Tu es mon bouclier

Tu es ma force
Mon secours dans la détresse

Quand je suis faible
Tu me rends fort

Quand je tombe
Tu me relèves

Tu es ma force
Je ne crains rien

Car Tu es avec moi
Tous les jours de ma vie`
  },
  {
    title: "Mon Père céleste",
    author: "Daniel Banam",
    defaultKey: "Sol",
    tempo: 72,
    tags: "adoration,père",
    lyrics: `Mon Père céleste
Je viens devant Toi

Mon Père céleste
Je m'incline devant Toi

Tu es le Roi des rois
Le Seigneur des seigneurs

Mon Père céleste
Ton amour est grand

Tu m'as choisi
Avant la fondation du monde

Mon Père céleste
Je T'appartiens`
  },
  {
    title: "Alléluia Hosanna",
    author: "Daniel Banam",
    defaultKey: "Do",
    tempo: 130,
    tags: "louange,célébration",
    lyrics: `Alléluia, Alléluia
Hosanna au plus haut des cieux

Alléluia, Alléluia
Béni soit celui qui vient au nom du Seigneur

Hosanna, Hosanna
Hosanna au plus haut des cieux

Que tout ce qui respire
Loue le Seigneur

Alléluia, Alléluia
Hosanna au plus haut des cieux`
  },

  // ========== JONATHAN C. GAMBELA ==========
  {
    title: "Ton amour",
    author: "Jonathan C. Gambela",
    defaultKey: "Sol",
    tempo: 76,
    tags: "adoration,amour",
    lyrics: `Ton amour est merveilleux
Ton amour est au-delà de tout

Ton amour remplit mon cœur
Ton amour me rend heureux

Rien ne pourra me séparer
De Ton amour Seigneur

Ni la mort ni la vie
Ni les anges ni les dominations

Ton amour est plus fort que tout
Ton amour dure à toujours`
  },
  {
    title: "Nzambe Monene",
    author: "Jonathan C. Gambela",
    defaultKey: "Ré",
    tempo: 90,
    tags: "louange,lingala",
    lyrics: `Nzambe Monene
Nzambe ya nguya

Nzambe Monene
Ozali Nzambe ya solo

Totondi Yo Tata
Totondi Yo Nzambe

Nzambe Monene
Lokumu na Yo

Ozali Mosungi na biso
Ozali Mobikisi na biso

Nzambe Monene
Nzambe ya nguya`
  },
  {
    title: "Je suis béni",
    author: "Jonathan C. Gambela",
    defaultKey: "Fa",
    tempo: 110,
    tags: "louange,bénédiction",
    lyrics: `Je suis béni, béni, béni
Le Seigneur m'a béni

Je suis béni, béni, béni
Au nom de Jésus je suis béni

Dans ma vie il y a des témoignages
Dans ma vie il y a des miracles

Je suis béni, béni, béni
Le Seigneur m'a béni

Malgré les difficultés
Malgré les épreuves

Je suis béni
Car Dieu est avec moi`
  },

  // ========== DENA MWANA ==========
  {
    title: "Elombe",
    author: "Dena Mwana",
    defaultKey: "Ré",
    tempo: 68,
    tags: "adoration,lingala",
    lyrics: `Elombe, Elombe
Nkolo na ngai Elombe

Mokonzi ya bakonzi
Nkembo na Yo eleki

Ozali Nzambe
Ya solo, ya solo

Elombe, Elombe
Nkolo na ngai Elombe

Tala ngai nayo
Kombo na Yo ebongi

Elombe, Elombe
Nzambe Monene`
  },
  {
    title: "Saint-Esprit",
    author: "Dena Mwana",
    defaultKey: "Sol",
    tempo: 65,
    tags: "adoration,Saint-Esprit",
    lyrics: `Saint-Esprit, Saint-Esprit
Viens dans ce lieu

Saint-Esprit, Saint-Esprit
Remplis nos cœurs

Tu es le bienvenu
Dans ce lieu

Nous T'attendons
Avec foi

Saint-Esprit
Nous avons soif de Toi

Viens nous toucher
Viens nous transformer`
  },
  {
    title: "Na Lobi Na Yo",
    author: "Dena Mwana",
    defaultKey: "La",
    tempo: 72,
    tags: "adoration,lingala",
    lyrics: `Na lobi na Yo merci
Na lobi na Yo merci

Po na makambo nyonso
Osal'epo na ngai

Na lobi na Yo merci
Tata na lobi na Yo merci

Na tango ya pasi
Ozalaki elongo na ngai

Na lobi na Yo merci
Na lobi na Yo merci

Yo moko obongi
Na nkembo na lokumu`
  },
  {
    title: "Souffle",
    author: "Dena Mwana",
    defaultKey: "Mi",
    tempo: 60,
    tags: "adoration,Saint-Esprit",
    lyrics: `Souffle, souffle
Souffle sur moi Saint-Esprit

Souffle, souffle
Que Ton vent remplisse ma vie

Je veux être renouvelé
Par Ta puissance

Je veux être transformé
Par Ta présence

Souffle, souffle
Souffle sur moi

Comme le vent de la Pentecôte
Souffle encore dans ce lieu`
  },

  // ========== GRACE JOCKTANE ==========
  {
    title: "Tu mérites",
    author: "Grace Jocktane",
    defaultKey: "Sol",
    tempo: 74,
    tags: "adoration,louange",
    lyrics: `Tu mérites la louange
Tu mérites l'adoration

Tu mérites toute la gloire
Seigneur Jésus

De Tes mains sont sortis
Les cieux et la terre

Tu mérites
Toute la louange

Saint, Saint, Saint
Est le Seigneur

Tu mérites
La gloire et l'honneur`
  },
  {
    title: "Ma destinée",
    author: "Grace Jocktane",
    defaultKey: "Do",
    tempo: 85,
    tags: "louange,destinée",
    lyrics: `Ma destinée est entre Tes mains
Seigneur je Te fais confiance

Ma destinée est entre Tes mains
Tu connais les plans que Tu as pour moi

Des plans de bonheur
Et non de malheur

Des plans pour me donner
Un avenir et de l'espérance

Ma destinée est entre Tes mains
Je m'abandonne à Toi`
  },
  {
    title: "Je n'ai que Toi",
    author: "Grace Jocktane",
    defaultKey: "La",
    tempo: 70,
    tags: "adoration,intimité",
    lyrics: `Je n'ai que Toi Seigneur
Toi seul me suffit

Je n'ai que Toi
Ma vie est entre Tes mains

Dans ce monde qui passe
Tu restes le même

Hier, aujourd'hui
Et éternellement

Je n'ai que Toi Seigneur
Mon cœur T'appartient

Tu es mon tout
Mon refuge et ma force`
  },

  // ========== NATHANIEL BASSEY ==========
  {
    title: "Onise Iyanu",
    author: "Nathaniel Bassey",
    defaultKey: "Sol",
    tempo: 65,
    tags: "worship,yoruba",
    lyrics: `Onise Iyanu
Onise Iyanu

Mighty God
You do miracles

Way maker
Miracle worker

Promise keeper
Light in the darkness

Onise Iyanu
You are wonderful

There is no one like You
No one like You God`
  },
  {
    title: "Imela",
    author: "Nathaniel Bassey",
    defaultKey: "Ré",
    tempo: 70,
    tags: "worship,gratitude,igbo",
    lyrics: `Imela, Imela
Imela Okaka

Imela, Imela
Imela Chineke

Thank You Father
Thank You Lord

For all You've done
For all You do

Imela, Imela
Imela Okaka

You've been so faithful
You've been so good

Imela, Imela
Imela Chineke`
  },
  {
    title: "See What The Lord Has Done",
    author: "Nathaniel Bassey",
    defaultKey: "Fa",
    tempo: 78,
    tags: "worship,témoignage",
    lyrics: `See what the Lord has done
See what the Lord has done

He has done great things
Oh bless His name

See what the Lord has done
He has done marvelous things

He brought me out of darkness
Into His marvelous light

See what the Lord has done
Hallelujah

I will praise Him
Forever and ever`
  },
  {
    title: "You Are God",
    author: "Nathaniel Bassey",
    defaultKey: "Mi",
    tempo: 68,
    tags: "worship,adoration",
    lyrics: `You are God from beginning to the end
There is no place for argument

You are God all by Yourself
You don't need anybody's help

You are God and there is none like You
Great and mighty is Your name

You are God
Worthy of our praise

You are God
And we worship You`
  },

  // ========== SANDRA KOUAME ==========
  {
    title: "Gloire à Dieu",
    author: "Sandra Kouame",
    defaultKey: "Sol",
    tempo: 110,
    tags: "louange,célébration",
    lyrics: `Gloire à Dieu, gloire à Dieu
Dans les lieux très hauts

Gloire à Dieu, gloire à Dieu
Paix sur la terre

Il a fait de grandes choses
Il a fait des merveilles

Gloire à Dieu, gloire à Dieu
Au Roi des rois

Chantons Sa grandeur
Proclamons Sa bonté

Gloire à Dieu
Pour l'éternité`
  },
  {
    title: "Je Te cherche",
    author: "Sandra Kouame",
    defaultKey: "La",
    tempo: 72,
    tags: "adoration,intimité",
    lyrics: `Je Te cherche de tout mon cœur
Je Te cherche Seigneur

Au-delà de mes besoins
Au-delà de mes désirs

C'est Toi que je veux
C'est Toi que je cherche

Comme un cerf altéré
Cherche le courant d'eau

Mon âme a soif de Toi
Mon Dieu

Je Te cherche
De tout mon cœur`
  },
  {
    title: "Mon secours",
    author: "Sandra Kouame",
    defaultKey: "Ré",
    tempo: 80,
    tags: "louange,confiance",
    lyrics: `Mon secours vient de l'Éternel
Qui a fait les cieux et la terre

Mon secours vient de l'Éternel
Il ne permettra pas que mon pied chancelle

Celui qui me garde
Ne sommeillera point

L'Éternel te gardera
De tout mal

Mon secours vient de l'Éternel
Dès maintenant et à jamais`
  },

  // ========== JACQUES AMESSAN ==========
  {
    title: "Éternel Dieu",
    author: "Jacques Amessan",
    defaultKey: "Sol",
    tempo: 76,
    tags: "adoration,louange",
    lyrics: `Éternel Dieu
Nous venons T'adorer

Éternel Dieu
Nous venons T'exalter

Car Tu es grand
Et Tu fais des merveilles

Toi seul es Dieu
Toi seul es Dieu

Éternel Dieu
Reçois notre louange

Ton nom est grand
Ton nom est puissant`
  },
  {
    title: "Alpha et Oméga",
    author: "Jacques Amessan",
    defaultKey: "Ré",
    tempo: 88,
    tags: "louange,puissance",
    lyrics: `Alpha et Oméga
Le commencement et la fin

Alpha et Oméga
Le premier et le dernier

Roi des rois
Seigneur des seigneurs

Alpha et Oméga
Tu règnes pour toujours

Ton trône est établi
Dès les temps anciens

Alpha et Oméga
Gloire à Ton nom`
  },
  {
    title: "Merci Seigneur",
    author: "Jacques Amessan",
    defaultKey: "Do",
    tempo: 82,
    tags: "louange,gratitude",
    lyrics: `Merci Seigneur pour Ta bonté
Merci Seigneur pour Ta fidélité

Merci pour tout ce que Tu fais
Merci pour tout ce que Tu es

Tu es un Dieu de grâce
Tu es un Dieu d'amour

Merci Seigneur
Merci Seigneur

Pour Ta main qui me soutient
Pour Ta voix qui me guide

Merci Seigneur
Éternellement`
  },

  // ========== YVAN CASTANOU ==========
  {
    title: "Plus près de Toi",
    author: "Yvan Castanou",
    defaultKey: "Mi",
    tempo: 68,
    tags: "adoration,intimité",
    lyrics: `Plus près de Toi mon Dieu
Plus près de Toi

C'est le cri de mon cœur
Plus près de Toi

Dans Ta présence
Il y a la plénitude de joie

Plus près de Toi mon Dieu
Plus près de Toi

Attire-moi à Toi
Et je courrai

Plus près de Toi
Toujours plus près de Toi`
  },
  {
    title: "Dieu de l'impossible",
    author: "Yvan Castanou",
    defaultKey: "Sol",
    tempo: 90,
    tags: "louange,foi",
    lyrics: `Tu es le Dieu de l'impossible
Rien n'est trop difficile pour Toi

Tu es le Dieu de l'impossible
Tu fais des miracles dans ma vie

Les montagnes s'abaissent devant Toi
Les mers s'ouvrent à Ta voix

Tu es le Dieu de l'impossible
Et je crois en Toi

Ce que Tu as promis
Tu l'accompliras

Dieu de l'impossible
Je Te fais confiance`
  },
  {
    title: "Je suis libre",
    author: "Yvan Castanou",
    defaultKey: "La",
    tempo: 115,
    tags: "louange,liberté",
    lyrics: `Je suis libre, je suis libre
Jésus m'a libéré

Je suis libre, je suis libre
Les chaînes sont brisées

Là où est l'Esprit du Seigneur
Là est la liberté

Je suis libre, je suis libre
Pour danser devant Toi

Plus d'esclavage
Plus de condamnation

Je suis libre
En Jésus-Christ`
  },

  // ========== MARCELO TUNASI ==========
  {
    title: "Jésus au centre",
    author: "Marcelo Tunasi",
    defaultKey: "Sol",
    tempo: 72,
    tags: "adoration,intimité",
    lyrics: `Jésus au centre de ma vie
Jésus au centre de tout

Jésus au centre de ma vie
Tu es tout ce que je veux

Sans Toi je ne peux rien faire
Sans Toi je ne suis rien

Jésus au centre
De toutes choses

Tu es ma raison de vivre
Tu es mon espérance

Jésus au centre
De ma vie`
  },
  {
    title: "Napesi Yo",
    author: "Marcelo Tunasi",
    defaultKey: "Ré",
    tempo: 78,
    tags: "adoration,lingala",
    lyrics: `Napesi Yo nzoto na ngai
Napesi Yo motema na ngai

Napesi Yo bomoi na ngai
Sala na ngai ndenge olingi

Nazali ya Yo
Yo moko Nkolo

Napesi Yo nyonso
Sala ndenge olingi

Na mikolo na ngai nyonso
Nakolanda Yo

Napesi Yo
Nzoto na ngai mobimba`
  },
  {
    title: "La puissance du Saint-Esprit",
    author: "Marcelo Tunasi",
    defaultKey: "Do",
    tempo: 95,
    tags: "louange,Saint-Esprit",
    lyrics: `La puissance du Saint-Esprit
Est sur nous aujourd'hui

La puissance du Saint-Esprit
Transforme nos vies

Le même Esprit qui a ressuscité Jésus
Habite en nous

La puissance du Saint-Esprit
Brise les chaînes

Les forteresses tombent
Les murailles s'écroulent

Par la puissance
Du Saint-Esprit`
  },

  // ========== DEBORAH LUKALU ==========
  {
    title: "We Testify",
    author: "Deborah Lukalu",
    defaultKey: "Sol",
    tempo: 85,
    tags: "worship,testimony",
    lyrics: `We testify of Your goodness
We testify of Your love

We testify
You've been so faithful

Every blessing that we have
Comes from Your hands

We testify
Lord we testify

In the good times
And in the hard times

We testify
You are God and You are good`
  },
  {
    title: "Yahweh",
    author: "Deborah Lukalu",
    defaultKey: "La",
    tempo: 70,
    tags: "adoration,worship",
    lyrics: `Yahweh, Yahweh
Tu es Dieu

Yahweh, Yahweh
Il n'y a personne comme Toi

De l'orient à l'occident
Ton nom est grand

Yahweh, Yahweh
Nous T'adorons

Dans les cieux et sur la terre
Ton règne est éternel

Yahweh, Yahweh
Tu es le seul vrai Dieu`
  },
  {
    title: "Tenda",
    author: "Deborah Lukalu",
    defaultKey: "Ré",
    tempo: 68,
    tags: "adoration,swahili",
    lyrics: `Tenda wema
Nashukuru

Tenda wema
Baba nashukuru

Pour tout ce que Tu as fait
Je Te remercie

Tenda wema
Nashukuru

Tu m'as porté
Tu m'as gardé

Tenda wema
Mon Dieu je Te remercie`
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
