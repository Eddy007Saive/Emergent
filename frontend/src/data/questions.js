// Goodtime BnB - Diagnostic Questions Data
// All questions in French for the B2B diagnostic questionnaire

export const BLOCKS = {
  STRUCTURE: {
    id: 'structure',
    name: 'Structure interne',
    description: 'Organisation, process et outils',
    maxScore: 20,
    badgeClass: 'block-badge-structure',
  },
  ACQUISITION: {
    id: 'acquisition',
    name: 'Moteur d\'acquisition',
    description: 'Canaux et stratégie de croissance',
    maxScore: 18,
    badgeClass: 'block-badge-acquisition',
  },
  VALUE: {
    id: 'value',
    name: 'Valeur & revendabilité',
    description: 'Valeur patrimoniale et indépendance',
    maxScore: 6,
    badgeClass: 'block-badge-value',
  },
};

export const questions = [
  // BLOC 1 - STRUCTURE INTERNE (Q1-Q10)
  {
    id: 1,
    block: 'structure',
    title: 'Ton rôle au quotidien',
    options: [
      {
        value: 0,
        label: '80–90 % de mon temps est dans l\'opérationnel (voyageurs, ménage, litiges, urgences).',
      },
      {
        value: 1,
        label: 'Je jongle entre opérationnel et pilotage, mais je retombe vite dans l\'opérationnel dès qu\'il y a un problème.',
      },
      {
        value: 2,
        label: 'Mon rôle est clairement orienté pilotage, stratégie, chiffres et closing. Je ne suis plus le pompier de service.',
      },
    ],
  },
  {
    id: 2,
    block: 'structure',
    title: 'Ton absence pendant 10 jours',
    options: [
      {
        value: 0,
        label: 'Si je disparais 10 jours, la conciergerie s\'écroule.',
      },
      {
        value: 1,
        label: 'Ça tiendrait plus ou moins, mais avec pas mal de risques et de tension.',
      },
      {
        value: 2,
        label: 'La structure est pensée pour fonctionner sans moi pendant 10 jours (même si ce n\'est pas parfait).',
      },
    ],
  },
  {
    id: 3,
    block: 'structure',
    title: 'Rôles & responsabilités',
    options: [
      {
        value: 0,
        label: 'Tout le monde touche à tout, rien n\'est vraiment défini.',
      },
      {
        value: 1,
        label: 'Les rôles sont plus ou moins clairs, mais c\'est surtout dans ma tête ou à l\'oral.',
      },
      {
        value: 2,
        label: 'J\'ai un organigramme simple, des rôles clairement définis, chacun sait ce qu\'il doit faire.',
      },
    ],
  },
  {
    id: 4,
    block: 'structure',
    title: 'Répartition des fonctions clés',
    subtitle: '(gestion terrain / voyageurs / propriétaires / pricing / pilotage)',
    options: [
      {
        value: 0,
        label: 'Une ou deux personnes (dont moi) gèrent quasiment tout.',
      },
      {
        value: 1,
        label: 'Les fonctions sont identifiées, mais mal réparties ou en doublon.',
      },
      {
        value: 2,
        label: 'Les grandes fonctions sont distribuées, même si certains cumulent plusieurs casquettes, c\'est assumé et clair.',
      },
    ],
  },
  {
    id: 5,
    block: 'structure',
    title: 'Process écrits pour les situations critiques',
    subtitle: '(onboarding logement, création/MAJ d\'annonce, ménage, incidents, onboarding propriétaire)',
    options: [
      {
        value: 0,
        label: 'Tout se fait au feeling, via WhatsApp et mémoire.',
      },
      {
        value: 1,
        label: 'On a quelques process, mais incomplets ou rarement suivis.',
      },
      {
        value: 2,
        label: 'Les 5 situations clés sont documentées et utilisées par l\'équipe.',
      },
    ],
  },
  {
    id: 6,
    block: 'structure',
    title: 'Gestion des tâches',
    options: [
      {
        value: 0,
        label: 'Les tâches passent par WhatsApp / SMS / appels, sans vue globale.',
      },
      {
        value: 1,
        label: 'On a un mélange d\'outils (feuilles, groupes, etc.) mais rien de centralisé.',
      },
      {
        value: 2,
        label: 'On utilise un outil central (ou un combo clair) pour assigner, suivre et clôturer les tâches.',
      },
    ],
  },
  {
    id: 7,
    block: 'structure',
    title: 'Qualité de ton stack outils',
    subtitle: '(PMS, channel manager, Goodtime, etc.)',
    options: [
      {
        value: 0,
        label: 'C\'est un patchwork bricolé, avec beaucoup de manipulations manuelles.',
      },
      {
        value: 1,
        label: 'On a commencé à automatiser, mais je rattrape souvent à la main.',
      },
      {
        value: 2,
        label: 'Notre stack est réfléchie : les automatisations réduisent vraiment la charge opérationnelle.',
      },
    ],
  },
  {
    id: 8,
    block: 'structure',
    title: 'Synchronisation des informations',
    subtitle: '(réservations, ménage, facturation, suivi propriétaires)',
    options: [
      {
        value: 0,
        label: 'Je recopie souvent à la main, ou je jongle avec des exports.',
      },
      {
        value: 1,
        label: 'C\'est partiellement synchronisé, mais il y a encore des ratés et des doublons.',
      },
      {
        value: 2,
        label: 'Les flux sont alignés, on a très peu de ressaisies manuelles.',
      },
    ],
  },
  {
    id: 9,
    block: 'structure',
    title: 'Vision logement par logement',
    options: [
      {
        value: 0,
        label: 'Je ne connais pas précisément la performance de chaque logement.',
      },
      {
        value: 1,
        label: 'Je peux retrouver les infos avec du temps et des tableaux Excel.',
      },
      {
        value: 2,
        label: 'J\'ai des tableaux / dashboards qui me donnent régulièrement CA, marge et intérêt de chaque logement.',
      },
    ],
  },
  {
    id: 10,
    block: 'structure',
    title: 'Suivi des indicateurs clés',
    subtitle: '(CA, marge, taux d\'occupation, churn propriétaires, etc.)',
    options: [
      {
        value: 0,
        label: 'Je ne suis quasiment aucun indicateur.',
      },
      {
        value: 1,
        label: 'Je suis 1 ou 2 indicateurs de temps en temps.',
      },
      {
        value: 2,
        label: 'Je suis les indicateurs clés chaque mois avec un minimum d\'historique.',
      },
    ],
  },
  // BLOC 2 - MOTEUR D'ACQUISITION (Q11-Q19)
  {
    id: 11,
    block: 'acquisition',
    title: 'Origine des nouveaux propriétaires',
    options: [
      {
        value: 0,
        label: 'C\'est surtout du hasard / bouche-à-oreille / opportunités ponctuelles.',
      },
      {
        value: 1,
        label: 'J\'ai quelques canaux (site, GMB, réseaux) mais sans vraie stratégie.',
      },
      {
        value: 2,
        label: 'Mes canaux d\'acquisition sont identifiés, priorisés et suivis.',
      },
    ],
  },
  {
    id: 12,
    block: 'acquisition',
    title: 'Capacité d\'absorption de nouveaux logements',
    options: [
      {
        value: 0,
        label: 'Je prends ce qui arrive, sans vraie limite ni calcul.',
      },
      {
        value: 1,
        label: 'J\'ai un chiffre en tête mais il n\'est pas vraiment relié à ma structure.',
      },
      {
        value: 2,
        label: 'Je connais ma capacité d\'intégration par mois sans exploser, et j\'ajuste l\'acquisition en fonction.',
      },
    ],
  },
  {
    id: 13,
    block: 'acquisition',
    title: 'Site internet',
    options: [
      {
        value: 0,
        label: 'Pas de site, ou site vitrine basique jamais mis à jour.',
      },
      {
        value: 1,
        label: 'Site présent mais peu de trafic / pas de stratégie SEO locale.',
      },
      {
        value: 2,
        label: 'Site pensé pour capter des propriétaires, avec pages locales et formulaires dédiés.',
      },
    ],
  },
  {
    id: 14,
    block: 'acquisition',
    title: 'Fiche Google My Business (ou équivalent local)',
    options: [
      {
        value: 0,
        label: 'Inexistante ou abandonnée.',
      },
      {
        value: 1,
        label: 'Existante avec quelques avis, mais peu active.',
      },
      {
        value: 2,
        label: 'Optimisée, alimentée, avec avis réguliers : vraie vitrine locale pour les propriétaires.',
      },
    ],
  },
  {
    id: 15,
    block: 'acquisition',
    title: 'Réseaux sociaux côté propriétaires',
    options: [
      {
        value: 0,
        label: 'Je ne poste presque rien ou seulement pour les voyageurs.',
      },
      {
        value: 1,
        label: 'Je communique un peu, sans ligne directrice claire.',
      },
      {
        value: 2,
        label: 'J\'utilise les réseaux pour prouver mon sérieux auprès des propriétaires (preuves sociales, cas concrets, coulisses).',
      },
    ],
  },
  {
    id: 16,
    block: 'acquisition',
    title: 'Gestion des leads propriétaires',
    options: [
      {
        value: 0,
        label: 'Tout finit dans mon téléphone, je gère au fil de l\'eau.',
      },
      {
        value: 1,
        label: 'J\'ai un semblant de suivi (tableur, notes) mais c\'est artisanal.',
      },
      {
        value: 2,
        label: 'Chaque lead entre dans un pipeline / CRM avec étapes claires (qualification, rendez-vous, relance).',
      },
    ],
  },
  {
    id: 17,
    block: 'acquisition',
    title: 'Nurturing des "pas maintenant"',
    options: [
      {
        value: 0,
        label: 'Je les oublie ou je me dis que je les relancerai un jour.',
      },
      {
        value: 1,
        label: 'Je relance de temps en temps, sans structure.',
      },
      {
        value: 2,
        label: 'J\'ai des séquences prévues pour rester dans leur radar sans y penser tous les jours.',
      },
    ],
  },
  {
    id: 18,
    block: 'acquisition',
    title: 'Maîtrise de tes chiffres d\'acquisition',
    options: [
      {
        value: 0,
        label: 'Je ne sais pas vraiment combien de leads je reçois ni combien je convertis.',
      },
      {
        value: 1,
        label: 'J\'ai une idée approximative de mes volumes et de mon taux de conversion.',
      },
      {
        value: 2,
        label: 'Je connais mes chiffres (leads/mois, conversions, coût en temps/argent) et je peux les optimiser.',
      },
    ],
  },
  {
    id: 19,
    block: 'acquisition',
    title: 'Prévisibilité globale de ton acquisition',
    options: [
      {
        value: 0,
        label: 'Je vis surtout au rythme du hasard et des plateformes.',
      },
      {
        value: 1,
        label: 'J\'ai des choses en place, mais c\'est encore fragile / irrégulier.',
      },
      {
        value: 2,
        label: 'J\'ai un moteur d\'acquisition posé sur des rails : chaque mois, des lits tombent de façon prévisible.',
      },
    ],
  },
  // BLOC 3 - VALEUR & REVENDABILITÉ (Q20-Q22)
  {
    id: 20,
    block: 'value',
    title: 'Dépendance à ta personne',
    options: [
      {
        value: 0,
        label: 'Si je vends demain, presque tout repose encore sur moi.',
      },
      {
        value: 1,
        label: 'Certaines choses tournent sans moi, mais l\'acheteur dépendrait encore beaucoup de ma présence.',
      },
      {
        value: 2,
        label: 'Mon rôle est déjà remplaçable : je pilote, mais je ne suis pas le système.',
      },
    ],
  },
  {
    id: 21,
    block: 'value',
    title: 'Qualité du portefeuille propriétaires',
    options: [
      {
        value: 0,
        label: 'Contrats courts/précaires, très liés à ma relation perso.',
      },
      {
        value: 1,
        label: 'Contrats corrects, mais encore très centrés sur moi.',
      },
      {
        value: 2,
        label: 'Contrats structurés, onboarding propre, expérience claire : la relation est avec la conciergerie, pas uniquement avec ma personne.',
      },
    ],
  },
  {
    id: 22,
    block: 'value',
    title: 'Regard d\'un banquier / investisseur',
    options: [
      {
        value: 0,
        label: 'Il verrait surtout une personne débordée et une structure fragile.',
      },
      {
        value: 1,
        label: 'Il verrait une activité qui tourne, mais avec beaucoup de dépendances et de flou.',
      },
      {
        value: 2,
        label: 'Il verrait un business avec chiffres, système, process et moteur d\'acquisition : un actif finançable et revendable.',
      },
    ],
  },
];

