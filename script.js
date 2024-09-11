let currentQuestion = 0;
let habilitations = [];
let currentIndice = null;  // Variable pour stocker l'indice actuel
let employeeName = prompt("Veuillez entrer le nom du salarié :");
const questions = [
    {
        question: "Le salarié est-il amené à pénétrer dans des locaux électriques / ouvrir des armoires électriques Basse Tension (<1000V), et/ou remplacer / installer des élements électriques tels que prises, ampoules luminaires interrupteurs etc ?", //0
        type: "multiple",
        options: ["Oui", "Non"],
		hints: ["Accès aux locaux ou armoires électriques en basse tension", "Aucun accès aux locaux ou armoires électriques"],
        result: ["B0", " "],
        next: [1, 6]
    },
    {
        question: "Le salarié est amené à remplacer / connecter / dépanner des éléments électriques en basse tension (BT) ?", //1
        type: "multiple",
        options: ["Oui", "Non"],
		hints: ["Effectue des opérations sur des équipements basse tension", "Ne fait aucune intervention sur des équipements basse tension"],
        result: [" ", " "],
        next: [2, 6]
    },
 {
        question: "Le salarié agit-il en tant qu'exécutant ou agent de maitrise / cadre ?", //2
        type: "multiple",
        options: ["Exécutant", "agent de Maîtrise / cadre"],
		hints: ["hint"],
        result: [" ", " "],
        next: [3, 4]
    },
    {
        question: "Le salarié travaille-t-il dans des armoires a proximité d'elements électriques en fonctionnement?", //3
        type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["B1V", "B1"],
        next: [5, 5]
    },
    {
        question: "Le salarié travaille-t-il dans des armoires a proximité d'elements électriques en fonctionnement?", //4
       	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["B2V", "B2"],
        next: [5, 5]
    },
    {
        question: "Quel type d'intervention le salarié effectue-t-il sur des équipements ou circuits (BT) ?", //5
        type: "multiple",
        options: ["Intervention générale", "Intervention élémentaire"],
				hints: ["hint"],

        result: ["BR", "BS"],
        next: [6, 6]
    },
    {
        question: "Le salarié est il amené a manipuler des organes de coupure dans un tableau électrique (disjoncteurs, etc... ) concourant a l'exploitation?", //6
		type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],
        result: ["BE manoeuvre", " "],
        next: [7, 7]
        
    },
    {
        question: "Le salarié effectue-t-il des consignations (BT) ?", //7
        type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["BC", " "],
        next: [8, 8]
    },
    {
        question: "Le salarié doit il pénétrer dans des locaux de haute tension (>1000V) (postes de transformation etc ...) ?", //8
        type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: [" ", " "],
        next: [9, 14]
    },
    {
        question: "Le salarié agit-il en tant que non électricien de haute tension, exécutant électricien de haute tension ou agent de maitrise / cadre électricien de hzaute tension ?", //9
        type: "multiple",
        options: ["Non Electricien", "Exécutant", "agent de Maîtrise / cadre"],
				hints: ["hint"],

        result: ["H0", " ", " "],
        next: [10, 11, 12]
    },
	 {
        question: "Le salarié travaille-t-il dans des armoires a proximité d'elements électriques en fonctionnement?", //10
       	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["H0V", "H0"],
        next: [13, 13]
    },
    {
        question: "Le salarié travaille-t-il dans des armoires a proximité d'elements électriques en fonctionnement?", //11
        	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["H1V", "H1"],
        next: [13, 13]
    },
    {
        question: "Le salarié travaille-t-il dans des armoires a proximité d'elements électriques en fonctionnement?", //12
       	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["H2V", "H2"],
        next: [13, 13]
    },
    {
        question: "Le salarié effectue-t-il des manœuvres (HT) ?", //13
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["HE manoeuvre", " "],
        next: [14, 14]
    },
    {
        question: "Le salarié effectue-t-il des consignations (HT) ?", //14
        type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["HC", " "],
        next: [15, 15]
    },
    {
        question: "Le salarié travaille-t-il dans des tranchées de réseaux enterrés ?", //15
        type: "multiple",
        options: ["Oui", "Non"],
		hints: ["hint"],
        result: ["BF/HF", ""],
        next: ["Fin", "Fin"]
    }
];

function updateUI() {
    // Ne rien faire si le questionnaire est terminé
    if (currentQuestion === "Fin" || currentQuestion >= questions.length) {
        displayResults();
        return;
    }

    const question = questions[currentQuestion];

    // Effacer les anciennes options et le texte de la question
    document.getElementById("multiple-choice").innerHTML = ''; // Reset
    document.getElementById("question").innerText = question.question;

    // Ajouter les boutons d'option
    question.options.forEach((option, index) => {
        let button = document.createElement("button");
        button.innerText = option;
		button.title = question.hints[index];  // Ajouter l'info-bulle
        button.onclick = () => answerMultiple(index); // Bind event
        document.getElementById("multiple-choice").appendChild(button);
    });
}

function answerMultiple(optionIndex) {
    const question = questions[currentQuestion];
    currentIndice = question.result[optionIndex];  // Stocker l'indice sélectionné
    habilitations.push(currentIndice);

    // Ajouter la question et la réponse à la liste
    const answeredList = document.getElementById("questions-answered");
    const listItem = document.createElement("li");
    listItem.innerText = question.question + " - Réponse: " + question.options[optionIndex];
    answeredList.appendChild(listItem);

    // Mettre à jour la question suivante avant la transition
    currentQuestion = question.next[optionIndex];

    // Transition out (fade effect) après avoir sélectionné une réponse
    document.getElementById("questionnaire").classList.add('fade-out');

    // Après la transition, afficher la question suivante
    setTimeout(() => {
        document.getElementById("questionnaire").classList.remove('fade-out');
        updateUI();  // Mettre à jour l'UI avec la question suivante
        document.getElementById("questionnaire").classList.add('fade-in');  // Ajouter l'effet d'entrée
    }, 500);  // Durée de la transition
}


function displayResults() {
    document.getElementById("multiple-choice").style.display = "none";
    document.getElementById("question").style.display = "none";
    document.getElementById("result").innerText = "Les habilitations nécessaires pour votre/vos salarié(s) sont : " + habilitations.join(", ");
}

// Initialisation
updateUI();
