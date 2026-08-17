export const FIN = "Fin";

export const questions = [
  {
    id: 0,
    question:
      "Le salarié est-il amené à intervenir sur des installations électriques ou seulement à proximité, sans intervenir directement ?",
    options: ["Sur des installations électriques", "À proximité"],
    affirmations: [
      "Le salarié intervient sur des installations électriques en basse tension.",
      "Le salarié n’intervient qu’à proximité des installations électriques.",
    ],
    results: ["", "B0"],
    next: [1, 6],
  },
  {
    id: 1,
    question:
      "Le salarié est-il amené à remplacer, dépanner, connecter ou installer des éléments électriques en basse tension lors de travaux de construction ou de rénovation, au sein d’une équipe ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié effectue des opérations sur des équipements basse tension.",
      "Le salarié ne fait aucune intervention sur des équipements basse tension.",
    ],
    results: ["", ""],
    next: [2, 6],
  },
  {
    id: 2,
    question: "Le salarié agit-il en tant qu’exécutant ou agent de maîtrise / cadre ?",
    options: ["Exécutant", "Agent de maîtrise / cadre"],
    affirmations: [
      "Le salarié agit en tant qu’exécutant.",
      "Le salarié agit en tant qu’agent de maîtrise ou cadre.",
    ],
    results: ["", ""],
    next: [3, 4],
  },
  {
    id: 3,
    question:
      "Le salarié travaille-t-il dans des armoires électriques à proximité d’éléments électriques en fonctionnement ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié travaille dans des armoires électriques à proximité d’éléments en fonctionnement.",
      "Le salarié ne travaille pas à proximité d’éléments électriques en fonctionnement.",
    ],
    results: ["B1V", "B1"],
    next: [5, 5],
  },
  {
    id: 4,
    question:
      "Le salarié travaille-t-il dans des armoires électriques à proximité d’éléments électriques en fonctionnement ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié travaille dans des armoires électriques à proximité d’éléments en fonctionnement.",
      "Le salarié ne travaille pas à proximité d’éléments électriques en fonctionnement.",
    ],
    results: ["B2V", "B2"],
    next: [5, 5],
  },
  {
    id: 5,
    question: "Quel type d’intervention le salarié peut-il effectuer ?",
    options: [
      "Intervention générale sur tout type de circuit BT, seul ou avec un exécutant sous ses ordres.",
      "Intervention élémentaire sur un circuit de tension maximale 230 V : prise, interrupteur, luminaire, ampoule ou radiateur.",
    ],
    affirmations: [
      "Le salarié effectue des interventions générales sur tous types de circuits BT.",
      "Le salarié effectue des interventions élémentaires sur des circuits de faible tension.",
    ],
    results: ["BR", "BS"],
    next: [6, 6],
  },
  {
    id: 6,
    question:
      "Le salarié effectue-t-il des manœuvres, comme couper ou rétablir le courant dans des armoires électriques basse tension ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié effectue des manœuvres sur des armoires électriques basse tension.",
      "Le salarié n’effectue aucune manœuvre sur des armoires électriques basse tension.",
    ],
    results: ["BE manœuvre", ""],
    next: [7, 7],
  },
  {
    id: 7,
    question:
      "Le salarié est-il responsable de la mise hors service des installations pour assurer la sécurité d’autres travailleurs intervenant sur l’installation (consignation) ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié est responsable de la mise hors service des installations pour la consignation.",
      "Le salarié n’est pas responsable de la consignation.",
    ],
    results: ["BC", ""],
    next: [8, 8],
  },
  {
    id: 8,
    question:
      "Le salarié doit-il pénétrer dans des locaux haute tension (> 1 000 V), comme des postes de transformation, ou travailler à proximité de réseaux aériens de transport ou distribution d’électricité ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié doit pénétrer dans des locaux haute tension ou travailler à proximité de réseaux aériens.",
      "Le salarié ne pénètre pas dans des locaux haute tension et ne travaille pas à proximité de réseaux aériens.",
    ],
    results: ["", ""],
    next: [9, 14],
  },
  {
    id: 9,
    question:
      "Le salarié agit-il en tant que non-électricien, exécutant électricien ou agent de maîtrise / cadre électricien en haute tension ?",
    options: ["Non-électricien", "Exécutant", "Agent de maîtrise / cadre"],
    affirmations: [
      "Le salarié est un non-électricien de haute tension.",
      "Le salarié est un exécutant électricien de haute tension.",
      "Le salarié est un agent de maîtrise ou cadre électricien de haute tension.",
    ],
    results: ["H0", "", ""],
    next: [10, 11, 12],
  },
  {
    id: 10,
    question:
      "Le salarié travaille-t-il dans des installations haute tension à proximité d’éléments électriques en fonctionnement ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié travaille à proximité d’éléments électriques en fonctionnement dans des installations haute tension.",
      "Le salarié ne travaille pas à proximité d’éléments électriques en fonctionnement dans des installations haute tension.",
    ],
    results: ["H0V", "H0"],
    next: [13, 13],
  },
  {
    id: 11,
    question:
      "Le salarié travaille-t-il dans des installations haute tension à proximité d’éléments électriques en fonctionnement ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié travaille à proximité d’éléments électriques en fonctionnement dans des installations haute tension.",
      "Le salarié ne travaille pas à proximité d’éléments électriques en fonctionnement dans des installations haute tension.",
    ],
    results: ["H1V", "H1"],
    next: [13, 13],
  },
  {
    id: 12,
    question:
      "Le salarié travaille-t-il dans des installations haute tension à proximité d’éléments électriques en fonctionnement ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié travaille à proximité d’éléments électriques en fonctionnement dans des installations haute tension.",
      "Le salarié ne travaille pas à proximité d’éléments électriques en fonctionnement dans des installations haute tension.",
    ],
    results: ["H2V", "H2"],
    next: [13, 13],
  },
  {
    id: 13,
    question:
      "Le salarié effectue-t-il des manœuvres, comme couper ou rétablir le courant dans des locaux haute tension ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié effectue des manœuvres sur des installations haute tension.",
      "Le salarié n’effectue aucune manœuvre sur des installations haute tension.",
    ],
    results: ["HE manœuvre", ""],
    next: [14, 14],
  },
  {
    id: 14,
    question:
      "Le salarié est-il responsable de la mise hors service des installations pour assurer la sécurité d’autres travailleurs intervenant sur des installations haute tension (consignation) ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié est responsable de la mise hors service des installations haute tension pour la consignation.",
      "Le salarié n’est pas responsable de la consignation des installations haute tension.",
    ],
    results: ["HC", ""],
    next: [15, 15],
  },
  {
    id: 15,
    question:
      "Le salarié intervient-il sur une installation photovoltaïque en courant continu et alternatif ainsi que sur son raccordement au réseau ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié intervient sur les interfaces entre courant continu et courant alternatif ainsi que sur le raccordement au réseau d’une installation photovoltaïque.",
      "Le salarié n’intervient pas sur les interfaces courant continu / courant alternatif ni sur le raccordement au réseau d’une installation photovoltaïque.",
    ],
    results: ["BR-PV", ""],
    next: [16, 16],
  },
  {
    id: 16,
    question: "Le salarié manipule-t-il ou pose-t-il des panneaux solaires photovoltaïques ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié manipule et pose des panneaux photovoltaïques.",
      "Le salarié ne manipule pas et ne pose pas de panneaux solaires photovoltaïques.",
    ],
    results: ["BP", ""],
    next: [17, 17],
  },
  {
    id: 17,
    question: "Le salarié travaille-t-il dans des tranchées de réseaux enterrés ?",
    options: ["Oui", "Non"],
    affirmations: [
      "Le salarié travaille dans des tranchées de réseaux enterrés.",
      "Le salarié ne travaille pas dans des tranchées de réseaux enterrés.",
    ],
    results: ["BF/HF", ""],
    next: [FIN, FIN],
  },
];