export const SEGMENTS = {
  FRAGILE: {
    id: 'fragile',
    name: 'Conciergerie artisanale fragile',
    range: [0, 18],
    color: 'accent',
    message: 'Tu as surtout un job amélioré, pas une entreprise.',
    risks: 'Épuisement, valeur de revente faible, dépendance totale à toi.',
    axis: 'Prioriser la structuration : process, rôles, sortie de l\'opérationnel.',
    detailedAnalysis: `Ta conciergerie fonctionne, mais elle dépend entièrement de toi. Chaque jour qui passe te rapproche de l'épuisement, et la valeur de ce que tu as construit reste faible — parce que sans toi, il n'y a rien.

Tu n'as pas construit une entreprise. Tu t'es créé un job, certes flexible, mais qui te bouffe ton temps et ton énergie. La vraie question : veux-tu continuer comme ça, ou veux-tu enfin poser les bases d'une structure qui tient sans toi ?`,
  },
  TRANSITION: {
    id: 'transition',
    name: 'Entreprise en transition',
    range: [19, 32],
    color: 'warning',
    message: 'Tu as mis des choses en place, mais il y a encore trop de trous dans la raquette.',
    risks: 'Plafond de verre, difficulté à scaler, moteur d\'acquisition sous-exploité.',
    axis: 'Consolider structure + installer un moteur d\'acquisition simple mais régulier.',
    detailedAnalysis: `Tu es sur la bonne voie. Des fondations existent, tu as commencé à déléguer, à structurer, à poser des process. Mais la machine n'est pas encore autonome.

Tu ressens probablement un plafond de verre : tu ne peux pas vraiment scaler sans te replonger dans l'opérationnel. Et ton acquisition reste trop dépendante du hasard ou du bouche-à-oreille.

La prochaine étape ? Consolider ce qui existe et installer un vrai moteur d'acquisition — simple, régulier, prévisible.`,
  },
  MACHINE: {
    id: 'machine',
    name: 'Machine en devenir',
    range: [33, 44],
    color: 'success',
    message: 'Tu es en avance sur la plupart du marché.',
    risks: 'Optimisation, scaling propre, maximisation de la valeur de revente et crédibilité bancaire.',
    axis: 'Raffiner le moteur d\'acquisition, affiner les chiffres, sécuriser l\'équipe.',
    detailedAnalysis: `Bravo. Tu fais partie des rares gérants qui ont compris que leur conciergerie devait devenir une vraie entreprise.

Tu as des process, une vision claire de ta performance, un début de moteur d'acquisition. La structure tourne même quand tu n'es pas là.

Mais "en avance" ne veut pas dire "terminé". Il reste des leviers à activer : affiner tes chiffres, renforcer l'équipe, optimiser l'acquisition pour scaler sereinement — et peut-être, un jour, revendre un actif solide.`,
  },
};

export const getSegment = (totalScore) => {
  if (totalScore <= 18) return SEGMENTS.FRAGILE;
  if (totalScore <= 32) return SEGMENTS.TRANSITION;
  return SEGMENTS.MACHINE;
};

export const calculateScores = (answers) => {
  const scores = {
    total: 0,
    structure: 0,
    acquisition: 0,
    value: 0,
  };

  Object.entries(answers).forEach(([questionId, value]) => {
    const qId = parseInt(questionId);
    scores.total += value;

    if (qId >= 1 && qId <= 10) {
      scores.structure += value;
    } else if (qId >= 11 && qId <= 19) {
      scores.acquisition += value;
    } else if (qId >= 20 && qId <= 22) {
      scores.value += value;
    }
  });

  return scores;
};
