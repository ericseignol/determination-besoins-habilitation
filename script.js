let currentQuestion = 0;
let habilitations = [];
let currentIndice = null;  // Variable pour stocker l'indice actuel
let employeeNames = [];
const questions = [
    {
        question: "Le salarié est-il amené à intervenir sur des installations électriques ou seulement à proximité, sans intervenir directement ?", //0
        type: "multiple",
        options: ["sur des installations électriques", "à proximité"],
		hints: ["Accès aux locaux ou armoires électriques en basse tension", "Aucun accès aux locaux ou armoires électriques"],
        result: ["", "B0"],
        next: [1, 6]
    },
    {
        question: "Le salarié est-il amené à remplacer / dépanner / connecter / installer des éléments électriques en basse tension (BT) lors de travaux de construction / rénovation, au sein d'une équipe de plusieurs personnes ?", //1
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
        question: "Le salarié travaille-t-il dans des armoires électriques  a proximité d'elements électriques en fonctionnement?", //3
        type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["B1V", "B1"],
        next: [5, 5]
    },
    {
        question: "Le salarié travaille-t-il dans des armoires électriques a proximité d'elements électriques en fonctionnement?", //4
       	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["B2V", "B2"],
        next: [5, 5]
    },
    {
        question: "Choisissez le type d'interventions que le salarié put effectuer dans la liste suivante:", //5
        type: "multiple",
        options: ["Intervention générale sur tous type de circuits BT seul ou avec un exécutant sous ses ordres ", "Intervention élémentaire sur circuit de tension max 230 V de type prise de courant , interrupteurs, ou éléments de type luminaires, ampoules, radiateur "],
				hints: ["hint"],

        result: ["BR", "BS"],
        next: [6, 6]
    },
    {
        question: "Le salarié effectue-t-il des manœuvres, comme couper ou rétablir le courant dans des armoires électriques basse tension ?", //6
		type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],
        result: ["BE manoeuvre", " "],
        next: [7, 7]
        
    },
    {
        question: "Le salarié est-il responsable de la mise hors service des installations pour assurer la sécurité d'autres travailleurs intervenant sur l'installation (Consignation) ?", //7
        type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["BC", " "],
        next: [8, 8]
    },
    {
        question: "Le salarié doit il pénétrer dans des locaux de haute tension (>1000V) (postes de transformation etc ...), ou travailler a proximité de réseaux de transport / distribution aériens de l'électricité ?", //8
        type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: [" ", " "],
        next: [9, 14]
    },
    {
        question: "Le salarié agit-il en tant que non électricien de haute tension, exécutant électricien de haute tension ou agent de maitrise / cadre électricien de haute tension ?", //9
        type: "multiple",
        options: ["Non Electricien", "Exécutant", "agent de Maîtrise / cadre"],
				hints: ["hint"],

        result: ["H0", " ", " "],
        next: [10, 11, 12]
    },
	 {
        question: "Le salarié travaille-t-il dans des installations de Haute Tension a proximité d'elements électriques en fonctionnement?", //10
       	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["H0V", "H0"],
        next: [13, 13]
    },
    {
        question: "Le salarié travaille-t-il dans des installations de Haute Tension a proximité d'elements électriques en fonctionnement?", //11
        	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["H1V", "H1"],
        next: [13, 13]
    },
    {
        question: "Le salarié travaille-t-il dans des installations de Haute Tension a proximité d'elements électriques en fonctionnement?", //12
       	type: "multiple",
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["H2V", "H2"],
        next: [13, 13]
    },
    {
        question: "Le salarié effectue-t-il des manœuvres, comme couper ou rétablir le courant dans des locaux HT ?", //13
        options: ["Oui", "Non"],
				hints: ["hint"],

        result: ["HE manoeuvre", " "],
        next: [14, 14]
    },
    {
        question: "Le salarié est-il responsable de la mise hors service des installations pour assurer la sécurité d'autres travailleurs intervenant sur des installations HT (Consignation) ?", //14
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
    document.getElementById("result").innerText = "Les habilitations nécessaires pour Mr / Mme "+ employeeNames +"  sont : " + habilitations.join(" ");
    sendEmail(employeeNames, habilitations);
}

function startQuestionnaire() {
	showDialog();
    document.getElementById("accueil").style.display = "none"; // Masque la page d'accueil

    // Affiche la boîte de dialogue personnalisée pour entrer les noms
    const dialog = document.createElement('div');
    dialog.id = 'dialog';
    dialog.innerHTML = '';
    document.body.appendChild(dialog);
	
   }
function showDialog() {
        document.getElementById('dialog').style.display = 'flex';
    }

    function closeDialog() {
        document.getElementById('dialog').style.display = 'none';
    }

    function submitNames() {
         const namesInput = document.getElementById('names-input').value;
    if (namesInput) {
        // Séparer les noms par des virgules et supprimer les espaces inutiles
        employeeNames = namesInput.split(',').map(name => name.trim()).filter(name => name !== "");
        
        // Masquer la boîte de dialogue
        document.getElementById('dialog').style.display = 'none';
        
        // Afficher le questionnaire
        document.getElementById("questionnaire").style.display = "block";
        
        updateUI();  // Appelle la première question
    }
    }
function sendEmail(employeeNames, indices) {
    // Préparer les données à envoyer par email
    let emailParams = {
        to_name: "Destinataire", // Nom du destinataire
        from_name: "Nom de l'expéditeur", // Ton nom ou nom du système
        employee_names: employeeNames.join(", "), // Noms des salariés séparés par des virgules
        employee_indices: habilitations.join(", ") // Indices des salariés
    };

  emailjs.send("service_z2hpbbg", "template_zaes18r", emailParams)
        .then(function(response) {
            console.log("Email envoyé avec succès !", response.status, response.text);
        }, function(error) {
            console.error("Erreur lors de l'envoi de l'email.", error);
        });
}

// Initialisation du questionnaire
updateUI();
